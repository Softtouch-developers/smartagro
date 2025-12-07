"""
Notifications Routes
API endpoints for notifications
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
import logging

from database import get_db
from models import User
from modules.auth.dependencies import get_current_verified_user
from modules.notifications.service import NotificationService
from modules.notifications.schemas import (
    NotificationResponse,
    UnreadCountResponse,
    MessageResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get user notifications

    **Requires authentication**

    Query parameters:
    - **limit**: Max notifications to return (default: 50, max: 100)
    - **offset**: Offset for pagination (default: 0)
    - **unread_only**: Only return unread notifications (default: false)
    """
    try:
        notifications = NotificationService.get_user_notifications(
            db=db,
            user_id=current_user.id,
            limit=limit,
            offset=offset,
            unread_only=unread_only
        )

        return [NotificationResponse.from_orm(n) for n in notifications]

    except Exception as e:
        logger.error(f"Get notifications error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notifications"
        )


@router.get("/unread", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get unread notification count

    **Requires authentication**

    Returns the count of unread notifications for the current user
    """
    try:
        count = NotificationService.get_unread_count(db, current_user.id)
        return UnreadCountResponse(unread_count=count)

    except Exception as e:
        logger.error(f"Get unread count error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve unread count"
        )


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Mark notification as read

    **Requires authentication**

    Only the notification owner can mark it as read
    """
    try:
        notification = NotificationService.mark_as_read(
            db=db,
            notification_id=notification_id,
            user_id=current_user.id
        )

        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )

        return NotificationResponse.from_orm(notification)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mark as read error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )


@router.put("/read-all", response_model=MessageResponse)
async def mark_all_as_read(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Mark all notifications as read

    **Requires authentication**

    Marks all unread notifications for the current user as read
    """
    try:
        count = NotificationService.mark_all_as_read(db, current_user.id)

        return MessageResponse(
            success=True,
            message=f"{count} notification(s) marked as read"
        )

    except Exception as e:
        logger.error(f"Mark all as read error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read"
        )


@router.delete("/{notification_id}", response_model=MessageResponse)
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Delete notification

    **Requires authentication**

    Only the notification owner can delete it
    """
    try:
        success = NotificationService.delete_notification(
            db=db,
            notification_id=notification_id,
            user_id=current_user.id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )

        return MessageResponse(
            success=True,
            message="Notification deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete notification error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )
