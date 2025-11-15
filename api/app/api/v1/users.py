"""
Users API Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.models.index_user import IndexUser
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
def get_users(
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    index_id: Optional[str] = Query(None, description="Filter by index ID (users who are members of this index)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search in username, email, or names"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Get list of users with optional filters
    """
    query = db.query(User)

    # Filter by index_id (users who are members of a specific index)
    if index_id:
        query = query.join(IndexUser, User.id == IndexUser.user_id).filter(
            IndexUser.index_id == index_id
        )

    # Apply filters
    if organization_id:
        query = query.filter(User.organization_id == organization_id)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if role:
        query = query.filter(User.role == role)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term),
                User.full_name_ar.ilike(search_term),
                User.full_name_en.ilike(search_term)
            )
        )

    # Order by username
    query = query.order_by(User.username)

    # Apply pagination
    users = query.offset(skip).limit(limit).all()

    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific user by ID
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
