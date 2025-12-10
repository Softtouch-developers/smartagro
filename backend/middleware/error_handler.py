"""
Global error handling middleware
"""
from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class ErrorCode:
    """Standard error codes"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_SERVER_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"


def setup_error_handlers(app):
    """Setup global error handlers"""
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handle HTTP exceptions"""
        request_id = str(uuid.uuid4())
        
        # Handle different detail formats - ensure it's always serializable
        try:
            if isinstance(exc.detail, dict):
                detail = exc.detail
            elif isinstance(exc.detail, str):
                detail = {"message": exc.detail}
            else:
                # Convert non-serializable objects to string
                detail = {"message": str(exc.detail)}
        except Exception as e:
            # Fallback if detail can't be converted
            logger.error(f"Error processing HTTPException detail: {e}")
            detail = {"message": "An error occurred"}
        
        logger.warning(f"HTTP error [{request_id}]: {detail}")
        
        # Ensure all values in detail are JSON serializable
        serializable_detail = {}
        for key, value in detail.items():
            try:
                # Test if value is JSON serializable
                import json
                json.dumps(value)
                serializable_detail[key] = value
            except (TypeError, ValueError):
                serializable_detail[key] = str(value)
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": serializable_detail,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle Pydantic validation errors"""
        request_id = str(uuid.uuid4())
        
        logger.warning(f"Validation error [{request_id}]: {exc.errors()}")
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": ErrorCode.VALIDATION_ERROR,
                    "message": "Validation error",
                    "details": exc.errors()
                },
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    @app.exception_handler(SQLAlchemyError)
    async def database_exception_handler(request: Request, exc: SQLAlchemyError):
        """Handle database errors"""
        request_id = str(uuid.uuid4())
        
        logger.error(f"Database error [{request_id}]: {str(exc)}", exc_info=True)
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": ErrorCode.DATABASE_ERROR,
                    "message": "Database operation failed"
                },
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle all other exceptions"""
        request_id = str(uuid.uuid4())
        
        logger.error(f"Unhandled error [{request_id}]: {str(exc)}", exc_info=True)
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": ErrorCode.INTERNAL_ERROR,
                    "message": "An internal error occurred"
                },
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )