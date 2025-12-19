"""
Cart Routes
API endpoints for shopping cart operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from database import get_db
from models import User
from modules.auth.dependencies import get_current_user, get_current_buyer
from modules.cart.service import CartService
from modules.cart.schemas import (
    AddToCartRequest,
    UpdateCartItemRequest,
    CheckoutRequest,
    CartResponse,
    CartItemResponse,
    CheckoutResponse,
    MessageResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=CartResponse)
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's active cart

    Returns cart with all items, totals, and expiry time
    """
    cart = CartService.get_active_cart(current_user.id, db)

    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NO_CART",
                "message": "No active cart found"
            }
        )

    totals = CartService.calculate_totals(cart)
    # Calculate time remaining in seconds
    time_remaining = (cart.expires_at - datetime.utcnow()).total_seconds()
    time_remaining_seconds = int(max(0, time_remaining))
    expires_in = int(time_remaining / 60)

    # Build farmer location string
    farmer_location = "Unknown"
    if cart.farmer.town_city and cart.farmer.region:
        farmer_location = f"{cart.farmer.town_city}, {cart.farmer.region}"
    elif cart.farmer.region:
        farmer_location = cart.farmer.region
    elif cart.farmer.town_city:
        farmer_location = cart.farmer.town_city

    return CartResponse(
        id=cart.id,
        farmer_id=cart.farmer_id,
        farmer_name=cart.farmer.full_name,
        farmer_location=farmer_location,
        status=cart.status,
        items=[
            CartItemResponse(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price_snapshot=item.unit_price_snapshot,
                subtotal=item.quantity * item.unit_price_snapshot,
                product={
                    "product_name": item.product.product_name,
                    "primary_image_url": item.product.primary_image_url,
                    "unit_of_measure": item.product.unit_of_measure.value,
                    "quantity_available": item.product.quantity_available
                }
            )
            for item in cart.items
        ],
        items_count=len(cart.items),
        subtotal=totals["subtotal"],
        platform_fee=totals["platform_fee"],
        delivery_fee=totals["delivery_fee"],
        total=totals["total"],
        expires_at=cart.expires_at,
        expires_in_minutes=max(0, expires_in),
        time_remaining_seconds=time_remaining_seconds
    )


@router.post("/items", response_model=MessageResponse)
async def add_to_cart(
    request: AddToCartRequest,
    current_user: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
):
    """
    Add a product to cart

    - Creates new cart if none exists
    - Cannot mix products from different farmers
    - Updates quantity if product already in cart
    - Refreshes cart expiry time
    """
    try:
        cart = CartService.add_to_cart(
            buyer_id=current_user.id,
            product_id=request.product_id,
            quantity=request.quantity,
            db=db
        )

        return MessageResponse(
            success=True,
            message="Added to cart",
            cart_id=cart.id
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "CART_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Add to cart error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to add to cart"
            }
        )


@router.put("/items/{item_id}", response_model=MessageResponse)
async def update_cart_item(
    item_id: int,
    request: UpdateCartItemRequest,
    current_user: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
):
    """
    Update cart item quantity

    - Validates stock availability
    - Refreshes cart expiry time
    """
    try:
        CartService.update_cart_item(
            buyer_id=current_user.id,
            item_id=item_id,
            quantity=request.quantity,
            db=db
        )

        return MessageResponse(
            success=True,
            message="Cart updated"
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "CART_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Update cart error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to update cart"
            }
        )


@router.delete("/items/{item_id}", response_model=MessageResponse)
async def remove_from_cart(
    item_id: int,
    current_user: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
):
    """
    Remove item from cart

    If removing the last item, cart status changes to ABANDONED
    """
    try:
        cart = CartService.remove_from_cart(
            buyer_id=current_user.id,
            item_id=item_id,
            db=db
        )

        if cart is None:
            return MessageResponse(
                success=True,
                message="Item removed. Cart is now empty."
            )

        return MessageResponse(
            success=True,
            message="Item removed",
            cart_id=cart.id
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "CART_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Remove from cart error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to remove from cart"
            }
        )


@router.delete("", response_model=MessageResponse)
async def clear_cart(
    current_user: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
):
    """
    Clear all items from cart

    Marks cart as ABANDONED
    """
    try:
        CartService.clear_cart(current_user.id, db)

        return MessageResponse(
            success=True,
            message="Cart cleared"
        )

    except Exception as e:
        logger.error(f"Clear cart error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to clear cart"
            }
        )


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
):
    """
    Checkout cart and create order

    - Validates stock for all items
    - Creates order with order items
    - Reserves stock (reduces available quantity)
    - If user has no email and checkout_email provided, updates profile

    After checkout, proceed to payment initialization.
    """
    try:
        # Handle email requirement for Paystack
        if not current_user.email:
            if not request.checkout_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "EMAIL_REQUIRED",
                        "message": "Email is required for payment. Please provide checkout_email."
                    }
                )
            # Update user's email
            current_user.email = request.checkout_email
            db.flush()
            logger.info(f"Updated email for user {current_user.id} during checkout")

        order = CartService.checkout(
            buyer_id=current_user.id,
            checkout_data=request.model_dump(),
            db=db
        )

        return CheckoutResponse(
            success=True,
            message="Order created successfully",
            order_id=order.id,
            order_number=order.order_number,
            total_amount=float(order.total_amount),
            payment_required=True
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "CHECKOUT_ERROR",
                "message": str(e)
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Checkout error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to checkout"
            }
        )
