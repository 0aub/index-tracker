"""
Seed script to populate database with test users and organizations

Run with: python -m scripts.seed_users
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
import bcrypt
import uuid

from app.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.organization import Organization


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    # Convert password to bytes and hash
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_organization(db: Session) -> Organization:
    """Create or get the default organization"""
    org_id = "default-org"
    org = db.query(Organization).filter(Organization.id == org_id).first()

    if not org:
        org = Organization(
            id=org_id,
            name_ar="المنظمة الافتراضية",
            name_en="Default Organization",
            code="ORG-001",
            sector_ar="القطاع الحكومي",
            sector_en="Government Sector",
            description_ar="منظمة افتراضية لأغراض الاختبار",
            description_en="Default organization for testing purposes",
            contact_email="contact@example.com"
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        print(f"✓ Created organization: {org.name_en}")
    else:
        print(f"✓ Organization already exists: {org.name_en}")

    return org


def create_users(db: Session, org_id: str):
    """Create test users with different roles"""

    # Default password for all test users: "password123"
    default_password = hash_password("password123")

    users_data = [
        {
            "id": "usr-001",  # Fixed ID to match frontend mock user
            "username": "admin",
            "email": "admin@sdaia.gov.sa",  # Matches frontend mock
            "full_name_ar": "مدير النظام",
            "full_name_en": "System Administrator",
            "role": UserRole.ADMIN,
            "department_ar": "الإدارة العليا",
            "department_en": "Senior Management",
            "phone": "+966501234567"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "index.manager",
            "email": "index.manager@example.com",
            "full_name_ar": "أحمد محمد",
            "full_name_en": "Ahmed Mohammed",
            "role": UserRole.INDEX_MANAGER,
            "department_ar": "إدارة المؤشرات",
            "department_en": "Index Management",
            "phone": "+966502345678"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "coordinator1",
            "email": "coordinator1@example.com",
            "full_name_ar": "فاطمة علي",
            "full_name_en": "Fatima Ali",
            "role": UserRole.SECTION_COORDINATOR,
            "department_ar": "الحوكمة والاستراتيجية",
            "department_en": "Governance & Strategy",
            "phone": "+966503456789"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "coordinator2",
            "email": "coordinator2@example.com",
            "full_name_ar": "خالد حسن",
            "full_name_en": "Khalid Hassan",
            "role": UserRole.SECTION_COORDINATOR,
            "department_ar": "إدارة البيانات",
            "department_en": "Data Management",
            "phone": "+966504567890"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "contributor1",
            "email": "contributor1@example.com",
            "full_name_ar": "سارة أحمد",
            "full_name_en": "Sara Ahmed",
            "role": UserRole.CONTRIBUTOR,
            "department_ar": "التقنية والبنية التحتية",
            "department_en": "Technology & Infrastructure",
            "phone": "+966505678901"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "contributor2",
            "email": "contributor2@example.com",
            "full_name_ar": "محمد عبدالله",
            "full_name_en": "Mohammed Abdullah",
            "role": UserRole.CONTRIBUTOR,
            "department_ar": "الموارد البشرية",
            "department_en": "Human Resources",
            "phone": "+966506789012"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "contributor3",
            "email": "contributor3@example.com",
            "full_name_ar": "نورة سعيد",
            "full_name_en": "Noura Saeed",
            "role": UserRole.CONTRIBUTOR,
            "department_ar": "المالية",
            "department_en": "Finance",
            "phone": "+966507890123"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "contributor4",
            "email": "contributor4@example.com",
            "full_name_ar": "عبدالرحمن خالد",
            "full_name_en": "Abdulrahman Khalid",
            "role": UserRole.CONTRIBUTOR,
            "department_ar": "الأمن والامتثال",
            "department_en": "Security & Compliance",
            "phone": "+966508901234"
        },
    ]

    created_count = 0
    existing_count = 0

    for user_data in users_data:
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == user_data["username"]) |
            (User.email == user_data["email"])
        ).first()

        if existing_user:
            print(f"  ⚠ User already exists: {user_data['username']}")
            existing_count += 1
            continue

        # Create new user
        user = User(
            **user_data,
            hashed_password=default_password,
            organization_id=org_id,
            is_active=True
        )

        db.add(user)
        created_count += 1
        print(f"  ✓ Created user: {user_data['username']} ({user_data['role']})")

    if created_count > 0:
        db.commit()

    return created_count, existing_count


def main():
    """Main seed function"""
    print("\n" + "="*60)
    print("DATABASE SEED SCRIPT - Creating Test Users")
    print("="*60 + "\n")

    db = SessionLocal()

    try:
        # Create organization
        print("1. Creating/Checking Organization...")
        org = create_organization(db)
        print()

        # Create users
        print("2. Creating Test Users...")
        created, existing = create_users(db, org.id)
        print()

        # Summary
        print("="*60)
        print("SUMMARY:")
        print(f"  Organization: {org.name_en}")
        print(f"  Users created: {created}")
        print(f"  Users already existing: {existing}")
        print(f"  Total users in system: {db.query(User).count()}")
        print()
        print("DEFAULT LOGIN CREDENTIALS:")
        print("  Username: admin")
        print("  Password: password123")
        print()
        print("OTHER TEST USERS:")
        print("  - index.manager / password123")
        print("  - coordinator1 / password123")
        print("  - contributor1 / password123")
        print("  (All users have password: password123)")
        print("="*60 + "\n")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
