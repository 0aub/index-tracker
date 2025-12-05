"""
API endpoints for Checklist operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
import uuid

from app.database import get_db
from app.api.dependencies import get_current_active_user
from app.schemas.checklist import (
    ChecklistItemCreate,
    ChecklistItemUpdate,
    ChecklistItemResponse
)
from app.models.checklist import ChecklistItem
from app.models.requirement import Requirement
from app.models.assignment import Assignment
from app.models.user import User

router = APIRouter(prefix="/checklist", tags=["Checklist"])


def check_requirement_access(requirement_id: str, user: User, db: Session) -> bool:
    """
    Check if user has access to the requirement's checklist.
    Users who are assigned to the requirement OR are owners/supervisors of the index can access.
    """
    # Get requirement
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        return False

    # Admin can access all
    if user.role and user.role.value == 'ADMIN':
        return True

    # Check if user is assigned to the requirement
    assignment = db.query(Assignment).filter(
        Assignment.requirement_id == requirement_id,
        Assignment.user_id == user.id
    ).first()

    if assignment:
        return True

    # Check if user is an owner/supervisor of the index
    from app.models.index_user import IndexUser
    index_user = db.query(IndexUser).filter(
        IndexUser.index_id == requirement.index_id,
        IndexUser.user_id == user.id,
        IndexUser.role.in_(['owner', 'supervisor'])
    ).first()

    return index_user is not None


@router.get("/{requirement_id}", response_model=List[ChecklistItemResponse])
async def get_checklist_items(
    requirement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all checklist items for a requirement.
    Accessible to users assigned to the requirement or index owners/supervisors.
    """
    if not check_requirement_access(requirement_id, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this requirement's checklist"
        )

    items = db.query(ChecklistItem).filter(
        ChecklistItem.requirement_id == requirement_id
    ).order_by(ChecklistItem.display_order).all()

    # Build response with user names
    result = []
    for item in items:
        creator = db.query(User).filter(User.id == item.created_by).first()
        checker = db.query(User).filter(User.id == item.checked_by).first() if item.checked_by else None

        result.append({
            "id": item.id,
            "requirement_id": item.requirement_id,
            "text_ar": item.text_ar,
            "text_en": item.text_en,
            "is_checked": item.is_checked,
            "checked_by": item.checked_by,
            "checked_at": item.checked_at,
            "display_order": item.display_order,
            "created_by": item.created_by,
            "created_at": item.created_at,
            "updated_by": item.updated_by,
            "updated_at": item.updated_at,
            "created_by_name": creator.full_name_ar if creator else None,
            "checked_by_name": checker.full_name_ar if checker else None
        })

    return result


@router.post("/{requirement_id}", response_model=ChecklistItemResponse, status_code=status.HTTP_201_CREATED)
async def create_checklist_item(
    requirement_id: str,
    item_data: ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new checklist item for a requirement.
    Accessible to users assigned to the requirement or index owners/supervisors.
    """
    if not check_requirement_access(requirement_id, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to add checklist items to this requirement"
        )

    # Get max display order
    max_order = db.query(func.max(ChecklistItem.display_order)).filter(
        ChecklistItem.requirement_id == requirement_id
    ).scalar() or 0

    new_item = ChecklistItem(
        id=str(uuid.uuid4()),
        requirement_id=requirement_id,
        text_ar=item_data.text_ar,
        text_en=item_data.text_en,
        is_checked=False,
        display_order=max_order + 1,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {
        "id": new_item.id,
        "requirement_id": new_item.requirement_id,
        "text_ar": new_item.text_ar,
        "text_en": new_item.text_en,
        "is_checked": new_item.is_checked,
        "checked_by": new_item.checked_by,
        "checked_at": new_item.checked_at,
        "display_order": new_item.display_order,
        "created_by": new_item.created_by,
        "created_at": new_item.created_at,
        "updated_by": new_item.updated_by,
        "updated_at": new_item.updated_at,
        "created_by_name": current_user.full_name_ar,
        "checked_by_name": None
    }


@router.patch("/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    item_id: str,
    item_data: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a checklist item (text, checked status, or order).
    Accessible to users assigned to the requirement or index owners/supervisors.
    """
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found"
        )

    if not check_requirement_access(item.requirement_id, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to update this checklist item"
        )

    # Update fields
    if item_data.text_ar is not None:
        item.text_ar = item_data.text_ar
    if item_data.text_en is not None:
        item.text_en = item_data.text_en
    if item_data.display_order is not None:
        item.display_order = item_data.display_order

    # Handle check/uncheck
    if item_data.is_checked is not None:
        if item_data.is_checked and not item.is_checked:
            # Checking the item
            item.is_checked = True
            item.checked_by = current_user.id
            item.checked_at = datetime.utcnow()
        elif not item_data.is_checked and item.is_checked:
            # Unchecking the item
            item.is_checked = False
            item.checked_by = None
            item.checked_at = None

    item.updated_by = current_user.id
    item.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(item)

    creator = db.query(User).filter(User.id == item.created_by).first()
    checker = db.query(User).filter(User.id == item.checked_by).first() if item.checked_by else None

    return {
        "id": item.id,
        "requirement_id": item.requirement_id,
        "text_ar": item.text_ar,
        "text_en": item.text_en,
        "is_checked": item.is_checked,
        "checked_by": item.checked_by,
        "checked_at": item.checked_at,
        "display_order": item.display_order,
        "created_by": item.created_by,
        "created_at": item.created_at,
        "updated_by": item.updated_by,
        "updated_at": item.updated_at,
        "created_by_name": creator.full_name_ar if creator else None,
        "checked_by_name": checker.full_name_ar if checker else None
    }


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a checklist item.
    Accessible to users assigned to the requirement or index owners/supervisors.
    """
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found"
        )

    if not check_requirement_access(item.requirement_id, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to delete this checklist item"
        )

    db.delete(item)
    db.commit()
    return None


@router.post("/{item_id}/toggle", response_model=ChecklistItemResponse)
async def toggle_checklist_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Toggle the checked status of a checklist item.
    Accessible to users assigned to the requirement or index owners/supervisors.
    """
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found"
        )

    if not check_requirement_access(item.requirement_id, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to toggle this checklist item"
        )

    # Toggle
    if item.is_checked:
        item.is_checked = False
        item.checked_by = None
        item.checked_at = None
    else:
        item.is_checked = True
        item.checked_by = current_user.id
        item.checked_at = datetime.utcnow()

    item.updated_by = current_user.id
    item.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(item)

    creator = db.query(User).filter(User.id == item.created_by).first()
    checker = db.query(User).filter(User.id == item.checked_by).first() if item.checked_by else None

    return {
        "id": item.id,
        "requirement_id": item.requirement_id,
        "text_ar": item.text_ar,
        "text_en": item.text_en,
        "is_checked": item.is_checked,
        "checked_by": item.checked_by,
        "checked_at": item.checked_at,
        "display_order": item.display_order,
        "created_by": item.created_by,
        "created_at": item.created_at,
        "updated_by": item.updated_by,
        "updated_at": item.updated_at,
        "created_by_name": creator.full_name_ar if creator else None,
        "checked_by_name": checker.full_name_ar if checker else None
    }
