"""
User Management API Endpoints
For creating users, managing roles, and handling first-time setup
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
import bcrypt
import uuid
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.index_user import IndexUser
from app.models.index import Index
from app.models.agency import Agency
from app.models.general_management import GeneralManagement
from app.models.department import Department
from app.models.organization import Organization
from app.schemas.user_management import (
    UserCreateRequest, UserCreateResponse,
    CompleteSetupRequest, CompleteSetupResponse,
    ChangePasswordRequest, ChangePasswordResponse,
    UserWithIndexRoles, UserIndexRole,
    ResetPasswordRequest, ResetPasswordResponse,
    UpdateUserStatusRequest, UpdateUserStatusResponse
)
from app.utils.password_generator import generate_temp_password, validate_password_strength
from app.services.email_service import email_service
from app.config import settings
from app.api.dependencies import require_admin, get_current_user

router = APIRouter(prefix="/user-management", tags=["User Management"])


# ===== User Creation =====

@router.post("/users", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new user (Admin only)

    Creates a user account with:
    - Generated temporary password
    - Email notification with credentials
    - First-login flag set to True
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email {user_data.email} already exists"
        )

    # Get default organization
    org = db.query(Organization).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No organization found")

    # Generate temporary password
    temp_password = generate_temp_password()
    hashed_password = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Create user with no role (role is assigned per index when user is added to an index)
    # User is inactive by default until they complete first-time setup
    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        username=user_data.email,  # Use email as username
        email=user_data.email,
        hashed_password=hashed_password,
        full_name_ar="مستخدم جديد",  # Placeholder, will be updated on first login
        full_name_en="New User",
        role=UserRole.UNASSIGNED,  # No role until assigned to an index
        organization_id=org.id,
        is_active=False,  # Inactive until first-time setup is completed
        is_first_login=True,
        temp_password=temp_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Don't send email - admin will manually share credentials
    return UserCreateResponse(
        id=new_user.id,
        email=new_user.email,
        temp_password=temp_password,
        is_active=False,
        message="User created successfully"
    )


# ===== First-Time Setup =====

@router.post("/complete-setup", response_model=CompleteSetupResponse)
def complete_first_time_setup(
    setup_data: CompleteSetupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Complete first-time user setup

    User provides:
    - Names (Arabic and English)
    - Organizational hierarchy (Agency, GM, Department)
    - New password
    """
    print(f"[COMPLETE_SETUP] User: {current_user.email}, is_first_login: {current_user.is_first_login}")
    print(f"[COMPLETE_SETUP] Data received: {setup_data}")

    # Verify user is in first-time setup mode
    if not current_user.is_first_login:
        print(f"[COMPLETE_SETUP] ERROR: User has already completed setup")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="المستخدم أكمل الإعداد مسبقاً")

    # Validate password strength (use Arabic error messages)
    is_valid, error_msg = validate_password_strength(setup_data.new_password, lang='ar')
    print(f"[COMPLETE_SETUP] Password validation: {is_valid}, error: {error_msg}")
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # Verify organizational hierarchy exists
    agency = db.query(Agency).filter(Agency.id == setup_data.agency_id).first()
    if not agency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الوكالة غير موجودة")

    gm = db.query(GeneralManagement).filter(GeneralManagement.id == setup_data.general_management_id).first()
    if not gm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الإدارة العامة غير موجودة")

    dept = db.query(Department).filter(Department.id == setup_data.department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الإدارة غير موجودة")

    # Verify hierarchy is valid (GM belongs to Agency, Dept belongs to GM)
    if gm.agency_id != agency.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="الإدارة العامة لا تنتمي للوكالة المختارة")

    if dept.general_management_id != gm.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="الإدارة لا تنتمي للإدارة العامة المختارة")

    # Update user
    current_user.first_name_ar = setup_data.first_name_ar
    current_user.last_name_ar = setup_data.last_name_ar
    current_user.first_name_en = setup_data.first_name_en
    current_user.last_name_en = setup_data.last_name_en
    current_user.full_name_ar = f"{setup_data.first_name_ar} {setup_data.last_name_ar}"
    current_user.full_name_en = f"{setup_data.first_name_en} {setup_data.last_name_en}"
    current_user.agency_id = setup_data.agency_id
    current_user.general_management_id = setup_data.general_management_id
    current_user.department_id = setup_data.department_id

    # Hash and update password
    hashed_password = bcrypt.hashpw(setup_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    current_user.hashed_password = hashed_password
    current_user.is_first_login = False
    current_user.is_active = True  # Activate user after completing setup
    current_user.temp_password = None
    current_user.password_changed_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)

    return CompleteSetupResponse(
        message="Setup completed successfully!",
        user_id=current_user.id,
        full_name_ar=current_user.full_name_ar,
        full_name_en=current_user.full_name_en
    )


# ===== List All Users with Index Roles =====

@router.get("/users", response_model=List[UserWithIndexRoles])
def list_all_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_first_login: Optional[bool] = Query(None, description="Filter by first login status"),
    agency_id: Optional[str] = Query(None, description="Filter by agency"),
    search: Optional[str] = Query(None, description="Search in name or email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    List all users with their index roles (Admin only)

    Returns comprehensive user information including:
    - Personal details
    - Organizational hierarchy
    - All index assignments and roles
    """
    query = db.query(User)

    # Apply filters
    if role:
        query = query.filter(User.role == role)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if is_first_login is not None:
        query = query.filter(User.is_first_login == is_first_login)

    if agency_id:
        query = query.filter(User.agency_id == agency_id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
                User.full_name_ar.ilike(search_term),
                User.full_name_en.ilike(search_term),
                User.first_name_ar.ilike(search_term),
                User.last_name_ar.ilike(search_term),
                User.first_name_en.ilike(search_term),
                User.last_name_en.ilike(search_term)
            )
        )

    # Get users
    users = query.offset(skip).limit(limit).all()

    # Build response with index roles
    result = []
    for user in users:
        # Get user's index assignments
        index_assignments = db.query(IndexUser).filter(IndexUser.user_id == user.id).all()

        index_roles = []
        for assignment in index_assignments:
            index = db.query(Index).filter(Index.id == assignment.index_id).first()
            if index:
                index_roles.append(UserIndexRole(
                    index_id=index.id,
                    index_code=index.code,
                    index_name_ar=index.name_ar,
                    role=assignment.role.value if hasattr(assignment.role, 'value') else assignment.role,
                    assigned_at=assignment.created_at
                ))

        # Get organizational hierarchy names
        agency_name = None
        gm_name = None
        dept_name = None

        if user.agency_id:
            agency = db.query(Agency).filter(Agency.id == user.agency_id).first()
            agency_name = agency.name_ar if agency else None

        if user.general_management_id:
            gm = db.query(GeneralManagement).filter(GeneralManagement.id == user.general_management_id).first()
            gm_name = gm.name_ar if gm else None

        if user.department_id:
            dept = db.query(Department).filter(Department.id == user.department_id).first()
            dept_name = dept.name_ar if dept else None

        result.append(UserWithIndexRoles(
            id=user.id,
            email=user.email,
            full_name_ar=user.full_name_ar,
            full_name_en=user.full_name_en,
            first_name_ar=user.first_name_ar,
            last_name_ar=user.last_name_ar,
            first_name_en=user.first_name_en,
            last_name_en=user.last_name_en,
            role=user.role.value if user.role else None,
            is_active=user.is_active,
            is_first_login=user.is_first_login,
            agency_id=user.agency_id,
            agency_name_ar=agency_name,
            general_management_id=user.general_management_id,
            gm_name_ar=gm_name,
            department_id=user.department_id,
            dept_name_ar=dept_name,
            last_login=user.last_login,
            created_at=user.created_at,
            index_roles=index_roles
        ))

    return result


# ===== Reset Password (Admin) =====

@router.post("/users/reset-password", response_model=ResetPasswordResponse)
def reset_user_password(
    reset_data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Reset user password (Admin only)

    Generates new temporary password and sends email
    """
    user = db.query(User).filter(User.id == reset_data.user_id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Generate new temporary password
    temp_password = generate_temp_password()
    hashed_password = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Update user
    user.hashed_password = hashed_password
    user.temp_password = temp_password
    user.is_first_login = True  # Force them to change it

    db.commit()

    # Send email
    email_sent = False
    try:
        email_sent = email_service.send_welcome_email(
            user_email=user.email,
            user_name_ar=user.full_name_ar,
            temp_password=temp_password,
            login_url=settings.FRONTEND_URL
        )
    except Exception as e:
        print(f"Failed to send password reset email: {e}")

    return ResetPasswordResponse(
        message="Password reset successfully",
        temp_password=temp_password,
        email_sent=email_sent
    )


# ===== Activate/Deactivate User (Admin) =====

@router.post("/users/update-status", response_model=UpdateUserStatusResponse)
def update_user_status(
    status_data: UpdateUserStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Activate or deactivate a user (Admin only)

    Inactive users cannot login to the system
    """
    user = db.query(User).filter(User.id == status_data.user_id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent deactivating admin users
    if user.role == UserRole.ADMIN and not status_data.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate admin users"
        )

    # Update user status
    user.is_active = status_data.is_active
    db.commit()

    status_text = "activated" if status_data.is_active else "deactivated"

    return UpdateUserStatusResponse(
        message=f"User {status_text} successfully",
        user_id=user.id,
        is_active=user.is_active
    )
