"""
FastAPI routers for the hospital roster system.
"""

from .doctors import router as doctors_router
from .roster import router as roster_router
from .leave import router as leave_router
from .swap import router as swap_router
from .ai import router as ai_router
from .medical_summary import router as medical_summary_router
from .translation import router as translation_router

__all__ = [
    "doctors_router",
    "roster_router",
    "leave_router",
    "swap_router",
    "ai_router",
    "medical_summary_router",
    "translation_router",
]



