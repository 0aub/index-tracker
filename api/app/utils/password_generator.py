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


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"

    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"

    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"

    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, "Password must contain at least one special character"

    return True, ""
