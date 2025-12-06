"""
Medical Summary models for doctor-patient conversation recordings and summaries.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

from .base import Base


class RecordingStatus(str, Enum):
    """Recording status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SummaryStatus(str, Enum):
    """Summary status enum."""
    DRAFT = "draft"
    APPROVED = "approved"
    REJECTED = "rejected"


class MedicalRecording(Base):
    """Medical recording database model."""
    __tablename__ = "medical_recording"
    
    recording_id = Column(Integer, primary_key=True, autoincrement=True)
    doctor_id = Column(Integer, ForeignKey("doctor.doctor_id"), nullable=False, index=True)
    patient_id = Column(Integer, nullable=True, index=True)  # Optional patient ID
    patient_name = Column(String(255), nullable=True)  # Patient name if no ID
    audio_file_path = Column(String(500), nullable=True)  # Path to stored audio file
    audio_file_url = Column(String(500), nullable=True)  # URL if stored in cloud
    duration_seconds = Column(Integer, nullable=True)  # Recording duration
    status = Column(String(20), default="pending")
    consent_given = Column(Boolean, default=False)  # Patient consent for recording
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Transcript(Base):
    """Transcript database model."""
    __tablename__ = "transcript"
    
    transcript_id = Column(Integer, primary_key=True, autoincrement=True)
    recording_id = Column(Integer, ForeignKey("medical_recording.recording_id"), nullable=False, index=True)
    transcript_text = Column(Text, nullable=False)  # Full transcript text
    language = Column(String(10), default="en")  # Detected language
    confidence_score = Column(String(20), nullable=True)  # Transcription confidence
    created_at = Column(DateTime, default=datetime.utcnow)


class MedicalSummary(Base):
    """Medical summary database model."""
    __tablename__ = "medical_summary"
    
    summary_id = Column(Integer, primary_key=True, autoincrement=True)
    recording_id = Column(Integer, ForeignKey("medical_recording.recording_id"), nullable=False, index=True)
    transcript_id = Column(Integer, ForeignKey("transcript.transcript_id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor.doctor_id"), nullable=False, index=True)
    
    # Structured summary fields
    chief_complaint = Column(Text, nullable=True)
    history_of_present_illness = Column(Text, nullable=True)
    physical_examination = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)  # Diagnosis
    plan = Column(Text, nullable=True)  # Treatment plan
    follow_up_instructions = Column(Text, nullable=True)
    
    # Metadata
    status = Column(String(20), default="draft")
    doctor_approved = Column(Boolean, default=False)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("doctor.doctor_id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Pydantic schemas for API validation

class RecordingBase(BaseModel):
    """Base recording schema."""
    doctor_id: int
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    consent_given: bool = False


class RecordingCreate(RecordingBase):
    """Schema for creating a recording."""
    pass


class RecordingRead(RecordingBase):
    """Schema for reading a recording."""
    recording_id: int
    audio_file_path: Optional[str] = None
    audio_file_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TranscriptCreate(BaseModel):
    """Schema for creating a transcript."""
    recording_id: int
    transcript_text: str
    language: str = "en"
    confidence_score: Optional[str] = None


class TranscriptRead(BaseModel):
    """Schema for reading a transcript."""
    transcript_id: int
    recording_id: int
    transcript_text: str
    language: str
    confidence_score: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class SummaryCreate(BaseModel):
    """Schema for creating a summary."""
    recording_id: int
    transcript_id: int
    doctor_id: int
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    physical_examination: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    follow_up_instructions: Optional[str] = None


class SummaryRead(BaseModel):
    """Schema for reading a summary."""
    summary_id: int
    recording_id: int
    transcript_id: int
    doctor_id: int
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    physical_examination: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    status: str
    doctor_approved: bool
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SummaryUpdate(BaseModel):
    """Schema for updating a summary."""
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    physical_examination: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    status: Optional[str] = None
    doctor_approved: Optional[bool] = None

