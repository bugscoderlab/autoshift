"""
Configuration settings for the FastAPI application.
Loads environment variables and provides typed settings.
"""

from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    db_host: str = "localhost"
    db_port: int = 4000
    db_name: str = "hospital_roster"
    db_user: str = "root"
    db_password: str = ""
    
    # Force SSL (set to True to always enable SSL, useful for TiDB Cloud)
    # Pydantic will convert "true", "True", "1" to boolean True
    db_force_ssl: bool = False
    
    # FastAPI
    fastapi_host: str = "0.0.0.0"
    fastapi_port: int = 8000
    fastapi_debug: bool = True
    
    # Claude AI
    claude_api_key: str = ""
    claude_api_base_url: str = "https://api.anthropic.com"
    
    # Groq AI
    groq_api_key: str = ""
    groq_api_base_url: str = "https://api.groq.com"
    
    # AI Parameters
    ai_max_tokens: int = 2000
    ai_temperature: float = 0.2
    
    # Logging
    log_path: str = "./logs"
    log_level: str = "INFO"
    
    # JWT
    jwt_secret: str = "supersecretkey"
    
    # Application
    environment: str = "development"
    
    @property
    def database_url(self) -> str:
        """Construct the database URL for SQLAlchemy."""
        # URL encode password to handle special characters
        from urllib.parse import quote_plus
        encoded_password = quote_plus(self.db_password)
        url = f"mysql+pymysql://{self.db_user}:{encoded_password}@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        
        # Add SSL parameters for TiDB Cloud
        if self.is_tidb_cloud or self.db_force_ssl:
            # PyMySQL recognizes ssl_disabled parameter in URL
            url += "&ssl_disabled=0"
        
        return url
    
    @property
    def is_tidb_cloud(self) -> bool:
        """Check if this is a TiDB Cloud connection."""
        return any(
            pattern in self.db_host.lower()
            for pattern in ["tidbcloud.com", "tidb-cloud", "gateway01", "gateway02"]
        )
    
    @property
    def database_url_sqlite(self) -> str:
        """SQLite fallback for development/testing."""
        return "sqlite:///./hospital_roster.db"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()



