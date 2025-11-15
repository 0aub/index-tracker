"""
Assignment model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class AssignmentStatus(str, enum.Enum):
    """Assignment status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REVIEW = "review"


class Assignment(Base):
    """
    Assignment model - represents assignment of a user to a requirement in an index
    """

    __tablename__ = "assignments"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # References
    index_id = Column(String, ForeignKey("indices.id"), nullable=False, index=True)
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Assignment Info
    assigned_by = Column(String, nullable=True)  # User ID who made the assignment
    status = Column(SQLEnum(AssignmentStatus), nullable=False, default=AssignmentStatus.PENDING)

    # Progress Tracking
    current_level = Column(String, nullable=True)  # Current maturity level being worked on
    completion_percentage = Column(String, nullable=True)  # e.g., "3/6" or "50%"

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    index = relationship("Index", back_populates="assignments")
    requirement = relationship("Requirement", back_populates="assignments")
    user = relationship("User", back_populates="assignments")
    evidence = relationship("Evidence", back_populates="assignment")

    # Constraints - prevent duplicate assignments
    __table_args__ = (
        UniqueConstraint('index_id', 'requirement_id', 'user_id', name='uq_assignment'),
    )

    def __repr__(self):
        return f"<Assignment {self.user_id} -> {self.requirement_id} ({self.status})>"
