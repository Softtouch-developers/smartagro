"""
Notification Service
Business logic for notifications
"""
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime

from models import Notification, NotificationType, User
from integrations.mnotify import mnotify_client

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for notification operations"""

    @staticmethod
    async def create_notification(
        db: Session,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        send_sms: bool = False,
        related_order_id: Optional[int] = None,
        related_product_id: Optional[int] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """
        Create a notification

        Args:
            db: Database session
            user_id: User ID to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            send_sms: Whether to send SMS
            related_order_id: Optional order ID
            related_product_id: Optional product ID
            data: Optional additional data

        Returns:
            Created notification
        """
        # Create notification
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            related_order_id=related_order_id,
            related_product_id=related_product_id,
            data=data or {}
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Send SMS if requested
        if send_sms:
            user = db.query(User).filter(User.id == user_id).first()

            if user and user.sms_notification_enabled:
                try:
                    result = await mnotify_client.send_sms(
                        to=user.phone_number,
                        message=message
                    )

                    if result.get("success"):
                        notification.sms_sent = True
                        db.commit()

                except Exception as e:
                    logger.error(f"Failed to send SMS notification: {e}")

        logger.info(f"Notification created for user {user_id}: {title}")
        return notification

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False
    ) -> List[Notification]:
        """Get user notifications"""
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        notifications = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
        return notifications

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Get unread notification count"""
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

        return count

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> Notification:
        """Mark notification as read"""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()

        if not notification:
            return None

        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)

        return notification

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        """Mark all notifications as read"""
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow()
        })

        db.commit()
        return count

    @staticmethod
    def delete_notification(db: Session, notification_id: int, user_id: int) -> bool:
        """Delete notification"""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()

        if not notification:
            return False

        db.delete(notification)
        db.commit()
        return True


# Helper functions for common notifications

async def notify_order_created(db: Session, order_id: int, buyer_id: int, seller_id: int):
    """Notify buyer and seller about new order"""
    # Notify seller (with SMS)
    await NotificationService.create_notification(
        db=db,
        user_id=seller_id,
        notification_type=NotificationType.ORDER_CREATED,
        title="New Order Received",
        message=f"You have a new order #{order_id}. Please prepare for shipping.",
        send_sms=True,
        related_order_id=order_id
    )

    # Notify buyer (no SMS)
    await NotificationService.create_notification(
        db=db,
        user_id=buyer_id,
        notification_type=NotificationType.ORDER_CREATED,
        title="Order Created",
        message=f"Your order #{order_id} has been created. Please proceed to payment.",
        send_sms=False,
        related_order_id=order_id
    )


async def notify_payment_received(db: Session, order_id: int, seller_id: int, amount: float):
    """Notify seller about payment"""
    await NotificationService.create_notification(
        db=db,
        user_id=seller_id,
        notification_type=NotificationType.PAYMENT_RECEIVED,
        title="Payment Received",
        message=f"Payment of GH₵{amount:.2f} received for order #{order_id}. Please ship the order.",
        send_sms=True,
        related_order_id=order_id
    )


async def notify_order_shipped(db: Session, order_id: int, buyer_id: int):
    """Notify buyer about shipment"""
    await NotificationService.create_notification(
        db=db,
        user_id=buyer_id,
        notification_type=NotificationType.ORDER_SHIPPED,
        title="Order Shipped",
        message=f"Your order #{order_id} has been shipped. Track your delivery.",
        send_sms=True,
        related_order_id=order_id
    )


async def notify_payment_released(db: Session, seller_id: int, amount: float):
    """Notify seller about payment release"""
    await NotificationService.create_notification(
        db=db,
        user_id=seller_id,
        notification_type=NotificationType.PAYMENT_RELEASED,
        title="Payment Released",
        message=f"Payment of GH₵{amount:.2f} has been transferred to your account.",
        send_sms=True
    )


async def notify_dispute_created(db: Session, order_id: int, buyer_id: int, seller_id: int):
    """Notify both parties about dispute"""
    # Notify seller
    await NotificationService.create_notification(
        db=db,
        user_id=seller_id,
        notification_type=NotificationType.DISPUTE_CREATED,
        title="Dispute Raised",
        message=f"A dispute has been raised for order #{order_id}. Please respond with your evidence.",
        send_sms=True,
        related_order_id=order_id
    )

    # Notify buyer
    await NotificationService.create_notification(
        db=db,
        user_id=buyer_id,
        notification_type=NotificationType.DISPUTE_CREATED,
        title="Dispute Created",
        message=f"Your dispute for order #{order_id} has been created. Admin will review soon.",
        send_sms=False,
        related_order_id=order_id
    )
