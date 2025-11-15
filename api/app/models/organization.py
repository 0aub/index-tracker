"""
Organization model
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Organization(Base):
    """Organization/Entity model"""

    __tablename__ = "organizations"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Basic Info
    code = Column(String, unique=True, nullable=False, index=True)
    name_ar = Column(String, nullable=False)
    name_en = Column(String, nullable=True)

    # Additional Info
    sector_ar = Column(String, nullable=True)
    sector_en = Column(String, nullable=True)
    description_ar = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    website = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    indices = relationship("Index", back_populates="organization", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Organization {self.code} - {self.name_ar}>"
