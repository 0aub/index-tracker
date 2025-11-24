"""
Recommendation schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RecommendationBase(BaseModel):
    """Base recommendation schema"""
    current_status_ar: Optional[str] = None
    current_status_en: Optional[str] = None
    recommendation_ar: str
    recommendation_en: Optional[str] = None


class RecommendationCreate(RecommendationBase):
    """Create recommendation schema"""
    requirement_id: str
    index_id: str


class RecommendationUpdate(BaseModel):
    """Update recommendation schema"""
    current_status_ar: Optional[str] = None
    current_status_en: Optional[str] = None
    recommendation_ar: Optional[str] = None
    recommendation_en: Optional[str] = None
    status: Optional[str] = None  # pending, addressed, in_progress
    addressed_comment: Optional[str] = None


class RecommendationResponse(RecommendationBase):
    """Recommendation response schema"""
    id: str
    requirement_id: str
    index_id: str
    status: str
    addressed_comment: Optional[str] = None
    addressed_by: Optional[str] = None
    addressed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendationUploadResult(BaseModel):
    """Result of recommendations upload"""
    total_rows: int
    matched: int
    unmatched: int
    created: int
    updated: int
    matched_requirements: list[dict]
    unmatched_rows: list[dict]
