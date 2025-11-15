"""
IndexUser Pydantic schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ===== IndexUser Schemas =====

class IndexUserBase(BaseModel):
    index_id: str
    user_id: str
    role: str  # owner, supervisor, contributor


class IndexUserCreate(IndexUserBase):
    added_by: Optional[str] = None


class IndexUserUpdate(BaseModel):
    role: Optional[str] = None  # owner, supervisor, contributor


class IndexUserResponse(IndexUserBase):
    id: str
    added_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== With Related Data =====

class IndexUserWithDetails(IndexUserResponse):
    """IndexUser with user details"""
    user_username: Optional[str] = None
    user_full_name_ar: Optional[str] = None
    user_full_name_en: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True
