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


# Schema for creating index via Excel upload
class IndexCreateFromExcel(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name_ar: str = Field(..., min_length=3, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    version: str = Field(default="1.0", max_length=20)
    organization_id: str


# Schema for updating index
class IndexUpdate(BaseModel):
    name_ar: Optional[str] = Field(None, min_length=3, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    status: Optional[IndexStatus] = None


# Schema for index response
class IndexResponse(IndexBase):
    id: str
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

    class Config:
        from_attributes = True


# Minimal index info for lists
class IndexMinimal(BaseModel):
    id: str
    code: str
    name_ar: str
    name_en: Optional[str] = None
    status: IndexStatus
    total_requirements: int
    total_areas: int
    total_evidence: int = 0
    created_at: datetime

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
    approved_documents: int
    assigned_requirements: int
    rejected_documents: int
    total_uploads: int
    total_comments: int

    class Config:
        from_attributes = True


# Schema for index user engagement statistics response
class IndexUserEngagementResponse(BaseModel):
    index_id: str
    user_statistics: list[UserEngagementStats]
