"""
AI Agent Service
Handles conversation orchestration, tool execution, streaming responses,
and multimodal input processing (images, audio, video)
"""
import json
import uuid
import base64
import logging
import asyncio
import os
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime

from openai import OpenAI
from sqlalchemy.orm import Session

from config import settings
from database import get_db, get_mongo_db
from models import SystemConfiguration
from modules.agent.tools import AGENT_TOOLS, AgentTools

logger = logging.getLogger(__name__)


# OpenRouter client
client = OpenAI(
    base_url=settings.OPENROUTER_BASE_URL,
    api_key=settings.OPENROUTER_API_KEY
)


# Fallback system prompt (used only if DB config not available)
DEFAULT_SYSTEM_PROMPT = """You are SmartAgro AI, an intelligent farming assistant for Ghanaian farmers.
Help with agricultural advice, weather guidance, and platform questions.
Use simple language. All currency is in Ghana Cedis (GHS)."""


def get_system_prompt(db: Session) -> str:
    """
    Get the system prompt from database configuration.
    Falls back to default if not found.
    """
    try:
        config = db.query(SystemConfiguration).filter(
            SystemConfiguration.key == "AGENT_SYSTEM_PROMPT"
        ).first()

        if config and config.value:
            return config.value

        logger.warning("AGENT_SYSTEM_PROMPT not found in database, using default")
        return DEFAULT_SYSTEM_PROMPT

    except Exception as e:
        logger.error(f"Failed to fetch system prompt from DB: {e}")
        return DEFAULT_SYSTEM_PROMPT


# ==================== MULTIMODAL HELPERS ====================

def encode_image_to_base64(image_bytes: bytes) -> str:
    """Encode image bytes to base64 string"""
    return base64.b64encode(image_bytes).decode('utf-8')


def get_media_type(mime_type: str) -> str:
    """Get simplified media type for content"""
    if mime_type.startswith('image/'):
        return 'image'
    elif mime_type.startswith('audio/'):
        return 'audio'
    elif mime_type.startswith('video/'):
        return 'video'
    return 'file'


def build_multimodal_content(
    text: str,
    media_attachments: List[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Build multimodal content array for the LLM

    Args:
        text: Text message from user
        media_attachments: List of media attachments with format:
            [{"type": "image", "url": "...", "mime_type": "image/jpeg"}]
    Returns:
        Content array for LLM message
    """
    content = []

    # Add text content first
    if text:
        content.append({
            "type": "text",
            "text": text
        })

    # Add media attachments
    if media_attachments:
        for attachment in media_attachments:
            media_type = attachment.get('type', get_media_type(attachment.get('mime_type', '')))

            if media_type == 'image':
                # For images, use URL directly (OpenRouter/Gemini supports URLs)
                if attachment.get('base64'):
                    # Base64 encoded image
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{attachment.get('mime_type', 'image/jpeg')};base64,{attachment['base64']}"
                        }
                    })
                elif attachment.get('url'):
                    url = attachment['url']
                    # Check if it's a local file (starts with /uploads/)
                    if url.startswith('/uploads/'):
                        try:
                            # Convert local path to file system path
                            # URL: /uploads/agent/images/xxx.jpg -> Path: ./uploads/agent/images/xxx.jpg
                            relative_path = url.lstrip('/')
                            file_path = os.path.join(os.getcwd(), relative_path)
                            
                            if os.path.exists(file_path):
                                with open(file_path, "rb") as image_file:
                                    base64_image = base64.b64encode(image_file.read()).decode('utf-8')
                                    
                                content.append({
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{attachment.get('mime_type', 'image/jpeg')};base64,{base64_image}"
                                    }
                                })
                            else:
                                logger.error(f"Local image file not found: {file_path}")
                        except Exception as e:
                            logger.error(f"Failed to process local image: {e}")
                    else:
                        # Remote URL
                        content.append({
                            "type": "image_url",
                            "image_url": {
                                "url": url
                            }
                        })

            elif media_type == 'audio':
                # For audio (Gemini supports audio input)
                if attachment.get('url'):
                    url = attachment['url']
                    if url.startswith('/uploads/'):
                        try:
                            relative_path = url.lstrip('/')
                            file_path = os.path.join(os.getcwd(), relative_path)
                            if os.path.exists(file_path):
                                import io
                                from pydub import AudioSegment

                                if not file_path.lower().endswith('.wav'):
                                    audio = AudioSegment.from_file(file_path)
                                    wav_buffer = io.BytesIO()
                                    audio.export(wav_buffer, format="wav")
                                    audio_bytes = wav_buffer.getvalue()
                                else:
                                    with open(file_path, "rb") as audio_file:
                                        audio_bytes = audio_file.read()
                                
                                base64_audio = base64.b64encode(audio_bytes).decode('utf-8')
                                content.append({
                                    "type": "input_audio",
                                    "input_audio": {
                                        "data": base64_audio,
                                        "format": "wav"
                                    }
                                })
                            else:
                                logger.error(f"Local audio file not found: {file_path}")
                        except Exception as e:
                            logger.error(f"Failed to process local audio: {e}")
                    else:
                        content.append({
                            "type": "audio_url",
                            "audio_url": {
                                "url": url
                            }
                        })
                elif attachment.get('base64'):
                    content.append({
                        "type": "input_audio",
                        "input_audio": {
                            "data": attachment['base64'],
                            "format": attachment.get('format', 'wav')
                        }
                    })

            elif media_type == 'video':
                # For video (Gemini supports video input)
                if attachment.get('url'):
                    url = attachment['url']
                    if url.startswith('/uploads/'):
                        try:
                            relative_path = url.lstrip('/')
                            file_path = os.path.join(os.getcwd(), relative_path)
                            if os.path.exists(file_path):
                                with open(file_path, "rb") as video_file:
                                    base64_video = base64.b64encode(video_file.read()).decode('utf-8')
                                # Note: Gemini API might prefer file upload API for large videos, 
                                # but for short clips base64 might work via inline data if supported by the library/API version.
                                # However, standard OpenAI/Gemini format often prefers URL. 
                                # If base64 video isn't directly supported in 'video_url', we might need a different approach.
                                # Assuming standard 'video_url' or specific input type.
                                # Let's try sending as inline data if possible, or warn.
                                # Actually, for local dev, base64 is the only way without a public URL.
                                # We will assume the client library handles it or we send as 'image_url' frames (complex).
                                # For now, let's try the same pattern.
                                content.append({
                                    "type": "video_url",
                                    "video_url": {
                                        "url": f"data:{attachment.get('mime_type', 'video/mp4')};base64,{base64_video}"
                                    }
                                })
                            else:
                                logger.error(f"Local video file not found: {file_path}")
                        except Exception as e:
                            logger.error(f"Failed to process local video: {e}")
                    else:
                        content.append({
                            "type": "video_url",
                            "video_url": {
                                "url": url
                            }
                        })

    return content if len(content) > 1 else text


# ==================== CONVERSATION MANAGEMENT ====================

class ConversationManager:
    """Manages agent conversations in MongoDB"""

    @staticmethod
    def create_session(farmer_id: int, farmer_name: str = None, farmer_region: str = None) -> str:
        """Create a new conversation session"""
        session_id = f"agent_{uuid.uuid4().hex[:16]}"

        mongo_db = get_mongo_db()
        agent_conversations = mongo_db['agent_conversations']

        conversation = {
            "session_id": session_id,
            "farmer_id": farmer_id,
            "farmer_name": farmer_name,
            "farmer_region": farmer_region,
            "messages": [],
            "status": "ACTIVE",
            "current_topic": None,
            "detected_crops": [],
            "detected_issues": [],
            "total_messages": 0,
            "total_tool_calls": 0,
            "model_used": settings.AGENT_MODEL,
            "temperature": settings.AGENT_TEMPERATURE,
            "started_at": datetime.utcnow(),
            "last_interaction_at": datetime.utcnow()
        }

        agent_conversations.insert_one(conversation)
        logger.info(f"Created agent session: {session_id} for farmer {farmer_id}")

        return session_id

    @staticmethod
    def get_session(session_id: str) -> Optional[Dict[str, Any]]:
        """Get session by ID"""
        mongo_db = get_mongo_db()
        return mongo_db['agent_conversations'].find_one({"session_id": session_id})

    @staticmethod
    def get_farmer_sessions(farmer_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent sessions for a farmer"""
        mongo_db = get_mongo_db()
        sessions = mongo_db['agent_conversations'].find(
            {"farmer_id": farmer_id, "status": {"$ne": "DELETED"}},
            {"messages": 0}  # Exclude messages for list view
        ).sort("last_interaction_at", -1).limit(limit)

        return list(sessions)

    @staticmethod
    def add_message(
        session_id: str,
        role: str,
        content: str,
        tool_calls: List[Dict] = None,
        media_attachments: List[Dict] = None
    ):
        """Add a message to conversation"""
        mongo_db = get_mongo_db()

        message = {
            "role": role,
            "content": content,
            "tool_calls": tool_calls or [],
            "media_attachments": media_attachments or [],
            "timestamp": datetime.utcnow()
        }

        update = {
            "$push": {"messages": message},
            "$set": {"last_interaction_at": datetime.utcnow()},
            "$inc": {
                "total_messages": 1,
                "total_tool_calls": len(tool_calls) if tool_calls else 0
            }
        }

        mongo_db['agent_conversations'].update_one(
            {"session_id": session_id},
            update
        )

    @staticmethod
    def get_messages(session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get conversation messages"""
        session = ConversationManager.get_session(session_id)
        if not session:
            return []

        messages = session.get("messages", [])
        return messages[-limit:] if len(messages) > limit else messages

    @staticmethod
    def update_session_context(
        session_id: str,
        topic: str = None,
        crops: List[str] = None,
        issues: List[str] = None
    ):
        """Update session context from conversation"""
        mongo_db = get_mongo_db()

        update = {"$set": {"last_interaction_at": datetime.utcnow()}}

        if topic:
            update["$set"]["current_topic"] = topic
        if crops:
            update["$addToSet"] = {"detected_crops": {"$each": crops}}
        if issues:
            if "$addToSet" not in update:
                update["$addToSet"] = {}
            update["$addToSet"]["detected_issues"] = {"$each": issues}

        mongo_db['agent_conversations'].update_one(
            {"session_id": session_id},
            update
        )

    @staticmethod
    def end_session(session_id: str, resolution_summary: str = None):
        """Mark session as completed"""
        mongo_db = get_mongo_db()

        mongo_db['agent_conversations'].update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "status": "COMPLETED",
                    "is_resolved": True,
                    "resolution_summary": resolution_summary,
                    "completed_at": datetime.utcnow()
                }
            }
        )

    @staticmethod
    def rate_session(session_id: str, rating: int, feedback: str = None):
        """Add farmer rating to session"""
        mongo_db = get_mongo_db()

        mongo_db['agent_conversations'].update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "farmer_rating": rating,
                    "farmer_feedback": feedback
                }
            }
        )

    @staticmethod
    def delete_session(session_id: str):
        """Soft delete a session"""
        mongo_db = get_mongo_db()

        mongo_db['agent_conversations'].update_one(
            {"session_id": session_id},
            {"$set": {"status": "DELETED"}}
        )


# ==================== AGENT SERVICE ====================

class FarmingAgent:
    """
    AI Farming Assistant Agent
    Handles conversations with tool calling and streaming responses
    """

    def __init__(self, farmer_id: int, db: Session, session_id: str = None):
        """
        Initialize agent for a farmer

        Args:
            farmer_id: ID of the farmer
            db: Database session
            session_id: Optional existing session ID
        """
        self.farmer_id = farmer_id
        self.db = db
        self.tools = AgentTools(farmer_id, db)

        # Create or get session
        if session_id:
            self.session_id = session_id
            session = ConversationManager.get_session(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
        else:
            self.session_id = ConversationManager.create_session(farmer_id)

    def _build_messages(
        self,
        user_message: str,
        media_attachments: List[Dict] = None,
        include_history: bool = True
    ) -> List[Dict[str, Any]]:
        """Build messages array for LLM call"""
        system_prompt = get_system_prompt(self.db)
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history
        if include_history:
            history = ConversationManager.get_messages(self.session_id, limit=20)
            for msg in history:
                if msg["role"] in ["user", "assistant"]:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

        # Add current user message (with multimodal content if applicable)
        user_content = build_multimodal_content(user_message, media_attachments)
        messages.append({
            "role": "user",
            "content": user_content
        })

        return messages

    def _execute_tool_calls(self, tool_calls: List[Any]) -> List[Dict[str, Any]]:
        """Execute tool calls and return results"""
        results = []

        for tool_call in tool_calls:
            tool_name = tool_call.function.name
            try:
                arguments = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError:
                arguments = {}

            logger.info(f"Executing tool: {tool_name} with args: {arguments}")

            start_time = datetime.utcnow()
            result = self.tools.execute_tool(tool_name, arguments)
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            tool_result = {
                "tool_call_id": tool_call.id,
                "tool_name": tool_name,
                "arguments": arguments,
                "result": result,
                "execution_time_ms": execution_time,
                "success": "error" not in result
            }

            results.append(tool_result)
            logger.info(f"Tool {tool_name} executed in {execution_time}ms")

        return results

    async def chat(
        self,
        message: str,
        media_attachments: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process a chat message and return response (non-streaming)

        Args:
            message: User's text message
            media_attachments: Optional list of media attachments

        Returns:
            Response dict with assistant message and metadata
        """
        # Save user message
        ConversationManager.add_message(
            self.session_id,
            role="user",
            content=message,
            media_attachments=media_attachments
        )

        # Build messages
        messages = self._build_messages(message, media_attachments)

        # Initial LLM call with tools
        response = client.chat.completions.create(
            model=settings.AGENT_MODEL,
            messages=messages,
            tools=AGENT_TOOLS,
            tool_choice="auto",
            temperature=settings.AGENT_TEMPERATURE,
            max_tokens=settings.AGENT_MAX_TOKENS
        )

        assistant_message = response.choices[0].message
        tool_calls_made = []

        # Handle tool calls (loop until no more tool calls)
        max_iterations = 5
        iteration = 0

        while assistant_message.tool_calls and iteration < max_iterations:
            iteration += 1

            # Execute tools
            tool_results = self._execute_tool_calls(assistant_message.tool_calls)
            tool_calls_made.extend(tool_results)

            # Add assistant message with tool calls
            messages.append({
                "role": "assistant",
                "content": assistant_message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    }
                    for tc in assistant_message.tool_calls
                ]
            })

            # Add tool results
            for result in tool_results:
                messages.append({
                    "role": "tool",
                    "tool_call_id": result["tool_call_id"],
                    "content": json.dumps(result["result"])
                })

            # Call LLM again with tool results
            response = client.chat.completions.create(
                model=settings.AGENT_MODEL,
                messages=messages,
                tools=AGENT_TOOLS,
                tool_choice="auto",
                temperature=settings.AGENT_TEMPERATURE,
                max_tokens=settings.AGENT_MAX_TOKENS
            )

            assistant_message = response.choices[0].message

        # Get final response content
        final_content = assistant_message.content or "I apologize, but I couldn't generate a response. Please try again."

        # Save assistant response
        ConversationManager.add_message(
            self.session_id,
            role="assistant",
            content=final_content,
            tool_calls=tool_calls_made
        )

        return {
            "session_id": self.session_id,
            "response": final_content,
            "tool_calls": tool_calls_made,
            "model": settings.AGENT_MODEL,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0
            }
        }

    async def chat_stream(
        self,
        message: str,
        media_attachments: List[Dict] = None
    ) -> AsyncGenerator[str, None]:
        """
        Process a chat message with streaming response

        Yields SSE-formatted events:
        - event: start - Indicates stream start with session_id
        - event: token - Individual tokens
        - event: tool_start - Tool execution starting
        - event: tool_end - Tool execution complete
        - event: done - Stream complete with metadata
        - event: error - Error occurred

        Args:
            message: User's text message
            media_attachments: Optional list of media attachments

        Yields:
            SSE formatted strings
        """
        try:
            # Save user message
            ConversationManager.add_message(
                self.session_id,
                role="user",
                content=message,
                media_attachments=media_attachments
            )

            # Yield start event
            yield f"event: start\ndata: {json.dumps({'session_id': self.session_id})}\n\n"

            # Build messages
            messages = self._build_messages(message, media_attachments)

            tool_calls_made = []
            final_content = ""
            max_iterations = 5
            iteration = 0

            while iteration < max_iterations:
                iteration += 1

                # Create streaming request
                stream = client.chat.completions.create(
                    model=settings.AGENT_MODEL,
                    messages=messages,
                    tools=AGENT_TOOLS,
                    tool_choice="auto",
                    temperature=settings.AGENT_TEMPERATURE,
                    max_tokens=settings.AGENT_MAX_TOKENS,
                    stream=True
                )

                collected_content = ""
                collected_tool_calls = []
                current_tool_call = None

                # Process stream
                for chunk in stream:
                    delta = chunk.choices[0].delta if chunk.choices else None

                    if not delta:
                        continue

                    # Handle content tokens
                    if delta.content:
                        collected_content += delta.content
                        yield f"event: token\ndata: {json.dumps({'token': delta.content})}\n\n"

                    # Handle tool calls
                    if delta.tool_calls:
                        for tc_delta in delta.tool_calls:
                            if tc_delta.index is not None:
                                # Initialize or update tool call
                                while len(collected_tool_calls) <= tc_delta.index:
                                    collected_tool_calls.append({
                                        "id": "",
                                        "function": {"name": "", "arguments": ""}
                                    })

                                if tc_delta.id:
                                    collected_tool_calls[tc_delta.index]["id"] = tc_delta.id
                                if tc_delta.function:
                                    if tc_delta.function.name:
                                        collected_tool_calls[tc_delta.index]["function"]["name"] = tc_delta.function.name
                                    if tc_delta.function.arguments:
                                        collected_tool_calls[tc_delta.index]["function"]["arguments"] += tc_delta.function.arguments

                # If no tool calls, we're done
                if not collected_tool_calls:
                    final_content = collected_content
                    break

                # Execute tool calls
                for tc in collected_tool_calls:
                    tool_name = tc["function"]["name"]
                    try:
                        arguments = json.loads(tc["function"]["arguments"])
                    except json.JSONDecodeError:
                        arguments = {}

                    # Yield tool start event
                    yield f"event: tool_start\ndata: {json.dumps({'tool': tool_name, 'arguments': arguments})}\n\n"

                    start_time = datetime.utcnow()
                    result = self.tools.execute_tool(tool_name, arguments)
                    execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

                    tool_result = {
                        "tool_call_id": tc["id"],
                        "tool_name": tool_name,
                        "arguments": arguments,
                        "result": result,
                        "execution_time_ms": execution_time,
                        "success": "error" not in result
                    }
                    tool_calls_made.append(tool_result)

                    # Yield tool end event
                    yield f"event: tool_end\ndata: {json.dumps({'tool': tool_name, 'result': result, 'execution_time_ms': execution_time})}\n\n"

                # Add assistant message with tool calls
                messages.append({
                    "role": "assistant",
                    "content": collected_content or None,
                    "tool_calls": [
                        {
                            "id": tc["id"],
                            "type": "function",
                            "function": tc["function"]
                        }
                        for tc in collected_tool_calls
                    ]
                })

                # Add tool results
                for result in tool_calls_made[-len(collected_tool_calls):]:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": result["tool_call_id"],
                        "content": json.dumps(result["result"])
                    })

            # Save assistant response
            if not final_content:
                final_content = "I apologize, but I couldn't generate a response. Please try again."

            ConversationManager.add_message(
                self.session_id,
                role="assistant",
                content=final_content,
                tool_calls=tool_calls_made
            )

            # Yield done event
            yield f"event: done\ndata: {json.dumps({'session_id': self.session_id, 'tool_calls_count': len(tool_calls_made)})}\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"


# ==================== HELPER FUNCTIONS ====================

async def create_agent_session(farmer_id: int, db: Session) -> str:
    """Create a new agent session"""
    return ConversationManager.create_session(farmer_id)


async def get_agent_response(
    farmer_id: int,
    message: str,
    db: Session,
    session_id: str = None,
    media_attachments: List[Dict] = None
) -> Dict[str, Any]:
    """Get non-streaming agent response"""
    agent = FarmingAgent(farmer_id, db, session_id)
    return await agent.chat(message, media_attachments)


async def stream_agent_response(
    farmer_id: int,
    message: str,
    db: Session,
    session_id: str = None,
    media_attachments: List[Dict] = None
) -> AsyncGenerator[str, None]:
    """Get streaming agent response"""
    agent = FarmingAgent(farmer_id, db, session_id)
    async for chunk in agent.chat_stream(message, media_attachments):
        yield chunk
