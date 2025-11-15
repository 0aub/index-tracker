"""
Create evidence tables - migration script
Adds Evidence, EvidenceVersion, and EvidenceActivity tables
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.database import engine, Base
from app.models import (
    Evidence, EvidenceVersion, EvidenceActivity,
    User, Requirement, Assignment
)


def create_tables():
    """Create the new evidence tables"""
    print("Creating evidence tables...")

    try:
        # Create all tables (will only create if they don't exist)
        Base.metadata.create_all(bind=engine, tables=[
            Evidence.__table__,
            EvidenceVersion.__table__,
            EvidenceActivity.__table__,
        ])

        print("✅ Evidence tables created successfully!")

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Evidence Tables Migration")
    print("="*60 + "\n")

    create_tables()

    print("\n" + "="*60)
    print("Migration completed!")
    print("="*60 + "\n")
