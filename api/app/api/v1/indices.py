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
async def download_excel_template():
    """
    Download the Excel template for creating a new index

    Returns:
        Excel file with template structure
    """
    template_path = os.path.join(
        settings.TEMPLATE_DIR,
        settings.TEMPLATE_FILENAME
    )

    if not os.path.exists(template_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template file not found"
        )

    return FileResponse(
        path=template_path,
        filename=settings.TEMPLATE_FILENAME,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.post("/upload", response_model=IndexResponse, status_code=status.HTTP_201_CREATED)
async def create_index_from_excel(
    file: UploadFile = File(...),
    code: str = Form(...),
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

    The Excel file must follow the template format with required columns:
    - المحور الأساسي (Main Area)
    - المجال الفرعي (Sub-domain)
    - رقم المعيار (Requirement Code)
    - السؤال (Question)
    - مستوى النضج (Maturity Level)
    - الجاهزية (Readiness)
    - الأدلة المطلوبة (Required Evidence)
    - معايير القبول (Acceptance Criteria)

    Args:
        file: Excel file with requirements
        code: Unique code for the index
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
            'name_ar': index.name_ar,
            'name_en': index.name_en,
            'status': index.status,
            'total_requirements': index.total_requirements,
            'total_areas': index.total_areas,
            'total_evidence': evidence_count,
            'created_at': index.created_at,
            'start_date': index.start_date,
            'end_date': index.end_date
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
        'published_at': index.published_at
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

        user_stats.append(UserEngagementStats(
            user_id=user.id,
            username=user.username,
            full_name_ar=user.full_name_ar,
            full_name_en=user.full_name_en,
            approved_documents=approved_count,
            assigned_requirements=assigned_count,
            rejected_documents=rejected_count,
            total_uploads=upload_count,
            total_comments=comment_count
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
    db: Session = Depends(get_db)
):
    """
    Delete an index (soft delete by archiving)

    Args:
        index_id: Index ID
        db: Database session
    """
    index = db.query(Index).filter(Index.id == index_id).first()

    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Soft delete by archiving
    index.status = IndexStatus.ARCHIVED
    db.commit()

    return None
