"""
User Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


# Base schema with common fields
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name_ar: str = Field(..., min_length=2, max_length=200)
    full_name_en: Optional[str] = Field(None, max_length=200)
    role: UserRole
    organization_id: str
    department_ar: Optional[str] = Field(None, max_length=200)
    department_en: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)


# Schema for creating a user
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)


# Schema for updating a user
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name_ar: Optional[str] = Field(None, min_length=2, max_length=200)
    full_name_en: Optional[str] = Field(None, max_length=200)
    department_ar: Optional[str] = Field(None, max_length=200)
    department_en: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


# Schema for user response
class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# Schema for user login
class UserLogin(BaseModel):
    username: str
    password: str


# Schema for token response
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Schema for token data
class TokenData(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None


# Minimal user info for lists
class UserMinimal(BaseModel):
    id: str
    username: str
    full_name_ar: str
    full_name_en: Optional[str] = None
    role: UserRole
    department_ar: Optional[str] = None

    class Config:
        from_attributes = True
