"""
mNotify SMS Integration
SMS service for sending OTPs and notifications to Ghanaian phone numbers
"""
import httpx
import logging
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)


class MNotifyClient:
    """Client for mNotify SMS API"""

    def __init__(self):
        self.api_key = settings.MNOTIFY_API_KEY
        self.sender = getattr(settings, 'MNOTIFY_DEFAULT_SENDER', 'SmartAgro')
        self.gateway_url = getattr(settings, 'MNOTIFY_GATEWAY_URL', 'https://api.mnotify.com/api/sms/quick')
        self.mock_sms = settings.MOCK_SMS

    async def send_sms(
        self,
        to: str,
        message: str,
        sender: Optional[str] = None
    ) -> dict:
        """
        Send SMS via mNotify

        Args:
            to: Recipient phone number (e.g., +233241234567)
            message: SMS message content
            sender: Sender name (defaults to settings)

        Returns:
            dict with 'success' boolean and 'message' or 'error'
        """
        # Mock mode for development
        if self.mock_sms:
            logger.info(f"[MOCK SMS] To: {to}, Message: {message}")
            return {
                "success": True,
                "message": "SMS sent (mocked)",
                "mock": True
            }

        try:
            # Format phone number (ensure it starts with country code)
            formatted_phone = self._format_phone_number(to)

            # Prepare request
            payload = {
                "recipient": [formatted_phone],  # Must be an array
                "sender": sender or self.sender,
                "message": message,
                "is_schedule": False,  # Boolean, not string
                "schedule_date": ""
            }
            headers = {
                "Content-Type": "application/json"
            }

            # API key goes in query parameter, not Authorization header
            url_with_key = f"{self.gateway_url}?key={self.api_key}"

            # Send request
            async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
                response = await client.post(
                    url_with_key,
                    json=payload,
                    headers=headers
                )

                response.raise_for_status()
                result = response.json()

                # mNotify response format varies, check for success
                if result.get("code") == "2000" or result.get("status") == "success":
                    logger.info(f"SMS sent successfully to {to}")
                    return {
                        "success": True,
                        "message": "SMS sent successfully",
                        "response": result
                    }
                else:
                    logger.error(f"mNotify API error: {result}")
                    return {
                        "success": False,
                        "error": result.get("message", "Failed to send SMS")
                    }

        except httpx.HTTPError as e:
            logger.error(f"HTTP error sending SMS: {e}")
            return {
                "success": False,
                "error": f"HTTP error: {str(e)}"
            }

        except Exception as e:
            logger.error(f"Unexpected error sending SMS: {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }

    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number for Ghana (ensure country code)

        Args:
            phone: Phone number in various formats

        Returns:
            Formatted phone number with country code
        """
        # Remove spaces, dashes, parentheses
        cleaned = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

        # If starts with 0, replace with +233
        if cleaned.startswith("0"):
            return f"+233{cleaned[1:]}"

        # If starts with 233, add +
        if cleaned.startswith("233"):
            return f"+{cleaned}"

        # If already has +, return as is
        if cleaned.startswith("+"):
            return cleaned

        # Default: assume Ghana and add +233
        return f"+233{cleaned}"

    async def send_otp(self, to: str, otp_code: str) -> dict:
        """
        Send OTP code via SMS

        Args:
            to: Recipient phone number
            otp_code: OTP code to send

        Returns:
            dict with 'success' boolean and 'message' or 'error'
        """
        message = f"Your SmartAgro verification code is: {otp_code}. This code is valid for {settings.OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone."

        return await self.send_sms(to, message)

    async def send_order_notification(
        self,
        to: str,
        order_id: int,
        status: str,
        details: str = ""
    ) -> dict:
        """
        Send order status notification

        Args:
            to: Recipient phone number
            order_id: Order ID
            status: Order status
            details: Additional details

        Returns:
            dict with 'success' boolean and 'message' or 'error'
        """
        message = f"SmartAgro Order #{order_id}: {status}. {details}"
        return await self.send_sms(to, message)

    async def send_payment_notification(
        self,
        to: str,
        amount: float,
        status: str
    ) -> dict:
        """
        Send payment notification

        Args:
            to: Recipient phone number
            amount: Payment amount
            status: Payment status

        Returns:
            dict with 'success' boolean and 'message' or 'error'
        """
        message = f"SmartAgro: Payment of GH₵{amount:.2f} - {status}"
        return await self.send_sms(to, message)


# Singleton instance
mnotify_client = MNotifyClient()
