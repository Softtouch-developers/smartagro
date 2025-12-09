"""
Authentication Service
Business logic for authentication and authorization
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Tuple
import logging

from models import User, OTPVerification, OTPType, AccountStatus
from utils.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_token
from utils.otp_generator import generate_otp, get_otp_expiry, is_otp_expired, is_otp_attempts_exceeded
from integrations.mnotify import mnotify_client
from database import get_redis
from config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service class"""

    @staticmethod
    async def signup_user(
        db: Session,
        email: Optional[str],
        phone_number: str,
        full_name: str,
        password: str,
        user_type: str,
        **kwargs
    ) -> Tuple[User, str]:
        """
        Register a new user

        Args:
            db: Database session
            email: User email (optional for farmers)
            phone_number: User phone number
            full_name: User full name
            password: User password
            user_type: User type (FARMER, BUYER)
            **kwargs: Additional user fields

        Returns:
            Tuple of (User object, error message if any)

        Raises:
            ValueError: If validation fails
        """
        # Check if email already exists (only if email provided)
        if email:
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                raise ValueError("Email already registered")

        # Check if phone number already exists
        existing_phone = db.query(User).filter(User.phone_number == phone_number).first()
        if existing_phone:
            raise ValueError("Phone number already registered")

        # Hash password
        password_hash = hash_password(password)

        # Create user with role switching defaults
        user = User(
            email=email,  # Can be None for farmers
            phone_number=phone_number,
            full_name=full_name,
            password_hash=password_hash,
            user_type=user_type,
            account_status=AccountStatus.PENDING_VERIFICATION,
            email_verified=False,
            phone_verified=False,
            is_verified=False,
            can_buy=True,  # All users can buy by default
            current_mode=user_type,  # Start in their primary mode
            **kwargs
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"User created: {user.id} ({user.email or user.phone_number})")

        # Generate and send OTP for phone verification
        await AuthService.send_verification_otp(db, user.id, OTPType.PHONE_VERIFICATION)

        return user

    @staticmethod
    async def send_verification_otp(
        db: Session,
        user_id: int,
        otp_type: OTPType
    ) -> dict:
        """
        Generate and send OTP for verification

        Args:
            db: Database session
            user_id: User ID
            otp_type: Type of OTP (PHONE_VERIFICATION, EMAIL_VERIFICATION, etc.)

        Returns:
            dict with success status and message
        """
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        # Invalidate previous OTPs of the same type
        db.query(OTPVerification).filter(
            OTPVerification.user_id == user_id,
            OTPVerification.otp_type == otp_type,
            OTPVerification.is_used == False
        ).update({"is_expired": True})
        db.commit()

        # Generate OTP
        otp_code = generate_otp()
        expires_at = get_otp_expiry()

        # Create OTP record
        otp_record = OTPVerification(
            user_id=user_id,
            otp_code=otp_code,
            otp_type=otp_type,
            email=user.email if otp_type == OTPType.EMAIL_VERIFICATION else None,
            phone_number=user.phone_number if otp_type == OTPType.PHONE_VERIFICATION else None,
            expires_at=expires_at,
            is_used=False,
            is_expired=False,
            attempts=0,
            max_attempts=settings.OTP_MAX_ATTEMPTS
        )

        db.add(otp_record)
        db.commit()

        logger.info(f"OTP generated for user {user_id}: {otp_type.value}")

        # Send OTP via SMS
        if otp_type in [OTPType.PHONE_VERIFICATION, OTPType.PASSWORD_RESET, OTPType.TRANSACTION_CONFIRM]:
            sms_result = await mnotify_client.send_otp(user.phone_number, otp_code)

            if not sms_result.get("success"):
                logger.error(f"Failed to send OTP SMS: {sms_result.get('error')}")
                return {
                    "success": False,
                    "message": "Failed to send OTP. Please try again."
                }

        # TODO: Send email OTP when implementing email service

        return {
            "success": True,
            "message": f"OTP sent to {'phone' if otp_type == OTPType.PHONE_VERIFICATION else 'email'}",
            "expires_in_minutes": settings.OTP_EXPIRY_MINUTES
        }

    @staticmethod
    def verify_otp(
        db: Session,
        user_id: int,
        otp_code: str,
        otp_type: OTPType
    ) -> Tuple[bool, str, Optional[User]]:
        """
        Verify OTP code

        Args:
            db: Database session
            user_id: User ID
            otp_code: OTP code to verify
            otp_type: Type of OTP

        Returns:
            Tuple of (success: bool, message: str, user: Optional[User])
        """
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "User not found", None

        # Get latest OTP of this type
        otp_record = db.query(OTPVerification).filter(
            OTPVerification.user_id == user_id,
            OTPVerification.otp_type == otp_type,
            OTPVerification.is_used == False,
            OTPVerification.is_expired == False
        ).order_by(OTPVerification.created_at.desc()).first()

        if not otp_record:
            return False, "No valid OTP found. Please request a new one.", None

        # Check if expired
        if is_otp_expired(otp_record.expires_at):
            otp_record.is_expired = True
            db.commit()
            return False, "OTP has expired. Please request a new one.", None

        # Check max attempts
        if is_otp_attempts_exceeded(otp_record.attempts, otp_record.max_attempts):
            otp_record.is_expired = True
            db.commit()
            return False, "Maximum verification attempts exceeded. Please request a new OTP.", None

        # Verify OTP code
        if otp_record.otp_code != otp_code:
            # Increment attempts
            otp_record.attempts += 1
            db.commit()

            remaining_attempts = otp_record.max_attempts - otp_record.attempts
            return False, f"Invalid OTP code. {remaining_attempts} attempts remaining.", None

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.verified_at = datetime.utcnow()
        db.commit()

        # Update user verification status
        if otp_type == OTPType.PHONE_VERIFICATION:
            user.phone_verified = True
            user.is_verified = True  # Consider phone verification as main verification
            user.account_status = AccountStatus.ACTIVE
        elif otp_type == OTPType.EMAIL_VERIFICATION:
            user.email_verified = True

        db.commit()
        db.refresh(user)

        logger.info(f"OTP verified for user {user_id}: {otp_type.value}")

        return True, "Verification successful", user

    @staticmethod
    def login_user(
        db: Session,
        password: str,
        email: Optional[str] = None,
        phone_number: Optional[str] = None
    ) -> Tuple[bool, str, Optional[User]]:
        """
        Login user with email/phone and password

        Args:
            db: Database session
            password: User password
            email: User email (optional)
            phone_number: User phone number (optional)

        Returns:
            Tuple of (success: bool, message: str, user: Optional[User])
        """
        # Get user by email or phone
        user = None
        if email:
            user = db.query(User).filter(User.email == email).first()
        elif phone_number:
            user = db.query(User).filter(User.phone_number == phone_number).first()

        if not user:
            return False, "Invalid credentials", None

        # Verify password
        if not verify_password(password, user.password_hash):
            return False, "Invalid credentials", None

        # Check if account is active
        if not user.is_active:
            return False, "Account has been suspended", None

        # Update last login
        user.last_login_at = datetime.utcnow()
        user.last_active_at = datetime.utcnow()
        db.commit()
        db.refresh(user)

        logger.info(f"User logged in: {user.id} ({user.email or user.phone_number})")

        return True, "Login successful", user

    @staticmethod
    def create_tokens(user: User) -> dict:
        """
        Create access and refresh tokens for user

        Args:
            user: User object

        Returns:
            dict with access_token, refresh_token, token_type, expires_in
        """
        # Create token payload
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "user_type": user.user_type.value,
            "is_verified": user.is_verified
        }

        # Create tokens
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": str(user.id)})

        # Store refresh token in Redis with expiry
        redis_client = get_redis()
        redis_client.setex(
            f"refresh_token:{user.id}",
            timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            refresh_token
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds
        }

    @staticmethod
    def refresh_access_token(refresh_token: str) -> Tuple[bool, str, Optional[dict]]:
        """
        Refresh access token using refresh token

        Args:
            refresh_token: Refresh token

        Returns:
            Tuple of (success: bool, message: str, tokens: Optional[dict])
        """
        # Verify refresh token
        payload = verify_token(refresh_token, expected_type="refresh")

        if not payload:
            return False, "Invalid or expired refresh token", None

        user_id = payload.get("sub")
        if not user_id:
            return False, "Invalid token payload", None

        # Check if refresh token exists in Redis
        redis_client = get_redis()
        stored_token = redis_client.get(f"refresh_token:{user_id}")

        if not stored_token or stored_token != refresh_token:
            return False, "Refresh token has been revoked", None

        # Get user from database (using a new session)
        from database import SessionLocal
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == int(user_id)).first()

            if not user or not user.is_active:
                return False, "User not found or inactive", None

            # Create new tokens
            tokens = AuthService.create_tokens(user)

            return True, "Token refreshed successfully", tokens

        finally:
            db.close()

    @staticmethod
    def logout_user(user_id: int, access_token: str) -> bool:
        """
        Logout user by invalidating tokens

        Args:
            user_id: User ID
            access_token: Current access token

        Returns:
            bool: True if successful
        """
        redis_client = get_redis()

        # Delete refresh token
        redis_client.delete(f"refresh_token:{user_id}")

        # Blacklist current access token (until it expires naturally)
        redis_client.setex(
            f"blacklist:access:{access_token}",
            timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            "1"
        )

        logger.info(f"User logged out: {user_id}")

        return True

    @staticmethod
    async def initiate_password_reset(db: Session, email: str) -> Tuple[bool, str]:
        """
        Initiate password reset process

        Args:
            db: Database session
            email: User email

        Returns:
            Tuple of (success: bool, message: str)
        """
        # Get user
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Don't reveal if email exists or not (security)
            return True, "If the email exists, a password reset code has been sent"

        # Generate and send OTP
        result = await AuthService.send_verification_otp(db, user.id, OTPType.PASSWORD_RESET)

        return result.get("success", False), "Password reset code sent to your phone"

    @staticmethod
    def reset_password(
        db: Session,
        user_id: int,
        otp_code: str,
        new_password: str
    ) -> Tuple[bool, str]:
        """
        Reset user password with OTP verification

        Args:
            db: Database session
            user_id: User ID
            otp_code: OTP code
            new_password: New password

        Returns:
            Tuple of (success: bool, message: str)
        """
        # Verify OTP
        success, message, user = AuthService.verify_otp(
            db, user_id, otp_code, OTPType.PASSWORD_RESET
        )

        if not success:
            return False, message

        # Hash new password
        password_hash = hash_password(new_password)

        # Update password
        user.password_hash = password_hash
        db.commit()

        # Invalidate all existing tokens (force re-login)
        redis_client = get_redis()
        redis_client.delete(f"refresh_token:{user_id}")

        logger.info(f"Password reset for user {user_id}")

        return True, "Password reset successfully. Please login with your new password."
