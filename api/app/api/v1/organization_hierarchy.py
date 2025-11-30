"""
API endpoints for managing organizational hierarchy
(Agencies, General Managements, Departments)
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import uuid

from app.database import get_db
from app.models.agency import Agency
from app.models.general_management import GeneralManagement
from app.models.department import Department
from app.schemas.organization_hierarchy import (
    AgencyCreate, AgencyUpdate, AgencyResponse, AgencyWithChildren,
    GeneralManagementCreate, GeneralManagementUpdate, GeneralManagementResponse, GeneralManagementWithChildren,
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    OrganizationalHierarchy
)

router = APIRouter(prefix="/organization-hierarchy", tags=["Organization Hierarchy"])


# ===== Agency Endpoints =====

@router.get("/agencies", response_model=List[AgencyResponse])
def list_agencies(
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """Get list of all agencies"""
    query = db.query(Agency)

    if is_active is not None:
        query = query.filter(Agency.is_active == is_active)

    agencies = query.order_by(Agency.display_order, Agency.name_ar).all()
    return agencies


@router.get("/agencies/{agency_id}", response_model=AgencyWithChildren)
def get_agency(
    agency_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific agency with its general managements"""
    agency = db.query(Agency).filter(Agency.id == agency_id).first()

    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    return agency


@router.post("/agencies", response_model=AgencyResponse, status_code=201)
def create_agency(
    agency_data: AgencyCreate,
    db: Session = Depends(get_db)
):
    """Create a new agency"""
    # Check if code already exists
    existing = db.query(Agency).filter(Agency.code == agency_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Agency with code '{agency_data.code}' already exists")

    # Create new agency
    agency = Agency(
        id=str(uuid.uuid4()),
        **agency_data.model_dump()
    )

    db.add(agency)
    db.commit()
    db.refresh(agency)

    return agency


@router.put("/agencies/{agency_id}", response_model=AgencyResponse)
def update_agency(
    agency_id: str,
    agency_data: AgencyUpdate,
    db: Session = Depends(get_db)
):
    """Update an agency"""
    agency = db.query(Agency).filter(Agency.id == agency_id).first()

    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    # Update fields
    update_data = agency_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agency, field, value)

    db.commit()
    db.refresh(agency)

    return agency


@router.delete("/agencies/{agency_id}", status_code=204)
def delete_agency(
    agency_id: str,
    db: Session = Depends(get_db)
):
    """Delete an agency (soft delete by setting is_active to False)"""
    agency = db.query(Agency).filter(Agency.id == agency_id).first()

    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    # Soft delete
    agency.is_active = False
    db.commit()

    return None


# ===== General Management Endpoints =====

@router.get("/general-managements", response_model=List[GeneralManagementResponse])
def list_general_managements(
    agency_id: str = Query(None, description="Filter by agency ID"),
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """Get list of general managements"""
    query = db.query(GeneralManagement)

    if agency_id:
        query = query.filter(GeneralManagement.agency_id == agency_id)

    if is_active is not None:
        query = query.filter(GeneralManagement.is_active == is_active)

    gms = query.order_by(GeneralManagement.display_order, GeneralManagement.name_ar).all()
    return gms


@router.get("/general-managements/{gm_id}", response_model=GeneralManagementWithChildren)
def get_general_management(
    gm_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific general management with its departments"""
    gm = db.query(GeneralManagement).filter(GeneralManagement.id == gm_id).first()

    if not gm:
        raise HTTPException(status_code=404, detail="General Management not found")

    return gm


@router.post("/general-managements", response_model=GeneralManagementResponse, status_code=201)
def create_general_management(
    gm_data: GeneralManagementCreate,
    db: Session = Depends(get_db)
):
    """Create a new general management"""
    # Verify agency exists
    agency = db.query(Agency).filter(Agency.id == gm_data.agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    # Check if code already exists
    existing = db.query(GeneralManagement).filter(GeneralManagement.code == gm_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"General Management with code '{gm_data.code}' already exists")

    # Create new general management
    gm = GeneralManagement(
        id=str(uuid.uuid4()),
        **gm_data.model_dump()
    )

    db.add(gm)
    db.commit()
    db.refresh(gm)

    return gm


@router.put("/general-managements/{gm_id}", response_model=GeneralManagementResponse)
def update_general_management(
    gm_id: str,
    gm_data: GeneralManagementUpdate,
    db: Session = Depends(get_db)
):
    """Update a general management"""
    gm = db.query(GeneralManagement).filter(GeneralManagement.id == gm_id).first()

    if not gm:
        raise HTTPException(status_code=404, detail="General Management not found")

    # Update fields
    update_data = gm_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(gm, field, value)

    db.commit()
    db.refresh(gm)

    return gm


@router.delete("/general-managements/{gm_id}", status_code=204)
def delete_general_management(
    gm_id: str,
    db: Session = Depends(get_db)
):
    """Delete a general management (soft delete)"""
    gm = db.query(GeneralManagement).filter(GeneralManagement.id == gm_id).first()

    if not gm:
        raise HTTPException(status_code=404, detail="General Management not found")

    # Soft delete
    gm.is_active = False
    db.commit()

    return None


# ===== Department Endpoints =====

@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    general_management_id: str = Query(None, description="Filter by general management ID"),
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """Get list of departments"""
    query = db.query(Department)

    if general_management_id:
        query = query.filter(Department.general_management_id == general_management_id)

    if is_active is not None:
        query = query.filter(Department.is_active == is_active)

    departments = query.order_by(Department.display_order, Department.name_ar).all()
    return departments


@router.get("/departments/{dept_id}", response_model=DepartmentResponse)
def get_department(
    dept_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific department"""
    dept = db.query(Department).filter(Department.id == dept_id).first()

    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    return dept


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
def create_department(
    dept_data: DepartmentCreate,
    db: Session = Depends(get_db)
):
    """Create a new department"""
    # Verify general management exists
    gm = db.query(GeneralManagement).filter(GeneralManagement.id == dept_data.general_management_id).first()
    if not gm:
        raise HTTPException(status_code=404, detail="General Management not found")

    # Check if code already exists
    existing = db.query(Department).filter(Department.code == dept_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Department with code '{dept_data.code}' already exists")

    # Create new department
    dept = Department(
        id=str(uuid.uuid4()),
        **dept_data.model_dump()
    )

    db.add(dept)
    db.commit()
    db.refresh(dept)

    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: str,
    dept_data: DepartmentUpdate,
    db: Session = Depends(get_db)
):
    """Update a department"""
    dept = db.query(Department).filter(Department.id == dept_id).first()

    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Update fields
    update_data = dept_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dept, field, value)

    db.commit()
    db.refresh(dept)

    return dept


@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(
    dept_id: str,
    db: Session = Depends(get_db)
):
    """Delete a department (soft delete)"""
    dept = db.query(Department).filter(Department.id == dept_id).first()

    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Soft delete
    dept.is_active = False
    db.commit()

    return None


# ===== Complete Hierarchy =====

@router.get("/complete")
def get_complete_hierarchy(
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """Get complete organizational hierarchy (all agencies with their GMs and departments)"""
    # Eager load general_managements and their departments
    query = db.query(Agency).options(
        joinedload(Agency.general_managements).joinedload(GeneralManagement.departments)
    )

    if is_active is not None:
        query = query.filter(Agency.is_active == is_active)

    agencies = query.order_by(Agency.display_order, Agency.name_ar).all()

    # Manually build response to ensure all nested relationships are included
    result = {
        "agencies": [
            {
                **AgencyResponse.model_validate(agency).model_dump(),
                "general_managements": [
                    {
                        **GeneralManagementResponse.model_validate(gm).model_dump(),
                        "departments": [
                            DepartmentResponse.model_validate(dept).model_dump()
                            for dept in gm.departments
                        ]
                    }
                    for gm in agency.general_managements
                ]
            }
            for agency in agencies
        ]
    }

    return result
