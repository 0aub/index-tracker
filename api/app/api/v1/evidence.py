"""
API endpoints for Evidence operations
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import uuid
import os
import shutil
from datetime import datetime

from app.database import get_db
from app.schemas.evidence import (
    EvidenceCreate,
    EvidenceUpdate,
    EvidenceResponse,
    EvidenceWithVersions,
    EvidenceVersionResponse,
    EvidenceActivityResponse,
    EvidenceActionRequest
)
from app.models.evidence import Evidence, EvidenceVersion, EvidenceActivity

router = APIRouter(prefix="/evidence", tags=["Evidence"])


# ==== Evidence CRUD Operations ====

@router.get("", response_model=List[EvidenceResponse])
async def list_evidence(
    requirement_id: Optional[str] = None,
    assignment_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all evidence, optionally filtered by requirement, assignment, or status
    """
    query = db.query(Evidence)

    if requirement_id:
        query = query.filter(Evidence.requirement_id == requirement_id)

    if assignment_id:
        query = query.filter(Evidence.assignment_id == assignment_id)

    if status_filter:
        query = query.filter(Evidence.status == status_filter)

    return query.all()


@router.get("/{evidence_id}", response_model=EvidenceWithVersions)
async def get_evidence(
    evidence_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific evidence document with all its versions and activity log
    """
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    return evidence


@router.post("/upload", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    file: UploadFile = File(...),
    requirement_id: str = Form(...),
    maturity_level: int = Form(...),
    document_name: str = Form(...),
    uploaded_by: str = Form(...),
    assignment_id: Optional[str] = Form(None),
    upload_comment: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a new evidence file (creates draft Evidence and first version)
    """
    try:
        # Validate maturity level
        if maturity_level < 0 or maturity_level > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maturity level must be between 0 and 5"
            )

        # Generate IDs
        evidence_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        activity_id = str(uuid.uuid4())

        # Save file
        upload_dir = f"/app/uploads/evidence/{evidence_id}"
        os.makedirs(upload_dir, exist_ok=True)

        file_extension = os.path.splitext(file.filename)[1]
        filename = f"v1_{file.filename}"
        file_path = os.path.join(upload_dir, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)

        # Create Evidence record
        new_evidence = Evidence(
            id=evidence_id,
            requirement_id=requirement_id,
            assignment_id=assignment_id,
            maturity_level=maturity_level,
            document_name=document_name,
            current_version=1,
            status="draft",
            uploaded_by=uploaded_by
        )

        # Create first version
        new_version = EvidenceVersion(
            id=version_id,
            evidence_id=evidence_id,
            version_number=1,
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=file.content_type,
            uploaded_by=uploaded_by,
            upload_comment=upload_comment
        )

        # Create activity log
        new_activity = EvidenceActivity(
            id=activity_id,
            evidence_id=evidence_id,
            version_number=1,
            action="uploaded_draft",
            actor_id=uploaded_by,
            comment=upload_comment
        )

        db.add(new_evidence)
        db.add(new_version)
        db.add(new_activity)
        db.commit()
        db.refresh(new_evidence)

        return new_evidence

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database error: Invalid references or duplicate entry"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )


@router.post("/{evidence_id}/upload-version", response_model=EvidenceVersionResponse)
async def upload_new_version(
    evidence_id: str,
    file: UploadFile = File(...),
    uploaded_by: str = Form(...),
    upload_comment: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a new version of an existing evidence document
    """
    try:
        # Get existing evidence
        evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()

        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence not found"
            )

        # Increment version
        new_version_number = evidence.current_version + 1
        version_id = str(uuid.uuid4())
        activity_id = str(uuid.uuid4())

        # Save file
        upload_dir = f"/app/uploads/evidence/{evidence_id}"
        os.makedirs(upload_dir, exist_ok=True)

        filename = f"v{new_version_number}_{file.filename}"
        file_path = os.path.join(upload_dir, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)

        # Create new version
        new_version = EvidenceVersion(
            id=version_id,
            evidence_id=evidence_id,
            version_number=new_version_number,
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=file.content_type,
            uploaded_by=uploaded_by,
            upload_comment=upload_comment
        )

        # Update evidence current version
        evidence.current_version = new_version_number
        evidence.updated_at = datetime.utcnow()

        # Create activity log
        new_activity = EvidenceActivity(
            id=activity_id,
            evidence_id=evidence_id,
            version_number=new_version_number,
            action="uploaded_version",
            actor_id=uploaded_by,
            comment=upload_comment
        )

        db.add(new_version)
        db.add(new_activity)
        db.commit()
        db.refresh(new_version)

        return new_version

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading version: {str(e)}"
        )


@router.post("/{evidence_id}/action", response_model=EvidenceResponse)
async def evidence_action(
    evidence_id: str,
    action_request: EvidenceActionRequest,
    actor_id: str,
    db: Session = Depends(get_db)
):
    """
    Perform an action on evidence: submit, confirm, approve, or reject

    - submit: User submits draft for review (draft -> submitted)
    - confirm: Supervisor confirms/accepts submission (submitted -> confirmed)
    - approve: Final approval (confirmed -> approved)
    - reject: Reject at any stage (any -> rejected, back to draft)
    """
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    # Status transition logic
    action = action_request.action
    old_status = evidence.status

    if action == "submit":
        if evidence.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only submit draft evidence"
            )
        evidence.status = "submitted"

    elif action == "confirm":
        if evidence.status != "submitted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only confirm submitted evidence"
            )
        evidence.status = "confirmed"

    elif action == "approve":
        if evidence.status != "confirmed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only approve confirmed evidence"
            )
        evidence.status = "approved"

    elif action == "reject":
        evidence.status = "rejected"

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action"
        )

    # Update evidence
    evidence.updated_at = datetime.utcnow()

    # Create activity log
    activity = EvidenceActivity(
        id=str(uuid.uuid4()),
        evidence_id=evidence_id,
        version_number=evidence.current_version,
        action=action,
        actor_id=actor_id,
        comment=action_request.comment
    )

    db.add(activity)
    db.commit()
    db.refresh(evidence)

    return evidence


@router.delete("/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_evidence(
    evidence_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete an evidence document and all its versions
    """
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    # Delete files from filesystem
    upload_dir = f"/app/uploads/evidence/{evidence_id}"
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)

    # Delete from database (cascade will handle versions and activities)
    db.delete(evidence)
    db.commit()

    return None


# ==== Activity Log ====

@router.get("/{evidence_id}/activities", response_model=List[EvidenceActivityResponse])
async def get_evidence_activities(
    evidence_id: str,
    db: Session = Depends(get_db)
):
    """
    Get activity log for an evidence document
    """
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    activities = db.query(EvidenceActivity).filter(
        EvidenceActivity.evidence_id == evidence_id
    ).order_by(EvidenceActivity.created_at.desc()).all()

    return activities


# ==== Versions ====

@router.get("/{evidence_id}/versions", response_model=List[EvidenceVersionResponse])
async def get_evidence_versions(
    evidence_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all versions of an evidence document
    """
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    versions = db.query(EvidenceVersion).filter(
        EvidenceVersion.evidence_id == evidence_id
    ).order_by(EvidenceVersion.version_number.desc()).all()

    return versions
