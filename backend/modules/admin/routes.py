"""
Admin Panel Routes
Includes dispute management, user management, and platform stats
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from database import get_db, get_mongo_db
from models import (
    User, Dispute, DisputeStatus, EscrowTransaction, EscrowStatus,
    Order, OrderStatus, Product, ProductStatus, UserType, AccountStatus
)
from modules.auth.dependencies import get_current_admin
from modules.escrow.service import EscrowService

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== SCHEMAS ====================

class RaiseDisputeRequest(BaseModel):
    """Raise dispute request"""
    order_id: int
    reason: str
    description: str
    evidence_urls: Optional[List[str]] = []


class DisputeResponseRequest(BaseModel):
    """Seller response to dispute"""
    response: str
    evidence_urls: Optional[List[str]] = []


class ResolveDisputeRequest(BaseModel):
    """Admin resolve dispute request"""
    resolution: str  # REFUND, RELEASE, PARTIAL_REFUND
    admin_notes: str
    partial_refund_amount: Optional[float] = None


class DisputeResponse(BaseModel):
    """Dispute response"""
    id: int
    order_id: int
    raised_by: int
    reason: str
    description: str
    status: str
    resolution: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== ROUTES ====================

@router.post("/disputes", response_model=DisputeResponse, status_code=status.HTTP_201_CREATED)
async def raise_dispute(
    request: RaiseDisputeRequest,
    current_user: User = Depends(get_current_admin),  # Buyers can raise, but using admin for demo
    db: Session = Depends(get_db)
):
    """Raise a dispute"""
    dispute = Dispute(
        order_id=request.order_id,
        raised_by=current_user.id,
        reason=request.reason,
        description=request.description,
        evidence_urls=request.evidence_urls or [],
        status=DisputeStatus.OPEN
    )

    # Update escrow status
    escrow = db.query(EscrowTransaction).filter(EscrowTransaction.order_id == request.order_id).first()
    if escrow:
        escrow.status = EscrowStatus.DISPUTED

    db.add(dispute)
    db.commit()
    db.refresh(dispute)

    logger.info(f"Dispute {dispute.id} raised for order {request.order_id}")
    return DisputeResponse.from_orm(dispute)


@router.get("/disputes", response_model=List[DisputeResponse])
async def list_disputes(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all disputes"""
    query = db.query(Dispute)

    if status:
        query = query.filter(Dispute.status == status)

    disputes = query.order_by(Dispute.created_at.desc()).all()
    return [DisputeResponse.from_orm(d) for d in disputes]


@router.get("/disputes/{dispute_id}", response_model=DisputeResponse)
async def get_dispute(
    dispute_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get dispute details"""
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()

    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    return DisputeResponse.from_orm(dispute)


@router.put("/disputes/{dispute_id}/respond")
async def respond_to_dispute(
    dispute_id: int,
    request: DisputeResponseRequest,
    current_user: User = Depends(get_current_admin),  # Sellers can respond
    db: Session = Depends(get_db)
):
    """Seller responds to dispute"""
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()

    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    dispute.seller_response = request.response
    dispute.seller_evidence_urls = request.evidence_urls or []
    dispute.status = DisputeStatus.UNDER_REVIEW
    dispute.responded_at = datetime.utcnow()

    db.commit()

    logger.info(f"Dispute {dispute_id} responded by seller")
    return {"success": True, "message": "Response submitted"}


@router.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: int,
    request: ResolveDisputeRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin resolves dispute"""
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()

    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    escrow = db.query(EscrowTransaction).filter(EscrowTransaction.order_id == dispute.order_id).first()

    if not escrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escrow not found")

    # Execute resolution
    if request.resolution == "REFUND":
        await EscrowService.refund_escrow(db, escrow.id, request.admin_notes)
    elif request.resolution == "RELEASE":
        await EscrowService.release_escrow(db, escrow.id)
    elif request.resolution == "PARTIAL_REFUND":
        # Implement partial refund logic
        pass

    dispute.status = DisputeStatus.RESOLVED
    dispute.resolution = request.resolution
    dispute.admin_notes = request.admin_notes
    dispute.resolved_by = current_user.id
    dispute.resolved_at = datetime.utcnow()

    db.commit()

    logger.info(f"Dispute {dispute_id} resolved: {request.resolution}")
    return {"success": True, "message": f"Dispute resolved: {request.resolution}"}


# ==================== ADMIN DASHBOARD ====================

@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get platform statistics for admin dashboard

    **Requires admin authentication**

    Returns comprehensive platform metrics including:
    - User statistics
    - Product statistics
    - Order statistics
    - Financial metrics
    - Escrow statistics
    - Dispute statistics
    - Engagement metrics
    """
    try:
        # Calculate date ranges
        today = datetime.utcnow().date()
        week_ago = datetime.utcnow() - timedelta(days=7)
        month_ago = datetime.utcnow() - timedelta(days=30)

        # ==================== USER METRICS ====================
        total_users = db.query(func.count(User.id)).scalar()
        farmers_count = db.query(func.count(User.id)).filter(User.user_type == UserType.FARMER).scalar()
        buyers_count = db.query(func.count(User.id)).filter(User.user_type == UserType.BUYER).scalar()
        verified_users = db.query(func.count(User.id)).filter(User.is_verified == True).scalar()
        active_users = db.query(func.count(User.id)).filter(
            and_(
                User.is_active == True,
                User.account_status == AccountStatus.ACTIVE
            )
        ).scalar()

        new_users_week = db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar()
        new_users_month = db.query(func.count(User.id)).filter(User.created_at >= month_ago).scalar()

        # ==================== PRODUCT METRICS ====================
        total_products = db.query(func.count(Product.id)).scalar()
        active_products = db.query(func.count(Product.id)).filter(
            Product.status == ProductStatus.AVAILABLE
        ).scalar()
        featured_products = db.query(func.count(Product.id)).filter(Product.is_featured == True).scalar()

        # Products by category
        products_by_category = db.query(
            Product.category,
            func.count(Product.id).label('count')
        ).group_by(Product.category).all()
        category_breakdown = {cat: count for cat, count in products_by_category}

        # ==================== ORDER METRICS ====================
        total_orders = db.query(func.count(Order.id)).scalar()
        orders_today = db.query(func.count(Order.id)).filter(
            func.date(Order.created_at) == today
        ).scalar()
        orders_week = db.query(func.count(Order.id)).filter(Order.created_at >= week_ago).scalar()
        orders_month = db.query(func.count(Order.id)).filter(Order.created_at >= month_ago).scalar()

        # Orders by status
        orders_by_status = db.query(
            Order.status,
            func.count(Order.id).label('count')
        ).group_by(Order.status).all()
        status_breakdown = {status.value: count for status, count in orders_by_status}

        # Average order value
        avg_order_value = db.query(func.avg(Order.total_amount)).scalar() or 0

        # ==================== FINANCIAL METRICS ====================
        # Total transaction volume
        total_volume = db.query(func.sum(EscrowTransaction.amount)).scalar() or Decimal('0')

        # Transaction volume this month
        volume_month = db.query(func.sum(EscrowTransaction.amount)).filter(
            EscrowTransaction.created_at >= month_ago
        ).scalar() or Decimal('0')

        # Total platform fees collected
        total_fees = db.query(func.sum(EscrowTransaction.platform_fee)).scalar() or Decimal('0')

        # Escrow balance (money currently held)
        escrow_balance = db.query(func.sum(EscrowTransaction.amount)).filter(
            EscrowTransaction.status == EscrowStatus.HELD
        ).scalar() or Decimal('0')

        # Pending payouts to sellers
        pending_payouts = db.query(func.sum(EscrowTransaction.seller_payout)).filter(
            EscrowTransaction.status == EscrowStatus.HELD
        ).scalar() or Decimal('0')

        # ==================== ESCROW METRICS ====================
        total_escrow = db.query(func.count(EscrowTransaction.id)).scalar()

        escrow_by_status = db.query(
            EscrowTransaction.status,
            func.count(EscrowTransaction.id).label('count')
        ).group_by(EscrowTransaction.status).all()
        escrow_status_breakdown = {status.value: count for status, count in escrow_by_status}

        # Auto-release due soon (next 24 hours)
        tomorrow = datetime.utcnow() + timedelta(days=1)
        auto_release_soon = db.query(func.count(EscrowTransaction.id)).filter(
            and_(
                EscrowTransaction.status == EscrowStatus.HELD,
                EscrowTransaction.auto_release_date <= tomorrow,
                EscrowTransaction.auto_release_date >= datetime.utcnow()
            )
        ).scalar()

        # ==================== DISPUTE METRICS ====================
        total_disputes = db.query(func.count(Dispute.id)).scalar()
        open_disputes = db.query(func.count(Dispute.id)).filter(
            Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW])
        ).scalar()
        resolved_disputes = db.query(func.count(Dispute.id)).filter(
            Dispute.status == DisputeStatus.RESOLVED
        ).scalar()

        # Average resolution time (for resolved disputes)
        avg_resolution_time = db.query(
            func.avg(
                func.extract('epoch', Dispute.resolved_at - Dispute.created_at) / 86400
            )
        ).filter(Dispute.resolved_at.isnot(None)).scalar()

        # ==================== ENGAGEMENT METRICS ====================
        mongo_db = get_mongo_db()

        # Chat metrics
        total_conversations = mongo_db['conversations'].count_documents({})
        total_messages = mongo_db['chat_messages'].count_documents({})

        # Agent metrics
        total_agent_conversations = mongo_db['agent_conversations'].count_documents({})

        # Calculate average messages per conversation
        avg_messages_per_conv = total_messages / total_conversations if total_conversations > 0 else 0

        # ==================== COMPILE RESPONSE ====================
        return {
            "user_metrics": {
                "total_users": total_users,
                "farmers": farmers_count,
                "buyers": buyers_count,
                "admins": total_users - farmers_count - buyers_count,
                "verified_users": verified_users,
                "active_users": active_users,
                "new_users_this_week": new_users_week,
                "new_users_this_month": new_users_month
            },
            "product_metrics": {
                "total_products": total_products,
                "active_products": active_products,
                "featured_products": featured_products,
                "by_category": category_breakdown
            },
            "order_metrics": {
                "total_orders": total_orders,
                "orders_today": orders_today,
                "orders_this_week": orders_week,
                "orders_this_month": orders_month,
                "average_order_value": float(avg_order_value),
                "by_status": status_breakdown
            },
            "financial_metrics": {
                "total_transaction_volume": float(total_volume),
                "volume_this_month": float(volume_month),
                "total_platform_fees": float(total_fees),
                "escrow_balance": float(escrow_balance),
                "pending_payouts": float(pending_payouts)
            },
            "escrow_metrics": {
                "total_escrow_transactions": total_escrow,
                "by_status": escrow_status_breakdown,
                "auto_release_due_soon": auto_release_soon
            },
            "dispute_metrics": {
                "total_disputes": total_disputes,
                "open_disputes": open_disputes,
                "resolved_disputes": resolved_disputes,
                "average_resolution_days": round(avg_resolution_time or 0, 1)
            },
            "engagement_metrics": {
                "total_conversations": total_conversations,
                "total_chat_messages": total_messages,
                "agent_conversations": total_agent_conversations,
                "avg_messages_per_conversation": round(avg_messages_per_conv, 1)
            }
        }

    except Exception as e:
        logger.error(f"Dashboard stats error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics"
        )


# ==================== USER MANAGEMENT ====================

class SuspendUserRequest(BaseModel):
    """Request to suspend a user"""
    reason: str


class UserListResponse(BaseModel):
    """User list item response"""
    id: int
    full_name: str
    email: Optional[str] = None
    phone_number: str
    user_type: str
    is_verified: bool
    is_active: bool
    account_status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/users", response_model=List[UserListResponse])
async def list_users(
    user_type: Optional[str] = Query(None, description="Filter by user type (FARMER, BUYER, ADMIN)"),
    account_status: Optional[str] = Query(None, description="Filter by account status"),
    is_verified: Optional[bool] = Query(None, description="Filter by verification status"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    List all users with filtering

    **Requires admin authentication**

    Query parameters:
    - **user_type**: Filter by FARMER, BUYER, or ADMIN
    - **account_status**: Filter by account status
    - **is_verified**: Filter by verification status
    - **limit**: Max results (default: 50)
    - **skip**: Pagination offset
    """
    try:
        query = db.query(User)

        if user_type:
            query = query.filter(User.user_type == user_type)

        if account_status:
            query = query.filter(User.account_status == account_status)

        if is_verified is not None:
            query = query.filter(User.is_verified == is_verified)

        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

        return [UserListResponse.from_orm(u) for u in users]

    except Exception as e:
        logger.error(f"List users error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list users"
        )


@router.put("/users/{user_id}/suspend")
async def suspend_user(
    user_id: int,
    request: SuspendUserRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Suspend a user account

    **Requires admin authentication**

    Path parameters:
    - **user_id**: ID of user to suspend

    Body:
    - **reason**: Reason for suspension
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if user.user_type == UserType.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot suspend admin users"
            )

        user.account_status = AccountStatus.SUSPENDED
        user.is_active = False

        # Log admin action
        from models import AdminAction
        admin_action = AdminAction(
            admin_id=current_user.id,
            action_type="USER_SUSPENDED",
            target_user_id=user_id,
            details={"reason": request.reason}
        )
        db.add(admin_action)

        db.commit()

        logger.info(f"User {user_id} suspended by admin {current_user.id}")
        return {"success": True, "message": "User suspended successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Suspend user error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to suspend user"
        )


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Activate a suspended user account

    **Requires admin authentication**

    Path parameters:
    - **user_id**: ID of user to activate
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user.account_status = AccountStatus.ACTIVE
        user.is_active = True

        # Log admin action
        from models import AdminAction
        admin_action = AdminAction(
            admin_id=current_user.id,
            action_type="USER_ACTIVATED",
            target_user_id=user_id
        )
        db.add(admin_action)

        db.commit()

        logger.info(f"User {user_id} activated by admin {current_user.id}")
        return {"success": True, "message": "User activated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Activate user error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate user"
        )


@router.put("/users/{user_id}/verify")
async def verify_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Manually verify a user account

    **Requires admin authentication**

    Path parameters:
    - **user_id**: ID of user to verify
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user.is_verified = True
        user.email_verified = True
        user.phone_verified = True

        # Log admin action
        from models import AdminAction
        admin_action = AdminAction(
            admin_id=current_user.id,
            action_type="USER_VERIFIED",
            target_user_id=user_id
        )
        db.add(admin_action)

        db.commit()

        logger.info(f"User {user_id} verified by admin {current_user.id}")
        return {"success": True, "message": "User verified successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify user error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify user"
        )


# ==================== AUDIT LOGS ====================

class AuditLogResponse(BaseModel):
    """Audit log response"""
    id: int
    admin_id: int
    action_type: str
    target_user_id: Optional[int]
    target_order_id: Optional[int]
    details: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    admin_id: Optional[int] = Query(None, description="Filter by admin ID"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get admin action audit logs

    **Requires admin authentication**

    Query parameters:
    - **action_type**: Filter by action type
    - **admin_id**: Filter by admin who performed action
    - **limit**: Max results (default: 50)
    - **skip**: Pagination offset
    """
    try:
        from models import AdminAction

        query = db.query(AdminAction)

        if action_type:
            query = query.filter(AdminAction.action_type == action_type)

        if admin_id:
            query = query.filter(AdminAction.admin_id == admin_id)

        logs = query.order_by(AdminAction.created_at.desc()).offset(skip).limit(limit).all()

        return [AuditLogResponse.from_orm(log) for log in logs]

    except Exception as e:
        logger.error(f"Get audit logs error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve audit logs"
        )


# ==================== SYSTEM CONFIGURATION ====================

class SystemConfigResponse(BaseModel):
    """System configuration response"""
    id: int
    key: str
    value: str
    description: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


class UpdateConfigRequest(BaseModel):
    """Update system configuration request"""
    value: str


@router.get("/config", response_model=List[SystemConfigResponse])
async def list_system_config(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    List all system configuration values

    **Requires admin authentication**

    Returns all configurable system settings including:
    - AGENT_SYSTEM_PROMPT: AI agent's system prompt
    - WELCOME_MESSAGE: Homepage welcome message
    - PLATFORM_FEE_PERCENTAGE: Commission percentage
    """
    try:
        from models import SystemConfiguration

        configs = db.query(SystemConfiguration).all()
        return [SystemConfigResponse.from_orm(c) for c in configs]

    except Exception as e:
        logger.error(f"List config error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve configuration"
        )


@router.get("/config/{key}", response_model=SystemConfigResponse)
async def get_system_config(
    key: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get a specific system configuration value

    **Requires admin authentication**

    Path parameters:
    - **key**: Configuration key (e.g., AGENT_SYSTEM_PROMPT)
    """
    try:
        from models import SystemConfiguration

        config = db.query(SystemConfiguration).filter(
            SystemConfiguration.key == key
        ).first()

        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration '{key}' not found"
            )

        return SystemConfigResponse.from_orm(config)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get config error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve configuration"
        )


@router.put("/config/{key}")
async def update_system_config(
    key: str,
    request: UpdateConfigRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update a system configuration value

    **Requires admin authentication**

    Path parameters:
    - **key**: Configuration key to update

    Body:
    - **value**: New configuration value

    Use this to update:
    - AGENT_SYSTEM_PROMPT: Customize AI agent behavior
    - WELCOME_MESSAGE: Change homepage message
    - PLATFORM_FEE_PERCENTAGE: Adjust commission
    """
    try:
        from models import SystemConfiguration

        config = db.query(SystemConfiguration).filter(
            SystemConfiguration.key == key
        ).first()

        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration '{key}' not found"
            )

        old_value = config.value[:100] + "..." if len(config.value) > 100 else config.value
        config.value = request.value
        config.updated_at = datetime.utcnow()
        config.updated_by_admin_id = current_user.id

        # Log admin action
        from models import AdminAction, AdminActionType
        admin_action = AdminAction(
            admin_id=current_user.id,
            action_type=AdminActionType.SYSTEM_CONFIG_UPDATED,
            target_type="SYSTEM_CONFIG",
            target_id=config.id,
            details={
                "key": key,
                "old_value_preview": old_value,
                "new_value_preview": request.value[:100] + "..." if len(request.value) > 100 else request.value
            }
        )
        db.add(admin_action)

        db.commit()

        logger.info(f"Config '{key}' updated by admin {current_user.id}")
        return {
            "success": True,
            "message": f"Configuration '{key}' updated successfully",
            "key": key
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update config error: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update configuration"
        )
