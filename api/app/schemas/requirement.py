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
    code: str = Field(..., min_length=1, max_length=50)
    question_ar: str = Field(..., min_length=5)
    question_en: Optional[str] = None
    main_area_ar: str = Field(..., min_length=2, max_length=200)
    main_area_en: Optional[str] = Field(None, max_length=200)
    sub_domain_ar: str = Field(..., min_length=0, max_length=200)  # Allow empty for some indices
    sub_domain_en: Optional[str] = Field(None, max_length=200)

    # ETARI-specific fields (optional for NAII)
    element_ar: Optional[str] = Field(None, max_length=200)
    element_en: Optional[str] = Field(None, max_length=200)
    objective_ar: Optional[str] = None
    objective_en: Optional[str] = None
    evidence_description_ar: Optional[str] = None
    evidence_description_en: Optional[str] = None

    # Evidence requirement flag
    requires_evidence: bool = True


# Requirement response with full details
class RequirementResponse(RequirementBase):
    id: str
    index_id: str
    display_order: int
    maturity_levels: List[MaturityLevelResponse] = []

    # ETARI Answer fields
    answer_ar: Optional[str] = None
    answer_en: Optional[str] = None
    answer_status: Optional[str] = None  # draft, pending_review, approved, rejected
    answered_by: Optional[str] = None
    answered_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    reviewer_comment_ar: Optional[str] = None
    reviewer_comment_en: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Minimal requirement info for lists
class RequirementMinimal(BaseModel):
    id: str
    code: str
    display_order: int
    question_ar: str
    question_en: Optional[str] = None
    main_area_ar: str
    sub_domain_ar: str
    element_ar: Optional[str] = None
    objective_ar: Optional[str] = None
    # Evidence description fields for attachment icon
    evidence_description_ar: Optional[str] = None
    evidence_description_en: Optional[str] = None
    # Evidence requirement flag
    requires_evidence: bool = True
    # ETARI Answer fields for list view
    answer_status: Optional[str] = None
    # Evidence count for attachment indicator
    evidence_count: int = 0
    # Recommendations count for indicator
    recommendations_count: int = 0

    class Config:
        from_attributes = True


# Schema for requirement creation
class RequirementCreate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)  # Optional - auto-generated if not provided
    question_ar: str = Field(..., min_length=5)
    question_en: Optional[str] = None
    main_area_ar: str = Field(..., min_length=2, max_length=200)
    main_area_en: Optional[str] = Field(None, max_length=200)
    element_ar: Optional[str] = Field(None, max_length=200)
    element_en: Optional[str] = Field(None, max_length=200)
    objective_ar: Optional[str] = None
    objective_en: Optional[str] = None
    evidence_description_ar: Optional[str] = None
    evidence_description_en: Optional[str] = None
    requires_evidence: bool = True
    display_order: Optional[int] = None  # Optional - auto-calculated if not provided


# Schema for requirement update
class RequirementUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    question_ar: Optional[str] = Field(None, min_length=5)
    question_en: Optional[str] = None
    main_area_ar: Optional[str] = Field(None, min_length=2, max_length=200)
    main_area_en: Optional[str] = Field(None, max_length=200)
    sub_domain_ar: Optional[str] = Field(None, min_length=0, max_length=200)  # Allow empty
    sub_domain_en: Optional[str] = Field(None, max_length=200)
    element_ar: Optional[str] = Field(None, max_length=200)
    element_en: Optional[str] = Field(None, max_length=200)
    objective_ar: Optional[str] = None
    objective_en: Optional[str] = None
    evidence_description_ar: Optional[str] = None
    evidence_description_en: Optional[str] = None
    requires_evidence: Optional[bool] = None
    display_order: Optional[int] = None


# Schema for saving ETARI answer
class AnswerSave(BaseModel):
    answer_ar: str = Field(..., min_length=1)
    answer_en: Optional[str] = None


# Schema for submitting answer for review
class AnswerSubmitForReview(BaseModel):
    pass  # No additional fields needed, just changes status


# Schema for reviewing answer
class AnswerReview(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|request_changes)$")  # approve, reject, or request_changes
    reviewer_comment_ar: Optional[str] = None
    reviewer_comment_en: Optional[str] = None


# Schema for requirement activity response
class RequirementActivityResponse(BaseModel):
    id: str
    requirement_id: str
    maturity_level: Optional[int] = None
    action_type: str
    actor_id: str
    actor_name: Optional[str] = None  # Will be populated from User relationship
    actor_name_en: Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Schema for previous evidence (simplified view)
class PreviousEvidenceResponse(BaseModel):
    id: str
    document_name: str
    status: str
    current_version: int
    mime_type: Optional[str] = None  # MIME type of the current version
    created_at: datetime

    class Config:
        from_attributes = True


# Schema for previous recommendation
class PreviousRecommendationResponse(BaseModel):
    id: str
    current_status_ar: Optional[str] = None  # الوضع الراهن
    current_status_en: Optional[str] = None
    recommendation_ar: str
    recommendation_en: Optional[str] = None
    status: str
    addressed_comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Schema for previous year's data
class PreviousRequirementData(BaseModel):
    """Data from the previous year's matching requirement"""
    # Previous requirement info
    previous_requirement_id: str
    previous_index_id: str
    previous_index_name_ar: str
    previous_index_name_en: Optional[str] = None

    # Previous answer
    answer_ar: Optional[str] = None
    answer_en: Optional[str] = None
    answer_status: Optional[str] = None
    answered_at: Optional[datetime] = None

    # Previous evidence list
    evidence: List[PreviousEvidenceResponse] = []

    # Previous recommendation (if any)
    recommendation: Optional[PreviousRecommendationResponse] = None

    class Config:
        from_attributes = True


# Schema for a single requirement in a المعيار group (for unmatched case)
class StandardGroupRequirement(BaseModel):
    """A single requirement from the previous year's standard/criteria group"""
    code: str
    question_ar: str
    question_en: Optional[str] = None
    answer_ar: Optional[str] = None
    answer_en: Optional[str] = None
    answer_status: Optional[str] = None
    evidence: List[PreviousEvidenceResponse] = []

    class Config:
        from_attributes = True


# Schema for المعيار group data (for unmatched requirements)
class StandardGroupData(BaseModel):
    """Data from all requirements in the same المعيار for unmatched case"""
    sub_domain_ar: str
    sub_domain_en: Optional[str] = None
    # Single recommendation for the entire group (shown once)
    recommendation: Optional[PreviousRecommendationResponse] = None
    # All requirements in this المعيار group with their answers and evidence
    requirements: List[StandardGroupRequirement] = []

    class Config:
        from_attributes = True


# Main response schema for previous year context endpoint
class PreviousYearContextResponse(BaseModel):
    """Response containing previous year context for a requirement"""
    # Whether a matching requirement was found
    matched: bool

    # Previous index information (always present)
    previous_index_code: str
    previous_index_name_ar: str
    previous_index_name_en: Optional[str] = None

    # Case 1: Matched requirement (matched = true)
    matched_requirement: Optional[StandardGroupRequirement] = None
    matched_recommendation: Optional[PreviousRecommendationResponse] = None

    # Case 2: No match - المعيار group data (matched = false)
    standard_group: Optional[StandardGroupData] = None

    class Config:
        from_attributes = True

