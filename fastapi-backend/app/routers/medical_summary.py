"""
Medical Summary Router - Handles audio transcription and medical summary generation.
"""

import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from ..database import get_session
from ..models.medical_summary import (
    MedicalRecording, Transcript, MedicalSummary,
    RecordingCreate, RecordingRead, TranscriptRead, SummaryRead, SummaryUpdate
)
from ..models.doctor import Doctor
from ..services.transcription_service import get_transcription_service
from ..services.summary_service import MedicalSummaryService

router = APIRouter(prefix="/medical-summary", tags=["Medical Summary"])

# Directory for storing uploaded audio files
UPLOAD_DIR = "./uploads/audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/recording", response_model=RecordingRead)
async def create_recording(
    doctor_id: int = Form(...),
    patient_id: Optional[int] = Form(None),
    patient_name: Optional[str] = Form(None),
    consent_given: bool = Form(False),
    session: Session = Depends(get_session)
):
    """
    Create a new recording record.
    This endpoint creates a database record before audio upload.
    """
    if not consent_given:
        raise HTTPException(
            status_code=400,
            detail="Patient consent is required for audio recording"
        )
    
    # Verify doctor exists
    doctor = session.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    recording = MedicalRecording(
        doctor_id=doctor_id,
        patient_id=patient_id,
        patient_name=patient_name,
        consent_given=consent_given,
        status="pending"
    )
    
    session.add(recording)
    session.commit()
    session.refresh(recording)
    
    return recording


@router.post("/transcribe/{recording_id}", response_model=TranscriptRead)
async def transcribe_audio(
    recording_id: int,
    audio_file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    Upload audio file and transcribe it.
    
    Args:
        recording_id: ID of the recording record
        audio_file: Audio file (mp3, wav, m4a, etc.)
        
    Returns:
        Transcript with text and metadata
    """
    # Get recording
    recording = session.get(MedicalRecording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    if not recording.consent_given:
        raise HTTPException(
            status_code=400,
            detail="Cannot transcribe: Patient consent not given"
        )
    
    try:
        # Save uploaded file
        file_extension = os.path.splitext(audio_file.filename)[1] or ".mp3"
        file_path = os.path.join(UPLOAD_DIR, f"recording_{recording_id}{file_extension}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        
        # Update recording with file path
        recording.audio_file_path = file_path
        recording.status = "processing"
        session.commit()
        
        # Transcribe audio
        transcription_service = get_transcription_service()
        result = await transcription_service.transcribe_audio(file_path)
        
        # Create transcript record
        transcript = Transcript(
            recording_id=recording_id,
            transcript_text=result["text"],
            language=result.get("language", "en"),
            confidence_score=str(result.get("confidence")) if result.get("confidence") else None
        )
        
        session.add(transcript)
        
        # Update recording status
        recording.status = "completed"
        session.commit()
        session.refresh(transcript)
        
        # Optionally delete audio file after transcription (for privacy/compliance)
        # Uncomment if you want to auto-delete:
        # if os.path.exists(file_path):
        #     os.remove(file_path)
        
        return transcript
        
    except Exception as e:
        recording.status = "failed"
        session.commit()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/summary/{recording_id}", response_model=SummaryRead)
async def generate_summary(
    recording_id: int,
    session: Session = Depends(get_session)
):
    """
    Generate medical summary from transcript.
    
    Args:
        recording_id: ID of the recording
        
    Returns:
        Generated medical summary
    """
    # Get recording and transcript
    recording = session.get(MedicalRecording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    transcript = session.query(Transcript).filter(
        Transcript.recording_id == recording_id
    ).first()
    
    if not transcript:
        raise HTTPException(
            status_code=404,
            detail="Transcript not found. Please transcribe the audio first."
        )
    
    # Get doctor info
    doctor = session.get(Doctor, recording.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    try:
        # Generate summary using AI
        summary_service = MedicalSummaryService()
        summary_data = await summary_service.generate_summary(
            transcript.transcript_text,
            doctor_name=doctor.name
        )
        
        # Create summary record
        summary = MedicalSummary(
            recording_id=recording_id,
            transcript_id=transcript.transcript_id,
            doctor_id=recording.doctor_id,
            chief_complaint=summary_data.get("chief_complaint"),
            history_of_present_illness=summary_data.get("history_of_present_illness"),
            physical_examination=summary_data.get("physical_examination"),
            assessment=summary_data.get("assessment"),
            plan=summary_data.get("plan"),
            follow_up_instructions=summary_data.get("follow_up_instructions"),
            status="draft"
        )
        
        session.add(summary)
        session.commit()
        session.refresh(summary)
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")


@router.get("/summary/{summary_id}", response_model=SummaryRead)
async def get_summary(
    summary_id: int,
    session: Session = Depends(get_session)
):
    """Get a medical summary by ID."""
    summary = session.get(MedicalSummary, summary_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    return summary


@router.patch("/summary/{summary_id}", response_model=SummaryRead)
async def update_summary(
    summary_id: int,
    summary_update: SummaryUpdate,
    session: Session = Depends(get_session)
):
    """
    Update a medical summary (for doctor editing before approval).
    """
    summary = session.get(MedicalSummary, summary_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    
    # Update fields
    update_data = summary_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(summary, field, value)
    
    summary.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(summary)
    
    return summary


@router.post("/summary/{summary_id}/approve", response_model=SummaryRead)
async def approve_summary(
    summary_id: int,
    approved_by: int = Form(...),
    session: Session = Depends(get_session)
):
    """
    Approve a medical summary (doctor must approve before finalizing).
    """
    summary = session.get(MedicalSummary, summary_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    
    # Verify approving doctor exists
    doctor = session.get(Doctor, approved_by)
    if not doctor:
        raise HTTPException(status_code=404, detail="Approving doctor not found")
    
    summary.status = "approved"
    summary.doctor_approved = True
    summary.approved_by = approved_by
    summary.approved_at = datetime.utcnow()
    summary.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(summary)
    
    return summary


@router.get("/recordings/{doctor_id}", response_model=list[RecordingRead])
async def get_doctor_recordings(
    doctor_id: int,
    session: Session = Depends(get_session)
):
    """Get all recordings for a specific doctor."""
    recordings = session.query(MedicalRecording).filter(
        MedicalRecording.doctor_id == doctor_id
    ).order_by(MedicalRecording.created_at.desc()).all()
    
    return recordings


@router.get("/summaries/{doctor_id}", response_model=list[SummaryRead])
async def get_doctor_summaries(
    doctor_id: int,
    status: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get all summaries for a specific doctor."""
    query = session.query(MedicalSummary).filter(
        MedicalSummary.doctor_id == doctor_id
    )
    
    if status:
        query = query.filter(MedicalSummary.status == status)
    
    summaries = query.order_by(MedicalSummary.created_at.desc()).all()
    return summaries


@router.delete("/recording/{recording_id}")
async def delete_recording(
    recording_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a recording and associated data.
    This also deletes the audio file, transcript, and summary.
    """
    recording = session.get(MedicalRecording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Delete associated transcript
    transcript = session.query(Transcript).filter(
        Transcript.recording_id == recording_id
    ).first()
    if transcript:
        session.delete(transcript)
    
    # Delete associated summary
    summary = session.query(MedicalSummary).filter(
        MedicalSummary.recording_id == recording_id
    ).first()
    if summary:
        session.delete(summary)
    
    # Delete audio file if exists
    if recording.audio_file_path and os.path.exists(recording.audio_file_path):
        os.remove(recording.audio_file_path)
    
    # Delete recording
    session.delete(recording)
    session.commit()
    
    return {"message": "Recording and associated data deleted successfully"}

