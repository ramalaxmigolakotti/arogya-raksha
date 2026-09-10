"""
cloudinary_service.py — Cloudinary upload/delete helpers.
Mirrors services/cloudinaryService.js.
"""
import hashlib
import hmac
import time
from typing import Optional

import cloudinary
import cloudinary.uploader
from core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

_configured = bool(
    settings.CLOUDINARY_CLOUD_NAME
    and settings.CLOUDINARY_API_KEY
    and settings.CLOUDINARY_API_SECRET
)

if not _configured:
    print("❌ Missing Cloudinary credentials — media uploads will fail!")
else:
    print(f"☁️  Cloudinary configured for cloud: {settings.CLOUDINARY_CLOUD_NAME}")


def upload_to_cloudinary(
    file_data: str,
    folder: str = "arogya-raksha",
    resource_type: str = "auto",
    public_id: Optional[str] = None,
) -> dict:
    """
    Upload a base64 data URI or file path to Cloudinary.
    Returns { url, public_id, resource_type, format }.
    """
    if not _configured:
        raise RuntimeError("Cloudinary not configured. Missing credentials.")
    result = cloudinary.uploader.upload(
        file_data,
        folder=folder,
        resource_type=resource_type,
        **({"public_id": public_id} if public_id else {}),
    )
    return {
        "url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "resource_type": result.get("resource_type"),
        "format": result.get("format"),
        "bytes": result.get("bytes"),
        "width": result.get("width"),
        "height": result.get("height"),
    }


def delete_from_cloudinary(public_id: str, resource_type: str = "image") -> dict:
    """Delete a Cloudinary asset by public_id."""
    if not _configured:
        return {"result": "not_configured"}
    result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    return result


def generate_upload_signature(folder: str = "arogya-raksha") -> dict:
    """Generate a signed upload preset for direct browser → Cloudinary uploads."""
    if not _configured:
        raise RuntimeError("Cloudinary not configured.")
    timestamp = int(time.time())
    params = f"folder={folder}&timestamp={timestamp}"
    signature = hmac.new(
        settings.CLOUDINARY_API_SECRET.encode(),
        params.encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloudName": settings.CLOUDINARY_CLOUD_NAME,
        "apiKey": settings.CLOUDINARY_API_KEY,
        "folder": folder,
    }
