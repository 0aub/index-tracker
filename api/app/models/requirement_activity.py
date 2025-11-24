"""
Requirement Activity model - tracks all activities on requirements
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship

from app.database import Base


class RequirementActivity(Base):
    """
    Requirement Activity Log - tracks all actions on requirements

    Activity types include:
    - answer_saved: User saved answer as draft
    - answer_submitted: User submitted answer for review
    - answer_approved: Reviewer approved the answer
    - answer_rejected: Reviewer rejected the answer
    - answer_changes_requested: Reviewer requested changes
    - answer_modified: User modified answer after rejection
    - evidence_uploaded: Evidence document uploaded (for ETARI)
    - evidence_approved: Evidence approved
    - evidence_rejected: Evidence rejected
    - comment_added: Comment added to requirement
    - assignment_created: User assigned to requirement
    - assignment_removed: User unassigned from requirement
    """

    __tablename__ = "requirement_activities"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # References
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=False, index=True)
    maturity_level = Column(Integer, nullable=True)  # For NAII activities (0-5), NULL for ETARI

    # Activity Info
    action_type = Column(String(50), nullable=False, index=True)
    actor_id = Column(String, ForeignKey("users.id"), nullable=False)

    # Activity Details
    description_ar = Column(Text, nullable=True)  # Human-readable description in Arabic
    description_en = Column(Text, nullable=True)  # Human-readable description in English
    comment = Column(Text, nullable=True)  # Additional comment (e.g., reviewer feedback)

    # Additional data (JSON-serializable additional info)
    extra_data = Column(Text, nullable=True)  # Store additional data as JSON string if needed

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    requirement = relationship("Requirement", back_populates="activities")
    actor = relationship("User", foreign_keys=[actor_id])

    def __repr__(self):
        return f"<RequirementActivity {self.action_type} by {self.actor_id}>"
