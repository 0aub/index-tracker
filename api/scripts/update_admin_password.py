"""
Update admin user password to Admin@2025
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import bcrypt
from sqlalchemy import text
from app.database import engine


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def update_admin_password():
    """Update admin user password to Admin@2025"""
    print("Updating admin user password...")

    new_password = "Admin@2025"
    hashed_password = hash_password(new_password)

    try:
        with engine.connect() as conn:
            # Update admin user password
            result = conn.execute(text("""
                UPDATE users
                SET hashed_password = :hashed_password
                WHERE email = 'admin@mewa.gov.sa'
            """), {"hashed_password": hashed_password})
            conn.commit()

            print(f"✅ Updated password for {result.rowcount} admin user(s)")
            print(f"✅ New password: {new_password}")

        print("✅ Password update completed successfully!")

    except Exception as e:
        print(f"❌ Error updating password: {e}")
        raise


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Update Admin Password")
    print("="*60 + "\n")

    update_admin_password()

    print("\n" + "="*60)
    print("Login Credentials:")
    print("  Email: admin@mewa.gov.sa")
    print("  Password: Admin@2025")
    print("="*60 + "\n")
