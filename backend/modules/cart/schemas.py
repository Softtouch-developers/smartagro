"""
Cart Pydantic Schemas
Request and response models for cart endpoints
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal


# ==================== REQUEST SCHEMAS ====================

class AddToCartRequest(BaseModel):
    """Request to add a product to cart"""
    product_id: int
    quantity: Decimal = Field(..., gt=0, description="Quantity to add")

    class Config:
        json_schema_extra = {
            "example": {
                "product_id": 123,
                "quantity": 5.0
            }
        }


class UpdateCartItemRequest(BaseModel):
    """Request to update cart item quantity"""
    quantity: Decimal = Field(..., gt=0, description="New quantity")

    class Config:
        json_schema_extra = {
            "example": {
                "quantity": 10.0
            }
        }


class CheckoutRequest(BaseModel):
    """Request to checkout cart"""
    delivery_method: str = Field(..., pattern="^(DELIVERY|PICKUP)$")
    delivery_address: Optional[str] = None
    delivery_region: Optional[str] = None
    delivery_district: Optional[str] = None
    delivery_phone: str = Field(..., min_length=10, max_length=20)
    delivery_notes: Optional[str] = None

    # Email for checkout (required if user has no email on file)
    checkout_email: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "delivery_method": "DELIVERY",
                "delivery_address": "123 Main Street, Accra",
                "delivery_region": "Greater Accra",
                "delivery_district": "Accra Metropolitan",
                "delivery_phone": "+233241234567",
                "delivery_notes": "Call before delivery"
            }
        }


# ==================== RESPONSE SCHEMAS ====================

class CartItemResponse(BaseModel):
    """Cart item response"""
    id: int
    product_id: int
    product_name: str
    product_image: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    subtotal: Decimal
    unit_of_measure: str
    available_quantity: Decimal  # Current stock

    class Config:
        from_attributes = True


class CartResponse(BaseModel):
    """Cart response with all items and totals"""
    id: int
    farmer_id: int
    farmer_name: str
    farmer_location: str  # "Town, Region"
    status: str
    items: List[CartItemResponse]
    items_count: int
    subtotal: Decimal
    platform_fee: Decimal
    delivery_fee: Decimal
    total: Decimal
    expires_at: datetime
    expires_in_minutes: int

    class Config:
        from_attributes = True


class CheckoutResponse(BaseModel):
    """Checkout response"""
    success: bool
    message: str
    order_id: int
    order_number: str
    total_amount: float
    payment_required: bool = True

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Order created successfully",
                "order_id": 456,
                "order_number": "ORD-1234567890-ABC123",
                "total_amount": 150.00,
                "payment_required": True
            }
        }


class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str
    cart_id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Added to cart",
                "cart_id": 123
            }
        }
