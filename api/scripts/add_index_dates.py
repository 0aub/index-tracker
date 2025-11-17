"""
Add start_date and end_date columns to indices table - migration script
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.database import engine


def add_date_columns():
    """Add start_date and end_date columns to indices table"""
    print("Adding start_date and end_date columns to indices table...")

    try:
        with engine.connect() as conn:
            # Check if columns already exist
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='indices'
                AND column_name IN ('start_date', 'end_date')
            """))
            existing_columns = [row[0] for row in result]

            # Add start_date if it doesn't exist
            if 'start_date' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE indices
                    ADD COLUMN start_date TIMESTAMP
                """))
                conn.commit()
                print("✅ Added start_date column")
            else:
                print("ℹ️  start_date column already exists")

            # Add end_date if it doesn't exist
            if 'end_date' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE indices
                    ADD COLUMN end_date TIMESTAMP
                """))
                conn.commit()
                print("✅ Added end_date column")
            else:
                print("ℹ️  end_date column already exists")

        print("✅ Migration completed successfully!")

    except Exception as e:
        print(f"❌ Error adding columns: {e}")
        raise


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Add Index Date Columns Migration")
    print("="*60 + "\n")

    add_date_columns()

    print("\n" + "="*60)
    print("Migration completed!")
    print("="*60 + "\n")
