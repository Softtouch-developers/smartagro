"""
Cart Service
Business logic for shopping cart operations
"""
import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from models import (
    Cart, CartItem, Product, User, Order, OrderItem,
    OrderStatus, PaymentStatus, ProductStatus, DeliveryMethod
)
from config import settings

logger = logging.getLogger(__name__)

# Cart configuration
CART_EXPIRY_HOURS = 8
PLATFORM_FEE_PERCENTAGE = Decimal('0.05')  # 5%
BASE_DELIVERY_FEE = Decimal('20.00')


class DifferentFarmerError(ValueError):
    """Raised when adding item from different farmer than currently in cart"""
    pass


class CartService:
    """Shopping cart service"""

    @staticmethod
    def get_active_cart(buyer_id: int, db: Session) -> Optional[Cart]:
        """
        Get user's active cart if exists and not expired

        Args:
            buyer_id: Buyer's user ID
            db: Database session

        Returns:
            Cart object or None
        """
        cart = db.query(Cart).filter(
            Cart.buyer_id == buyer_id,
            Cart.status == "ACTIVE"
        ).first()

        if cart and cart.expires_at < datetime.utcnow():
            # Cart has expired
            cart.status = "EXPIRED"
            db.commit()
            logger.info(f"Cart {cart.id} expired for user {buyer_id}")
            return None

        return cart

    @staticmethod
    def add_to_cart(
        buyer_id: int,
        product_id: int,
        quantity: Decimal,
        db: Session
    ) -> Cart:
        """
        Add product to cart

        Rules:
        - If no active cart, create one
        - If active cart exists with different farmer, raise error
        - If product already in cart, update quantity
        - Refresh expiry on any cart update

        Args:
            buyer_id: Buyer's user ID
            product_id: Product ID to add
            quantity: Quantity to add
            db: Database session

        Returns:
            Updated Cart object

        Raises:
            ValueError: If validation fails
            DifferentFarmerError: If cart has items from different farmer
        """
        # Get and validate product
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Product not found")

        if product.status != ProductStatus.AVAILABLE:
            raise ValueError("Product is not available")

        if quantity > product.quantity_available:
            raise ValueError(
                f"Only {product.quantity_available} {product.unit_of_measure.value} available"
            )

        if product.minimum_order_quantity and quantity < product.minimum_order_quantity:
            raise ValueError(
                f"Minimum order quantity is {product.minimum_order_quantity} {product.unit_of_measure.value}"
            )

        # Prevent buying own product
        if product.seller_id == buyer_id:
            raise ValueError("Cannot add your own product to cart")

        # Get or create cart
        cart = CartService.get_active_cart(buyer_id, db)

        if cart:
            # Check if same farmer
            if cart.farmer_id != product.seller_id:
                raise DifferentFarmerError(
                    "Your cart contains items from a different farmer. "
                    "Please checkout or clear your cart first to buy from another farmer."
                )
        else:
            # Create new cart
            cart = Cart(
                buyer_id=buyer_id,
                farmer_id=product.seller_id,
                status="ACTIVE",
                expires_at=datetime.utcnow() + timedelta(hours=CART_EXPIRY_HOURS)
            )
            db.add(cart)
            db.flush()  # Get cart ID
            logger.info(f"Created new cart {cart.id} for user {buyer_id}")

        # Check if product already in cart
        existing_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.id,
            CartItem.product_id == product_id
        ).first()

        if existing_item:
            # Update quantity
            new_quantity = existing_item.quantity + quantity
            if new_quantity > product.quantity_available:
                raise ValueError(
                    f"Cannot add more. Only {product.quantity_available} {product.unit_of_measure.value} available. "
                    f"You already have {existing_item.quantity} in cart."
                )
            existing_item.quantity = new_quantity
            existing_item.updated_at = datetime.utcnow()
            logger.info(f"Updated cart item {existing_item.id}: quantity {new_quantity}")
        else:
            # Add new item
            cart_item = CartItem(
                cart_id=cart.id,
                product_id=product_id,
                quantity=quantity,
                unit_price_snapshot=product.price_per_unit
            )
            db.add(cart_item)
            logger.info(f"Added new item to cart {cart.id}: product {product_id}, qty {quantity}")

        # Refresh cart expiry
        cart.expires_at = datetime.utcnow() + timedelta(hours=CART_EXPIRY_HOURS)
        cart.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(cart)

        return cart

    @staticmethod
    def update_cart_item(
        buyer_id: int,
        item_id: int,
        quantity: Decimal,
        db: Session
    ) -> Cart:
        """
        Update quantity of a cart item

        Args:
            buyer_id: Buyer's user ID
            item_id: Cart item ID
            quantity: New quantity
            db: Database session

        Returns:
            Updated Cart object

        Raises:
            ValueError: If validation fails
        """
        cart = CartService.get_active_cart(buyer_id, db)
        if not cart:
            raise ValueError("No active cart found")

        item = db.query(CartItem).filter(
            CartItem.id == item_id,
            CartItem.cart_id == cart.id
        ).first()

        if not item:
            raise ValueError("Item not found in cart")

        # Check availability
        if quantity > item.product.quantity_available:
            raise ValueError(
                f"Only {item.product.quantity_available} {item.product.unit_of_measure.value} available"
            )

        # Check minimum order quantity
        if item.product.minimum_order_quantity and quantity < item.product.minimum_order_quantity:
            raise ValueError(
                f"Minimum order quantity is {item.product.minimum_order_quantity}"
            )

        item.quantity = quantity
        item.updated_at = datetime.utcnow()

        # Refresh cart expiry
        cart.expires_at = datetime.utcnow() + timedelta(hours=CART_EXPIRY_HOURS)
        cart.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(cart)

        logger.info(f"Updated cart item {item_id}: quantity {quantity}")

        return cart

    @staticmethod
    def remove_from_cart(buyer_id: int, item_id: int, db: Session) -> Optional[Cart]:
        """
        Remove item from cart

        Args:
            buyer_id: Buyer's user ID
            item_id: Cart item ID
            db: Database session

        Returns:
            Updated Cart object, or None if cart becomes empty

        Raises:
            ValueError: If item not found
        """
        cart = CartService.get_active_cart(buyer_id, db)
        if not cart:
            raise ValueError("No active cart found")

        item = db.query(CartItem).filter(
            CartItem.id == item_id,
            CartItem.cart_id == cart.id
        ).first()

        if not item:
            raise ValueError("Item not found in cart")

        db.delete(item)
        db.commit()

        logger.info(f"Removed item {item_id} from cart {cart.id}")

        # Check if cart is now empty
        remaining_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).count()
        if remaining_items == 0:
            cart.status = "ABANDONED"
            db.commit()
            logger.info(f"Cart {cart.id} abandoned (empty)")
            return None

        db.refresh(cart)
        return cart

    @staticmethod
    def clear_cart(buyer_id: int, db: Session) -> None:
        """
        Clear all items from cart

        Args:
            buyer_id: Buyer's user ID
            db: Database session
        """
        cart = CartService.get_active_cart(buyer_id, db)
        if cart:
            cart.status = "ABANDONED"
            db.commit()
            logger.info(f"Cart {cart.id} cleared by user {buyer_id}")

    @staticmethod
    def calculate_totals(cart: Cart, delivery_method: str = "DELIVERY") -> Dict[str, Decimal]:
        """
        Calculate cart totals

        Args:
            cart: Cart object with items loaded
            delivery_method: "DELIVERY" or "PICKUP"

        Returns:
            Dict with subtotal, platform_fee, delivery_fee, total
        """
        subtotal = sum(
            item.quantity * item.unit_price_snapshot
            for item in cart.items
        )

        platform_fee = subtotal * PLATFORM_FEE_PERCENTAGE

        # Delivery fee: base + 2% for orders > 500
        # Only charge if delivery method is DELIVERY
        delivery_fee = Decimal('0.00')
        if delivery_method == "DELIVERY":
            delivery_fee = BASE_DELIVERY_FEE
            if subtotal > 500:
                delivery_fee += subtotal * Decimal('0.02')

        total = subtotal + platform_fee + delivery_fee

        return {
            "subtotal": subtotal,
            "platform_fee": platform_fee,
            "delivery_fee": delivery_fee,
            "total": total
        }

    @staticmethod
    def checkout(
        buyer_id: int,
        checkout_data: Dict[str, Any],
        db: Session
    ) -> Order:
        """
        Convert cart to order

        Args:
            buyer_id: Buyer's user ID
            checkout_data: Checkout form data
            db: Database session

        Returns:
            Created Order object

        Raises:
            ValueError: If validation fails
        """
        cart = CartService.get_active_cart(buyer_id, db)
        if not cart:
            raise ValueError("No active cart found")

        if not cart.items:
            raise ValueError("Cart is empty")

        # Validate stock availability for all items
        for item in cart.items:
            product = item.product
            if product.quantity_available < item.quantity:
                raise ValueError(
                    f"Insufficient stock for {product.product_name}. "
                    f"Available: {product.quantity_available} {product.unit_of_measure.value}"
                )
            if product.status != ProductStatus.AVAILABLE:
                raise ValueError(f"Product '{product.product_name}' is no longer available")

        # Determine delivery method
        delivery_method_str = checkout_data.get("delivery_method", "DELIVERY")
        try:
            delivery_method = DeliveryMethod[delivery_method_str]
        except KeyError:
            raise ValueError(f"Invalid delivery method: {delivery_method_str}")

        # Calculate totals
        totals = CartService.calculate_totals(cart, delivery_method=delivery_method_str)

        # Generate order number
        timestamp = int(datetime.utcnow().timestamp())
        random_suffix = uuid.uuid4().hex[:6].upper()
        order_number = f"ORD-{timestamp}-{random_suffix}"

        # Create order
        order = Order(
            order_number=order_number,
            buyer_id=buyer_id,
            seller_id=cart.farmer_id,
            product_id=None,  # Multi-item order
            quantity_ordered=sum(item.quantity for item in cart.items),
            unit_price=Decimal('0'),  # N/A for multi-item
            subtotal=totals["subtotal"],
            platform_fee=totals["platform_fee"],
            delivery_fee=totals["delivery_fee"],
            total_amount=totals["total"],
            delivery_method=delivery_method,
            delivery_address=checkout_data.get("delivery_address", ""),
            delivery_region=checkout_data.get("delivery_region"),
            delivery_district=checkout_data.get("delivery_district"),
            delivery_phone=checkout_data.get("delivery_phone"),
            delivery_notes=checkout_data.get("delivery_notes"),
            status=OrderStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
            payment_method="PAYSTACK"
        )
        db.add(order)
        db.flush()  # Get order ID

        # Create order items and reserve stock
        for cart_item in cart.items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                quantity=cart_item.quantity,
                unit_price=cart_item.unit_price_snapshot,
                subtotal=cart_item.quantity * cart_item.unit_price_snapshot,
                product_name_snapshot=cart_item.product.product_name,
                unit_of_measure_snapshot=cart_item.product.unit_of_measure.value
            )
            db.add(order_item)

            # Reserve stock (reduce available quantity)
            cart_item.product.quantity_available -= cart_item.quantity

            logger.info(
                f"Created order item for product {cart_item.product_id}: "
                f"qty {cart_item.quantity}, subtotal {order_item.subtotal}"
            )

        # Mark cart as checked out
        cart.status = "CHECKED_OUT"

        db.commit()
        db.refresh(order)

        logger.info(f"Checkout complete: Order {order.order_number} created from cart {cart.id}")

        return order

    @staticmethod
    def expire_old_carts(db: Session) -> int:
        """
        Background task: expire old carts

        Args:
            db: Database session

        Returns:
            Number of carts expired
        """
        expired_count = db.query(Cart).filter(
            Cart.status == "ACTIVE",
            Cart.expires_at < datetime.utcnow()
        ).update({"status": "EXPIRED"})

        db.commit()

        if expired_count > 0:
            logger.info(f"Expired {expired_count} carts")

        return expired_count
