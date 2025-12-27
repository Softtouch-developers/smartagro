"""
Escrow & Payment Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InitializePaymentRequest(BaseModel):
    """Initialize payment request"""
    order_id: int
    callback_url: Optional[str] = None

    class Config:
        json_schema_extra = {"example": {"order_id": 1}}


class InitializePaymentResponse(BaseModel):
    """Initialize payment response"""
    success: bool
    message: str
    authorization_url: str
    reference: str
    access_code: str
    amount: float


class EscrowResponse(BaseModel):
    """Escrow transaction response"""
    id: int
    order_id: int
    amount: float
    platform_fee: float
    seller_payout: float
    status: str
    paystack_reference: str
    auto_release_date: Optional[datetime]
    released_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str
