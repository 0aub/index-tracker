"""
IndexUser model - Associates users with specific indices
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class IndexUserRole(str, enum.Enum):
    """User role within a specific index"""
    OWNER = "owner"  # Index owner/manager
    SUPERVISOR = "supervisor"  # Can review and approve
    CONTRIBUTOR = "contributor"  # Can submit evidence


class IndexUser(Base):
    """
    IndexUser - Many-to-many relationship between Index and User
    Represents a user's access and role within a specific index
    """

    __tablename__ = "index_users"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    index_id = Column(String, ForeignKey("indices.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Role within this index
    role = Column(SQLEnum(IndexUserRole), nullable=False, default=IndexUserRole.CONTRIBUTOR)

    # Who added this user to the index
    added_by = Column(String, ForeignKey("users.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    index = relationship("Index", back_populates="index_users")
    user = relationship("User", foreign_keys=[user_id], back_populates="index_memberships")
    added_by_user = relationship("User", foreign_keys=[added_by])

    # Constraints - user can only be added once per index
    __table_args__ = (
        UniqueConstraint('index_id', 'user_id', name='uq_index_user'),
    )

    def __repr__(self):
        return f"<IndexUser {self.user_id} in {self.index_id} ({self.role})>"
