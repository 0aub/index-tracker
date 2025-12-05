"""
Section Mapping API endpoints
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.database import get_db
from app.models import SectionMapping, Index, Requirement, User, UserRole, IndexUser
from app.schemas.section_mapping import (
    SectionMappingCreate,
    SectionMappingUpdate,
    SectionMappingResponse,
    BulkSectionMappingCreate,
    SectionMappingListResponse,
    SectionComparisonResponse,
    SectionComparisonItem,
    ApplyMappingsRequest,
    ApplyMappingsResponse,
)
from app.api.dependencies import get_current_active_user
from app.utils.permissions import PermissionChecker

router = APIRouter(prefix="/section-mappings", tags=["Section Mappings"])


def check_mapping_permission(user: User, index_id: str, db: Session) -> bool:
    """Check if user can manage section mappings for an index"""
    # System admin can manage all
    if user.role == UserRole.ADMIN:
        return True

    # Check if user is owner of the index
    index_user = db.query(IndexUser).filter(
        and_(
            IndexUser.user_id == user.id,
            IndexUser.index_id == index_id,
            IndexUser.role == 'OWNER'
        )
    ).first()

    return index_user is not None


@router.get("/compare/{current_index_id}/{previous_index_id}", response_model=SectionComparisonResponse)
async def compare_sections(
    current_index_id: str,
    previous_index_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Compare sections between two indices to help with mapping.
    Returns all sections from both indices with mapping status.
    """
    # Verify indices exist
    current_index = db.query(Index).filter(Index.id == current_index_id).first()
    previous_index = db.query(Index).filter(Index.id == previous_index_id).first()

    if not current_index or not previous_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both indices not found"
        )

    # Check permission
    if not check_mapping_permission(current_user, current_index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view section mappings for this index"
        )

    # Get unique sections from both indices
    current_requirements = db.query(Requirement).filter(
        Requirement.index_id == current_index_id
    ).all()

    previous_requirements = db.query(Requirement).filter(
        Requirement.index_id == previous_index_id
    ).all()

    # Extract unique sections from current index
    current_sections = {}
    for req in current_requirements:
        if req.main_area_ar not in current_sections:
            current_sections[req.main_area_ar] = {
                'main_area_en': req.main_area_en,
                'elements': {},
                'sub_domains': set()
            }
        if req.element_ar:
            current_sections[req.main_area_ar]['elements'][req.element_ar] = req.element_en
        if req.sub_domain_ar:
            current_sections[req.main_area_ar]['sub_domains'].add(req.sub_domain_ar)

    # Extract unique sections from previous index
    previous_sections = {}
    for req in previous_requirements:
        if req.main_area_ar not in previous_sections:
            previous_sections[req.main_area_ar] = {
                'main_area_en': req.main_area_en,
                'elements': {},
                'sub_domains': set()
            }
        if req.element_ar:
            previous_sections[req.main_area_ar]['elements'][req.element_ar] = req.element_en
        if req.sub_domain_ar:
            previous_sections[req.main_area_ar]['sub_domains'].add(req.sub_domain_ar)

    # Get existing mappings
    existing_mappings = db.query(SectionMapping).filter(
        and_(
            SectionMapping.current_index_id == current_index_id,
            SectionMapping.previous_index_id == previous_index_id
        )
    ).all()

    # Create lookup for existing mappings
    mapping_lookup = {}
    for m in existing_mappings:
        key = f"{m.main_area_from_ar}|{m.element_from_ar or ''}|{m.sub_domain_from_ar or ''}"
        mapping_lookup[key] = m

    # Build comparison items
    comparisons: List[SectionComparisonItem] = []

    # Add all main areas from previous index
    for main_area_ar, data in previous_sections.items():
        key = f"{main_area_ar}||"
        mapping = mapping_lookup.get(key)

        comparisons.append(SectionComparisonItem(
            level='main_area',
            previous_value_ar=main_area_ar,
            previous_value_en=data['main_area_en'],
            current_value_ar=mapping.main_area_to_ar if mapping else None,
            current_value_en=mapping.main_area_to_en if mapping else None,
            is_mapped=mapping is not None,
            mapping_id=mapping.id if mapping else None
        ))

        # Add elements for this main area
        for element_ar, element_en in data['elements'].items():
            key = f"{main_area_ar}|{element_ar}|"
            mapping = mapping_lookup.get(key)

            comparisons.append(SectionComparisonItem(
                level='element',
                previous_value_ar=element_ar,
                previous_value_en=element_en,
                current_value_ar=mapping.element_to_ar if mapping else None,
                current_value_en=mapping.element_to_en if mapping else None,
                is_mapped=mapping is not None,
                mapping_id=mapping.id if mapping else None,
                parent_main_area_ar=main_area_ar
            ))

    return SectionComparisonResponse(
        current_index_id=current_index_id,
        previous_index_id=previous_index_id,
        current_index_name_ar=current_index.name_ar,
        previous_index_name_ar=previous_index.name_ar,
        comparisons=comparisons
    )


@router.get("/{current_index_id}", response_model=SectionMappingListResponse)
async def list_section_mappings(
    current_index_id: str,
    previous_index_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all section mappings for an index.
    Optionally filter by previous_index_id.
    """
    # Verify index exists
    current_index = db.query(Index).filter(Index.id == current_index_id).first()
    if not current_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Index not found"
        )

    # Build query
    query = db.query(SectionMapping).filter(
        SectionMapping.current_index_id == current_index_id
    )

    if previous_index_id:
        query = query.filter(SectionMapping.previous_index_id == previous_index_id)

    mappings = query.all()

    # Get previous index info if specified
    previous_index_name = None
    if previous_index_id:
        previous_index = db.query(Index).filter(Index.id == previous_index_id).first()
        if previous_index:
            previous_index_name = previous_index.name_ar

    return SectionMappingListResponse(
        mappings=[SectionMappingResponse.model_validate(m) for m in mappings],
        current_index_id=current_index_id,
        previous_index_id=previous_index_id or '',
        current_index_name_ar=current_index.name_ar,
        previous_index_name_ar=previous_index_name
    )


@router.post("/{current_index_id}", response_model=SectionMappingResponse, status_code=status.HTTP_201_CREATED)
async def create_section_mapping(
    current_index_id: str,
    previous_index_id: str,
    mapping_data: SectionMappingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new section mapping between two indices.
    """
    # Verify indices exist
    current_index = db.query(Index).filter(Index.id == current_index_id).first()
    previous_index = db.query(Index).filter(Index.id == previous_index_id).first()

    if not current_index or not previous_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both indices not found"
        )

    # Check permission
    if not check_mapping_permission(current_user, current_index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage section mappings for this index"
        )

    # Check if mapping already exists
    existing = db.query(SectionMapping).filter(
        and_(
            SectionMapping.current_index_id == current_index_id,
            SectionMapping.previous_index_id == previous_index_id,
            SectionMapping.main_area_from_ar == mapping_data.main_area_from_ar,
            SectionMapping.element_from_ar == mapping_data.element_from_ar,
            SectionMapping.sub_domain_from_ar == mapping_data.sub_domain_from_ar
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A mapping for this section already exists"
        )

    # Create mapping
    mapping = SectionMapping(
        id=f"sm_{uuid.uuid4().hex[:12]}",
        current_index_id=current_index_id,
        previous_index_id=previous_index_id,
        main_area_from_ar=mapping_data.main_area_from_ar,
        main_area_to_ar=mapping_data.main_area_to_ar,
        main_area_from_en=mapping_data.main_area_from_en,
        main_area_to_en=mapping_data.main_area_to_en,
        element_from_ar=mapping_data.element_from_ar,
        element_to_ar=mapping_data.element_to_ar,
        element_from_en=mapping_data.element_from_en,
        element_to_en=mapping_data.element_to_en,
        sub_domain_from_ar=mapping_data.sub_domain_from_ar,
        sub_domain_to_ar=mapping_data.sub_domain_to_ar,
        sub_domain_from_en=mapping_data.sub_domain_from_en,
        sub_domain_to_en=mapping_data.sub_domain_to_en,
        created_by=current_user.id
    )

    db.add(mapping)
    db.commit()
    db.refresh(mapping)

    return SectionMappingResponse.model_validate(mapping)


@router.post("/{current_index_id}/bulk", response_model=List[SectionMappingResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create_section_mappings(
    current_index_id: str,
    bulk_data: BulkSectionMappingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Bulk create section mappings between two indices.
    """
    # Verify indices exist
    current_index = db.query(Index).filter(Index.id == current_index_id).first()
    previous_index = db.query(Index).filter(Index.id == bulk_data.previous_index_id).first()

    if not current_index or not previous_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both indices not found"
        )

    # Check permission
    if not check_mapping_permission(current_user, current_index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage section mappings for this index"
        )

    created_mappings = []

    for mapping_data in bulk_data.mappings:
        # Check if mapping already exists
        existing = db.query(SectionMapping).filter(
            and_(
                SectionMapping.current_index_id == current_index_id,
                SectionMapping.previous_index_id == bulk_data.previous_index_id,
                SectionMapping.main_area_from_ar == mapping_data.main_area_from_ar,
                SectionMapping.element_from_ar == mapping_data.element_from_ar,
                SectionMapping.sub_domain_from_ar == mapping_data.sub_domain_from_ar
            )
        ).first()

        if existing:
            # Update existing mapping
            existing.main_area_to_ar = mapping_data.main_area_to_ar
            existing.main_area_to_en = mapping_data.main_area_to_en
            existing.element_to_ar = mapping_data.element_to_ar
            existing.element_to_en = mapping_data.element_to_en
            existing.sub_domain_to_ar = mapping_data.sub_domain_to_ar
            existing.sub_domain_to_en = mapping_data.sub_domain_to_en
            created_mappings.append(existing)
        else:
            # Create new mapping
            mapping = SectionMapping(
                id=f"sm_{uuid.uuid4().hex[:12]}",
                current_index_id=current_index_id,
                previous_index_id=bulk_data.previous_index_id,
                main_area_from_ar=mapping_data.main_area_from_ar,
                main_area_to_ar=mapping_data.main_area_to_ar,
                main_area_from_en=mapping_data.main_area_from_en,
                main_area_to_en=mapping_data.main_area_to_en,
                element_from_ar=mapping_data.element_from_ar,
                element_to_ar=mapping_data.element_to_ar,
                element_from_en=mapping_data.element_from_en,
                element_to_en=mapping_data.element_to_en,
                sub_domain_from_ar=mapping_data.sub_domain_from_ar,
                sub_domain_to_ar=mapping_data.sub_domain_to_ar,
                sub_domain_from_en=mapping_data.sub_domain_from_en,
                sub_domain_to_en=mapping_data.sub_domain_to_en,
                created_by=current_user.id
            )
            db.add(mapping)
            created_mappings.append(mapping)

    db.commit()

    # Refresh all created mappings
    for mapping in created_mappings:
        db.refresh(mapping)

    return [SectionMappingResponse.model_validate(m) for m in created_mappings]


@router.put("/{mapping_id}", response_model=SectionMappingResponse)
async def update_section_mapping(
    mapping_id: str,
    mapping_data: SectionMappingUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a section mapping.
    """
    mapping = db.query(SectionMapping).filter(SectionMapping.id == mapping_id).first()

    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section mapping not found"
        )

    # Check permission
    if not check_mapping_permission(current_user, mapping.current_index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage section mappings for this index"
        )

    # Update fields
    update_dict = mapping_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(mapping, field, value)

    db.commit()
    db.refresh(mapping)

    return SectionMappingResponse.model_validate(mapping)


@router.delete("/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section_mapping(
    mapping_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a section mapping.
    """
    mapping = db.query(SectionMapping).filter(SectionMapping.id == mapping_id).first()

    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section mapping not found"
        )

    # Check permission
    if not check_mapping_permission(current_user, mapping.current_index_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage section mappings for this index"
        )

    db.delete(mapping)
    db.commit()

    return None


@router.post("/{current_index_id}/suggest", response_model=List[SectionMappingCreate])
async def suggest_mappings(
    current_index_id: str,
    previous_index_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Suggest section mappings based on text similarity.
    Returns suggested mappings that can be reviewed and saved.
    """
    # Verify indices exist
    current_index = db.query(Index).filter(Index.id == current_index_id).first()
    previous_index = db.query(Index).filter(Index.id == previous_index_id).first()

    if not current_index or not previous_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both indices not found"
        )

    # Get unique sections from both indices
    current_requirements = db.query(Requirement).filter(
        Requirement.index_id == current_index_id
    ).all()

    previous_requirements = db.query(Requirement).filter(
        Requirement.index_id == previous_index_id
    ).all()

    # Extract unique main areas
    current_main_areas = set(r.main_area_ar for r in current_requirements)
    previous_main_areas = set(r.main_area_ar for r in previous_requirements)

    suggestions = []

    # Suggest exact matches for main areas
    for prev_area in previous_main_areas:
        if prev_area in current_main_areas:
            # Exact match
            suggestions.append(SectionMappingCreate(
                main_area_from_ar=prev_area,
                main_area_to_ar=prev_area
            ))
        else:
            # Try to find similar area (simple substring match for now)
            for curr_area in current_main_areas:
                if prev_area in curr_area or curr_area in prev_area:
                    suggestions.append(SectionMappingCreate(
                        main_area_from_ar=prev_area,
                        main_area_to_ar=curr_area
                    ))
                    break

    return suggestions
