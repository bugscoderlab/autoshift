"""AI-related endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db.session import get_session
from app.schemas.ai import AIExplainRequest, AIExplainResponse
from app.ai.explain_ai import explain_violation, explain_shift_assignment
from app.models.pattern import ShiftType


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/explain", response_model=AIExplainResponse)
def explain(
    request: AIExplainRequest,
    session: Session = Depends(get_session)
) -> AIExplainResponse:
    """
    Get AI explanation for a violation or shift assignment.
    
    Uses Claude for best reasoning and explanations.
    """
    try:
        if request.violation_type:
            # Explain violation
            explanation = explain_violation(
                violation_type=request.violation_type,
                doctor_id=request.doctor_id,
                violation_date=request.date,
                context=request.context
            )
            model_used = "claude-3-5-sonnet"
        elif request.doctor_id and request.date and request.shift_type:
            # Explain shift assignment
            explanation = explain_shift_assignment(
                doctor_id=request.doctor_id,
                assignment_date=request.date,
                shift_type=request.shift_type,
                context=request.context
            )
            model_used = "claude-3-5-sonnet"
        else:
            raise HTTPException(
                status_code=400,
                detail="Must provide either violation_type or (doctor_id, date, shift_type)"
            )
        
        return AIExplainResponse(
            explanation=explanation,
            model_used=model_used,
            reasoning=None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

