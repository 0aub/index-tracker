"""
Email service for sending notifications
Uses SMTP (Microsoft 365 / Outlook)
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending notifications"""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME

    def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """
        Send an email

        Args:
            to_email: Recipient email address
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text body content
            cc: CC recipients (optional)
            bcc: BCC recipients (optional)

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email

            if cc:
                msg['Cc'] = ', '.join(cc)
            if bcc:
                msg['Bcc'] = ', '.join(bcc)

            # Attach both plain text and HTML versions
            part_text = MIMEText(body_text, 'plain', 'utf-8')
            part_html = MIMEText(body_html, 'html', 'utf-8')

            msg.attach(part_text)
            msg.attach(part_html)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                if self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)

                recipients = [to_email]
                if cc:
                    recipients.extend(cc)
                if bcc:
                    recipients.extend(bcc)

                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_welcome_email(
        self,
        user_email: str,
        user_name_ar: str,
        temp_password: str,
        login_url: str = "http://localhost:8080"
    ) -> bool:
        """
        Send welcome email to new user with temporary credentials

        Args:
            user_email: User's email address
            user_name_ar: User's Arabic name
            temp_password: Temporary password
            login_url: URL to login page

        Returns:
            True if email sent successfully
        """
        subject = "مرحباً بك في منصة راقب - Welcome to Raqib Platform"

        # HTML body
        body_html = f"""
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
        .credentials {{ background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0; }}
        .credential-item {{ margin: 10px 0; font-size: 16px; }}
        .credential-label {{ font-weight: bold; color: #495057; }}
        .credential-value {{ color: #212529; background: #e9ecef; padding: 8px 12px; border-radius: 4px; display: inline-block; font-family: monospace; }}
        .button {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }}
        .footer {{ text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }}
        .warning {{ background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .steps {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }}
        .step {{ margin: 15px 0; padding-right: 30px; position: relative; }}
        .step-number {{ position: absolute; right: 0; background: #667eea; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 مرحباً بك في منصة راقب</h1>
            <p>المنصة الذكية لإدارة المؤشرات</p>
        </div>
        <div class="content">
            <h2>عزيزي/عزيزتي {user_name_ar}،</h2>

            <p>تم إنشاء حساب جديد لك في منصة راقب. يمكنك الآن الدخول إلى المنصة باستخدام بيانات الاعتماد التالية:</p>

            <div class="credentials">
                <div class="credential-item">
                    <span class="credential-label">البريد الإلكتروني:</span><br>
                    <span class="credential-value">{user_email}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">كلمة المرور المؤقتة:</span><br>
                    <span class="credential-value">{temp_password}</span>
                </div>
            </div>

            <div class="warning">
                <strong>⚠️ تنبيه أمني:</strong><br>
                كلمة المرور هذه مؤقتة. سيُطلب منك تغييرها عند تسجيل الدخول لأول مرة.
            </div>

            <div class="steps">
                <h3>خطوات البدء:</h3>
                <div class="step">
                    <span class="step-number">1</span>
                    قم بزيارة منصة راقب
                </div>
                <div class="step">
                    <span class="step-number">2</span>
                    أدخل بريدك الإلكتروني وكلمة المرور المؤقتة
                </div>
                <div class="step">
                    <span class="step-number">3</span>
                    أكمل بياناتك الشخصية والوظيفية
                </div>
                <div class="step">
                    <span class="step-number">4</span>
                    اختر كلمة مرور جديدة وآمنة
                </div>
                <div class="step">
                    <span class="step-number">5</span>
                    ابدأ باستخدام المنصة!
                </div>
            </div>

            <center>
                <a href="{login_url}" class="button">
                    تسجيل الدخول الآن
                </a>
            </center>

            <div class="footer">
                <p>إذا لم تطلب هذا الحساب، يرجى الاتصال بمسؤول النظام.</p>
                <p>© 2025 وزارة البيئة والمياه والزراعة - جميع الحقوق محفوظة</p>
                <p style="font-size: 12px; color: #adb5bd;">
                    هذه رسالة تلقائية، يرجى عدم الرد عليها.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
        """

        # Plain text body
        body_text = f"""
مرحباً بك في منصة راقب
المنصة الذكية لإدارة المؤشرات

عزيزي/عزيزتي {user_name_ar}،

تم إنشاء حساب جديد لك في منصة راقب.

بيانات الدخول:
--------------
البريد الإلكتروني: {user_email}
كلمة المرور المؤقتة: {temp_password}

تنبيه: هذه كلمة مرور مؤقتة. سيُطلب منك تغييرها عند تسجيل الدخول لأول مرة.

للدخول إلى المنصة:
{login_url}

خطوات البدء:
1. قم بزيارة منصة راقب
2. أدخل بريدك الإلكتروني وكلمة المرور المؤقتة
3. أكمل بياناتك الشخصية والوظيفية
4. اختر كلمة مرور جديدة وآمنة
5. ابدأ باستخدام المنصة!

© 2025 وزارة البيئة والمياه والزراعة
        """

        return self.send_email(
            to_email=user_email,
            subject=subject,
            body_html=body_html,
            body_text=body_text
        )


# Singleton instance
email_service = EmailService()
