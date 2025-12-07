"""
OpenRouter client for LLM and embeddings
"""
from openai import OpenAI
from config import settings
import logging

logger = logging.getLogger(__name__)

# OpenRouter client (compatible with OpenAI SDK)
openrouter_client = OpenAI(
    base_url=settings.OPENROUTER_BASE_URL,
    api_key=settings.OPENROUTER_API_KEY
)


def get_embedding(text: str) -> list[float]:
    """
    Generate embedding for text using OpenRouter
    
    Args:
        text: Text to embed
        
    Returns:
        List of floats (embedding vector)
    """
    try:
        response = openrouter_client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text
        )
        
        return response.data[0].embedding
    
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise


def chat_completion(messages: list, tools: list = None, **kwargs) -> dict:
    """
    Call LLM via OpenRouter
    
    Args:
        messages: List of message dicts
        tools: Optional tools for function calling
        **kwargs: Additional parameters (temperature, max_tokens, etc.)
        
    Returns:
        Response dict
    """
    try:
        params = {
            "model": settings.AGENT_MODEL,
            "messages": messages,
            "temperature": kwargs.get("temperature", settings.AGENT_TEMPERATURE),
            "max_tokens": kwargs.get("max_tokens", settings.AGENT_MAX_TOKENS)
        }
        
        if tools:
            params["tools"] = tools
        
        response = openrouter_client.chat.completions.create(**params)
        
        return response
    
    except Exception as e:
        logger.error(f"Chat completion failed: {e}")
        raise