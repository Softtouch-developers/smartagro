"""
Chat Routes
API endpoints for buyer-seller messaging
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List
import logging

from database import get_db
from models import User, UserType
from modules.auth.dependencies import get_current_verified_user
from modules.chat.service import ChatService
from modules.chat.schemas import (
    SendMessageRequest,
    MessageResponse,
    ConversationResponse,
    UploadVoiceNoteResponse
)
from modules.storage.service import StorageService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    other_user_id: int = Query(..., description="ID of the other user (buyer or seller)"),
    product_id: int = Query(None, description="Related product ID"),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Create or get existing conversation between buyer and seller

    **Requires authentication**

    Query parameters:
    - **other_user_id**: ID of the user to chat with
    - **product_id**: Optional product ID for context
    """
    try:
        # Get other user to determine roles
        other_user = db.query(User).filter(User.id == other_user_id).first()

        if not other_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Determine buyer and seller
        if current_user.user_type == UserType.BUYER:
            if other_user.user_type != UserType.FARMER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Buyers can only chat with farmers"
                )
            buyer_id = current_user.id
            seller_id = other_user.id
        elif current_user.user_type == UserType.FARMER:
            if other_user.user_type != UserType.BUYER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Farmers can only chat with buyers"
                )
            buyer_id = other_user.id
            seller_id = current_user.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot create chats"
            )

        # Get product name if product_id provided
        product_name = None
        if product_id:
            from models import Product
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                product_name = product.product_name

        conversation = ChatService.create_or_get_conversation(
            buyer_id=buyer_id,
            seller_id=seller_id,
            product_id=product_id,
            product_name=product_name
        )

        return ConversationResponse(**conversation, unread_count=0)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create conversation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation"
        )


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get all conversations for current user

    **Requires authentication**

    Returns list of conversations sorted by last message time
    """
    try:
        conversations = ChatService.get_user_conversations(
            user_id=current_user.id,
            user_type=current_user.user_type.value,
            limit=limit
        )

        return [ConversationResponse(**conv) for conv in conversations]

    except Exception as e:
        logger.error(f"Get conversations error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations"
        )


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get messages for a conversation

    **Requires authentication**

    Path parameters:
    - **conversation_id**: Format "buyer_{buyer_id}_seller_{seller_id}"

    Query parameters:
    - **limit**: Max messages to return (default: 50)
    - **skip**: Offset for pagination (default: 0)

    Returns messages sorted chronologically (oldest first)
    """
    try:
        # Verify user is part of this conversation
        parts = conversation_id.split("_")
        if len(parts) != 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid conversation ID format"
            )

        buyer_id = int(parts[1])
        seller_id = int(parts[3])

        if current_user.id not in [buyer_id, seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this conversation"
            )

        messages = ChatService.get_conversation_messages(
            conversation_id=conversation_id,
            limit=limit,
            skip=skip
        )

        # Mark messages as read
        ChatService.mark_messages_as_read(
            conversation_id=conversation_id,
            user_id=current_user.id,
            user_type=current_user.user_type.value
        )

        return [MessageResponse(**msg) for msg in messages]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get messages error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve messages"
        )


@router.post("/messages", response_model=MessageResponse)
async def send_message(
    request: SendMessageRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to another user

    **Requires authentication**

    At least one of text, image_url, or voice_note_url must be provided
    """
    try:
        # Validate that at least one content type is provided
        if not any([request.text, request.image_url, request.voice_note_url]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message must contain text, image, or voice note"
            )

        # Verify receiver exists
        receiver = db.query(User).filter(User.id == request.receiver_id).first()

        if not receiver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receiver not found"
            )

        # Verify correct user types
        if current_user.user_type == UserType.BUYER and receiver.user_type != UserType.FARMER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Buyers can only message farmers"
            )
        elif current_user.user_type == UserType.FARMER and receiver.user_type != UserType.BUYER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Farmers can only message buyers"
            )
        elif current_user.user_type == UserType.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot send chat messages"
            )

        # Send message
        message = ChatService.send_message(
            sender_id=current_user.id,
            receiver_id=request.receiver_id,
            sender_type=current_user.user_type.value,
            text=request.text,
            image_url=request.image_url,
            voice_note_url=request.voice_note_url,
            related_product_id=request.related_product_id
        )

        return MessageResponse(**message)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send message error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get total unread messages count

    **Requires authentication**

    Returns the count of unread messages across all conversations
    """
    try:
        count = ChatService.get_unread_count(
            user_id=current_user.id,
            user_type=current_user.user_type.value
        )

        return {"unread_count": count}

    except Exception as e:
        logger.error(f"Get unread count error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve unread count"
        )


@router.post("/upload/voice", response_model=UploadVoiceNoteResponse)
async def upload_voice_note(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Upload a voice note for chat

    **Requires authentication**

    - Accepts: MP3, WAV, M4A, OGG, WebM
    - Max size: 10MB
    - Returns URL to use in send_message endpoint

    Usage:
    1. Upload voice note using this endpoint
    2. Get voice_note_url from response
    3. Send message with voice_note_url
    """
    try:
        # Validate file type
        allowed_types = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm"]
        if not file.content_type or file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only audio files are allowed (MP3, WAV, M4A, OGG, WebM)"
            )

        # Upload voice note
        file_url = await StorageService.upload_voice_note(
            file=file,
            user_id=current_user.id
        )

        return UploadVoiceNoteResponse(
            success=True,
            voice_note_url=file_url,
            message="Voice note uploaded successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice note upload error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload voice note: {str(e)}"
        )
