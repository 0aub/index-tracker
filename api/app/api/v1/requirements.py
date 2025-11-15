"""
API endpoints for Requirement operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app.schemas.requirement import (
    RequirementResponse,
    RequirementMinimal,
    RequirementUpdate
)
from app.models.requirement import Requirement, MaturityLevel

router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.get("", response_model=List[RequirementMinimal])
async def list_requirements(
    index_id: Optional[str] = None,
    main_area_ar: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List requirements with optional filtering

    Args:
        index_id: Filter by index
        main_area_ar: Filter by main area
        skip: Number of records to skip
        limit: Maximum number of records
        db: Database session

    Returns:
        List of requirements
    """
    query = db.query(Requirement)

    if index_id:
        query = query.filter(Requirement.index_id == index_id)

    if main_area_ar:
        query = query.filter(Requirement.main_area_ar == main_area_ar)

    requirements = query.order_by(Requirement.display_order).offset(skip).limit(limit).all()

    return requirements


@router.get("/{requirement_id}", response_model=RequirementResponse)
async def get_requirement(
    requirement_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific requirement with all maturity levels, evidence, and criteria

    Args:
        requirement_id: Requirement ID
        db: Database session

    Returns:
        Requirement with full details
    """
    requirement = db.query(Requirement).options(
        joinedload(Requirement.maturity_levels).joinedload(MaturityLevel.evidence_requirements),
        joinedload(Requirement.maturity_levels).joinedload(MaturityLevel.acceptance_criteria)
    ).filter(Requirement.id == requirement_id).first()

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    return requirement


@router.patch("/{requirement_id}", response_model=RequirementResponse)
async def update_requirement(
    requirement_id: str,
    requirement_update: RequirementUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a requirement

    Args:
        requirement_id: Requirement ID
        requirement_update: Fields to update
        db: Database session

    Returns:
        Updated requirement
    """
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Update fields
    update_data = requirement_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(requirement, field, value)

    db.commit()
    db.refresh(requirement)

    return requirement
