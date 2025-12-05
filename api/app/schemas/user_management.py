"""
Schemas for user management and authentication
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


# User Creation
class UserCreateRequest(BaseModel):
    """Request to create a new user - only email required, user completes rest during first-time setup"""
    email: EmailStr = Field(..., description="User email address")
    role: Optional[str] = Field(None, description="User role (optional, defaults to 'contributor' if not specified)")
    index_id: Optional[str] = Field(None, description="Index ID to assign user to (optional)")


class UserCreateResponse(BaseModel):
    """Response after creating a user"""
    id: str
    email: str
    temp_password: str
    is_active: bool
    message: str


# First-Time Setup
class CompleteSetupRequest(BaseModel):
    """Request to complete first-time user setup"""
    first_name_ar: str = Field(..., min_length=2, description="First name in Arabic")
    last_name_ar: str = Field(..., min_length=2, description="Last name in Arabic")
    first_name_en: str = Field(..., min_length=2, description="First name in English")
    last_name_en: str = Field(..., min_length=2, description="Last name in English")
    agency_id: str = Field(..., description="Agency ID")
    general_management_id: str = Field(..., description="General Management ID")
    department_id: str = Field(..., description="Department ID")
    new_password: str = Field(..., min_length=8, description="New password")


class CompleteSetupResponse(BaseModel):
    """Response after completing setup"""
    message: str
    user_id: str
    full_name_ar: str
    full_name_en: str


# Password Change
class ChangePasswordRequest(BaseModel):
    """Request to change password"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordResponse(BaseModel):
    """Response after changing password"""
    message: str


# User List with Index Roles
class UserIndexRole(BaseModel):
    """User's role in a specific index"""
    index_id: str
    index_code: str
    index_name_ar: str
    role: str
    assigned_at: datetime


class UserWithIndexRoles(BaseModel):
    """User with all their index roles"""
    id: str
    email: str
    full_name_ar: str
    full_name_en: Optional[str]
    first_name_ar: Optional[str]
    last_name_ar: Optional[str]
    first_name_en: Optional[str]
    last_name_en: Optional[str]
    role: Optional[str]  # System-wide role (nullable - only ADMIN has a system role)
    is_active: bool
    is_first_login: bool
    agency_id: Optional[str]
    agency_name_ar: Optional[str]
    general_management_id: Optional[str]
    gm_name_ar: Optional[str]
    department_id: Optional[str]
    dept_name_ar: Optional[str]
    last_login: Optional[datetime]
    created_at: datetime
    index_roles: list[UserIndexRole] = []

    class Config:
        from_attributes = True


# Reset Password
class ResetPasswordRequest(BaseModel):
    """Request to reset user password (admin only)"""
    user_id: str


class ResetPasswordResponse(BaseModel):
    """Response after resetting password"""
    message: str
    temp_password: str
    email_sent: bool


# Activate/Deactivate User
class UpdateUserStatusRequest(BaseModel):
    """Request to activate or deactivate a user"""
    user_id: str
    is_active: bool


class UpdateUserStatusResponse(BaseModel):
    """Response after updating user status"""
    message: str
    user_id: str
    is_active: bool


# Update User (Admin)
class UpdateUserRequest(BaseModel):
    """Request to update user details (admin only)"""
    user_id: str
    first_name_ar: Optional[str] = None
    last_name_ar: Optional[str] = None
    first_name_en: Optional[str] = None
    last_name_en: Optional[str] = None
    agency_id: Optional[str] = None
    general_management_id: Optional[str] = None
    department_id: Optional[str] = None


class UpdateUserResponse(BaseModel):
    """Response after updating user"""
    message: str
    user_id: str
    full_name_ar: str
    full_name_en: Optional[str]
