"""Application configuration management."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database (TiDB) Configuration
    db_host: str = "localhost"
    db_port: int = 4000
    db_name: str = "hospital_roster"
    db_user: str = "root"
    db_password: str = ""
    
    # FastAPI Configuration
    fastapi_host: str = "0.0.0.0"
    fastapi_port: int = 8000
    fastapi_debug: bool = False
    
    # AI Configuration
    claude_api_key: Optional[str] = None
    claude_api_base_url: str = "https://api.anthropic.com/v1"
    claude_model: str = "claude-3-sonnet-20240229"  # Claude model to use (fallback to older model if 3-5 not available)
    groq_api_key: Optional[str] = None
    groq_api_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.1-70b-versatile"  # Groq model to use
    ai_max_tokens: int = 4096
    ai_temperature: float = 0.7
    ai_enabled: bool = True
    
    # Logging Configuration
    log_path: str = "logs/app.log"
    log_level: str = "INFO"
    
    # Application
    environment: str = "development"
    
    # Force SSL (set to True to always enable SSL, useful for TiDB Cloud)
    # Pydantic will convert "true", "True", "1" to boolean True
    db_force_ssl: bool = False
    
    @property
    def database_url(self) -> str:
        """Construct database URL from individual components."""
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
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

