"""
Storage service - supports both local filesystem and DO Spaces
"""
from fastapi import UploadFile, HTTPException
from PIL import Image
from io import BytesIO
import os
import uuid
import boto3
from google.cloud import storage
from config import settings
import logging

logger = logging.getLogger(__name__)


class StorageService:
    """
    Unified storage service
    Automatically uses local filesystem or DO Spaces based on config
    """
    
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE
        
        if self.storage_type == "local":
            # Create uploads directory if it doesn't exist
            self.base_path = settings.LOCAL_STORAGE_PATH
            os.makedirs(self.base_path, exist_ok=True)
            os.makedirs(f"{self.base_path}/products", exist_ok=True)
            os.makedirs(f"{self.base_path}/chat", exist_ok=True)
            os.makedirs(f"{self.base_path}/voice", exist_ok=True)
            logger.info(f"✅ Using LOCAL storage: {self.base_path}")
        
        elif self.storage_type == "spaces":
            # Initialize DO Spaces client
            self.s3_client = boto3.client(
                's3',
                region_name=settings.SPACES_REGION,
                endpoint_url=settings.SPACES_ENDPOINT,
                aws_access_key_id=settings.SPACES_ACCESS_KEY,
                aws_secret_access_key=settings.SPACES_SECRET_KEY
            )
            self.bucket = settings.SPACES_BUCKET
            logger.info(f"✅ Using DO Spaces: {self.bucket}")

        elif self.storage_type == "gcs":
            # Initialize Google Cloud Storage client
            # Credentials are automatically picked up from environment (GOOGLE_APPLICATION_CREDENTIALS)
            # or metadata server if running on Cloud Run
            self.gcs_client = storage.Client()
            self.bucket_name = settings.GCS_BUCKET_NAME
            self.bucket = self.gcs_client.bucket(self.bucket_name)
            logger.info(f"✅ Using Google Cloud Storage: {self.bucket_name}")

        elif self.storage_type == "backblaze":
            # Initialize Backblaze B2 client (S3-compatible)
            self.b2_client = boto3.client(
                's3',
                endpoint_url=settings.BACKBLAZE_ENDPOINT,
                aws_access_key_id=settings.BACKBLAZE_KEY_ID,
                aws_secret_access_key=settings.BACKBLAZE_APP_KEY
            )
            self.b2_bucket = settings.BACKBLAZE_BUCKET_NAME
            self.b2_endpoint = settings.BACKBLAZE_ENDPOINT
            logger.info(f"✅ Using Backblaze B2: {self.b2_bucket}")

        else:
            raise ValueError(f"Invalid STORAGE_TYPE: {self.storage_type}")
    
    
    async def upload_image(
        self,
        file: UploadFile,
        folder: str = "products",
        optimize: bool = True
    ) -> str:
        """
        Upload image to storage
        
        Args:
            file: Uploaded file
            folder: Subfolder (products, chat, etc.)
            optimize: Whether to optimize image
            
        Returns:
            URL to access the image
        """
        # Validate file type
        if file.content_type not in ['image/jpeg', 'image/png', 'image/jpg']:
            raise HTTPException(400, "Invalid image type. Use JPEG or PNG.")
        
        # Read and optimize image
        contents = await file.read()
        
        if optimize:
            contents = self._optimize_image(contents)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.jpg"
        file_path = f"{folder}/{filename}"
        
        # Upload based on storage type
        if self.storage_type == "local":
            return self._save_local(contents, file_path)
        elif self.storage_type == "spaces":
            return self._save_spaces(contents, file_path)
        elif self.storage_type == "gcs":
            return self._save_gcs(contents, file_path, "image/jpeg")
        else:  # backblaze
            return self._save_backblaze(contents, file_path, "image/jpeg")
    
    
    def _optimize_image(self, image_bytes: bytes) -> bytes:
        """Optimize image (resize, compress)"""
        try:
            image = Image.open(BytesIO(image_bytes))
            
            # Resize if too large
            max_size = (1200, 1200)
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')
            
            # Save optimized
            output = BytesIO()
            image.save(output, format='JPEG', quality=85, optimize=True)
            output.seek(0)
            
            return output.read()
        
        except Exception as e:
            logger.error(f"Image optimization failed: {e}")
            return image_bytes  # Return original if optimization fails
    
    
    def _save_local(self, contents: bytes, file_path: str) -> str:
        """Save file to local filesystem"""
        full_path = os.path.join(self.base_path, file_path)
        
        # Create directory if needed
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Write file
        with open(full_path, 'wb') as f:
            f.write(contents)
        
        # Return URL (served by FastAPI static files)
        return f"/uploads/{file_path}"
    
    
    def _save_spaces(self, contents: bytes, file_path: str) -> str:
        """Save file to DO Spaces"""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=file_path,
                Body=contents,
                ACL='public-read',
                ContentType='image/jpeg',
                CacheControl='max-age=31536000'
            )
            
            # Return CDN URL
            cdn_url = settings.SPACES_CDN_URL or settings.SPACES_ENDPOINT
            return f"{cdn_url}/{file_path}"
        
        except Exception as e:
            logger.error(f"DO Spaces upload failed: {e}")
            raise HTTPException(500, "File upload failed")


    def _save_gcs(self, contents: bytes, file_path: str, content_type: str) -> str:
        """Save file to Google Cloud Storage"""
        try:
            blob = self.bucket.blob(file_path)
            blob.upload_from_string(
                contents,
                content_type=content_type
            )
            
            # Make public if needed, or rely on bucket policy
            blob.make_public()
            
            # Return public URL
            return blob.public_url

        except Exception as e:
            logger.error(f"GCS upload failed: {e}")
            raise HTTPException(500, "File upload failed")


    def _save_backblaze(self, contents: bytes, file_path: str, content_type: str) -> str:
        """Save file to Backblaze B2 (S3-compatible)"""
        try:
            self.b2_client.put_object(
                Bucket=self.b2_bucket,
                Key=file_path,
                Body=contents,
                ContentType=content_type,
                CacheControl='max-age=31536000'
            )

            # Return public URL
            # Backblaze B2 public URL format: https://f004.backblazeb2.com/file/{bucket-name}/{file-path}
            # Or using S3-compatible: https://{bucket}.s3.{region}.backblazeb2.com/{file-path}
            # Extract region from endpoint
            endpoint = self.b2_endpoint.replace("https://s3.", "").replace(".backblazeb2.com", "")
            return f"https://{self.b2_bucket}.s3.{endpoint}.backblazeb2.com/{file_path}"

        except Exception as e:
            logger.error(f"Backblaze B2 upload failed: {e}")
            raise HTTPException(500, "File upload failed")


    async def upload_voice_note(self, file: UploadFile) -> str:
        """Upload voice note"""
        if file.content_type not in ['audio/mpeg', 'audio/mp3', 'audio/wav']:
            raise HTTPException(400, "Invalid audio type")

        contents = await file.read()
        filename = f"{uuid.uuid4()}.mp3"
        file_path = f"voice/{filename}"

        if self.storage_type == "local":
            return self._save_local(contents, file_path)
        elif self.storage_type == "spaces":
            return self._save_spaces(contents, file_path)
        elif self.storage_type == "gcs":
            return self._save_gcs(contents, file_path, "audio/mpeg")
        else:  # backblaze
            return self._save_backblaze(contents, file_path, "audio/mpeg")


    async def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        folder: str = "uploads"
    ) -> dict:
        """
        Generic file upload method

        Args:
            file_bytes: File contents as bytes
            filename: Original filename
            content_type: MIME type
            folder: Destination folder

        Returns:
            Dict with url and metadata
        """
        # Generate unique filename preserving extension
        ext = os.path.splitext(filename)[1] or self._get_extension(content_type)
        unique_filename = f"{uuid.uuid4()}{ext}"
        file_path = f"{folder}/{unique_filename}"

        # Create folder if local storage
        if self.storage_type == "local":
            folder_path = os.path.join(self.base_path, folder)
            os.makedirs(folder_path, exist_ok=True)
            url = self._save_local(file_bytes, file_path)
        elif self.storage_type == "spaces":
            url = self._save_spaces_generic(file_bytes, file_path, content_type)
        elif self.storage_type == "gcs":
            url = self._save_gcs(file_bytes, file_path, content_type)
        else:  # backblaze
            url = self._save_backblaze(file_bytes, file_path, content_type)

        return {
            "url": url,
            "filename": unique_filename,
            "original_filename": filename,
            "content_type": content_type,
            "size": len(file_bytes),
            "folder": folder
        }


    def _get_extension(self, content_type: str) -> str:
        """Get file extension from content type"""
        extensions = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "audio/ogg": ".ogg",
            "audio/webm": ".webm",
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/quicktime": ".mov",
            "application/pdf": ".pdf",
            "text/plain": ".txt"
        }
        return extensions.get(content_type, "")


    def _save_spaces_generic(self, contents: bytes, file_path: str, content_type: str) -> str:
        """Save any file to DO Spaces with correct content type"""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=file_path,
                Body=contents,
                ACL='public-read',
                ContentType=content_type,
                CacheControl='max-age=31536000'
            )

            # Return CDN URL
            cdn_url = settings.SPACES_CDN_URL or settings.SPACES_ENDPOINT
            return f"{cdn_url}/{file_path}"

        except Exception as e:
            logger.error(f"DO Spaces upload failed: {e}")
            raise HTTPException(500, "File upload failed")
    
    
    def delete_file(self, file_url: str):
        """Delete file from storage"""
        if self.storage_type == "local":
            # Extract path from URL
            file_path = file_url.replace("/uploads/", "")
            full_path = os.path.join(self.base_path, file_path)
            
            if os.path.exists(full_path):
                os.remove(full_path)
        
        elif self.storage_type == "spaces":
            # Extract key from URL
            key = file_url.split('/')[-2:]  # Get last 2 parts (folder/filename)
            key = '/'.join(key)
            
            self.s3_client.delete_object(
                Bucket=self.bucket,
                Key=key
            )
            
        elif self.storage_type == "gcs":
            # Extract key from URL
            # URL format: https://storage.googleapis.com/bucket-name/folder/filename
            try:
                # Simple extraction assuming standard GCS URL structure
                parts = file_url.split('/')
                # Find where the bucket name is, the rest is the blob name
                # This is a bit brittle, better to store the path or use a robust parser
                # Assuming folder/filename is at the end
                blob_name = '/'.join(parts[-2:])

                blob = self.bucket.blob(blob_name)
                blob.delete()
            except Exception as e:
                logger.warning(f"Failed to delete GCS file {file_url}: {e}")

        elif self.storage_type == "backblaze":
            # Extract key from URL
            # URL format: https://{bucket}.s3.{region}.backblazeb2.com/{folder}/{filename}
            try:
                parts = file_url.split('/')
                # Get last 2 parts (folder/filename)
                key = '/'.join(parts[-2:])

                self.b2_client.delete_object(
                    Bucket=self.b2_bucket,
                    Key=key
                )
            except Exception as e:
                logger.warning(f"Failed to delete Backblaze file {file_url}: {e}")


# Singleton instance
storage_service = StorageService()