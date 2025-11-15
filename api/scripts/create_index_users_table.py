"""
Create index_users table - migration script
Adds IndexUser table for index-specific user management
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.database import engine, Base
from app.models import IndexUser, User, Index


def create_tables():
    """Create the index_users table"""
    print("Creating index_users table...")

    try:
        # Create the table
        Base.metadata.create_all(bind=engine, tables=[
            IndexUser.__table__,
        ])

        print("✅ Index_users table created successfully!")

    except Exception as e:
        print(f"❌ Error creating table: {e}")
        raise


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Index Users Table Migration")
    print("="*60 + "\n")

    create_tables()

    print("\n" + "="*60)
    print("Migration completed!")
    print("="*60 + "\n")
