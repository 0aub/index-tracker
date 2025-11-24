"""
API endpoints for Index operations
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from app.database import get_db
from app.config import settings
from app.index_config.index_configs import get_index_config, get_available_index_types
from app.schemas.index import (
    IndexResponse,
    IndexMinimal,
    IndexUpdate,
    IndexStatistics,
    IndexUserEngagementResponse,
    UserEngagementStats
)
from app.models.index import Index, IndexStatus
from app.models.index_user import IndexUser, IndexUserRole
from app.models.user import User
from app.models.assignment import Assignment
from app.models.evidence import Evidence
from app.models.comment import Comment
from app.services.excel_parser import ExcelValidator
from app.services.index_creation import IndexCreationService, IndexCreationError
import uuid
from sqlalchemy import func

router = APIRouter(prefix="/indices", tags=["Indices"])


@router.get("/template", response_class=FileResponse)
async def download_excel_template(index_type: str = "NAII"):
    """
    Download the Excel template for creating a new index

    Args:
        index_type: Type of index (NAII, ETARI, etc.). Defaults to NAII.

    Returns:
        Excel file with template structure
    """
    from app.index_config.index_configs import get_index_config

    # Get configuration for the requested index type
    config = get_index_config(index_type)
    template_filename = config['template_file']

    template_path = os.path.join(
        settings.TEMPLATE_DIR,
        template_filename
    )

    if not os.path.exists(template_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template file not found for index type: {index_type}"
        )

    return FileResponse(
        path=template_path,
        filename=template_filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.post("/upload", response_model=IndexResponse, status_code=status.HTTP_201_CREATED)
async def create_index_from_excel(
    file: UploadFile = File(...),
    code: str = Form(...),
    index_type: str = Form("NAII"),  # NEW: Index type parameter
    name_ar: str = Form(...),
    name_en: Optional[str] = Form(None),
    description_ar: Optional[str] = Form(None),
    description_en: Optional[str] = Form(None),
    version: str = Form("1.0"),
    organization_id: str = Form(...),
    created_by_user_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Create a new index by uploading an Excel file

    The Excel file must follow the template format for the specified index type.
    Column requirements vary by index type (NAII, ETARI, etc.)

    Args:
        file: Excel file with requirements
        code: Unique code for the index
        index_type: Type of index ('NAII', 'ETARI', etc.)
        name_ar: Index name in Arabic
        name_en: Index name in English
        description_ar: Description in Arabic
        description_en: Description in English
        version: Index version
        organization_id: Organization ID
        created_by_user_id: ID of user creating the index
        db: Database session

    Returns:
        Created index with all requirements
    """
    # Validate index type
    try:
        config = get_index_config(index_type)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid index type: {index_type}. Available types: {', '.join(get_available_index_types())}"
        )

    # Validate file extension
    if not ExcelValidator.validate_file_extension(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {settings.ALLOWED_EXTENSIONS}"
        )

    # Read file content
    file_content = await file.read()

    # Validate file size
    if not ExcelValidator.validate_file_size(len(file_content), settings.MAX_UPLOAD_SIZE):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
        )

    # Validate Excel format
    if not ExcelValidator.is_valid_excel(file_content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Excel file format"
        )

    # Create index from Excel
    try:
        index = IndexCreationService.create_index_from_excel(
            db=db,
            file_content=file_content,
            filename=file.filename,
            index_code=code,
            index_type=index_type,  # Pass index type to service
            index_name_ar=name_ar,
            index_name_en=name_en,
            organization_id=organization_id,
            created_by_user_id=created_by_user_id,
            description_ar=description_ar,
            description_en=description_en,
            version=version
        )

        # Automatically add the creator as an owner in index_users
        index_user = IndexUser(
            id=str(uuid.uuid4()),
            index_id=index.id,
            user_id=created_by_user_id,
            role=IndexUserRole.OWNER,
            added_by=created_by_user_id
        )
        db.add(index_user)
        db.commit()

        return index

    except IndexCreationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=List[IndexMinimal])
async def list_indices(
    organization_id: Optional[str] = None,
    status: Optional[IndexStatus] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    List all indices with optional filtering

    Args:
        organization_id: Filter by organization
        status: Filter by status
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of indices
    """
    query = db.query(Index)

    if organization_id:
        query = query.filter(Index.organization_id == organization_id)

    if status:
        query = query.filter(Index.status == status)

    indices = query.order_by(Index.created_at.desc()).offset(skip).limit(limit).all()

    # Calculate evidence count for each index
    from app.models.requirement import Requirement

    result = []
    for index in indices:
        # Count evidence for this index
        evidence_count = db.query(func.count(Evidence.id)).join(
            Requirement, Evidence.requirement_id == Requirement.id
        ).filter(Requirement.index_id == index.id).scalar() or 0

        # Create response with evidence count
        index_dict = {
            'id': index.id,
            'code': index.code,
            'index_type': index.index_type,
            'name_ar': index.name_ar,
            'name_en': index.name_en,
            'status': index.status,
            'total_requirements': index.total_requirements,
            'total_areas': index.total_areas,
            'total_evidence': evidence_count,
            'created_at': index.created_at,
            'start_date': index.start_date,
            'end_date': index.end_date,
            'is_completed': index.is_completed,
            'completed_at': index.completed_at,
            'previous_index_id': index.previous_index_id
        }
        result.append(index_dict)

    return result


@router.get("/{index_id}", response_model=IndexResponse)
async def get_index(
    index_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific index by ID

    Args:
        index_id: Index ID
        db: Database session

    Returns:
        Index details
    """
    from app.models.requirement import Requirement

    index = db.query(Index).filter(Index.id == index_id).first()

    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Calculate evidence count for this index
    evidence_count = db.query(func.count(Evidence.id)).join(
        Requirement, Evidence.requirement_id == Requirement.id
    ).filter(Requirement.index_id == index.id).scalar() or 0

    # Create response with evidence count
    index_dict = {
        'id': index.id,
        'code': index.code,
        'index_type': index.index_type,
        'name_ar': index.name_ar,
        'name_en': index.name_en,
        'description_ar': index.description_ar,
        'description_en': index.description_en,
        'version': index.version,
        'status': index.status,
        'organization_id': index.organization_id,
        'total_requirements': index.total_requirements,
        'total_areas': index.total_areas,
        'total_evidence': evidence_count,
        'excel_filename': index.excel_filename,
        'excel_upload_date': index.excel_upload_date,
        'created_at': index.created_at,
        'updated_at': index.updated_at,
        'published_at': index.published_at,
        'start_date': index.start_date,
        'end_date': index.end_date
    }

    return index_dict


@router.get("/{index_id}/statistics", response_model=IndexStatistics)
async def get_index_statistics(
    index_id: str,
    db: Session = Depends(get_db)
):
    """
    Get statistics for an index

    Args:
        index_id: Index ID
        db: Database session

    Returns:
        Index statistics
    """
    # Check if index exists
    index = db.query(Index).filter(Index.id == index_id).first()
    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Get statistics
    stats = IndexCreationService.get_index_statistics(db, index_id)

    return stats


@router.get("/{index_id}/user-engagement", response_model=IndexUserEngagementResponse)
async def get_index_user_engagement(
    index_id: str,
    db: Session = Depends(get_db)
):
    """
    Get user engagement statistics for an index

    Returns metrics for each user in the index:
    - Number of approved documents
    - Number of assigned requirements
    - Number of rejected documents
    - Total uploads
    - Total comments

    Args:
        index_id: Index ID
        db: Database session

    Returns:
        User engagement statistics
    """
    # Check if index exists
    index = db.query(Index).filter(Index.id == index_id).first()
    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Get all users who are members of this index
    index_users = db.query(IndexUser).filter(IndexUser.index_id == index_id).all()
    user_ids = [iu.user_id for iu in index_users]

    # Get user details
    users = db.query(User).filter(User.id.in_(user_ids)).all()

    user_stats = []

    for user in users:
        # Count approved documents (evidence with status=approved)
        approved_count = db.query(func.count(Evidence.id)).filter(
            Evidence.uploaded_by == user.id,
            Evidence.status == "approved"
        ).scalar() or 0

        # Count assigned requirements
        assigned_count = db.query(func.count(Assignment.id)).filter(
            Assignment.user_id == user.id,
            Assignment.index_id == index_id
        ).scalar() or 0

        # Count rejected documents
        rejected_count = db.query(func.count(Evidence.id)).filter(
            Evidence.uploaded_by == user.id,
            Evidence.status == "rejected"
        ).scalar() or 0

        # Count total uploads
        upload_count = db.query(func.count(Evidence.id)).filter(
            Evidence.uploaded_by == user.id
        ).scalar() or 0

        # Count total comments (need to join with requirements to filter by index)
        from app.models.requirement import Requirement
        comment_count = db.query(func.count(Comment.id)).join(
            Requirement, Comment.requirement_id == Requirement.id
        ).filter(
            Comment.user_id == user.id,
            Requirement.index_id == index_id
        ).scalar() or 0

        # Count documents reviewed (approved/rejected by this user, excluding self-reviews)
        from app.models.evidence import EvidenceActivity
        from sqlalchemy import distinct
        reviewed_count = db.query(func.count(distinct(EvidenceActivity.evidence_id))).join(
            Evidence, EvidenceActivity.evidence_id == Evidence.id
        ).join(
            Requirement, Evidence.requirement_id == Requirement.id
        ).filter(
            EvidenceActivity.actor_id == user.id,
            EvidenceActivity.action.in_(['approved', 'rejected']),
            Evidence.uploaded_by != user.id,  # Exclude self-reviews
            Requirement.index_id == index_id
        ).scalar() or 0

        # Count review comments (comments on evidence uploaded by others)
        # Join Comment -> Requirement -> Evidence to filter by index and exclude own uploads
        review_comment_count = db.query(func.count(Comment.id)).join(
            Requirement, Comment.requirement_id == Requirement.id
        ).join(
            Evidence, Evidence.requirement_id == Requirement.id
        ).filter(
            Comment.user_id == user.id,
            Evidence.uploaded_by != user.id,  # Comments on others' evidence
            Requirement.index_id == index_id
        ).scalar() or 0

        user_stats.append(UserEngagementStats(
            user_id=user.id,
            username=user.username,
            full_name_ar=user.full_name_ar,
            full_name_en=user.full_name_en,
            approved_documents=approved_count,
            assigned_requirements=assigned_count,
            rejected_documents=rejected_count,
            total_uploads=upload_count,
            total_comments=comment_count,
            documents_reviewed=reviewed_count,
            review_comments=review_comment_count
        ))

    return IndexUserEngagementResponse(
        index_id=index_id,
        user_statistics=user_stats
    )


@router.patch("/{index_id}", response_model=IndexResponse)
async def update_index(
    index_id: str,
    index_update: IndexUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an index

    Args:
        index_id: Index ID
        index_update: Fields to update
        db: Database session

    Returns:
        Updated index
    """
    index = db.query(Index).filter(Index.id == index_id).first()

    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Update fields
    update_data = index_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(index, field, value)

    db.commit()
    db.refresh(index)

    return index


@router.delete("/{index_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_index(
    index_id: str,
    hard_delete: bool = False,
    db: Session = Depends(get_db)
):
    """
    Delete an index (soft delete by archiving, or hard delete if hard_delete=true)

    Args:
        index_id: Index ID
        hard_delete: If true, permanently delete from database. If false, archive.
        db: Database session
    """
    index = db.query(Index).filter(Index.id == index_id).first()

    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    if hard_delete:
        # Hard delete - permanently remove from database
        # Cascading deletes will remove all related data (requirements, assignments, etc.)
        db.delete(index)
        db.commit()
    else:
        # Soft delete by archiving
        index.status = IndexStatus.ARCHIVED
        db.commit()

    return None


@router.post("/{index_id}/complete", response_model=IndexResponse)
async def complete_index(
    index_id: str,
    db: Session = Depends(get_db)
):
    """
    Mark an index as completed.
    A completed index can have recommendations uploaded and can be linked to future indices.
    """
    from datetime import datetime

    index = db.query(Index).filter(Index.id == index_id).first()

    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    if index.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Index is already completed"
        )

    # Mark as completed
    index.is_completed = True
    index.completed_at = datetime.utcnow()
    index.status = IndexStatus.COMPLETED

    db.commit()
    db.refresh(index)

    return index


@router.get("/completed/list", response_model=List[IndexMinimal])
async def get_completed_indices(
    organization_id: Optional[str] = None,
    index_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of completed indices that can be linked to new indices.
    Filter by organization and/or index type.
    """
    query = db.query(Index).filter(Index.is_completed == True)

    if organization_id:
        query = query.filter(Index.organization_id == organization_id)

    if index_type:
        query = query.filter(Index.index_type == index_type)

    # Order by completion date descending (most recent first)
    query = query.order_by(Index.completed_at.desc())

    return query.all()


@router.get("/{index_id}/recommendations")
async def get_index_recommendations(
    index_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all recommendations for an index.
    """
    from app.models import Recommendation

    index = db.query(Index).filter(Index.id == index_id).first()

    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    recommendations = db.query(Recommendation).filter(
        Recommendation.index_id == index_id
    ).all()

    return {
        "index_id": index_id,
        "total_recommendations": len(recommendations),
        "recommendations": [
            {
                "id": rec.id,
                "requirement_id": rec.requirement_id,
                "recommendation_ar": rec.recommendation_ar,
                "recommendation_en": rec.recommendation_en,
                "status": rec.status,
                "addressed_at": rec.addressed_at,
                "created_at": rec.created_at
            }
            for rec in recommendations
        ]
    }


@router.post("/{index_id}/link-previous", response_model=IndexResponse)
async def link_previous_index(
    index_id: str,
    previous_index_id: str,
    db: Session = Depends(get_db)
):
    """
    Link an index to its previous version.
    This enables the system to show previous year's data (answers, evidence, recommendations)
    when viewing requirements in the current index.

    Args:
        index_id: Current index ID
        previous_index_id: Previous index ID to link to
        db: Database session

    Returns:
        Updated index with previous_index_id set
    """
    # Get the current index
    index = db.query(Index).filter(Index.id == index_id).first()
    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Get the previous index
    previous_index = db.query(Index).filter(Index.id == previous_index_id).first()
    if not previous_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Previous index not found"
        )

    # Validate that the previous index is completed
    if not previous_index.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Previous index must be completed before linking"
        )

    # Validate same index type
    if index.index_type != previous_index.index_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Index type mismatch: {index.index_type} != {previous_index.index_type}"
        )

    # Prevent circular references
    if previous_index.previous_index_id == index_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Circular reference detected"
        )

    # Set the link
    index.previous_index_id = previous_index_id
    db.commit()
    db.refresh(index)

    return index


@router.delete("/{index_id}/link-previous", response_model=IndexResponse)
async def unlink_previous_index(
    index_id: str,
    db: Session = Depends(get_db)
):
    """
    Remove the link to a previous index.

    Args:
        index_id: Current index ID
        db: Database session

    Returns:
        Updated index with previous_index_id removed
    """
    index = db.query(Index).filter(Index.id == index_id).first()
    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    index.previous_index_id = None
    db.commit()
    db.refresh(index)

    return index
