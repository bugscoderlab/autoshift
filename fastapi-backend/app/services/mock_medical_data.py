"""
Mock Medical Summary Data for Testing
Use this to test the medical summary feature without requiring actual audio recording or AI API calls.
"""

from typing import Dict, List

# Sample transcripts for testing
MOCK_TRANSCRIPTS = {
    "cough": """Doctor: Good morning, how can I help you today?
Patient: I've been having a persistent cough for the past 3 days.
Doctor: Can you tell me more about the cough?
Patient: It's a dry cough, mostly in the evenings. It started mild but has gotten worse.
Doctor: Any fever or shortness of breath?
Patient: No fever, but I do feel some chest tightness, especially in the evenings.
Doctor: Let me check your vital signs. Your blood pressure is 128 over 82, heart rate is 78, respiratory rate is 16, temperature is 98.6 degrees Fahrenheit, and your oxygen saturation is 98 percent on room air.
Patient: What do you think it is?
Doctor: Based on your symptoms and examination, I believe you have acute bronchitis, likely viral. I'll prescribe guaifenesin 600 milligrams twice daily for 7 days. Also increase your fluid intake and get plenty of rest. If symptoms worsen or persist beyond 10 days, please come back.
Patient: Okay, thank you doctor.
Doctor: You're welcome. Follow up in 7 to 10 days if symptoms persist, or return immediately if you experience difficulty breathing, high fever above 101 degrees, or chest pain.""",

    "headache": """Doctor: Hello, what brings you in today?
Patient: I've been getting headaches for about a week now.
Doctor: Can you describe the headaches?
Patient: They're a dull ache, mostly in the morning when I wake up. They seem to get better as the day goes on.
Doctor: Any other symptoms?
Patient: I have some neck stiffness, but no nausea or vision problems.
Doctor: Let me check your blood pressure. It's 135 over 88, which is slightly elevated. Your neurological examination is normal. Based on your symptoms, I think these are tension headaches, possibly related to stress or posture.
Patient: What should I do?
Doctor: I'll prescribe some pain relief medication. Also try to manage your stress levels, improve your posture, especially if you work at a desk, and make sure you're getting adequate sleep. Come back in 2 weeks if the headaches don't improve.
Patient: Thank you doctor.""",

    "abdominal_pain": """Doctor: How can I help you today?
Patient: I've been having stomach pain for the last 2 days.
Doctor: Where exactly is the pain located?
Patient: It's in my lower right abdomen. It started yesterday morning.
Doctor: Is the pain constant or does it come and go?
Patient: It's constant and getting worse. It hurts more when I move or cough.
Doctor: Any nausea or vomiting?
Patient: Yes, I've been feeling nauseous and vomited twice this morning.
Doctor: Let me examine your abdomen. When I press on your lower right side, it's very tender. Your temperature is 100.2 degrees Fahrenheit. Based on your symptoms and examination, I'm concerned you might have appendicitis. I'm going to order some blood tests and a CT scan to confirm. You may need surgery.
Patient: Oh no, is it serious?
Doctor: If it is appendicitis, we'll need to remove your appendix, but it's a routine procedure. Let's get those tests done first to be sure.""",

    "fever": """Doctor: What seems to be the problem?
Patient: I've had a fever for 3 days now, and I feel really tired.
Doctor: What's your temperature been?
Patient: It's been around 101 to 102 degrees Fahrenheit.
Doctor: Any other symptoms?
Patient: I have a sore throat, body aches, and a runny nose.
Doctor: Let me check your throat. It's red and inflamed. Your temperature right now is 101.5 degrees. Based on your symptoms, this looks like a viral upper respiratory infection, possibly influenza. I recommend rest, plenty of fluids, and over-the-counter fever reducers like acetaminophen or ibuprofen. If your fever persists beyond 5 days or you develop difficulty breathing, please come back.
Patient: Should I take antibiotics?
Doctor: No, antibiotics don't work for viral infections. Just rest and stay hydrated. You should start feeling better in a few days.""",
}

# Expected AI-generated summaries (for comparison)
MOCK_SUMMARIES = {
    "cough": {
        "chief_complaint": "45-year-old patient presents with 3-day history of persistent dry cough and chest tightness",
        "history_of_present_illness": "Patient reports onset of dry cough 3 days ago, initially mild but progressively worsening. Associated with chest tightness, worse in the evenings. No fever or shortness of breath. Denies recent travel or sick contacts. Tried over-the-counter cough suppressants without relief.",
        "physical_examination": "Vital signs: BP 128/82, HR 78, RR 16, Temp 98.6°F, O2 Sat 98% on room air. General appearance: Well-appearing, comfortable. Respiratory examination: Clear to auscultation bilaterally, no wheezes or rales. Cardiovascular: Regular rate and rhythm, no murmurs.",
        "assessment": "Acute bronchitis, likely viral etiology",
        "plan": "1. Symptomatic management with guaifenesin 600mg twice daily for 7 days. 2. Increase fluid intake. 3. Rest as needed. 4. Return if symptoms worsen or persist beyond 10 days.",
        "follow_up_instructions": "Follow-up in 7-10 days if symptoms persist. Return immediately if experiencing difficulty breathing, high fever (>101°F), or chest pain."
    },
    "headache": {
        "chief_complaint": "Patient presents with 1-week history of headaches",
        "history_of_present_illness": "Patient reports dull aching headaches for approximately 1 week. Headaches occur primarily in the morning upon waking, improve as the day progresses. Associated with neck stiffness. Denies nausea, vomiting, or vision problems.",
        "physical_examination": "Vital signs: BP 135/88 (slightly elevated). Neurological examination: Normal. General appearance: No acute distress.",
        "assessment": "Tension headaches, possibly related to stress or posture",
        "plan": "1. Pain relief medication as prescribed. 2. Stress management. 3. Posture improvement, especially for desk work. 4. Ensure adequate sleep.",
        "follow_up_instructions": "Follow-up in 2 weeks if headaches do not improve."
    },
    "abdominal_pain": {
        "chief_complaint": "Patient presents with 2-day history of lower right abdominal pain",
        "history_of_present_illness": "Patient reports constant lower right abdominal pain starting yesterday morning, progressively worsening. Pain exacerbated by movement and coughing. Associated with nausea and vomiting (2 episodes this morning).",
        "physical_examination": "Vital signs: Temp 100.2°F. Abdominal examination: Tenderness in lower right quadrant. Rebound tenderness present.",
        "assessment": "Suspected appendicitis, requires further diagnostic workup",
        "plan": "1. Blood tests (CBC, metabolic panel). 2. CT scan of abdomen. 3. Surgical consultation pending results. 4. Possible appendectomy if confirmed.",
        "follow_up_instructions": "Await diagnostic test results. Return immediately if pain significantly worsens or if unable to tolerate oral intake."
    },
    "fever": {
        "chief_complaint": "Patient presents with 3-day history of fever and fatigue",
        "history_of_present_illness": "Patient reports fever for 3 days, temperature ranging 101-102°F. Associated symptoms include sore throat, body aches, and runny nose. Patient feels very tired.",
        "physical_examination": "Vital signs: Temp 101.5°F. Throat examination: Red and inflamed. General appearance: Appears fatigued.",
        "assessment": "Viral upper respiratory infection, possibly influenza",
        "plan": "1. Rest. 2. Increase fluid intake. 3. Over-the-counter fever reducers (acetaminophen or ibuprofen) as needed. 4. Supportive care.",
        "follow_up_instructions": "Return if fever persists beyond 5 days or if difficulty breathing develops. Antibiotics not indicated for viral infection."
    }
}


def get_mock_transcript(case: str = "cough") -> str:
    """Get a mock transcript for testing."""
    return MOCK_TRANSCRIPTS.get(case, MOCK_TRANSCRIPTS["cough"])


def get_mock_summary(case: str = "cough") -> Dict[str, str]:
    """Get expected mock summary for testing."""
    return MOCK_SUMMARIES.get(case, MOCK_SUMMARIES["cough"])


def get_all_mock_cases() -> List[str]:
    """Get list of all available mock cases."""
    return list(MOCK_TRANSCRIPTS.keys())


# For direct testing
if __name__ == "__main__":
    print("Available mock cases:", get_all_mock_cases())
    print("\nSample transcript (cough):")
    print(get_mock_transcript("cough"))
    print("\nExpected summary (cough):")
    print(get_mock_summary("cough"))


