"""
Input validation utilities
"""
import re


def validate_domain_like(s: str) -> bool:
    """
    Validate if string looks like a domain

    Args:
        s: String to validate

    Returns:
        True if valid domain-like string
    """
    return bool(s and len(s) <= 253)


def validate_keyword(kw: str) -> bool:
    """
    Validate if keyword is safe and valid

    Args:
        kw: Keyword string to validate

    Returns:
        True if valid keyword (no SQL injection, reasonable length)
    """
    if not kw or len(kw.strip()) > 200:
        return False
    # Check for dangerous characters
    return not re.search(r"[<>'\";&|`$]", kw)
