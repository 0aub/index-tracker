"""
Notification Pydantic schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    """Base notification schema"""
    type: str
    title: str
    message: str
    task_id: Optional[str] = None
    requirement_id: Optional[str] = None
    evidence_id: Optional[str] = None


class NotificationResponse(NotificationBase):
    """Notification response schema"""
    id: str
    user_id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_name_en: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    """List of notifications with pagination"""
    notifications: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationMarkRead(BaseModel):
    """Mark notification(s) as read"""
    notification_ids: list[str]


class NotificationUnreadCount(BaseModel):
    """Unread notification count"""
    count: int
