"""
Authentication Pydantic Schemas
Request and response models for auth endpoints
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from models import UserType


# ==================== REQUEST SCHEMAS ====================

class SignupRequest(BaseModel):
    """User signup request"""
    email: EmailStr
    phone_number: str = Field(..., min_length=10, max_length=20)
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=100)
    user_type: UserType

    # Optional fields
    region: Optional[str] = None
    district: Optional[str] = None
    town_city: Optional[str] = None

    # Farmer-specific
    farm_name: Optional[str] = None
    farm_size_acres: Optional[float] = None

    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v

    @validator('phone_number')
    def validate_phone_number(cls, v):
        """Validate Ghanaian phone number"""
        # Remove spaces and dashes
        cleaned = v.replace(" ", "").replace("-", "")

        # Check if it's a valid Ghana number
        if cleaned.startswith("+233"):
            if len(cleaned) != 13:  # +233 + 9 digits
                raise ValueError('Invalid Ghana phone number format')
        elif cleaned.startswith("0"):
            if len(cleaned) != 10:  # 0 + 9 digits
                raise ValueError('Invalid Ghana phone number format')
        elif cleaned.startswith("233"):
            if len(cleaned) != 12:  # 233 + 9 digits
                raise ValueError('Invalid Ghana phone number format')
        else:
            raise ValueError('Phone number must be a Ghana number (start with +233, 233, or 0)')

        return cleaned

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com",
                "phone_number": "+233545142039",
                "full_name": "Kwame Asante",
                "password": "SecurePass123!",
                "user_type": "FARMER",
                "region": "Ashanti",
                "district": "Kumasi",
                "town_city": "Kumasi",
                "farm_name": "Asante Farms",
                "farm_size_acres": 5.5
            }
        }


class VerifyOTPRequest(BaseModel):
    """OTP verification request"""
    user_id: int
    otp_code: str = Field(..., min_length=6, max_length=6)
    otp_type: str = Field(..., pattern="^(EMAIL_VERIFICATION|PHONE_VERIFICATION|PASSWORD_RESET|TRANSACTION_CONFIRM)$")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 21,
                "otp_code": "766182",
                "otp_type": "PHONE_VERIFICATION"
            }
        }


class ResendOTPRequest(BaseModel):
    """Resend OTP request"""
    user_id: int
    otp_type: str = Field(..., pattern="^(EMAIL_VERIFICATION|PHONE_VERIFICATION|PASSWORD_RESET|TRANSACTION_CONFIRM)$")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 21,
                "otp_type": "PHONE_VERIFICATION"
            }
        }


class LoginRequest(BaseModel):
    """User login request"""
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com",
                "password": "SecurePass123!"
            }
        }


class RefreshTokenRequest(BaseModel):
    """Refresh access token request"""
    refresh_token: str

    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }


class ForgotPasswordRequest(BaseModel):
    """Forgot password request"""
    email: EmailStr

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com"
            }
        }


class ResetPasswordRequest(BaseModel):
    """Reset password request"""
    user_id: int
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=100)

    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 21,
                "otp_code": "885319",
                "new_password": "NewSecurePass123!"
            }
        }


# ==================== RESPONSE SCHEMAS ====================

class UserResponse(BaseModel):
    """User data response"""
    id: int
    email: str
    phone_number: str
    full_name: str
    user_type: str
    profile_image_url: Optional[str] = None

    # Verification
    email_verified: bool
    phone_verified: bool
    is_verified: bool

    # Location
    region: Optional[str] = None
    district: Optional[str] = None
    town_city: Optional[str] = None
    gps_address: Optional[str] = None

    # Account status
    account_status: str
    is_active: bool

    # Farmer-specific
    farm_name: Optional[str] = None
    farm_size_acres: Optional[float] = None
    years_farming: Optional[int] = None

    # Statistics
    average_rating: Optional[float] = None
    total_reviews: int
    total_sales: int
    total_purchases: int

    # Timestamps
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class SignupResponse(BaseModel):
    """Signup response"""
    success: bool
    message: str
    user_id: int
    email: str
    phone_number: str
    verification_required: bool = True

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "User created successfully. Please verify your phone number.",
                "user_id": 123,
                "email": "farmer@example.com",
                "phone_number": "+233241234567",
                "verification_required": True
            }
        }


class VerifyOTPResponse(BaseModel):
    """OTP verification response"""
    success: bool
    message: str
    verified: bool
    user: Optional[UserResponse] = None
    tokens: Optional[TokenResponse] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Phone number verified successfully",
                "verified": True
            }
        }


class LoginResponse(BaseModel):
    """Login response"""
    success: bool
    message: str
    user: UserResponse
    tokens: TokenResponse

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Login successful"
            }
        }


class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Operation completed successfully"
            }
        }


class ErrorResponse(BaseModel):
    """Error response"""
    error: dict
    request_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password",
                    "details": {}
                },
                "request_id": "uuid-here",
                "timestamp": "2025-12-06T10:30:00Z"
            }
        }
