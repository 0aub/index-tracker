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
from app.models.user import User
from app.models import NotificationType, Requirement, Assignment
from app.api.v1.requirements import log_requirement_activity
from app.api.v1.notifications import create_notification

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

        # Create evidence activity log
        new_activity = EvidenceActivity(
            id=activity_id,
            evidence_id=evidence_id,
            version_number=1,
            action="uploaded_draft",
            actor_id=uploaded_by,
            comment=upload_comment
        )
        db.add(new_activity)

        # Log upload to requirement activity timeline
        actor = db.query(User).filter(User.id == uploaded_by).first()
        log_requirement_activity(
            db=db,
            requirement_id=requirement_id,
            action_type="evidence_uploaded",
            actor_id=uploaded_by,
            description_ar=f"تم رفع دليل جديد: {document_name}",
            description_en=f"New evidence uploaded: {document_name}",
            comment=upload_comment,
            maturity_level=maturity_level
        )

        db.add(new_evidence)
        db.add(new_version)
        db.commit()
        db.refresh(new_evidence)

        # Create notifications for assigned users (except uploader)
        requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
        if requirement:
            assignments = db.query(Assignment).filter(Assignment.requirement_id == requirement_id).all()
            for assignment in assignments:
                # Don't notify the uploader
                if assignment.user_id != uploaded_by:
                    create_notification(
                        db=db,
                        user_id=assignment.user_id,
                        notification_type=NotificationType.EVIDENCE_UPLOADED,
                        title="تم رفع دليل جديد",
                        message=f"تم رفع دليل جديد للمتطلب: {requirement.question_ar or requirement.code}",
                        actor_id=uploaded_by,
                        requirement_id=requirement_id,
                        evidence_id=evidence_id
                    )
            db.commit()

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

        # Reset status to draft if it was rejected (allows re-submission)
        if evidence.status == "rejected":
            evidence.status = "draft"

        # Create activity log
        new_activity = EvidenceActivity(
            id=activity_id,
            evidence_id=evidence_id,
            version_number=new_version_number,
            action="uploaded_version",
            actor_id=uploaded_by,
            comment=upload_comment
        )

        # Log version upload to requirement activity timeline
        log_requirement_activity(
            db=db,
            requirement_id=evidence.requirement_id,
            action_type="evidence_version_uploaded",
            actor_id=uploaded_by,
            description_ar=f"تم رفع نسخة جديدة من الدليل: {evidence.document_name} (الإصدار {new_version_number})",
            description_en=f"New version uploaded for evidence: {evidence.document_name} (Version {new_version_number})",
            comment=upload_comment,
            maturity_level=evidence.maturity_level
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

    # Create evidence activity log
    activity = EvidenceActivity(
        id=str(uuid.uuid4()),
        evidence_id=evidence_id,
        version_number=evidence.current_version,
        action=action,
        actor_id=actor_id,
        comment=action_request.comment
    )
    db.add(activity)

    # Get actor name for requirement activity log
    actor = db.query(User).filter(User.id == actor_id).first()
    actor_name = actor.full_name_ar if actor else "Unknown"

    # Log activity to requirement timeline
    action_texts = {
        "submit": ("تم إرسال الدليل للمراجعة", f"Evidence submitted for review: {evidence.document_name}"),
        "confirm": ("تم تأكيد الدليل", f"Evidence confirmed: {evidence.document_name}"),
        "approve": ("تم اعتماد الدليل", f"Evidence approved: {evidence.document_name}"),
        "reject": ("تم رفض الدليل", f"Evidence rejected: {evidence.document_name}")
    }

    if action in action_texts:
        desc_ar, desc_en = action_texts[action]
        log_requirement_activity(
            db=db,
            requirement_id=evidence.requirement_id,
            action_type=f"evidence_{action}ed",
            actor_id=actor_id,
            description_ar=f"{desc_ar}: {evidence.document_name}",
            description_en=f"{desc_en}",
            comment=action_request.comment,
            maturity_level=evidence.maturity_level
        )

    db.commit()
    db.refresh(evidence)

    # Create notifications for assigned users (except actor)
    assignments = db.query(Assignment).filter(Assignment.requirement_id == evidence.requirement_id).all()
    status_labels = {
        "submitted": "قيد المراجعة / Submitted",
        "confirmed": "مؤكد / Confirmed",
        "approved": "معتمد / Approved",
        "rejected": "مرفوض / Rejected"
    }

    for assignment in assignments:
        # Don't notify the actor who performed the action
        if assignment.user_id != actor_id:
            create_notification(
                db=db,
                user_id=assignment.user_id,
                notification_type=NotificationType.EVIDENCE_STATUS_CHANGED,
                title="تغيرت حالة دليل",
                message=f"تغيرت حالة الدليل '{evidence.document_name}' إلى: {status_labels.get(evidence.status, evidence.status)}",
                actor_id=actor_id,
                requirement_id=evidence.requirement_id,
                evidence_id=evidence_id
            )
    db.commit()

    return evidence


@router.delete("/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_evidence(
    evidence_id: str,
    actor_id: str,
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

    # Log deletion to requirement activity timeline before deleting
    log_requirement_activity(
        db=db,
        requirement_id=evidence.requirement_id,
        action_type="evidence_deleted",
        actor_id=actor_id,
        description_ar=f"تم حذف الدليل: {evidence.document_name}",
        description_en=f"Evidence deleted: {evidence.document_name}",
        comment=None,
        maturity_level=evidence.maturity_level
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



@router.api_route("/{evidence_id}/download/{version}", methods=["GET", "HEAD"], response_class=None)
async def download_evidence(
    evidence_id: str,
    version: int,
    db: Session = Depends(get_db)
):
    """
    Download a specific version of an evidence file
    """
    from fastapi.responses import FileResponse

    # Get evidence
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    # Get the specific version
    evidence_version = db.query(EvidenceVersion).filter(
        EvidenceVersion.evidence_id == evidence_id,
        EvidenceVersion.version_number == version
    ).first()

    if not evidence_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version} not found"
        )

    # Check if file exists
    if not os.path.exists(evidence_version.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )

    # Return file
    return FileResponse(
        path=evidence_version.file_path,
        filename=evidence_version.filename,
        media_type=evidence_version.mime_type or 'application/octet-stream'
    )




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


# ==== Copy Evidence from Previous Year ====

@router.post("/{evidence_id}/copy", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def copy_evidence(
    evidence_id: str,
    target_requirement_id: str,
    target_maturity_level: int,
    copied_by: str,
    db: Session = Depends(get_db)
):
    """
    Copy an evidence document to a new requirement.

    This is used to copy evidence from a previous year's requirement to the current year.
    The file is copied and a new Evidence record is created with draft status.

    Args:
        evidence_id: Source evidence ID to copy from
        target_requirement_id: Target requirement ID to copy to
        target_maturity_level: Maturity level for the new evidence
        copied_by: User ID who is copying the evidence
        db: Database session

    Returns:
        New Evidence record
    """
    try:
        # Get source evidence
        source_evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()

        if not source_evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source evidence not found"
            )

        # Get the latest version of the source evidence
        source_version = db.query(EvidenceVersion).filter(
            EvidenceVersion.evidence_id == evidence_id
        ).order_by(EvidenceVersion.version_number.desc()).first()

        if not source_version or not source_version.file_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source evidence has no file to copy"
            )

        # Check if source file exists
        if not os.path.exists(source_version.file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source evidence file not found on disk"
            )

        # Validate maturity level
        if target_maturity_level < 0 or target_maturity_level > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maturity level must be between 0 and 5"
            )

        # Generate new IDs
        new_evidence_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        activity_id = str(uuid.uuid4())

        # Create new directory for the copied evidence
        new_upload_dir = f"/app/uploads/evidence/{new_evidence_id}"
        os.makedirs(new_upload_dir, exist_ok=True)

        # Copy the file
        source_filename = os.path.basename(source_version.file_path)
        new_filename = f"v1_{source_evidence.document_name}_{os.path.splitext(source_filename)[1]}"
        new_file_path = os.path.join(new_upload_dir, new_filename)

        shutil.copy2(source_version.file_path, new_file_path)
        file_size = os.path.getsize(new_file_path)

        # Create new Evidence record
        new_evidence = Evidence(
            id=new_evidence_id,
            requirement_id=target_requirement_id,
            maturity_level=target_maturity_level,
            document_name=source_evidence.document_name,
            current_version=1,
            status="draft",
            uploaded_by=copied_by
        )

        # Create first version
        new_version = EvidenceVersion(
            id=version_id,
            evidence_id=new_evidence_id,
            version_number=1,
            filename=new_filename,
            file_path=new_file_path,
            file_size=file_size,
            mime_type=source_version.mime_type,
            uploaded_by=copied_by,
            upload_comment=f"Copied from previous year (source: {source_evidence.document_name})"
        )

        # Create activity log
        new_activity = EvidenceActivity(
            id=activity_id,
            evidence_id=new_evidence_id,
            version_number=1,
            action="uploaded_draft",
            actor_id=copied_by,
            comment=f"Copied from previous year evidence: {source_evidence.document_name}"
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
            detail="Database error: Invalid requirement ID or duplicate entry"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error copying evidence: {str(e)}"
        )
