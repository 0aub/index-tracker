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
from app.models.evidence import Evidence
from app.models.recommendation import Recommendation
from app.models.index import Index
from app.models.user import User
from datetime import datetime
import uuid

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
        query = query.filter(Requirement.index_id == index_id)

    if main_area_ar:
        query = query.filter(Requirement.main_area_ar == main_area_ar)

    results = query.order_by(Requirement.display_order).offset(skip).limit(limit).all()

    # Build response with evidence_count and recommendations_count
    requirements_with_count = []
    for req, evidence_count, recommendations_count in results:
        req_dict = {
            'id': req.id,
            'code': req.code,
            'question_ar': req.question_ar,
            'question_en': req.question_en,
            'main_area_ar': req.main_area_ar,
            'sub_domain_ar': req.sub_domain_ar,
            'element_ar': req.element_ar,
            'objective_ar': req.objective_ar,
            'evidence_description_ar': req.evidence_description_ar,
            'evidence_description_en': req.evidence_description_en,
            'answer_status': req.answer_status,
            'evidence_count': evidence_count,
            'recommendations_count': recommendations_count
        }
        requirements_with_count.append(req_dict)

    return requirements_with_count


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
    
    # Save answer
    requirement.answer_ar = answer_data.answer_ar
    requirement.answer_en = answer_data.answer_en
    requirement.answer_status = "draft"
    requirement.answered_by = user_id
    requirement.answered_at = datetime.utcnow()

    # Log activity
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

    # Find all requirements in the previous index with the same المعيار (sub_domain_ar)
    previous_requirements_in_standard = db.query(Requirement).filter(
        Requirement.index_id == previous_index.id,
        Requirement.sub_domain_ar == requirement.sub_domain_ar
    ).all()

    if not previous_requirements_in_standard:
        # No requirements in the same المعيار
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

        # Build evidence list
        evidence_list = [
            PreviousEvidenceResponse(
                id=e.id,
                document_name=e.document_name,
                status=e.status,
                current_version=e.current_version,
                created_at=e.created_at
            )
            for e in matched_evidence
        ]

        # Build recommendation data
        recommendation_data = None
        if matched_recommendation:
            recommendation_data = PreviousRecommendationResponse(
                id=matched_recommendation.id,
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
        standard_data = StandardGroupData(
            sub_domain_ar=requirement.sub_domain_ar,
            sub_domain_en=requirement.sub_domain_en,
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
