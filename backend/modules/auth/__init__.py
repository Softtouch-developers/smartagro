"""
Authentication Module
"""
from .routes import router
from .service import AuthService
from .dependencies import (
    get_current_user,
    get_current_verified_user,
    get_current_farmer,
    get_current_buyer,
    get_current_admin,
    get_optional_current_user
)

__all__ = [
    'router',
    'AuthService',
    'get_current_user',
    'get_current_verified_user',
    'get_current_farmer',
    'get_current_buyer',
    'get_current_admin',
    'get_optional_current_user'
]
