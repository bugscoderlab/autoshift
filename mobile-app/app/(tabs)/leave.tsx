import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, Switch, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { 
  useLeaveRequests, 
  createLeaveRequest, 
  approveLeaveRequest, 
  rejectLeaveRequest,
  type DataSource 
} from '../../services/dataHooks';

type ToastState = { type: 'success' | 'error'; title: string; message?: string } | null;
type HideTimer = ReturnType<typeof setTimeout> | null;

interface DisplayLeaveRequest {
  id: string;
  type: string;
  typeColor: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  doctor: string;
  doctor_id?: number;
  leave_id?: number;
}

const leaveTypes = [
  { id: 'annual', name: 'Annual', icon: 'sunny', color: '#f59e0b', balance: 14, minAdvanceDays: 14 },
  { id: 'medical', name: 'Medical', icon: 'medkit', color: '#ef4444', balance: 14, minAdvanceDays: 0 },
  { id: 'emergency', name: 'Emergency', icon: 'alert-circle', color: '#8b5cf6', balance: 5, minAdvanceDays: 0, isEmergency: true },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal', color: '#6b7280', balance: 3, minAdvanceDays: 7 },
];

const LEAVE_TYPE_COLORS: Record<string, string> = {
  annual: '#f59e0b',
  medical: '#ef4444',
  emergency: '#8b5cf6',
  maternity: '#ec4899',
  paternity: '#06b6d4',
  other: '#6b7280',
};

const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({ date: date.toISOString().split('T')[0], day: date.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: date.getDate(), month: date.toLocaleDateString('en-US', { month: 'short' }) });
  }
  return dates;
};

const availableDates = generateDates();

const fallbackLeaveRequests: DisplayLeaveRequest[] = [
  { id: 'lr1', type: 'Annual', typeColor: '#f59e0b', startDate: '2024-01-20', endDate: '2024-01-22', days: 3, reason: 'Family vacation', status: 'approved', doctor: 'Dr. John Smith' },
  { id: 'lr2', type: 'Medical', typeColor: '#ef4444', startDate: '2024-01-25', endDate: '2024-01-25', days: 1, reason: 'Doctor appointment', status: 'pending', doctor: 'Dr. Sarah Lee' },
  { id: 'lr3', type: 'Emergency', typeColor: '#8b5cf6', startDate: '2024-01-28', endDate: '2024-01-28', days: 1, reason: 'Family emergency', status: 'pending', doctor: 'Dr. Michael Chen' },
];

const mockRosterPreview = [
  { date: 'Mon, Jan 15', morning: ['Dr. Smith', 'Dr. Chen'], evening: ['Dr. Johnson', 'Dr. Lee'], night: ['Dr. Davis'] },
  { date: 'Tue, Jan 16', morning: ['Dr. Johnson', 'Dr. Wilson'], evening: ['Dr. Smith', 'Dr. Brown'], night: ['Dr. Chen'] },
];

// Helper to calculate days between dates
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export default function LeaveScreen() {
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const hideTimer = useRef<HideTimer>(null);
  const isAdmin = user?.role === 'ADMIN';
  const currentDoctorId = user?.doctor_id || 1; // Default to John Doe (doctor_id: 1)
  
  console.log('✈️ [LEAVE TAB] Initializing for:', { 
    doctor_id: currentDoctorId, 
    isAdmin 
  });
  
  // Fetch leave requests from API
  // Admin sees all leaves, regular users see only their leaves
  const { data: apiLeaveRequests, loading, source, refresh } = useLeaveRequests(
    isAdmin ? {} : { doctor_id: currentDoctorId }
  );

  const [activeTab, setActiveTab] = useState<'requests' | 'pending' | 'roster'>('requests');
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [rosterPreviewVisible, setRosterPreviewVisible] = useState(false);
  
  const [selectedLeaveType, setSelectedLeaveType] = useState<typeof leaveTypes[0] | null>(null);
  const [leaveStartDate, setLeaveStartDate] = useState<typeof availableDates[0] | null>(null);
  const [leaveEndDate, setLeaveEndDate] = useState<typeof availableDates[0] | null>(null);
  const [leaveReason, setLeaveReason] = useState('');
  const [inviteOthers, setInviteOthers] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<DisplayLeaveRequest[]>(fallbackLeaveRequests);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  
  // Transform API data when available
  useEffect(() => {
    console.log('✈️ [LEAVE TAB] Raw API data:', {
      count: apiLeaveRequests?.length,
      source,
      sample: apiLeaveRequests?.[0]
    });
    
    if (apiLeaveRequests && apiLeaveRequests.length > 0) {
      const transformed: DisplayLeaveRequest[] = apiLeaveRequests.map(leave => ({
        id: String(leave.leave_id),
        leave_id: leave.leave_id,
        type: leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1),
        typeColor: LEAVE_TYPE_COLORS[leave.leave_type] || '#6b7280',
        startDate: leave.start_date,
        endDate: leave.end_date,
        days: leave.days || calculateDays(leave.start_date, leave.end_date),
        reason: leave.reason || '',
        status: leave.status,
        doctor: leave.doctor_name || 'Unknown Doctor',
        doctor_id: leave.doctor_id,
      }));
      setLeaveRequests(transformed);
      setDataSource(source);
      
      // Calculate leave summary for current doctor
      const currentDoctorLeaves = isAdmin 
        ? transformed.filter(l => l.doctor_id === currentDoctorId)
        : transformed;
      
      const approvedLeaves = currentDoctorLeaves.filter(l => l.status === 'approved');
      const usedDays = approvedLeaves.reduce((sum, leave) => sum + leave.days, 0);
      const annualLeaveDays = 14;
      const daysLeft = annualLeaveDays - usedDays;
      
      console.log('✈️ [LEAVE TAB] Leave Summary:', {
        total_leaves: transformed.length,
        current_doctor_leaves: currentDoctorLeaves.length,
        approved: approvedLeaves.length,
        pending: currentDoctorLeaves.filter(l => l.status === 'pending').length,
        rejected: currentDoctorLeaves.filter(l => l.status === 'rejected').length,
        annual_allocation: annualLeaveDays,
        used_days: usedDays,
        days_left: daysLeft,
        source
      });
      
      console.log('✈️ [LEAVE TAB] Approved leaves breakdown:', 
        approvedLeaves.map(l => ({
          type: l.type,
          start: l.startDate,
          end: l.endDate,
          days: l.days
        }))
      );
    } else {
      console.log('⚠️ [LEAVE TAB] No leave data, using fallback');
    }
  }, [apiLeaveRequests, source, isAdmin, currentDoctorId]);
  
  const [rosterRules, setRosterRules] = useState({
    minRestHours: '11',
    maxNightShifts: '4',
    maxWeeklyHours: '48',
    minStaffPerShift: '2',
    maxConsecutiveDays: '6',
  });
  const [autoGenerate, setAutoGenerate] = useState({ enabled: true, day: 'Friday', time: '18:00' });
  const [isGenerating, setIsGenerating] = useState(false);

  const pendingRequests = leaveRequests.filter(r => r.status === 'pending');

  const showToast = (type: 'success' | 'error', title: string, message?: string) => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); }
    setToast({ type, title, message });
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, 3000);
  };

  const calculateLeaveDays = () => {
    if (!leaveStartDate || !leaveEndDate) return 0;
    const start = new Date(leaveStartDate.date);
    const end = new Date(leaveEndDate.date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleLeaveRequest = () => {
    if (!selectedLeaveType || !leaveStartDate || !leaveEndDate) return;
    if (selectedLeaveType.isEmergency) { setLeaveModalVisible(false); setEmergencyModalVisible(true); return; }
    submitLeaveRequest();
  };

  const submitLeaveRequest = async () => {
    const leaveType = selectedLeaveType!.name;
    const days = calculateLeaveDays();
    
    // Call API to create leave request
    const result = await createLeaveRequest({
      doctor_id: 1, // Current user's doctor ID - would come from auth
      start_date: leaveStartDate!.date,
      end_date: leaveEndDate!.date,
      leave_type: selectedLeaveType!.id,
      reason: leaveReason,
      invite_coverage: inviteOthers,
    });
    
    if (result.success) {
      // Add to local state for immediate UI update
      const newRequest: DisplayLeaveRequest = { 
        id: String(result.data?.leave_id || Date.now()), 
        leave_id: result.data?.leave_id,
        type: leaveType, 
        typeColor: selectedLeaveType!.color, 
        startDate: leaveStartDate!.date, 
        endDate: leaveEndDate!.date, 
        days, 
        reason: leaveReason, 
        status: 'pending', 
        doctor: user?.employee?.firstName || 'You' 
      };
      setLeaveRequests([newRequest, ...leaveRequests]);
      showToast('success', `${leaveType} Leave Requested`, `Your ${days} day${days > 1 ? 's' : ''} leave has been submitted.`);
    } else {
      showToast('error', 'Request Failed', result.error);
    }
    
    resetLeaveForm();
  };

  const handleApproveReject = async (id: string, action: 'approved' | 'rejected') => {
    const request = leaveRequests.find(r => r.id === id);
    if (!request) return;
    
    // Call API
    const result = action === 'approved' 
      ? await approveLeaveRequest(request.leave_id || parseInt(id), 1)
      : await rejectLeaveRequest(request.leave_id || parseInt(id));
    
    if (result.success) {
      // Update local state
      setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
      if (action === 'approved') {
        showToast('success', 'Leave Approved', `${request.doctor}'s ${request.type} leave has been approved.`);
      } else {
        showToast('error', 'Leave Rejected', `${request.doctor}'s ${request.type} leave has been rejected.`);
      }
    } else {
      showToast('error', 'Action Failed', result.error);
    }
  };

  const resetLeaveForm = () => { setLeaveModalVisible(false); setEmergencyModalVisible(false); setSelectedLeaveType(null); setLeaveStartDate(null); setLeaveEndDate(null); setLeaveReason(''); };

  const handleGenerateRoster = () => { setIsGenerating(true); setTimeout(() => { setIsGenerating(false); setRosterPreviewVisible(true); }, 1500); };

  const handleConfirmRoster = () => { showToast('success', 'Published!', 'Roster published and all doctors notified.'); setRosterPreviewVisible(false); };

  const getStatusColor = (status: string) => status === 'approved' ? '#10b981' : status === 'rejected' ? '#ef4444' : '#f59e0b';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isAdmin && (
        <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={[styles.tab, activeTab === 'requests' && { backgroundColor: colors.primary }]} onPress={() => setActiveTab('requests')}>
            <Ionicons name="airplane" size={16} color={activeTab === 'requests' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'requests' ? '#fff' : colors.textSecondary }]}>Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'pending' && { backgroundColor: colors.primary }]} onPress={() => setActiveTab('pending')}>
            <Ionicons name="hourglass" size={16} color={activeTab === 'pending' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'pending' ? '#fff' : colors.textSecondary }]}>Pending ({pendingRequests.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isAdmin && <View style={{ height: 16 }} />}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {(activeTab === 'requests' || !isAdmin) && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.balanceRow}>
              {leaveTypes.map((type) => (
                <View key={type.id} style={[styles.balanceCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.balanceIcon, { backgroundColor: type.color + '20' }]}>
                    <Ionicons name={type.icon as any} size={18} color={type.color} />
                  </View>
                  <Text style={[styles.balanceNum, { color: colors.text }]}>{type.balance}</Text>
                  <Text style={[styles.balanceType, { color: colors.textSecondary }]}>{type.name}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.requestBtn, { backgroundColor: colors.primary }]} onPress={() => setLeaveModalVisible(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.requestBtnText}>Request Leave</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Requests</Text>
            {leaveRequests.filter(r => !isAdmin || r.doctor === (user?.employee?.firstName || 'You')).map((req) => (
              <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.requestCardRow}>
                  <View style={[styles.requestTypeBadge, { backgroundColor: req.typeColor + '20' }]}>
                    <Text style={[styles.requestTypeText, { color: req.typeColor }]}>{req.type}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(req.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>{req.status}</Text>
                  </View>
                </View>
                <View style={styles.requestInfo}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.requestDates, { color: colors.text }]}>{req.startDate} → {req.endDate}</Text>
                  <View style={[styles.daysPill, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.daysText, { color: colors.primary }]}>{req.days}d</Text>
                  </View>
                </View>
                {req.reason && <Text style={[styles.requestReason, { color: colors.textSecondary }]}>{req.reason}</Text>}
              </View>
            ))}
          </>
        )}

        {activeTab === 'pending' && isAdmin && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Approvals</Text>
            {pendingRequests.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Ionicons name="checkmark-circle-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending requests</Text>
              </View>
            ) : (
              pendingRequests.map((req) => (
                <View key={req.id} style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.pendingHeader}>
                    <View>
                      <Text style={[styles.pendingDoctor, { color: colors.text }]}>{req.doctor}</Text>
                      <Text style={[styles.pendingType, { color: req.typeColor }]}>{req.type} Leave</Text>
                    </View>
                    <View style={[styles.daysPill, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.daysText, { color: colors.primary }]}>{req.days} day{req.days > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <View style={styles.pendingDates}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.pendingDateText, { color: colors.textSecondary }]}>{req.startDate} → {req.endDate}</Text>
                  </View>
                  {req.reason && <Text style={[styles.pendingReason, { color: colors.textSecondary }]}>{req.reason}</Text>}
                  <View style={styles.pendingActions}>
                    <TouchableOpacity style={[styles.rejectBtn, { borderColor: '#ef4444' }]} onPress={() => handleApproveReject(req.id, 'rejected')}>
                      <Ionicons name="close" size={18} color="#ef4444" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.approveBtn, { backgroundColor: '#10b981' }]} onPress={() => handleApproveReject(req.id, 'approved')}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Leave Request Modal - Bottom Sheet */}
      <Modal visible={leaveModalVisible} animationType="fade" transparent onRequestClose={resetLeaveForm}>
        <Pressable style={styles.modalOverlay} onPress={resetLeaveForm}>
          <View style={styles.modalSpacer} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
            <Pressable style={[styles.leaveModal, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Request Leave</Text>
                <TouchableOpacity onPress={resetLeaveForm}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
              </View>

              <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
                <Text style={[styles.stepLabel, { color: colors.text }]}>Leave Type</Text>
                <View style={styles.leaveTypeGrid}>
                  {leaveTypes.map((type) => (
                    <TouchableOpacity key={type.id} style={[styles.leaveTypeCard, { backgroundColor: colors.background, borderColor: selectedLeaveType?.id === type.id ? type.color : colors.border }]} onPress={() => setSelectedLeaveType(type)}>
                      <View style={[styles.leaveTypeIcon, { backgroundColor: type.color + '20' }]}>
                        <Ionicons name={type.icon as any} size={20} color={type.color} />
                      </View>
                      <Text style={[styles.leaveTypeName, { color: colors.text }]}>{type.name}</Text>
                      <Text style={[styles.leaveTypeBalance, { color: colors.textSecondary }]}>{type.balance} days</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.stepLabel, { color: colors.text }]}>Start Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {availableDates.slice(0, 14).map((d) => (
                    <TouchableOpacity key={d.date} style={[styles.dateCard, { backgroundColor: colors.background, borderColor: leaveStartDate?.date === d.date ? colors.primary : colors.border }]} onPress={() => setLeaveStartDate(d)}>
                      <Text style={[styles.dateDay, { color: colors.textSecondary }]}>{d.day}</Text>
                      <Text style={[styles.dateNum, { color: leaveStartDate?.date === d.date ? colors.primary : colors.text }]}>{d.dayNum}</Text>
                      <Text style={[styles.dateMonth, { color: colors.textSecondary }]}>{d.month}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.stepLabel, { color: colors.text }]}>End Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {availableDates.slice(0, 14).map((d) => (
                    <TouchableOpacity key={d.date} style={[styles.dateCard, { backgroundColor: colors.background, borderColor: leaveEndDate?.date === d.date ? colors.primary : colors.border }]} onPress={() => setLeaveEndDate(d)}>
                      <Text style={[styles.dateDay, { color: colors.textSecondary }]}>{d.day}</Text>
                      <Text style={[styles.dateNum, { color: leaveEndDate?.date === d.date ? colors.primary : colors.text }]}>{d.dayNum}</Text>
                      <Text style={[styles.dateMonth, { color: colors.textSecondary }]}>{d.month}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {leaveStartDate && leaveEndDate && (
                  <View style={[styles.dateSummary, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                    <Text style={[styles.dateSummaryText, { color: colors.text }]}>{calculateLeaveDays()} day{calculateLeaveDays() > 1 ? 's' : ''}</Text>
                  </View>
                )}

                <Text style={[styles.stepLabel, { color: colors.text }]}>Reason (optional)</Text>
                <TextInput style={[styles.reasonInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="Enter reason..." placeholderTextColor={colors.textSecondary} value={leaveReason} onChangeText={setLeaveReason} multiline onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })} />

                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }, (!selectedLeaveType || !leaveStartDate || !leaveEndDate) && { opacity: 0.5 }]} onPress={handleLeaveRequest} disabled={!selectedLeaveType || !leaveStartDate || !leaveEndDate}>
                  <Text style={styles.submitBtnText}>Submit Request</Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Emergency Modal */}
      <Modal visible={emergencyModalVisible} animationType="fade" transparent onRequestClose={() => setEmergencyModalVisible(false)}>
        <Pressable style={styles.emergencyOverlay} onPress={() => setEmergencyModalVisible(false)}>
          <Pressable style={[styles.emergencyModal, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.emergencyIconBg, { backgroundColor: '#8b5cf6' + '20' }]}>
              <Ionicons name="alert-circle" size={36} color="#8b5cf6" />
            </View>
            <Text style={[styles.emergencyTitle, { color: colors.text }]}>Emergency Leave</Text>
            <Text style={[styles.emergencyDesc, { color: colors.textSecondary }]}>Notify available doctors to cover your shift?</Text>
            <View style={[styles.inviteRow, { backgroundColor: colors.background }]}>
              <Text style={[styles.inviteText, { color: colors.text }]}>Invite doctors to cover</Text>
              <Switch value={inviteOthers} onValueChange={setInviteOthers} trackColor={{ false: colors.border, true: '#8b5cf6' }} thumbColor="#fff" />
            </View>
            <View style={styles.emergencyBtns}>
              <TouchableOpacity style={[styles.emergencyCancelBtn, { borderColor: colors.border }]} onPress={() => setEmergencyModalVisible(false)}>
                <Text style={[styles.emergencyCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.emergencyConfirmBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => { submitLeaveRequest(); setEmergencyModalVisible(false); }}>
                <Text style={styles.emergencyConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Roster Preview Modal - Bottom Sheet */}
      <Modal visible={rosterPreviewVisible} animationType="fade" transparent onRequestClose={() => setRosterPreviewVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRosterPreviewVisible(false)}>
          <View style={styles.modalSpacer} />
          <Pressable style={[styles.previewModal, { backgroundColor: colors.card, maxHeight: '80%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Roster Preview</Text>
              <TouchableOpacity onPress={() => setRosterPreviewVisible(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewContent}>
              <View style={[styles.previewBanner, { backgroundColor: '#10b981' + '15' }]}>
                <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                <View>
                  <Text style={[styles.previewBannerTitle, { color: '#10b981' }]}>Roster Generated</Text>
                  <Text style={[styles.previewBannerDesc, { color: colors.textSecondary }]}>Week of Jan 15 - Jan 21</Text>
                </View>
              </View>

              <View style={styles.previewStats}>
                <View style={[styles.previewStat, { backgroundColor: colors.background }]}>
                  <Text style={[styles.previewStatNum, { color: colors.primary }]}>12</Text>
                  <Text style={[styles.previewStatLabel, { color: colors.textSecondary }]}>Doctors</Text>
                </View>
                <View style={[styles.previewStat, { backgroundColor: colors.background }]}>
                  <Text style={[styles.previewStatNum, { color: '#10b981' }]}>42</Text>
                  <Text style={[styles.previewStatLabel, { color: colors.textSecondary }]}>Shifts</Text>
                </View>
                <View style={[styles.previewStat, { backgroundColor: colors.background }]}>
                  <Text style={[styles.previewStatNum, { color: '#f59e0b' }]}>0</Text>
                  <Text style={[styles.previewStatLabel, { color: colors.textSecondary }]}>Conflicts</Text>
                </View>
              </View>

              {mockRosterPreview.map((day, i) => (
                <View key={i} style={[styles.previewDay, { backgroundColor: colors.background }]}>
                  <Text style={[styles.previewDayTitle, { color: colors.text }]}>{day.date}</Text>
                  <View style={styles.previewShifts}>
                    <View style={styles.previewShift}><Text style={[styles.shiftLabel, { color: '#f59e0b' }]}>☀️ Morning</Text><Text style={[styles.shiftDoctors, { color: colors.textSecondary }]}>{day.morning.join(', ')}</Text></View>
                    <View style={styles.previewShift}><Text style={[styles.shiftLabel, { color: '#8b5cf6' }]}>🌆 Evening</Text><Text style={[styles.shiftDoctors, { color: colors.textSecondary }]}>{day.evening.join(', ')}</Text></View>
                    <View style={styles.previewShift}><Text style={[styles.shiftLabel, { color: '#3b82f6' }]}>🌙 Night</Text><Text style={[styles.shiftDoctors, { color: colors.textSecondary }]}>{day.night.join(', ')}</Text></View>
                  </View>
                </View>
              ))}

              <View style={styles.previewActions}>
                <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]} onPress={() => setRosterPreviewVisible(false)}>
                  <Ionicons name="create-outline" size={16} color={colors.text} />
                  <Text style={[styles.editBtnText, { color: colors.text }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.publishBtn, { backgroundColor: '#10b981' }]} onPress={handleConfirmRoster}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.publishBtnText}>Publish</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <Animated.View style={[styles.toast, { backgroundColor: colors.card, borderColor: toast.type === 'success' ? '#10b981' : '#ef4444', opacity: toastOpacity }]}>
          <View style={[styles.toastIcon, { backgroundColor: (toast.type === 'success' ? '#10b981' : '#ef4444') + '20' }]}>
            <Ionicons name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={22} color={toast.type === 'success' ? '#10b981' : '#ef4444'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toastTitle, { color: colors.text }]}>{toast.title}</Text>
            {toast.message ? <Text style={[styles.toastMsg, { color: colors.textSecondary }]}>{toast.message}</Text> : null}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', margin: 16, marginBottom: 0, borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 4 },
  tabText: { fontSize: 12, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  balanceRow: { marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 },
  balanceCard: { width: 85, padding: 12, borderRadius: 12, alignItems: 'center', marginRight: 10 },
  balanceIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  balanceNum: { fontSize: 20, fontWeight: 'bold' },
  balanceType: { fontSize: 10, marginTop: 2 },
  requestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8, marginBottom: 20 },
  requestBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  requestCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  requestCardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  requestTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  requestTypeText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  requestInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  requestDates: { fontSize: 13, flex: 1 },
  daysPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  daysText: { fontSize: 11, fontWeight: '600' },
  requestReason: { fontSize: 12, marginTop: 8 },
  emptyState: { padding: 40, borderRadius: 16, alignItems: 'center' },
  emptyText: { marginTop: 10, fontSize: 14 },
  pendingCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  pendingDoctor: { fontSize: 15, fontWeight: '600' },
  pendingType: { fontSize: 13, marginTop: 2 },
  pendingDates: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  pendingDateText: { fontSize: 13 },
  pendingReason: { fontSize: 12, marginBottom: 12 },
  pendingActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, borderWidth: 1, gap: 4 },
  rejectBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, gap: 4 },
  approveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  rulesCard: { borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  ruleIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ruleLabel: { flex: 1, fontSize: 13 },
  ruleInputBox: { width: 56, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ruleInput: { fontSize: 15, fontWeight: '600', textAlign: 'center', width: '100%' },
  ruleUnit: { fontSize: 12, width: 30 },
  autoGenCard: { borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  autoGenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  autoGenInfo: { flex: 1 },
  autoGenLabel: { fontSize: 14, fontWeight: '600' },
  autoGenDesc: { fontSize: 12, marginTop: 2 },
  optionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  optionChipText: { fontSize: 13, fontWeight: '500' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSpacer: { flex: 0.2 },
  modalKeyboard: { flex: 0.8 },
  leaveModal: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { paddingHorizontal: 16, paddingBottom: 34 },
  stepLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 14 },
  leaveTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  leaveTypeCard: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  leaveTypeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  leaveTypeName: { fontSize: 13, fontWeight: '600' },
  leaveTypeBalance: { fontSize: 11, marginTop: 2 },
  dateCard: { width: 54, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginRight: 8 },
  dateDay: { fontSize: 10, marginBottom: 2 },
  dateNum: { fontSize: 16, fontWeight: 'bold' },
  dateMonth: { fontSize: 10, marginTop: 2 },
  dateSummary: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginTop: 12, gap: 8 },
  dateSummaryText: { fontSize: 14, fontWeight: '500' },
  reasonInput: { borderRadius: 12, padding: 12, minHeight: 50, borderWidth: 1, textAlignVertical: 'top' },
  submitBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  emergencyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  emergencyModal: { width: '100%', borderRadius: 20, padding: 24, alignItems: 'center' },
  emergencyIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emergencyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  emergencyDesc: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, width: '100%', marginBottom: 16 },
  inviteText: { fontSize: 14, fontWeight: '500' },
  emergencyBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  emergencyCancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  emergencyCancelText: { fontSize: 14, fontWeight: '600' },
  emergencyConfirmBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  emergencyConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  previewModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  previewContent: { paddingHorizontal: 20, paddingBottom: 34 },
  previewBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12, marginBottom: 14 },
  previewBannerTitle: { fontSize: 15, fontWeight: 'bold' },
  previewBannerDesc: { fontSize: 12, marginTop: 2 },
  previewStats: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  previewStat: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  previewStatNum: { fontSize: 22, fontWeight: 'bold' },
  previewStatLabel: { fontSize: 10, marginTop: 2 },
  previewDay: { borderRadius: 10, padding: 12, marginBottom: 8 },
  previewDayTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  previewShifts: { gap: 6 },
  previewShift: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shiftLabel: { fontSize: 11, fontWeight: '600', width: 75 },
  shiftDoctors: { fontSize: 11, flex: 1 },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  editBtnText: { fontSize: 14, fontWeight: '600' },
  publishBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 4 },
  publishBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  toast: { position: 'absolute', bottom: 16, left: 16, right: 16, borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6 },
  toastIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toastTitle: { fontSize: 14, fontWeight: '700' },
  toastMsg: { fontSize: 12, marginTop: 2 },
});
