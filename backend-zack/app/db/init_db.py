"""Database initialization script."""

from sqlmodel import SQLModel, create_engine
from app.config import settings
from app.models import (
    Doctor,
    WeeklyFixedPattern,
    MonthlyRoster,
    Leave,
    ShiftRequest,
)
from app.db.session import get_ssl_config


def init_database() -> None:
    """
    Initialize database schema.
    Creates all tables defined in models.
    """
    # Get SSL config for TiDB Cloud
    connect_args = get_ssl_config()
    
    # Create engine with SSL configuration
    engine = create_engine(
        settings.database_url,
        echo=True,
        connect_args=connect_args
    )
    
    print(f"Connecting to: {settings.db_host}")
    print(f"SSL enabled: {bool(connect_args.get('ssl'))}")
    
    SQLModel.metadata.create_all(engine)
    print("Database initialized successfully!")


if __name__ == "__main__":
    init_database()

