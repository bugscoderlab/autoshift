import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Pressable, KeyboardAvoidingView, Platform, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useDoctor, useRoster, useLeave } from '../../services/dataHooks';
import { RosterEntry } from '../../services/api';
import { translationApi } from '../../services/api';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { colors, mode } = useThemeStore();
  const router = useRouter();
  const currentDoctorId = user?.doctor_id || 1; // Default to John Doe (doctor_id: 1)

  console.log('🏠 [HOME] Loading home screen for doctor_id:', currentDoctorId);

  // Fetch doctor info
  const { data: doctors, loading: doctorLoading } = useDoctor({});
  const currentDoctor = doctors?.find(d => d.doctor_id === currentDoctorId);
  
  useEffect(() => {
    if (currentDoctor) {
      console.log('🏠 [HOME] Doctor data loaded from database:', {
        name: currentDoctor.name,
        department: currentDoctor.department,
        source: 'DATABASE'
      });
    } else if (!doctorLoading) {
      console.log('⚠️ [HOME] No doctor found, using mock data fallback');
    }
  }, [currentDoctor, doctorLoading]);

  // Load supported languages function (load once when modal opens)
  const loadSupportedLanguages = async () => {
    // Prevent multiple simultaneous calls
    if (languagesLoaded) {
      console.log('🌐 [TRANSLATE] Languages already loaded, skipping...');
      return;
    }
    
    try {
      console.log('🌐 [TRANSLATE] Loading supported languages from API...');
      const response = await translationApi.getSupportedLanguages();
      console.log('🌐 [TRANSLATE] API Response:', response);
      
      if (response.languages && response.languages.length > 0) {
        setSupportedLanguages(response.languages);
        setLanguagesLoaded(true);
        console.log('✅ [TRANSLATE] Languages loaded successfully:', response.languages.length);
      } else {
        throw new Error('No languages in response');
      }
    } catch (error) {
      console.error('❌ [TRANSLATE] Failed to load supported languages:', error);
      // Keep default languages (already set in useState)
      setLanguagesLoaded(true);
      console.log('✅ [TRANSLATE] Using default languages:', supportedLanguages.length);
    }
  };

  // Load languages once when modal opens
  useEffect(() => {
    if (showTranslateModal && !languagesLoaded) {
      console.log('🌐 [TRANSLATE] Modal opened, loading languages...');
      loadSupportedLanguages();
    }
  }, [showTranslateModal]);

  const firstName = currentDoctor?.name || user?.employee?.firstName || 'John Doe';

  // Get current month/year
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Fetch roster for current month
  const { data: monthRoster, loading: rosterLoading } = useRoster({
    year: currentYear,
    month: currentMonth,
    doctor_id: currentDoctorId
  });

  useEffect(() => {
    if (monthRoster && monthRoster.length > 0) {
      console.log('🏠 [HOME] Roster data loaded from database:', {
        shifts_this_month: monthRoster.length,
        source: 'DATABASE',
        sample_entry: monthRoster[0]
      });
    } else if (!rosterLoading) {
      console.log('⚠️ [HOME] No roster data found for this month');
    }
  }, [monthRoster, rosterLoading]);

  // Fetch leave data
  const { data: leaves, loading: leaveLoading, source: leaveSource } = useLeave({ doctor_id: currentDoctorId });
  
  // Calculate leave days left (assuming 14 days annual leave)
  // Helper function to calculate days - matches leave tab calculation
  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Calculate leave days by type
  const leaveAllocations = {
    annual: 14,
    medical: 14,
    emergency: 5,
    other: 3,
  };
  
  const totalAllocation = Object.values(leaveAllocations).reduce((sum, val) => sum + val, 0); // 36 total
  
  const approvedLeaves = leaves?.filter(l => l.status === 'approved') || [];
  
  // Calculate used days by leave type
  const usedDaysByType = approvedLeaves.reduce((acc, leave) => {
    const type = leave.leave_type.toLowerCase();
    const days = leave.days || calculateDays(leave.start_date, leave.end_date);
    acc[type] = (acc[type] || 0) + days;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate remaining days by type
  const remainingByType = {
    annual: leaveAllocations.annual - (usedDaysByType['annual'] || 0),
    medical: leaveAllocations.medical - (usedDaysByType['medical'] || 0),
    emergency: leaveAllocations.emergency - (usedDaysByType['emergency'] || 0),
    other: leaveAllocations.other - (usedDaysByType['other'] || 0),
  };
  
  // Total used and remaining across all leave types
  const totalUsedDays = Object.values(usedDaysByType).reduce((sum, val) => sum + val, 0);
  const leaveDaysLeft = Object.values(remainingByType).reduce((sum, val) => sum + val, 0);

  useEffect(() => {
    if (leaves) {
      console.log('🏠 [HOME] Leave data loaded:', {
        total_leaves: leaves.length,
        by_status: {
          approved: leaves.filter(l => l.status === 'approved').length,
          pending: leaves.filter(l => l.status === 'pending').length,
          rejected: leaves.filter(l => l.status === 'rejected').length,
        },
        source: leaveSource || 'DATABASE'
      });
      
      console.log('🏠 [HOME] Leave balance by type:', {
        annual: `${remainingByType.annual}/${leaveAllocations.annual} (used: ${usedDaysByType['annual'] || 0})`,
        medical: `${remainingByType.medical}/${leaveAllocations.medical} (used: ${usedDaysByType['medical'] || 0})`,
        emergency: `${remainingByType.emergency}/${leaveAllocations.emergency} (used: ${usedDaysByType['emergency'] || 0})`,
        other: `${remainingByType.other}/${leaveAllocations.other} (used: ${usedDaysByType['other'] || 0})`,
      });
      
      console.log('🏠 [HOME] Total leave balance displayed:', {
        label: 'Leave Days Left',
        total_allocation: totalAllocation,
        total_used: totalUsedDays,
        total_remaining: leaveDaysLeft,
        calculation: `${totalAllocation} - ${totalUsedDays} = ${leaveDaysLeft}`,
        breakdown: remainingByType
      });
      
      if (approvedLeaves.length > 0) {
        console.log('🏠 [HOME] Approved leaves breakdown:', 
          approvedLeaves.map(l => {
            const days = l.days || calculateDays(l.start_date, l.end_date);
            return {
              leave_id: l.leave_id,
              type: l.leave_type,
              start: l.start_date,
              end: l.end_date,
              days: days,
              days_source: l.days ? 'API' : 'CALCULATED'
            };
          })
        );
      }
    } else if (!leaveLoading) {
      console.log('⚠️ [HOME] No leave data found');
    }
  }, [leaves, leaveLoading, totalUsedDays, leaveDaysLeft, leaveSource, approvedLeaves.length, remainingByType, totalAllocation, usedDaysByType]);

  // Week navigation state
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week, etc.

  // Get this week's shifts (with offset for navigation)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7)); // Start from Sunday + offset
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  // Format week range display
  const formatWeekRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = startOfWeek.toLocaleDateString('en-US', options);
    const end = endOfWeek.toLocaleDateString('en-US', options);
    return `${start} - ${end}`;
  };

  // Deduplicate shifts: same date + shift_type = duplicate
  const uniqueShifts = monthRoster?.filter((shift, index, self) => 
    index === self.findIndex(s => s.date === shift.date && s.shift_type === shift.shift_type)
  ) || [];

  const weekShifts = uniqueShifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    return shiftDate >= startOfWeek && shiftDate <= endOfWeek;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  useEffect(() => {
    console.log('🏠 [HOME] This week\'s shifts filtered:', {
      week_offset: weekOffset,
      date_range: formatWeekRange(),
      total_shifts: weekShifts.length,
      dates: weekShifts.map(s => s.date),
      source: weekShifts.length > 0 ? 'DATABASE' : 'NONE'
    });
  }, [weekShifts, weekOffset]);

  // Find next shift (using deduplicated shifts)
  const upcomingShifts = uniqueShifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    return shiftDate >= today;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextShift = upcomingShifts?.[0];

  const formatShiftTime = (shiftType: string) => {
    const times: Record<string, string> = {
      morning: '08:00 - 16:00',
      evening: '16:00 - 00:00',
      night: '00:00 - 08:00',
    };
    return times[shiftType.toLowerCase()] || '08:00 - 16:00';
  };

  const formatDayOfWeek = (dateStr: string) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate().toString();
  };

  // Real-time Translation State - ADDITIVE FEATURE
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [doctorLanguage, setDoctorLanguage] = useState<string>('en'); // Doctor speaks English by default
  const [patientLanguage, setPatientLanguage] = useState<string>('ms'); // Patient speaks Malay by default
  const [currentSpeaker, setCurrentSpeaker] = useState<'doctor' | 'patient'>('doctor'); // Who is currently speaking
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false); // Ref to track recording state (avoids stale closures)
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false); // Separate state for translation loading
  const [conversation, setConversation] = useState<Array<{ original: string; translated: string; speaker: 'doctor' | 'patient'; timestamp: Date }>>([]);
  const [currentText, setCurrentText] = useState('');
  const [currentTranslated, setCurrentTranslated] = useState('');
  const accumulatedTextRef = useRef(''); // Accumulate text for smoother display
  const [supportedLanguages, setSupportedLanguages] = useState<Array<{ code: string; name: string }>>([
    { code: 'en', name: 'English' },
    { code: 'ms', name: 'Malay' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ta', name: 'Tamil' },
    { code: 'my', name: 'Burmese' },
    { code: 'ne', name: 'Nepali' },
    { code: 'bn', name: 'Bengali' },
  ]); // Default languages (always available)
  const [languagesLoaded, setLanguagesLoaded] = useState(true); // Start as loaded (using defaults)
  const [autoDetectLanguage, setAutoDetectLanguage] = useState<boolean>(true); // Auto-detect enabled by default
  const [showDoctorLanguagePicker, setShowDoctorLanguagePicker] = useState(false);
  const [showPatientLanguagePicker, setShowPatientLanguagePicker] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>(''); // Detected language from transcription
  const recordingRef = useRef<Audio.Recording | null>(null);
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const conversationScrollRef = useRef<ScrollView | null>(null);

  // ========== REAL-TIME TRANSLATION FUNCTIONS ==========
  // ADDITIVE FEATURE - Does not modify existing functionality

  // Start recording (single continuous recording)
  const startRealTimeRecording = async () => {
    try {
      console.log('🎤 [TRANSLATE] ===== START RECORDING =====');
      
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('❌ [TRANSLATE] Microphone permission denied');
        Alert.alert('Permission Required', 'Microphone permission is required for real-time translation.');
        return;
      }
      console.log('✅ [TRANSLATE] Microphone permission granted');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      console.log('✅ [TRANSLATE] Audio mode configured');

      // Reset states
      setCurrentText('');
      setCurrentTranslated('');
      accumulatedTextRef.current = '';
      setIsTranslating(false);
      setIsTranscribing(false); // Ensure not showing loading state
      setDetectedLanguage('');
      
      console.log('🎤 [TRANSLATE] Creating recording...');
      
      // Start single continuous recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
      isRecordingRef.current = true;
      
      console.log('✅ [TRANSLATE] Recording started successfully');
      console.log('📊 [TRANSLATE] Current speaker:', currentSpeaker);
      console.log('📊 [TRANSLATE] Doctor language:', doctorLanguage);
      console.log('📊 [TRANSLATE] Patient language:', patientLanguage);
      console.log('📊 [TRANSLATE] Auto-detect:', autoDetectLanguage);
      
      // Start periodic transcription (every 2 seconds) for real-time STT display
      // Wait a bit before starting transcription to avoid immediate "listening" state
      setTimeout(() => {
        if (isRecordingRef.current) {
          console.log('🔄 [TRANSLATE] Starting periodic transcription...');
          startPeriodicTranscription();
        }
      }, 1000); // Wait 1 second before first transcription

    } catch (error) {
      console.error('❌ [TRANSLATE] Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsTranscribing(false);
    }
  };

  // Periodic transcription for real-time STT display
  const startPeriodicTranscription = async () => {
    if (!isRecordingRef.current) {
      console.log('⚠️ [TRANSLATE] Cannot start periodic transcription - not recording');
      return;
    }
    
    console.log('🔄 [TRANSLATE] Setting up periodic transcription (every 2 seconds)');
    
    const transcribeInterval = setInterval(async () => {
      if (!isRecordingRef.current || !recordingRef.current) {
        console.log('🛑 [TRANSLATE] Stopping periodic transcription');
        clearInterval(transcribeInterval);
        return;
      }
      
      try {
        // Get current recording URI
        const uri = recordingRef.current.getURI();
        if (uri) {
          console.log('📝 [TRANSLATE] Periodic transcription cycle...');
          // Transcribe current recording (for real-time STT display)
          await transcribeChunkForDisplay(uri);
        } else {
          console.log('⚠️ [TRANSLATE] No URI available yet, skipping this cycle');
        }
      } catch (error) {
        console.error('❌ [TRANSLATE] Periodic transcription error:', error);
      }
    }, 2000); // Every 2 seconds
    
    transcriptionIntervalRef.current = transcribeInterval;
  };

  // Transcribe for real-time display (doesn't stop recording)
  const transcribeChunkForDisplay = async (audioUri: string) => {
    if (!isRecordingRef.current) {
      console.log('⚠️ [TRANSLATE] Skipping transcription - recording stopped');
      return;
    }
    
    try {
      console.log('📝 [TRANSLATE] Starting real-time STT transcription...');
      // Don't set isTranscribing to true - we want text to appear immediately without loading state
      
      // Create temporary recording for transcription
      const { medicalSummaryApi } = await import('../../services/api');
      console.log('📝 [TRANSLATE] Creating temporary recording...');
      const tempRecording = await medicalSummaryApi.createRecording(
        currentDoctorId,
        null,
        'Real-time Translation',
        true
      );
      console.log('✅ [TRANSLATE] Temporary recording created:', tempRecording.recording_id);

      const { getCurrentApiUrl } = await import('../../services/apiConfig');
      const apiBaseUrl = await getCurrentApiUrl();
      console.log('📝 [TRANSLATE] API Base URL:', apiBaseUrl);

      const formData = new FormData();
      const filename = audioUri.split('/').pop() || 'recording.m4a';
      formData.append('audio_file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: filename,
      } as any);
      console.log('📝 [TRANSLATE] Uploading audio file:', filename);

      const uploadResponse = await fetch(
        `${apiBaseUrl}/medical-summary/transcribe/${tempRecording.recording_id}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('📝 [TRANSLATE] Transcription response status:', uploadResponse.status);

      // Handle both success and error cases gracefully
      let transcriptData;
      let transcribedText = '';
      let detectedLang = '';
      
      if (uploadResponse.ok) {
        try {
          transcriptData = await uploadResponse.json();
          transcribedText = transcriptData.transcript_text || '';
          detectedLang = transcriptData.language || '';
          
          console.log('✅ [TRANSLATE] Transcription successful');
          console.log('📝 [TRANSLATE] Transcribed text:', transcribedText);
          console.log('📝 [TRANSLATE] Detected language:', detectedLang);
          console.log('📝 [TRANSLATE] Full response:', JSON.stringify(transcriptData));
        } catch (jsonError) {
          const responseText = await uploadResponse.text();
          console.error('❌ [TRANSLATE] Failed to parse JSON response:', responseText);
          console.error('❌ [TRANSLATE] JSON parse error:', jsonError);
          // Continue with empty text - don't break the flow
        }
      } else {
        // Try to parse error response
        try {
          const errorText = await uploadResponse.text();
          console.error('❌ [TRANSLATE] Transcription API error:', uploadResponse.status);
          console.error('❌ [TRANSLATE] Error response:', errorText);
          
          // Try to parse as JSON in case it's a structured error
          try {
            const errorJson = JSON.parse(errorText);
            console.error('❌ [TRANSLATE] Error details:', JSON.stringify(errorJson));
          } catch {
            // Not JSON, that's okay
          }
        } catch (errorParseError) {
          console.error('❌ [TRANSLATE] Failed to read error response:', errorParseError);
        }
        // Continue with empty text - don't break the flow
      }
      
      // Update UI only if we have text (don't clear existing text on error)
      if (transcribedText && transcribedText.trim()) {
        // Update detected language if auto-detect is enabled
        if (autoDetectLanguage && detectedLang) {
          setDetectedLanguage(detectedLang);
          console.log('🔍 [TRANSLATE] Language auto-detected:', detectedLang);
        }
        
        // Update display with transcribed text (real-time STT)
        const newText = transcribedText.trim();
        // Only update if this is new/different text (avoid flickering)
        if (newText !== accumulatedTextRef.current) {
          accumulatedTextRef.current = newText;
          setCurrentText(newText);
          console.log('✅ [TRANSLATE] Text displayed on screen:', newText);
        }
      } else {
        // If no text, keep existing text (don't clear it)
        console.log('⚠️ [TRANSLATE] No text transcribed (empty result) - keeping existing text');
      }
    } catch (error: any) {
      console.error('❌ [TRANSLATE] Real-time transcription error:', error);
      console.error('❌ [TRANSLATE] Error message:', error.message);
      console.error('❌ [TRANSLATE] Error stack:', error.stack);
      // Don't show error to user during real-time transcription - just log it
    }
    // Don't set isTranscribing to false here - we never set it to true for real-time display
  };

  // Stop recording and translate
  const stopRealTimeRecording = async () => {
    try {
      console.log('🛑 [TRANSLATE] ===== STOP RECORDING =====');
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsTranscribing(false); // Clear loading state immediately
      
      // Stop periodic transcription
      if (transcriptionIntervalRef.current) {
        console.log('🛑 [TRANSLATE] Stopping periodic transcription');
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
      
      // Stop recording
      if (recordingRef.current) {
        const uri = recordingRef.current.getURI();
        console.log('🛑 [TRANSLATE] Stopping audio recording, URI:', uri);
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
        console.log('✅ [TRANSLATE] Audio recording stopped');
        
        // Always do final transcription (don't check accumulatedTextRef)
        if (uri) {
          console.log('📝 [TRANSLATE] Performing final transcription...');
          console.log('📊 [TRANSLATE] Current accumulated text:', accumulatedTextRef.current);
          await transcribeChunk(uri);
        } else {
          console.error('❌ [TRANSLATE] No URI available for final transcription');
        }
      } else {
        console.log('⚠️ [TRANSLATE] No recording to stop');
      }
      
      // Translate the final text
      const finalText = accumulatedTextRef.current.trim();
      console.log('📊 [TRANSLATE] Final text to translate:', finalText);
      
      if (finalText) {
        console.log('🌐 [TRANSLATE] Starting translation...');
        await translateTextRealTime(finalText);
      } else {
        console.log('⚠️ [TRANSLATE] No text to translate');
      }
      
      console.log('✅ [TRANSLATE] Stop recording completed');
    } catch (error) {
      console.error('❌ [TRANSLATE] Failed to stop recording:', error);
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsTranscribing(false);
    }
  };

  // Transcribe audio chunk (final transcription)
  const transcribeChunk = async (audioUri: string) => {
    try {
      console.log('📝 [TRANSLATE] ===== FINAL TRANSCRIPTION =====');
      setIsTranscribing(true);
      
      // Create temporary recording for transcription
      const { medicalSummaryApi } = await import('../../services/api');
      console.log('📝 [TRANSLATE] Creating temporary recording for final transcription...');
      const tempRecording = await medicalSummaryApi.createRecording(
        currentDoctorId,
        null,
        'Real-time Translation',
        true
      );
      console.log('✅ [TRANSLATE] Temporary recording created:', tempRecording.recording_id);

      // Get API base URL
      const { getCurrentApiUrl } = await import('../../services/apiConfig');
      const apiBaseUrl = await getCurrentApiUrl();
      console.log('📝 [TRANSLATE] API Base URL:', apiBaseUrl);

      // Transcribe
      const formData = new FormData();
      const filename = audioUri.split('/').pop() || 'recording.m4a';
      formData.append('audio_file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: filename,
      } as any);
      console.log('📝 [TRANSLATE] Uploading audio file for final transcription:', filename);

      const uploadResponse = await fetch(
        `${apiBaseUrl}/medical-summary/transcribe/${tempRecording.recording_id}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('📝 [TRANSLATE] Final transcription response status:', uploadResponse.status);

      let transcribedText = '';
      let detectedLang = '';
      
      if (uploadResponse.ok) {
        try {
          const transcriptData = await uploadResponse.json();
          transcribedText = transcriptData.transcript_text || '';
          detectedLang = transcriptData.language || '';
          
          console.log('✅ [TRANSLATE] Final transcription successful');
          console.log('📝 [TRANSLATE] Final transcribed text:', transcribedText);
          console.log('📝 [TRANSLATE] Final detected language:', detectedLang);
        } catch (jsonError) {
          const responseText = await uploadResponse.text();
          console.error('❌ [TRANSLATE] Failed to parse final transcription JSON:', responseText);
          console.error('❌ [TRANSLATE] JSON parse error:', jsonError);
          // Continue with empty text - will use accumulated text
        }
      } else {
        // Handle error gracefully - don't throw, just log
        try {
          const errorText = await uploadResponse.text();
          console.error('❌ [TRANSLATE] Final transcription API error:', uploadResponse.status);
          console.error('❌ [TRANSLATE] Error response:', errorText);
          
          // Try to parse as JSON
          try {
            const errorJson = JSON.parse(errorText);
            console.error('❌ [TRANSLATE] Error details:', JSON.stringify(errorJson));
          } catch {
            // Not JSON, that's okay
          }
        } catch (errorParseError) {
          console.error('❌ [TRANSLATE] Failed to read error response:', errorParseError);
        }
        // Continue - will use accumulated text if available
        console.log('⚠️ [TRANSLATE] Final transcription failed, but continuing with accumulated text');
      }
      
      // Use final transcription if available, otherwise use accumulated text
      if (transcribedText && transcribedText.trim()) {
        // Update detected language if auto-detect is enabled
        if (autoDetectLanguage && detectedLang) {
          setDetectedLanguage(detectedLang);
          console.log('🔍 [TRANSLATE] Language auto-detected:', detectedLang);
        }
        
        // Use the final transcribed text (replace accumulated text)
        const finalText = transcribedText.trim();
        accumulatedTextRef.current = finalText;
        setCurrentText(finalText);
        
        console.log('✅ [TRANSLATE] Final text set:', finalText);
        console.log('📊 [TRANSLATE] Text length:', finalText.length);
      } else {
        console.log('⚠️ [TRANSLATE] No text from final transcription');
        // Keep accumulated text if available (from periodic transcription)
        if (accumulatedTextRef.current.trim()) {
          console.log('📊 [TRANSLATE] Using accumulated text instead:', accumulatedTextRef.current);
          console.log('✅ [TRANSLATE] This is okay - periodic transcription worked');
        } else {
          console.log('⚠️ [TRANSLATE] No accumulated text either - user may need to speak louder');
        }
      }
      
    } catch (error: any) {
      console.error('❌ [TRANSLATE] Final transcription error:', error);
      console.error('❌ [TRANSLATE] Error details:', error.message);
      // Keep accumulated text if transcription fails
      if (accumulatedTextRef.current.trim()) {
        console.log('📊 [TRANSLATE] Using accumulated text after error:', accumulatedTextRef.current);
      }
    } finally {
      setIsTranscribing(false);
      console.log('📝 [TRANSLATE] Final transcription state cleared');
    }
  };

  // Translate text in real-time based on current speaker
  const translateTextRealTime = async (text: string) => {
    if (!text.trim()) {
      console.log('⚠️ [TRANSLATE] No text to translate (empty)');
      return;
    }

    console.log('🌐 [TRANSLATE] ===== START TRANSLATION =====');
    console.log('📊 [TRANSLATE] Text to translate:', text);
    console.log('📊 [TRANSLATE] Text length:', text.length);
    
    // Set translating state
    setIsTranslating(true);

    try {
      // Determine target language based on who is speaking
      // Doctor speaks → translate to patient's language
      // Patient speaks → translate to doctor's language
      const targetLang = currentSpeaker === 'doctor' ? patientLanguage : doctorLanguage;
      
      // If auto-detect is enabled and we have a detected language, use it
      // Otherwise, use the selected language for the current speaker
      let sourceLang = currentSpeaker === 'doctor' ? doctorLanguage : patientLanguage;
      if (autoDetectLanguage && detectedLanguage) {
        sourceLang = detectedLanguage;
        console.log('🔍 [TRANSLATE] Using auto-detected language:', detectedLanguage);
      }
      
      console.log('📊 [TRANSLATE] Current speaker:', currentSpeaker);
      console.log('📊 [TRANSLATE] Source language:', sourceLang);
      console.log('📊 [TRANSLATE] Target language:', targetLang);
      console.log('📊 [TRANSLATE] Auto-detect enabled:', autoDetectLanguage);
      
      console.log('🌐 [TRANSLATE] Calling translation API...');
      const result = await translationApi.translate(text, targetLang);
      
      console.log('✅ [TRANSLATE] Translation API call successful');
      console.log('🌐 [TRANSLATE] Translation result:', result.translated);
      console.log('📊 [TRANSLATE] Translation length:', result.translated?.length || 0);
      
      // Update current translation immediately (shows in real-time)
      setCurrentTranslated(result.translated || '');
      setIsTranslating(false);
      
      console.log('✅ [TRANSLATE] Translation displayed on screen');
      
      // Add to conversation immediately after translation
      if (text.trim() && result.translated?.trim()) {
        console.log('💬 [TRANSLATE] Adding to conversation history...');
        setConversation(prev => [...prev, {
          original: text,
          translated: result.translated,
          speaker: currentSpeaker,
          timestamp: new Date()
        }]);
        console.log('✅ [TRANSLATE] Added to conversation history');
        
        // Clear current text after adding to conversation
        setCurrentText('');
        setCurrentTranslated('');
        accumulatedTextRef.current = '';
        setDetectedLanguage('');
        console.log('✅ [TRANSLATE] States cleared');
      } else {
        console.log('⚠️ [TRANSLATE] Not adding to conversation - missing text or translation');
      }
      
      console.log('✅ [TRANSLATE] ===== TRANSLATION COMPLETE =====');
      
    } catch (error: any) {
      console.error('❌ [TRANSLATE] ===== TRANSLATION FAILED =====');
      console.error('❌ [TRANSLATE] Error:', error);
      console.error('❌ [TRANSLATE] Error message:', error.message);
      console.error('❌ [TRANSLATE] Error stack:', error.stack);
      setCurrentTranslated('Translation failed. Please try again.');
      setIsTranslating(false);
    }
  };

  // Auto-scroll conversation when new items are added
  useEffect(() => {
    if (conversation.length > 0) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        conversationScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false; // Stop any recording loops
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
      }
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, []);

  const isLoading = doctorLoading || rosterLoading || leaveLoading;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Greeting with Translate Button */}
      <View style={styles.greetingRow}>
        <View style={styles.greeting}>
          <Text style={[styles.greetingSmall, { color: colors.textSecondary }]}>Hello,
          <Text style={[styles.greetingLarge, { color: colors.text }]}> {firstName}!</Text></Text>
        </View>
        {/* Real-time Translation Button - Top Right Corner */}
        <TouchableOpacity
          onPress={() => {
            console.log('🌐 [TRANSLATE] Opening translation modal...');
            setConversation([]);
            setCurrentText('');
            setCurrentTranslated('');
            accumulatedTextRef.current = '';
            setCurrentSpeaker('doctor'); // Default to doctor speaking
            setDetectedLanguage(''); // Reset detected language
            setShowDoctorLanguagePicker(false);
            setShowPatientLanguagePicker(false);
            setShowTranslateModal(true);
          }}
          style={[styles.translateButtonTopRight, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="language" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Next Shift Card */}
      {nextShift ? (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Next Shift</Text>
          <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {new Date(nextShift.date).toDateString() === new Date().toDateString() ? 'Today' : 
                 new Date(nextShift.date).toDateString() === new Date(Date.now() + 86400000).toDateString() ? 'Tomorrow' :
                 new Date(nextShift.date).toLocaleDateString()}
              </Text>
          </View>
        </View>
        
        <View style={styles.shiftInfo}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(167, 139, 250, 0.2)' }]}>
            <Ionicons name="time" size={24} color="#a78bfa" />
          </View>
          <View>
              <Text style={[styles.shiftTime, { color: colors.text }]}>{formatShiftTime(nextShift.shift_type)}</Text>
              <Text style={[styles.shiftType, { color: colors.textSecondary }]}>
                {nextShift.shift_type.charAt(0).toUpperCase() + nextShift.shift_type.slice(1)} Shift
              </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {currentDoctor?.department || 'Emergency Department'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>No upcoming shifts scheduled</Text>
      </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="airplane" size={24} color="#fbbf24" />
          <Text style={[styles.statNumber, { color: colors.text }]}>{leaveDaysLeft}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Leave Days Left</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="calendar" size={24} color="#34d399" />
          <Text style={[styles.statNumber, { color: colors.text }]}>{uniqueShifts.length || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shifts This Month</Text>
        </View>
      </View>

      {/* Weekly Schedule */}
      <View style={styles.weekHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `Week ${weekOffset + 1}`}
          </Text>
          <Text style={[styles.weekRange, { color: colors.textSecondary }]}>{formatWeekRange()}</Text>
        </View>
        <View style={styles.weekNavigation}>
          <TouchableOpacity 
            onPress={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
            style={[styles.weekNavButton, weekOffset === 0 && styles.weekNavButtonDisabled]}
          >
            <Ionicons 
              name="chevron-back" 
              size={20} 
              color={weekOffset === 0 ? colors.border : colors.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setWeekOffset(weekOffset + 1)}
            style={styles.weekNavButton}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {weekShifts.length > 0 ? (
        <View style={styles.weekList}>
          {weekShifts.map((shift) => (
            <View
              key={shift.roster_id}
              style={[styles.weekCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.weekDate}>
                <Text style={[styles.weekDay, { color: colors.textSecondary }]}>{formatDayOfWeek(shift.date)}</Text>
                <Text style={[styles.weekDateNum, { color: colors.text }]}>{formatDate(shift.date)}</Text>
              </View>
              <View style={styles.weekShiftInfo}>
                <Text style={[styles.weekShiftName, { color: colors.text }]}>
                  {shift.shift_type.charAt(0).toUpperCase() + shift.shift_type.slice(1)} Shift
                </Text>
                <Text style={[styles.weekShiftTime, { color: colors.textSecondary }]}>
                  {formatShiftTime(shift.shift_type)}
                </Text>
              </View>
              {/* <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} /> */}
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>No shifts scheduled for this week</Text>
        </View>
      )}

      {/* Real-time Translation Modal - ADDITIVE FEATURE */}
      <Modal
        visible={showTranslateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          stopRealTimeRecording();
          setShowTranslateModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.translateModalContainer}
        >
          <View style={[styles.translateModalContent, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={[styles.translateModalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.translateModalTitle, { color: colors.text }]}>Real-time Translation</Text>
                <Text style={[styles.translateModalSubtitle, { color: colors.textSecondary }]}>
                  Speak naturally - translation updates automatically
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  stopRealTimeRecording();
                  setShowTranslateModal(false);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Compact Controls Row */}
            <View style={[styles.compactControlsRow, { backgroundColor: colors.background }]}>
              {/* Speaker Toggle - Compact */}
              <View style={[styles.compactToggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => setCurrentSpeaker('doctor')}
                  style={[
                    styles.compactToggleButton,
                    {
                      backgroundColor: currentSpeaker === 'doctor' ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Ionicons 
                    name="medkit" 
                    size={16} 
                    color={currentSpeaker === 'doctor' ? '#fff' : colors.text} 
                  />
                  <Text style={[
                    styles.compactToggleText, 
                    { color: currentSpeaker === 'doctor' ? '#fff' : colors.text }
                  ]}>
                    Doctor
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCurrentSpeaker('patient')}
                  style={[
                    styles.compactToggleButton,
                    {
                      backgroundColor: currentSpeaker === 'patient' ? '#10b981' : 'transparent',
                    },
                  ]}
                >
                  <Ionicons 
                    name="person" 
                    size={16} 
                    color={currentSpeaker === 'patient' ? '#fff' : colors.text} 
                  />
                  <Text style={[
                    styles.compactToggleText, 
                    { color: currentSpeaker === 'patient' ? '#fff' : colors.text }
                  ]}>
                    Patient
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Auto-Detect Toggle - Compact */}
              <TouchableOpacity
                onPress={() => {
                  setAutoDetectLanguage(!autoDetectLanguage);
                  setDetectedLanguage('');
                }}
                style={[
                  styles.compactAutoDetectButton,
                  {
                    backgroundColor: autoDetectLanguage ? colors.primary + '20' : colors.card,
                    borderColor: autoDetectLanguage ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons 
                  name="language" 
                  size={14} 
                  color={autoDetectLanguage ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.compactAutoDetectText, 
                  { color: autoDetectLanguage ? colors.primary : colors.textSecondary }
                ]}>
                  Auto
                </Text>
              </TouchableOpacity>
            </View>
            
            {autoDetectLanguage && detectedLanguage && (
              <View style={[styles.detectedLanguageBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.detectedLanguageText, { color: colors.primary }]}>
                  Detected: {supportedLanguages.find(l => l.code === detectedLanguage)?.name || detectedLanguage}
                </Text>
              </View>
            )}

            {/* Language Selectors - Doctor & Patient with Dropdowns */}
            <View style={[styles.translateLanguageSelector, { backgroundColor: colors.background }]}>
              {/* Doctor Language Dropdown */}
              <View style={styles.languageRow}>
                <View style={styles.languageLabelContainer}>
                  <Ionicons name="medkit" size={16} color={colors.primary} />
                  <Text style={[styles.languageSelectorLabel, { color: colors.text }]}>
                    Doctor:
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDoctorLanguagePicker(!showDoctorLanguagePicker)}
                  style={[
                    styles.languageDropdownButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.languageDropdownText, { color: colors.text }]}>
                    {supportedLanguages.find(l => l.code === doctorLanguage)?.name || 'Select...'}
                  </Text>
                  <Ionicons 
                    name={showDoctorLanguagePicker ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              {/* Doctor Language Picker Modal */}
              {showDoctorLanguagePicker && (
                <Modal
                  visible={showDoctorLanguagePicker}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowDoctorLanguagePicker(false)}
                >
                  <Pressable
                    style={styles.pickerModalOverlay}
                    onPress={() => setShowDoctorLanguagePicker(false)}
                  >
                    <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
                      <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Doctor Language</Text>
                      <ScrollView style={styles.pickerScrollView}>
                        {supportedLanguages.map((lang) => (
                          <TouchableOpacity
                            key={`doctor-picker-${lang.code}`}
                            onPress={() => {
                              setDoctorLanguage(lang.code);
                              setShowDoctorLanguagePicker(false);
                            }}
                            style={[
                              styles.pickerOption,
                              {
                                backgroundColor: doctorLanguage === lang.code ? colors.primary + '20' : 'transparent',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerOptionText,
                                {
                                  color: doctorLanguage === lang.code ? colors.primary : colors.text,
                                  fontWeight: doctorLanguage === lang.code ? '600' : '400',
                                },
                              ]}
                            >
                              {lang.name}
                            </Text>
                            {doctorLanguage === lang.code && (
                              <Ionicons name="checkmark" size={20} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Modal>
              )}

              {/* Patient Language Dropdown */}
              <View style={[styles.languageRow, { marginTop: 12 }]}>
                <View style={styles.languageLabelContainer}>
                  <Ionicons name="person" size={16} color="#10b981" />
                  <Text style={[styles.languageSelectorLabel, { color: colors.text }]}>
                    Patient:
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowPatientLanguagePicker(!showPatientLanguagePicker)}
                  style={[
                    styles.languageDropdownButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.languageDropdownText, { color: colors.text }]}>
                    {supportedLanguages.find(l => l.code === patientLanguage)?.name || 'Select...'}
                  </Text>
                  <Ionicons 
                    name={showPatientLanguagePicker ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              {/* Patient Language Picker Modal */}
              {showPatientLanguagePicker && (
                <Modal
                  visible={showPatientLanguagePicker}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowPatientLanguagePicker(false)}
                >
                  <Pressable
                    style={styles.pickerModalOverlay}
                    onPress={() => setShowPatientLanguagePicker(false)}
                  >
                    <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
                      <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Patient Language</Text>
                      <ScrollView style={styles.pickerScrollView}>
                        {supportedLanguages.map((lang) => (
                          <TouchableOpacity
                            key={`patient-picker-${lang.code}`}
                            onPress={() => {
                              setPatientLanguage(lang.code);
                              setShowPatientLanguagePicker(false);
                            }}
                            style={[
                              styles.pickerOption,
                              {
                                backgroundColor: patientLanguage === lang.code ? '#10b981' + '20' : 'transparent',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerOptionText,
                                {
                                  color: patientLanguage === lang.code ? '#10b981' : colors.text,
                                  fontWeight: patientLanguage === lang.code ? '600' : '400',
                                },
                              ]}
                            >
                              {lang.name}
                            </Text>
                            {patientLanguage === lang.code && (
                              <Ionicons name="checkmark" size={20} color="#10b981" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Modal>
              )}
            </View>

            {/* Translation Direction Indicator */}
            <View style={[styles.translationDirection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.translationDirectionText, { color: colors.textSecondary }]}>
                {currentSpeaker === 'doctor' ? '🩺' : '👤'} Speaking {
                  autoDetectLanguage && detectedLanguage 
                    ? `(${supportedLanguages.find(l => l.code === detectedLanguage)?.name || detectedLanguage})` 
                    : supportedLanguages.find(l => l.code === (currentSpeaker === 'doctor' ? doctorLanguage : patientLanguage))?.name || ''
                } → Translating to {supportedLanguages.find(l => l.code === (currentSpeaker === 'doctor' ? patientLanguage : doctorLanguage))?.name || ''}
              </Text>
            </View>

            {/* Conversation Display */}
            <ScrollView
              ref={conversationScrollRef}
              style={styles.conversationContainer}
              contentContainerStyle={styles.conversationContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                // Auto-scroll to bottom when new content is added
                conversationScrollRef.current?.scrollToEnd({ animated: true });
              }}
            >
              {/* Conversation History */}
              {conversation.map((item, index) => {
                const isDoctor = item.speaker === 'doctor';
                const speakerColor = isDoctor ? colors.primary : '#10b981';
                const speakerIcon = isDoctor ? 'medkit' : 'person';
                const speakerLabel = isDoctor ? 'Doctor' : 'Patient';
                
                return (
                  <View key={index} style={styles.conversationBubble}>
                    <View style={[styles.speakerLabel, { backgroundColor: speakerColor + '20' }]}>
                      <Ionicons name={speakerIcon} size={12} color={speakerColor} />
                      <Text style={[styles.speakerLabelText, { color: speakerColor }]}>{speakerLabel}</Text>
                    </View>
                    <View style={[styles.originalBubble, { backgroundColor: colors.background, borderColor: speakerColor }]}>
                      <Text style={[styles.bubbleText, { color: colors.text }]}>{item.original}</Text>
                    </View>
                    <View style={[styles.translatedBubble, { backgroundColor: speakerColor + '20', borderColor: speakerColor }]}>
                      <Text style={[styles.bubbleText, { color: colors.text }]}>{item.translated}</Text>
                    </View>
                  </View>
                );
              })}
              
              {/* Real-time STT Display (while recording) */}
              {isRecording && (
                <View style={styles.conversationBubble}>
                  <View style={[styles.speakerLabel, { backgroundColor: (currentSpeaker === 'doctor' ? colors.primary : '#10b981') + '20' }]}>
                    <Ionicons name={currentSpeaker === 'doctor' ? 'medkit' : 'person'} size={12} color={currentSpeaker === 'doctor' ? colors.primary : '#10b981'} />
                    <Text style={[styles.speakerLabelText, { color: currentSpeaker === 'doctor' ? colors.primary : '#10b981' }]}>
                      {currentSpeaker === 'doctor' ? 'Doctor' : 'Patient'} (Recording...)
                    </Text>
                  </View>
                  
                  {/* Real-time STT */}
                  <View style={[styles.originalBubble, { backgroundColor: colors.background, borderColor: currentSpeaker === 'doctor' ? colors.primary : '#10b981' }]}>
                    {currentText ? (
                      <Text style={[styles.bubbleText, { color: colors.text }]}>
                        {currentText}
                      </Text>
                    ) : (
                      <Text style={[styles.bubbleText, { color: colors.textSecondary }]}>
                        Speak now... Text will appear here
                      </Text>
                    )}
                  </View>
                </View>
              )}
              
              {/* Translation Result (after stopping) */}
              {!isRecording && (currentText || currentTranslated || isTranslating) && (
                <View style={styles.conversationBubble}>
                  <View style={[styles.speakerLabel, { backgroundColor: (currentSpeaker === 'doctor' ? colors.primary : '#10b981') + '20' }]}>
                    <Ionicons name={currentSpeaker === 'doctor' ? 'medkit' : 'person'} size={12} color={currentSpeaker === 'doctor' ? colors.primary : '#10b981'} />
                    <Text style={[styles.speakerLabelText, { color: currentSpeaker === 'doctor' ? colors.primary : '#10b981' }]}>
                      {currentSpeaker === 'doctor' ? 'Doctor' : 'Patient'}
                    </Text>
                  </View>
                  
                  {/* Original Text */}
                  {currentText && (
                    <View style={[styles.originalBubble, { backgroundColor: colors.background, borderColor: currentSpeaker === 'doctor' ? colors.primary : '#10b981' }]}>
                      <Text style={[styles.bubbleText, { color: colors.text }]}>
                        {currentText}
                      </Text>
                    </View>
                  )}
                  
                  {/* Translation */}
                  {isTranslating ? (
                    <View style={[styles.translatedBubble, { backgroundColor: colors.background + '80', borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.bubbleText, { color: colors.textSecondary, marginLeft: 8 }]}>
                        Translating...
                      </Text>
                    </View>
                  ) : currentTranslated ? (
                    <View style={[styles.translatedBubble, { backgroundColor: (currentSpeaker === 'doctor' ? colors.primary : '#10b981') + '20', borderColor: currentSpeaker === 'doctor' ? colors.primary : '#10b981' }]}>
                      <Text style={[styles.bubbleText, { color: colors.text }]}>{currentTranslated}</Text>
                    </View>
                  ) : null}
                </View>
              )}
              
              {/* Empty State */}
              {conversation.length === 0 && !currentText && !isRecording && !isTranslating && (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                    1. Select Doctor & Patient languages above
                  </Text>
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary, marginTop: 4 }]}>
                    2. Toggle who is speaking
                  </Text>
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary, marginTop: 4 }]}>
                    3. Press "Start Translation" and speak
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Recording Controls - Start/Stop Button */}
            <View style={[styles.translateControls, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => {
                  if (isRecording) {
                    stopRealTimeRecording();
                  } else {
                    startRealTimeRecording();
                  }
                }}
                disabled={isTranslating} // Only disable when translating (not during STT)
                style={[
                  styles.recordButtonLarge,
                  {
                    backgroundColor: isRecording ? '#ef4444' : colors.primary,
                    opacity: isTranslating ? 0.5 : 1, // Only reduce opacity when translating
                  },
                ]}
              >
                <Ionicons name={isRecording ? 'stop-circle' : 'mic'} size={32} color="#fff" />
                <Text style={styles.recordButtonLargeText}>
                  {isRecording ? 'Stop Translation' : 
                   isTranslating ? 'Translating...' :
                   'Start Translation'}
                </Text>
              </TouchableOpacity>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={[styles.recordingDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.recordingText, { color: colors.textSecondary }]}>
                    Recording... Text will appear below. Click Stop to translate.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    flex: 1,
  },
  greetingSmall: {
    fontSize: 18,
  },
  greetingLarge: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#34d399',
    fontSize: 14,
  },
  shiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  shiftTime: {
    fontSize: 20,
    fontWeight: '600',
  },
  shiftType: {
    fontSize: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 4,
    fontWeight: '600',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekRange: {
    fontSize: 13,
    marginTop: 2,
  },
  weekNavigation: {
    flexDirection: 'row',
    gap: 8,
  },
  weekNavButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  weekNavButtonDisabled: {
    opacity: 0,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 14,
  },
  weekList: {
    gap: 12,
    paddingBottom: 24,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  weekDate: {
    width: 48,
    alignItems: 'center',
    marginRight: 16,
  },
  weekDay: {
    fontSize: 12,
  },
  weekDateNum: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  weekShiftInfo: {
    flex: 1,
  },
  weekShiftName: {
    fontSize: 16,
    fontWeight: '500',
  },
  weekShiftTime: {
    fontSize: 14,
  },
  // Real-time Translation Styles - ADDITIVE FEATURE
  translateButtonTopRight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  translateModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  translateModalContent: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 100,
  },
  translateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  translateModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  translateModalSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  compactControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  compactToggleContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
  },
  compactToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  compactToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactAutoDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  compactAutoDetectText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detectedLanguageBadge: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  translateLanguageSelector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 70,
  },
  languageSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  languageScrollView: {
    flex: 1,
    maxHeight: 40,
  },
  languageScrollContent: {
    paddingRight: 16,
    gap: 8,
    alignItems: 'center',
  },
  languageChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  languageChipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  languageChipTextSmall: {
    fontSize: 12,
    fontWeight: '500',
  },
  translationDirection: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  translationDirectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  speakerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  speakerLabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  languageLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  languageLoadingText: {
    fontSize: 13,
  },
  conversationContainer: {
    flex: 1,
  },
  conversationContent: {
    padding: 16,
    paddingBottom: 20,
  },
  conversationBubble: {
    marginBottom: 16,
  },
  originalBubble: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  translatedBubble: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 20,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  translateButtonTopRight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  translateControls: {
    padding: 20,
    borderTopWidth: 1,
  },
  recordButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  recordButtonLargeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 13,
  },
  debugText: {
    fontFamily: 'monospace',
  },
  autoDetectContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  autoDetectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoDetectLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  detectedLanguageText: {
    marginTop: 8,
    fontSize: 12,
    fontStyle: 'italic',
  },
  languageDropdownButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  languageDropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 16,
    padding: 20,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pickerScrollView: {
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerOptionText: {
    fontSize: 16,
  },
});
