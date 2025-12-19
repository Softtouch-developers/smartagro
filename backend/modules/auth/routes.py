"""
Authentication Routes
API endpoints for authentication and authorization
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from database import get_db
from models import OTPType, User
from .schemas import (
    SignupRequest, SignupResponse,
    VerifyOTPRequest, VerifyOTPResponse,
    ResendOTPRequest,
    LoginRequest, LoginResponse,
    RefreshTokenRequest, TokenResponse,
    ForgotPasswordRequest, ResetPasswordRequest,
    VerifyResetOtpRequest, VerifyResetOtpResponse,
    UserResponse, MessageResponse
)
from .service import AuthService
from .dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user

    - **email**: User email address
    - **phone_number**: Ghana phone number (+233...)
    - **full_name**: Full name
    - **password**: Password (min 8 chars, must contain uppercase, lowercase, digit)
    - **user_type**: FARMER or BUYER
    - **region**: Optional - User's region
    - **district**: Optional - User's district
    - **town_city**: Optional - User's town/city
    - **farm_name**: Optional - Farm name (farmers only)
    - **farm_size_acres**: Optional - Farm size in acres (farmers only)

    Returns user ID and requires phone verification
    """
    try:
        # Create user
        user = await AuthService.signup_user(
            db=db,
            email=request.email,
            phone_number=request.phone_number,
            full_name=request.full_name,
            password=request.password,
            user_type=request.user_type,
            region=request.region,
            district=request.district,
            town_city=request.town_city,
            farm_name=request.farm_name,
            farm_size_acres=request.farm_size_acres
        )

        return SignupResponse(
            success=True,
            message="User created successfully. Please verify your phone number.",
            user_id=user.id,
            email=user.email,
            phone_number=user.phone_number,
            verification_required=True
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Signup error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to create user. Please try again."
            }
        )


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Verify OTP code

    - **user_id**: User ID received during signup
    - **otp_code**: 6-digit OTP code received via SMS
    - **otp_type**: Type of OTP (PHONE_VERIFICATION, EMAIL_VERIFICATION, etc.)

    Returns user details and authentication tokens if verification successful
    """
    try:
        # Verify OTP
        success, message, user = AuthService.verify_otp(
            db=db,
            user_id=request.user_id,
            otp_code=request.otp_code,
            otp_type=OTPType[request.otp_type]
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "OTP_INVALID",
                    "message": message
                }
            )

        # Create tokens after successful verification
        tokens = AuthService.create_tokens(user)

        return VerifyOTPResponse(
            success=True,
            message=message,
            verified=True,
            user=UserResponse.from_orm(user),
            tokens=TokenResponse(**tokens)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to verify OTP. Please try again."
            }
        )


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(request: ResendOTPRequest, db: Session = Depends(get_db)):
    """
    Resend OTP code

    - **user_id**: User ID
    - **otp_type**: Type of OTP to resend

    Sends a new OTP code to the user's phone or email
    """
    try:
        result = await AuthService.send_verification_otp(
            db=db,
            user_id=request.user_id,
            otp_type=OTPType[request.otp_type]
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "SMS_SEND_FAILED",
                    "message": result.get("message", "Failed to send OTP")
                }
            )

        return MessageResponse(
            success=True,
            message=result.get("message", "OTP sent successfully")
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "USER_NOT_FOUND",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Resend OTP error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to resend OTP. Please try again."
            }
        )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email/phone and password

    - **email**: User email address (optional if phone_number provided)
    - **phone_number**: User phone number (optional if email provided)
    - **password**: User password

    Returns user details and authentication tokens
    """
    try:
        # Login user
        success, message, user = AuthService.login_user(
            db=db,
            password=request.password,
            email=request.email,
            phone_number=request.phone_number
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_CREDENTIALS",
                    "message": message
                }
            )

        # Create tokens
        tokens = AuthService.create_tokens(user)

        return LoginResponse(
            success=True,
            message=message,
            user=UserResponse.from_orm(user),
            tokens=TokenResponse(**tokens)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to login. Please try again."
            }
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token using refresh token

    - **refresh_token**: Valid refresh token

    Returns new access and refresh tokens
    """
    try:
        success, message, tokens = AuthService.refresh_access_token(request.refresh_token)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_TOKEN",
                    "message": message
                }
            )

        return TokenResponse(**tokens)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to refresh token. Please try again."
            }
        )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout current user

    Requires authentication. Invalidates all tokens for the user.
    """
    try:
        # Get access token from dependency (will be in headers)
        from fastapi import Request
        # Note: In production, you'd extract token from request
        # For now, we'll just invalidate refresh token
        AuthService.logout_user(current_user.id, "")

        return MessageResponse(
            success=True,
            message="Logged out successfully"
        )

    except Exception as e:
        logger.error(f"Logout error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to logout. Please try again."
            }
        )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiate password reset

    - **email**: User email (optional)
    - **phone_number**: User phone number (optional)

    Sends OTP code to user's phone for password reset
    """
    try:
        success, message = await AuthService.initiate_password_reset(
            db=db,
            email=request.email,
            phone_number=request.phone_number
        )

        # Always return success to prevent enumeration
        return MessageResponse(
            success=True,
            message=message
        )

    except Exception as e:
        logger.error(f"Forgot password error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to process request. Please try again."
            }
        )


@router.post("/verify-reset-otp", response_model=VerifyResetOtpResponse)
async def verify_reset_otp(request: VerifyResetOtpRequest, db: Session = Depends(get_db)):
    """
    Verify reset OTP and get reset token

    - **email**: User email (optional)
    - **phone_number**: User phone number (optional)
    - **otp_code**: OTP code received via SMS

    Returns a short-lived reset token if verification is successful
    """
    try:
        success, message, reset_token = AuthService.verify_reset_otp(
            db=db,
            email=request.email,
            phone_number=request.phone_number,
            otp_code=request.otp_code
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "OTP_INVALID",
                    "message": message
                }
            )

        return VerifyResetOtpResponse(
            success=True,
            message=message,
            reset_token=reset_token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify reset OTP error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to verify OTP. Please try again."
            }
        )

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset password with token

    - **token**: Reset token received from verify-reset-otp
    - **new_password**: New password (min 8 chars, must contain uppercase, lowercase, digit)

    Resets password and invalidates all existing tokens
    """
    try:
        success, message = AuthService.reset_password(
            db=db,
            token=request.token,
            new_password=request.new_password
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_TOKEN",
                    "message": message
                }
            )

        return MessageResponse(
            success=True,
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Failed to reset password. Please try again."
            }
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's information

    Requires authentication.
    """
    return UserResponse.from_orm(current_user)



