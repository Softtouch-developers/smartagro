"""
Rate limiting middleware using Redis
"""
from fastapi import Request, HTTPException
from database import get_redis
from config import settings
import time


def setup_rate_limiter(app):
    """Setup rate limiting middleware"""
    
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        """Rate limit requests per IP"""
        
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)
        
        # Skip rate limiting for health check
        if request.url.path == "/health":
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host
        
        # Create rate limit key
        key = f"rate_limit:{client_ip}"
        
        # Stricter rate limit for auth endpoints
        if request.url.path.startswith("/auth"):
            limit = settings.AUTH_RATE_LIMIT_PER_MINUTE
        else:
            limit = settings.RATE_LIMIT_PER_MINUTE
        
        # Check rate limit
        redis = get_redis()
        if not redis:
            return await call_next(request)
        
        try:
            current = redis.get(key)
            
            if current is None:
                # First request in this window
                redis.setex(key, 60, 1)
            elif int(current) >= limit:
                # Rate limit exceeded
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": f"Rate limit exceeded. Max {limit} requests per minute."
                        }
                    }
                )
            else:
                # Increment counter
                redis.incr(key)
        
        except HTTPException:
            raise
        except Exception as e:
            # Don't block requests if Redis fails
            pass
        
        response = await call_next(request)
        return response