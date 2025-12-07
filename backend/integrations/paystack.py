"""
Paystack Payment Integration
Client for Paystack payment processing, transfers, and refunds
"""
import httpx
import hmac
import hashlib
import logging
from typing import Optional, Dict, Any
from config import settings, get_paystack_callback_url

logger = logging.getLogger(__name__)


class PaystackClient:
    """Client for Paystack payment API"""

    BASE_URL = "https://api.paystack.co"

    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        self.public_key = settings.PAYSTACK_PUBLIC_KEY

    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers for Paystack API"""
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }

    async def initialize_transaction(
        self,
        email: str,
        amount: float,
        reference: str,
        callback_url: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Initialize a payment transaction

        Args:
            email: Customer email
            amount: Amount in kobo (multiply GHS by 100)
            reference: Unique transaction reference
            callback_url: URL to redirect after payment
            metadata: Additional metadata

        Returns:
            Dict with authorization_url, access_code, reference
        """
        try:
            # Convert amount to kobo (Paystack uses smallest currency unit)
            amount_kobo = int(amount * 100)

            payload = {
                "email": email,
                "amount": amount_kobo,
                "reference": reference,
                "currency": "GHS",
                "callback_url": callback_url or get_paystack_callback_url(),
                "metadata": metadata or {}
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/transaction/initialize",
                    json=payload,
                    headers=self._get_headers()
                )

                response.raise_for_status()
                result = response.json()

                if result.get("status"):
                    logger.info(f"Payment initialized: {reference}")
                    return {
                        "success": True,
                        "authorization_url": result["data"]["authorization_url"],
                        "access_code": result["data"]["access_code"],
                        "reference": result["data"]["reference"]
                    }
                else:
                    logger.error(f"Payment initialization failed: {result.get('message')}")
                    return {
                        "success": False,
                        "error": result.get("message", "Failed to initialize payment")
                    }

        except httpx.HTTPError as e:
            logger.error(f"HTTP error initializing payment: {e}")
            return {
                "success": False,
                "error": f"HTTP error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error initializing payment: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }

    async def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """
        Verify a transaction

        Args:
            reference: Transaction reference

        Returns:
            Dict with transaction details
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/transaction/verify/{reference}",
                    headers=self._get_headers()
                )

                response.raise_for_status()
                result = response.json()

                if result.get("status"):
                    data = result["data"]
                    return {
                        "success": True,
                        "status": data["status"],
                        "amount": data["amount"] / 100,  # Convert from kobo to GHS
                        "reference": data["reference"],
                        "paid_at": data.get("paid_at"),
                        "channel": data.get("channel"),
                        "customer": data.get("customer"),
                        "metadata": data.get("metadata", {})
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("message", "Verification failed")
                    }

        except httpx.HTTPError as e:
            logger.error(f"HTTP error verifying transaction: {e}")
            return {
                "success": False,
                "error": f"HTTP error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error verifying transaction: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }

    async def create_transfer_recipient(
        self,
        account_name: str,
        account_number: str,
        bank_code: str
    ) -> Dict[str, Any]:
        """
        Create a transfer recipient (for seller payouts)

        Args:
            account_name: Account holder name
            account_number: Bank account number
            bank_code: Bank code

        Returns:
            Dict with recipient_code
        """
        try:
            payload = {
                "type": "nuban",
                "name": account_name,
                "account_number": account_number,
                "bank_code": bank_code,
                "currency": "GHS"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/transferrecipient",
                    json=payload,
                    headers=self._get_headers()
                )

                response.raise_for_status()
                result = response.json()

                if result.get("status"):
                    return {
                        "success": True,
                        "recipient_code": result["data"]["recipient_code"]
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("message", "Failed to create recipient")
                    }

        except httpx.HTTPError as e:
            logger.error(f"HTTP error creating recipient: {e}")
            return {
                "success": False,
                "error": f"HTTP error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error creating recipient: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }

    async def initiate_transfer(
        self,
        amount: float,
        recipient_code: str,
        reason: str,
        reference: str
    ) -> Dict[str, Any]:
        """
        Initiate a transfer to a recipient

        Args:
            amount: Amount in GHS
            recipient_code: Recipient code from create_transfer_recipient
            reason: Transfer reason
            reference: Unique reference

        Returns:
            Dict with transfer details
        """
        try:
            # Convert amount to kobo
            amount_kobo = int(amount * 100)

            payload = {
                "source": "balance",
                "amount": amount_kobo,
                "recipient": recipient_code,
                "reason": reason,
                "reference": reference
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/transfer",
                    json=payload,
                    headers=self._get_headers()
                )

                response.raise_for_status()
                result = response.json()

                if result.get("status"):
                    return {
                        "success": True,
                        "transfer_code": result["data"]["transfer_code"],
                        "reference": result["data"]["reference"],
                        "status": result["data"]["status"]
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("message", "Transfer failed")
                    }

        except httpx.HTTPError as e:
            logger.error(f"HTTP error initiating transfer: {e}")
            return {
                "success": False,
                "error": f"HTTP error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error initiating transfer: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }

    async def refund_transaction(
        self,
        reference: str,
        amount: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Refund a transaction

        Args:
            reference: Original transaction reference
            amount: Optional partial refund amount in GHS (None for full refund)

        Returns:
            Dict with refund details
        """
        try:
            payload = {
                "transaction": reference
            }

            if amount:
                payload["amount"] = int(amount * 100)  # Convert to kobo

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/refund",
                    json=payload,
                    headers=self._get_headers()
                )

                response.raise_for_status()
                result = response.json()

                if result.get("status"):
                    return {
                        "success": True,
                        "refund_id": result["data"]["id"],
                        "status": result["data"]["status"]
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("message", "Refund failed")
                    }

        except httpx.HTTPError as e:
            logger.error(f"HTTP error processing refund: {e}")
            return {
                "success": False,
                "error": f"HTTP error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error processing refund: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }

    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str, secret_key: str) -> bool:
        """
        Verify Paystack webhook signature

        Args:
            payload: Raw request body (bytes)
            signature: X-Paystack-Signature header value
            secret_key: Paystack secret key

        Returns:
            True if signature is valid
        """
        try:
            computed_signature = hmac.new(
                secret_key.encode(),
                payload,
                hashlib.sha512
            ).hexdigest()

            return hmac.compare_digest(computed_signature, signature)

        except Exception as e:
            logger.error(f"Error verifying signature: {e}")
            return False


# Singleton instance
paystack_client = PaystackClient()


# Webhook router (imported in main.py)
from fastapi import APIRouter, Request, HTTPException, status as http_status, Depends
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter()


@router.post("/paystack")
async def paystack_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Paystack webhook endpoint

    Handles payment notifications from Paystack
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        signature = request.headers.get("x-paystack-signature", "")

        # Verify signature
        if not PaystackClient.verify_webhook_signature(body, signature, settings.PAYSTACK_SECRET_KEY):
            logger.warning("Invalid Paystack webhook signature")
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature"
            )

        # Parse payload
        import json
        payload = json.loads(body)

        event = payload.get("event")
        data = payload.get("data", {})

        logger.info(f"Paystack webhook received: {event}")

        # Handle different event types
        if event == "charge.success":
            # Payment successful
            reference = data.get("reference")
            amount = data.get("amount", 0) / 100  # Convert from kobo
            customer_email = data.get("customer", {}).get("email")

            # Import here to avoid circular imports
            from modules.escrow.service import EscrowService

            # Process payment
            await EscrowService.process_payment_webhook(
                db=db,
                reference=reference,
                amount=amount,
                customer_email=customer_email,
                metadata=data.get("metadata", {})
            )

            logger.info(f"Payment processed: {reference}")

        elif event == "transfer.success":
            # Transfer successful
            reference = data.get("reference")

            from modules.escrow.service import EscrowService

            await EscrowService.process_transfer_webhook(
                db=db,
                reference=reference,
                status="success"
            )

            logger.info(f"Transfer successful: {reference}")

        elif event == "transfer.failed":
            # Transfer failed
            reference = data.get("reference")

            from modules.escrow.service import EscrowService

            await EscrowService.process_transfer_webhook(
                db=db,
                reference=reference,
                status="failed"
            )

            logger.warning(f"Transfer failed: {reference}")

        return {"status": "success"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing error: {e}", exc_info=True)
        # Return 200 to prevent Paystack from retrying
        return {"status": "error", "message": str(e)}
