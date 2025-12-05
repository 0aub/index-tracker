"""
Index Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.index import IndexStatus


# Base schema
class IndexBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name_ar: str = Field(..., min_length=3, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    version: str = Field(default="1.0", max_length=20)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# Schema for creating index via Excel upload
class IndexCreateFromExcel(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name_ar: str = Field(..., min_length=3, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    version: str = Field(default="1.0", max_length=20)
    organization_id: str


# Schema for creating an empty index (without Excel)
class IndexCreateEmpty(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    index_type: str = Field(..., description="Type of index: NAII, ETARI, etc.")
    name_ar: str = Field(..., min_length=3, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    version: str = Field(default="1.0", max_length=20)
    organization_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# Schema for updating index
class IndexUpdate(BaseModel):
    name_ar: Optional[str] = Field(None, min_length=3, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    status: Optional[IndexStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# Schema for index response
class IndexResponse(IndexBase):
    id: str
    index_type: str  # NAII, ETARI, etc.
    status: IndexStatus
    organization_id: str
    total_requirements: int
    total_areas: int
    total_evidence: int = 0
    excel_filename: Optional[str] = None
    excel_upload_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    # Versioning and completion fields
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    previous_index_id: Optional[str] = None
    # User's role in this specific index (from index_users table)
    user_role: Optional[str] = None  # OWNER, SUPERVISOR, CONTRIBUTOR

    class Config:
        from_attributes = True


# Minimal index info for lists
class IndexMinimal(BaseModel):
    id: str
    code: str
    index_type: str  # NAII, ETARI, etc.
    name_ar: str
    name_en: Optional[str] = None
    status: IndexStatus
    total_requirements: int
    total_areas: int
    total_evidence: int = 0
    created_at: datetime
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    # Versioning and completion fields
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    previous_index_id: Optional[str] = None
    # User's role in this specific index
    user_role: Optional[str] = None  # OWNER, SUPERVISOR, CONTRIBUTOR (from index_users table)

    class Config:
        from_attributes = True


# Schema for index statistics
class IndexStatistics(BaseModel):
    total_requirements: int
    total_maturity_levels: int
    total_evidence_requirements: int
    total_acceptance_criteria: int
    total_unique_areas: int
    expected_levels_per_requirement: int


# Schema for user engagement statistics
class UserEngagementStats(BaseModel):
    user_id: str
    username: str
    full_name_ar: Optional[str] = None
    full_name_en: Optional[str] = None
    user_role: Optional[str] = None  # System role (ADMIN, INDEX_MANAGER, etc.)
    index_role: Optional[str] = None  # Index role (OWNER, SUPERVISOR, CONTRIBUTOR)
    approved_documents: int
    assigned_requirements: int
    rejected_documents: int
    total_uploads: int
    total_comments: int
    documents_reviewed: int = 0  # Documents this user reviewed (approved/rejected)
    review_comments: int = 0  # Comments made while reviewing others' documents
    # New fields for detailed tracking
    draft_documents: int = 0  # Documents saved as drafts
    submitted_documents: int = 0  # Documents submitted for review
    confirmed_documents: int = 0  # Documents confirmed by owner
    checklist_items_completed: int = 0  # Checklist items marked as done

    class Config:
        from_attributes = True


# Schema for index user engagement statistics response
class IndexUserEngagementResponse(BaseModel):
    index_id: str
    user_statistics: list[UserEngagementStats]
