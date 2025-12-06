import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useThemeStore } from '../stores/themeStore';

// Mock notifications
const notifications = [
  {
    id: '1',
    type: 'swap',
    title: 'Swap Request Approved',
    message: 'Your shift swap request with Jane Smith has been approved.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'leave',
    title: 'Leave Request Pending',
    message: 'Your annual leave request is pending supervisor approval.',
    time: '5 hours ago',
    read: false,
  },
  {
    id: '3',
    type: 'schedule',
    title: 'Schedule Updated',
    message: 'Your schedule for next week has been published.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '4',
    type: 'reminder',
    title: 'Shift Reminder',
    message: 'You have a Morning shift tomorrow at 07:00.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'Welcome to AutoShift',
    message: 'Thank you for joining! Explore your schedule and make requests.',
    time: '3 days ago',
    read: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'swap': return 'swap-horizontal';
    case 'leave': return 'airplane';
    case 'schedule': return 'calendar';
    case 'reminder': return 'alarm';
    case 'system': return 'information-circle';
    default: return 'notifications';
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'swap': return '#3b82f6';
    case 'leave': return '#f59e0b';
    case 'schedule': return '#10b981';
    case 'reminder': return '#ef4444';
    case 'system': return '#8b5cf6';
    default: return '#6b7280';
  }
};

export default function NotificationsScreen() {
  const { colors } = useThemeStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.tabBar },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Unread Section */}
        {notifications.filter(n => !n.read).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>New</Text>
            {notifications.filter(n => !n.read).map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  !notification.read && { borderLeftColor: colors.primary, borderLeftWidth: 3 },
                ]}
              >
                <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(notification.type) + '20' }]}>
                  <Ionicons 
                    name={getNotificationIcon(notification.type) as any} 
                    size={22} 
                    color={getNotificationColor(notification.type)} 
                  />
                </View>
                <View style={styles.contentContainer}>
                  <Text style={[styles.notificationTitle, { color: colors.text }]}>
                    {notification.title}
                  </Text>
                  <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                    {notification.time}
                  </Text>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Earlier Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Earlier</Text>
        {notifications.filter(n => n.read).map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(notification.type) + '20' }]}>
              <Ionicons 
                name={getNotificationIcon(notification.type) as any} 
                size={22} 
                color={getNotificationColor(notification.type)} 
              />
            </View>
            <View style={styles.contentContainer}>
              <Text style={[styles.notificationTitle, { color: colors.text }]}>
                {notification.title}
              </Text>
              <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                {notification.message}
              </Text>
              <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                {notification.time}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Clear All Button */}
        <TouchableOpacity style={[styles.clearButton, { borderColor: colors.border }]}>
          <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>
            Clear All Notifications
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});



