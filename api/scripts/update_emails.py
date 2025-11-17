"""
Update all user emails to use @mewa.gov.sa domain
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.database import engine


def update_emails():
    """Update all user emails from @sdaia.gov.sa and @example.com to @mewa.gov.sa"""
    print("Updating user emails to @mewa.gov.sa domain...")

    try:
        with engine.connect() as conn:
            # Update @sdaia.gov.sa emails to @mewa.gov.sa
            result1 = conn.execute(text("""
                UPDATE users
                SET email = REPLACE(email, '@sdaia.gov.sa', '@mewa.gov.sa')
                WHERE email LIKE '%@sdaia.gov.sa'
            """))
            conn.commit()

            # Update @example.com emails to @mewa.gov.sa
            result2 = conn.execute(text("""
                UPDATE users
                SET email = REPLACE(email, '@example.com', '@mewa.gov.sa')
                WHERE email LIKE '%@example.com'
            """))
            conn.commit()

            # Update organization contact email
            result3 = conn.execute(text("""
                UPDATE organizations
                SET contact_email = REPLACE(contact_email, '@example.com', '@mewa.gov.sa')
                WHERE contact_email LIKE '%@example.com'
            """))
            conn.commit()

            print(f"✅ Updated {result1.rowcount} emails from @sdaia.gov.sa")
            print(f"✅ Updated {result2.rowcount} emails from @example.com")
            print(f"✅ Updated {result3.rowcount} organization emails")

        print("✅ Email update completed successfully!")

    except Exception as e:
        print(f"❌ Error updating emails: {e}")
        raise


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Update Emails to @mewa.gov.sa")
    print("="*60 + "\n")

    update_emails()

    print("\n" + "="*60)
    print("Update completed!")
    print("="*60 + "\n")
