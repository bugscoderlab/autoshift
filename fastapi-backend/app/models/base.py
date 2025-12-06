"""
SQLAlchemy base configuration.
"""

from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""
    pass



