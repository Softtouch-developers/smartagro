"""
Chat Schemas
Pydantic schemas for buyer-seller messaging
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SendMessageRequest(BaseModel):
    """Request to send a message"""
    receiver_id: int
    text: Optional[str] = None
    image_url: Optional[str] = None
    voice_note_url: Optional[str] = None
    related_product_id: Optional[int] = None


class MessageResponse(BaseModel):
    """Message response"""
    id: str
    conversation_id: str
    sender_id: int
    receiver_id: int
    sender_type: str  # BUYER or FARMER
    text: Optional[str] = None
    image_url: Optional[str] = None
    voice_note_url: Optional[str] = None
    related_product_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Conversation response"""
    id: str
    buyer_id: int
    seller_id: int
    related_product_id: Optional[int] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class MarkAsReadRequest(BaseModel):
    """Mark message as read"""
    message_id: str


class UploadVoiceNoteResponse(BaseModel):
    """Voice note upload response"""
    success: bool
    voice_note_url: str
    message: str
