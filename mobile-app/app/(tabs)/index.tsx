import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useDoctor, useRoster, useLeave } from '../../services/dataHooks';
import { RosterEntry } from '../../services/api';

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
  const { data: leaves, loading: leaveLoading } = useLeave({ doctor_id: currentDoctorId });
  
  // Calculate leave days left (assuming 14 days annual leave)
  const annualLeaveDays = 14;
  const usedLeaveDays = leaves?.filter(l => l.status === 'approved').reduce((sum, leave) => {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return sum + days;
  }, 0) || 0;
  const leaveDaysLeft = annualLeaveDays - usedLeaveDays;

  useEffect(() => {
    if (leaves) {
      console.log('🏠 [HOME] Leave data loaded from database:', {
        total_leaves: leaves.length,
        used_days: usedLeaveDays,
        days_left: leaveDaysLeft,
        source: 'DATABASE'
      });
    } else if (!leaveLoading) {
      console.log('⚠️ [HOME] No leave data found');
    }
  }, [leaves, leaveLoading, usedLeaveDays, leaveDaysLeft]);

  // Get this week's shifts
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const weekShifts = monthRoster?.filter(shift => {
    const shiftDate = new Date(shift.date);
    return shiftDate >= startOfWeek && shiftDate <= endOfWeek && shiftDate >= today;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

  useEffect(() => {
    console.log('🏠 [HOME] This week\'s shifts filtered:', {
      total_shifts: weekShifts.length,
      dates: weekShifts.map(s => s.date),
      source: weekShifts.length > 0 ? 'DATABASE' : 'NONE'
    });
  }, [weekShifts]);

  // Find next shift
  const upcomingShifts = monthRoster?.filter(shift => {
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
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={[styles.greetingSmall, { color: colors.textSecondary }]}>Good morning,</Text>
        <Text style={[styles.greetingLarge, { color: colors.text }]}>{firstName}!</Text>
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
          <Text style={[styles.statNumber, { color: colors.text }]}>{monthRoster?.length || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shifts This Month</Text>
        </View>
      </View>

      {/* Upcoming */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>This Week</Text>
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
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>No shifts scheduled this week</Text>
        </View>
      )}
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
  greeting: {
    marginBottom: 24,
  },
  greetingSmall: {
    fontSize: 18,
  },
  greetingLarge: {
    fontSize: 28,
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
    marginBottom: 12,
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
});
