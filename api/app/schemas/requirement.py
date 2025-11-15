"""
Requirement Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Evidence Requirement schemas
class EvidenceRequirementResponse(BaseModel):
    id: str
    evidence_ar: str
    evidence_en: Optional[str] = None
    display_order: int
    is_mandatory: bool

    class Config:
        from_attributes = True


# Acceptance Criteria schemas
class AcceptanceCriteriaResponse(BaseModel):
    id: str
    criteria_ar: str
    criteria_en: Optional[str] = None
    display_order: int
    is_mandatory: bool

    class Config:
        from_attributes = True


# Maturity Level schemas
class MaturityLevelResponse(BaseModel):
    id: str
    level: int
    level_name_ar: str
    level_name_en: Optional[str] = None
    readiness_ar: Optional[str] = None
    readiness_en: Optional[str] = None
    score: Optional[float] = None
    evidence_requirements: List[EvidenceRequirementResponse] = []
    acceptance_criteria: List[AcceptanceCriteriaResponse] = []

    class Config:
        from_attributes = True


# Requirement base schema
class RequirementBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    question_ar: str = Field(..., min_length=5)
    question_en: Optional[str] = None
    main_area_ar: str = Field(..., min_length=2, max_length=200)
    main_area_en: Optional[str] = Field(None, max_length=200)
    sub_domain_ar: str = Field(..., min_length=2, max_length=200)
    sub_domain_en: Optional[str] = Field(None, max_length=200)


# Requirement response with full details
class RequirementResponse(RequirementBase):
    id: str
    index_id: str
    display_order: int
    maturity_levels: List[MaturityLevelResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Minimal requirement info for lists
class RequirementMinimal(BaseModel):
    id: str
    code: str
    question_ar: str
    question_en: Optional[str] = None
    main_area_ar: str
    sub_domain_ar: str

    class Config:
        from_attributes = True


# Schema for requirement update
class RequirementUpdate(BaseModel):
    question_ar: Optional[str] = Field(None, min_length=5)
    question_en: Optional[str] = None
    main_area_ar: Optional[str] = Field(None, min_length=2, max_length=200)
    main_area_en: Optional[str] = Field(None, max_length=200)
    sub_domain_ar: Optional[str] = Field(None, min_length=2, max_length=200)
    sub_domain_en: Optional[str] = Field(None, max_length=200)
