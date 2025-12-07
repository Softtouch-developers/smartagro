"""
Storage Schemas
Pydantic schemas for file upload responses
"""
from pydantic import BaseModel
from typing import Optional


class FileUploadResponse(BaseModel):
    """Response for file upload"""
    success: bool
    file_url: str
    message: str


class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str
