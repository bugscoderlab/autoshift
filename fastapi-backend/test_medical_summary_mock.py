"""
Test Medical Summary Feature with Mock Data
Run this script to test the medical summary generation without requiring audio recording or API keys.
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.mock_medical_data import get_mock_transcript, get_mock_summary, get_all_mock_cases
from app.services.summary_service import MedicalSummaryService


async def test_summary_generation():
    """Test summary generation with mock data."""
    
    print("=" * 60)
    print("MEDICAL SUMMARY TESTING WITH MOCK DATA")
    print("=" * 60)
    
    # Check if Claude API key is configured
    from app.config import get_settings
    settings = get_settings()
    
    if not settings.claude_api_key:
        print("\n⚠️  WARNING: CLAUDE_API_KEY not configured!")
        print("   The test will use mock responses.")
        print("   Set CLAUDE_API_KEY in .env to test with real AI.\n")
    else:
        print("\n✅ Claude API key found - testing with real AI\n")
    
    # Test with different cases
    test_cases = get_all_mock_cases()
    
    summary_service = MedicalSummaryService()
    
    for case in test_cases:
        print(f"\n{'='*60}")
        print(f"TEST CASE: {case.upper()}")
        print(f"{'='*60}")
        
        # Get mock transcript
        transcript = get_mock_transcript(case)
        print(f"\n📝 Transcript ({len(transcript)} chars):")
        print("-" * 60)
        print(transcript[:200] + "..." if len(transcript) > 200 else transcript)
        print("-" * 60)
        
        # Get expected summary
        expected = get_mock_summary(case)
        print(f"\n✅ Expected Summary:")
        print(f"   Chief Complaint: {expected['chief_complaint'][:60]}...")
        print(f"   Assessment: {expected['assessment']}")
        
        # Generate summary
        try:
            print(f"\n🤖 Generating AI summary...")
            result = await summary_service.generate_summary(transcript, doctor_name="Dr. Test")
            
            print(f"\n📊 Generated Summary:")
            print("-" * 60)
            for key, value in result.items():
                if value:
                    preview = value[:80] + "..." if len(value) > 80 else value
                    print(f"   {key}: {preview}")
                else:
                    print(f"   {key}: <empty>")
            print("-" * 60)
            
            # Check if fields are populated
            populated_fields = sum(1 for v in result.values() if v)
            print(f"\n✅ Result: {populated_fields}/6 fields populated")
            
            if populated_fields >= 4:
                print("   ✅ SUCCESS: Summary generation working!")
            else:
                print("   ⚠️  WARNING: Some fields are missing")
                
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*60}")
    print("TESTING COMPLETE")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(test_summary_generation())


