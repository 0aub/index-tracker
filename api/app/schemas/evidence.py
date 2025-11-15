"""
Evidence Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ===== Evidence Schemas =====

class EvidenceBase(BaseModel):
    requirement_id: str
    maturity_level: int = Field(..., ge=0, le=5)
    document_name: str


class EvidenceCreate(EvidenceBase):
    assignment_id: Optional[str] = None
    uploaded_by: str


class EvidenceUpdate(BaseModel):
    status: Optional[str] = None  # draft, submitted, confirmed, approved, rejected
    document_name: Optional[str] = None


class EvidenceResponse(EvidenceBase):
    id: str
    assignment_id: Optional[str] = None
    current_version: int
    status: str
    uploaded_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== Evidence Version Schemas =====

class EvidenceVersionBase(BaseModel):
    filename: str
    upload_comment: Optional[str] = None


class EvidenceVersionCreate(EvidenceVersionBase):
    evidence_id: str
    version_number: int
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    uploaded_by: str


class EvidenceVersionResponse(EvidenceVersionBase):
    id: str
    evidence_id: str
    version_number: int
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    uploaded_by: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ===== Evidence Activity Schemas =====

class EvidenceActivityBase(BaseModel):
    action: str  # uploaded_draft, uploaded_version, submitted, confirmed, rejected, approved
    comment: Optional[str] = None


class EvidenceActivityCreate(EvidenceActivityBase):
    evidence_id: str
    version_number: Optional[int] = None
    actor_id: str


class EvidenceActivityResponse(EvidenceActivityBase):
    id: str
    evidence_id: str
    version_number: Optional[int] = None
    actor_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Combined Schemas for Frontend =====

class EvidenceWithVersions(EvidenceResponse):
    """Evidence with all its versions"""
    versions: List[EvidenceVersionResponse] = []
    activities: List[EvidenceActivityResponse] = []

    class Config:
        from_attributes = True


class EvidenceUploadRequest(BaseModel):
    """Schema for file upload request"""
    requirement_id: str
    assignment_id: Optional[str] = None
    maturity_level: int = Field(..., ge=0, le=5)
    document_name: str
    upload_comment: Optional[str] = None


class EvidenceActionRequest(BaseModel):
    """Schema for status actions (submit, confirm, approve, reject)"""
    action: str = Field(..., pattern="^(submit|confirm|approve|reject)$")
    comment: Optional[str] = None
