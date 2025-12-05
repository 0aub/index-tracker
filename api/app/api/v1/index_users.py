"""
API endpoints for Index User operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from typing import List
import uuid

from app.database import get_db
from app.schemas.index_user import (
    IndexUserCreate,
    IndexUserUpdate,
    IndexUserResponse,
    IndexUserWithDetails
)
from app.models.index_user import IndexUser
from app.models.user import User, UserRole
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/index-users", tags=["Index Users"])


# ==== Get All Users from User's Indices ====

@router.get("/all-users", response_model=List[IndexUserWithDetails])
async def get_all_users_from_my_indices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all users from indices that the current user has access to.
    This endpoint is accessible to all authenticated users (not just admins).

    Returns unique users from all indices the current user is a member of.
    Admin users can see all users from all indices.
    """
    # Get indices the current user has access to
    if current_user.role == UserRole.ADMIN:
        # Admin can see all users from all indices
        query = db.query(
            IndexUser,
            User.username,
            User.full_name_ar,
            User.full_name_en,
            User.email,
            User.role.label('system_role')
        ).join(User, IndexUser.user_id == User.id)
    else:
        # Get indices the user is a member of
        user_index_ids = db.query(IndexUser.index_id).filter(
            IndexUser.user_id == current_user.id
        ).subquery()

        # Get all users from those indices
        query = db.query(
            IndexUser,
            User.username,
            User.full_name_ar,
            User.full_name_en,
            User.email,
            User.role.label('system_role')
        ).join(User, IndexUser.user_id == User.id).filter(
            IndexUser.index_id.in_(user_index_ids)
        )

    results = query.all()

    # Transform and deduplicate by user_id (keep first occurrence)
    seen_users = set()
    index_users_with_details = []

    for index_user, username, full_name_ar, full_name_en, email, system_role in results:
        # Skip system admins - they shouldn't appear in user selection lists
        if system_role == UserRole.ADMIN:
            continue

        if index_user.user_id in seen_users:
            continue
        seen_users.add(index_user.user_id)

        index_user_dict = {
            "id": index_user.id,
            "index_id": index_user.index_id,
            "user_id": index_user.user_id,
            "role": index_user.role,
            "added_by": index_user.added_by,
            "created_at": index_user.created_at,
            "updated_at": index_user.updated_at,
            "user_username": username,
            "user_full_name_ar": full_name_ar,
            "user_full_name_en": full_name_en,
            "user_email": email
        }
        index_users_with_details.append(index_user_dict)

    return index_users_with_details


# ==== Index User CRUD Operations ====

@router.get("", response_model=List[IndexUserResponse])
async def list_index_users(
    index_id: str = None,
    user_id: str = None,
    role: str = None,
    db: Session = Depends(get_db)
):
    """
    List all index users, optionally filtered by index_id, user_id, or role
    """
    query = db.query(IndexUser)

    if index_id:
        query = query.filter(IndexUser.index_id == index_id)

    if user_id:
        query = query.filter(IndexUser.user_id == user_id)

    if role:
        query = query.filter(IndexUser.role == role)

    return query.all()


@router.get("/with-details", response_model=List[IndexUserWithDetails])
async def list_index_users_with_details(
    index_id: str = None,
    db: Session = Depends(get_db)
):
    """
    List index users with user details (username, full name, email)
    Excludes system admin users from the results.
    """
    query = db.query(
        IndexUser,
        User.username,
        User.full_name_ar,
        User.full_name_en,
        User.email,
        User.role.label('system_role')
    ).join(User, IndexUser.user_id == User.id)

    if index_id:
        query = query.filter(IndexUser.index_id == index_id)

    results = query.all()

    # Transform the results, excluding system admins
    index_users_with_details = []
    for index_user, username, full_name_ar, full_name_en, email, system_role in results:
        # Skip system admins - they shouldn't appear in user selection lists
        if system_role == UserRole.ADMIN:
            continue

        index_user_dict = {
            "id": index_user.id,
            "index_id": index_user.index_id,
            "user_id": index_user.user_id,
            "role": index_user.role,
            "added_by": index_user.added_by,
            "created_at": index_user.created_at,
            "updated_at": index_user.updated_at,
            "user_username": username,
            "user_full_name_ar": full_name_ar,
            "user_full_name_en": full_name_en,
            "user_email": email
        }
        index_users_with_details.append(index_user_dict)

    return index_users_with_details


@router.get("/{index_user_id}", response_model=IndexUserResponse)
async def get_index_user(
    index_user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific index user by ID
    """
    index_user = db.query(IndexUser).filter(IndexUser.id == index_user_id).first()

    if not index_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index user not found"
        )

    return index_user


@router.post("", response_model=IndexUserResponse, status_code=status.HTTP_201_CREATED)
async def create_index_user(
    index_user_data: IndexUserCreate,
    db: Session = Depends(get_db)
):
    """
    Add a user to an index with a specific role
    """
    try:
        # Check if user is already in the index
        existing = db.query(IndexUser).filter(
            IndexUser.index_id == index_user_data.index_id,
            IndexUser.user_id == index_user_data.user_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this index"
            )

        # Create new index user
        new_index_user = IndexUser(
            id=str(uuid.uuid4()),
            index_id=index_user_data.index_id,
            user_id=index_user_data.user_id,
            role=index_user_data.role,
            added_by=index_user_data.added_by
        )

        db.add(new_index_user)
        db.commit()
        db.refresh(new_index_user)

        return new_index_user

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid index_id or user_id"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating index user: {str(e)}"
        )


@router.put("/{index_user_id}", response_model=IndexUserResponse)
async def update_index_user(
    index_user_id: str,
    index_user_data: IndexUserUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an index user's role
    """
    index_user = db.query(IndexUser).filter(IndexUser.id == index_user_id).first()

    if not index_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index user not found"
        )

    # Update fields
    if index_user_data.role is not None:
        index_user.role = index_user_data.role

    try:
        db.commit()
        db.refresh(index_user)
        return index_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating index user: {str(e)}"
        )


@router.delete("/{index_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_index_user(
    index_user_id: str,
    db: Session = Depends(get_db)
):
    """
    Remove a user from an index
    """
    index_user = db.query(IndexUser).filter(IndexUser.id == index_user_id).first()

    if not index_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index user not found"
        )

    try:
        db.delete(index_user)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting index user: {str(e)}"
        )
