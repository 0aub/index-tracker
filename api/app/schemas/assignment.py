"""
Assignment Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.assignment import AssignmentStatus


# Base schema
class AssignmentBase(BaseModel):
    index_id: str
    requirement_id: str
    user_id: str


# Schema for creating assignment
class AssignmentCreate(AssignmentBase):
    assigned_by: Optional[str] = None


# Schema for batch creating assignments
class AssignmentBatchCreate(BaseModel):
    index_id: str
    requirement_id: str
    user_ids: List[str] = Field(..., min_items=1)
    assigned_by: Optional[str] = None


# Schema for updating assignment
class AssignmentUpdate(BaseModel):
    status: Optional[AssignmentStatus] = None
    current_level: Optional[str] = None
    completion_percentage: Optional[str] = None


# Schema for assignment response
class AssignmentResponse(AssignmentBase):
    id: str
    assigned_by: Optional[str] = None
    status: AssignmentStatus
    current_level: Optional[str] = None
    completion_percentage: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Schema with user details
class AssignmentWithUser(BaseModel):
    id: str
    index_id: str
    requirement_id: str
    user_id: str
    user_name_ar: str
    user_name_en: Optional[str] = None
    user_role: Optional[str] = None  # Nullable - only ADMIN has a system role
    user_department_ar: Optional[str] = None
    status: AssignmentStatus
    current_level: Optional[str] = None
    completion_percentage: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
