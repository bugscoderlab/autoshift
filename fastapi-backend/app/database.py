"""
Database configuration and session management.
Uses SQLAlchemy for ORM.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Generator, Dict, Any
import ssl
from .config import get_settings

settings = get_settings()


def get_ssl_config() -> Dict[str, Any]:
    """
    Get SSL configuration for TiDB Cloud connections.
    
    Returns:
        Dictionary with SSL configuration if SSL is enabled, empty dict otherwise
    """
    connect_args = {}
    
    # Enable SSL for TiDB Cloud connections or if forced
    if settings.is_tidb_cloud or settings.db_force_ssl:
        # For PyMySQL through SQLAlchemy, we need to explicitly enable SSL
        # TiDB Cloud requires SSL/TLS encryption - insecure transport is prohibited
        # Create SSL context with default settings (uses system CA certificates)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        
        # PyMySQL accepts SSL context object
        connect_args["ssl"] = ssl_context
        
        # Also try setting ssl_disabled=False as a fallback
        # Some PyMySQL versions need this explicitly set
        connect_args["ssl_disabled"] = False
    
    return connect_args


# Use SQLite for development if TiDB is not configured
if settings.db_password:
    DATABASE_URL = settings.database_url
    connect_args = get_ssl_config()
    
    # Debug: Print SSL config (always print for troubleshooting)
    print(f"[DB CONFIG] DB Host: {settings.db_host}")
    print(f"[DB CONFIG] Is TiDB Cloud: {settings.is_tidb_cloud}")
    print(f"[DB CONFIG] Force SSL: {settings.db_force_ssl}")
    print(f"[DB CONFIG] SSL will be enabled: {settings.is_tidb_cloud or settings.db_force_ssl}")
    print(f"[DB CONFIG] SSL config: {connect_args}")
    
    engine = create_engine(
        DATABASE_URL,
        echo=settings.fastapi_debug,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args=connect_args,
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
    from .models.medical_summary import MedicalRecording, Transcript, MedicalSummary
    
    Base.metadata.create_all(bind=engine)


def get_session() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
