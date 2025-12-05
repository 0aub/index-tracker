"""
Knowledge Center item schemas for request/response validation
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class KnowledgeItemBase(BaseModel):
    """Base knowledge item schema"""
    title: str
    description: Optional[str] = None
    content_type: str  # youtube, pdf, pptx
    display_order: int = 0


class KnowledgeItemCreate(KnowledgeItemBase):
    """Create knowledge item schema"""
    content_url: Optional[str] = None  # For YouTube links
    index_id: str


class KnowledgeItemUpdate(BaseModel):
    """Update knowledge item schema"""
    title: Optional[str] = None
    description: Optional[str] = None
    content_url: Optional[str] = None
    display_order: Optional[int] = None


class KnowledgeItemResponse(KnowledgeItemBase):
    """Knowledge item response schema"""
    id: str
    content_url: str
    thumbnail_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    index_id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None
    creator_name_en: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class KnowledgeItemListResponse(BaseModel):
    """List of knowledge items response"""
    items: List[KnowledgeItemResponse]
    total: int
