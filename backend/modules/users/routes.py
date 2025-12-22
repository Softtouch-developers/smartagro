"""
User Management Routes
Endpoints for user profile and account management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from database import get_db
from models import User, UserType
from modules.auth.dependencies import (
    get_current_verified_user,
    get_current_admin
)
from modules.auth.schemas import MessageResponse
from modules.users.service import UserService
from modules.users.schemas import (
    UpdateProfileRequest,
    DeleteAccountRequest,
    SwitchModeRequest,
    UserProfileResponse,
    DeleteAccountResponse
)

router = APIRouter()


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile

    Requires authentication
    """
    profile = UserService.get_user_profile(db, current_user.id)
    return profile


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get another user's profile (public info only)

    Requires authentication
    """
    profile = UserService.get_user_profile(db, user_id)
    return profile


@router.patch("/me", response_model=UserProfileResponse)
async def update_my_profile(
    update_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile

    Requires authentication
    """
    # Convert to dict and remove None values
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}

    updated_user = UserService.update_user_profile(db, current_user.id, update_dict)
    profile = UserService.get_user_profile(db, updated_user.id)

    return profile


@router.get("/me/transactions/status")
async def get_my_transaction_status(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Check current user's active transactions

    Useful before attempting account deletion
    Requires authentication
    """
    transaction_status = UserService.check_active_transactions(db, current_user.id)
    return transaction_status


@router.delete("/me", response_model=DeleteAccountResponse)
async def delete_my_account(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Delete current user's account (soft delete)

    Will fail if user has active orders or products.
    Check /users/me/transactions/status first to see active transactions.

    Requires authentication
    """
    result = UserService.delete_user_account(
        db=db,
        user_id=current_user.id,
        force=False,
        deleted_by_admin=False
    )

    return result


@router.delete("/{user_id}", response_model=DeleteAccountResponse)
async def admin_delete_user(
    user_id: int,
    delete_request: DeleteAccountRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin: Delete any user's account (soft delete)

    Can force delete even with active transactions if force=True

    Requires admin authentication
    """
    # Prevent admin from deleting themselves via this endpoint
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use DELETE /users/me to delete your own account"
        )

    result = UserService.delete_user_account(
        db=db,
        user_id=user_id,
        force=delete_request.force,
        deleted_by_admin=True,
        admin_reason=delete_request.reason
    )

    return result


@router.get("/{user_id}/transactions/status")
async def admin_get_user_transaction_status(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin: Check any user's active transactions

    Requires admin authentication
    """
    transaction_status = UserService.check_active_transactions(db, user_id)
    return transaction_status


# ==================== MODE SWITCHING ENDPOINTS ====================

@router.post("/me/switch-mode", response_model=UserProfileResponse)
async def switch_mode(
    request: SwitchModeRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Switch user's active mode between FARMER and BUYER

    - **target_mode**: Target mode ('FARMER' or 'BUYER')

    Rules:
    - Farmers can switch to BUYER mode if can_buy=True
    - Buyers cannot switch to FARMER mode (they're not farmers)
    - Must switch back to FARMER mode to list/manage products
    """
    import logging
    logger = logging.getLogger(__name__)

    target_mode = request.target_mode.upper()

    if target_mode not in ["FARMER", "BUYER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_MODE",
                "message": "Invalid mode. Use 'FARMER' or 'BUYER'"
            }
        )

    if target_mode == "FARMER":
        if current_user.user_type != UserType.FARMER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "NOT_A_FARMER",
                    "message": "Only farmers can switch to farmer mode"
                }
            )

    # Removed restriction: Farmers can switch to BUYER mode even if can_buy is False
    # Missing info will be collected at checkout

    current_user.current_mode = target_mode
    db.commit()
    db.refresh(current_user)

    logger.info(f"User {current_user.id} switched to {target_mode} mode")

    # Return updated user profile
    return UserService.get_user_profile(db, current_user.id)


@router.get("/me/mode")
async def get_current_mode(current_user: User = Depends(get_current_verified_user)):
    """
    Get user's current active mode

    Returns:
    - **current_mode**: Current active mode (FARMER or BUYER)
    - **user_type**: User's primary type
    - **can_buy**: Whether user can act as a buyer
    """
    return {
        "current_mode": current_user.current_mode or current_user.user_type.value,
        "user_type": current_user.user_type.value,
        "can_buy": current_user.can_buy
    }
