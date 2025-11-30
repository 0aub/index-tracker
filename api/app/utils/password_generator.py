"""
Secure password generator utility
"""
import secrets
import string


def generate_temp_password(length: int = 12) -> str:
    """
    Generate a secure temporary password

    Args:
        length: Password length (default: 12)

    Returns:
        A secure random password containing:
        - Uppercase letters
        - Lowercase letters
        - Digits
        - Special characters (!@#$%&*)

    Example:
        >>> password = generate_temp_password()
        >>> len(password)
        12
    """
    # Define character sets
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = "!@#$%&*"

    # Combine all characters
    all_characters = uppercase + lowercase + digits + special

    # Ensure password has at least one character from each set
    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]

    # Fill the rest with random characters
    password += [secrets.choice(all_characters) for _ in range(length - 4)]

    # Shuffle to avoid predictable patterns
    secrets.SystemRandom().shuffle(password)

    return ''.join(password)


def validate_password_strength(password: str, lang: str = 'en') -> tuple[bool, str]:
    """
    Validate password strength

    Args:
        password: Password to validate
        lang: Language for error messages ('en' or 'ar')

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Error messages in both languages
    errors = {
        'min_length': {
            'en': 'Password must be at least 8 characters',
            'ar': 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل'
        },
        'uppercase': {
            'en': 'Password must contain at least one uppercase letter (A-Z)',
            'ar': 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)'
        },
        'lowercase': {
            'en': 'Password must contain at least one lowercase letter (a-z)',
            'ar': 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)'
        },
        'digit': {
            'en': 'Password must contain at least one number (0-9)',
            'ar': 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)'
        },
        'special': {
            'en': 'Password must contain at least one special character (!@#$%^&*)',
            'ar': 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)'
        }
    }

    if len(password) < 8:
        return False, errors['min_length'][lang]

    if not any(c.isupper() for c in password):
        return False, errors['uppercase'][lang]

    if not any(c.islower() for c in password):
        return False, errors['lowercase'][lang]

    if not any(c.isdigit() for c in password):
        return False, errors['digit'][lang]

    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, errors['special'][lang]

    return True, ""
