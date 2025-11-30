"""
Schemas for organizational hierarchy (Agency, GeneralManagement, Department)
"""
from __future__ import annotations

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


# ===== Agency Schemas =====

class AgencyBase(BaseModel):
    """Base schema for Agency"""
    code: str = Field(..., description="Unique code for the agency")
    name_ar: str = Field(..., description="Arabic name")
    name_en: Optional[str] = Field(None, description="English name")
    display_order: int = Field(0, description="Display order")
    is_active: bool = Field(True, description="Active status")


class AgencyCreate(AgencyBase):
    """Schema for creating an agency"""
    pass


class AgencyUpdate(BaseModel):
    """Schema for updating an agency"""
    code: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class AgencyResponse(AgencyBase):
    """Schema for agency response"""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== General Management Schemas =====

class GeneralManagementBase(BaseModel):
    """Base schema for General Management"""
    agency_id: str = Field(..., description="Parent agency ID")
    code: str = Field(..., description="Unique code")
    name_ar: str = Field(..., description="Arabic name")
    name_en: Optional[str] = Field(None, description="English name")
    display_order: int = Field(0, description="Display order")
    is_active: bool = Field(True, description="Active status")


class GeneralManagementCreate(GeneralManagementBase):
    """Schema for creating a general management"""
    pass


class GeneralManagementUpdate(BaseModel):
    """Schema for updating a general management"""
    agency_id: Optional[str] = None
    code: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class GeneralManagementResponse(GeneralManagementBase):
    """Schema for general management response"""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== Department Schemas =====

class DepartmentBase(BaseModel):
    """Base schema for Department"""
    general_management_id: str = Field(..., description="Parent general management ID")
    code: str = Field(..., description="Unique code")
    name_ar: str = Field(..., description="Arabic name")
    name_en: Optional[str] = Field(None, description="English name")
    display_order: int = Field(0, description="Display order")
    is_active: bool = Field(True, description="Active status")


class DepartmentCreate(DepartmentBase):
    """Schema for creating a department"""
    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating a department"""
    general_management_id: Optional[str] = None
    code: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    """Schema for department response"""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== Schemas with Children (defined after base schemas) =====

class GeneralManagementWithChildren(GeneralManagementResponse):
    """Schema for general management with departments"""
    departments: List[DepartmentResponse] = []

    class Config:
        from_attributes = True


class AgencyWithChildren(AgencyResponse):
    """Schema for agency with general managements (including their departments)"""
    general_managements: List[GeneralManagementWithChildren] = []

    class Config:
        from_attributes = True


# ===== Complete Hierarchy =====

class OrganizationalHierarchy(BaseModel):
    """Complete organizational hierarchy"""
    agencies: List[AgencyWithChildren]

    class Config:
        from_attributes = True
