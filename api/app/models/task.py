"""
Task management models
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum as SQLEnum, Integer
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class TaskStatus(str, enum.Enum):
    """Task status"""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskPriority(str, enum.Enum):
    """Task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Task(Base):
    """Task model for task management system"""

    __tablename__ = "tasks"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Task Details (single language - Arabic)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Status and Priority
    status = Column(SQLEnum(TaskStatus), nullable=False, default=TaskStatus.TODO, index=True)
    priority = Column(SQLEnum(TaskPriority), nullable=False, default=TaskPriority.MEDIUM, index=True)

    # Optional Index and Requirement Association
    index_id = Column(String, ForeignKey("indices.id"), nullable=True, index=True)
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=True, index=True)

    # Creator and Timestamps
    created_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Due Date
    due_date = Column(DateTime, nullable=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="created_tasks")
    index = relationship("Index", foreign_keys=[index_id], backref="tasks")
    requirement = relationship("Requirement", foreign_keys=[requirement_id], backref="tasks")
    assignments = relationship("TaskAssignment", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan", order_by="TaskComment.created_at.desc()")
    notifications = relationship("Notification", back_populates="task", cascade="all, delete-orphan")


class TaskAssignment(Base):
    """Task assignment to users"""

    __tablename__ = "task_assignments"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    assigned_by = Column(String, ForeignKey("users.id"), nullable=False)

    # Timestamps
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    task = relationship("Task", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id], backref="task_assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])


class TaskComment(Base):
    """Comments on tasks"""

    __tablename__ = "task_comments"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Comment Content (single language - Arabic)
    comment = Column(Text, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", foreign_keys=[user_id], backref="task_comments")
    attachments = relationship("TaskAttachment", back_populates="comment", cascade="all, delete-orphan")


class TaskAttachment(Base):
    """File attachments for task comments"""

    __tablename__ = "task_attachments"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    comment_id = Column(String, ForeignKey("task_comments.id"), nullable=False, index=True)

    # File Details
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_type = Column(String, nullable=False)  # MIME type

    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    comment = relationship("TaskComment", back_populates="attachments")
