"""
Section Mapping schemas for request/response validation
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SectionMappingBase(BaseModel):
    """Base section mapping schema"""
    main_area_from_ar: str
    main_area_to_ar: str
    main_area_from_en: Optional[str] = None
    main_area_to_en: Optional[str] = None
    element_from_ar: Optional[str] = None
    element_to_ar: Optional[str] = None
    element_from_en: Optional[str] = None
    element_to_en: Optional[str] = None
    sub_domain_from_ar: Optional[str] = None
    sub_domain_to_ar: Optional[str] = None
    sub_domain_from_en: Optional[str] = None
    sub_domain_to_en: Optional[str] = None


class SectionMappingCreate(SectionMappingBase):
    """Create section mapping schema"""
    pass


class SectionMappingUpdate(BaseModel):
    """Update section mapping schema"""
    main_area_to_ar: Optional[str] = None
    main_area_to_en: Optional[str] = None
    element_to_ar: Optional[str] = None
    element_to_en: Optional[str] = None
    sub_domain_to_ar: Optional[str] = None
    sub_domain_to_en: Optional[str] = None


class SectionMappingResponse(SectionMappingBase):
    """Section mapping response schema"""
    id: str
    current_index_id: str
    previous_index_id: str
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)


class BulkSectionMappingCreate(BaseModel):
    """Bulk create section mappings"""
    previous_index_id: str
    mappings: List[SectionMappingCreate]


class SectionMappingListResponse(BaseModel):
    """List of section mappings response"""
    mappings: List[SectionMappingResponse]
    current_index_id: str
    previous_index_id: str
    current_index_name_ar: Optional[str] = None
    previous_index_name_ar: Optional[str] = None


class SectionComparisonItem(BaseModel):
    """A single section with its current and previous values for comparison"""
    level: str  # 'main_area', 'element', 'sub_domain'
    previous_value_ar: Optional[str] = None
    previous_value_en: Optional[str] = None
    current_value_ar: Optional[str] = None
    current_value_en: Optional[str] = None
    is_mapped: bool = False
    mapping_id: Optional[str] = None
    # Parent context for nested items
    parent_main_area_ar: Optional[str] = None
    parent_element_ar: Optional[str] = None


class SectionComparisonResponse(BaseModel):
    """Response for comparing sections between two indices"""
    current_index_id: str
    previous_index_id: str
    current_index_name_ar: str
    previous_index_name_ar: str
    comparisons: List[SectionComparisonItem]


class ApplyMappingsRequest(BaseModel):
    """Request to apply section mappings to requirements"""
    previous_index_id: str
    update_requirements: bool = False  # If true, update requirement fields


class ApplyMappingsResponse(BaseModel):
    """Response after applying section mappings"""
    success: bool
    requirements_updated: int = 0
    message: str
