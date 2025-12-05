"""
Checklist model for requirement checklists
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship

from app.database import Base


class ChecklistItem(Base):
    """
    ChecklistItem model - represents a checklist item for a requirement
    Any user assigned to the requirement can add, edit, delete, and check/uncheck items
    """

    __tablename__ = "checklist_items"

    # Primary Key
    id = Column(String, primary_key=True, index=True)

    # Requirement Reference
    requirement_id = Column(String, ForeignKey("requirements.id"), nullable=False, index=True)

    # Content
    text_ar = Column(Text, nullable=False)  # Checklist item text in Arabic
    text_en = Column(Text, nullable=True)   # Checklist item text in English

    # Status
    is_checked = Column(Boolean, default=False, nullable=False)
    checked_by = Column(String, ForeignKey("users.id"), nullable=True)
    checked_at = Column(DateTime, nullable=True)

    # Order
    display_order = Column(Integer, nullable=False, default=0)

    # Audit
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_by = Column(String, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    requirement = relationship("Requirement", back_populates="checklist_items")
    creator = relationship("User", foreign_keys=[created_by])
    checker = relationship("User", foreign_keys=[checked_by])
    updater = relationship("User", foreign_keys=[updated_by])

    def __repr__(self):
        return f"<ChecklistItem {self.id} - {self.text_ar[:30]}>"
