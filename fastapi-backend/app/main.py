"""
FastAPI Application Entry Point
Hospital Roster Management System
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import create_db_and_tables
from .config import get_settings
from .routers import doctors_router, roster_router, leave_router, swap_router, ai_router, medical_summary_router, translation_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("🚀 Starting AutoShift API...")
    create_db_and_tables()
    print("✅ Database tables created/verified")
    yield
    # Shutdown
    print("👋 Shutting down AutoShift API...")


app = FastAPI(
    title="AutoShift API",
    description="""
    Hospital Roster Management System API
    
    ## Features
    - 👨‍⚕️ Doctor Management
    - 📅 Roster Generation (AI-assisted)
    - 🏖️ Leave Management
    - 🔄 Shift Swap System
    - 🤖 AI Assistant
    
    ## AI Integration
    - Claude: Primary reasoning for roster generation
    - Groq: Fast inference for quick validations
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(doctors_router)
app.include_router(roster_router)
app.include_router(leave_router)
app.include_router(swap_router)
app.include_router(ai_router)
app.include_router(medical_summary_router)
app.include_router(translation_router)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "AutoShift API",
        "version": "1.0.0",
        "description": "Hospital Roster Management System",
        "endpoints": {
            "doctors": "/doctors",
            "roster": "/roster",
            "leave": "/leave",
            "swap": "/swap",
            "ai": "/ai",
            "medical_summary": "/medical-summary"
        },
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "ai_enabled": bool(settings.claude_api_key or settings.groq_api_key)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.fastapi_host,
        port=settings.fastapi_port,
        reload=settings.fastapi_debug
    )



