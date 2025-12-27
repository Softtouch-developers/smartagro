"""
Escrow & Payment Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from database import get_db
from models import User, EscrowTransaction
from modules.auth.dependencies import get_current_buyer, get_current_admin
from modules.escrow.service import EscrowService
from modules.escrow.schemas import (
    InitializePaymentRequest,
    InitializePaymentResponse,
    EscrowResponse,
    MessageResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/initialize", response_model=InitializePaymentResponse)
async def initialize_payment(
    request: InitializePaymentRequest,
    current_user: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
):
    """Initialize payment for an order"""
    try:
        result = await EscrowService.initialize_payment(db, request.order_id, current_user.id, request.callback_url)
        return InitializePaymentResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Initialize payment error: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to initialize payment")



@router.get("/verify", response_model=dict)
async def verify_payment(
    reference: str,
    db: Session = Depends(get_db)
):
    """Verify payment status"""
    try:
        result = await EscrowService.verify_payment(db, reference)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify payment error: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to verify payment")


@router.get("/{escrow_id}", response_model=EscrowResponse)
async def get_escrow(
    escrow_id: int,
    db: Session = Depends(get_db)
):
    """Get escrow details"""
    escrow = db.query(EscrowTransaction).filter(EscrowTransaction.id == escrow_id).first()

    if not escrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escrow not found")

    return EscrowResponse.from_orm(escrow)


@router.post("/{escrow_id}/release", response_model=MessageResponse)
async def release_escrow(
    escrow_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Release escrow to seller (admin only or auto-release)"""
    try:
        result = await EscrowService.release_escrow(db, escrow_id)
        return MessageResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Release escrow error: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to release escrow")


@router.post("/{escrow_id}/refund", response_model=MessageResponse)
async def refund_escrow(
    escrow_id: int,
    reason: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Refund escrow to buyer (admin only)"""
    try:
        result = await EscrowService.refund_escrow(db, escrow_id, reason)
        return MessageResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refund escrow error: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to refund escrow")
