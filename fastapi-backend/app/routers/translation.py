"""
Translation Router - Real-time multilingual translation using Groq API.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import json
from ..config import get_settings

settings = get_settings()

router = APIRouter(prefix="/translate", tags=["translation"])


class TranslationRequest(BaseModel):
    """Request model for translation."""
    text: str
    target_language: str  # Language code: en, ms, zh, ta, my, ne, bn


class TranslationResponse(BaseModel):
    """Response model for translation."""
    translated: str
    source_language: Optional[str] = None
    target_language: str


@router.post("", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """
    Translate text to target language using Groq API.
    
    Args:
        request: Translation request with text and target language
        
    Returns:
        Translated text
        
    Supported languages:
    - en: English
    - ms: Malay
    - zh: Chinese (Simplified)
    - ta: Tamil
    - my: Burmese
    - ne: Nepali
    - bn: Bengali
    """
    clean_text = request.text.strip() if request.text else ""
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # For very short text (1-2 words), just return as-is if it's likely not meaningful speech
    if len(clean_text) < 3:
        print(f"⚠️ [TRANSLATION] Text too short, returning as-is: '{clean_text}'")
        return TranslationResponse(
            translated=clean_text,
            target_language=request.target_language
        )
    
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=503,
            detail="Translation service unavailable: GROQ_API_KEY not configured"
        )
    
    # Language code to name mapping
    language_names = {
        "en": "English",
        "ms": "Malay",
        "zh": "Chinese (Simplified)",
        "ta": "Tamil",
        "my": "Burmese",
        "ne": "Nepali",
        "bn": "Bengali"
    }
    
    target_lang_name = language_names.get(request.target_language.lower(), request.target_language)
    
    # Build prompt for Groq
    prompt = f"""Translate the following clinical conversation accurately into {target_lang_name}. 
Preserve medical meaning and terminology. Do not add hallucinations or extra information.
Keep the translation concise and accurate.

Text to translate:
{request.text}

Translation:"""
    
    try:
        # Use Groq's chat completions API
        groq_url = f"{settings.groq_api_base_url}/openai/v1/chat/completions"
        print(f"📡 [TRANSLATION] Calling Groq API: {groq_url}")
        print(f"   Model: llama-3.1-8b-instant")
        print(f"   Text length: {len(request.text)}")
        print(f"   Target: {target_lang_name}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                groq_url,
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-8b-instant",  # Using faster 8B model for real-time
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a medical translator. Translate accurately and concisely. Only output the translation, nothing else."
                        },
                        {
                            "role": "user",
                            "content": f"Translate to {target_lang_name}: {request.text}"
                        }
                    ],
                    "temperature": 0.2,  # Lower temperature for accurate translation
                    "max_tokens": 500
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Extract translated text
            translated_text = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            
            if not translated_text:
                raise HTTPException(
                    status_code=500,
                    detail="Translation service returned empty response"
                )
            
            print(f"✅ [TRANSLATION] Translated text from {len(request.text)} chars to {len(translated_text)} chars")
            print(f"   Target language: {target_lang_name} ({request.target_language})")
            
            return TranslationResponse(
                translated=translated_text,
                target_language=request.target_language
            )
            
    except httpx.HTTPStatusError as e:
        error_detail = ""
        try:
            error_detail = e.response.json()
        except:
            error_detail = e.response.text
        
        error_msg = f"Groq API error: {e.response.status_code}"
        if e.response.status_code == 401:
            error_msg = "Invalid GROQ_API_KEY"
        elif e.response.status_code == 400:
            error_msg = f"Bad request to Groq API: {error_detail}"
        elif e.response.status_code == 429:
            error_msg = "Rate limit exceeded. Please try again later."
        print(f"❌ [TRANSLATION] {error_msg}")
        print(f"   Error detail: {error_detail}")
        raise HTTPException(status_code=503, detail=error_msg)
    except httpx.TimeoutException:
        print("❌ [TRANSLATION] Request timeout")
        raise HTTPException(status_code=504, detail="Translation service timeout")
    except Exception as e:
        print(f"❌ [TRANSLATION] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


@router.get("/languages")
async def get_supported_languages():
    """
    Get list of supported languages for translation.
    
    These languages are commonly used in Malaysia/Southeast Asia medical contexts.
    More languages can be added by updating the language_names mapping in translate_text().
    
    Note: Groq API supports many more languages, but we limit to these for:
    1. Medical context relevance (common languages in Malaysia)
    2. UI simplicity
    3. Quality assurance (tested languages)
    
    To add more languages:
    1. Add language code and name to language_names dict in translate_text()
    2. Add to this list
    3. Update frontend supportedLanguages array
    """
    return {
        "languages": [
            {"code": "en", "name": "English"},
            {"code": "ms", "name": "Malay"},
            {"code": "zh", "name": "Chinese (Simplified)"},
            {"code": "ta", "name": "Tamil"},
            {"code": "my", "name": "Burmese"},
            {"code": "ne", "name": "Nepali"},
            {"code": "bn", "name": "Bengali"},
            # Additional languages can be added here
            # {"code": "th", "name": "Thai"},
            # {"code": "vi", "name": "Vietnamese"},
            # {"code": "id", "name": "Indonesian"},
            # {"code": "hi", "name": "Hindi"},
            # {"code": "es", "name": "Spanish"},
            # {"code": "fr", "name": "French"},
        ]
    }

