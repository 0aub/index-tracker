"""
Department model - Third level of organizational hierarchy (الإدارة)
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Department(Base):
    """Department model - Third level of organizational hierarchy"""

    __tablename__ = "departments"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Foreign Keys
    general_management_id = Column(String, ForeignKey("general_managements.id"), nullable=False, index=True)

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
    general_management = relationship("GeneralManagement", back_populates="departments")
    users = relationship("User", back_populates="department")

    def __repr__(self):
        return f"<Department {self.code} - {self.name_ar}>"
