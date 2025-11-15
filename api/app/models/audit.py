"""
Audit Log model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class AuditLog(Base):
    """
    Audit Log model - tracks all important actions in the system
    """

    __tablename__ = "audit_logs"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Action Details
    action = Column(String, nullable=False, index=True)  # e.g., "create_index", "upload_evidence"
    entity_type = Column(String, nullable=False, index=True)  # e.g., "index", "requirement", "user"
    entity_id = Column(String, nullable=True, index=True)  # ID of the affected entity

    # User who performed the action
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)

    # Additional Context
    description = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)  # Store additional JSON data

    # Request Info
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog {self.action} on {self.entity_type} by {self.user_id}>"
