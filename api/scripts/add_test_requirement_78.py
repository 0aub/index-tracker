"""
Add test requirement #78 to ETARI-2024 index for testing
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.index import Index
from app.models.requirement import Requirement
import uuid

def add_test_requirement():
    db = SessionLocal()
    try:
        # Get ETARI-2024 index
        index = db.query(Index).filter(Index.code == "ETARI-2024").first()
        if not index:
            print("Error: ETARI-2024 index not found")
            return

        # Check if requirement 78 already exists
        existing = db.query(Requirement).filter(
            Requirement.index_id == index.id,
            Requirement.code == "78"
        ).first()

        if existing:
            print("Test requirement #78 already exists")
            return

        # Create test requirement #78
        requirement = Requirement(
            id=str(uuid.uuid4()),
            index_id=index.id,
            code="78",
            main_area_ar="اختبار",
            main_area_en="Test",
            sub_domain_ar="اختبار التعديلات",
            sub_domain_en="Test Modifications",
            element_ar="متطلب اختبار للإجابات والأدلة",
            element_en="Test requirement for answers and evidence",
            question_ar="هل يتم توثيق وتحديث سياسات أمن المعلومات بشكل دوري لضمان التوافق مع المتطلبات التنظيمية والتقنية الحديثة؟",
            question_en="Are information security policies documented and updated periodically to ensure compliance with modern regulatory and technical requirements?",
            display_order=78,
            answer_ar=None,
            answer_en=None,
            answer_status=None
        )

        db.add(requirement)
        db.commit()

        print(f"✓ Created test requirement #78 (ID: {requirement.id})")
        print(f"  Question AR: {requirement.question_ar}")
        print(f"  Question EN: {requirement.question_en}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_test_requirement()
