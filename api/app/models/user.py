"""
User model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    """User roles in the system"""
    ADMIN = "admin"
    INDEX_MANAGER = "index_manager"
    SECTION_COORDINATOR = "section_coordinator"
    CONTRIBUTOR = "contributor"


class User(Base):
    """User model"""

    __tablename__ = "users"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Basic Info
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)

    # Name Fields (split for first-time setup)
    first_name_ar = Column(String, nullable=True)
    last_name_ar = Column(String, nullable=True)
    first_name_en = Column(String, nullable=True)
    last_name_en = Column(String, nullable=True)
    full_name_ar = Column(String, nullable=False)
    full_name_en = Column(String, nullable=True)

    # Authentication
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_first_login = Column(Boolean, default=True, nullable=False)
    temp_password = Column(String, nullable=True)  # Store temporarily for email
    password_changed_at = Column(DateTime, nullable=True)

    # Role & Organization
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CONTRIBUTOR)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)

    # Organizational Hierarchy
    agency_id = Column(String, ForeignKey("agencies.id"), nullable=True, index=True)
    general_management_id = Column(String, ForeignKey("general_managements.id"), nullable=True, index=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=True, index=True)

    # Additional Info (kept for backward compatibility)
    department_ar = Column(String, nullable=True)
    department_en = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    agency = relationship("Agency", back_populates="users")
    general_management = relationship("GeneralManagement", back_populates="users")
    department = relationship("Department", back_populates="users")
    assignments = relationship("Assignment", back_populates="user", cascade="all, delete-orphan")
    evidence_submissions = relationship("EvidenceSubmission", back_populates="submitted_by_user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    index_memberships = relationship("IndexUser", foreign_keys="[IndexUser.user_id]", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"
