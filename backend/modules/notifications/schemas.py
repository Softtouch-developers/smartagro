"""
Notification Schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class NotificationResponse(BaseModel):
    """Notification response"""
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    sms_sent: bool
    related_order_id: Optional[int] = None
    related_product_id: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    """Unread count response"""
    unread_count: int


class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str
