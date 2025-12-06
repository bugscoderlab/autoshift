#!/usr/bin/env python3
"""List available Claude models for your API key."""

import sys
from anthropic import Anthropic
from app.config import settings


def list_available_models():
    """List available Claude models."""
    print("=" * 60)
    print("Checking Available Claude Models")
    print("=" * 60)
    print()
    
    if not settings.claude_api_key:
        print("❌ CLAUDE_API_KEY not set in .env file")
        return
    
    try:
        client = Anthropic(api_key=settings.claude_api_key)
        
        # Try to get models list (if API supports it)
        # Note: Anthropic API might not have a models endpoint
        # So we'll test common model names instead
        
        print("Testing common Claude model names...")
        print()
        
        models_to_test = [
            "claude-3-5-sonnet-20240620",
            "claude-3-sonnet-20240229",
            "claude-3-opus-20240229",
            "claude-3-haiku-20240307",
            "claude-sonnet-4-20250514",  # Newer format
            "claude-opus-4-20250514",
            "claude-haiku-4-20250514",
        ]
        
        available_models = []
        
        for model_name in models_to_test:
            try:
                # Try a minimal request to test if model exists
                response = client.messages.create(
                    model=model_name,
                    max_tokens=5,
                    messages=[{"role": "user", "content": "Hi"}]
                )
                print(f"✅ {model_name} - Available")
                available_models.append(model_name)
            except Exception as e:
                error_msg = str(e)
                if "404" in error_msg or "not_found" in error_msg.lower():
                    print(f"❌ {model_name} - Not available (404)")
                elif "401" in error_msg or "authentication" in error_msg.lower():
                    print(f"⚠️  {model_name} - Authentication error (check API key)")
                    break
                else:
                    print(f"⚠️  {model_name} - Error: {error_msg[:100]}")
        
        print()
        print("=" * 60)
        if available_models:
            print("✅ Available Models:")
            for model in available_models:
                print(f"   - {model}")
            print()
            print("Add this to your .env file:")
            print(f"   CLAUDE_MODEL={available_models[0]}")
        else:
            print("❌ No models found. Please check:")
            print("   1. Your API key is valid")
            print("   2. Your API key has access to Claude models")
            print("   3. Your API key is not expired")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    try:
        list_available_models()
    except KeyboardInterrupt:
        print("\n\nAborted by user.")
        sys.exit(1)

