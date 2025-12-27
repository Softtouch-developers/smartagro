"""
Order Management Routes
API endpoints for order operations
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import logging
import math

from database import get_db, SessionLocal
from modules.notifications.service import notify_order_created, notify_order_shipped
from models import User, UserType
from modules.auth.dependencies import get_current_verified_user, get_current_buyer, get_current_farmer
from modules.orders.service import OrderService
from modules.orders.schemas import (
    CreateOrderRequest,
    ShipOrderRequest,
    DeliverOrderRequest,
    CancelOrderRequest,
    UpdateOrderStatusRequest,
    OrderResponse,
    OrderListResponse,
    OrderDetailResponse,
    CreateOrderResponse,
    MessageResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()



async def background_notify_order_created(order_id: int, buyer_id: int, seller_id: int):
    """Background task for order creation notification"""
    db = SessionLocal()
    try:
        await notify_order_created(db, order_id, buyer_id, seller_id)
    finally:
        db.close()


async def background_notify_order_shipped(order_id: int, buyer_id: int):
    """Background task for order shipment notification"""
    db = SessionLocal()
    try:
        await notify_order_shipped(db, order_id, buyer_id)
    finally:
        db.close()


@router.post("", response_model=CreateOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: CreateOrderRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
):
    """
    Create a new order

    **Requires buyer authentication**

    - **product_id**: Product to order
    - **quantity**: Quantity to order
    - **delivery_method**: DELIVERY or PICKUP
    - **delivery_address**: Full delivery address
    - **delivery_phone**: Contact phone for delivery

    Returns order details and payment_required=True (buyer needs to pay)
    """
    try:
        order = OrderService.create_order(
            db=db,
            buyer_id=current_user.id,
            order_data=order_data
        )

        # Send notification in background
        background_tasks.add_task(
            background_notify_order_created,
            order.id,
            current_user.id,
            order.seller_id
        )

        return CreateOrderResponse(
            success=True,
            message="Order created successfully. Please proceed to payment.",
            order_id=order.id,
            order_number=order.order_number,
            total_amount=float(order.total_amount),
            payment_required=True
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create order error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )


@router.get("", response_model=OrderListResponse)
async def list_orders(
    order_status: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    List orders for current user

    **Requires authentication**

    - Buyers see their purchase orders
    - Farmers see their sales orders

    Query parameters:
    - **status**: Filter by order status
    - **page**: Page number
    - **page_size**: Items per page
    """
    try:
        orders, total = OrderService.list_user_orders(
            db=db,
            user_id=current_user.id,
            user_type=current_user.user_type.value,
            status=order_status,
            page=page,
            page_size=page_size
        )

        # Calculate total pages
        total_pages = math.ceil(total / page_size) if total > 0 else 1

        # Convert to response models with buyer/seller info
        order_responses = []
        for o in orders:
            # Build order dict manually to avoid ORM relationship issues
            order_dict = {
                'id': o.id,
                'order_number': o.order_number,
                'buyer_id': o.buyer_id,
                'seller_id': o.seller_id,
                'product_id': o.product_id,
                'quantity': float(o.quantity) if o.quantity else 0,
                'unit_price': float(o.unit_price) if o.unit_price else 0,
                'subtotal': float(o.subtotal) if o.subtotal else 0,
                'delivery_fee': float(o.delivery_fee) if o.delivery_fee else 0,
                'platform_fee': float(o.platform_fee) if o.platform_fee else 0,
                'total_amount': float(o.total_amount) if o.total_amount else 0,
                'status': o.status.value if hasattr(o.status, 'value') else str(o.status),
                'payment_status': o.payment_status.value if hasattr(o.payment_status, 'value') else str(o.payment_status),
                'delivery_method': o.delivery_method.value if hasattr(o.delivery_method, 'value') else str(o.delivery_method),
                'delivery_address': o.delivery_address,
                'delivery_region': o.delivery_region,
                'delivery_district': o.delivery_district,
                'delivery_town_city': o.delivery_town_city,
                'delivery_gps_address': o.delivery_gps_address,
                'delivery_phone': o.delivery_phone,
                'tracking_number': o.tracking_number,
                'carrier': o.carrier,
                'shipped_at': o.shipped_at,
                'delivered_at': o.delivered_at,
                'estimated_delivery_date': getattr(o, 'expected_delivery_date', None),
                'buyer_notes': o.buyer_notes,
                'seller_notes': o.seller_notes,
                'admin_notes': o.admin_notes,
                'pickup_confirmed_by_farmer': o.pickup_confirmed_by_farmer or False,
                'pickup_confirmed_by_buyer': o.pickup_confirmed_by_buyer or False,
                'pickup_confirmed_at': o.pickup_confirmed_at,
                'created_at': o.created_at,
                'updated_at': o.updated_at,
            }

            # Add buyer info if relationship is loaded
            if o.buyer:
                order_dict['buyer_name'] = o.buyer.full_name
                order_dict['buyer_phone'] = o.buyer.phone_number
                order_dict['buyer'] = {
                    'id': o.buyer.id,
                    'full_name': o.buyer.full_name,
                    'phone_number': o.buyer.phone_number,
                    'email': o.buyer.email
                }
            # Add seller info if relationship is loaded
            if o.seller:
                order_dict['seller_name'] = o.seller.full_name
                order_dict['seller_phone'] = o.seller.phone_number
            # Add items if relationship is loaded
            if o.items:
                order_dict['items'] = [
                    {
                        'id': item.id,
                        'product_id': item.product_id,
                        'product_name_snapshot': item.product_name_snapshot,
                        'unit_of_measure_snapshot': item.unit_of_measure_snapshot,
                        'product_image_snapshot': item.product_image_snapshot,
                        'quantity': float(item.quantity),
                        'unit_price': float(item.unit_price),
                        'subtotal': float(item.subtotal)
                    }
                    for item in o.items
                ]
                # Add product info from first item
                if len(o.items) > 0:
                    order_dict['product_name'] = o.items[0].product_name_snapshot
                    order_dict['product_image'] = o.items[0].product_image_snapshot
            order_responses.append(OrderResponse(**order_dict))

        return OrderListResponse(
            success=True,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            orders=order_responses
        )

    except Exception as e:
        logger.error(f"List orders error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve orders"
        )


@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get order details by ID

    **Requires authentication**

    Only the buyer or seller can view the order details
    """
    try:
        order, product_info, seller_info, buyer_info = OrderService.get_order_with_details(db, order_id)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        # Verify user has access to this order
        if order.buyer_id != current_user.id and order.seller_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this order"
            )

        return OrderDetailResponse(
            success=True,
            order=OrderResponse.from_orm(order),
            product=product_info,
            seller=seller_info,
            buyer=buyer_info
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get order error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve order"
        )


@router.put("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    status_data: UpdateOrderStatusRequest,
    current_user: User = Depends(get_current_farmer),
    db: Session = Depends(get_db)
):
    """
    Update order status (seller only)

    **Requires farmer authentication**

    Only the seller can update order status.
    Allowed transitions:
    - PAID -> CONFIRMED (start processing)
    - CONFIRMED -> SHIPPED (use /ship endpoint instead for tracking)

    - **status**: New order status
    """
    try:
        order = OrderService.update_order_status(
            db=db,
            order_id=order_id,
            seller_id=current_user.id,
            new_status=status_data.status
        )

        return OrderResponse.from_orm(order)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update order status error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status"
        )


@router.put("/{order_id}/ship", response_model=OrderResponse)
async def ship_order(
    order_id: int,
    ship_data: ShipOrderRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_farmer),
    db: Session = Depends(get_db)
):
    """
    Mark order as shipped

    **Requires farmer authentication**

    Only the seller can mark the order as shipped.
    Order must be in PAID or CONFIRMED status.

    - **tracking_number**: Optional tracking number
    - **carrier**: Optional carrier name
    - **estimated_delivery_date**: Optional estimated delivery date
    - **seller_notes**: Optional notes from seller
    """
    try:
        order = OrderService.ship_order(
            db=db,
            order_id=order_id,
            seller_id=current_user.id,
            ship_data=ship_data
        )

        # Send notification in background
        background_tasks.add_task(
            background_notify_order_shipped,
            order.id,
            order.buyer_id
        )

        return OrderResponse.from_orm(order)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ship order error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ship order"
        )


@router.put("/{order_id}/deliver", response_model=OrderResponse)
async def deliver_order(
    order_id: int,
    deliver_data: DeliverOrderRequest,
    current_user: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
):
    """
    Confirm order delivery

    **Requires buyer authentication**

    Only the buyer can confirm delivery.
    Order must be in SHIPPED status.

    This action will trigger escrow release to the seller.

    - **delivery_confirmation_code**: Optional confirmation code
    - **buyer_notes**: Optional notes from buyer
    """
    try:
        order = OrderService.deliver_order(
            db=db,
            order_id=order_id,
            buyer_id=current_user.id,
            deliver_data=deliver_data
        )

        return OrderResponse.from_orm(order)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deliver order error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm delivery"
        )


@router.put("/{order_id}/cancel", response_model=MessageResponse)
async def cancel_order(
    order_id: int,
    cancel_data: CancelOrderRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Cancel order

    **Requires authentication (buyer or seller)**

    Only unpaid orders can be cancelled.
    For paid orders, raise a dispute instead.

    - **reason**: Reason for cancellation
    """
    try:
        order = OrderService.cancel_order(
            db=db,
            order_id=order_id,
            user_id=current_user.id,
            cancel_data=cancel_data
        )

        return MessageResponse(
            success=True,
            message=f"Order {order.order_number} cancelled successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancel order error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel order"
        )


@router.put("/{order_id}/confirm-pickup", response_model=OrderResponse)
async def confirm_pickup(
    order_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Confirm pickup for a PICKUP order

    **Requires authentication (buyer or seller)**

    Both buyer and seller must confirm pickup for the order to be marked as delivered.
    This endpoint is only for orders with delivery_method = PICKUP.
    """
    try:
        # Determine user type
        user_type = 'FARMER' if current_user.user_type.value == 'FARMER' else 'BUYER'

        order = OrderService.confirm_pickup(
            db=db,
            order_id=order_id,
            user_id=current_user.id,
            user_type=user_type
        )

        return OrderResponse.from_orm(order)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Confirm pickup error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm pickup"
        )


@router.get("/{order_id}/tracking")
async def get_order_tracking(
    order_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get order tracking information

    **Requires authentication**

    Returns tracking details including status history and delivery updates
    """
    try:
        order = OrderService.get_order_by_id(db, order_id)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        # Verify user has access
        if order.buyer_id != current_user.id and order.seller_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this order"
            )

        tracking_info = {
            "success": True,
            "order_number": order.order_number,
            "status": order.status.value,
            "tracking_number": order.tracking_number,
            "carrier": order.carrier,
            "shipped_at": order.shipped_at.isoformat() if order.shipped_at else None,
            "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
            "estimated_delivery_date": order.estimated_delivery_date.isoformat() if order.estimated_delivery_date else None,
            "delivery_address": order.delivery_address,
            "delivery_phone": order.delivery_phone,
            "status_history": [
                {"status": "PENDING", "timestamp": order.created_at.isoformat()},
            ]
        }

        if order.shipped_at:
            tracking_info["status_history"].append({
                "status": "SHIPPED",
                "timestamp": order.shipped_at.isoformat()
            })

        if order.delivered_at:
            tracking_info["status_history"].append({
                "status": "DELIVERED",
                "timestamp": order.delivered_at.isoformat()
            })

        return tracking_info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get tracking error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tracking information"
        )
