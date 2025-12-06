import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, KeyboardAvoidingView, Platform, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useDoctors, fetchRoster, createSwapRequest, type DataSource } from '../../services/dataHooks';
import type { Doctor, RosterEntry } from '../../services/api';

// Transform API doctor to display format
interface DisplayDoctor {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  type: 'permanent' | 'flexible';
  status: 'available' | 'on_duty' | 'off_duty' | 'on_leave';
  department: string;
  nextShift: string;
  doctor_id: number;
}

// Transform API roster to shift format
interface DoctorShift {
  id: string;
  date: string;
  type: string;
  time: string;
  department: string;
  roster_id: number;
}

type ToastState = { type: 'success' | 'error'; title: string; message?: string } | null;
type HideTimer = ReturnType<typeof setTimeout> | null;

// Fallback mock doctors (used if API and mock both fail)
const fallbackDoctors: DisplayDoctor[] = [
  { id: '1', doctor_id: 1, name: 'Dr. John Smith', role: 'Senior Consultant', email: 'john.smith@hospital.com', phone: '+60 12-345 6789', type: 'permanent', status: 'available', department: 'Emergency', nextShift: 'Today, 07:00' },
  { id: '2', doctor_id: 2, name: 'Dr. Sarah Johnson', role: 'Specialist', email: 'sarah.j@hospital.com', phone: '+60 12-456 7890', type: 'permanent', status: 'on_duty', department: 'ICU', nextShift: 'Currently on duty' },
  { id: '3', doctor_id: 3, name: 'Dr. Michael Chen', role: 'Consultant', email: 'michael.c@hospital.com', phone: '+60 13-567 8901', type: 'flexible', status: 'available', department: 'Ward A', nextShift: 'Tomorrow, 15:00' },
  { id: '4', doctor_id: 4, name: 'Dr. Emily Davis', role: 'Registrar', email: 'emily.d@hospital.com', phone: '+60 14-678 9012', type: 'permanent', status: 'off_duty', department: 'Surgery', nextShift: 'Wed, 23:00' },
  { id: '5', doctor_id: 5, name: 'Dr. James Wilson', role: 'Medical Officer', email: 'james.w@hospital.com', phone: '+60 15-789 0123', type: 'flexible', status: 'available', department: 'Emergency', nextShift: 'Today, 15:00' },
];

type FilterType = 'all' | 'permanent' | 'flexible';
type StatusFilter = 'all' | 'available' | 'on_duty' | 'off_duty' | 'on_leave';

const statusConfig = {
  available: { label: 'Available', color: '#10b981', icon: 'checkmark-circle' },
  on_duty: { label: 'On Duty', color: '#3b82f6', icon: 'pulse' },
  off_duty: { label: 'Off Duty', color: '#6b7280', icon: 'moon' },
  on_leave: { label: 'On Leave', color: '#f59e0b', icon: 'airplane' },
};

// Helper to transform API doctor to display format
function transformDoctor(doc: Doctor): DisplayDoctor {
  return {
    id: String(doc.doctor_id),
    doctor_id: doc.doctor_id,
    name: doc.name,
    role: doc.role,
    email: doc.email,
    phone: doc.phone || '',
    type: doc.category === 'fixed' ? 'permanent' : 'flexible',
    status: doc.active ? 'available' : 'off_duty',
    department: doc.department,
    nextShift: 'Check schedule',
  };
}

// Helper to format shift time
function getShiftTime(shiftType: string): string {
  switch (shiftType.toLowerCase()) {
    case 'morning': return '08:00-16:00';
    case 'evening': return '16:00-00:00';
    case 'night': return '00:00-08:00';
    default: return '08:00-16:00';
  }
}

// Helper to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function DoctorsScreen() {
  const { colors } = useThemeStore();
  const hideTimer = useRef<HideTimer>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Fetch doctors from API
  const { data: apiDoctors, loading, error, source, refresh } = useDoctors();
  
  const [allDoctors, setAllDoctors] = useState<DisplayDoctor[]>(fallbackDoctors);
  const [doctorShifts, setDoctorShifts] = useState<Record<string, DoctorShift[]>>({});
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  
  // Transform API data when available
  useEffect(() => {
    if (apiDoctors && apiDoctors.length > 0) {
      const transformed = apiDoctors.map(transformDoctor);
      setAllDoctors(transformed);
      setDataSource(source);
    }
  }, [apiDoctors, source]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DisplayDoctor | null>(null);
  
  // Swap modal state
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [swapDoctor, setSwapDoctor] = useState<DisplayDoctor | null>(null);
  const [selectedShift, setSelectedShift] = useState<DoctorShift | null>(null);
  const [swapReason, setSwapReason] = useState('');
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const filteredDoctors = allDoctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) || doctor.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doctor.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || doctor.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeFiltersCount = (typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);
  const getTypeColor = (type: string) => type === 'permanent' ? '#6366f1' : '#8b5cf6';
  const getShiftColor = (time: string) => {
    if (time === '08:00-16:00') return '#FF843B';
    if (time === '16:00-00:00') return '#FF4F70';
    if (time === '00:00-08:00') return '#003BFF';
    return colors.primary;
  };

  const clearFilters = () => { setTypeFilter('all'); setStatusFilter('all'); };
  
  const openSwapModal = async (doctor: DisplayDoctor) => {
    console.log('🔄 [DOCTORS] Opening swap modal for doctor:', doctor.name, 'ID:', doctor.doctor_id);
    setSwapDoctor(doctor);
    setSelectedDoctor(null);
    setSwapModalVisible(true);
    setLoadingShifts(true);
    
    try {
      console.log('🔄 [DOCTORS] Fetching shifts for doctor_id:', doctor.doctor_id);
      // Fetch shifts for this doctor from API
      const result = await fetchRoster({ doctor_id: doctor.doctor_id });
      console.log('🔄 [DOCTORS] Fetched shifts:', result.data.length, 'source:', result.source);
      const shifts: DoctorShift[] = result.data.map((roster: RosterEntry) => ({
        id: String(roster.roster_id),
        roster_id: roster.roster_id,
        date: formatDate(roster.date),
        type: roster.shift_type.charAt(0).toUpperCase() + roster.shift_type.slice(1),
        time: getShiftTime(roster.shift_type),
        department: doctor.department,
      }));
      setDoctorShifts(prev => ({ ...prev, [doctor.id]: shifts }));
    } catch (error) {
      console.log('Failed to fetch shifts, using empty list');
      setDoctorShifts(prev => ({ ...prev, [doctor.id]: [] }));
    } finally {
      setLoadingShifts(false);
    }
  };
  
  const resetSwapModal = () => {
    setSwapModalVisible(false);
    setSwapDoctor(null);
    setSelectedShift(null);
    setSwapReason('');
  };
  
  const handleSwapRequest = async () => {
    if (!selectedShift || !swapDoctor) return;
    
    // Use the API to create swap request
    const result = await createSwapRequest({
      requester_id: 1, // Current user ID - would come from auth store
      requester_shift_date: new Date().toISOString().split('T')[0], // Would be actual user's shift
      requester_shift_type: 'morning',
      target_id: swapDoctor.doctor_id,
      target_shift_date: selectedShift.date,
      target_shift_type: selectedShift.type.toLowerCase(),
      reason: swapReason,
    });
    
    if (result.success) {
      showToast('success', 'Swap Request Sent', `Requested swap with ${swapDoctor.name} for ${selectedShift.date}`);
    } else {
      showToast('error', 'Request Failed', result.error);
    }
    resetSwapModal();
  };
  
  const showToast = (type: 'success' | 'error', title: string, message?: string) => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); }
    setToast({ type, title, message });
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, 3000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search by name or department" placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }, activeFiltersCount > 0 && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilterModalVisible(true)}>
          <Ionicons name="options" size={20} color={activeFiltersCount > 0 ? '#fff' : colors.text} />
          {activeFiltersCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFiltersCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {activeFiltersCount > 0 && (
        <View style={styles.activeFilters}>
          {typeFilter !== 'all' && (
            <TouchableOpacity style={[styles.filterPill, { backgroundColor: getTypeColor(typeFilter) + '20' }]} onPress={() => setTypeFilter('all')}>
              <Text style={[styles.filterPillText, { color: getTypeColor(typeFilter) }]}>{typeFilter}</Text>
              <Ionicons name="close" size={14} color={getTypeColor(typeFilter)} />
            </TouchableOpacity>
          )}
          {statusFilter !== 'all' && (
            <TouchableOpacity style={[styles.filterPill, { backgroundColor: statusConfig[statusFilter].color + '20' }]} onPress={() => setStatusFilter('all')}>
              <Text style={[styles.filterPillText, { color: statusConfig[statusFilter].color }]}>{statusConfig[statusFilter].label}</Text>
              <Ionicons name="close" size={14} color={statusConfig[statusFilter].color} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearFilters}><Text style={[styles.clearAllText, { color: colors.primary }]}>Clear all</Text></TouchableOpacity>
        </View>
      )}

      <Text style={[styles.resultsText, { color: colors.textSecondary }]}>{filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''}</Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {filteredDoctors.map((doctor) => {
          const status = statusConfig[doctor.status as keyof typeof statusConfig];
          return (
            <TouchableOpacity key={doctor.id} style={[styles.doctorCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setSelectedDoctor(doctor)} activeOpacity={0.7}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: getTypeColor(doctor.type) + '20' }]}>
                  <Text style={[styles.avatarText, { color: getTypeColor(doctor.type) }]}>{doctor.name.split(' ').slice(1, 3).map(n => n[0]).join('')}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.doctorName, { color: colors.text }]}>{doctor.name}</Text>
                  <Text style={[styles.doctorMeta, { color: colors.textSecondary }]}>{doctor.role} · {doctor.department}</Text>
                </View>
                <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
              </View>
              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <View style={styles.footerItem}><Ionicons name={status.icon as any} size={14} color={status.color} /><Text style={[styles.footerText, { color: status.color }]}>{status.label}</Text></View>
                <View style={styles.footerItem}><Ionicons name="time-outline" size={14} color={colors.textSecondary} /><Text style={[styles.footerText, { color: colors.textSecondary }]}>{doctor.nextShift}</Text></View>
                <View style={[styles.typePill, { backgroundColor: getTypeColor(doctor.type) + '15' }]}><Text style={[styles.typeText, { color: getTypeColor(doctor.type) }]}>{doctor.type}</Text></View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent onRequestClose={() => setFilterModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalSpacer} />
          <Pressable style={[styles.filterModal, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>Filter Doctors</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>

            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>Doctor Type</Text>
            <View style={styles.filterOptions}>
              {(['all', 'permanent', 'flexible'] as FilterType[]).map((type) => (
                <TouchableOpacity key={type} style={[styles.filterOption, { borderColor: colors.border }, typeFilter === type && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setTypeFilter(type)}>
                  <Text style={[styles.filterOptionText, { color: typeFilter === type ? '#fff' : colors.text }]}>{type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>Availability</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity style={[styles.filterOption, { borderColor: colors.border }, statusFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setStatusFilter('all')}>
                <Text style={[styles.filterOptionText, { color: statusFilter === 'all' ? '#fff' : colors.text }]}>All Status</Text>
              </TouchableOpacity>
              {Object.entries(statusConfig).map(([key, config]) => (
                <TouchableOpacity key={key} style={[styles.filterOption, { borderColor: colors.border }, statusFilter === key && { backgroundColor: config.color, borderColor: config.color }]} onPress={() => setStatusFilter(key as StatusFilter)}>
                  <Ionicons name={config.icon as any} size={16} color={statusFilter === key ? '#fff' : config.color} style={{ marginRight: 6 }} />
                  <Text style={[styles.filterOptionText, { color: statusFilter === key ? '#fff' : colors.text }]}>{config.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={[styles.clearBtn, { borderColor: colors.border }]} onPress={clearFilters}><Text style={[styles.clearBtnText, { color: colors.text }]}>Clear Filters</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={() => setFilterModalVisible(false)}><Text style={styles.applyBtnText}>Apply Filters</Text></TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Doctor Detail Modal */}
      <Modal visible={selectedDoctor !== null} animationType="fade" transparent onRequestClose={() => setSelectedDoctor(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDoctor(null)}>
          <View style={styles.modalSpacer} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.detailModalKeyboard}>
            <Pressable style={[styles.detailModal, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Doctor Details</Text>
                <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.background }]} onPress={() => setSelectedDoctor(null)}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              {selectedDoctor && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
                <View style={styles.profileHeader}>
                  <View style={[styles.profileAvatar, { backgroundColor: getTypeColor(selectedDoctor.type) + '20' }]}>
                    <Text style={[styles.profileAvatarText, { color: getTypeColor(selectedDoctor.type) }]}>{selectedDoctor.name.split(' ').slice(1, 3).map(n => n[0]).join('')}</Text>
                  </View>
                  <Text style={[styles.profileName, { color: colors.text }]}>{selectedDoctor.name}</Text>
                  <Text style={[styles.profileRole, { color: colors.textSecondary }]}>{selectedDoctor.role}</Text>
                  <View style={styles.profileBadges}>
                    <View style={[styles.profileBadge, { backgroundColor: statusConfig[selectedDoctor.status as keyof typeof statusConfig].color + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusConfig[selectedDoctor.status as keyof typeof statusConfig].color }]} />
                      <Text style={[styles.profileBadgeText, { color: statusConfig[selectedDoctor.status as keyof typeof statusConfig].color }]}>{statusConfig[selectedDoctor.status as keyof typeof statusConfig].label}</Text>
                    </View>
                    <View style={[styles.profileBadge, { backgroundColor: getTypeColor(selectedDoctor.type) + '20' }]}>
                      <Text style={[styles.profileBadgeText, { color: getTypeColor(selectedDoctor.type) }]}>{selectedDoctor.type}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                  <View style={styles.infoItem}>
                    <View style={[styles.infoIcon, { backgroundColor: colors.primary + '20' }]}><Ionicons name="business" size={18} color={colors.primary} /></View>
                    <View><Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Department</Text><Text style={[styles.infoValue, { color: colors.text }]}>{selectedDoctor.department}</Text></View>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={[styles.infoIcon, { backgroundColor: '#10b981' + '20' }]}><Ionicons name="mail" size={18} color="#10b981" /></View>
                    <View style={{ flex: 1 }}><Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text><Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{selectedDoctor.email}</Text></View>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={[styles.infoIcon, { backgroundColor: '#f59e0b' + '20' }]}><Ionicons name="call" size={18} color="#f59e0b" /></View>
                    <View><Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text><Text style={[styles.infoValue, { color: colors.text }]}>{selectedDoctor.phone}</Text></View>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={[styles.infoIcon, { backgroundColor: '#8b5cf6' + '20' }]}><Ionicons name="time" size={18} color="#8b5cf6" /></View>
                    <View><Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Next Shift</Text><Text style={[styles.infoValue, { color: colors.text }]}>{selectedDoctor.nextShift}</Text></View>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]}><Ionicons name="call" size={20} color="#fff" /><Text style={styles.actionBtnText}>Call</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]}><Ionicons name="mail" size={20} color="#fff" /><Text style={styles.actionBtnText}>Email</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => openSwapModal(selectedDoctor)}><Ionicons name="swap-horizontal" size={20} color="#fff" /><Text style={styles.actionBtnText}>Swap</Text></TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Swap Modal */}
      <Modal visible={swapModalVisible} animationType="fade" transparent onRequestClose={resetSwapModal}>
        <Pressable style={styles.modalOverlay} onPress={resetSwapModal}>
          <View style={styles.modalSpacer} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.swapModalKeyboard}>
            <Pressable style={[styles.swapModal, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Request Swap</Text>
                <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.background }]} onPress={resetSwapModal}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              {swapDoctor && (
                <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.swapContent}>
                  {/* Doctor Info Banner */}
                  <View style={[styles.swapDoctorBanner, { backgroundColor: colors.background }]}>
                    <View style={[styles.swapDoctorAvatar, { backgroundColor: getTypeColor(swapDoctor.type) + '20' }]}>
                      <Text style={[styles.swapDoctorAvatarText, { color: getTypeColor(swapDoctor.type) }]}>{swapDoctor.name.split(' ').slice(1, 3).map(n => n[0]).join('')}</Text>
                    </View>
                    <View style={styles.swapDoctorInfo}>
                      <Text style={[styles.swapDoctorName, { color: colors.text }]}>{swapDoctor.name}</Text>
                      <Text style={[styles.swapDoctorMeta, { color: colors.textSecondary }]}>{swapDoctor.department} · {swapDoctor.type}</Text>
                    </View>
                  </View>

                  {/* Available Shifts */}
                  <Text style={[styles.swapSectionTitle, { color: colors.text }]}>Select a Shift to Swap</Text>
                  
                  {loadingShifts ? (
                    <View style={[styles.noShiftsCard, { backgroundColor: colors.background }]}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.noShiftsText, { color: colors.textSecondary, marginTop: 8 }]}>Loading shifts...</Text>
                    </View>
                  ) : (doctorShifts[swapDoctor.id] || []).length === 0 ? (
                    <View style={[styles.noShiftsCard, { backgroundColor: colors.background }]}>
                      <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
                      <Text style={[styles.noShiftsText, { color: colors.textSecondary }]}>No available shifts for this doctor</Text>
                    </View>
                  ) : (
                    (doctorShifts[swapDoctor.id] || []).map((shift) => {
                      const shiftColor = getShiftColor(shift.time);
                      return (
                        <TouchableOpacity key={shift.id} style={[styles.shiftOption, { backgroundColor: colors.background, borderColor: selectedShift?.id === shift.id ? colors.primary : colors.border }]} onPress={() => setSelectedShift(shift)}>
                          <View style={[styles.shiftOptionBar, { backgroundColor: shiftColor }]} />
                          <View style={styles.shiftOptionInfo}>
                            <Text style={[styles.shiftOptionDate, { color: colors.text }]}>{shift.date}</Text>
                            <Text style={[styles.shiftOptionMeta, { color: colors.textSecondary }]}>{shift.time} · {shift.department}</Text>
                          </View>
                          <View style={[styles.shiftTypePill, { backgroundColor: shiftColor + '20' }]}>
                            <Text style={[styles.shiftTypePillText, { color: shiftColor }]}>{shift.type}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}

                  {/* Reason */}
                  <Text style={[styles.swapSectionTitle, { color: colors.text, marginTop: 16 }]}>Reason (optional)</Text>
                  <TextInput 
                    style={[styles.reasonInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} 
                    placeholder="Enter reason for swap..." 
                    placeholderTextColor={colors.textSecondary} 
                    value={swapReason} 
                    onChangeText={setSwapReason} 
                    multiline 
                  />

                  {/* Submit Button */}
                  <TouchableOpacity 
                    style={[styles.swapSubmitBtn, { backgroundColor: colors.primary }, !selectedShift && { opacity: 0.5 }]} 
                    onPress={handleSwapRequest}
                    disabled={!selectedShift}
                  >
                    <Ionicons name="swap-horizontal" size={20} color="#fff" />
                    <Text style={styles.swapSubmitText}>Send Swap Request</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </Pressable>
          </KeyboardAvoidingView>
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
  searchRow: { flexDirection: 'row', padding: 16, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 46, borderRadius: 12, gap: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  filterBtn: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  activeFilters: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 8, flexWrap: 'wrap' },
  filterPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  filterPillText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  clearAllText: { fontSize: 13, fontWeight: '600' },
  resultsText: { paddingHorizontal: 16, fontSize: 13, marginBottom: 8 },
  list: { flex: 1, paddingHorizontal: 16 },
  doctorCard: { borderWidth: 1, borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '600' },
  doctorMeta: { fontSize: 12, marginTop: 2 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, gap: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, fontWeight: '500' },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 'auto' },
  typeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSpacer: { flex: 0.3 },
  filterModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 34 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  filterTitle: { fontSize: 18, fontWeight: 'bold' },
  filterSectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 20, marginTop: 16, marginBottom: 10 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  filterOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  filterOptionText: { fontSize: 13, fontWeight: '500' },
  filterActions: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  clearBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  clearBtnText: { fontSize: 15, fontWeight: '600' },
  applyBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  detailModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, flex: 1 },
  detailContent: { paddingHorizontal: 20, paddingBottom: 34 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.1)' },
  detailHeaderTitle: { fontSize: 18, fontWeight: 'bold' },
  profileHeader: { alignItems: 'center', paddingVertical: 20 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { fontSize: 28, fontWeight: 'bold' },
  profileName: { fontSize: 20, fontWeight: 'bold' },
  profileRole: { fontSize: 14, marginTop: 4 },
  profileBadges: { flexDirection: 'row', marginTop: 12, gap: 8 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  profileBadgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  infoCard: { borderRadius: 16, padding: 16, gap: 14 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  actionRow: { flexDirection: 'row', marginTop: 20, gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 6 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  closeDetailBtn: { marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  closeDetailText: { fontSize: 15, fontWeight: '600' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  detailModalKeyboard: { flex: 0.8 },
  swapModalKeyboard: { flex: 0.8, justifyContent: 'flex-end' },
  swapModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, flex: 1 },
  swapContent: { paddingHorizontal: 20, paddingBottom: 34, gap: 16 },
  swapDoctorBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 12, marginBottom: 16 },
  swapDoctorAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  swapDoctorAvatarText: { fontSize: 16, fontWeight: 'bold' },
  swapDoctorInfo: { flex: 1 },
  swapDoctorName: { fontSize: 15, fontWeight: '600' },
  swapDoctorMeta: { fontSize: 12, marginTop: 2 },
  noShiftsCard: { padding: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 8 },
  noShiftsText: { fontSize: 14 },
  shiftOptionBar: { width: 4, height: '100%', borderRadius: 2, position: 'absolute', left: 0 },
  shiftOptionDate: { fontSize: 14, fontWeight: '600' },
  shiftOptionMeta: { fontSize: 12, marginTop: 2 },
  shiftTypePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  shiftTypePillText: { fontSize: 11, fontWeight: '600' },
  swapSectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  shiftOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  shiftOptionInfo: { flex: 1 },
  shiftDate: { fontSize: 14, fontWeight: '600' },
  shiftMeta: { fontSize: 12, marginTop: 2 },
  reasonInput: { height: 100, borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, textAlignVertical: 'top' },
  swapActions: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  sendBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  swapSubmitBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 20, marginTop: 16 },
  swapSubmitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  toast: { position: 'absolute', bottom: 16, left: 16, right: 16, borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6 },
  toastIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toastTitle: { fontSize: 14, fontWeight: '700' },
  toastMsg: { fontSize: 12, marginTop: 2 },
});
