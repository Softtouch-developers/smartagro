"""
Authentication Dependencies
FastAPI dependencies for authentication and authorization
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import logging

from database import get_db, get_redis
from models import User, UserType
from utils.security import verify_token

logger = logging.getLogger(__name__)

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token

    Args:
        credentials: HTTP Bearer credentials
        db: Database session

    Returns:
        User object

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials

    # Verify token
    payload = verify_token(token, expected_type="access")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "Invalid or expired token"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "Invalid token payload"
            }
        )

    # Check if token is blacklisted (logged out)
    redis_client = get_redis()
    blacklisted = redis_client.get(f"blacklist:access:{token}")
    if blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "TOKEN_EXPIRED",
                "message": "Token has been invalidated"
            }
        )

    # Get user from database
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "User not found"
            }
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_SUSPENDED",
                "message": "Account has been suspended"
            }
        )

    return user


async def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current authenticated and verified user

    Args:
        current_user: Current user from get_current_user

    Returns:
        User object

    Raises:
        HTTPException: If user is not verified
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "VERIFICATION_REQUIRED",
                "message": "Phone verification required. Please verify your phone number."
            }
        )

    return current_user


async def get_current_farmer(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """
    Get current authenticated farmer

    Args:
        current_user: Current verified user

    Returns:
        User object

    Raises:
        HTTPException: If user is not a farmer
    """
    if current_user.user_type != UserType.FARMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "This endpoint is only accessible to farmers"
            }
        )

    return current_user


async def get_current_buyer(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """
    Get current authenticated buyer

    Args:
        current_user: Current verified user

    Returns:
        User object

    Raises:
        HTTPException: If user is not a buyer
    """
    if current_user.user_type != UserType.BUYER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "This endpoint is only accessible to buyers"
            }
        )

    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """
    Get current authenticated admin

    Args:
        current_user: Current verified user

    Returns:
        User object

    Raises:
        HTTPException: If user is not an admin
    """
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "This endpoint is only accessible to administrators"
            }
        )

    return current_user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None
    Useful for endpoints that work for both authenticated and anonymous users

    Args:
        credentials: Optional HTTP Bearer credentials
        db: Database session

    Returns:
        User object or None
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        payload = verify_token(token, expected_type="access")

        if not payload:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        # Check blacklist
        redis_client = get_redis()
        blacklisted = redis_client.get(f"blacklist:access:{token}")
        if blacklisted:
            return None

        user = db.query(User).filter(User.id == int(user_id)).first()
        return user if user and user.is_active else None

    except Exception as e:
        logger.warning(f"Error in get_optional_current_user: {e}")
        return None
