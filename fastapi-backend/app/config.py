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
    
    @property
    def database_url(self) -> str:
        """Construct the database URL for SQLAlchemy."""
        return f"mysql+pymysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    @property
    def database_url_sqlite(self) -> str:
        """SQLite fallback for development/testing."""
        return "sqlite:///./hospital_roster.db"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()



