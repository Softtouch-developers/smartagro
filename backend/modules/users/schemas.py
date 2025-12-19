"""
User Management Schemas
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class UpdateProfileRequest(BaseModel):
    """Request model for updating user profile"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    region: Optional[str] = Field(None, max_length=50)
    district: Optional[str] = Field(None, max_length=100)
    town_city: Optional[str] = Field(None, max_length=100)
    gps_address: Optional[str] = Field(None, max_length=50)
    detailed_address: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    language_preference: Optional[str] = Field(None, pattern="^(en|tw)$")
    notification_enabled: Optional[bool] = None
    sms_notification_enabled: Optional[bool] = None

    # Farmer-specific fields
    farm_name: Optional[str] = Field(None, max_length=255)
    farm_size_acres: Optional[float] = Field(None, gt=0)
    years_farming: Optional[int] = Field(None, ge=0)

    # Financial fields
    bank_name: Optional[str] = Field(None, max_length=100)
    bank_code: Optional[str] = Field(None, max_length=10)
    account_number: Optional[str] = Field(None, max_length=20)
    account_name: Optional[str] = Field(None, max_length=255)

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "Kwame Mensah",
                "region": "Ashanti",
                "district": "Kumasi Metro",
                "town_city": "Kumasi",
                "farm_name": "Mensah Organic Farm",
                "farm_size_acres": 10.5,
                "years_farming": 15
            }
        }


class DeleteAccountRequest(BaseModel):
    """Request model for account deletion (admin only)"""
    reason: Optional[str] = Field(None, max_length=500, description="Reason for deletion")
    force: bool = Field(False, description="Force delete even with active transactions")

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "User requested account deletion",
                "force": False
            }
        }


class SwitchModeRequest(BaseModel):
    """Request model for switching user mode"""
    target_mode: str = Field(..., pattern="^(FARMER|BUYER|farmer|buyer)$", description="Target mode (FARMER or BUYER)")

    class Config:
        json_schema_extra = {
            "example": {
                "target_mode": "FARMER"
            }
        }


class UserProfileResponse(BaseModel):
    """Response model for user profile"""
    id: int
    email: str
    phone_number: str
    full_name: str
    user_type: str
    profile_image_url: Optional[str] = None
    email_verified: bool
    phone_verified: bool
    is_verified: bool
    region: Optional[str] = None
    district: Optional[str] = None
    town_city: Optional[str] = None
    account_status: str
    created_at: Optional[str] = None
    last_login: Optional[str] = None

    # Optional farmer fields
    farm_name: Optional[str] = None
    farm_size_acres: Optional[float] = None
    years_farming: Optional[int] = None

    # Optional buyer fields
    wallet_balance: Optional[float] = None

    class Config:
        from_attributes = True


class DeleteAccountResponse(BaseModel):
    """Response model for account deletion"""
    success: bool
    message: str
    user_id: int
    email: str
    deleted_at: str
    deleted_by_admin: bool
    admin_reason: Optional[str] = None
    deactivated_products: bool
