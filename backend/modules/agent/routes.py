"""
AI Farming Agent Routes
Endpoints for:
- Creating/managing chat sessions
- Sending messages (with multimodal support)
- Streaming responses
- Session history and rating
- Knowledge base management
"""
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from modules.auth.dependencies import get_current_user, get_current_admin
from models import User, UserType
from modules.agent.service import (
    FarmingAgent,
    ConversationManager,
    create_agent_session,
    get_agent_response,
    stream_agent_response
)
from modules.agent.knowledge_service import KnowledgeService
from modules.storage.service import StorageService

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== SCHEMAS ====================

class MediaAttachment(BaseModel):
    """Media attachment for multimodal chat"""
    type: str = Field(..., description="Media type: image, audio, video")
    url: Optional[str] = Field(None, description="URL to media file")
    base64: Optional[str] = Field(None, description="Base64 encoded media")
    mime_type: Optional[str] = Field(None, description="MIME type of media")


class ChatMessageRequest(BaseModel):
    """Request to send a chat message"""
    message: str = Field(..., min_length=1, max_length=4000, description="User message")
    session_id: Optional[str] = Field(None, description="Existing session ID (creates new if not provided)")
    media_attachments: Optional[List[MediaAttachment]] = Field(None, description="Media attachments")


class ChatMessageResponse(BaseModel):
    """Response from chat endpoint"""
    session_id: str
    response: str
    tool_calls: List[dict] = []
    model: str
    usage: dict


class SessionInfo(BaseModel):
    """Session information"""
    session_id: str
    farmer_id: int
    status: str
    total_messages: int
    total_tool_calls: int
    current_topic: Optional[str]
    detected_crops: List[str]
    started_at: datetime
    last_interaction_at: datetime
    farmer_rating: Optional[int]


class SessionListResponse(BaseModel):
    """List of sessions"""
    sessions: List[SessionInfo]
    total: int


class RatingRequest(BaseModel):
    """Request to rate a session"""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1-5")
    feedback: Optional[str] = Field(None, max_length=1000, description="Optional feedback")


class MessageInfo(BaseModel):
    """Message information"""
    role: str
    content: str
    tool_calls: List[dict] = []
    media_attachments: List[dict] = []
    timestamp: datetime


class SessionHistoryResponse(BaseModel):
    """Session history response"""
    session_id: str
    messages: List[MessageInfo]
    total_messages: int


class KnowledgeIndexRequest(BaseModel):
    """Request to index knowledge base"""
    force_reindex: bool = Field(False, description="Force reindex existing documents")


class KnowledgeSearchRequest(BaseModel):
    """Request to search knowledge base"""
    query: str = Field(..., min_length=1, max_length=500)
    document_type: Optional[str] = None
    crops: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    limit: int = Field(5, ge=1, le=20)


# ==================== CHAT ENDPOINTS ====================

@router.post("/chat", response_model=ChatMessageResponse)
async def send_message(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to the AI farming assistant (non-streaming)

    - Creates new session if session_id not provided
    - Supports text and multimodal inputs (images, audio, video)
    - Returns complete response with tool calls
    """
    try:
        # Convert media attachments to dict format
        media_attachments = None
        if request.media_attachments:
            media_attachments = [
                {
                    "type": ma.type,
                    "url": ma.url,
                    "base64": ma.base64,
                    "mime_type": ma.mime_type
                }
                for ma in request.media_attachments
            ]

        response = await get_agent_response(
            farmer_id=current_user.id,
            message=request.message,
            db=db,
            session_id=request.session_id,
            media_attachments=media_attachments
        )

        return ChatMessageResponse(**response)

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process message")


@router.post("/chat/stream")
async def send_message_stream(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to the AI farming assistant with streaming response

    Returns Server-Sent Events (SSE) stream with events:
    - start: Stream started, includes session_id
    - token: Individual response tokens
    - tool_start: Tool execution starting
    - tool_end: Tool execution complete
    - done: Stream complete
    - error: Error occurred
    """
    try:
        # Convert media attachments
        media_attachments = None
        if request.media_attachments:
            media_attachments = [
                {
                    "type": ma.type,
                    "url": ma.url,
                    "base64": ma.base64,
                    "mime_type": ma.mime_type
                }
                for ma in request.media_attachments
            ]

        return StreamingResponse(
            stream_agent_response(
                farmer_id=current_user.id,
                message=request.message,
                db=db,
                session_id=request.session_id,
                media_attachments=media_attachments
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Stream error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to start stream")


@router.post("/chat/upload")
async def send_message_with_upload(
    message: str = Form(...),
    session_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message with file upload (image, audio, or video)

    Uploads file to storage and sends to agent with message
    """
    try:
        # Validate file type
        allowed_types = [
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
            "video/mp4", "video/webm", "video/quicktime"
        ]

        content_type = file.content_type
        if content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {content_type}. Supported: images, audio, video"
            )

        # Determine media type
        if content_type.startswith("image/"):
            media_type = "image"
            max_size = 5 * 1024 * 1024  # 5MB
        elif content_type.startswith("audio/"):
            media_type = "audio"
            max_size = 10 * 1024 * 1024  # 10MB
        else:
            media_type = "video"
            max_size = 50 * 1024 * 1024  # 50MB

        # Read file
        file_bytes = await file.read()
        if len(file_bytes) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size for {media_type}: {max_size // (1024*1024)}MB"
            )

        # Upload to storage
        storage = StorageService()
        upload_result = await storage.upload_file(
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=content_type,
            folder=f"agent/{media_type}s"
        )

        # Create media attachment
        media_attachments = [{
            "type": media_type,
            "url": upload_result["url"],
            "mime_type": content_type
        }]

        # Send to agent
        response = await get_agent_response(
            farmer_id=current_user.id,
            message=message,
            db=db,
            session_id=session_id,
            media_attachments=media_attachments
        )

        return ChatMessageResponse(**response)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process uploaded file")


# ==================== SESSION ENDPOINTS ====================

@router.post("/sessions", response_model=dict)
async def create_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat session"""
    session_id = await create_agent_session(current_user.id, db)
    return {"session_id": session_id}


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user)
):
    """Get list of user's chat sessions"""
    sessions = ConversationManager.get_farmer_sessions(current_user.id, limit)

    session_list = []
    for s in sessions:
        session_list.append(SessionInfo(
            session_id=s["session_id"],
            farmer_id=s["farmer_id"],
            status=s.get("status", "ACTIVE"),
            total_messages=s.get("total_messages", 0),
            total_tool_calls=s.get("total_tool_calls", 0),
            current_topic=s.get("current_topic"),
            detected_crops=s.get("detected_crops", []),
            started_at=s.get("started_at", datetime.utcnow()),
            last_interaction_at=s.get("last_interaction_at", datetime.utcnow()),
            farmer_rating=s.get("farmer_rating")
        ))

    return SessionListResponse(
        sessions=session_list,
        total=len(session_list)
    )


@router.get("/sessions/{session_id}", response_model=SessionHistoryResponse)
async def get_session_history(
    session_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user)
):
    """Get session message history"""
    session = ConversationManager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify ownership
    if session["farmer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    messages = session.get("messages", [])[-limit:]

    return SessionHistoryResponse(
        session_id=session_id,
        messages=[
            MessageInfo(
                role=m["role"],
                content=m["content"],
                tool_calls=m.get("tool_calls", []),
                media_attachments=m.get("media_attachments", []),
                timestamp=m.get("timestamp", datetime.utcnow())
            )
            for m in messages
        ],
        total_messages=session.get("total_messages", len(messages))
    )


@router.post("/sessions/{session_id}/rate")
async def rate_session(
    session_id: str,
    request: RatingRequest,
    current_user: User = Depends(get_current_user)
):
    """Rate a chat session"""
    session = ConversationManager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["farmer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    ConversationManager.rate_session(session_id, request.rating, request.feedback)

    return {"message": "Rating submitted successfully"}


@router.post("/sessions/{session_id}/end")
async def end_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark a session as completed"""
    session = ConversationManager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["farmer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    ConversationManager.end_session(session_id)

    return {"message": "Session ended successfully"}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a chat session"""
    session = ConversationManager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["farmer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    ConversationManager.delete_session(session_id)

    return {"message": "Session deleted successfully"}


# ==================== KNOWLEDGE BASE ENDPOINTS (Admin) ====================

@router.post("/knowledge/index")
async def index_knowledge_base(
    request: KnowledgeIndexRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Index all documents in the knowledge base (Admin only)

    Processes all markdown files in the knowledgebase directory,
    creates embeddings, and stores in MongoDB + PostgreSQL.

    Set force_reindex=true to re-process all documents (deletes existing and re-creates).
    """
    try:
        result = KnowledgeService.index_knowledge_base(db, force_reindex=request.force_reindex)

        return {
            "message": "Knowledge base indexing complete",
            "stats": result
        }

    except Exception as e:
        logger.error(f"Indexing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/knowledge/documents")
async def list_knowledge_documents(
    document_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_admin)
):
    """List all knowledge documents (Admin only)"""
    docs = KnowledgeService.get_all_documents(document_type, limit=limit)

    return {
        "documents": docs,
        "total": len(docs)
    }


@router.get("/knowledge/documents/{document_id}")
async def get_knowledge_document(
    document_id: str,
    current_user: User = Depends(get_current_admin)
):
    """Get a specific knowledge document (Admin only)"""
    doc = KnowledgeService.get_document_by_id(document_id)

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return doc


@router.post("/knowledge/search")
async def search_knowledge(
    request: KnowledgeSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search the knowledge base

    Performs hybrid search (semantic + keyword) on agricultural knowledge
    """
    try:
        results = KnowledgeService.hybrid_search(
            query=request.query,
            db=db,
            document_type=request.document_type,
            crops=request.crops,
            topics=request.topics,
            limit=request.limit
        )

        return {
            "query": request.query,
            "results": results,
            "total": len(results)
        }

    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search failed")
