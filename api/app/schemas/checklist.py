"""
Pydantic schemas for Checklist API
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChecklistItemBase(BaseModel):
    text_ar: str
    text_en: Optional[str] = None


class ChecklistItemCreate(ChecklistItemBase):
    """Schema for creating a new checklist item"""
    pass


class ChecklistItemUpdate(BaseModel):
    """Schema for updating a checklist item"""
    text_ar: Optional[str] = None
    text_en: Optional[str] = None
    is_checked: Optional[bool] = None
    display_order: Optional[int] = None


class ChecklistItemResponse(ChecklistItemBase):
    """Schema for checklist item response"""
    id: str
    requirement_id: str
    is_checked: bool
    checked_by: Optional[str] = None
    checked_at: Optional[datetime] = None
    display_order: int
    created_by: str
    created_at: datetime
    updated_by: Optional[str] = None
    updated_at: datetime

    # User details for display
    created_by_name: Optional[str] = None
    checked_by_name: Optional[str] = None

    class Config:
        from_attributes = True
