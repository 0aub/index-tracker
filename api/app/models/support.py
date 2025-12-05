"""
Support/Discussion models for knowledge sharing
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class SupportThread(Base):
    """Support thread - a question/discussion topic"""

    __tablename__ = "support_threads"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Thread Details
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)

    # Index Association (for ETARI indexes)
    index_id = Column(String, ForeignKey("indices.id"), nullable=False, index=True)

    # Creator and Timestamps
    created_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Status
    is_resolved = Column(Boolean, default=False, nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="support_threads")
    index = relationship("Index", foreign_keys=[index_id], backref="support_threads")
    replies = relationship("SupportReply", back_populates="thread", cascade="all, delete-orphan", order_by="SupportReply.created_at")
    attachments = relationship("SupportAttachment", back_populates="thread", cascade="all, delete-orphan")


class SupportReply(Base):
    """Reply to a support thread"""

    __tablename__ = "support_replies"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Reply Content
    content = Column(Text, nullable=False)

    # Thread Association
    thread_id = Column(String, ForeignKey("support_threads.id", ondelete="CASCADE"), nullable=False, index=True)

    # Creator and Timestamps
    created_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    thread = relationship("SupportThread", back_populates="replies")
    creator = relationship("User", foreign_keys=[created_by], backref="support_replies")
    attachments = relationship("SupportAttachment", back_populates="reply", cascade="all, delete-orphan")


class SupportAttachment(Base):
    """Attachment for support threads or replies"""

    __tablename__ = "support_attachments"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # File Details
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    file_type = Column(String(100), nullable=True)  # MIME type

    # Association - either thread or reply (not both)
    thread_id = Column(String, ForeignKey("support_threads.id", ondelete="CASCADE"), nullable=True, index=True)
    reply_id = Column(String, ForeignKey("support_replies.id", ondelete="CASCADE"), nullable=True, index=True)

    # Creator and Timestamps
    created_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    thread = relationship("SupportThread", back_populates="attachments")
    reply = relationship("SupportReply", back_populates="attachments")
    creator = relationship("User", foreign_keys=[created_by])
