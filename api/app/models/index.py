"""
Index model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class IndexStatus(str, enum.Enum):
    """Index status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"  # Soft delete status


class Index(Base):
    """Index model - represents a complete assessment index"""

    __tablename__ = "indices"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Basic Info
    code = Column(String, unique=True, nullable=False, index=True)
    name_ar = Column(String, nullable=False)
    name_en = Column(String, nullable=True)

    # Metadata
    description_ar = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    version = Column(String, nullable=False, default="1.0")
    status = Column(SQLEnum(IndexStatus), nullable=False, default=IndexStatus.NOT_STARTED)

    # Organization
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)

    # Statistics (denormalized for performance)
    total_requirements = Column(Integer, default=0, nullable=False)
    total_areas = Column(Integer, default=0, nullable=False)

    # Excel Source
    excel_filename = Column(String, nullable=True)  # Original uploaded file name
    excel_upload_date = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)

    # Index Timeline
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="indices")
    requirements = relationship("Requirement", back_populates="index", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="index", cascade="all, delete-orphan")
    index_users = relationship("IndexUser", back_populates="index", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Index {self.code} - {self.name_ar}>"
