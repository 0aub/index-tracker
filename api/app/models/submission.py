"""
Evidence Submission model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class SubmissionStatus(str, enum.Enum):
    """Evidence submission status"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_NEEDED = "revision_needed"


class EvidenceSubmission(Base):
    """
    Evidence Submission model - represents evidence uploaded by a user for a requirement
    """

    __tablename__ = "evidence_submissions"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # References
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=False, index=True)
    submitted_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Submission Details
    title_ar = Column(String, nullable=False)
    title_en = Column(String, nullable=True)
    description_ar = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)

    # File Info
    file_path = Column(String, nullable=True)  # Path to uploaded file
    file_name = Column(String, nullable=True)  # Original filename
    file_size = Column(String, nullable=True)  # File size in bytes
    file_type = Column(String, nullable=True)  # MIME type

    # Status & Review
    status = Column(SQLEnum(SubmissionStatus), nullable=False, default=SubmissionStatus.DRAFT)
    reviewed_by = Column(String, nullable=True)  # User ID of reviewer
    review_notes = Column(Text, nullable=True)

    # Maturity Level Link
    target_level = Column(String, nullable=True)  # Which maturity level this evidence is for

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    requirement = relationship("Requirement", back_populates="evidence_submissions")
    submitted_by_user = relationship("User", back_populates="evidence_submissions")
    comments = relationship("Comment", back_populates="evidence_submission", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<EvidenceSubmission {self.id} by {self.submitted_by} ({self.status})>"
