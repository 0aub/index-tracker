"""
Notification models for task and requirement notifications
"""
import enum
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class NotificationType(enum.Enum):
    """Types of notifications"""
    # Task notifications
    TASK_ASSIGNED = "task_assigned"
    TASK_STATUS_CHANGED = "task_status_changed"
    TASK_COMMENT_ADDED = "task_comment_added"
    TASK_COMPLETED = "task_completed"
    TASK_DEADLINE_APPROACHING = "task_deadline_approaching"
    TASK_OVERDUE = "task_overdue"

    # Requirement notifications
    REQUIREMENT_ASSIGNED = "requirement_assigned"
    REQUIREMENT_STATUS_CHANGED = "requirement_status_changed"
    EVIDENCE_UPLOADED = "evidence_uploaded"
    EVIDENCE_STATUS_CHANGED = "evidence_status_changed"
    REQUIREMENT_COMMENT_ADDED = "requirement_comment_added"


class Notification(Base):
    """Notification model"""
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)

    # Recipient
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Notification details
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)

    # Related entities (nullable - depends on notification type)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=True)
    evidence_id = Column(String, ForeignKey("evidence.id"), nullable=True)

    # Actor (who caused this notification)
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)

    # Status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, nullable=False, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id])
    task = relationship("Task", back_populates="notifications")
    requirement = relationship("Requirement", back_populates="notifications")
    evidence = relationship("Evidence", back_populates="notifications")
