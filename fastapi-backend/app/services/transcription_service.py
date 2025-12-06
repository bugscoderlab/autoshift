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
        
        # Check if file exists
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
        
        # Check file size (Groq requires at least some audio data)
        file_size = os.path.getsize(audio_file_path)
        if file_size < 100:  # Less than 100 bytes is likely empty/corrupt
            print(f"⚠️ [TRANSCRIPTION] Audio file too small ({file_size} bytes), returning empty transcript")
            return {
                "text": "",
                "language": language or "en",
                "confidence": None
            }
        
        try:
            # Determine MIME type based on file extension
            file_ext = os.path.splitext(audio_file_path)[1].lower()
            mime_types = {
                ".m4a": "audio/m4a",
                ".mp3": "audio/mpeg",
                ".wav": "audio/wav",
                ".ogg": "audio/ogg",
                ".flac": "audio/flac",
                ".webm": "audio/webm",
            }
            mime_type = mime_types.get(file_ext, "audio/mpeg")
            
            print(f"📝 [TRANSCRIPTION] Transcribing file: {audio_file_path}")
            print(f"📝 [TRANSCRIPTION] File size: {file_size} bytes")
            print(f"📝 [TRANSCRIPTION] MIME type: {mime_type}")
            print(f"📝 [TRANSCRIPTION] Language hint: {language}")
            
            with open(audio_file_path, "rb") as audio_file:
                files = {
                    "file": (os.path.basename(audio_file_path), audio_file, mime_type)
                }
                data = {
                    "model": "whisper-large-v3",
                    "response_format": "json"
                }
                
                # Only add language if specified (let Whisper auto-detect if not)
                if language:
                    data["language"] = language
                
                headers = {
                    "Authorization": f"Bearer {self.api_key}"
                }
                
                async with httpx.AsyncClient(timeout=60.0) as client:
                    print(f"📡 [TRANSCRIPTION] Calling Groq Whisper API...")
                    response = await client.post(
                        f"{self.api_base_url}/openai/v1/audio/transcriptions",
                        files=files,
                        data=data,
                        headers=headers
                    )
                    
                    print(f"📡 [TRANSCRIPTION] Groq API response status: {response.status_code}")
                    
                    # Handle different error cases
                    if response.status_code == 400:
                        error_text = response.text
                        print(f"❌ [TRANSCRIPTION] Groq API 400 Bad Request: {error_text}")
                        # For 400 errors, return empty transcript instead of failing
                        # This allows the flow to continue
                        return {
                            "text": "",
                            "language": language or "en",
                            "confidence": None
                        }
                    
                    response.raise_for_status()
                    
                    result = response.json()
                    
                    transcribed_text = result.get("text", "").strip()
                    detected_lang = result.get("language", language or "en")
                    
                    print(f"✅ [TRANSCRIPTION] Transcription successful")
                    print(f"📝 [TRANSCRIPTION] Text: {transcribed_text[:100]}...")
                    print(f"📝 [TRANSCRIPTION] Detected language: {detected_lang}")
                    
                    return {
                        "text": transcribed_text,
                        "language": detected_lang,
                        "confidence": None  # Groq doesn't provide confidence score
                    }
                    
        except httpx.HTTPStatusError as e:
            error_detail = ""
            try:
                error_detail = e.response.json()
            except:
                error_detail = e.response.text
            
            print(f"❌ [TRANSCRIPTION] HTTP Error {e.response.status_code}: {error_detail}")
            
            # For 400/401/429 errors, return empty transcript instead of crashing
            # This allows the app to continue functioning
            if e.response.status_code in [400, 401, 429]:
                return {
                    "text": "",
                    "language": language or "en",
                    "confidence": None
                }
            
            # For other errors, raise exception
            raise Exception(f"Transcription failed: HTTP {e.response.status_code} - {error_detail}")
            
        except httpx.TimeoutException:
            print("❌ [TRANSCRIPTION] Request timeout")
            raise Exception("Transcription timeout - audio file may be too large")
            
        except Exception as e:
            print(f"❌ [TRANSCRIPTION] Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
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

