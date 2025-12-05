"""
API endpoints for Assignment operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
import uuid

from app.database import get_db
from app.api.dependencies import get_current_active_user
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentBatchCreate,
    AssignmentUpdate,
    AssignmentResponse,
    AssignmentWithUser
)
from app.models.assignment import Assignment
from app.models.user import User, UserRole
from app.models.index_user import IndexUser, IndexUserRole
from app.models import NotificationType, Requirement
from app.api.v1.notifications import create_notification

router = APIRouter(prefix="/assignments", tags=["Assignments"])


def can_assign_to_requirement(user: User, requirement_id: str, db: Session) -> bool:
    """
    Check if user can create assignments for a requirement.
    - ADMIN: Can assign to any requirement
    - OWNER: Can assign to any requirement in their indices
    - SUPERVISOR: Can only assign to requirements they are assigned to (as support)
    - CONTRIBUTOR: Cannot assign
    """
    if user.role == UserRole.ADMIN:
        return True

    # Get requirement to check its index
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        return False

    # Get user's role in the index
    index_user = db.query(IndexUser).filter(
        IndexUser.user_id == user.id,
        IndexUser.index_id == requirement.index_id
    ).first()

    if not index_user:
        return False

    # OWNER can assign to any requirement
    if index_user.role == IndexUserRole.OWNER:
        return True

    # SUPERVISOR can only assign to requirements they are assigned to
    if index_user.role == IndexUserRole.SUPERVISOR:
        assignment = db.query(Assignment).filter(
            Assignment.requirement_id == requirement_id,
            Assignment.user_id == user.id
        ).first()
        return assignment is not None

    return False


@router.post("", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    assignment: AssignmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new assignment

    Assigns a user to a requirement in an index

    Permission:
    - ADMIN: Can assign to any requirement
    - OWNER: Can assign to any requirement in their indices
    - SUPERVISOR: Can only assign to requirements they are assigned to
    - CONTRIBUTOR: Cannot assign

    Args:
        assignment: Assignment data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created assignment
    """
    # Check if user can assign to this requirement
    if not can_assign_to_requirement(current_user, assignment.requirement_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to assign users to this requirement"
        )

    try:
        new_assignment = Assignment(
            id=str(uuid.uuid4()),
            index_id=assignment.index_id,
            requirement_id=assignment.requirement_id,
            user_id=assignment.user_id,
            assigned_by=assignment.assigned_by
        )

        db.add(new_assignment)
        db.commit()
        db.refresh(new_assignment)

        # Create notification for assigned user
        requirement = db.query(Requirement).filter(Requirement.id == assignment.requirement_id).first()
        if requirement:
            create_notification(
                db=db,
                user_id=assignment.user_id,
                notification_type=NotificationType.REQUIREMENT_ASSIGNED,
                title="تم تعيين متطلب جديد لك",
                message=f"تم تعيينك للمتطلب: {requirement.question_ar or requirement.code}",
                actor_id=assignment.assigned_by,
                requirement_id=assignment.requirement_id
            )
            db.commit()

        return new_assignment

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment already exists or invalid references"
        )


@router.post("/batch", response_model=List[AssignmentResponse], status_code=status.HTTP_201_CREATED)
async def create_assignments_batch(
    batch: AssignmentBatchCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create multiple assignments at once

    Assigns multiple users to a single requirement

    Permission:
    - ADMIN: Can assign to any requirement
    - OWNER: Can assign to any requirement in their indices
    - SUPERVISOR: Can only assign to requirements they are assigned to
    - CONTRIBUTOR: Cannot assign

    Args:
        batch: Batch assignment data
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of created assignments
    """
    # Check if user can assign to this requirement
    if not can_assign_to_requirement(current_user, batch.requirement_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to assign users to this requirement"
        )

    created_assignments = []

    try:
        for user_id in batch.user_ids:
            # Check if assignment already exists
            existing = db.query(Assignment).filter(
                Assignment.index_id == batch.index_id,
                Assignment.requirement_id == batch.requirement_id,
                Assignment.user_id == user_id
            ).first()

            if existing:
                # Skip if already exists
                continue

            new_assignment = Assignment(
                id=str(uuid.uuid4()),
                index_id=batch.index_id,
                requirement_id=batch.requirement_id,
                user_id=user_id,
                assigned_by=batch.assigned_by
            )

            db.add(new_assignment)
            created_assignments.append(new_assignment)

        db.commit()

        # Refresh all created assignments
        for assignment in created_assignments:
            db.refresh(assignment)

        # Create notifications for assigned users
        requirement = db.query(Requirement).filter(Requirement.id == batch.requirement_id).first()
        if requirement:
            for assignment in created_assignments:
                create_notification(
                    db=db,
                    user_id=assignment.user_id,
                    notification_type=NotificationType.REQUIREMENT_ASSIGNED,
                    title="تم تعيين متطلب جديد لك",
                    message=f"تم تعيينك للمتطلب: {requirement.question_ar or requirement.code}",
                    actor_id=batch.assigned_by,
                    requirement_id=batch.requirement_id
                )
            db.commit()

        return created_assignments

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create assignments: {str(e)}"
        )


@router.get("/requirement/{requirement_id}", response_model=List[AssignmentWithUser])
async def get_assignments_by_requirement(
    requirement_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all assignments for a specific requirement

    Args:
        requirement_id: Requirement ID
        db: Database session

    Returns:
        List of assignments with user details
    """
    assignments = db.query(
        Assignment.id,
        Assignment.index_id,
        Assignment.requirement_id,
        Assignment.user_id,
        User.full_name_ar.label("user_name_ar"),
        User.full_name_en.label("user_name_en"),
        User.role.label("user_role"),
        User.department_ar.label("user_department_ar"),
        Assignment.status,
        Assignment.current_level,
        Assignment.completion_percentage,
        Assignment.created_at
    ).join(User, Assignment.user_id == User.id).filter(
        Assignment.requirement_id == requirement_id
    ).all()

    return [
        AssignmentWithUser(
            id=a.id,
            index_id=a.index_id,
            requirement_id=a.requirement_id,
            user_id=a.user_id,
            user_name_ar=a.user_name_ar,
            user_name_en=a.user_name_en,
            user_role=a.user_role,
            user_department_ar=a.user_department_ar,
            status=a.status,
            current_level=a.current_level,
            completion_percentage=a.completion_percentage,
            created_at=a.created_at
        )
        for a in assignments
    ]


@router.get("/user/{user_id}", response_model=List[AssignmentResponse])
async def get_assignments_by_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all assignments for a specific user

    Args:
        user_id: User ID
        db: Database session

    Returns:
        List of assignments
    """
    assignments = db.query(Assignment).filter(
        Assignment.user_id == user_id
    ).order_by(Assignment.created_at.desc()).all()

    return assignments


@router.get("/index/{index_id}", response_model=List[AssignmentResponse])
async def get_assignments_by_index(
    index_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all assignments for a specific index

    Args:
        index_id: Index ID
        db: Database session

    Returns:
        List of assignments
    """
    assignments = db.query(Assignment).filter(
        Assignment.index_id == index_id
    ).order_by(Assignment.created_at.desc()).all()

    return assignments


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: str,
    assignment_update: AssignmentUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an assignment

    Args:
        assignment_id: Assignment ID
        assignment_update: Fields to update
        db: Database session

    Returns:
        Updated assignment
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # Update fields
    update_data = assignment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)

    return assignment


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete an assignment

    Args:
        assignment_id: Assignment ID
        db: Database session
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    db.delete(assignment)
    db.commit()

    return None


@router.delete("/requirement/{requirement_id}/user/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment_by_requirement_and_user(
    requirement_id: str,
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete an assignment by requirement and user

    Args:
        requirement_id: Requirement ID
        user_id: User ID
        db: Database session
    """
    assignment = db.query(Assignment).filter(
        Assignment.requirement_id == requirement_id,
        Assignment.user_id == user_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    db.delete(assignment)
    db.commit()

    return None
