"""
Escrow & Payment Service
Business logic for escrow and payment operations
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Dict, Any
import logging
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from models import EscrowTransaction, EscrowStatus, Order, OrderStatus, PaymentStatus, User
from integrations.paystack import paystack_client
from integrations.mnotify import mnotify_client

logger = logging.getLogger(__name__)


class EscrowService:
    """Service for escrow and payment operations"""

    @staticmethod
    async def initialize_payment(db: Session, order_id: int, buyer_id: int) -> Dict[str, Any]:
        """Initialize payment for an order"""
        order = db.query(Order).filter(Order.id == order_id).first()

        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        if order.buyer_id != buyer_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your order")

        if order.payment_status != PaymentStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order already paid")

        buyer = db.query(User).filter(User.id == buyer_id).first()
        reference = f"ESC-{order.id}-{uuid.uuid4().hex[:8]}"

        result = await paystack_client.initialize_transaction(
            email=buyer.email,
            amount=float(order.total_amount),
            reference=reference,
            metadata={"order_id": order.id, "buyer_id": buyer_id}
        )

        if result["success"]:
            order.payment_status = PaymentStatus.PENDING
            order.paystack_reference = reference
            db.commit()

            return {
                "success": True,
                "message": "Payment initialized",
                "authorization_url": result["authorization_url"],
                "reference": reference,
                "access_code": result["access_code"],
                "amount": float(order.total_amount)
            }
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result.get("error"))

    @staticmethod
    async def process_payment_webhook(db: Session, reference: str, amount: float, customer_email: str, metadata: Dict):
        """Process payment webhook from Paystack"""
        order_id = metadata.get("order_id")
        order = db.query(Order).filter(Order.id == order_id).first()

        if not order:
            logger.error(f"Order {order_id} not found for payment {reference}")
            return

        # Create escrow
        platform_fee = float(order.platform_fee)
        seller_payout = float(order.subtotal)

        escrow = EscrowTransaction(
            order_id=order.id,
            amount=Decimal(str(amount)),
            platform_fee=Decimal(str(platform_fee)),
            seller_payout=Decimal(str(seller_payout)),
            status=EscrowStatus.HELD,
            paystack_reference=reference,
            auto_release_date=datetime.utcnow() + timedelta(days=7)
        )

        order.status = OrderStatus.PAID
        order.payment_status = PaymentStatus.PAID

        db.add(escrow)
        db.commit()

        # Send SMS notifications
        seller = db.query(User).filter(User.id == order.seller_id).first()
        buyer = db.query(User).filter(User.id == order.buyer_id).first()

        if seller:
            await mnotify_client.send_sms(
                seller.phone_number,
                f"New order #{order.order_number} paid! Amount: GH₵{seller_payout:.2f}. Please ship the order."
            )

        if buyer:
            await mnotify_client.send_sms(
                buyer.phone_number,
                f"Payment successful for order #{order.order_number}. Total: GH₵{amount:.2f}. Seller will ship soon."
            )

        logger.info(f"Escrow created for order {order_id}, reference {reference}")

    @staticmethod
    async def release_escrow(db: Session, escrow_id: int) -> Dict[str, Any]:
        """Release escrow to seller"""
        escrow = db.query(EscrowTransaction).filter(EscrowTransaction.id == escrow_id).first()

        if not escrow:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escrow not found")

        if escrow.status != EscrowStatus.HELD:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot release escrow with status: {escrow.status}")

        order = db.query(Order).filter(Order.id == escrow.order_id).first()
        seller = db.query(User).filter(User.id == order.seller_id).first()

        # Create recipient if needed
        if not seller.paystack_recipient_code:
            recipient_result = await paystack_client.create_transfer_recipient(
                account_name=seller.account_name,
                account_number=seller.account_number,
                bank_code=seller.bank_code
            )

            if recipient_result["success"]:
                seller.paystack_recipient_code = recipient_result["recipient_code"]
                db.commit()
            else:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create recipient")

        # Initiate transfer
        transfer_ref = f"TRF-{escrow.id}-{uuid.uuid4().hex[:8]}"
        transfer_result = await paystack_client.initiate_transfer(
            amount=float(escrow.seller_payout),
            recipient_code=seller.paystack_recipient_code,
            reason=f"Payment for order #{order.order_number}",
            reference=transfer_ref
        )

        if transfer_result["success"]:
            escrow.status = EscrowStatus.RELEASED
            escrow.released_at = datetime.utcnow()
            escrow.transfer_reference = transfer_ref
            order.status = OrderStatus.COMPLETED

            db.commit()

            await mnotify_client.send_sms(
                seller.phone_number,
                f"Payment released! GH₵{float(escrow.seller_payout):.2f} transferred to your account."
            )

            return {"success": True, "message": "Escrow released successfully"}
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=transfer_result.get("error"))

    @staticmethod
    async def refund_escrow(db: Session, escrow_id: int, reason: str) -> Dict[str, Any]:
        """Refund escrow to buyer"""
        escrow = db.query(EscrowTransaction).filter(EscrowTransaction.id == escrow_id).first()

        if not escrow:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escrow not found")

        if escrow.status not in [EscrowStatus.HELD, EscrowStatus.DISPUTED]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot refund escrow with status: {escrow.status}")

        refund_result = await paystack_client.refund_transaction(reference=escrow.paystack_reference)

        if refund_result["success"]:
            escrow.status = EscrowStatus.REFUNDED
            escrow.refunded_at = datetime.utcnow()
            escrow.refund_reason = reason

            order = db.query(Order).filter(Order.id == escrow.order_id).first()
            order.status = OrderStatus.REFUNDED

            db.commit()

            buyer = db.query(User).filter(User.id == order.buyer_id).first()
            await mnotify_client.send_sms(
                buyer.phone_number,
                f"Refund processed for order #{order.order_number}. Amount: GH₵{float(escrow.amount):.2f}"
            )

            return {"success": True, "message": "Refund processed successfully"}
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=refund_result.get("error"))

    @staticmethod
    async def process_transfer_webhook(db: Session, reference: str, status: str):
        """Process transfer webhook"""
        escrow = db.query(EscrowTransaction).filter(EscrowTransaction.transfer_reference == reference).first()

        if escrow:
            if status == "success":
                logger.info(f"Transfer successful for escrow {escrow.id}")
            else:
                logger.error(f"Transfer failed for escrow {escrow.id}")
                escrow.status = EscrowStatus.HELD
                db.commit()
