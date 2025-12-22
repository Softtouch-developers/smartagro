"""
Order Management Schemas
Pydantic models for order request/response validation
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from models import OrderStatus, DeliveryMethod


# ==================== REQUEST SCHEMAS ====================

class CreateOrderRequest(BaseModel):
    """Create order request"""
    product_id: int
    quantity: float = Field(..., gt=0)
    delivery_method: DeliveryMethod

    # Delivery information
    delivery_address: Optional[str] = Field(None, min_length=10, max_length=500)
    delivery_region: Optional[str] = Field(None, max_length=50)
    delivery_district: Optional[str] = Field(None, max_length=100)
    delivery_town_city: Optional[str] = Field(None, max_length=100)
    delivery_gps_address: Optional[str] = Field(None, max_length=50)
    delivery_phone: Optional[str] = Field(None, min_length=10, max_length=20)

    # Optional notes
    buyer_notes: Optional[str] = Field(None, max_length=1000)

    class Config:
        json_schema_extra = {
            "example": {
                "product_id": 1,
                "quantity": 50.0,
                "delivery_method": "DELIVERY",
                "delivery_address": "123 Main Street, Near the Market",
                "delivery_region": "Greater Accra",
                "delivery_district": "Accra Metro",
                "delivery_town_city": "Accra",
                "delivery_gps_address": "AK-039-5832",
                "delivery_phone": "+233545142039",
                "buyer_notes": "Please deliver between 9am-5pm"
            }
        }


class UpdateOrderStatusRequest(BaseModel):
    """Update order status request"""
    status: OrderStatus
    notes: Optional[str] = Field(None, max_length=500)

    class Config:
        json_schema_extra = {
            "example": {
                "status": "SHIPPED",
                "notes": "Order shipped via VIP Transport. Expected delivery in 2 days."
            }
        }


class ShipOrderRequest(BaseModel):
    """Ship order request"""
    tracking_number: Optional[str] = Field(None, max_length=100)
    carrier: Optional[str] = Field(None, max_length=100)
    estimated_delivery_date: Optional[datetime] = None
    seller_notes: Optional[str] = Field(None, max_length=500)

    class Config:
        json_schema_extra = {
            "example": {
                "tracking_number": "VIP123456",
                "carrier": "VIP Transport",
                "estimated_delivery_date": "2025-12-10T00:00:00Z",
                "seller_notes": "Package sealed and ready for delivery"
            }
        }


class DeliverOrderRequest(BaseModel):
    """Confirm delivery request"""
    delivery_confirmation_code: Optional[str] = Field(None, max_length=20)
    buyer_notes: Optional[str] = Field(None, max_length=500)

    class Config:
        json_schema_extra = {
            "example": {
                "delivery_confirmation_code": "DELV123",
                "buyer_notes": "Received in good condition"
            }
        }


class CancelOrderRequest(BaseModel):
    """Cancel order request"""
    reason: str = Field(..., min_length=10, max_length=500)

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Changed my mind, no longer need the product"
            }
        }


# ==================== RESPONSE SCHEMAS ====================

class OrderItemResponse(BaseModel):
    """Order item details"""
    product_id: int
    product_name: str
    quantity: float
    unit_of_measure: str
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    """Order response model"""
    id: int
    order_number: str

    # Parties
    buyer_id: int
    seller_id: int
    product_id: Optional[int]

    # Order details
    quantity: float
    unit_price: float
    subtotal: float
    delivery_fee: float
    platform_fee: float
    total_amount: float

    # Status
    status: str
    payment_status: str

    # Delivery
    delivery_method: str
    delivery_address: Optional[str]
    delivery_region: Optional[str]
    delivery_district: Optional[str]
    delivery_town_city: Optional[str]
    delivery_gps_address: Optional[str]
    delivery_phone: Optional[str]

    # Tracking
    tracking_number: Optional[str]
    carrier: Optional[str]
    shipped_at: Optional[datetime]
    delivered_at: Optional[datetime]
    estimated_delivery_date: Optional[datetime]

    # Notes
    buyer_notes: Optional[str]
    seller_notes: Optional[str]
    admin_notes: Optional[str]

    # Product details (embedded)
    product_name: Optional[str] = None
    product_image: Optional[str] = None

    # Seller details (embedded)
    seller_name: Optional[str] = None
    seller_phone: Optional[str] = None

    # Buyer details (embedded)
    buyer_name: Optional[str] = None
    buyer_phone: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    """Paginated order list response"""
    success: bool = True
    total: int
    page: int
    page_size: int
    total_pages: int
    orders: List[OrderResponse]


class OrderDetailResponse(BaseModel):
    """Detailed order response"""
    success: bool = True
    order: OrderResponse
    product: dict  # Product details
    seller: dict  # Seller details
    buyer: dict  # Buyer details


class CreateOrderResponse(BaseModel):
    """Create order response"""
    success: bool
    message: str
    order_id: int
    order_number: str
    total_amount: float
    payment_required: bool = True


class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str
