"""
Recommendations router - upload and manage recommendations
"""
import uuid
from datetime import datetime
from typing import Optional
from difflib import SequenceMatcher
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
import openpyxl
import io

from app.database import get_db
from app.models import Recommendation, Requirement, Index
from app.schemas.recommendation import (
    RecommendationResponse,
    RecommendationUpdate,
    RecommendationUploadResult
)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def normalize_text(text: str) -> str:
    """Normalize Arabic text for matching"""
    if not text:
        return ""
    # Remove extra spaces and strip
    text = " ".join(text.split()).strip()

    # Arabic stop words to remove
    stop_words = {"على", "من", "في", "إلى", "بين", "مع", "عن", "الى", "فى"}

    words = text.split()
    normalized_words = []
    for word in words:
        # Skip stop words
        if word in stop_words:
            continue

        # Remove "ال" prefix if present
        if word.startswith("ال") and len(word) > 2:
            word = word[2:]
        # Remove "و" prefix if present
        if word.startswith("و") and len(word) > 1:
            word = word[1:]

        # Normalize alef variations
        word = word.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
        # Normalize teh marbuta
        word = word.replace("ة", "ه")

        normalized_words.append(word)
    return " ".join(normalized_words)


def similarity_score(text1: str, text2: str) -> float:
    """Calculate similarity between two texts"""
    norm1 = normalize_text(text1)
    norm2 = normalize_text(text2)
    return SequenceMatcher(None, norm1, norm2).ratio()


def find_matching_requirement(
    excel_row: dict,
    requirements: list[Requirement],
    threshold: float = 0.6
) -> Optional[Requirement]:
    """Find matching requirement using fuzzy text matching"""
    main_area = excel_row.get("main_area", "")
    element = excel_row.get("element", "")
    sub_element = excel_row.get("sub_element", "")

    best_match = None
    best_score = 0.0

    for req in requirements:
        # Calculate individual field scores
        main_score = similarity_score(main_area, req.main_area_ar or "")
        element_score = similarity_score(element, req.element_ar or "")
        sub_score = similarity_score(sub_element, req.sub_domain_ar or "")

        # For ETARI: element_ar is often empty, so adjust weights dynamically
        if not req.element_ar or not req.element_ar.strip():
            # If element is empty, give more weight to main_area and sub_domain
            combined_score = (main_score * 0.4 + sub_score * 0.6)
        else:
            # Standard weighted average for other indices
            combined_score = (main_score * 0.3 + element_score * 0.35 + sub_score * 0.35)

        if combined_score > best_score and combined_score >= threshold:
            best_score = combined_score
            best_match = req

    return best_match


@router.post("/upload/{index_id}", response_model=RecommendationUploadResult)
async def upload_recommendations(
    index_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload recommendations Excel file for an index

    Excel format:
    - القدرة (Capability/main_area_ar)
    - العنصر (Element/element_ar)
    - المعيار (Criteria/sub_domain_ar)
    - الوضع الراهن (Current Status)
    - التوصية (Recommendation)

    Note: Recommendations are applied to ALL requirements matching the same
    القدرة + العنصر + المعيار combination
    """
    # Check if index exists
    index = db.query(Index).filter(Index.id == index_id).first()
    if not index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Read Excel file
    try:
        contents = await file.read()
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        ws = wb.active
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read Excel file: {str(e)}"
        )

    # Get all requirements for this index
    requirements = db.query(Requirement).filter(
        Requirement.index_id == index_id
    ).all()

    if not requirements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Index has no requirements"
        )

    # Parse Excel rows (القدرة, العنصر, المعيار, الوضع الراهن, التوصية)
    excel_rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or not row[0]:  # Skip empty rows
            continue

        excel_rows.append({
            "main_area": (row[0] or "").strip(),  # القدرة → main_area_ar
            "element": (row[1] or "").strip(),     # العنصر → element_ar
            "sub_domain": (row[2] or "").strip(),  # المعيار → sub_domain_ar
            "current_status": (row[3] or "").strip(),  # الوضع الراهن
            "recommendation": (row[4] or "").strip()   # التوصية
        })

    # Match and create recommendations
    matched_requirements = []
    unmatched_rows = []
    created_count = 0
    updated_count = 0
    processed_requirements = set()  # Track requirements already processed in this batch

    for idx, excel_row in enumerate(excel_rows, start=2):
        if not excel_row["recommendation"]:
            continue

        # Find ALL requirements matching this القدرة + العنصر + المعيار combination
        # Use fuzzy matching with reasonable threshold
        matching_reqs = []
        best_match_info = {"score": 0, "req": None}

        for req in requirements:
            main_score = similarity_score(excel_row["main_area"], req.main_area_ar or "")
            element_score = similarity_score(excel_row["element"], req.element_ar or "")
            sub_score = similarity_score(excel_row["sub_domain"], req.sub_domain_ar or "")

            combined_score = (main_score + element_score + sub_score) / 3

            # Track best match for debugging
            if combined_score > best_match_info["score"]:
                best_match_info = {
                    "score": combined_score,
                    "req": req,
                    "main_score": main_score,
                    "element_score": element_score,
                    "sub_score": sub_score
                }

            # Match on all three fields with lower threshold to handle Arabic text variations
            # All three must meet the threshold for a match
            if main_score >= 0.70 and element_score >= 0.70 and sub_score >= 0.70:
                matching_reqs.append(req)

        if matching_reqs:
            # Create/update recommendations for ALL matching requirements
            for matched_req in matching_reqs:
                # Skip if already processed in this batch to avoid duplicates
                if matched_req.id in processed_requirements:
                    continue

                # Check if recommendation already exists
                existing_rec = db.query(Recommendation).filter(
                    Recommendation.requirement_id == matched_req.id,
                    Recommendation.index_id == index_id
                ).first()

                if existing_rec:
                    # Update existing recommendation
                    existing_rec.current_status_ar = excel_row["current_status"]
                    existing_rec.recommendation_ar = excel_row["recommendation"]
                    existing_rec.updated_at = datetime.utcnow()
                    updated_count += 1
                else:
                    # Create new recommendation
                    new_rec = Recommendation(
                        id=f"rec_{uuid.uuid4().hex[:12]}",
                        requirement_id=matched_req.id,
                        index_id=index_id,
                        current_status_ar=excel_row["current_status"],
                        recommendation_ar=excel_row["recommendation"],
                        status="pending",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_rec)
                    created_count += 1

                # Mark as processed
                processed_requirements.add(matched_req.id)

            matched_requirements.append({
                "row": idx,
                "main_area": excel_row["main_area"],
                "element": excel_row["element"],
                "sub_domain": excel_row["sub_domain"],
                "requirement_count": len(matching_reqs)
            })
        else:
            unmatched_rows.append({
                "row": idx,
                "main_area": excel_row["main_area"],
                "element": excel_row["element"],
                "sub_domain": excel_row["sub_domain"],
                "recommendation": excel_row["recommendation"][:100] + "..."
            })

    # Commit all changes
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save recommendations: {str(e)}"
        )

    return RecommendationUploadResult(
        total_rows=len(excel_rows),
        matched=len(matched_requirements),
        unmatched=len(unmatched_rows),
        created=created_count,
        updated=updated_count,
        matched_requirements=matched_requirements,
        unmatched_rows=unmatched_rows
    )


@router.get("/template")
async def download_template():
    """Download recommendations template Excel file"""
    from fastapi.responses import FileResponse
    import os

    template_path = "/app/templates/ETARI-2024-recommendations.xlsx"

    if not os.path.exists(template_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template file not found"
        )

    return FileResponse(
        path=template_path,
        filename="recommendations_template.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/requirement/{requirement_id}", response_model=RecommendationResponse)
async def get_recommendation_by_requirement(
    requirement_id: str,
    db: Session = Depends(get_db)
):
    """Get recommendation for a specific requirement"""
    recommendation = db.query(Recommendation).filter(
        Recommendation.requirement_id == requirement_id
    ).first()

    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recommendation found for this requirement"
        )

    return recommendation


@router.get("/index/{index_id}")
async def get_index_recommendations(
    index_id: str,
    db: Session = Depends(get_db)
):
    """Get all recommendations for an index, grouped by criteria (sub_domain)"""
    from sqlalchemy import func

    # Get all recommendations with their requirement details
    recommendations = db.query(
        Recommendation,
        Requirement.sub_domain_ar,
        Requirement.element_ar,
        Requirement.main_area_ar
    ).join(
        Requirement, Recommendation.requirement_id == Requirement.id
    ).filter(
        Recommendation.index_id == index_id
    ).order_by(
        Requirement.main_area_ar,
        Requirement.sub_domain_ar,
        Requirement.element_ar
    ).all()

    # Group by criteria (sub_domain_ar) for ETARI
    grouped = {}
    for rec, sub_domain, element, main_area in recommendations:
        key = f"{main_area}|{sub_domain}|{element}"
        if key not in grouped:
            grouped[key] = {
                "main_area_ar": main_area,
                "element_ar": element,
                "sub_domain_ar": sub_domain,
                "recommendations": []
            }
        grouped[key]["recommendations"].append({
            "id": rec.id,
            "requirement_id": rec.requirement_id,
            "current_status_ar": rec.current_status_ar,
            "recommendation_ar": rec.recommendation_ar,
            "status": rec.status,
            "created_at": rec.created_at,
            "updated_at": rec.updated_at
        })

    return {"recommendations": list(grouped.values())}


@router.post("/group")
async def create_recommendation_for_group(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    Create recommendation for ALL requirements matching main_area, element, and sub_domain

    Body should contain:
    - index_id: The index ID
    - main_area_ar: Main area in Arabic
    - element_ar: Element in Arabic
    - sub_domain_ar: Sub-domain/criteria in Arabic
    - current_status_ar: Current status text
    - recommendation_ar: Recommendation text
    """
    index_id = data.get("index_id")
    main_area_ar = data.get("main_area_ar")
    element_ar = data.get("element_ar")
    sub_domain_ar = data.get("sub_domain_ar")
    current_status_ar = data.get("current_status_ar")
    recommendation_ar = data.get("recommendation_ar")

    if not all([index_id, main_area_ar, element_ar, sub_domain_ar, current_status_ar, recommendation_ar]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All fields are required: index_id, main_area_ar, element_ar, sub_domain_ar, current_status_ar, recommendation_ar"
        )

    # Find ALL requirements matching the group
    matching_requirements = db.query(Requirement).filter(
        Requirement.index_id == index_id,
        Requirement.main_area_ar == main_area_ar,
        Requirement.element_ar == element_ar,
        Requirement.sub_domain_ar == sub_domain_ar
    ).all()

    if not matching_requirements:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No requirements found matching the specified criteria"
        )

    created_count = 0
    updated_count = 0

    for req in matching_requirements:
        # Check if recommendation already exists
        existing_rec = db.query(Recommendation).filter(
            Recommendation.requirement_id == req.id,
            Recommendation.index_id == index_id
        ).first()

        if existing_rec:
            # Update existing
            existing_rec.current_status_ar = current_status_ar
            existing_rec.recommendation_ar = recommendation_ar
            existing_rec.updated_at = datetime.utcnow()
            updated_count += 1
        else:
            # Create new
            new_rec = Recommendation(
                id=f"rec_{uuid.uuid4().hex[:12]}",
                requirement_id=req.id,
                index_id=index_id,
                current_status_ar=current_status_ar,
                recommendation_ar=recommendation_ar,
                status="pending",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_rec)
            created_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save recommendations: {str(e)}"
        )

    return {
        "requirements_count": len(matching_requirements),
        "created": created_count,
        "updated": updated_count,
        "message": f"Successfully applied recommendation to {len(matching_requirements)} requirements"
    }


@router.post("", response_model=RecommendationResponse)
async def create_recommendation_manual(
    requirement_id: str = Form(...),
    current_status_ar: str = Form(...),
    recommendation_ar: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create a recommendation manually for a requirement"""

    # Check if requirement exists
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found"
        )

    # Check if recommendation already exists
    existing_rec = db.query(Recommendation).filter(
        Recommendation.requirement_id == requirement_id,
        Recommendation.index_id == requirement.index_id
    ).first()

    if existing_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recommendation already exists for this requirement. Use update endpoint instead."
        )

    # Create new recommendation
    new_rec = Recommendation(
        id=f"rec_{uuid.uuid4().hex[:12]}",
        requirement_id=requirement_id,
        index_id=requirement.index_id,
        current_status_ar=current_status_ar,
        recommendation_ar=recommendation_ar,
        status="pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(new_rec)

    try:
        db.commit()
        db.refresh(new_rec)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create recommendation: {str(e)}"
        )

    return new_rec


@router.get("/{recommendation_id}", response_model=RecommendationResponse)
async def get_recommendation(
    recommendation_id: str,
    db: Session = Depends(get_db)
):
    """Get recommendation by ID"""
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id
    ).first()

    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )

    return recommendation


@router.patch("/{recommendation_id}", response_model=RecommendationResponse)
async def update_recommendation(
    recommendation_id: str,
    update_data: RecommendationUpdate,
    db: Session = Depends(get_db)
):
    """Update recommendation (mark as addressed, update status, etc.)"""
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id
    ).first()

    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        if field == "status" and value == "addressed" and not recommendation.addressed_at:
            # Mark as addressed (addressed_by will be set by frontend/user context)
            recommendation.addressed_at = datetime.utcnow()
        setattr(recommendation, field, value)

    recommendation.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(recommendation)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update recommendation: {str(e)}"
        )

    return recommendation


@router.delete("/{recommendation_id}")
async def delete_recommendation(
    recommendation_id: str,
    db: Session = Depends(get_db)
):
    """Delete recommendation"""
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id
    ).first()

    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )

    db.delete(recommendation)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete recommendation: {str(e)}"
        )

    return {"message": "Recommendation deleted successfully"}
