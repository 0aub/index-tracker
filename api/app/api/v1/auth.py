"""
Authentication API Endpoints - Login, Logout, Token Management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.api.dependencies import create_access_token, get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ===== Request/Response Schemas =====

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class CurrentUserResponse(BaseModel):
    id: str
    email: str
    full_name_ar: str
    full_name_en: str | None
    role: str
    is_first_login: bool
    is_active: bool


# ===== Login Endpoint =====

@router.post("/login", response_model=LoginResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with email and password

    Returns JWT access token and user information
    """
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Verify password
    if not pwd_context.verify(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name_ar": user.full_name_ar,
            "full_name_en": user.full_name_en,
            "role": user.role.value,
            "is_first_login": user.is_first_login,
            "is_active": user.is_active
        }
    )


# ===== Current User Endpoint =====

@router.get("/me", response_model=CurrentUserResponse)
def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information
    """
    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name_ar=current_user.full_name_ar,
        full_name_en=current_user.full_name_en,
        role=current_user.role.value,
        is_first_login=current_user.is_first_login,
        is_active=current_user.is_active
    )


# ===== Token Refresh =====

@router.post("/refresh")
def refresh_token(
    current_user: User = Depends(get_current_user)
):
    """
    Refresh access token for currently authenticated user
    """
    new_token = create_access_token(
        data={"sub": current_user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access_token": new_token,
        "token_type": "bearer"
    }
