"""
Run script for the FastAPI application.
"""

import uvicorn
from app.config import get_settings
from app.seed_data import seed_database

if __name__ == "__main__":
    settings = get_settings()
    
    # Seed database with sample data
    print("📦 Checking database...")
    seed_database()
    
    # Run the server
    print(f"\n🚀 Starting server at http://{settings.fastapi_host}:{settings.fastapi_port}")
    print(f"📚 API docs at http://localhost:{settings.fastapi_port}/docs")
    
    uvicorn.run(
        "app.main:app",
        host=settings.fastapi_host,
        port=settings.fastapi_port,
        reload=settings.fastapi_debug
    )



