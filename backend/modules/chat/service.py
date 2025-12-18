"""
Chat Service
Business logic for buyer-seller messaging using MongoDB
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import logging

from database import get_mongo_db
from mongo_models import ChatMessage, Conversation, VoiceNote
from models import User, UserType

logger = logging.getLogger(__name__)


class ChatService:
    """Service for chat operations"""

    @staticmethod
    def _generate_conversation_id(buyer_id: int, seller_id: int) -> str:
        """Generate consistent conversation ID"""
        return f"buyer_{buyer_id}_seller_{seller_id}"

    @staticmethod
    def create_or_get_conversation(
        buyer_id: int,
        seller_id: int,
        product_id: Optional[int] = None,
        product_name: Optional[str] = None,
        buyer_name: Optional[str] = None,
        seller_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create or retrieve existing conversation
        """
        mongo_db = get_mongo_db()
        conversations = mongo_db['conversations']

        conversation_id = ChatService._generate_conversation_id(buyer_id, seller_id)

        # Check if conversation exists
        existing = conversations.find_one({"conversation_id": conversation_id})

        if existing:
            return {
                "conversation_id": existing["conversation_id"],
                "buyer_id": existing["buyer_id"],
                "seller_id": existing["seller_id"],
                "buyer_name": buyer_name,
                "seller_name": seller_name,
                "product_id": existing.get("product_id"),
                "product_name": existing.get("product_name"),
                "last_message": existing.get("last_message"),
                "unread_count": 0,
                "updated_at": existing.get("updated_at")
            }

        # Create new conversation
        conversation_data = {
            "conversation_id": conversation_id,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "product_id": product_id,
            "product_name": product_name,
            "status": "ACTIVE",
            "is_archived_by_buyer": False,
            "is_archived_by_seller": False,
            "unread_count_buyer": 0,
            "unread_count_seller": 0,
            "total_messages": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = conversations.insert_one(conversation_data)

        logger.info(f"Conversation created: {conversation_id}")

        return {
            "conversation_id": conversation_id,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "buyer_name": buyer_name,
            "seller_name": seller_name,
            "product_id": product_id,
            "product_name": product_name,
            "last_message": None,
            "unread_count": 0,
            "updated_at": conversation_data["updated_at"]
        }

    @staticmethod
    def send_message(
        sender_id: int,
        receiver_id: int,
        sender_type: str,
        text: Optional[str] = None,
        image_url: Optional[str] = None,
        voice_note_url: Optional[str] = None,
        voice_duration: Optional[int] = None,
        related_product_id: Optional[int] = None,
        related_order_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Send a message in a conversation
        """
        mongo_db = get_mongo_db()
        messages = mongo_db['chat_messages']
        conversations = mongo_db['conversations']

        # Determine buyer_id and seller_id
        if sender_type == "BUYER":
            buyer_id = sender_id
            seller_id = receiver_id
        else:
            buyer_id = receiver_id
            seller_id = sender_id

        conversation_id = ChatService._generate_conversation_id(buyer_id, seller_id)

        # Determine message type
        if voice_note_url:
            message_type = "VOICE"
        elif image_url:
            message_type = "IMAGE"
        else:
            message_type = "TEXT"

        # Create message
        message_data = {
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "sender_type": sender_type,
            "message_type": message_type,
            "text": text,
            "related_product_id": related_product_id,
            "related_order_id": related_order_id,
            "is_read": False,
            "is_system_message": False,
            "timestamp": datetime.utcnow(),
            "is_deleted": False
        }

        # Add voice note details
        if voice_note_url:
            message_data["voice_note"] = {
                "url": voice_note_url,
                "duration_seconds": voice_duration or 0,
                "language": "en"
            }

        # Add image to attachments
        if image_url:
            message_data["attachments"] = [{
                "type": "IMAGE",
                "url": image_url
            }]

        result = messages.insert_one(message_data)

        # Update conversation metadata
        conversations.update_one(
            {"conversation_id": conversation_id},
            {
                "$set": {
                    "last_message": text or "(Media message)",
                    "last_message_at": message_data["timestamp"],
                    "last_message_sender_id": sender_id,
                    "updated_at": datetime.utcnow()
                },
                "$inc": {
                    "total_messages": 1,
                    "unread_count_buyer" if sender_type == "FARMER" else "unread_count_seller": 1
                }
            }
        )

        logger.info(f"Message sent from {sender_id} to {receiver_id}")

        return {
            "id": str(result.inserted_id),
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "sender_type": sender_type,
            "text": text,
            "image_url": image_url,
            "voice_note_url": voice_note_url,
            "related_product_id": related_product_id,
            "is_read": False,
            "created_at": message_data["timestamp"]
        }

    @staticmethod
    def get_user_conversations(user_id: int, user_type: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get all conversations for a user
        """
        mongo_db = get_mongo_db()
        conversations = mongo_db['conversations']

        # Build query based on user type
        if user_type == "BUYER":
            query = {"buyer_id": user_id}
            unread_field = "unread_count_buyer"
        else:
            query = {"seller_id": user_id}
            unread_field = "unread_count_seller"

        # Get conversations sorted by last message
        results = conversations.find(query).sort("last_message_at", -1).limit(limit)

        conversation_list = []
        for conv in results:
            conversation_list.append({
                "conversation_id": conv["conversation_id"],
                "buyer_id": conv["buyer_id"],
                "seller_id": conv["seller_id"],
                "product_id": conv.get("product_id"),
                "product_name": conv.get("product_name"),
                "last_message": conv.get("last_message"),
                "unread_count": conv.get(unread_field, 0),
                "updated_at": conv.get("updated_at")
            })

        return conversation_list

    @staticmethod
    def get_conversation_messages(
        conversation_id: str,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get messages for a conversation with pagination
        """
        mongo_db = get_mongo_db()
        messages = mongo_db['chat_messages']

        # Get messages sorted by timestamp (newest first)
        results = messages.find(
            {"conversation_id": conversation_id, "is_deleted": False}
        ).sort("timestamp", -1).skip(skip).limit(limit)

        message_list = []
        for msg in results:
            message_data = {
                "id": str(msg["_id"]),
                "conversation_id": msg["conversation_id"],
                "sender_id": msg["sender_id"],
                "receiver_id": msg["receiver_id"],
                "sender_type": msg["sender_type"],
                "text": msg.get("text"),
                "image_url": None,
                "voice_note_url": None,
                "related_product_id": msg.get("related_product_id"),
                "is_read": msg.get("is_read", False),
                "created_at": msg["timestamp"]
            }

            # Extract image URL from attachments
            if msg.get("attachments"):
                for attachment in msg["attachments"]:
                    if attachment.get("type") == "IMAGE":
                        message_data["image_url"] = attachment.get("url")
                        break

            # Extract voice note URL
            if msg.get("voice_note"):
                message_data["voice_note_url"] = msg["voice_note"].get("url")

            message_list.append(message_data)

        # Reverse to show oldest first
        return list(reversed(message_list))

    @staticmethod
    def mark_messages_as_read(conversation_id: str, user_id: int, user_type: str) -> int:
        """
        Mark all unread messages in a conversation as read for the user
        """
        mongo_db = get_mongo_db()
        messages = mongo_db['chat_messages']
        conversations = mongo_db['conversations']

        # Mark messages where user is the receiver
        result = messages.update_many(
            {
                "conversation_id": conversation_id,
                "receiver_id": user_id,
                "is_read": False
            },
            {
                "$set": {
                    "is_read": True,
                    "read_at": datetime.utcnow()
                }
            }
        )

        # Reset unread count in conversation
        if user_type == "BUYER":
            conversations.update_one(
                {"conversation_id": conversation_id},
                {"$set": {"unread_count_buyer": 0}}
            )
        else:
            conversations.update_one(
                {"conversation_id": conversation_id},
                {"$set": {"unread_count_seller": 0}}
            )

        logger.info(f"Marked {result.modified_count} messages as read in {conversation_id}")
        return result.modified_count

    @staticmethod
    def get_unread_count(user_id: int, user_type: str) -> int:
        """
        Get total unread messages count for a user across all conversations
        """
        mongo_db = get_mongo_db()
        conversations = mongo_db['conversations']

        # Build query based on user type
        if user_type == "BUYER":
            query = {"buyer_id": user_id}
            unread_field = "unread_count_buyer"
        else:
            query = {"seller_id": user_id}
            unread_field = "unread_count_seller"

        # Sum up all unread counts
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": None,
                "total_unread": {"$sum": f"${unread_field}"}
            }}
        ]

        result = list(conversations.aggregate(pipeline))

        if result:
            return result[0].get("total_unread", 0)
        return 0
