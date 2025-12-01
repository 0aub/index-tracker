"""
Create notifications table migration script
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine


def create_notifications_table():
    """Create notifications table"""
    print("Creating notifications table...")

    with engine.connect() as conn:
        trans = conn.begin()

        try:
            # Create notifications table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    type VARCHAR NOT NULL,
                    title VARCHAR NOT NULL,
                    message TEXT NOT NULL,
                    task_id VARCHAR REFERENCES tasks(id) ON DELETE CASCADE,
                    requirement_id VARCHAR REFERENCES requirements(id) ON DELETE CASCADE,
                    evidence_id VARCHAR REFERENCES evidence(id) ON DELETE CASCADE,
                    actor_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    read_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL
                );
            """))

            # Create indices for better query performance
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read)
                WHERE is_read = FALSE;
            """))

            trans.commit()
            print("✅ Notifications table created successfully!")

        except Exception as e:
            trans.rollback()
            print(f"❌ Error creating notifications table: {e}")
            raise


if __name__ == "__main__":
    create_notifications_table()
    print("\nMigration completed!")
