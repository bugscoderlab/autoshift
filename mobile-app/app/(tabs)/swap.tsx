import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { 
  useSwapRequests, 
  useRoster,
  useDoctors,
  createSwapRequest, 
  acceptSwapRequest, 
  rejectSwapRequest,
  type DataSource 
} from '../../services/dataHooks';
import type { SwapRequest, Doctor, RosterEntry } from '../../services/api';

const shiftHours = [
  { id: '8-4', label: '8AM - 4PM' },
  { id: '4-12', label: '4PM - 12AM' },
  { id: '12-8', label: '12AM - 8AM' },
];

interface DisplayShift {
  id: string;
  date: string;
  type: string;
  time: string;
  department: string;
  roster_id?: number;
}

interface DisplayDoctor {
  id: string;
  doctor_id: number;
  name: string;
  type: 'permanent' | 'flexible';
  department: string;
}

interface DisplaySwapRequest {
  id: string;
  swap_id?: number;
  status: string;
  shift: string;
  target: string;
  type: 'single' | 'broadcast';
  requester_id?: number;
  target_id?: number;
}

// Fallback data
const fallbackShifts: DisplayShift[] = [
  { id: '1', date: 'Mon, Jan 15', type: 'Morning', time: '08:00-16:00', department: 'Emergency' },
  { id: '2', date: 'Wed, Jan 17', type: 'Evening', time: '16:00-00:00', department: 'Ward A' },
  { id: '3', date: 'Fri, Jan 19', type: 'Morning', time: '08:00-16:00', department: 'ICU' },
  { id: '4', date: 'Mon, Jan 22', type: 'Night', time: '00:00-08:00', department: 'Emergency' },
];

const fallbackDoctors: DisplayDoctor[] = [
  { id: '1', doctor_id: 1, name: 'Dr. Sarah Johnson', type: 'permanent', department: 'ICU' },
  { id: '2', doctor_id: 2, name: 'Dr. Michael Chen', type: 'flexible', department: 'Ward A' },
  { id: '3', doctor_id: 3, name: 'Dr. James Wilson', type: 'flexible', department: 'Emergency' },
  { id: '4', doctor_id: 4, name: 'Dr. Emily Davis', type: 'permanent', department: 'Surgery' },
  { id: '5', doctor_id: 5, name: 'Dr. Robert Lee', type: 'flexible', department: 'ICU' },
];

const fallbackSwapRequests: DisplaySwapRequest[] = [
  { id: 'sr1', status: 'pending', shift: 'Mon, Jan 15  Morning', target: 'Dr. Sarah Johnson', type: 'single' },
  { id: 'sr2', status: 'accepted', shift: 'Fri, Jan 12  Evening', target: 'Dr. Michael Chen', type: 'broadcast' },
];

const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({ date: date.toISOString().split('T')[0], day: date.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: date.getDate() });
  }
  return dates;
};

const availableDates = generateDates();

// Helper functions
function getShiftTime(shiftType: string): string {
  switch (shiftType.toLowerCase()) {
    case 'morning': return '08:00-16:00';
    case 'evening': return '16:00-00:00';
    case 'night': return '00:00-08:00';
    default: return '08:00-16:00';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type ToastState = { type: 'success' | 'error'; title: string; message?: string } | null;
type HideTimer = ReturnType<typeof setTimeout> | null;

export default function SwapScreen() {
  const { colors } = useThemeStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const hideTimer = useRef<HideTimer>(null);
  
  // Fetch data from API
  const { data: apiSwapRequests, loading: loadingSwaps, source: swapSource, refresh: refreshSwaps } = useSwapRequests();
  const { data: apiRoster, loading: loadingRoster, source: rosterSource } = useRoster({ doctor_id: 1 }); // Current user's roster
  const { data: apiDoctors, loading: loadingDoctors } = useDoctors();
  
  const [myShifts, setMyShifts] = useState<DisplayShift[]>(fallbackShifts);
  const [availableDoctors, setAvailableDoctors] = useState<DisplayDoctor[]>(fallbackDoctors);
  const [swapRequests, setSwapRequests] = useState<DisplaySwapRequest[]>(fallbackSwapRequests);
  
  // Transform API roster to shifts
  useEffect(() => {
    if (apiRoster && apiRoster.length > 0) {
      const shifts: DisplayShift[] = apiRoster.map((entry: RosterEntry) => ({
        id: String(entry.roster_id),
        roster_id: entry.roster_id,
        date: formatDate(entry.date),
        type: entry.shift_type.charAt(0).toUpperCase() + entry.shift_type.slice(1),
        time: getShiftTime(entry.shift_type),
        department: entry.doctor_name || 'Emergency',
      }));
      setMyShifts(shifts);
    }
  }, [apiRoster]);
  
  // Transform API doctors
  useEffect(() => {
    if (apiDoctors && apiDoctors.length > 0) {
      const docs: DisplayDoctor[] = apiDoctors.map((doc: Doctor) => ({
        id: String(doc.doctor_id),
        doctor_id: doc.doctor_id,
        name: doc.name,
        type: doc.category === 'fixed' ? 'permanent' : 'flexible',
        department: doc.department,
      }));
      setAvailableDoctors(docs);
    }
  }, [apiDoctors]);
  
  // Transform API swap requests
  useEffect(() => {
    if (apiSwapRequests && apiSwapRequests.length > 0) {
      const swaps: DisplaySwapRequest[] = apiSwapRequests.map((swap: SwapRequest) => ({
        id: String(swap.swap_id),
        swap_id: swap.swap_id,
        status: swap.status,
        shift: `${formatDate(swap.requester_shift_date)}  ${swap.requester_shift_type}`,
        target: swap.target_name || (swap.is_broadcast ? 'Broadcast' : 'Unknown'),
        type: swap.is_broadcast ? 'broadcast' : 'single',
        requester_id: swap.requester_id,
        target_id: swap.target_id,
      }));
      setSwapRequests(swaps);
    }
  }, [apiSwapRequests]);
  
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedShift, setSelectedShift] = useState<DisplayShift | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [includePermanent, setIncludePermanent] = useState(true);
  const [includeFlexible, setIncludeFlexible] = useState(true);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const getShiftColor = (time: string) => {
    if (time === '08:00-16:00') return '#FF843B';
    if (time === '16:00-00:00') return '#FF4F70';
    if (time === '00:00-08:00') return '#003BFF';
    return colors.primary;
  };

  const filteredDoctors = availableDoctors.filter(doc => {
    if (!includePermanent && doc.type === 'permanent') return false;
    if (!includeFlexible && doc.type === 'flexible') return false;
    return true;
  });

  const toggleDoctor = (id: string) => setSelectedDoctors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedDoctors(filteredDoctors.map(d => d.id));

  const handleSend = async (toAll: boolean) => {
    const targets = toAll ? filteredDoctors : filteredDoctors.filter(d => selectedDoctors.includes(d.id));
    if (targets.length === 0) { 
      showToast('error', 'No doctors selected', 'Choose at least one doctor to swap with.');
      return; 
    }
    
    // Parse the shift date for API call
    const shiftDate = selectedShift?.date || new Date().toISOString().split('T')[0];
    
    // Call API to create swap request
    const result = await createSwapRequest({
      requester_id: 1, // Current user's doctor ID
      requester_shift_date: shiftDate,
      requester_shift_type: selectedShift?.type.toLowerCase() || 'morning',
      target_id: toAll ? undefined : targets[0]?.doctor_id,
      is_broadcast: toAll,
      reason: reason,
    });
    
    if (result.success) {
      const newReq: DisplaySwapRequest = { 
        id: String(result.data?.swap_id || Date.now()), 
        swap_id: result.data?.swap_id,
        status: 'pending', 
        shift: selectedShift?.date + '  ' + selectedShift?.type, 
        target: toAll ? `${targets.length} doctors` : targets.map(d => d.name).join(', '), 
        type: toAll ? 'broadcast' : 'single' 
      };
      setSwapRequests([newReq, ...swapRequests]);
      showToast('success', 'Request sent', toAll ? `Reached ${targets.length} doctors.` : `Reached ${targets.length} doctor(s).`);
    } else {
      showToast('error', 'Request failed', result.error);
    }
    resetModal();
  };

  const resetModal = () => { setSwapModalVisible(false); setStep(1); setSelectedShift(null); setSelectedDate(null); setSelectedHour(null); setSelectedDoctors([]); setReason(''); };

  const handleAcceptSwap = async (swapId: number) => {
    const result = await acceptSwapRequest(swapId, 1); // 1 is current user doctor_id
    if (result.success) {
      setSwapRequests(prev => prev.map(r => r.swap_id === swapId ? { ...r, status: 'accepted' } : r));
      showToast('success', 'Swap Accepted', 'You have accepted this swap request.');
      refreshSwaps();
    } else {
      showToast('error', 'Failed to accept', result.error);
    }
  };

  const handleRejectSwap = async (swapId: number) => {
    const result = await rejectSwapRequest(swapId);
    if (result.success) {
      setSwapRequests(prev => prev.map(r => r.swap_id === swapId ? { ...r, status: 'rejected' } : r));
      showToast('success', 'Swap Rejected', 'You have rejected this swap request.');
      refreshSwaps();
    } else {
      showToast('error', 'Failed to reject', result.error);
    }
  };

  const getStatusColor = (s: string) => s === 'accepted' ? '#10b981' : s === 'rejected' ? '#ef4444' : s === 'cancelled' ? '#6b7280' : '#f59e0b';
  const getTypeColor = (t: string) => t === 'permanent' ? '#6366f1' : '#8b5cf6';

  const showToast = (type: 'success' | 'error', title: string, message?: string) => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); }
    setToast({ type, title, message });
    Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
    }, 2400);
  };

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Shifts</Text>
        <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>Tap a shift to request a swap</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shiftsScroll}>
          {myShifts.map((shift) => {
            const shiftColor = getShiftColor(shift.time);
            return (
              <View key={shift.id} style={[styles.shiftCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity onPress={() => { setSelectedShift(shift); setSwapModalVisible(true); setStep(2); }}>
                  <Text style={[styles.shiftDate, { color: colors.text }]}>{shift.date}</Text>
                  <Text style={[styles.shiftTime, { color: shiftColor }]}>{shift.time}</Text>
                  <View style={[styles.shiftDeptBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.shiftDeptText, { color: colors.textSecondary }]}>{shift.department}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.swapBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setSelectedShift(shift); setSwapModalVisible(true); setStep(2); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#fff" />
                  <Text style={styles.swapBtnText}>Swap</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Swap Requests</Text>
        {swapRequests.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons name="swap-horizontal-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No swap requests</Text>
          </View>
        ) : (
          swapRequests.map((req) => (
            <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.requestRow}>
                <View style={styles.requestInfo}>
                  <Text style={[styles.requestShift, { color: colors.text }]}>{req.shift}</Text>
                  <Text style={[styles.requestTarget, { color: colors.textSecondary }]}>{req.target}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(req.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>{req.status}</Text>
                </View>
              </View>
              {req.status === 'pending' && req.target_id === 1 && req.swap_id && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn, { borderColor: '#ef4444' }]} 
                    onPress={() => handleRejectSwap(req.swap_id!)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: '#10b981' }]} 
                    onPress={() => handleAcceptSwap(req.swap_id!)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}
              {req.status === 'pending' && req.requester_id === 1 && (
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: '#ef4444' }]} onPress={() => setSwapRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'cancelled' } : r))}>
                  <Text style={styles.cancelBtnText}>Cancel Request</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Bottom Sheet Modal */}
      <Modal visible={swapModalVisible} animationType="fade" transparent onRequestClose={resetModal}>
        <Pressable style={styles.modalOverlay} onPress={resetModal}>
          <View style={styles.modalSpacer} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{step === 1 ? 'Filter Doctors' : 'Select Doctors'}</Text>
                <TouchableOpacity onPress={resetModal}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
              </View>

              {/* Selected Shift Banner */}
              {selectedShift && (
                <View style={[styles.selectedShiftBanner, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={[styles.shiftBannerBar, { backgroundColor: getShiftColor(selectedShift.time) }]} />
                  <View style={styles.shiftBannerInfo}>
                    <Text style={[styles.shiftBannerDate, { color: colors.text }]}>{selectedShift.date}</Text>
                    <Text style={[styles.shiftBannerMeta, { color: colors.textSecondary }]}>{selectedShift.time} · {selectedShift.department}</Text>
                  </View>
                  <View style={[styles.shiftTypePill, { backgroundColor: getShiftColor(selectedShift.time) + '20' }]}>
                    <Text style={[styles.shiftTypePillText, { color: getShiftColor(selectedShift.time) }]}>{selectedShift.type}</Text>
                  </View>
                </View>
              )}

              <View style={styles.stepIndicator}>
                {[1, 2].map((s) => (
                  <View key={s} style={styles.stepRow}>
                    <View style={[styles.stepCircle, { backgroundColor: s <= step ? colors.primary : colors.border }]}>
                      <Text style={styles.stepNum}>{s}</Text>
                    </View>
                    {s < 2 && <View style={[styles.stepLine, { backgroundColor: s < step ? colors.primary : colors.border }]} />}
                  </View>
                ))}
              </View>

              <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
                {step === 1 && (
                  <>
                    <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Include</Text>
                    <View style={styles.filterRow}>
                      <TouchableOpacity style={[styles.filterChip, { backgroundColor: includePermanent ? '#6366f1' : colors.background, borderColor: includePermanent ? '#6366f1' : colors.border }]} onPress={() => setIncludePermanent(!includePermanent)}>
                        <Ionicons name={includePermanent ? 'checkbox' : 'square-outline'} size={18} color={includePermanent ? '#fff' : colors.textSecondary} />
                        <Text style={[styles.filterChipText, { color: includePermanent ? '#fff' : colors.text }]}>Permanent</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.filterChip, { backgroundColor: includeFlexible ? '#8b5cf6' : colors.background, borderColor: includeFlexible ? '#8b5cf6' : colors.border }]} onPress={() => setIncludeFlexible(!includeFlexible)}>
                        <Ionicons name={includeFlexible ? 'checkbox' : 'square-outline'} size={18} color={includeFlexible ? '#fff' : colors.textSecondary} />
                        <Text style={[styles.filterChipText, { color: includeFlexible ? '#fff' : colors.text }]}>Flexible</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Date (optional)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {availableDates.slice(0, 7).map((d) => (
                        <TouchableOpacity key={d.date} style={[styles.dateChip, { borderColor: selectedDate === d.date ? colors.primary : colors.border, backgroundColor: selectedDate === d.date ? colors.primary + '15' : colors.background }]} onPress={() => setSelectedDate(selectedDate === d.date ? null : d.date)}>
                          <Text style={[styles.dateDay, { color: colors.textSecondary }]}>{d.day}</Text>
                          <Text style={[styles.dateNum, { color: selectedDate === d.date ? colors.primary : colors.text }]}>{d.dayNum}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Shift (optional)</Text>
                    <View style={styles.filterRow}>
                      {shiftHours.map((h) => (
                        <TouchableOpacity key={h.id} style={[styles.hourChip, { borderColor: selectedHour === h.id ? colors.primary : colors.border, backgroundColor: selectedHour === h.id ? colors.primary + '15' : colors.background }]} onPress={() => setSelectedHour(selectedHour === h.id ? null : h.id)}>
                          <Text style={[styles.hourText, { color: selectedHour === h.id ? colors.primary : colors.text }]}>{h.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.navRow}>
                      <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={() => setStep(2)}>
                        <Text style={styles.nextBtnText}>Find Doctors</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {step === 2 && (
                  <>
                    <View style={styles.doctorHeader}>
                      <Text style={[styles.doctorCount, { color: colors.text }]}>Available ({filteredDoctors.length})</Text>
                      <TouchableOpacity onPress={selectAll}>
                        <Text style={[styles.selectAllText, { color: colors.primary }]}>Select All</Text>
                      </TouchableOpacity>
                    </View>

                    {filteredDoctors.map((doc) => (
                      <TouchableOpacity key={doc.id} style={[styles.doctorCard, { backgroundColor: colors.background, borderColor: selectedDoctors.includes(doc.id) ? colors.primary : colors.border }]} onPress={() => toggleDoctor(doc.id)}>
                        <View style={[styles.docAvatar, { backgroundColor: getTypeColor(doc.type) + '20' }]}>
                          <Text style={[styles.docAvatarText, { color: getTypeColor(doc.type) }]}>{doc.name.split(' ').slice(1).map(n => n[0]).join('')}</Text>
                        </View>
                        <View style={styles.docInfo}>
                          <Text style={[styles.docName, { color: colors.text }]}>{doc.name}</Text>
                          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>{doc.type}  {doc.department}</Text>
                        </View>
                        <Ionicons name={selectedDoctors.includes(doc.id) ? 'checkbox' : 'square-outline'} size={22} color={selectedDoctors.includes(doc.id) ? colors.primary : colors.textSecondary} />
                      </TouchableOpacity>
                    ))}

                    <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Reason (optional)</Text>
                    <TextInput style={[styles.reasonInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="Enter reason..." placeholderTextColor={colors.textSecondary} value={reason} onChangeText={setReason} multiline onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })} />

                    <View style={styles.actionRow}>
                      <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => setStep(1)}>
                        <Ionicons name="arrow-back" size={18} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.sendAllBtn, { backgroundColor: '#10b981' }]} onPress={() => handleSend(true)}>
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={styles.sendBtnText}>All ({filteredDoctors.length})</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.sendSelectedBtn, { backgroundColor: colors.primary }, selectedDoctors.length === 0 && { opacity: 0.5 }]} onPress={() => handleSend(false)} disabled={selectedDoctors.length === 0}>
                      <Ionicons name="person" size={16} color="#fff" />
                      <Text style={styles.sendBtnText}>Selected ({selectedDoctors.length})</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      
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
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  sectionDesc: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  shiftsScroll: { marginHorizontal: -16, paddingHorizontal: 16, marginBottom: 16 },
  shiftCard: { width: 140, borderRadius: 14, overflow: 'hidden', marginRight: 10, borderWidth: 1},
  shiftDate: { fontSize: 13, fontWeight: '600', paddingHorizontal: 12, paddingTop: 12 },
  shiftTime: { fontSize: 14, paddingHorizontal: 12, marginTop: 4, fontWeight: '600' },
  shiftDeptBadge: { margin: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', borderWidth: 1 },
  shiftDeptText: { fontSize: 10 },
  swapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginHorizontal: 10, marginBottom: 10, borderRadius: 10 },
  swapBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 16, marginTop: 8 },
  emptyState: { padding: 40, borderRadius: 16, alignItems: 'center' },
  emptyText: { marginTop: 10, fontSize: 14 },
  requestCard: { borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 8, borderWidth: 1 },
  requestRow: { flexDirection: 'row', alignItems: 'center' },
  requestInfo: { flex: 1 },
  requestShift: { fontSize: 14, fontWeight: '600' },
  requestTarget: { fontSize: 12, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cancelBtn: { marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', marginTop: 10, gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  rejectBtn: { borderWidth: 1, backgroundColor: 'transparent' },
  acceptBtn: { borderWidth: 0 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSpacer: { flex: 0.2 },
  modalKeyboard: { flex: 0.8 },
  modalContent: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  stepLine: { width: 36, height: 2 },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 34 },
  shiftOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  shiftOptionBar: { width: 4, alignSelf: 'stretch' },
  shiftOptionInfo: { flex: 1, padding: 14 },
  shiftOptionDate: { fontSize: 14, fontWeight: '600' },
  shiftOptionMeta: { fontSize: 12, marginTop: 2 },
  shiftTypePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 14 },
  shiftTypePillText: { fontSize: 11, fontWeight: '600' },
  selectedShiftBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  shiftBannerBar: { width: 4, alignSelf: 'stretch' },
  shiftBannerInfo: { flex: 1, padding: 12 },
  shiftBannerDate: { fontSize: 14, fontWeight: '600' },
  shiftBannerMeta: { fontSize: 12, marginTop: 2 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 6, marginTop: 8 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  filterLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 6 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  dateChip: { width: 52, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginRight: 8 },
  dateDay: { fontSize: 10, marginBottom: 2 },
  dateNum: { fontSize: 16, fontWeight: 'bold' },
  hourChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  hourText: { fontSize: 12, fontWeight: '500' },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  backBtn: { padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  doctorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  doctorCount: { fontSize: 14, fontWeight: '600' },
  selectAllText: { fontSize: 13, fontWeight: '600' },
  doctorCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 10 },
  docAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  docAvatarText: { fontSize: 13, fontWeight: 'bold' },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600' },
  docMeta: { fontSize: 11, marginTop: 2 },
  reasonInput: { borderRadius: 12, padding: 12, minHeight: 50, borderWidth: 1, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  sendAllBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 6 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sendSelectedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 6, marginTop: 10 },
  toast: { position: 'absolute', bottom: 16, left: 16, right: 16, borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6 },
  toastIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toastTitle: { fontSize: 14, fontWeight: '700' },
  toastMsg: { fontSize: 12, marginTop: 2 },
});

