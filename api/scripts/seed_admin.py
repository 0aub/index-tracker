"""
Admin User Seed Script
Creates the initial admin account

This script is idempotent - it can be run multiple times safely.
If the admin user already exists, it will not create a duplicate.

Usage:
    python seed_admin.py
"""
import sys
import os
from pathlib import Path

# Add the parent directory to the path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
import bcrypt
import uuid
from datetime import datetime

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.organization import Organization

# Admin credentials from environment variables (with fallbacks)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
# Default password - should be changed on first login
# NOTE: BCrypt has a 72-byte limit, so use a shorter password
DEFAULT_PASSWORD = os.getenv("ADMIN_PASSWORD", "ChangeThisPassword123")


def seed_admin_user(db: Session):
    """
    Create or update the admin user based on environment variables
    """
    print("=" * 60)
    print("Admin User Seed Script")
    print("=" * 60)
    print()

    # Check if admin user already exists (by username or old email)
    existing_admin = db.query(User).filter(
        (User.username == ADMIN_USERNAME) | (User.role == UserRole.ADMIN)
    ).first()

    if existing_admin:
        print(f"✓ Admin user found (current email: {existing_admin.email})")

        # Update admin credentials if they changed
        updated = False
        if existing_admin.email != ADMIN_EMAIL:
            print(f"  Updating email: {existing_admin.email} → {ADMIN_EMAIL}")
            existing_admin.email = ADMIN_EMAIL
            updated = True

        if existing_admin.username != ADMIN_USERNAME:
            print(f"  Updating username: {existing_admin.username} → {ADMIN_USERNAME}")
            existing_admin.username = ADMIN_USERNAME
            updated = True

        # Always update password to match env (in case it changed)
        hashed_password = bcrypt.hashpw(DEFAULT_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        if updated or True:  # Always update password to match env
            print(f"  Updating password to match environment config")
            existing_admin.hashed_password = hashed_password
            existing_admin.updated_at = datetime.utcnow()
            updated = True

        if updated:
            db.commit()
            db.refresh(existing_admin)
            print("✓ Admin credentials updated from environment variables")
        else:
            print("✓ Admin credentials already match environment variables")

        print(f"  - ID: {existing_admin.id}")
        print(f"  - Email: {existing_admin.email}")
        print(f"  - Username: {existing_admin.username}")
        print(f"  - Role: {existing_admin.role.value}")
        print()
        return existing_admin

    print(f"Creating admin user: {ADMIN_EMAIL}")
    print()

    # Get or create default organization
    organization = db.query(Organization).first()
    if not organization:
        print("No organization found. Creating default organization...")
        organization = Organization(
            id=str(uuid.uuid4()),
            name_ar="وزارة البيئة والمياه والزراعة",
            name_en="Ministry of Environment, Water and Agriculture",
            code="MEWA"
        )
        db.add(organization)
        db.flush()
        print(f"✓ Created organization: {organization.name_ar}")
        print()

    # Hash the default password using bcrypt
    hashed_password = bcrypt.hashpw(DEFAULT_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Create admin user
    admin_user = User(
        id=str(uuid.uuid4()),
        username=ADMIN_USERNAME,
        email=ADMIN_EMAIL,
        hashed_password=hashed_password,
        full_name_ar="مسؤول المنصة",
        full_name_en="Platform Administrator",
        role=UserRole.ADMIN,
        organization_id=organization.id,
        is_active=True,
        is_first_login=True,  # Force password change on first login
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    print("✓ Admin user created successfully!")
    print()
    print("Admin User Details:")
    print("-" * 60)
    print(f"  ID:       {admin_user.id}")
    print(f"  Email:    {admin_user.email}")
    print(f"  Username: {admin_user.username}")
    print(f"  Role:     {admin_user.role.value}")
    print(f"  Active:   {admin_user.is_active}")
    print()
    print("Default Login Credentials:")
    print("-" * 60)
    print(f"  Email:    {ADMIN_EMAIL}")
    print(f"  Password: {DEFAULT_PASSWORD}")
    print()
    print("IMPORTANT:")
    print("  - The admin will be prompted to change the password on first login")
    print("  - Store these credentials securely")
    print("  - This password should be changed immediately")
    print()

    return admin_user


def main():
    """Main entry point"""
    print()

    # Create database tables if they don't exist
    print("Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables ready")
    print()

    # Create database session
    db = SessionLocal()

    try:
        # Seed admin user
        admin_user = seed_admin_user(db)

        print("=" * 60)
        print("Seed completed successfully!")
        print("=" * 60)
        print()

    except Exception as e:
        print()
        print("ERROR: Failed to create admin user")
        print(f"  {type(e).__name__}: {e}")
        print()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
