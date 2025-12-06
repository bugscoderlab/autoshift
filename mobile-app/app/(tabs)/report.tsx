/**
 * Medical Summary / Report Tab
 * 
 * Features:
 * - Audio recording for doctor-patient consultations
 * - Automatic transcription using Groq Whisper
 * - AI-generated structured medical summaries
 * - Editable summaries before approval
 * - Patient consent management
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { medicalSummaryApi } from '../../services/api';

interface MedicalSummary {
  summary_id: number;
  recording_id: number;
  transcript_id: number;
  doctor_id: number;
  chief_complaint?: string;
  history_of_present_illness?: string;
  physical_examination?: string;
  assessment?: string;
  plan?: string;
  follow_up_instructions?: string;
  status: string;
  doctor_approved: boolean;
  created_at: string;
}

interface Transcript {
  transcript_id: number;
  recording_id: number;
  transcript_text: string;
  language: string;
  created_at: string;
}

export default function ReportScreen() {
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const currentDoctorId = user?.doctor_id || 1;

  // Recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [consentGiven, setConsentGiven] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState<number | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<MedicalSummary | null>(null);

  // UI state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState<Partial<MedicalSummary>>({});
  const [recentSummaries, setRecentSummaries] = useState<MedicalSummary[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load recent summaries on mount
  useEffect(() => {
    loadRecentSummaries();
  }, []);

  const loadRecentSummaries = async () => {
    try {
      const summaries = await medicalSummaryApi.getDoctorSummaries(currentDoctorId);
      setRecentSummaries(summaries.slice(0, 5)); // Show last 5
    } catch (error) {
      console.error('Failed to load recent summaries:', error);
    }
  };

  // Request audio permissions
  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Audio recording permission is required to record consultations.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!consentGiven) {
      Alert.alert(
        'Consent Required',
        'Please confirm patient consent before starting the recording.',
        [{ text: 'OK' }]
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000) as ReturnType<typeof setInterval>;
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  // Stop recording and upload
  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) {
        Alert.alert('Error', 'No recording file found.');
        return;
      }

      // Upload and transcribe
      await uploadAndTranscribe(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
    } finally {
      setRecording(null);
      setRecordingDuration(0);
    }
  };

  // Upload audio and transcribe
  const uploadAndTranscribe = async (audioUri: string) => {
    setIsProcessing(true);

    try {
      // Step 1: Create recording record
      const recordingData = await medicalSummaryApi.createRecording(
        currentDoctorId,
        patientId || undefined,
        patientName || undefined,
        consentGiven
      );

      setCurrentRecordingId(recordingData.recording_id);

      // Step 2: Upload audio file
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file not found');
      }

      const audioFile = {
        uri: audioUri,
        type: 'audio/m4a',
        name: `recording_${recordingData.recording_id}.m4a`,
      };

      const formData = new FormData();
      formData.append('audio_file', audioFile as any);

      // Step 3: Transcribe
      const transcriptData = await medicalSummaryApi.transcribeAudio(
        recordingData.recording_id,
        audioUri
      );

      setTranscript(transcriptData);

      // Step 4: Generate summary using AI
      console.log('🤖 [MEDICAL SUMMARY] Generating AI summary from transcript...');
      console.log('   Transcript length:', transcriptData.transcript_text.length);
      console.log('   Transcript preview:', transcriptData.transcript_text.substring(0, 100) + '...');
      
      const summaryData = await medicalSummaryApi.generateSummary(recordingData.recording_id);
      
      // Log detailed summary data
      const fieldStatus = {
        chief_complaint: !!summaryData.chief_complaint,
        history_of_present_illness: !!summaryData.history_of_present_illness,
        physical_examination: !!summaryData.physical_examination,
        assessment: !!summaryData.assessment,
        plan: !!summaryData.plan,
        follow_up_instructions: !!summaryData.follow_up_instructions,
      };
      const populatedCount = Object.values(fieldStatus).filter(Boolean).length;
      
      console.log('✅ [MEDICAL SUMMARY] Summary generated:', {
        summary_id: summaryData.summary_id,
        populated_fields: `${populatedCount}/6`,
        field_status: fieldStatus,
        chief_complaint_preview: summaryData.chief_complaint?.substring(0, 80) || '<empty>',
        assessment_preview: summaryData.assessment?.substring(0, 80) || '<empty>',
      });
      
      // Verify we have data before opening modal
      if (populatedCount === 0) {
        console.error('❌ [MEDICAL SUMMARY] Summary is completely empty!');
        Alert.alert(
          'Warning',
          'The AI summary generation returned empty fields. You can still edit the summary manually.',
          [{ text: 'OK' }]
        );
      } else if (populatedCount < 3) {
        console.warn(`⚠️ [MEDICAL SUMMARY] Only ${populatedCount}/6 fields populated`);
      }
      
      // Auto-fill modal with AI-generated summary (ensure all fields are strings)
      const editingData = {
        chief_complaint: String(summaryData.chief_complaint || ''),
        history_of_present_illness: String(summaryData.history_of_present_illness || ''),
        physical_examination: String(summaryData.physical_examination || ''),
        assessment: String(summaryData.assessment || ''),
        plan: String(summaryData.plan || ''),
        follow_up_instructions: String(summaryData.follow_up_instructions || ''),
      };
      
      console.log('📝 [MEDICAL SUMMARY] Setting editing summary:', {
        chief_complaint_length: editingData.chief_complaint.length,
        assessment_length: editingData.assessment.length,
      });
      
      setSummary(summaryData);
      setEditingSummary(editingData);
      
      // Open modal automatically with AI-generated data
      setShowSummaryModal(true);
      console.log('✅ [MEDICAL SUMMARY] Modal opened with summary data');

      // Reset form
      setPatientName('');
      setPatientId(null);
      setConsentGiven(false);

      // Reload recent summaries
      await loadRecentSummaries();

      // Show success toast (modal is already open, so no alert needed)
      console.log('✅ [MEDICAL SUMMARY] Modal opened with AI-generated summary');
    } catch (error: any) {
      console.error('Upload/transcription error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process recording. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Save edited summary to database
  const saveSummary = async () => {
    if (!summary) {
      Alert.alert('Error', 'No summary to save.');
      return;
    }

    setIsSaving(true);
    try {
      console.log('💾 [MEDICAL SUMMARY] Saving edited summary to database...', {
        summary_id: summary.summary_id,
        changes: editingSummary,
      });

      // Save changes to database
      const updated = await medicalSummaryApi.updateSummary(
        summary.summary_id,
        editingSummary as Partial<MedicalSummary>
      );
      
      console.log('✅ [MEDICAL SUMMARY] Summary saved successfully:', {
        summary_id: updated.summary_id,
        status: updated.status,
        chief_complaint: updated.chief_complaint?.substring(0, 50) + '...',
      });

      // Update state with saved data
      setSummary(updated);
      setEditingSummary(updated); // Sync editing state with saved data

      // Reload recent summaries to show updated data
      await loadRecentSummaries();

      // Show success feedback (keep modal open for continued editing)
      Alert.alert('✅ Saved', 'Your changes have been saved to the database.', [
        {
          text: 'Continue Editing',
          style: 'cancel',
        },
        {
          text: 'Close',
          onPress: () => setShowSummaryModal(false),
        },
      ]);
    } catch (error: any) {
      console.error('❌ [MEDICAL SUMMARY] Failed to save summary:', error);
      Alert.alert('Error', error.message || 'Failed to save summary. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Approve summary
  const approveSummary = async () => {
    if (!summary) return;

    Alert.alert(
      'Approve Summary',
      'Are you sure you want to approve and finalize this medical summary?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const approved = await medicalSummaryApi.approveSummary(
                summary.summary_id,
                currentDoctorId
              );
              setSummary(approved);
              setShowSummaryModal(false);
              Alert.alert('Success', 'Summary approved and finalized!');
              await loadRecentSummaries();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve summary.');
            }
          },
        },
      ]
    );
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Medical Summary</Text>
        </View>

        {/* Consent Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Patient Information</Text>
          
          <View style={styles.consentRow}>
            <Switch
              value={consentGiven}
              onValueChange={setConsentGiven}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={consentGiven ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.consentText, { color: colors.text }]}>
              I confirm that the patient has consented to audio recording for medical documentation.
            </Text>
          </View>

          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Patient Name (Optional)"
            placeholderTextColor={colors.textSecondary}
            value={patientName}
            onChangeText={setPatientName}
          />
        </View>

        {/* Recording Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Record Consultation</Text>
          
          <View style={styles.recordingContainer}>
            {isRecording ? (
              <>
                <View style={styles.recordingIndicator}>
                  <View style={[styles.recordingDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.recordingText, { color: '#ef4444' }]}>
                    Recording: {formatDuration(recordingDuration)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.recordButton, { backgroundColor: '#ef4444' }]}
                  onPress={stopRecording}
                >
                  <Ionicons name="stop" size={24} color="#fff" />
                  <Text style={styles.recordButtonText}>Stop Recording</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  { backgroundColor: consentGiven ? colors.primary : colors.border },
                ]}
                onPress={startRecording}
                disabled={!consentGiven || isProcessing}
              >
                <Ionicons name="mic" size={24} color="#fff" />
                <Text style={styles.recordButtonText}>
                  {isProcessing ? 'Processing...' : 'Start Recording'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.processingText, { color: colors.textSecondary }]}>
                Transcribing audio and generating summary...
              </Text>
            </View>
          )}
        </View>

        {/* Recent Summaries */}
        {recentSummaries.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Summaries</Text>
            {recentSummaries.map((item) => (
              <TouchableOpacity
                key={item.summary_id}
                style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => {
                  setSummary(item);
                  setEditingSummary(item);
                  setShowSummaryModal(true);
                }}
              >
                <View style={styles.summaryCardHeader}>
                  <Text style={[styles.summaryDate, { color: colors.textSecondary }]}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === 'approved'
                            ? '#10b981'
                            : item.status === 'draft'
                            ? colors.primary + '20'
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === 'approved'
                              ? '#10b981'
                              : item.status === 'draft'
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {item.chief_complaint && (
                  <Text
                    style={[styles.summaryPreview, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {item.chief_complaint}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Summary Modal */}
      <Modal
        visible={showSummaryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSummaryModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSummaryModal(false)}>
          <View style={styles.modalSpacer} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Medical Summary</Text>
                <TouchableOpacity onPress={() => setShowSummaryModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScroll}
              >
            {/* Transcript */}
            {transcript && (
              <View style={[styles.summaryField, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Transcript</Text>
                <Text style={[styles.fieldValue, { color: colors.textSecondary }]}>
                  {transcript.transcript_text}
                </Text>
              </View>
            )}

            {/* Editable Summary Fields */}
            <View style={[styles.summaryField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Chief Complaint</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                multiline
                value={String(editingSummary.chief_complaint || '')}
                onChangeText={(text) => {
                  setEditingSummary(prev => ({ ...prev, chief_complaint: text }));
                }}
                placeholder="Enter chief complaint..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.summaryField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>History of Present Illness</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                multiline
                value={String(editingSummary.history_of_present_illness || '')}
                onChangeText={(text) => {
                  setEditingSummary(prev => ({ ...prev, history_of_present_illness: text }));
                }}
                placeholder="Enter history..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.summaryField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Physical Examination</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                multiline
                value={String(editingSummary.physical_examination || '')}
                onChangeText={(text) => {
                  setEditingSummary(prev => ({ ...prev, physical_examination: text }));
                }}
                placeholder="Enter examination findings..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.summaryField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Assessment (Diagnosis)</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                multiline
                value={String(editingSummary.assessment || '')}
                onChangeText={(text) => {
                  setEditingSummary(prev => ({ ...prev, assessment: text }));
                }}
                placeholder="Enter assessment..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.summaryField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Plan (Treatment)</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                multiline
                value={String(editingSummary.plan || '')}
                onChangeText={(text) => {
                  setEditingSummary(prev => ({ ...prev, plan: text }));
                }}
                placeholder="Enter treatment plan..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.summaryField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Follow-up Instructions</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                multiline
                value={String(editingSummary.follow_up_instructions || '')}
                onChangeText={(text) => {
                  setEditingSummary(prev => ({ ...prev, follow_up_instructions: text }));
                }}
                placeholder="Enter follow-up instructions..."
                placeholderTextColor={colors.textSecondary}
              />
              </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={[styles.modalFooter, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonPrimary,
                    { backgroundColor: colors.primary },
                    isSaving && { opacity: 0.6 },
                  ]}
                  onPress={saveSummary}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary, { color: '#fff' }]}>
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
                {summary && !summary.doctor_approved && (
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalButtonSecondary,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                    onPress={approveSummary}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Approve & Finalize</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginTop: 8,
  },
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  processingText: {
    fontSize: 14,
  },
  summaryCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  summaryPreview: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalSpacer: {
    flex: 0.2,
  },
  modalKeyboard: {
    flex: 0.8,
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  summaryField: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 22,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonPrimary: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  modalButtonSecondary: {
    borderWidth: 1.5,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
});

