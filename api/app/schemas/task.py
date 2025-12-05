"""
Task schemas for request/response validation
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TaskBase(BaseModel):
    """Base task schema"""
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # low, medium, high
    index_id: Optional[str] = None
    requirement_id: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    """Create task schema"""
    assignee_ids: List[str] = []  # List of user IDs to assign


class TaskUpdate(BaseModel):
    """Update task schema"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # todo, in_progress, completed
    priority: Optional[str] = None  # low, medium, high
    index_id: Optional[str] = None
    requirement_id: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskAssignmentResponse(BaseModel):
    """Task assignment response schema"""
    id: str
    task_id: str
    user_id: str
    assigned_by: str
    assigned_at: datetime
    user_name: Optional[str] = None
    user_name_en: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TaskAttachmentResponse(BaseModel):
    """Task attachment response schema"""
    id: str
    comment_id: str
    file_name: str
    file_path: str
    file_size: int
    file_type: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskCommentResponse(BaseModel):
    """Task comment response schema"""
    id: str
    task_id: str
    user_id: str
    comment: str
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None
    user_name_en: Optional[str] = None
    attachments: List[TaskAttachmentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TaskCommentCreate(BaseModel):
    """Create task comment schema"""
    comment: str


class TaskResponse(TaskBase):
    """Task response schema"""
    id: str
    status: str  # todo, in_progress, completed
    created_by: str
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    creator_name: Optional[str] = None
    creator_name_en: Optional[str] = None
    index_name: Optional[str] = None
    index_name_en: Optional[str] = None
    # Requirement details
    requirement_code: Optional[str] = None
    requirement_question_ar: Optional[str] = None
    requirement_question_en: Optional[str] = None
    requirement_main_area_ar: Optional[str] = None
    requirement_main_area_en: Optional[str] = None
    assignments: List[TaskAssignmentResponse] = []
    comments: List[TaskCommentResponse] = []
    comment_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    """List of tasks response"""
    tasks: List[TaskResponse]
    total: int
    todo_count: int
    in_progress_count: int
    completed_count: int
