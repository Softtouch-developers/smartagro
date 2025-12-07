"""
User Management Service
Business logic for user operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import logging

from models import User, UserType, AccountStatus, Order, OrderStatus, Product, ProductStatus
from database import get_redis
from datetime import datetime

logger = logging.getLogger(__name__)


class UserService:
    """Service for user management operations"""

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_profile(db: Session, user_id: int) -> Dict[str, Any]:
        """Get user profile with safe data (no sensitive fields)"""
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Return safe user data (exclude password_hash, etc.)
        profile = {
            "id": user.id,
            "email": user.email,
            "phone_number": user.phone_number,
            "full_name": user.full_name,
            "user_type": user.user_type.value,
            "profile_image_url": user.profile_image_url,
            "email_verified": user.email_verified,
            "phone_verified": user.phone_verified,
            "is_verified": user.is_verified,
            "region": user.region,
            "district": user.district,
            "town_city": user.town_city,
            "account_status": user.account_status.value,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
        }

        # Add farmer-specific fields
        if user.user_type == UserType.FARMER:
            profile.update({
                "farm_name": user.farm_name,
                "farm_size_acres": float(user.farm_size_acres) if user.farm_size_acres else None,
                "years_farming": user.years_farming,
            })

        # Add buyer-specific fields
        if user.user_type == UserType.BUYER:
            profile.update({
                "wallet_balance": float(user.wallet_balance) if user.wallet_balance else 0.00,
            })

        return profile

    @staticmethod
    def check_active_transactions(db: Session, user_id: int) -> Dict[str, Any]:
        """Check if user has active orders or transactions"""
        # Check for active orders (as buyer or seller)
        active_orders = db.query(Order).filter(
            and_(
                or_(Order.buyer_id == user_id, Order.seller_id == user_id),
                Order.status.in_([
                    OrderStatus.PENDING,
                    OrderStatus.CONFIRMED,
                    OrderStatus.PAID,
                    OrderStatus.IN_ESCROW,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED
                ])
            )
        ).all()

        # Check for active products (if farmer)
        user = db.query(User).filter(User.id == user_id).first()
        active_products = []
        if user and user.user_type == UserType.FARMER:
            active_products = db.query(Product).filter(
                and_(
                    Product.seller_id == user_id,
                    Product.status == ProductStatus.AVAILABLE
                )
            ).all()

        return {
            "has_active_orders": len(active_orders) > 0,
            "active_orders_count": len(active_orders),
            "active_orders": [
                {
                    "order_id": order.id,
                    "status": order.status.value,
                    "total_amount": float(order.total_amount)
                } for order in active_orders
            ],
            "has_active_products": len(active_products) > 0,
            "active_products_count": len(active_products),
        }

    @staticmethod
    def delete_user_account(
        db: Session,
        user_id: int,
        force: bool = False,
        deleted_by_admin: bool = False,
        admin_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Soft delete user account

        Args:
            db: Database session
            user_id: ID of user to delete
            force: If True, delete even with active transactions (admin only)
            deleted_by_admin: If True, deletion is being done by admin
            admin_reason: Reason for admin deletion

        Returns:
            Dict with deletion status and details
        """
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Check if already deleted
        if user.account_status == AccountStatus.DELETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is already deleted"
            )

        # Check for active transactions
        transaction_check = UserService.check_active_transactions(db, user_id)

        if not force and (transaction_check["has_active_orders"] or transaction_check["has_active_products"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete account with active orders or products. Please complete or cancel all active transactions first.",
                headers={
                    "X-Active-Orders": str(transaction_check["active_orders_count"]),
                    "X-Active-Products": str(transaction_check["active_products_count"])
                }
            )

        # Soft delete: Update account status
        user.account_status = AccountStatus.DELETED
        user.is_active = False
        user.updated_at = datetime.utcnow()

        # Deactivate all user's products if farmer
        if user.user_type == UserType.FARMER:
            products = db.query(Product).filter(Product.seller_id == user_id).all()
            for product in products:
                product.status = ProductStatus.OUT_OF_STOCK
                product.is_active = False

        # Clear Redis tokens
        try:
            redis_client = get_redis()
            redis_client.delete(f"refresh_token:{user_id}")
            logger.info(f"Cleared Redis tokens for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to clear Redis tokens for user {user_id}: {e}")

        db.commit()

        logger.info(
            f"User {user_id} deleted. "
            f"By admin: {deleted_by_admin}, "
            f"Force: {force}, "
            f"Reason: {admin_reason or 'User self-deletion'}"
        )

        return {
            "success": True,
            "message": "Account deleted successfully",
            "user_id": user_id,
            "email": user.email,
            "deleted_at": user.updated_at.isoformat(),
            "deleted_by_admin": deleted_by_admin,
            "admin_reason": admin_reason,
            "deactivated_products": user.user_type == UserType.FARMER,
        }

    @staticmethod
    def update_user_profile(
        db: Session,
        user_id: int,
        update_data: Dict[str, Any]
    ) -> User:
        """Update user profile (safe fields only)"""
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # List of fields that can be updated
        allowed_fields = {
            'full_name', 'profile_image_url', 'region', 'district',
            'town_city', 'gps_address', 'detailed_address', 'latitude',
            'longitude', 'language_preference', 'notification_enabled',
            'sms_notification_enabled', 'farm_name', 'farm_size_acres',
            'years_farming', 'bank_name', 'bank_code', 'account_number',
            'account_name'
        }

        # Update only allowed fields
        for field, value in update_data.items():
            if field in allowed_fields and hasattr(user, field):
                setattr(user, field, value)

        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)

        return user
