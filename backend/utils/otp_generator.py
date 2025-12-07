"""
OTP Generation and Validation Utilities
"""
import random
import string
from datetime import datetime, timedelta
from config import settings


def generate_otp(length: int = None) -> str:
    """
    Generate a numeric OTP code

    Args:
        length: Length of OTP (defaults to settings.OTP_LENGTH)

    Returns:
        String of random digits
    """
    if length is None:
        length = settings.OTP_LENGTH

    return ''.join(random.choices(string.digits, k=length))


def get_otp_expiry() -> datetime:
    """
    Get the expiration datetime for an OTP

    Returns:
        Datetime object representing when OTP expires
    """
    return datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)


def is_otp_expired(expires_at: datetime) -> bool:
    """
    Check if an OTP has expired

    Args:
        expires_at: Expiration datetime

    Returns:
        True if expired, False otherwise
    """
    return datetime.utcnow() > expires_at


def is_otp_attempts_exceeded(attempts: int, max_attempts: int = None) -> bool:
    """
    Check if OTP verification attempts have been exceeded

    Args:
        attempts: Current number of attempts
        max_attempts: Maximum allowed attempts (defaults to settings.OTP_MAX_ATTEMPTS)

    Returns:
        True if max attempts exceeded, False otherwise
    """
    if max_attempts is None:
        max_attempts = settings.OTP_MAX_ATTEMPTS

    return attempts >= max_attempts
