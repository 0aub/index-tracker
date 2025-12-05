"""
Support/Discussion router - manage support threads and replies
"""
import uuid
import os
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.database import get_db
from app.models.support import SupportThread, SupportReply, SupportAttachment
from app.models import User, UserRole, IndexUser, Index
from app.schemas.support import (
    SupportThreadCreate,
    SupportThreadUpdate,
    SupportThreadResponse,
    SupportThreadDetailResponse,
    SupportThreadListResponse,
    SupportReplyCreate,
    SupportReplyUpdate,
    SupportReplyResponse,
    SupportAttachmentResponse,
    UnreadSupportCountResponse
)
from app.api.dependencies import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support", tags=["support"])

# Upload directory for support attachments
SUPPORT_UPLOAD_DIR = "/app/uploads/support"


def can_access_support(user: User, index_id: str, db: Session) -> bool:
    """Check if user can access support for this index"""
    # System admins can access
    if user.role == UserRole.ADMIN:
        return True

    # Any user with access to the index can view
    index_role = db.query(IndexUser).filter(
        and_(
            IndexUser.user_id == user.id,
            IndexUser.index_id == index_id
        )
    ).first()

    return index_role is not None


def enrich_thread_response(thread: SupportThread, db: Session, include_replies: bool = False) -> dict:
    """Enrich thread with creator information and reply count"""
    thread_dict = {
        "id": thread.id,
        "title": thread.title,
        "content": thread.content,
        "index_id": thread.index_id,
        "created_by": thread.created_by,
        "created_at": thread.created_at,
        "updated_at": thread.updated_at,
        "is_resolved": thread.is_resolved,
        "replies_count": len(thread.replies) if thread.replies else 0,
        "attachments": [
            {
                "id": att.id,
                "file_name": att.file_name,
                "file_path": att.file_path,
                "file_size": att.file_size,
                "file_type": att.file_type,
                "thread_id": att.thread_id,
                "reply_id": att.reply_id,
                "created_by": att.created_by,
                "created_at": att.created_at
            }
            for att in thread.attachments if att.thread_id == thread.id
        ]
    }

    # Add creator info
    creator = db.query(User).filter(User.id == thread.created_by).first()
    if creator:
        thread_dict["creator_name"] = creator.full_name_ar
        thread_dict["creator_name_en"] = creator.full_name_en

    if include_replies:
        thread_dict["replies"] = []
        for reply in thread.replies:
            reply_dict = {
                "id": reply.id,
                "content": reply.content,
                "thread_id": reply.thread_id,
                "created_by": reply.created_by,
                "created_at": reply.created_at,
                "updated_at": reply.updated_at,
                "attachments": [
                    {
                        "id": att.id,
                        "file_name": att.file_name,
                        "file_path": att.file_path,
                        "file_size": att.file_size,
                        "file_type": att.file_type,
                        "thread_id": att.thread_id,
                        "reply_id": att.reply_id,
                        "created_by": att.created_by,
                        "created_at": att.created_at
                    }
                    for att in reply.attachments
                ]
            }
            reply_creator = db.query(User).filter(User.id == reply.created_by).first()
            if reply_creator:
                reply_dict["creator_name"] = reply_creator.full_name_ar
                reply_dict["creator_name_en"] = reply_creator.full_name_en
            thread_dict["replies"].append(reply_dict)

    return thread_dict


@router.get("", response_model=SupportThreadListResponse)
async def list_support_threads(
    index_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all support threads for an index"""
    # Verify index exists and is ETARI type
    index = db.query(Index).filter(Index.id == index_id).first()
    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    if index.index_type != 'ETARI':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Support is only available for ETARI indexes"
        )

    # Check permissions
    if not can_access_support(current_user, index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view support threads for this index"
        )

    # Get threads with pagination
    total = db.query(func.count(SupportThread.id)).filter(
        SupportThread.index_id == index_id
    ).scalar()

    threads = db.query(SupportThread).filter(
        SupportThread.index_id == index_id
    ).order_by(SupportThread.created_at.desc()).offset(skip).limit(limit).all()

    enriched_threads = [enrich_thread_response(t, db) for t in threads]

    return SupportThreadListResponse(
        threads=enriched_threads,
        total=total
    )


@router.post("", response_model=SupportThreadDetailResponse)
async def create_support_thread(
    index_id: str = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new support thread"""
    # Verify index exists and is ETARI type
    index = db.query(Index).filter(Index.id == index_id).first()
    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    if index.index_type != 'ETARI':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Support is only available for ETARI indexes"
        )

    # Check permissions
    if not can_access_support(current_user, index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create support threads for this index"
        )

    # Generate thread ID
    thread_id = f"st_{uuid.uuid4().hex[:12]}"

    # Create thread
    thread = SupportThread(
        id=thread_id,
        title=title,
        content=content,
        index_id=index_id,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        is_resolved=False
    )

    db.add(thread)

    # Handle file uploads
    if files:
        upload_dir = os.path.join(SUPPORT_UPLOAD_DIR, index_id, thread_id)
        os.makedirs(upload_dir, exist_ok=True)

        for file in files:
            if file.filename:
                att_id = f"sa_{uuid.uuid4().hex[:12]}"
                file_ext = os.path.splitext(file.filename)[1]
                saved_filename = f"{att_id}{file_ext}"
                file_path = os.path.join(upload_dir, saved_filename)

                try:
                    contents = await file.read()
                    with open(file_path, "wb") as f:
                        f.write(contents)

                    attachment = SupportAttachment(
                        id=att_id,
                        file_name=file.filename,
                        file_path=file_path,
                        file_size=len(contents),
                        file_type=file.content_type,
                        thread_id=thread_id,
                        created_by=current_user.id,
                        created_at=datetime.utcnow()
                    )
                    db.add(attachment)
                except Exception as e:
                    logger.error(f"Failed to save attachment: {e}")

    try:
        db.commit()
        db.refresh(thread)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create support thread: {str(e)}"
        )

    return enrich_thread_response(thread, db, include_replies=True)


@router.get("/{thread_id}", response_model=SupportThreadDetailResponse)
async def get_support_thread(
    thread_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a support thread with all replies"""
    thread = db.query(SupportThread).filter(SupportThread.id == thread_id).first()

    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support thread not found"
        )

    # Check permissions
    if not can_access_support(current_user, thread.index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this support thread"
        )

    return enrich_thread_response(thread, db, include_replies=True)


@router.patch("/{thread_id}", response_model=SupportThreadDetailResponse)
async def update_support_thread(
    thread_id: str,
    thread_data: SupportThreadUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a support thread"""
    thread = db.query(SupportThread).filter(SupportThread.id == thread_id).first()

    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support thread not found"
        )

    # Check permissions - only creator or admin can update
    if thread.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the thread creator or admin can update this thread"
        )

    # Update fields
    update_dict = thread_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(thread, field, value)

    thread.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(thread)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update support thread: {str(e)}"
        )

    return enrich_thread_response(thread, db, include_replies=True)


@router.delete("/{thread_id}")
async def delete_support_thread(
    thread_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a support thread"""
    thread = db.query(SupportThread).filter(SupportThread.id == thread_id).first()

    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support thread not found"
        )

    # Check permissions - only creator or admin can delete
    if thread.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the thread creator or admin can delete this thread"
        )

    # Delete attachments from filesystem
    upload_dir = os.path.join(SUPPORT_UPLOAD_DIR, thread.index_id, thread_id)
    if os.path.exists(upload_dir):
        import shutil
        try:
            shutil.rmtree(upload_dir)
        except Exception:
            pass

    db.delete(thread)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete support thread: {str(e)}"
        )

    return {"message": "Support thread deleted successfully"}


# Reply endpoints
@router.post("/{thread_id}/replies", response_model=SupportReplyResponse)
async def create_reply(
    thread_id: str,
    content: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a reply to a support thread"""
    thread = db.query(SupportThread).filter(SupportThread.id == thread_id).first()

    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support thread not found"
        )

    # Check permissions
    if not can_access_support(current_user, thread.index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to reply to this thread"
        )

    # Generate reply ID
    reply_id = f"sr_{uuid.uuid4().hex[:12]}"

    # Create reply
    reply = SupportReply(
        id=reply_id,
        content=content,
        thread_id=thread_id,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(reply)

    # Update thread's updated_at
    thread.updated_at = datetime.utcnow()

    # Handle file uploads
    attachments_data = []
    if files:
        upload_dir = os.path.join(SUPPORT_UPLOAD_DIR, thread.index_id, thread_id, "replies")
        os.makedirs(upload_dir, exist_ok=True)

        for file in files:
            if file.filename:
                att_id = f"sa_{uuid.uuid4().hex[:12]}"
                file_ext = os.path.splitext(file.filename)[1]
                saved_filename = f"{att_id}{file_ext}"
                file_path = os.path.join(upload_dir, saved_filename)

                try:
                    contents = await file.read()
                    with open(file_path, "wb") as f:
                        f.write(contents)

                    attachment = SupportAttachment(
                        id=att_id,
                        file_name=file.filename,
                        file_path=file_path,
                        file_size=len(contents),
                        file_type=file.content_type,
                        reply_id=reply_id,
                        created_by=current_user.id,
                        created_at=datetime.utcnow()
                    )
                    db.add(attachment)
                    attachments_data.append({
                        "id": att_id,
                        "file_name": file.filename,
                        "file_path": file_path,
                        "file_size": len(contents),
                        "file_type": file.content_type,
                        "thread_id": None,
                        "reply_id": reply_id,
                        "created_by": current_user.id,
                        "created_at": datetime.utcnow()
                    })
                except Exception as e:
                    logger.error(f"Failed to save attachment: {e}")

    try:
        db.commit()
        db.refresh(reply)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create reply: {str(e)}"
        )

    # Build response
    response = {
        "id": reply.id,
        "content": reply.content,
        "thread_id": reply.thread_id,
        "created_by": reply.created_by,
        "created_at": reply.created_at,
        "updated_at": reply.updated_at,
        "creator_name": current_user.full_name_ar,
        "creator_name_en": current_user.full_name_en,
        "attachments": attachments_data
    }

    return response


@router.delete("/{thread_id}/replies/{reply_id}")
async def delete_reply(
    thread_id: str,
    reply_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a reply"""
    reply = db.query(SupportReply).filter(
        and_(SupportReply.id == reply_id, SupportReply.thread_id == thread_id)
    ).first()

    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )

    # Check permissions - only creator or admin can delete
    if reply.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the reply creator or admin can delete this reply"
        )

    # Delete attachment files
    for att in reply.attachments:
        if os.path.exists(att.file_path):
            try:
                os.remove(att.file_path)
            except Exception:
                pass

    db.delete(reply)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete reply: {str(e)}"
        )

    return {"message": "Reply deleted successfully"}


# Attachment download
@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download a support attachment"""
    attachment = db.query(SupportAttachment).filter(SupportAttachment.id == attachment_id).first()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    # Get index_id from thread or reply
    if attachment.thread_id:
        thread = db.query(SupportThread).filter(SupportThread.id == attachment.thread_id).first()
        index_id = thread.index_id if thread else None
    elif attachment.reply_id:
        reply = db.query(SupportReply).filter(SupportReply.id == attachment.reply_id).first()
        if reply:
            thread = db.query(SupportThread).filter(SupportThread.id == reply.thread_id).first()
            index_id = thread.index_id if thread else None
        else:
            index_id = None
    else:
        index_id = None

    if not index_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated thread not found"
        )

    # Check permissions
    if not can_access_support(current_user, index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to download this attachment"
        )

    # Check if file exists
    if not os.path.exists(attachment.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.file_name,
        media_type=attachment.file_type or "application/octet-stream"
    )


# Unread count for notification ring
@router.get("/unread-count", response_model=UnreadSupportCountResponse)
async def get_unread_support_count(
    index_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get count of support threads created in the last 24 hours"""
    # Check permissions
    if not can_access_support(current_user, index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this index"
        )

    # Count threads created in the last 24 hours
    from datetime import timedelta
    cutoff_time = datetime.utcnow() - timedelta(hours=24)

    count = db.query(func.count(SupportThread.id)).filter(
        and_(
            SupportThread.index_id == index_id,
            SupportThread.created_at >= cutoff_time
        )
    ).scalar()

    return UnreadSupportCountResponse(count=count or 0)
