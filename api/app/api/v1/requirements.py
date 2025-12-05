"""
API endpoints for Requirement operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app.api.dependencies import get_current_active_user, get_permissions
from app.utils.permissions import PermissionChecker
from app.schemas.requirement import (
    RequirementResponse,
    RequirementMinimal,
    RequirementCreate,
    RequirementUpdate,
    AnswerSave,
    AnswerSubmitForReview,
    AnswerReview,
    RequirementActivityResponse,
    PreviousRequirementData,
    PreviousEvidenceResponse,
    PreviousRecommendationResponse,
    PreviousYearContextResponse,
    StandardGroupRequirement,
    StandardGroupData
)
from app.models.requirement import Requirement, MaturityLevel
from app.models.requirement_activity import RequirementActivity
from app.models.evidence import Evidence, EvidenceVersion
from app.models.recommendation import Recommendation
from app.models.index import Index
from app.models.user import User
from app.models.section_mapping import SectionMapping
from datetime import datetime
import uuid

router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.get("", response_model=List[RequirementMinimal])
async def list_requirements(
    index_id: Optional[str] = None,
    main_area_ar: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    permissions: PermissionChecker = Depends(get_permissions),
    db: Session = Depends(get_db)
):
    """
    List requirements with optional filtering

    Filtering based on user role:
    - ADMIN, OWNER, SUPERVISOR: See all requirements in their indices
    - CONTRIBUTOR: See only assigned requirements

    Args:
        index_id: Filter by index
        main_area_ar: Filter by main area
        skip: Number of records to skip
        limit: Maximum number of records
        permissions: Permission checker
        db: Database session

    Returns:
        List of requirements with evidence counts and recommendations counts
    """
    from sqlalchemy import func

    # Query requirements with evidence count and recommendations count
    query = db.query(
        Requirement,
        func.count(func.distinct(Evidence.id)).label('evidence_count'),
        func.count(func.distinct(Recommendation.id)).label('recommendations_count')
    ).outerjoin(
        Evidence, Evidence.requirement_id == Requirement.id
    ).outerjoin(
        Recommendation, Recommendation.requirement_id == Requirement.id
    ).group_by(Requirement.id)

    if index_id:
        # Check if user has access to this index
        permissions.require_index_access(index_id)
        query = query.filter(Requirement.index_id == index_id)

        # CRITICAL: Filter requirements based on user role within the index
        accessible_requirement_ids = permissions.get_accessible_requirement_ids(index_id)
        if accessible_requirement_ids:
            query = query.filter(Requirement.id.in_(accessible_requirement_ids))
        else:
            # User has no accessible requirements in this index
            return []
    else:
        # If no index_id specified, only show requirements from indices user has access to
        user_index_ids = permissions.get_user_index_ids()
        if not user_index_ids:
            return []
        query = query.filter(Requirement.index_id.in_(user_index_ids))

        # For Contributors, filter to only assigned requirements across all their indices
        if permissions.is_contributor:
            from app.models.assignment import Assignment
            assigned_req_ids = db.query(Assignment.requirement_id).filter(
                Assignment.user_id == permissions.user.id
            ).all()
            assigned_req_ids = [r[0] for r in assigned_req_ids]
            if assigned_req_ids:
                query = query.filter(Requirement.id.in_(assigned_req_ids))
            else:
                return []

    if main_area_ar:
        query = query.filter(Requirement.main_area_ar == main_area_ar)

    results = query.order_by(Requirement.display_order).offset(skip).limit(limit).all()

    # Build response with evidence_count and recommendations_count
    requirements_with_count = []
    for req, evidence_count, recommendations_count in results:
        req_dict = {
            'id': req.id,
            'code': req.code,
            'display_order': req.display_order,
            'question_ar': req.question_ar,
            'question_en': req.question_en,
            'main_area_ar': req.main_area_ar,
            'sub_domain_ar': req.sub_domain_ar,
            'element_ar': req.element_ar,
            'objective_ar': req.objective_ar,
            'evidence_description_ar': req.evidence_description_ar,
            'evidence_description_en': req.evidence_description_en,
            'requires_evidence': req.requires_evidence,
            'answer_status': req.answer_status,
            'evidence_count': evidence_count,
            'recommendations_count': recommendations_count
        }
        requirements_with_count.append(req_dict)

    return requirements_with_count


@router.get("/{requirement_id}", response_model=RequirementResponse)
async def get_requirement(
    requirement_id: str,
    permissions: PermissionChecker = Depends(get_permissions),
    db: Session = Depends(get_db)
):
    """
    Get a specific requirement with all maturity levels, evidence, and criteria

    Args:
        requirement_id: Requirement ID
        permissions: Permission checker
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

    # Check if user has access to view this requirement
    permissions.require_index_access(requirement.index_id)

    # For Contributors, check if they're assigned to this specific requirement
    if permissions.is_contributor:
        accessible_req_ids = permissions.get_accessible_requirement_ids(requirement.index_id)
        if requirement_id not in accessible_req_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ليس لديك صلاحية للوصول إلى هذا المتطلب"  # You don't have access to this requirement
            )

    return requirement


@router.patch("/{requirement_id}", response_model=RequirementResponse)
async def update_requirement(
    requirement_id: str,
    requirement_update: RequirementUpdate,
    permissions: PermissionChecker = Depends(get_permissions),
    db: Session = Depends(get_db)
):
    """
    Update a requirement

    Permissions:
    - ADMIN: Can edit any requirement
    - OWNER/SUPERVISOR: Can edit requirements in their indices
    - CONTRIBUTOR: Cannot edit requirements

    Args:
        requirement_id: Requirement ID
        requirement_update: Fields to update
        permissions: Permission checker
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

    # Check if user can edit this requirement
    permissions.require_requirement_edit_access(requirement_id)

    # Update fields
    update_data = requirement_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(requirement, field, value)

    db.commit()
    db.refresh(requirement)

    return requirement

# ETARI Answer Management Endpoints

@router.patch("/{requirement_id}/answer", response_model=RequirementResponse)
async def save_answer(
    requirement_id: str,
    answer_data: AnswerSave,
    user_id: str,  # TODO: Get from auth
    db: Session = Depends(get_db)
):
    """
    Save answer for an ETARI requirement

    Args:
        requirement_id: Requirement ID
        answer_data: Answer text
        user_id: User ID (from auth)
        db: Database session

    Returns:
        Updated requirement with answer
    """
    
    requirement = db.query(Requirement).options(
        joinedload(Requirement.maturity_levels)
    ).filter(Requirement.id == requirement_id).first()
    
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )
    
    # Check if this is a modification (answer already exists)
    is_modification = requirement.answer_ar is not None and requirement.answer_ar != ""

    # Save answer
    requirement.answer_ar = answer_data.answer_ar
    requirement.answer_en = answer_data.answer_en
    requirement.answer_status = "draft"
    requirement.answered_by = user_id
    requirement.answered_at = datetime.utcnow()

    # Log activity
    if is_modification:
        log_requirement_activity(
            db=db,
            requirement_id=requirement_id,
            action_type="answer_modified",
            actor_id=user_id,
            description_ar="تم تعديل الإجابة",
            description_en="Answer modified"
        )
    else:
        log_requirement_activity(
            db=db,
            requirement_id=requirement_id,
            action_type="answer_saved",
            actor_id=user_id,
            description_ar="تم حفظ الإجابة كمسودة",
            description_en="Answer saved as draft"
        )

    db.commit()
    db.refresh(requirement)

    return requirement


@router.post("/{requirement_id}/submit-for-review", response_model=RequirementResponse)
async def submit_answer_for_review(
    requirement_id: str,
    user_id: str,  # TODO: Get from auth
    db: Session = Depends(get_db)
):
    """
    Submit answer for review
    
    Args:
        requirement_id: Requirement ID
        user_id: User ID (from auth)
        db: Database session
    
    Returns:
        Updated requirement with pending_review status
    """
    requirement = db.query(Requirement).options(
        joinedload(Requirement.maturity_levels)
    ).filter(Requirement.id == requirement_id).first()
    
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )
    
    # Check if answer exists
    if not requirement.answer_ar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No answer to submit"
        )
    
    # Check if user is the one who answered
    if requirement.answered_by != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the person who answered can submit for review"
        )
    
    # Check current status
    if requirement.answer_status not in ["draft", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit answer with status: {requirement.answer_status}"
        )
    
    # Update status
    requirement.answer_status = "pending_review"

    # Log activity
    log_requirement_activity(
        db=db,
        requirement_id=requirement_id,
        action_type="answer_submitted",
        actor_id=user_id,
        description_ar="تم إرسال الإجابة للمراجعة",
        description_en="Answer submitted for review"
    )

    db.commit()
    db.refresh(requirement)

    return requirement


@router.post("/{requirement_id}/review", response_model=RequirementResponse)
async def review_answer(
    requirement_id: str,
    review_data: AnswerReview,
    reviewer_id: str,  # TODO: Get from auth and check permissions
    db: Session = Depends(get_db)
):
    """
    Review an answer (approve, reject, or request changes)

    Args:
        requirement_id: Requirement ID
        review_data: Review action and comments
        reviewer_id: Reviewer user ID (from auth)
        db: Database session

    Returns:
        Updated requirement with review status
    """
    
    requirement = db.query(Requirement).options(
        joinedload(Requirement.maturity_levels)
    ).filter(Requirement.id == requirement_id).first()
    
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )
    
    # Check if answer exists and is pending review
    if not requirement.answer_ar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No answer to review"
        )
    
    if requirement.answer_status != "pending_review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Answer is not pending review (current status: {requirement.answer_status})"
        )
    
    # Update based on action
    if review_data.action == "approve":
        requirement.answer_status = "approved"
        action_type = "answer_approved"
        description_ar = "تم الموافقة على الإجابة"
        description_en = "Answer approved"
    elif review_data.action == "reject":
        requirement.answer_status = "rejected"
        action_type = "answer_rejected"
        description_ar = "تم رفض الإجابة"
        description_en = "Answer rejected"
    elif review_data.action == "request_changes":
        requirement.answer_status = "draft"  # Send back to draft for changes
        action_type = "answer_changes_requested"
        description_ar = "تم طلب تعديلات على الإجابة"
        description_en = "Changes requested on answer"

    requirement.reviewed_by = reviewer_id
    requirement.reviewer_comment_ar = review_data.reviewer_comment_ar
    requirement.reviewer_comment_en = review_data.reviewer_comment_en
    requirement.reviewed_at = datetime.utcnow()

    # Log activity
    comment = review_data.reviewer_comment_ar or review_data.reviewer_comment_en
    log_requirement_activity(
        db=db,
        requirement_id=requirement_id,
        action_type=action_type,
        actor_id=reviewer_id,
        description_ar=description_ar,
        description_en=description_en,
        comment=comment
    )

    db.commit()
    db.refresh(requirement)

    return requirement


@router.post("/{requirement_id}/confirm-answer", response_model=RequirementResponse)
async def confirm_answer(
    requirement_id: str,
    reviewer_id: str,  # TODO: Get from auth and check permissions
    db: Session = Depends(get_db)
):
    """
    Confirm an approved answer (final step)

    Args:
        requirement_id: Requirement ID
        reviewer_id: Reviewer user ID (from auth)
        db: Database session

    Returns:
        Updated requirement with confirmed status
    """

    requirement = db.query(Requirement).options(
        joinedload(Requirement.maturity_levels)
    ).filter(Requirement.id == requirement_id).first()

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Check if answer exists and is approved
    if not requirement.answer_ar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No answer to confirm"
        )

    if requirement.answer_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Answer is not approved (current status: {requirement.answer_status})"
        )

    # Update to confirmed status
    requirement.answer_status = "confirmed"

    # Log activity
    log_requirement_activity(
        db=db,
        requirement_id=requirement_id,
        action_type="answer_confirmed",
        actor_id=reviewer_id,
        description_ar="تم تأكيد الإجابة",
        description_en="Answer confirmed"
    )

    db.commit()
    db.refresh(requirement)

    return requirement


@router.get("/{requirement_id}/activities", response_model=List[RequirementActivityResponse])
async def get_requirement_activities(
    requirement_id: str,
    db: Session = Depends(get_db)
):
    """
    Get activity history for a requirement

    Returns all activities (answer saves, submissions, reviews, evidence uploads, etc.)
    ordered by most recent first.

    Args:
        requirement_id: Requirement ID
        db: Database session

    Returns:
        List of activities
    """
    # Check if requirement exists
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Fetch activities with user information
    activities = db.query(RequirementActivity).filter(
        RequirementActivity.requirement_id == requirement_id
    ).order_by(RequirementActivity.created_at.desc()).all()

    # Build response with actor information
    result = []
    for activity in activities:
        actor = db.query(User).filter(User.id == activity.actor_id).first()
        activity_dict = {
            'id': activity.id,
            'requirement_id': activity.requirement_id,
            'maturity_level': activity.maturity_level,
            'action_type': activity.action_type,
            'actor_id': activity.actor_id,
            'actor_name': actor.full_name_ar if actor else None,
            'actor_name_en': actor.full_name_en if actor else None,
            'description_ar': activity.description_ar,
            'description_en': activity.description_en,
            'comment': activity.comment,
            'created_at': activity.created_at
        }
        result.append(activity_dict)

    return result


# Helper function to log activity
def log_requirement_activity(
    db: Session,
    requirement_id: str,
    action_type: str,
    actor_id: str,
    description_ar: str,
    description_en: str,
    comment: Optional[str] = None,
    maturity_level: Optional[int] = None
):
    """
    Helper function to log a requirement activity

    Args:
        db: Database session
        requirement_id: Requirement ID
        action_type: Type of action (answer_saved, answer_submitted, etc.)
        actor_id: User ID who performed the action
        description_ar: Description in Arabic
        description_en: Description in English
        comment: Optional comment
        maturity_level: Optional maturity level (for NAII)
    """
    activity = RequirementActivity(
        id=str(uuid.uuid4()),
        requirement_id=requirement_id,
        action_type=action_type,
        actor_id=actor_id,
        description_ar=description_ar,
        description_en=description_en,
        comment=comment,
        maturity_level=maturity_level,
        created_at=datetime.utcnow()
    )
    db.add(activity)
    # Note: commit should be done by the caller


@router.get("/{requirement_id}/previous-data", response_model=Optional[PreviousRequirementData])
async def get_previous_requirement_data(
    requirement_id: str,
    db: Session = Depends(get_db)
):
    """
    Get previous year's data for a requirement.

    This endpoint finds the matching requirement from the previous year's index
    and returns its answer, evidence, and recommendation.

    Requirements are matched by their code across indices.

    Args:
        requirement_id: Current requirement ID
        db: Database session

    Returns:
        Previous requirement data (answer, evidence, recommendation) or None if no previous data exists
    """
    # Get the current requirement
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Get the current index
    current_index = db.query(Index).filter(Index.id == requirement.index_id).first()
    if not current_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Check if there's a previous index
    if not current_index.previous_index_id:
        return None

    # Get the previous index
    previous_index = db.query(Index).filter(Index.id == current_index.previous_index_id).first()
    if not previous_index:
        return None

    # Find the matching requirement in the previous index by code
    previous_requirement = db.query(Requirement).filter(
        Requirement.index_id == previous_index.id,
        Requirement.code == requirement.code
    ).first()

    if not previous_requirement:
        return None

    # Get evidence for the previous requirement
    previous_evidence = db.query(Evidence).filter(
        Evidence.requirement_id == previous_requirement.id
    ).all()

    # Get recommendation for the previous requirement
    previous_recommendation = db.query(Recommendation).filter(
        Recommendation.requirement_id == previous_requirement.id,
        Recommendation.index_id == previous_index.id
    ).first()

    # Build the response
    evidence_list = [
        PreviousEvidenceResponse(
            id=e.id,
            document_name=e.document_name,
            status=e.status,
            current_version=e.current_version,
            created_at=e.created_at
        )
        for e in previous_evidence
    ]

    recommendation_data = None
    if previous_recommendation:
        recommendation_data = PreviousRecommendationResponse(
            id=previous_recommendation.id,
            recommendation_ar=previous_recommendation.recommendation_ar,
            recommendation_en=previous_recommendation.recommendation_en,
            status=previous_recommendation.status,
            addressed_comment=previous_recommendation.addressed_comment,
            created_at=previous_recommendation.created_at
        )

    return PreviousRequirementData(
        previous_requirement_id=previous_requirement.id,
        previous_index_id=previous_index.id,
        previous_index_name_ar=previous_index.name_ar,
        previous_index_name_en=previous_index.name_en,
        answer_ar=previous_requirement.answer_ar,
        answer_en=previous_requirement.answer_en,
        answer_status=previous_requirement.answer_status,
        answered_at=previous_requirement.answered_at,
        evidence=evidence_list,
        recommendation=recommendation_data
    )


@router.get("/{requirement_id}/recommendations", response_model=List[dict])
async def get_requirement_recommendations(
    requirement_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all recommendations for a specific requirement

    Args:
        requirement_id: Requirement ID
        db: Database session

    Returns:
        List of recommendations for the requirement
    """
    # Check if requirement exists
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Get all recommendations for this requirement
    recommendations = db.query(Recommendation).filter(
        Recommendation.requirement_id == requirement_id
    ).all()

    # Convert to dict format
    result = []
    for rec in recommendations:
        result.append({
            'id': rec.id,
            'requirement_id': rec.requirement_id,
            'index_id': rec.index_id,
            'current_status_ar': rec.current_status_ar,
            'current_status_en': rec.current_status_en,
            'recommendation_ar': rec.recommendation_ar,
            'recommendation_en': rec.recommendation_en,
            'status': rec.status,
            'addressed_comment': rec.addressed_comment,
            'addressed_by': rec.addressed_by,
            'addressed_at': rec.addressed_at,
            'created_at': rec.created_at,
            'updated_at': rec.updated_at
        })

    return result


@router.get("/{requirement_id}/previous-year-context", response_model=Optional[PreviousYearContextResponse])
async def get_previous_year_context(
    requirement_id: str,
    db: Session = Depends(get_db)
):
    """
    Get previous year's context for a requirement with intelligent matching.

    This endpoint automatically finds the previous year's index and attempts to match
    the current requirement with previous year requirements using question text similarity
    within the same المعيار (sub_domain_ar).

    Algorithm:
    1. Extract year from current index code (e.g., ETARI-2025 → 2025)
    2. Find previous year index by code pattern (ETARI-2024)
    3. Try to match requirement by question text similarity within same المعيار
    4. If matched: Return specific requirement data (answer, evidence, recommendation)
    5. If not matched: Return all requirements from the المعيار group

    Args:
        requirement_id: Current requirement ID
        db: Database session

    Returns:
        Previous year context with matched or unmatched data, or None if no previous year exists
    """
    import re
    from difflib import SequenceMatcher

    def extract_year_from_code(index_code: str) -> Optional[int]:
        """Extract year from index code like 'ETARI-2025' -> 2025"""
        match = re.search(r'-(\d{4})$', index_code)
        if match:
            return int(match.group(1))
        # Try year at the beginning: '2025-ETARI'
        match = re.search(r'^(\d{4})-', index_code)
        if match:
            return int(match.group(1))
        return None

    def find_previous_year_index(current_code: str, current_year: int) -> Optional[str]:
        """Generate previous year index code"""
        previous_year = current_year - 1
        # Replace the year in the code
        return re.sub(r'\d{4}', str(previous_year), current_code)

    def compute_text_similarity(text1: str, text2: str) -> float:
        """Compute similarity between two Arabic texts (0.0 to 1.0)"""
        if not text1 or not text2:
            return 0.0
        # Clean and normalize
        t1 = text1.strip().lower()
        t2 = text2.strip().lower()
        return SequenceMatcher(None, t1, t2).ratio()

    def get_evidence_mime_type(evidence: Evidence) -> Optional[str]:
        """Get MIME type for an evidence from its current version"""
        version = db.query(EvidenceVersion).filter(
            EvidenceVersion.evidence_id == evidence.id,
            EvidenceVersion.version_number == evidence.current_version
        ).first()
        return version.mime_type if version else None

    # Get the current requirement
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Get the current index
    current_index = db.query(Index).filter(Index.id == requirement.index_id).first()
    if not current_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Extract year from current index code
    current_year = extract_year_from_code(current_index.code)
    if not current_year:
        # No year in code, can't find previous year
        return None

    # Generate previous year index code
    previous_index_code = find_previous_year_index(current_index.code, current_year)

    # Find previous year index
    previous_index = db.query(Index).filter(Index.code == previous_index_code).first()
    if not previous_index:
        # No previous year index found
        return None

    # ========================================================================
    # SECTION MAPPING LOOKUP
    # Check if there are section mappings from current index to previous index
    # The mappings store: current_index -> previous_index category name translations
    # ========================================================================

    # Get the sub_domain to search for in the previous index
    # By default, use the same name from current requirement
    previous_sub_domain_ar = requirement.sub_domain_ar
    previous_element_ar = requirement.element_ar
    previous_main_area_ar = requirement.main_area_ar

    # Look up section mappings (current -> previous)
    # Note: The mapping stores "from" = previous index values, "to" = current index values
    # So we need to find where "to" matches our current requirement values

    # First try to find a sub_domain level mapping
    if requirement.sub_domain_ar:
        sub_domain_mapping = db.query(SectionMapping).filter(
            SectionMapping.current_index_id == current_index.id,
            SectionMapping.previous_index_id == previous_index.id,
            SectionMapping.sub_domain_to_ar == requirement.sub_domain_ar
        ).first()

        if sub_domain_mapping:
            previous_sub_domain_ar = sub_domain_mapping.sub_domain_from_ar
            # Also use the mapped element and main_area if available
            if sub_domain_mapping.element_from_ar:
                previous_element_ar = sub_domain_mapping.element_from_ar
            if sub_domain_mapping.main_area_from_ar:
                previous_main_area_ar = sub_domain_mapping.main_area_from_ar

    # If no sub_domain mapping found, try element level mapping
    if previous_sub_domain_ar == requirement.sub_domain_ar and requirement.element_ar:
        element_mapping = db.query(SectionMapping).filter(
            SectionMapping.current_index_id == current_index.id,
            SectionMapping.previous_index_id == previous_index.id,
            SectionMapping.element_to_ar == requirement.element_ar,
            SectionMapping.sub_domain_to_ar == None
        ).first()

        if element_mapping:
            previous_element_ar = element_mapping.element_from_ar
            if element_mapping.main_area_from_ar:
                previous_main_area_ar = element_mapping.main_area_from_ar

    # If still no mapping, try main_area level mapping
    if previous_main_area_ar == requirement.main_area_ar and requirement.main_area_ar:
        main_area_mapping = db.query(SectionMapping).filter(
            SectionMapping.current_index_id == current_index.id,
            SectionMapping.previous_index_id == previous_index.id,
            SectionMapping.main_area_to_ar == requirement.main_area_ar,
            SectionMapping.element_to_ar == None,
            SectionMapping.sub_domain_to_ar == None
        ).first()

        if main_area_mapping:
            previous_main_area_ar = main_area_mapping.main_area_from_ar

    # ========================================================================
    # FIND PREVIOUS REQUIREMENTS
    # Use the mapped (or original) sub_domain_ar to find requirements
    # ========================================================================

    # Find all requirements in the previous index with the mapped المعيار (sub_domain_ar)
    previous_requirements_in_standard = db.query(Requirement).filter(
        Requirement.index_id == previous_index.id,
        Requirement.sub_domain_ar == previous_sub_domain_ar
    ).all()

    if not previous_requirements_in_standard:
        # No requirements in the same المعيار, even with mapping
        # Try a broader search using element_ar if available
        if previous_element_ar:
            previous_requirements_in_standard = db.query(Requirement).filter(
                Requirement.index_id == previous_index.id,
                Requirement.element_ar == previous_element_ar
            ).all()

        # If still nothing, try main_area_ar
        if not previous_requirements_in_standard and previous_main_area_ar:
            previous_requirements_in_standard = db.query(Requirement).filter(
                Requirement.index_id == previous_index.id,
                Requirement.main_area_ar == previous_main_area_ar
            ).all()

    if not previous_requirements_in_standard:
        # No requirements found even with fallbacks
        return None

    # Try to find matching requirement by question text similarity
    best_match = None
    best_similarity = 0.0
    similarity_threshold = 0.9  # 90% similarity threshold

    for prev_req in previous_requirements_in_standard:
        similarity = compute_text_similarity(requirement.question_ar, prev_req.question_ar)
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = prev_req

    # Determine if we have a good match
    is_matched = best_similarity >= similarity_threshold

    if is_matched and best_match:
        # CASE 1: Matched requirement found
        # Get evidence for the matched requirement
        matched_evidence = db.query(Evidence).filter(
            Evidence.requirement_id == best_match.id
        ).all()

        # Get recommendation for the matched requirement
        matched_recommendation = db.query(Recommendation).filter(
            Recommendation.requirement_id == best_match.id,
            Recommendation.index_id == previous_index.id
        ).first()

        # Build evidence list with mime_type
        evidence_list = [
            PreviousEvidenceResponse(
                id=e.id,
                document_name=e.document_name,
                status=e.status,
                current_version=e.current_version,
                mime_type=get_evidence_mime_type(e),
                created_at=e.created_at
            )
            for e in matched_evidence
        ]

        # Build recommendation data
        recommendation_data = None
        if matched_recommendation:
            recommendation_data = PreviousRecommendationResponse(
                id=matched_recommendation.id,
                current_status_ar=matched_recommendation.current_status_ar,
                current_status_en=matched_recommendation.current_status_en,
                recommendation_ar=matched_recommendation.recommendation_ar,
                recommendation_en=matched_recommendation.recommendation_en,
                status=matched_recommendation.status,
                addressed_comment=matched_recommendation.addressed_comment,
                created_at=matched_recommendation.created_at
            )

        # Build matched requirement response
        matched_req_data = StandardGroupRequirement(
            code=best_match.code,
            question_ar=best_match.question_ar,
            question_en=best_match.question_en,
            answer_ar=best_match.answer_ar,
            answer_en=best_match.answer_en,
            answer_status=best_match.answer_status,
            evidence=evidence_list
        )

        return PreviousYearContextResponse(
            matched=True,
            previous_index_code=previous_index.code,
            previous_index_name_ar=previous_index.name_ar,
            previous_index_name_en=previous_index.name_en,
            matched_requirement=matched_req_data,
            matched_recommendation=recommendation_data,
            standard_group=None
        )

    else:
        # CASE 2: No good match - return المعيار group data
        # Get recommendation for the المعيار (from first requirement in group)
        group_recommendation = None
        if previous_requirements_in_standard:
            first_req_id = previous_requirements_in_standard[0].id
            rec = db.query(Recommendation).filter(
                Recommendation.requirement_id == first_req_id,
                Recommendation.index_id == previous_index.id
            ).first()
            if rec:
                group_recommendation = PreviousRecommendationResponse(
                    id=rec.id,
                    current_status_ar=rec.current_status_ar,
                    current_status_en=rec.current_status_en,
                    recommendation_ar=rec.recommendation_ar,
                    recommendation_en=rec.recommendation_en,
                    status=rec.status,
                    addressed_comment=rec.addressed_comment,
                    created_at=rec.created_at
                )

        # Build list of all requirements in the group
        group_requirements = []
        for prev_req in previous_requirements_in_standard:
            # Get evidence for each requirement
            req_evidence = db.query(Evidence).filter(
                Evidence.requirement_id == prev_req.id
            ).all()

            evidence_list = [
                PreviousEvidenceResponse(
                    id=e.id,
                    document_name=e.document_name,
                    status=e.status,
                    current_version=e.current_version,
                    mime_type=get_evidence_mime_type(e),
                    created_at=e.created_at
                )
                for e in req_evidence
            ]

            group_requirements.append(StandardGroupRequirement(
                code=prev_req.code,
                question_ar=prev_req.question_ar,
                question_en=prev_req.question_en,
                answer_ar=prev_req.answer_ar,
                answer_en=prev_req.answer_en,
                answer_status=prev_req.answer_status,
                evidence=evidence_list
            ))

        # Build المعيار group data
        # Use the mapped previous_sub_domain_ar to show the actual previous year category name
        standard_data = StandardGroupData(
            sub_domain_ar=previous_sub_domain_ar,  # Use mapped name from previous index
            sub_domain_en=requirement.sub_domain_en,  # Keep current for display purposes
            recommendation=group_recommendation,
            requirements=group_requirements
        )

        return PreviousYearContextResponse(
            matched=False,
            previous_index_code=previous_index.code,
            previous_index_name_ar=previous_index.name_ar,
            previous_index_name_en=previous_index.name_en,
            matched_requirement=None,
            matched_recommendation=None,
            standard_group=standard_data
        )


# ==================== REQUIREMENT CRUD OPERATIONS ====================


@router.post("", response_model=RequirementResponse, status_code=status.HTTP_201_CREATED)
async def create_requirement(
    index_id: str,
    requirement_data: RequirementCreate,
    actor_id: str,
    permissions: PermissionChecker = Depends(get_permissions),
    db: Session = Depends(get_db)
):
    """
    Create a new requirement

    Only ADMIN, INDEX_MANAGER, and SECTION_COORDINATOR can create requirements

    Auto-generation features:
    - If code is not provided, it will be auto-generated based on position in group
    - If display_order is not provided, it will be appended at the end
    - sub_domain is auto-set to element value
    """
    from sqlalchemy import func

    # Check permissions - only supervisors and admins can create requirements
    if not permissions.can_manage_requirements(index_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and supervisors can create requirements"
        )

    # Verify index exists
    index = db.query(Index).filter(Index.id == index_id).first()
    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Auto-generate code if not provided
    if not requirement_data.code:
        # Count existing requirements in same main_area/element group
        count_query = db.query(func.count(Requirement.id)).filter(
            Requirement.index_id == index_id,
            Requirement.main_area_ar == requirement_data.main_area_ar
        )

        # If element is specified, count within that element group
        if requirement_data.element_ar:
            count_query = count_query.filter(Requirement.element_ar == requirement_data.element_ar)

        existing_count = count_query.scalar() or 0
        requirement_code = f"{existing_count + 1}"
    else:
        requirement_code = requirement_data.code

        # Check if code already exists in this index
        existing = db.query(Requirement).filter(
            Requirement.index_id == index_id,
            Requirement.code == requirement_code
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requirement with code '{requirement_code}' already exists in this index"
            )

    # Auto-calculate display_order if not provided
    if requirement_data.display_order is None:
        # Append at the end - get max display_order and add 1
        max_order = db.query(func.max(Requirement.display_order)).filter(
            Requirement.index_id == index_id
        ).scalar() or 0
        display_order = max_order + 1
    else:
        display_order = requirement_data.display_order
        # Smart insertion: shift display_order of subsequent requirements
        db.query(Requirement).filter(
            Requirement.index_id == index_id,
            Requirement.display_order >= display_order
        ).update({
            Requirement.display_order: Requirement.display_order + 1
        }, synchronize_session=False)

    # Auto-set sub_domain to element value
    sub_domain_ar = requirement_data.element_ar or requirement_data.main_area_ar
    sub_domain_en = requirement_data.element_en or requirement_data.main_area_en

    # Create the new requirement
    new_requirement = Requirement(
        id=str(uuid.uuid4()),
        index_id=index_id,
        code=requirement_code,
        question_ar=requirement_data.question_ar,
        question_en=requirement_data.question_en,
        main_area_ar=requirement_data.main_area_ar,
        main_area_en=requirement_data.main_area_en,
        sub_domain_ar=sub_domain_ar,
        sub_domain_en=sub_domain_en,
        element_ar=requirement_data.element_ar,
        element_en=requirement_data.element_en,
        objective_ar=requirement_data.objective_ar,
        objective_en=requirement_data.objective_en,
        evidence_description_ar=requirement_data.evidence_description_ar,
        evidence_description_en=requirement_data.evidence_description_en,
        requires_evidence=requirement_data.requires_evidence,
        display_order=display_order
    )

    db.add(new_requirement)

    # Log activity
    log_requirement_activity(
        db=db,
        requirement_id=new_requirement.id,
        action_type="requirement_created",
        actor_id=actor_id,
        description_ar=f"تم إنشاء المتطلب {requirement_code}",
        description_en=f"Requirement {requirement_code} created"
    )

    db.commit()
    db.refresh(new_requirement)

    # Return with maturity levels (empty for new requirement)
    return new_requirement


@router.patch("/{requirement_id}", response_model=RequirementResponse)
async def update_requirement(
    requirement_id: str,
    update_data: RequirementUpdate,
    actor_id: str,
    permissions: PermissionChecker = Depends(get_permissions),
    db: Session = Depends(get_db)
):
    """
    Update an existing requirement

    Only ADMIN, INDEX_MANAGER, and SECTION_COORDINATOR can update requirements

    Note: Changing display_order will automatically shift other requirements
    """
    # Get the requirement
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Check permissions
    if not permissions.can_manage_requirements(requirement.index_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and supervisors can update requirements"
        )

    # If code is being changed, check uniqueness
    if update_data.code and update_data.code != requirement.code:
        existing = db.query(Requirement).filter(
            Requirement.index_id == requirement.index_id,
            Requirement.code == update_data.code,
            Requirement.id != requirement_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requirement with code '{update_data.code}' already exists in this index"
            )

    # Handle display_order change (reordering)
    old_order = requirement.display_order
    new_order = update_data.display_order

    if new_order is not None and new_order != old_order:
        # Moving up (to a lower number)
        if new_order < old_order:
            # Shift down all requirements between new_order and old_order
            db.query(Requirement).filter(
                Requirement.index_id == requirement.index_id,
                Requirement.display_order >= new_order,
                Requirement.display_order < old_order,
                Requirement.id != requirement_id
            ).update({
                Requirement.display_order: Requirement.display_order + 1
            }, synchronize_session=False)
        # Moving down (to a higher number)
        else:
            # Shift up all requirements between old_order and new_order
            db.query(Requirement).filter(
                Requirement.index_id == requirement.index_id,
                Requirement.display_order > old_order,
                Requirement.display_order <= new_order,
                Requirement.id != requirement_id
            ).update({
                Requirement.display_order: Requirement.display_order - 1
            }, synchronize_session=False)

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(requirement, field, value)

    # Log activity
    log_requirement_activity(
        db=db,
        requirement_id=requirement_id,
        action_type="requirement_updated",
        actor_id=actor_id,
        description_ar="تم تحديث المتطلب",
        description_en="Requirement updated"
    )

    db.commit()
    db.refresh(requirement)

    return requirement


@router.delete("/{requirement_id}", status_code=status.HTTP_200_OK)
async def delete_requirement(
    requirement_id: str,
    actor_id: str,
    force: bool = False,
    permissions: PermissionChecker = Depends(get_permissions),
    db: Session = Depends(get_db)
):
    """
    Delete a requirement

    Only ADMIN, INDEX_MANAGER, and SECTION_COORDINATOR can delete requirements

    Args:
        force: If False (default), will fail if requirement has data (answers, evidence, etc.)
               If True, will delete requirement and all associated data (cascade)

    Returns:
        Success message with information about what was deleted
    """
    # Get the requirement
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Check permissions
    if not permissions.can_manage_requirements(requirement.index_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and supervisors can delete requirements"
        )

    # Check if requirement has data
    has_answer = requirement.answer_ar is not None
    evidence_count = db.query(Evidence).filter(Evidence.requirement_id == requirement_id).count()
    recommendation_count = db.query(Recommendation).filter(Recommendation.requirement_id == requirement_id).count()

    has_data = has_answer or evidence_count > 0 or recommendation_count > 0

    if has_data and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Requirement has associated data. Use force=true to delete anyway.",
                "has_answer": has_answer,
                "evidence_count": evidence_count,
                "recommendation_count": recommendation_count
            }
        )

    # Store info for response
    code = requirement.code
    display_order = requirement.display_order
    index_id = requirement.index_id

    # Delete the requirement (cascade will handle related data)
    db.delete(requirement)

    # Shift up all subsequent requirements to fill the gap
    db.query(Requirement).filter(
        Requirement.index_id == index_id,
        Requirement.display_order > display_order
    ).update({
        Requirement.display_order: Requirement.display_order - 1
    }, synchronize_session=False)

    db.commit()

    return {
        "message": "Requirement deleted successfully",
        "deleted_code": code,
        "deleted_answer": has_answer,
        "deleted_evidence_count": evidence_count,
        "deleted_recommendation_count": recommendation_count
    }


@router.post("/reorder", status_code=status.HTTP_200_OK)
async def reorder_requirements(
    index_id: str,
    requirement_id: str,
    direction: str,  # "up" or "down"
    actor_id: str,
    permissions: PermissionChecker = Depends(get_permissions),
    db: Session = Depends(get_db)
):
    """
    Reorder a requirement up or down by one position

    Only ADMIN, INDEX_MANAGER, and SECTION_COORDINATOR can reorder requirements

    Args:
        index_id: The index containing the requirement
        requirement_id: The requirement to move
        direction: "up" (decrease display_order) or "down" (increase display_order)
        actor_id: User performing the action
    """
    if direction not in ["up", "down"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direction must be 'up' or 'down'"
        )

    # Check permissions
    if not permissions.can_manage_requirements(index_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and supervisors can reorder requirements"
        )

    # Get the requirement
    requirement = db.query(Requirement).filter(
        Requirement.id == requirement_id,
        Requirement.index_id == index_id
    ).first()

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    current_order = requirement.display_order

    if direction == "up":
        # Find the requirement immediately above
        target = db.query(Requirement).filter(
            Requirement.index_id == index_id,
            Requirement.display_order < current_order
        ).order_by(Requirement.display_order.desc()).first()

        if not target:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requirement is already at the top"
            )

        # Swap display_order
        target_order = target.display_order
        requirement.display_order = target_order
        target.display_order = current_order

    else:  # down
        # Find the requirement immediately below
        target = db.query(Requirement).filter(
            Requirement.index_id == index_id,
            Requirement.display_order > current_order
        ).order_by(Requirement.display_order.asc()).first()

        if not target:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requirement is already at the bottom"
            )

        # Swap display_order
        target_order = target.display_order
        requirement.display_order = target_order
        target.display_order = current_order

    # Log activity
    log_requirement_activity(
        db=db,
        requirement_id=requirement_id,
        action_type="requirement_reordered",
        actor_id=actor_id,
        description_ar=f"تم إعادة ترتيب المتطلب ({direction})",
        description_en=f"Requirement reordered ({direction})"
    )

    db.commit()

    return {
        "message": "Requirement reordered successfully",
        "old_order": current_order,
        "new_order": requirement.display_order
    }


@router.get("/sections/{index_id}")
async def get_sections(
    index_id: str,
    permissions: PermissionChecker = Depends(get_permissions),
    db: Session = Depends(get_db)
):
    """
    Get unique sections/domains for autocomplete in requirement form

    Returns distinct values for:
    - main_area_ar / main_area_en
    - sub_domain_ar / sub_domain_en
    - element_ar / element_en with relationships to main_areas
    """
    # Check access to index
    permissions.require_index_access(index_id)

    # Get all unique sections from existing requirements in this index
    requirements = db.query(Requirement).filter(Requirement.index_id == index_id).all()

    # Collect unique values
    main_areas = set()
    sub_domains = set()
    elements = set()

    # Build relationship maps:
    # main_area -> list of elements
    # element -> list of sub_domains
    main_area_to_elements = {}
    element_to_sub_domains = {}

    for req in requirements:
        if req.main_area_ar:
            main_areas.add((req.main_area_ar, req.main_area_en or ""))

            # Build main_area -> elements relationship
            if req.element_ar:
                if req.main_area_ar not in main_area_to_elements:
                    main_area_to_elements[req.main_area_ar] = set()
                main_area_to_elements[req.main_area_ar].add((req.element_ar, req.element_en or ""))

                # Build element -> sub_domains relationship
                if req.sub_domain_ar:
                    if req.element_ar not in element_to_sub_domains:
                        element_to_sub_domains[req.element_ar] = set()
                    element_to_sub_domains[req.element_ar].add((req.sub_domain_ar, req.sub_domain_en or ""))

        if req.sub_domain_ar:
            sub_domains.add((req.sub_domain_ar, req.sub_domain_en or ""))
        if req.element_ar:
            elements.add((req.element_ar, req.element_en or ""))

    # Convert relationship maps to list format
    main_areas_with_elements = []
    for ar, en in sorted(main_areas):
        elements_for_area = []
        if ar in main_area_to_elements:
            # For each element in this main_area, include its sub_domains
            for el_ar, el_en in sorted(main_area_to_elements[ar]):
                sub_domains_for_element = []
                if el_ar in element_to_sub_domains:
                    sub_domains_for_element = [
                        {"ar": sd_ar, "en": sd_en}
                        for sd_ar, sd_en in sorted(element_to_sub_domains[el_ar])
                    ]

                elements_for_area.append({
                    "ar": el_ar,
                    "en": el_en,
                    "sub_domains": sub_domains_for_element
                })

        main_areas_with_elements.append({
            "ar": ar,
            "en": en,
            "elements": elements_for_area
        })

    return {
        "main_areas": main_areas_with_elements,
        "sub_domains": [{"ar": ar, "en": en} for ar, en in sorted(sub_domains)],
        "elements": [{"ar": ar, "en": en} for ar, en in sorted(elements)]
    }
