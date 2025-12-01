"""
Evidence model - represents evidence/documents uploaded for maturity levels
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Evidence(Base):
    """
    Evidence model - documents/files uploaded as proof for maturity level requirements
    """

    __tablename__ = "evidence"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # References
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=False, index=True)
    assignment_id = Column(String, ForeignKey("assignments.id"), nullable=True, index=True)
    maturity_level = Column(Integer, nullable=True)  # 0-5 for NAII, NULL for ETARI (requirement-level evidence)

    # Document Info
    document_name = Column(String, nullable=False)  # Base name without version
    current_version = Column(Integer, default=1, nullable=False)

    # Status: draft, submitted, confirmed, approved, rejected
    status = Column(String, nullable=False, default="draft")

    # Uploader
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    requirement = relationship("Requirement", back_populates="evidence")
    assignment = relationship("Assignment", back_populates="evidence")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    versions = relationship("EvidenceVersion", back_populates="evidence", cascade="all, delete-orphan")
    activities = relationship("EvidenceActivity", back_populates="evidence", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="evidence", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Evidence {self.document_name} - Level {self.maturity_level} ({self.status})>"


class EvidenceVersion(Base):
    """
    Evidence Version - tracks different versions of the same document
    """

    __tablename__ = "evidence_versions"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # References
    evidence_id = Column(String, ForeignKey("evidence.id"), nullable=False, index=True)

    # Version Info
    version_number = Column(Integer, nullable=False)
    filename = Column(String, nullable=False)  # Actual filename with extension
    file_path = Column(String, nullable=False)  # Path to file in storage
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String, nullable=True)

    # Version metadata
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    upload_comment = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    evidence = relationship("Evidence", back_populates="versions")
    uploader = relationship("User", foreign_keys=[uploaded_by])

    def __repr__(self):
        return f"<EvidenceVersion {self.filename} v{self.version_number}>"


class EvidenceActivity(Base):
    """
    Evidence Activity Log - tracks all actions on evidence documents
    """

    __tablename__ = "evidence_activities"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # References
    evidence_id = Column(String, ForeignKey("evidence.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=True)  # Which version this activity relates to

    # Activity Info
    # Action types: uploaded_draft, uploaded_version, submitted, confirmed, rejected, approved
    action = Column(String, nullable=False)
    actor_id = Column(String, ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=True)  # For rejection reasons, notes, etc.

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    evidence = relationship("Evidence", back_populates="activities")
    actor = relationship("User", foreign_keys=[actor_id])

    def __repr__(self):
        return f"<EvidenceActivity {self.action} by {self.actor_id}>"
