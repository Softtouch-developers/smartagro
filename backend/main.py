"""
SmartAgro Backend API
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os
from datetime import datetime

from config import settings, get_cors_origins, is_production
from database import init_databases, close_databases, get_db, get_mongo_db, get_redis
from middleware.error_handler import setup_error_handlers
from middleware.rate_limiter import setup_rate_limiter

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle:
    - Startup: Initialize databases, start background jobs
    - Shutdown: Close connections, cleanup
    """
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} in {settings.ENVIRONMENT} mode")
    
    try:
        # Initialize databases
        init_databases()
        
        # Start background jobs if enabled
        if settings.ENABLE_BACKGROUND_JOBS:
            from utils.background_jobs import start_scheduler
            start_scheduler()
            logger.info("✅ Background jobs started")
        
        # Seed database if flag is set (development only)
        if settings.SEED_DATABASE and not is_production():
            from seed_data import seed_all
            db = next(get_db())
            seed_all(db)
            logger.info("✅ Database seeded with test data")
        
        logger.info(f"✅ {settings.APP_NAME} started successfully")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}", exc_info=True)
        raise
    
    yield  # Application is running
    
    # Shutdown
    logger.info("🛑 Shutting down...")
    close_databases()
    logger.info("✅ Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Digital marketplace connecting Ghanaian farmers with buyers",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,  # Hide docs in production
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)


# ==================== MIDDLEWARE ====================

# CORS - Allow frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.STORAGE_TYPE == "local":
    upload_path = settings.LOCAL_STORAGE_PATH
    if os.path.exists(upload_path):
        app.mount("/uploads", StaticFiles(directory=upload_path), name="uploads")
        logger.info(f"✅ Serving static files from {upload_path}")


# Trusted Host - Prevent host header attacks in production
if is_production():
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["smartagro-backend.ondigitalocean.app", "*.ondigitalocean.app"]
    )

# Error handling middleware
setup_error_handlers(app)

# Rate limiting middleware
if settings.RATE_LIMIT_ENABLED:
    setup_rate_limiter(app)


# ==================== HEALTH CHECK ====================

@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint for monitoring and DO App Platform
    """
    try:
        # Check PostgreSQL
        db = next(get_db())
        db.execute("SELECT 1")
        postgres_healthy = True
    except Exception as e:
        logger.error(f"PostgreSQL health check failed: {e}")
        postgres_healthy = False
    
    try:
        # Check MongoDB
        mongo = get_mongo_db()
        mongo.command('ping')
        mongo_healthy = True
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        mongo_healthy = False
    
    try:
        # Check Redis
        redis = get_redis()
        redis.ping()
        redis_healthy = True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        redis_healthy = False
    
    all_healthy = postgres_healthy and mongo_healthy and redis_healthy
    
    return JSONResponse(
        status_code=200 if all_healthy else 503,
        content={
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "services": {
                "postgresql": "up" if postgres_healthy else "down",
                "mongodb": "up" if mongo_healthy else "down",
                "redis": "up" if redis_healthy else "down"
            }
        }
    )


@app.get("/", tags=["System"])
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": "1.0.0",
        "docs": "/docs" if settings.DEBUG else "Documentation disabled in production",
        "health": "/health"
    }


# ==================== IMPORT ROUTERS ====================

# Import all module routers
from modules.auth.routes import router as auth_router
from modules.users.routes import router as users_router
from modules.products.routes import router as products_router
from modules.orders.routes import router as orders_router
from modules.escrow.routes import router as escrow_router
from modules.chat.routes import router as chat_router
from modules.agent.routes import router as agent_router
from modules.notifications.routes import router as notifications_router
from modules.admin.routes import router as admin_router
from modules.storage.routes import router as storage_router
from modules.cart.routes import router as cart_router

# Webhook endpoint (special - no auth)
from integrations.paystack import router as paystack_webhook_router


# ==================== REGISTER ROUTERS ====================

# Public routes (prefixed with /api to avoid frontend conflict)
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(paystack_webhook_router, prefix="/api/webhooks", tags=["Webhooks"])

# API routes (versioned)
api_prefix = "/api/v1"

app.include_router(users_router, prefix=f"{api_prefix}/users", tags=["Users"])
app.include_router(products_router, prefix=f"{api_prefix}/products", tags=["Products"])
app.include_router(orders_router, prefix=f"{api_prefix}/orders", tags=["Orders"])
app.include_router(cart_router, prefix=f"{api_prefix}/cart", tags=["Cart"])
app.include_router(escrow_router, prefix=f"{api_prefix}/escrow", tags=["Escrow"])
app.include_router(chat_router, prefix=f"{api_prefix}/chat", tags=["Chat"])
app.include_router(agent_router, prefix=f"{api_prefix}/agent", tags=["AI Agent"])
app.include_router(notifications_router, prefix=f"{api_prefix}/notifications", tags=["Notifications"])
app.include_router(storage_router, prefix=f"{api_prefix}/storage", tags=["Storage"])
app.include_router(admin_router, prefix=f"{api_prefix}/admin", tags=["Admin"])


# ==================== STARTUP MESSAGE ====================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )