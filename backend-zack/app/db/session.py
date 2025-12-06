"""Database session management."""

from sqlmodel import SQLModel, create_engine, Session
from app.config import settings
from typing import Generator, Dict, Any
import ssl


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


# Build connection arguments
connect_args: Dict[str, Any] = get_ssl_config()

# Debug: Print SSL config (always print for troubleshooting)
print(f"[DB CONFIG] DB Host: {settings.db_host}")
print(f"[DB CONFIG] Is TiDB Cloud: {settings.is_tidb_cloud}")
print(f"[DB CONFIG] Force SSL (raw): {settings.db_force_ssl} (type: {type(settings.db_force_ssl)})")
print(f"[DB CONFIG] SSL will be enabled: {settings.is_tidb_cloud or settings.db_force_ssl}")
print(f"[DB CONFIG] SSL config: {connect_args}")
print(f"[DB CONFIG] SSL in connect_args: {'ssl' in connect_args}")

engine = create_engine(
    settings.database_url,
    echo=settings.environment == "development",
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args=connect_args,
)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI to get database session.
    
    Yields:
        Session: SQLModel database session
    """
    with Session(engine) as session:
        yield session


def init_db() -> None:
    """Initialize database tables."""
    SQLModel.metadata.create_all(engine)

