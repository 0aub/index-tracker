"""
Agency model - Organizational hierarchy top level (وكالة)
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.orm import relationship

from app.database import Base


class Agency(Base):
    """Agency model - Top level of organizational hierarchy"""

    __tablename__ = "agencies"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

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
    general_managements = relationship("GeneralManagement", back_populates="agency", cascade="all, delete-orphan")
    users = relationship("User", back_populates="agency")

    def __repr__(self):
        return f"<Agency {self.code} - {self.name_ar}>"
