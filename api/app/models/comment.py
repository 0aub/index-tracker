"""
Comment model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Comment(Base):
    """
    Comment model - represents comments on requirements or evidence submissions
    """

    __tablename__ = "comments"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Comment Content
    content = Column(Text, nullable=False)

    # Author
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # References (nullable - comment can be on requirement OR evidence)
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=True, index=True)
    evidence_submission_id = Column(String, ForeignKey("evidence_submissions.id"), nullable=True, index=True)

    # Threading (for replies)
    parent_comment_id = Column(String, ForeignKey("comments.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="comments")
    requirement = relationship("Requirement", back_populates="comments")
    evidence_submission = relationship("EvidenceSubmission", back_populates="comments")

    # Self-referential for threaded comments
    replies = relationship("Comment", backref="parent", remote_side=[id])

    def __repr__(self):
        return f"<Comment {self.id} by {self.user_id}>"
