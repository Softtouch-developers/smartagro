"""
Order Management Service
Business logic for order operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from fastapi import HTTPException, status
from typing import Optional, Dict, Any, List, Tuple
import logging
from datetime import datetime
from decimal import Decimal
import random
import string

from models import Order, OrderStatus, PaymentStatus, Product, User, UserType
from modules.orders.schemas import CreateOrderRequest, ShipOrderRequest, DeliverOrderRequest, CancelOrderRequest
from modules.products.service import ProductService

logger = logging.getLogger(__name__)


class OrderService:
    """Service for order management operations"""

    @staticmethod
    def generate_order_number() -> str:
        """Generate unique order number"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_str = ''.join(random.choices(string.digits, k=4))
        return f"ORD-{timestamp}-{random_str}"

    @staticmethod
    def calculate_fees(subtotal: float, delivery_method: str) -> Tuple[float, float]:
        """
        Calculate delivery and platform fees

        Args:
            subtotal: Order subtotal
            delivery_method: Delivery method

        Returns:
            Tuple of (delivery_fee, platform_fee)
        """
        # Delivery fee calculation (simplified)
        if delivery_method == "PICKUP":
            delivery_fee = 0.0
        else:
            # Base delivery fee
            delivery_fee = 20.0  # GHS 20 base fee
            # Add 2% of subtotal for large orders
            if subtotal > 500:
                delivery_fee += subtotal * 0.02

        # Platform fee: 5% of subtotal
        platform_fee = subtotal * 0.05

        return round(delivery_fee, 2), round(platform_fee, 2)

    @staticmethod
    def create_order(
        db: Session,
        buyer_id: int,
        order_data: CreateOrderRequest
    ) -> Order:
        """
        Create a new order

        Args:
            db: Database session
            buyer_id: ID of the buyer
            order_data: Order creation data

        Returns:
            Created order
        """
        # Get product
        product = ProductService.get_product_by_id(db, order_data.product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        # Verify product is available
        if product.status != "AVAILABLE" or not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product is not available for purchase"
            )

        # Verify sufficient quantity
        if product.quantity_available < order_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient quantity. Available: {product.quantity_available}, Requested: {order_data.quantity}"
            )

        # Verify minimum order quantity
        if product.minimum_order_quantity and order_data.quantity < product.minimum_order_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum order quantity is {product.minimum_order_quantity} {product.unit_of_measure}"
            )

        # Prevent farmers from buying their own products
        if buyer_id == product.seller_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot order your own product"
            )

        # Calculate amounts
        unit_price = float(product.price_per_unit)
        subtotal = unit_price * order_data.quantity
        delivery_fee, platform_fee = OrderService.calculate_fees(subtotal, order_data.delivery_method.value)
        total_amount = subtotal + delivery_fee

        # Generate order number
        order_number = OrderService.generate_order_number()

        # Create order
        order = Order(
            order_number=order_number,
            buyer_id=buyer_id,
            seller_id=product.seller_id,
            product_id=product.id,
            quantity=order_data.quantity,
            unit_price=Decimal(str(unit_price)),
            subtotal=Decimal(str(subtotal)),
            delivery_fee=Decimal(str(delivery_fee)),
            platform_fee=Decimal(str(platform_fee)),
            total_amount=Decimal(str(total_amount)),
            status=OrderStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
            delivery_method=order_data.delivery_method,
            delivery_address=order_data.delivery_address,
            delivery_region=order_data.delivery_region,
            delivery_district=order_data.delivery_district,
            delivery_town_city=order_data.delivery_town_city,
            delivery_gps_address=order_data.delivery_gps_address,
            delivery_phone=order_data.delivery_phone,
            buyer_notes=order_data.buyer_notes
        )

        db.add(order)
        db.commit()
        db.refresh(order)

        logger.info(f"Order {order.order_number} created by buyer {buyer_id}")
        return order

    @staticmethod
    def get_order_by_id(db: Session, order_id: int) -> Optional[Order]:
        """Get order by ID"""
        return db.query(Order).filter(Order.id == order_id).first()

    @staticmethod
    def get_order_with_details(db: Session, order_id: int) -> Tuple[Optional[Order], Optional[Dict], Optional[Dict], Optional[Dict]]:
        """Get order with product, seller, and buyer information"""
        order = OrderService.get_order_by_id(db, order_id)

        if not order:
            return None, None, None, None

        # Get product details
        product = db.query(Product).filter(Product.id == order.product_id).first()
        product_info = {
            "id": product.id,
            "product_name": product.product_name,
            "category": product.category.value,
            "primary_image_url": product.primary_image_url,
            "unit_of_measure": product.unit_of_measure.value
        } if product else None

        # Get seller details
        seller = db.query(User).filter(User.id == order.seller_id).first()
        seller_info = {
            "id": seller.id,
            "full_name": seller.full_name,
            "phone_number": seller.phone_number,
            "region": seller.region,
            "farm_name": seller.farm_name
        } if seller else None

        # Get buyer details
        buyer = db.query(User).filter(User.id == order.buyer_id).first()
        buyer_info = {
            "id": buyer.id,
            "full_name": buyer.full_name,
            "phone_number": buyer.phone_number,
            "region": buyer.region
        } if buyer else None

        return order, product_info, seller_info, buyer_info

    @staticmethod
    def list_user_orders(
        db: Session,
        user_id: int,
        user_type: str,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Order], int]:
        """
        List orders for a user (buyer or seller view)

        Args:
            db: Database session
            user_id: User ID
            user_type: BUYER or FARMER
            status: Filter by status
            page: Page number
            page_size: Items per page

        Returns:
            Tuple of (orders, total_count)
        """
        if user_type == "BUYER":
            query = db.query(Order).filter(Order.buyer_id == user_id)
        else:  # FARMER
            query = db.query(Order).filter(Order.seller_id == user_id)

        # Filter by status
        if status:
            query = query.filter(Order.status == status)

        # Get total count
        total = query.count()

        # Pagination
        offset = (page - 1) * page_size
        orders = query.order_by(desc(Order.created_at)).offset(offset).limit(page_size).all()

        return orders, total

    @staticmethod
    def ship_order(
        db: Session,
        order_id: int,
        seller_id: int,
        ship_data: ShipOrderRequest
    ) -> Order:
        """
        Mark order as shipped

        Args:
            db: Database session
            order_id: Order ID
            seller_id: Seller ID (must be order seller)
            ship_data: Shipping data

        Returns:
            Updated order
        """
        order = OrderService.get_order_by_id(db, order_id)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        # Verify seller owns this order
        if order.seller_id != seller_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only ship your own orders"
            )

        # Verify order is paid
        if order.payment_status != PaymentStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot ship unpaid order"
            )

        # Verify current status
        if order.status not in [OrderStatus.CONFIRMED, OrderStatus.PAID]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot ship order with status: {order.status.value}"
            )

        # Update order
        order.status = OrderStatus.SHIPPED
        order.tracking_number = ship_data.tracking_number
        order.carrier = ship_data.carrier
        order.estimated_delivery_date = ship_data.estimated_delivery_date
        order.seller_notes = ship_data.seller_notes
        order.shipped_at = datetime.utcnow()
        order.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(order)

        logger.info(f"Order {order.order_number} shipped by seller {seller_id}")
        return order

    @staticmethod
    def deliver_order(
        db: Session,
        order_id: int,
        buyer_id: int,
        deliver_data: DeliverOrderRequest
    ) -> Order:
        """
        Confirm order delivery

        Args:
            db: Database session
            order_id: Order ID
            buyer_id: Buyer ID (must be order buyer)
            deliver_data: Delivery confirmation data

        Returns:
            Updated order
        """
        order = OrderService.get_order_by_id(db, order_id)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        # Verify buyer owns this order
        if order.buyer_id != buyer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only confirm delivery for your own orders"
            )

        # Verify current status
        if order.status != OrderStatus.SHIPPED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot confirm delivery for order with status: {order.status.value}"
            )

        # Update order
        order.status = OrderStatus.DELIVERED
        order.delivered_at = datetime.utcnow()
        order.delivery_confirmation_code = deliver_data.delivery_confirmation_code
        if deliver_data.buyer_notes:
            order.buyer_notes = (order.buyer_notes or "") + f"\n[Delivery] {deliver_data.buyer_notes}"
        order.updated_at = datetime.utcnow()

        # Update product statistics
        product = db.query(Product).filter(Product.id == order.product_id).first()
        if product:
            product.total_orders += 1

        db.commit()
        db.refresh(order)

        logger.info(f"Order {order.order_number} delivered, confirmed by buyer {buyer_id}")
        return order

    @staticmethod
    def cancel_order(
        db: Session,
        order_id: int,
        user_id: int,
        cancel_data: CancelOrderRequest
    ) -> Order:
        """
        Cancel order

        Args:
            db: Database session
            order_id: Order ID
            user_id: User ID (buyer or seller)
            cancel_data: Cancellation data

        Returns:
            Updated order
        """
        order = OrderService.get_order_by_id(db, order_id)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        # Verify user is buyer or seller
        if order.buyer_id != user_id and order.seller_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own orders"
            )

        # Verify order can be cancelled
        if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel order with status: {order.status.value}"
            )

        if order.payment_status == PaymentStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel paid order. Please raise a dispute instead."
            )

        # Update order
        order.status = OrderStatus.CANCELLED
        order.cancellation_reason = cancel_data.reason
        order.cancelled_by = user_id
        order.cancelled_at = datetime.utcnow()
        order.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(order)

        logger.info(f"Order {order.order_number} cancelled by user {user_id}")
        return order
