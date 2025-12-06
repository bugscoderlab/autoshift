import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, TextInput, Switch, Pressable, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useRoster } from '../../services/dataHooks';
import { RosterEntry } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

// Mock shift data with staff working
const mockShifts: Record<string, { 
  type: string; 
  time: string; 
  department: string;
  staff: { name: string; role: string; avatar: string }[];
}> = {
  '2024-01-15': { 
    type: 'Morning', 
    time: '07:00-15:00', 
    department: 'Emergency',
    staff: [
      { name: 'John Doe', role: 'Doctor', avatar: 'JD' },
      { name: 'Jane Smith', role: 'Nurse', avatar: 'JS' },
      { name: 'Bob Johnson', role: 'Nurse', avatar: 'BJ' },
      { name: 'Alice Brown', role: 'Technician', avatar: 'AB' },
    ]
  },
  '2024-01-17': { 
    type: 'Evening', 
    time: '15:00-23:00', 
    department: 'Ward A',
    staff: [
      { name: 'Charlie Davis', role: 'Doctor', avatar: 'CD' },
      { name: 'Diana Miller', role: 'Nurse', avatar: 'DM' },
      { name: 'John Doe', role: 'Doctor', avatar: 'JD' },
    ]
  },
  '2024-01-19': { 
    type: 'Morning', 
    time: '07:00-15:00', 
    department: 'ICU',
    staff: [
      { name: 'John Doe', role: 'Doctor', avatar: 'JD' },
      { name: 'Emma Wilson', role: 'Nurse', avatar: 'EW' },
      { name: 'Frank White', role: 'Specialist', avatar: 'FW' },
    ]
  },
  '2024-01-22': { 
    type: 'Night', 
    time: '23:00-07:00', 
    department: 'Emergency',
    staff: [
      { name: 'John Doe', role: 'Doctor', avatar: 'JD' },
      { name: 'Grace Lee', role: 'Nurse', avatar: 'GL' },
    ]
  },
  '2024-01-24': { 
    type: 'Morning', 
    time: '07:00-15:00', 
    department: 'Ward B',
    staff: [
      { name: 'Henry Clark', role: 'Doctor', avatar: 'HC' },
      { name: 'John Doe', role: 'Doctor', avatar: 'JD' },
      { name: 'Ivy Martinez', role: 'Nurse', avatar: 'IM' },
      { name: 'Jack Thompson', role: 'Technician', avatar: 'JT' },
    ]
  },
  '2024-01-26': { 
    type: 'Evening', 
    time: '15:00-23:00', 
    department: 'ICU',
    staff: [
      { name: 'John Doe', role: 'Doctor', avatar: 'JD' },
      { name: 'Kate Robinson', role: 'Nurse', avatar: 'KR' },
    ]
  },
};

const shiftColors: Record<string, string> = {
  Morning: '#FF843B',
  Afternoon: '#FFA500',
  Evening: '#FF4F70',
  Night: '#003BFF',
};

// Helper function to get shift color based on shift type
function getShiftColor(shiftType: string): string {
  const type = shiftType.charAt(0).toUpperCase() + shiftType.slice(1).toLowerCase();
  return shiftColors[type] || '#FF843B';
}

const roleColors: Record<string, string> = {
  Doctor: '#ef4444',
  Nurse: '#10b981',
  Specialist: '#f59e0b',
  Technician: '#6366f1',
};

const mockRosterPreview = [
  { date: 'Mon, Jan 15', shift: 'Morning', staff: ['Dr. Smith', 'Dr. Chen', 'Dr. Johnson'] },
  { date: 'Tue, Jan 16', shift: 'Evening', staff: ['Dr. Wilson', 'Dr. Smith', 'Dr. Brown'] },
  { date: 'Wed, Jan 17', shift: 'Night', staff: ['Dr. Chen', 'Dr. Davis'] },
  { date: 'Thu, Jan 18', shift: 'Morning', staff: ['Dr. Lee', 'Dr. Johnson', 'Dr. Anderson'] },
];

export default function ScheduleScreen() {
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const isAdmin = user?.role === 'ADMIN';
  const currentDoctorId = user?.doctor_id || 1; // Current user's doctor ID
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'roster'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // December 2025
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rosterPreviewVisible, setRosterPreviewVisible] = useState(false);
  const [rosterRules, setRosterRules] = useState({
    minRestHours: '11',
    maxNightShifts: '4',
    maxWeeklyHours: '48',
    minStaffPerShift: '2',
    maxConsecutiveDays: '6',
  });
  const [autoGenerate, setAutoGenerate] = useState({ enabled: true, day: 'Friday', time: '18:00' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMonth, setGenerationMonth] = useState(new Date());
  const [previewMode, setPreviewMode] = useState<'calendar' | 'list'>('list');
  const [generatedRoster, setGeneratedRoster] = useState<RosterEntry[] | null>(null);
  const [previewSelectedDate, setPreviewSelectedDate] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch roster data from API - filter by current doctor for calendar display
  const { data: myRosterData, loading: rosterLoading, refresh: refreshRoster, source: myRosterSource } = useRoster({ 
    year, 
    month: month + 1, // API expects 1-based month
    doctor_id: currentDoctorId // Always show only current user's shifts in calendar
  });

  // Fetch ALL roster data for the month (for date detail view)
  const { data: allRosterData, loading: allRosterLoading, refresh: refreshAllRoster, source: allRosterSource } = useRoster({ 
    year, 
    month: month + 1, // API expects 1-based month
    doctor_id: undefined // Get all doctors' shifts for detail view
  });

  // Refresh calendar data from endpoint every time page is loaded
  useEffect(() => {
    console.log('🔄 [SCHEDULE] Page loaded - Refreshing calendar data from endpoint...');
    const refreshData = async () => {
      await Promise.all([
        refreshRoster(),
        refreshAllRoster()
      ]);
      console.log('✅ [SCHEDULE] Calendar data refreshed from endpoint');
    };
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - runs only on mount

  // Refresh when year/month changes
  useEffect(() => {
    console.log('🔄 [SCHEDULE] Month changed - Refreshing calendar data...');
    const refreshData = async () => {
      await Promise.all([
        refreshRoster(),
        refreshAllRoster()
      ]);
    };
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]); // Refresh when year or month changes

  // Log data fetching
  useEffect(() => {
    console.log('📅 [SCHEDULE] Calendar - My Roster Data:', {
      year,
      month: month + 1,
      doctor_id: currentDoctorId,
      count: myRosterData?.length,
      source: myRosterSource,
      loading: rosterLoading,
      sample: myRosterData?.[0]
    });
  }, [myRosterData, myRosterSource, rosterLoading, year, month, currentDoctorId]);

  useEffect(() => {
    console.log('📅 [SCHEDULE] All Roster Data for date details:', {
      year,
      month: month + 1,
      count: allRosterData?.length,
      source: allRosterSource,
      loading: allRosterLoading
    });
  }, [allRosterData, allRosterSource, allRosterLoading, year, month]);

  // Convert API roster data to shifts map (for calendar - John Doe's shifts only)
  const myShifts: Record<string, RosterEntry[]> = {};
  if (myRosterData) {
    myRosterData.forEach((entry) => {
      const dateKey = entry.date; // Already in YYYY-MM-DD format
      if (!myShifts[dateKey]) {
        myShifts[dateKey] = [];
      }
      myShifts[dateKey].push(entry);
    });
  }

  // Convert ALL roster data to shifts map (for detail view when date is clicked)
  const allShifts: Record<string, RosterEntry[]> = {};
  if (allRosterData) {
    allRosterData.forEach((entry) => {
      const dateKey = entry.date; // Already in YYYY-MM-DD format
      if (!allShifts[dateKey]) {
        allShifts[dateKey] = [];
      }
      allShifts[dateKey].push(entry);
    });
  }

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Use ALL shifts for selected date detail view
  const selectedDayShifts = selectedDate ? allShifts[selectedDate] : null;
  const cellSize = (SCREEN_WIDTH - 32 - 14) / 7;

  const checkExistingRoster = async () => {
    console.log('📊 [ROSTER GEN] Checking for existing roster data...');
    try {
      const { rosterApi } = await import('../../services/api');
      const existing = await rosterApi.list({
        year: generationMonth.getFullYear(),
        month: generationMonth.getMonth() + 1,
      });
      console.log('📊 [ROSTER GEN] Existing roster count:', existing.length);
      return existing.length > 0;
    } catch (error) {
      console.log('⚠️ [ROSTER GEN] Error checking existing roster:', error);
      return false;
    }
  };

  const handleGenerateRoster = async () => {
    console.log('🚀 [ROSTER GEN] Starting roster generation for:', {
      year: generationMonth.getFullYear(),
      month: generationMonth.getMonth() + 1,
      rules: rosterRules
    });

    // Check if roster already exists
    const hasExisting = await checkExistingRoster();
    
    if (hasExisting) {
      Alert.alert(
        '⚠️ Existing Roster Detected',
        `A roster already exists for ${MONTHS[generationMonth.getMonth()]} ${generationMonth.getFullYear()}. Do you want to replace it with a new AI-generated roster?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('📊 [ROSTER GEN] User cancelled generation')
          },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              console.log('📊 [ROSTER GEN] User confirmed replacement');
              performGeneration();
            }
          }
        ]
      );
    } else {
      console.log('📊 [ROSTER GEN] No existing roster found, proceeding with generation');
      performGeneration();
    }
  };

  const performGeneration = async () => {
    setIsGenerating(true);
    // Clear previous generated roster to ensure fresh data
    setGeneratedRoster(null);
    try {
      const { aiApi } = await import('../../services/api');
      console.log('📊 [ROSTER GEN] Calling AI API to generate roster...');
      
      const result = await aiApi.generateRoster(
        generationMonth.getFullYear(),
        generationMonth.getMonth() + 1,
        {
          minRestHours: parseInt(rosterRules.minRestHours),
          maxNightShifts: parseInt(rosterRules.maxNightShifts),
          maxWeeklyHours: parseInt(rosterRules.maxWeeklyHours),
          minStaffPerShift: parseInt(rosterRules.minStaffPerShift),
          maxConsecutiveDays: parseInt(rosterRules.maxConsecutiveDays),
        }
      );
      
      console.log('✅ [ROSTER GEN] Roster generated successfully:', {
        entries: result.roster.length,
        compliance: result.compliance_report
      });

      // Update generated roster state - this will trigger list view to refresh
      setGeneratedRoster(result.roster);
      // Reset preview mode to list view to show the new data
      setPreviewMode('list');
      setRosterPreviewVisible(true);
    } catch (error) {
      console.error('❌ [ROSTER GEN] Error generating roster:', error);
      Alert.alert(
        'Generation Error',
        'Failed to generate roster. Please ensure the backend is running and Claude API key is configured.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmRoster = async () => {
    console.log('💾 [ROSTER GEN] Publishing roster to database...');
    
    if (!generatedRoster || generatedRoster.length === 0) {
      Alert.alert('Error', 'No roster data to publish');
      return;
    }

    setIsPublishing(true);
    try {
      const { rosterApi } = await import('../../services/api');
      
      // Prepare roster entries for saving (remove roster_id as it will be generated by backend)
      const entriesToSave = generatedRoster.map(entry => ({
        date: entry.date,
        doctor_id: entry.doctor_id,
        shift_type: entry.shift_type,
        source: entry.source || 'auto',
        start_time: entry.start_time,
        end_time: entry.end_time
      }));
      
      console.log('💾 [ROSTER GEN] Saving', entriesToSave.length, 'roster entries to database...');
      
      // Save roster entries to backend
      await rosterApi.save(entriesToSave);
      
      console.log('✅ [ROSTER GEN] Roster saved successfully');
      
      // Close the preview modal
      setRosterPreviewVisible(false);
      
      // Switch to calendar tab
      setActiveTab('calendar');
      
      // Navigate to the generated month if different from current view
      const genYear = generationMonth.getFullYear();
      const genMonth = generationMonth.getMonth();
      if (genYear !== year || genMonth !== month) {
        setCurrentDate(new Date(genYear, genMonth, 1));
      }
      
      // Clear generated roster state since it's now saved
      setGeneratedRoster(null);
      
      // Refresh roster data after a short delay to ensure backend has processed
      setTimeout(async () => {
        console.log('🔄 [ROSTER GEN] Refreshing calendar data...');
        await Promise.all([
          refreshRoster(),
          refreshAllRoster()
        ]);
        console.log('✅ [ROSTER GEN] Calendar data refreshed');
      }, 500);
      
      Alert.alert(
        '✅ Roster Published Successfully!', 
        `The roster for ${MONTHS[genMonth]} ${genYear} has been published. ${entriesToSave.length} shifts have been scheduled.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ [ROSTER GEN] Error publishing roster:', error);
      Alert.alert(
        'Error', 
        `Failed to publish roster: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isAdmin && (
        <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={[styles.tab, activeTab === 'calendar' && { backgroundColor: colors.primary }]} onPress={() => setActiveTab('calendar')}>
            <Ionicons name="calendar" size={16} color={activeTab === 'calendar' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'calendar' ? '#fff' : colors.textSecondary }]}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'roster' && { backgroundColor: colors.primary }]} onPress={() => setActiveTab('roster')}>
            <Ionicons name="grid" size={16} color={activeTab === 'roster' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'roster' ? '#fff' : colors.textSecondary }]}>Roster Setup</Text>
          </TouchableOpacity>
        </View>
      )}
      {activeTab === 'calendar' && (
        <>
          {/* Calendar Header */}
          <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Days of Week */}
          <View style={styles.daysRow}>
            {DAYS.map((day) => (
              <View key={day} style={[styles.dayCell, { width: cellSize }]}>
                <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{day}</Text>
              </View>
            ))}
          </View>

          <ScrollView style={styles.calendarScroll} showsVerticalScrollIndicator={false}>
        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            const dateKey = day ? getDateKey(day) : '';
            const dayShifts = day ? myShifts[dateKey] : null; // Show John Doe's shifts in calendar
            const isSelected = dateKey === selectedDate;
            const today = new Date();
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateCell,
                  { 
                    width: cellSize - 4, 
                    height: cellSize - 4,
                    backgroundColor: colors.card, 
                    borderColor: colors.border 
                  },
                  isSelected && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary + '20' },
                  isToday && !isSelected && { borderColor: '#34d399', borderWidth: 2 },
                ]}
                onPress={() => day && setSelectedDate(dateKey)}
                disabled={!day}
              >
                {day && (
                  <>
                    <Text style={[
                      styles.dateNumber,
                      { color: colors.text },
                      isToday && { color: '#34d399', fontWeight: 'bold' },
                      isSelected && { color: colors.primary, fontWeight: 'bold' },
                    ]}>
                      {day}
                    </Text>
                    {dayShifts && dayShifts.length > 0 && (
                      <View style={styles.shiftColorDots}>
                        {dayShifts.map((shift, idx) => (
                          <View 
                            key={idx}
                            style={[
                              styles.shiftColorDot, 
                              { backgroundColor: getShiftColor(shift.shift_type) }
                            ]} 
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Shift Details */}
        {selectedDayShifts && selectedDayShifts.length > 0 ? (
          <View style={[styles.shiftDetails, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.shiftDetailsTitle, { color: colors.text }]}>
              Shifts on {selectedDate}
            </Text>
            {(() => {
              // Group shifts by type and filter duplicates within each shift
              const shiftGroups: Record<string, RosterEntry[]> = {};
              const seenDoctorsByShift = new Map<string, Set<number>>(); // Track seen doctor_ids per shift type
              
              selectedDayShifts.forEach(shift => {
                const type = shift.shift_type.charAt(0).toUpperCase() + shift.shift_type.slice(1);
                
                // Initialize shift type array if needed
                if (!shiftGroups[type]) {
                  shiftGroups[type] = [];
                  seenDoctorsByShift.set(type, new Set());
                }
                
                // Only add if this doctor hasn't been seen for this shift type
                const seenDoctors = seenDoctorsByShift.get(type)!;
                if (!seenDoctors.has(shift.doctor_id)) {
                  seenDoctors.add(shift.doctor_id);
                  shiftGroups[type].push(shift);
                }
              });
              
              // Define shift order: morning, evening, night
              const shiftOrder = ['Morning', 'Evening', 'Night'];
              
              // Render each shift type group in the correct order
              return shiftOrder
                .filter(shiftType => shiftGroups[shiftType] && shiftGroups[shiftType].length > 0)
                .map((shiftType) => {
                  const shifts = shiftGroups[shiftType];
                  const shiftColor = getShiftColor(shiftType);
                  const shiftTime = shiftType === 'Morning' ? '08:00-16:00' : shiftType === 'Evening' ? '16:00-00:00' : shiftType === 'Night' ? '00:00-08:00' : '08:00-16:00';
                
                return (
                  <View key={shiftType} style={[styles.shiftCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.shiftHeader}>
                      <View style={[styles.shiftTypeBadge, { backgroundColor: shiftColor }]}>
                        <Text style={styles.shiftTypeBadgeText}>{shiftType.toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.shiftTime, { color: shiftColor }]}>
                        {shiftTime}
                      </Text>
                    </View>
                    <View style={styles.doctorList}>
                      {shifts.map((shift, idx) => (
                        <View key={`${shift.doctor_id}-${idx}`} style={styles.doctorItem}>
                          <Ionicons name="person" size={14} color={colors.textSecondary} />
                          <Text style={[styles.doctorName, { color: colors.text }]}>
                            {shift.doctor_name || `Doctor ID: ${shift.doctor_id}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        ) : selectedDate ? (
          <View style={[styles.shiftDetails, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.noShiftText, { color: colors.textSecondary }]}>No shifts scheduled for this day</Text>
          </View>
        ) : null}
      </ScrollView>
        </>
      )}

      {activeTab === 'roster' && (
        <ScrollView style={styles.calendarScroll} showsVerticalScrollIndicator={false}>
          {/* <View style={styles.rosterContainer}> */}
            {/* Month Selection Section */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Month to Generate</Text>
              {/* <Text style={[styles.helperText, { color: colors.textSecondary, marginBottom: 12 }]}>
                Use the arrows to navigate or tap a quick option below
              </Text> */}
              <View style={[styles.monthSelector, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TouchableOpacity 
                  onPress={() => setGenerationMonth(new Date(generationMonth.getFullYear(), generationMonth.getMonth() - 1, 1))}
                  style={styles.monthNavButton}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.selectedMonth, { color: colors.text }]}>
                    {MONTHS[generationMonth.getMonth()]} {generationMonth.getFullYear()}
                  </Text>
                  {(() => {
                    const today = new Date();
                    const isCurrentMonth = generationMonth.getMonth() === today.getMonth() && 
                                         generationMonth.getFullYear() === today.getFullYear();
                    const isNextMonth = generationMonth.getMonth() === (today.getMonth() + 1) % 12 && 
                                      (generationMonth.getFullYear() === today.getFullYear() || 
                                       (today.getMonth() === 11 && generationMonth.getFullYear() === today.getFullYear() + 1));
                    
                    if (isCurrentMonth) {
                      return <Text style={[styles.monthLabel, { color: colors.primary }]}>Current Month</Text>;
                    } else if (isNextMonth) {
                      return <Text style={[styles.monthLabel, { color: '#34d399' }]}>Next Month</Text>;
                    }
                    return null;
                  })()}
                </View>
                <TouchableOpacity 
                  onPress={() => setGenerationMonth(new Date(generationMonth.getFullYear(), generationMonth.getMonth() + 1, 1))}
                  style={styles.monthNavButton}
                >
                  <Ionicons name="chevron-forward" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              {/* Quick Month Selection */}
              {/* <View style={styles.quickMonthRow}>
                <TouchableOpacity 
                  style={[styles.quickMonthButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setGenerationMonth(new Date())}
                >
                  <Text style={[styles.quickMonthText, { color: colors.text }]}>This Month</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickMonthButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    const next = new Date();
                    next.setMonth(next.getMonth() + 1);
                    setGenerationMonth(next);
                  }}
                >
                  <Text style={[styles.quickMonthText, { color: colors.text }]}>Next Month</Text>
                </TouchableOpacity>
              </View>
            </View> */}

            {/* Generation Rules Section */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Generation Rules</Text>
              
              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.text }]}>Min Rest Hours</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput 
                    style={[styles.ruleInputSmall, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={rosterRules.minRestHours}
                    onChangeText={(val) => setRosterRules({...rosterRules, minRestHours: val})}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>hours</Text>
                </View>
              </View>

              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.text }]}>Max Night Shifts/Week</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput 
                    style={[styles.ruleInputSmall, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={rosterRules.maxNightShifts}
                    onChangeText={(val) => setRosterRules({...rosterRules, maxNightShifts: val})}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>shifts</Text>
                </View>
              </View>

              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.text }]}>Max Weekly Hours</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput 
                    style={[styles.ruleInputSmall, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={rosterRules.maxWeeklyHours}
                    onChangeText={(val) => setRosterRules({...rosterRules, maxWeeklyHours: val})}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>hours</Text>
                </View>
              </View>

              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.text }]}>Min Staff Per Shift</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput 
                    style={[styles.ruleInputSmall, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={rosterRules.minStaffPerShift}
                    onChangeText={(val) => setRosterRules({...rosterRules, minStaffPerShift: val})}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>staffs</Text>
                </View>
              </View>

              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.text }]}>Max Consecutive Days</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput 
                    style={[styles.ruleInputSmall, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={rosterRules.maxConsecutiveDays}
                    onChangeText={(val) => setRosterRules({...rosterRules, maxConsecutiveDays: val})}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>  days</Text>
                </View>
              </View>
            </View>

            {/* Auto Generation Section */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* <Text style={[styles.sectionTitle, { color: colors.text }]}>Auto Generation</Text> */}
              
              <View style={styles.autoGenRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Auto Generation</Text>
                <Switch 
                  value={autoGenerate.enabled}
                  onValueChange={(val) => setAutoGenerate({...autoGenerate, enabled: val})}
                  trackColor={{ false: colors.border, true: colors.primary + '50' }}
                  thumbColor={autoGenerate.enabled ? colors.primary : colors.textSecondary}
                />
              </View>

              {autoGenerate.enabled && (
                <>
                  <View style={styles.ruleRow}>
                    <Text style={[styles.ruleLabel, { color: colors.text }]}>Day of Week</Text>
                    <TextInput 
                      style={[styles.ruleInputBig, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={autoGenerate.day}
                      onChangeText={(val) => setAutoGenerate({...autoGenerate, day: val})}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.ruleRow}>
                    <Text style={[styles.ruleLabel, { color: colors.text }]}>Time (24h)</Text>
                    <TextInput 
                      style={[styles.ruleInputBig, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={autoGenerate.time}
                      onChangeText={(val) => setAutoGenerate({...autoGenerate, time: val})}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </>
              )}
            </View>

            {/* Generate Button */}
            <TouchableOpacity 
              style={[styles.generateButton, { backgroundColor: colors.primary }]}
              onPress={handleGenerateRoster}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.generateButtonText}>Generate Roster</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Info Section */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Roster generation uses AI to create optimized schedules based on your rules and staff preferences.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Roster Preview Modal */}
      <Modal 
        visible={rosterPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRosterPreviewVisible(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]} onPress={() => setRosterPreviewVisible(false)}>
          <Pressable 
            style={[styles.rosterPreviewModal, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Roster Preview - {MONTHS[generationMonth.getMonth()]} {generationMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => setRosterPreviewVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Preview Mode Toggle */}
            <View style={[styles.previewModeToggle, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.previewModeButton,
                  previewMode === 'list' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setPreviewMode('list')}
              >
                <Text style={[
                  styles.previewModeText,
                  { color: previewMode === 'list' ? '#fff' : colors.text }
                ]}>
                  List View
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.previewModeButton,
                  previewMode === 'calendar' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setPreviewMode('calendar')}
              >
                <Text style={[
                  styles.previewModeText,
                  { color: previewMode === 'calendar' ? '#fff' : colors.text }
                ]}>
                  Calendar View
                </Text>
              </TouchableOpacity>
            </View>

            {previewMode === 'list' ? (
              <ScrollView 
                style={styles.previewContent} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* List View */}
                {generatedRoster && generatedRoster.length > 0 ? (
                  (() => {
                    // Group by date
                    const groupedByDate: Record<string, RosterEntry[]> = {};
                    generatedRoster.forEach(entry => {
                      if (!groupedByDate[entry.date]) {
                        groupedByDate[entry.date] = [];
                      }
                      groupedByDate[entry.date].push(entry);
                    });

                    return Object.entries(groupedByDate).sort().map(([date, entries]) => {
                      // Group by shift type and filter duplicates within each shift
                      const groupedByShift: Record<string, RosterEntry[]> = {};
                      const seenDoctorsByShift = new Map<string, Set<number>>(); // Track seen doctor_ids per shift type
                      
                      entries.forEach(entry => {
                        const shiftType = entry.shift_type.charAt(0).toUpperCase() + entry.shift_type.slice(1);
                        
                        // Initialize shift type array if needed
                        if (!groupedByShift[shiftType]) {
                          groupedByShift[shiftType] = [];
                          seenDoctorsByShift.set(shiftType, new Set());
                        }
                        
                        // Only add if this doctor hasn't been seen for this shift type
                        const seenDoctors = seenDoctorsByShift.get(shiftType)!;
                        if (!seenDoctors.has(entry.doctor_id)) {
                          seenDoctors.add(entry.doctor_id);
                          groupedByShift[shiftType].push(entry);
                        }
                      });

                      return (
                        <View key={date} style={[styles.rosterItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <View style={styles.rosterItemDate}>
                            <Text style={[styles.rosterDate, { color: colors.text }]}>{date}</Text>
                          </View>
                          <View style={styles.rosterItemContent}>
                            {Object.entries(groupedByShift).map(([shiftType, shiftEntries]) => (
                              <View key={shiftType} style={{ marginBottom: 8 }}>
                                <Text style={[styles.rosterShift, { color: getShiftColor(shiftType) }]}>
                                  {shiftType} ({shiftEntries.length} staff)
                                </Text>
                                <View style={styles.rosterStaffPreview}>
                                  {shiftEntries.map((entry, i) => (
                                    <View key={i} style={[styles.staffBadge, { backgroundColor: colors.primary + '20' }]}>
                                      <Text 
                                        style={[styles.staffBadgeText, { color: colors.primary }]}
                                        numberOfLines={2}
                                        ellipsizeMode="tail"
                                      >
                                        {entry.doctor_name || `Doctor ${entry.doctor_id}`}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    });
                  })()
                ) : (
                  <Text style={[styles.noSelectionText, { color: colors.textSecondary }]}>
                    No roster data generated yet
                  </Text>
                )}
              </ScrollView>
            ) : (
              <ScrollView 
                style={styles.previewContent} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* Calendar View */}
                {generatedRoster && generatedRoster.length > 0 ? (
                    (() => {
                      // Create a simple calendar grid
                      const genMonth = generationMonth.getMonth();
                      const genYear = generationMonth.getFullYear();
                      const firstDay = new Date(genYear, genMonth, 1).getDay();
                      const daysInMonth = new Date(genYear, genMonth + 1, 0).getDate();
                      
                      // Group roster by date, filtering duplicates (same doctor_id + shift_type + date)
                      const rosterByDate: Record<string, RosterEntry[]> = {};
                      const seenEntries = new Set<string>(); // Track seen entries to prevent duplicates
                      
                      generatedRoster.forEach(entry => {
                        // Create unique key: date + doctor_id + shift_type
                        const uniqueKey = `${entry.date}-${entry.doctor_id}-${entry.shift_type}`;
                        
                        // Skip if we've already seen this combination
                        if (seenEntries.has(uniqueKey)) {
                          console.log(`⚠️ [ROSTER PREVIEW] Skipping duplicate entry: ${uniqueKey}`);
                          return;
                        }
                        
                        seenEntries.add(uniqueKey);
                        
                        if (!rosterByDate[entry.date]) {
                          rosterByDate[entry.date] = [];
                        }
                        rosterByDate[entry.date].push(entry);
                      });

                      const calendarDays: (number | null)[] = [];
                      for (let i = 0; i < firstDay; i++) calendarDays.push(null);
                      for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

                      return (
                        <>
                          {/* Days of Week */}
                          <View style={styles.daysRow}>
                            {DAYS.map((day) => (
                              <View key={day} style={[styles.dayCell, { width: (SCREEN_WIDTH - 64) / 7 }]}>
                                <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{day}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.calendarGrid}>
                            {calendarDays.map((day, index) => {
                              const dateKey = day ? `${genYear}-${String(genMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                              const dayRoster = day ? rosterByDate[dateKey] : null;
                              const staffCount = dayRoster ? dayRoster.length : 0;
                              const isSelected = dateKey === previewSelectedDate;
                              const today = new Date();
                              const isToday = day === today.getDate() && genMonth === today.getMonth() && genYear === today.getFullYear();

                              return (
                                <TouchableOpacity
                                  key={index}
                                  style={[
                                    styles.dateCell,
                                    { 
                                      width: (SCREEN_WIDTH - 64) / 7 - 4,
                                      height: (SCREEN_WIDTH - 64) / 7 - 4,
                                      backgroundColor: colors.card,
                                      borderColor: colors.border
                                    },
                                    isSelected && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary + '20' },
                                    isToday && !isSelected && { borderColor: '#34d399', borderWidth: 2 },
                                  ]}
                                  onPress={() => day && setPreviewSelectedDate(dateKey)}
                                  disabled={!day}
                                >
                                  {day && (
                                    <>
                                      <Text style={[
                                        styles.dateNumber,
                                        { color: colors.text },
                                        isToday && { color: '#34d399', fontWeight: 'bold' },
                                        isSelected && { color: colors.primary, fontWeight: 'bold' },
                                      ]}>
                                        {day}
                                      </Text>
                                      {dayRoster && dayRoster.length > 0 && (
                                        <View style={styles.shiftColorDots}>
                                          {(() => {
                                            // Get unique shift types for this day to avoid duplicate dots
                                            const uniqueShiftTypes = Array.from(
                                              new Set(dayRoster.map(shift => shift.shift_type))
                                            );
                                            return uniqueShiftTypes.map((shiftType, idx) => (
                                              <View 
                                                key={`${shiftType}-${idx}`}
                                                style={[
                                                  styles.shiftColorDot, 
                                                  { backgroundColor: getShiftColor(shiftType) }
                                                ]} 
                                              />
                                            ));
                                          })()}
                                        </View>
                                      )}
                                    </>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          
                          {/* Selected Date Details */}
                          {previewSelectedDate && rosterByDate[previewSelectedDate] && (
                            <View style={[styles.shiftDetails, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
                              <View style={styles.shiftHeader}>
                                <Text style={[styles.shiftTypeBadge, { color: colors.text }]}>
                                  {previewSelectedDate}
                                </Text>
                              </View>
                              {(() => {
                                // Group by shift type and filter duplicates within each shift
                                const shiftsByType: Record<string, RosterEntry[]> = {};
                                const seenDoctorsByShift = new Map<string, Set<number>>(); // Track seen doctor_ids per shift type
                                
                                rosterByDate[previewSelectedDate].forEach(entry => {
                                  const shiftType = entry.shift_type.toLowerCase();
                                  
                                  // Initialize shift type array if needed
                                  if (!shiftsByType[shiftType]) {
                                    shiftsByType[shiftType] = [];
                                    seenDoctorsByShift.set(shiftType, new Set());
                                  }
                                  
                                  // Only add if this doctor hasn't been seen for this shift type
                                  const seenDoctors = seenDoctorsByShift.get(shiftType)!;
                                  if (!seenDoctors.has(entry.doctor_id)) {
                                    seenDoctors.add(entry.doctor_id);
                                    shiftsByType[shiftType].push(entry);
                                  }
                                });
                                
                                // Define shift order: morning, evening, night
                                const shiftOrder = ['morning', 'evening', 'night'];
                                
                                // Render shifts grouped by type in the correct order
                                return shiftOrder
                                  .filter(shiftType => shiftsByType[shiftType] && shiftsByType[shiftType].length > 0)
                                  .map((shiftType) => {
                                    const entries = shiftsByType[shiftType];
                                    return (
                                      <View key={shiftType} style={{ marginBottom: 12 }}>
                                        <Text style={[styles.shiftType, { color: getShiftColor(shiftType), marginBottom: 8, fontWeight: '600' }]}>
                                          {shiftType.charAt(0).toUpperCase() + shiftType.slice(1)} ({entries.length} staff)
                                        </Text>
                                        {entries.map((entry, idx) => (
                                          <View key={`${entry.doctor_id}-${idx}`} style={[styles.shiftRow, { borderTopColor: colors.border }]}>
                                            <View style={styles.shiftInfo}>
                                              <Text style={[styles.shiftDoctor, { color: colors.text }]}>
                                                {entry.doctor_name || `Doctor ${entry.doctor_id}`}
                                              </Text>
                                            </View>
                                          </View>
                                        ))}
                                      </View>
                                    );
                                  });
                              })()}
                            </View>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <View style={{ padding: 16 }}>
                      <Text style={[styles.noSelectionText, { color: colors.textSecondary }]}>
                        No roster data generated yet
                      </Text>
                    </View>
                  )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setRosterPreviewVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Review Again</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  { backgroundColor: colors.primary },
                  isPublishing && { opacity: 0.6 }
                ]}
                onPress={handleConfirmRoster}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Publishing...</Text>
                  </View>
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Publish Roster</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginTop: 8,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  daysRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayCell: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarScroll: {
    flex: 1,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  dateCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    margin: 2,
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  shiftIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  shiftColorDots: {
    position: 'absolute',
    bottom: 3,
    flexDirection: 'row',
    gap: 2,
  },
  shiftColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
  },
  shiftDetails: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  shiftTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  shiftInfo: {
    flex: 1,
  },
  shiftType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  shiftDoctor: {
    fontSize: 13,
  },
  shiftTypeBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  shiftTime: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '600',
  },
  doctorList: {
    marginTop: 8,
    gap: 6,
  },
  doctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  doctorName: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  staffSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  staffTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  staffList: {
    gap: 10,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  staffAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  staffRole: {
    fontSize: 13,
  },
  noSelection: {
    margin: 16,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  noSelectionText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rosterContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  ruleLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  ruleInputSmall: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    width: 60,
    textAlign: 'center',
  },
  ruleInputBig: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    width: 100,
    textAlign: 'center',
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  monthNavButton: {
    padding: 8,
  },
  selectedMonth: {
    fontSize: 16,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  quickMonthRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickMonthButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickMonthText: {
    fontSize: 13,
    fontWeight: '500',
  },
  previewModeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    alignSelf: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  previewModeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  previewModeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  staffCountBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  ruleItem: {
    gap: 8,
  },
  ruleInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  autoGenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  rosterPreviewModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rosterItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rosterItemDate: {
    minWidth: 80,
    maxWidth: 80,
    marginRight: 12,
  },
  rosterItemContent: {
    flex: 1,
    minWidth: 0, // Prevent overflow
  },
  rosterDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  rosterShift: {
    fontSize: 12,
    fontWeight: '500',
  },
  rosterStaffPreview: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    width: '100%',
  },
  staffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 6,
    maxWidth: '48%', // Ensure badges wrap to new rows
    minHeight: 24,
  },
  staffBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'left',
    lineHeight: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shiftDetailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  shiftCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  shiftNotes: {
    fontSize: 12,
    marginTop: 4,
  },
  noShiftText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});

