"""
Storage Routes
API endpoints for file uploads and management
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
import logging

from database import get_db
from models import User
from modules.auth.dependencies import get_current_verified_user
from modules.storage.service import StorageService
from modules.storage.schemas import (
    FileUploadResponse,
    MessageResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload/image", response_model=FileUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Upload an image file (for products, profiles, etc.)

    **Requires authentication**

    - Accepts: JPEG, PNG, WebP
    - Max size: 5MB (configured in settings)
    - Automatically optimized to 1200x1200, quality 85%
    - Stored in local filesystem or DO Spaces based on config

    Returns the file URL that can be used in product listings, profiles, etc.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only image files are allowed"
            )

        # Upload image
        file_url = await StorageService.upload_image(
            file=file,
            user_id=current_user.id
        )

        return FileUploadResponse(
            success=True,
            file_url=file_url,
            message="Image uploaded successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.post("/upload/voice", response_model=FileUploadResponse)
async def upload_voice_note(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Upload a voice note (for agent chat)

    **Requires authentication**

    - Accepts: MP3, WAV, M4A, OGG, WebM
    - Max size: 10MB (configured in settings)
    - Stored in local filesystem or DO Spaces based on config

    Returns the file URL for the voice note
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

        return FileUploadResponse(
            success=True,
            file_url=file_url,
            message="Voice note uploaded successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice upload error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload voice note: {str(e)}"
        )


@router.post("/upload/document", response_model=FileUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Upload a document or image (for dispute evidence, etc.)

    **Requires authentication**

    - Accepts: PDF, DOC, DOCX, TXT, JPEG, PNG, WebP
    - Max size: 20MB (configured in settings)
    - Images are automatically optimized
    - Stored in local filesystem or DO Spaces based on config

    Returns the file URL for the document/image
    """
    try:
        # Validate file type - support both documents and images
        document_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
        ]

        image_types = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ]

        allowed_types = document_types + image_types

        if not file.content_type or file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only documents (PDF, DOC, DOCX, TXT) and images (JPEG, PNG, WebP) are allowed"
            )

        # If it's an image, use image upload (with optimization)
        if file.content_type in image_types:
            file_url = await StorageService.upload_image(
                file=file,
                user_id=current_user.id
            )
        else:
            # For documents, use voice note upload (which handles generic files)
            file_url = await StorageService.upload_voice_note(
                file=file,
                user_id=current_user.id
            )

        return FileUploadResponse(
            success=True,
            file_url=file_url,
            message="Document uploaded successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.delete("/{file_path:path}", response_model=MessageResponse)
async def delete_file(
    file_path: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Delete a file from storage

    **Requires authentication**

    Only the file owner can delete their files.
    Admins can delete any file.

    Path parameter:
    - **file_path**: The file path to delete (e.g., "images/123_file.jpg")
    """
    try:
        # Extract user_id from file path to verify ownership
        # File paths are typically: images/{user_id}_{filename}
        # For voice notes: voice/{user_id}_{filename}

        path_parts = file_path.split("/")
        if len(path_parts) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path"
            )

        filename = path_parts[-1]

        # Extract user_id from filename (format: {user_id}_{timestamp}_{original_name})
        try:
            file_user_id = int(filename.split("_")[0])
        except (ValueError, IndexError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format"
            )

        # Check ownership (allow admins to delete any file)
        from models import UserType
        if file_user_id != current_user.id and current_user.user_type != UserType.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own files"
            )

        # Delete file
        success = await StorageService.delete_file(file_path)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )

        return MessageResponse(
            success=True,
            message="File deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File deletion error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        )
