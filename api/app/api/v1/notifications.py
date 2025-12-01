"""
Notifications router - manage user notifications
"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.database import get_db
from app.models import Notification, User, NotificationType
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationMarkRead,
    NotificationUnreadCount
)
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


def enrich_notification(notification: Notification, db: Session) -> dict:
    """Enrich notification with actor information"""
    notif_dict = {
        "id": notification.id,
        "user_id": notification.user_id,
        "type": notification.type.value,
        "title": notification.title,
        "message": notification.message,
        "task_id": notification.task_id,
        "requirement_id": notification.requirement_id,
        "evidence_id": notification.evidence_id,
        "actor_id": notification.actor_id,
        "is_read": notification.is_read,
        "read_at": notification.read_at,
        "created_at": notification.created_at,
    }

    # Add actor info if exists
    if notification.actor_id:
        actor = db.query(User).filter(User.id == notification.actor_id).first()
        if actor:
            notif_dict["actor_name"] = actor.full_name_ar
            notif_dict["actor_name_en"] = actor.full_name_en

    return notif_dict


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user notifications with optional filters"""

    # Base query - only user's notifications
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    # Apply filters
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    if notification_type:
        try:
            notif_type = NotificationType(notification_type)
            query = query.filter(Notification.type == notif_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid notification type: {notification_type}"
            )

    # Get total count
    total = query.count()

    # Get unread count
    unread_count = db.query(Notification).filter(
        and_(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    ).count()

    # Get notifications ordered by newest first
    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

    # Enrich notifications
    enriched = [enrich_notification(n, db) for n in notifications]

    return {
        "notifications": enriched,
        "total": total,
        "unread_count": unread_count
    }


@router.get("/unread-count", response_model=NotificationUnreadCount)
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""

    count = db.query(Notification).filter(
        and_(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    ).count()

    return {"count": count}


@router.post("/mark-read")
async def mark_notifications_read(
    data: NotificationMarkRead,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark notifications as read"""

    # Get notifications
    notifications = db.query(Notification).filter(
        and_(
            Notification.id.in_(data.notification_ids),
            Notification.user_id == current_user.id  # Security: only mark user's own notifications
        )
    ).all()

    if not notifications:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No notifications found"
        )

    # Mark as read
    now = datetime.utcnow()
    for notification in notifications:
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = now

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notifications as read: {str(e)}"
        )

    return {
        "message": f"Marked {len(notifications)} notification(s) as read",
        "count": len(notifications)
    }


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark all user's notifications as read"""

    # Get all unread notifications
    notifications = db.query(Notification).filter(
        and_(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    ).all()

    if not notifications:
        return {
            "message": "No unread notifications",
            "count": 0
        }

    # Mark as read
    now = datetime.utcnow()
    for notification in notifications:
        notification.is_read = True
        notification.read_at = now

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark all notifications as read: {str(e)}"
        )

    return {
        "message": f"Marked all {len(notifications)} notification(s) as read",
        "count": len(notifications)
    }


@router.post("/mark-unread")
async def mark_notifications_unread(
    data: NotificationMarkRead,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark notifications as unread"""

    # Get notifications
    notifications = db.query(Notification).filter(
        and_(
            Notification.id.in_(data.notification_ids),
            Notification.user_id == current_user.id  # Security: only mark user's own notifications
        )
    ).all()

    if not notifications:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No notifications found"
        )

    # Mark as unread
    for notification in notifications:
        if notification.is_read:
            notification.is_read = False
            notification.read_at = None

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notifications as unread: {str(e)}"
        )

    return {
        "message": f"Marked {len(notifications)} notification(s) as unread",
        "count": len(notifications)
    }


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""

    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id  # Security: only delete user's own notifications
        )
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    db.delete(notification)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete notification: {str(e)}"
        )

    return {"message": "Notification deleted successfully"}


# Helper function to create notifications (used by other endpoints)
def create_notification(
    db: Session,
    user_id: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    actor_id: Optional[str] = None,
    task_id: Optional[str] = None,
    requirement_id: Optional[str] = None,
    evidence_id: Optional[str] = None
) -> Notification:
    """Helper function to create a notification"""

    notification = Notification(
        id=f"notif_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        actor_id=actor_id,
        task_id=task_id,
        requirement_id=requirement_id,
        evidence_id=evidence_id,
        is_read=False,
        created_at=datetime.utcnow()
    )

    db.add(notification)

    return notification
