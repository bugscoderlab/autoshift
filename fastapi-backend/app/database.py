"""
Database configuration and session management.
Uses SQLAlchemy for ORM.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Generator
from .config import get_settings

settings = get_settings()

# Use SQLite for development if TiDB is not configured
if settings.db_password:
    DATABASE_URL = settings.database_url
    engine = create_engine(
        DATABASE_URL,
        echo=settings.fastapi_debug,
        pool_pre_ping=True,
        pool_recycle=3600,
    )
else:
    # SQLite fallback for local development
    DATABASE_URL = "sqlite:///./hospital_roster.db"
    engine = create_engine(
        DATABASE_URL,
        echo=settings.fastapi_debug,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_db_and_tables():
    """Create all database tables."""
    # Import Base and all models to ensure they are registered
    from .models.base import Base
    from .models.doctor import Doctor
    from .models.weekly_pattern import WeeklyFixedPattern
    from .models.roster import MonthlyRoster
    from .models.leave import Leave
    from .models.shift_request import ShiftRequest
    from .models.swap_request import SwapRequest
    
    Base.metadata.create_all(bind=engine)


def get_session() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
