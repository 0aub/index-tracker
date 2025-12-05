"""
Knowledge Center item models
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum as SQLEnum, Integer
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class KnowledgeItemType(str, enum.Enum):
    """Knowledge item content type"""
    YOUTUBE = "youtube"
    PDF = "pdf"
    PPTX = "pptx"


class KnowledgeItem(Base):
    """Knowledge Center item model"""

    __tablename__ = "knowledge_items"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Item Details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Content Type and URL/Path
    content_type = Column(SQLEnum(KnowledgeItemType), nullable=False, index=True)

    # For YouTube: the video URL
    # For PDF/PPTX: the file path
    content_url = Column(String, nullable=False)

    # Thumbnail/preview image path (for PDF first page, PPTX first slide)
    thumbnail_path = Column(String, nullable=True)

    # File details (for PDF/PPTX)
    file_name = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)  # Size in bytes

    # Index Association (for ETARI indexes)
    index_id = Column(String, ForeignKey("indices.id"), nullable=False, index=True)

    # Creator and Timestamps
    created_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Display order
    display_order = Column(Integer, default=0, nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="knowledge_items")
    index = relationship("Index", foreign_keys=[index_id], backref="knowledge_items")
