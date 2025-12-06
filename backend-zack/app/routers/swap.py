"""Swap management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db.session import get_session
from app.services.swap_service import SwapService
from app.schemas.swap import SwapRequestRequest, SwapRequestResponse
from app.exceptions import ValidationError


router = APIRouter(prefix="/swap", tags=["swap"])


@router.post("/request", response_model=SwapRequestResponse)
def request_swap(
    request: SwapRequestRequest,
    session: Session = Depends(get_session)
) -> SwapRequestResponse:
    """
    Request a shift swap between two doctors.
    
    Validates compliance rules during swap if validate_compliance is True.
    """
    service = SwapService(session)
    
    try:
        return service.request_swap(request)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

