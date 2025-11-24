"""
General Management model - Second level of organizational hierarchy (الإدارة العامة)
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class GeneralManagement(Base):
    """General Management model - Second level of organizational hierarchy"""

    __tablename__ = "general_managements"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    agency_id = Column(String, ForeignKey("agencies.id"), nullable=False, index=True)

    # Basic Info
    code = Column(String, unique=True, nullable=False, index=True)
    name_ar = Column(String, nullable=False)
    name_en = Column(String, nullable=True)

    # Display Order
    display_order = Column(Integer, default=0, nullable=False)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    agency = relationship("Agency", back_populates="general_managements")
    departments = relationship("Department", back_populates="general_management", cascade="all, delete-orphan")
    users = relationship("User", back_populates="general_management")

    def __repr__(self):
        return f"<GeneralManagement {self.code} - {self.name_ar}>"
