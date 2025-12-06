#!/usr/bin/env python3
"""Check AI configuration and test connections."""

import sys
import os
from app.config import settings


def check_api_keys():
    """Check if API keys are set."""
    print("=" * 60)
    print("AI Configuration Check")
    print("=" * 60)
    print()
    
    print("Environment Variables:")
    print(f"  AI_ENABLED: {settings.ai_enabled}")
    print()
    
    # Check Claude
    claude_set = bool(settings.claude_api_key)
    claude_preview = settings.claude_api_key[:10] + "..." if settings.claude_api_key and len(settings.claude_api_key) > 10 else "Not set"
    print(f"Claude API:")
    print(f"  CLAUDE_API_KEY: {'✓ Set' if claude_set else '✗ Not set'}")
    if claude_set:
        print(f"  Key preview: {claude_preview}")
    print(f"  Base URL: {settings.claude_api_base_url}")
    print()
    
    # Check Groq
    groq_set = bool(settings.groq_api_key)
    groq_preview = settings.groq_api_key[:10] + "..." if settings.groq_api_key and len(settings.groq_api_key) > 10 else "Not set"
    print(f"Groq API:")
    print(f"  GROQ_API_KEY: {'✓ Set' if groq_set else '✗ Not set'}")
    if groq_set:
        print(f"  Key preview: {groq_preview}")
    print(f"  Base URL: {settings.groq_api_base_url}")
    print()
    
    # Check from environment directly
    print("Direct Environment Check:")
    env_claude = os.getenv("CLAUDE_API_KEY")
    env_groq = os.getenv("GROQ_API_KEY")
    print(f"  CLAUDE_API_KEY in env: {'✓' if env_claude else '✗'}")
    print(f"  GROQ_API_KEY in env: {'✓' if env_groq else '✗'}")
    print()
    
    return claude_set, groq_set


def test_claude_connection():
    """Test Claude API connection."""
    print("Testing Claude API connection...")
    try:
        from app.ai.clients import ClaudeClient
        client = ClaudeClient()
        print("✓ Claude client created successfully")
        
        # Try a simple request
        print("Sending test request...")
        response = client.generate("Say 'Hello' if you can read this.", max_tokens=10)
        print(f"✓ Claude response received: {response[:50]}...")
        return True
    except ValueError as e:
        print(f"✗ Claude API key error: {e}")
        return False
    except Exception as e:
        error_msg = str(e)
        print(f"✗ Claude API error: {error_msg}")
        if "401" in error_msg or "authentication" in error_msg.lower():
            print("  → This is an authentication error. Check your CLAUDE_API_KEY.")
        return False


def test_groq_connection():
    """Test Groq API connection."""
    print("Testing Groq API connection...")
    try:
        from app.ai.clients import GroqClient
        client = GroqClient()
        print("✓ Groq client created successfully")
        
        # Try a simple request
        print("Sending test request...")
        response = client.generate("Say 'Hello' if you can read this.", max_tokens=10)
        print(f"✓ Groq response received: {response[:50]}...")
        return True
    except ValueError as e:
        print(f"✗ Groq API key error: {e}")
        return False
    except Exception as e:
        error_msg = str(e)
        print(f"✗ Groq API error: {error_msg}")
        if "401" in error_msg or "authentication" in error_msg.lower() or "x-api-key" in error_msg.lower():
            print("  → This is an authentication error. Check your GROQ_API_KEY.")
        return False


def main():
    """Main function."""
    claude_set, groq_set = check_api_keys()
    
    print("=" * 60)
    print("Connection Tests")
    print("=" * 60)
    print()
    
    if not settings.ai_enabled:
        print("⚠ AI is disabled. Set AI_ENABLED=true to enable.")
        return
    
    results = {}
    
    if claude_set:
        print("1. Testing Claude...")
        results['claude'] = test_claude_connection()
        print()
    else:
        print("1. Claude: Skipped (API key not set)")
        print()
    
    if groq_set:
        print("2. Testing Groq...")
        results['groq'] = test_groq_connection()
        print()
    else:
        print("2. Groq: Skipped (API key not set)")
        print()
    
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print()
    
    if not claude_set and not groq_set:
        print("❌ No AI API keys configured")
        print()
        print("To fix:")
        print("1. Add API keys to your .env file:")
        print("   CLAUDE_API_KEY=your_claude_key_here")
        print("   GROQ_API_KEY=your_groq_key_here")
        print()
        print("2. Get API keys from:")
        print("   Claude: https://console.anthropic.com/")
        print("   Groq: https://console.groq.com/")
    elif claude_set and results.get('claude'):
        print("✅ Claude API is working")
    elif groq_set and results.get('groq'):
        print("✅ Groq API is working")
    else:
        print("⚠ Some API keys are set but connections are failing")
        print("Check the error messages above for details")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nAborted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

