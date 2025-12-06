"""FastAPI application entrypoint."""

from fastapi import FastAPI
from app.routers import roster, leave, request, swap, ai
from app.db.session import init_db
from app.config import settings
# Import all models to ensure they're registered with SQLModel
from app.models import Doctor, WeeklyFixedPattern, MonthlyRoster, Leave, ShiftRequest


app = FastAPI(
    title="Hospital Roster Management System",
    description="Backend API for managing hospital doctor rosters with AI assistance",
    version="1.0.0"
)


# Include routers
app.include_router(roster.router)
app.include_router(leave.router)
app.include_router(request.router)
app.include_router(swap.router)
app.include_router(ai.router)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Hospital Roster Management System API",
        "version": "1.0.0",
        "ai_enabled": settings.ai_enabled
    }


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    uvicorn.run(
        app,
        host=settings.fastapi_host,
        port=settings.fastapi_port,
        reload=settings.fastapi_debug
    )

