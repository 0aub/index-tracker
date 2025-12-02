"""
Migration script to add requires_evidence column to requirements table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal, engine

def add_requires_evidence_column():
    """Add requires_evidence column to requirements table"""
    db = SessionLocal()
    try:
        # Check if column already exists
        check_sql = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'requirements'
            AND column_name = 'requires_evidence'
        """)
        result = db.execute(check_sql).fetchone()

        if result:
            print("Column 'requires_evidence' already exists in requirements table")
            return

        # Add the column with default value True
        add_column_sql = text("""
            ALTER TABLE requirements
            ADD COLUMN requires_evidence BOOLEAN NOT NULL DEFAULT TRUE
        """)
        db.execute(add_column_sql)
        db.commit()

        print("✓ Successfully added 'requires_evidence' column to requirements table")
        print("  Default value: TRUE (all existing requirements will require evidence)")

        # Show count of updated requirements
        count_sql = text("SELECT COUNT(*) FROM requirements")
        count = db.execute(count_sql).scalar()
        print(f"  Updated {count} existing requirements")

    except Exception as e:
        db.rollback()
        print(f"Error adding column: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_requires_evidence_column()
