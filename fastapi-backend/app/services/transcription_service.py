"""
Transcription Service - Handles audio-to-text conversion using Groq Whisper API.
"""

import os
import httpx
from typing import Optional
from ..config import get_settings

settings = get_settings()


class TranscriptionService:
    """Service for transcribing audio files using Groq Whisper API."""
    
    def __init__(self):
        self.api_key = settings.groq_api_key
        self.api_base_url = settings.groq_api_base_url or "https://api.groq.com"
    
    async def transcribe_audio(
        self, 
        audio_file_path: str,
        language: Optional[str] = "en"
    ) -> dict:
        """
        Transcribe audio file using Groq Whisper API.
        
        Args:
            audio_file_path: Path to the audio file
            language: Language code (e.g., 'en', 'es', 'fr')
            
        Returns:
            Dictionary with transcript and metadata:
            {
                "text": str,
                "language": str,
                "confidence": Optional[float]
            }
        """
        if not self.api_key:
            raise ValueError("Groq API key not configured. Set GROQ_API_KEY in .env")
        
        try:
            with open(audio_file_path, "rb") as audio_file:
                files = {
                    "file": (os.path.basename(audio_file_path), audio_file, "audio/mpeg")
                }
                data = {
                    "model": "whisper-large-v3",
                    "language": language,
                    "response_format": "json"
                }
                
                headers = {
                    "Authorization": f"Bearer {self.api_key}"
                }
                
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        f"{self.api_base_url}/openai/v1/audio/transcriptions",
                        files=files,
                        data=data,
                        headers=headers
                    )
                    response.raise_for_status()
                    
                    result = response.json()
                    
                    return {
                        "text": result.get("text", ""),
                        "language": result.get("language", language),
                        "confidence": None  # Groq doesn't provide confidence score
                    }
        except Exception as e:
            raise Exception(f"Transcription failed: {str(e)}")


# Alternative: Deepgram transcription (if preferred)
class DeepgramTranscriptionService:
    """Alternative transcription service using Deepgram API."""
    
    def __init__(self):
        self.api_key = os.getenv("DEEPGRAM_API_KEY", "")
        self.api_url = "https://api.deepgram.com/v1/listen"
    
    async def transcribe_audio(
        self,
        audio_file_path: str,
        language: Optional[str] = "en"
    ) -> dict:
        """
        Transcribe audio using Deepgram API.
        
        Args:
            audio_file_path: Path to the audio file
            language: Language code
            
        Returns:
            Dictionary with transcript and metadata
        """
        if not self.api_key:
            raise ValueError("Deepgram API key not configured. Set DEEPGRAM_API_KEY in .env")
        
        try:
            with open(audio_file_path, "rb") as audio_file:
                headers = {
                    "Authorization": f"Token {self.api_key}"
                }
                
                params = {
                    "model": "nova-2",
                    "language": language,
                    "punctuate": "true",
                    "diarize": "false"
                }
                
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        self.api_url,
                        files={"audio": audio_file},
                        headers=headers,
                        params=params
                    )
                    response.raise_for_status()
                    
                    result = response.json()
                    transcript = result.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0].get("transcript", "")
                    
                    return {
                        "text": transcript,
                        "language": language,
                        "confidence": result.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0].get("confidence", None)
                    }
        except Exception as e:
            raise Exception(f"Deepgram transcription failed: {str(e)}")


# Factory function to get transcription service
def get_transcription_service():
    """Get the configured transcription service."""
    # Prefer Groq if available, fallback to Deepgram
    if settings.groq_api_key:
        return TranscriptionService()
    elif os.getenv("DEEPGRAM_API_KEY"):
        return DeepgramTranscriptionService()
    else:
        raise ValueError("No transcription service configured. Set GROQ_API_KEY or DEEPGRAM_API_KEY in .env")

