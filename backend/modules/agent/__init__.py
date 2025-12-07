"""
AI Farming Agent Module

Provides intelligent farming assistance with:
- Knowledge base search (hybrid semantic + keyword)
- Platform data access (products, orders, earnings)
- Weather forecasts
- Multimodal chat support (images, audio, video)
- Streaming responses
- Conversation management
"""

from modules.agent.routes import router
from modules.agent.service import (
    FarmingAgent,
    ConversationManager,
    create_agent_session,
    get_agent_response,
    stream_agent_response
)
from modules.agent.knowledge_service import KnowledgeService
from modules.agent.tools import AgentTools, AGENT_TOOLS

__all__ = [
    "router",
    "FarmingAgent",
    "ConversationManager",
    "create_agent_session",
    "get_agent_response",
    "stream_agent_response",
    "KnowledgeService",
    "AgentTools",
    "AGENT_TOOLS"
]
