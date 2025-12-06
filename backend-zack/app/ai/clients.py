"""AI client implementations for Claude and Groq."""

from typing import Optional, Dict, Any
from anthropic import Anthropic
from groq import Groq
from app.config import settings


class ClaudeClient:
    """Claude API client for complex reasoning tasks."""
    
    def __init__(self):
        """Initialize Claude client."""
        if not settings.claude_api_key:
            raise ValueError("CLAUDE_API_KEY not set")
        # Anthropic client initialization
        client_kwargs = {"api_key": settings.claude_api_key}
        # Note: base_url may not be supported in all Anthropic SDK versions
        # If you need custom base_url, check Anthropic SDK documentation
        self.client = Anthropic(**client_kwargs)
        # Use model from settings (configurable via CLAUDE_MODEL env var)
        # Try common model names - fallback if one doesn't work
        # Available models vary by API key access level
        self.model = settings.claude_model
        # Fallback models to try if primary fails
        # Different API keys may have access to different models
        self.fallback_models = [
            "claude-3-sonnet-20240229",  # Most commonly available
            "claude-3-5-sonnet-20240620",  # Newer, may require specific access
            "claude-3-opus-20240229",
            "claude-3-haiku-20240307",
            # Newer format (if available)
            "claude-sonnet-4-20250514",
            "claude-opus-4-20250514",
            "claude-haiku-4-20250514",
        ]
    
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generate response from Claude.
        
        Args:
            prompt: User prompt
            system_prompt: System prompt (optional)
            max_tokens: Maximum tokens to generate (uses config default if None)
            
        Returns:
            Generated text response
        """
        messages = [{"role": "user", "content": prompt}]
        
        # Build request parameters
        request_params = {
            "model": self.model,
            "max_tokens": max_tokens or settings.ai_max_tokens,
            "messages": messages
        }
        
        # Add system prompt only if provided and not empty
        # Some Anthropic SDK versions may expect system as a list, but typically it's a string
        # We'll only include it if it's a valid non-empty string
        if system_prompt:
            # Ensure system_prompt is a string
            if isinstance(system_prompt, str) and system_prompt.strip():
                request_params["system"] = system_prompt.strip()
            elif isinstance(system_prompt, list):
                # If it's a list, convert to string (join if multiple items)
                system_str = " ".join(str(item) for item in system_prompt) if system_prompt else None
                if system_str and system_str.strip():
                    request_params["system"] = system_str.strip()
            # If None or empty, don't include system parameter
        
        # Try the primary model first, then fallbacks if it fails
        models_to_try = [request_params["model"]] + [
            m for m in self.fallback_models if m != request_params["model"]
        ]
        
        last_error = None
        for model_name in models_to_try:
            try:
                request_params["model"] = model_name
                print(f"[Claude] Trying model: {model_name}")
                response = self.client.messages.create(**request_params)
                
                # Extract text from response
                if response.content and len(response.content) > 0:
                    # Handle both text and block types
                    content_item = response.content[0]
                    if hasattr(content_item, 'text'):
                        print(f"[Claude] Successfully used model: {model_name}")
                        return content_item.text
                    elif isinstance(content_item, str):
                        print(f"[Claude] Successfully used model: {model_name}")
                        return content_item
                    else:
                        print(f"[Claude] Successfully used model: {model_name}")
                        return str(content_item)
                else:
                    return "No response content received from Claude"
            except Exception as e:
                error_msg = str(e)
                # If it's a 404 (model not found), try next model
                if "404" in error_msg or "not_found" in error_msg.lower():
                    print(f"[Claude] Model {model_name} not available, trying next...")
                    last_error = e
                    continue
                else:
                    # For other errors, raise immediately
                    print(f"[Claude] API call failed with model {model_name}: {error_msg}")
                    raise
        
        # If all models failed, raise the last error
        if last_error:
            error_msg = str(last_error)
            print(f"[Claude] All models failed. Last error: {error_msg}")
            print(f"[Claude] Tried models: {models_to_try}")
            print(f"[Claude] Please check:")
            print(f"[Claude]   1. Your API key has access to Claude models")
            print(f"[Claude]   2. Your API key is valid and not expired")
            print(f"[Claude]   3. Set CLAUDE_MODEL in .env to a model you have access to")
            raise last_error


class GroqClient:
    """Groq API client for fast inference."""
    
    def __init__(self):
        """Initialize Groq client."""
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY not set")
        # Groq client initialization
        client_kwargs = {"api_key": settings.groq_api_key}
        # Groq SDK may support base_url - check documentation for your version
        # For now, using default base_url from SDK
        self.client = Groq(**client_kwargs)
        # Use model from settings (configurable via GROQ_MODEL env var)
        self.model = settings.groq_model
    
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generate response from Groq.
        
        Args:
            prompt: User prompt
            system_prompt: System prompt (optional)
            max_tokens: Maximum tokens to generate (uses config default if None)
            
        Returns:
            Generated text response
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens or settings.ai_max_tokens,
            temperature=settings.ai_temperature
        )
        
        return response.choices[0].message.content


def get_ai_client(use_fast: bool = False) -> Optional[Any]:
    """
    Get appropriate AI client based on configuration.
    
    Args:
        use_fast: If True, use Groq (fast). If False, use Claude (best reasoning).
        
    Returns:
        AI client instance or None if AI is disabled
    """
    if not settings.ai_enabled:
        print("[AI] AI is disabled in configuration")
        return None
    
    try:
        if use_fast:
            print("[AI] Using Groq (fast inference)")
            if not settings.groq_api_key:
                print("[AI] ERROR: GROQ_API_KEY not set in environment")
                return None
            client = GroqClient()
            print(f"[AI] Groq client initialized with model: {client.model}")
            return client
        else:
            print("[AI] Using Claude (best reasoning)")
            if not settings.claude_api_key:
                print("[AI] ERROR: CLAUDE_API_KEY not set in environment")
                return None
            client = ClaudeClient()
            print(f"[AI] Claude client initialized with model: {client.model}")
            return client
    except ValueError as e:
        print(f"[AI] ERROR: API key missing - {e}")
        return None
    except Exception as e:
        print(f"[AI] ERROR: Client initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return None

