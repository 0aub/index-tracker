"""
Recommendation model - represents evaluator recommendations for requirements
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Recommendation(Base):
    """
    Recommendation model - evaluator feedback/recommendations for requirements
    One recommendation per requirement per index
    """

    __tablename__ = "recommendations"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # References
    requirement_id = Column(String, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    index_id = Column(String, ForeignKey("indices.id", ondelete="CASCADE"), nullable=False, index=True)

    # Recommendation content
    current_status_ar = Column(Text, nullable=True)  # الوضع الراهن (Current Status)
    current_status_en = Column(Text, nullable=True)
    recommendation_ar = Column(Text, nullable=False)
    recommendation_en = Column(Text, nullable=True)

    # Status tracking
    status = Column(String(20), default="pending", nullable=False)  # pending, addressed, in_progress
    addressed_comment = Column(Text, nullable=True)  # User's comment when marking as addressed
    addressed_by = Column(String, ForeignKey("users.id"), nullable=True)
    addressed_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    requirement = relationship("Requirement", back_populates="recommendations")
    index = relationship("Index", back_populates="recommendations")
    addressed_by_user = relationship("User", foreign_keys=[addressed_by])

    def __repr__(self):
        return f"<Recommendation for {self.requirement_id} ({self.status})>"
