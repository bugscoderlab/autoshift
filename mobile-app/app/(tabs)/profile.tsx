import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';

export default function ProfileScreen() {
  const { user, logout, isAdmin } = useAuthStore();
  const { colors, mode, toggleTheme } = useThemeStore();
  const router = useRouter();
  
  const firstName = user?.employee?.firstName || 'User';
  const lastName = user?.employee?.lastName || '';
  const email = user?.email || 'user@autoshift.demo';
  const role = user?.role || 'EMPLOYEE';

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', route: null },
    { icon: 'notifications-outline', label: 'Notifications', route: null },
    { icon: 'lock-closed-outline', label: 'Privacy & Security', route: null },
    { icon: 'help-circle-outline', label: 'Help & Support', route: null },
    { icon: 'information-circle-outline', label: 'About', route: null },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{firstName[0]}{lastName[0]}</Text>
          </View>
          {isAdmin() && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
            </View>
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{firstName} {lastName}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
        <View style={[styles.roleBadge, { 
          backgroundColor: role === 'ADMIN' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)' 
        }]}>
          <Text style={[styles.roleText, { 
            color: role === 'ADMIN' ? '#a78bfa' : '#34d399' 
          }]}>
            {role === 'ADMIN' ? 'Administrator' : 'Employee'}
          </Text>
        </View>
      </View>

      {/* Theme Toggle */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.themeRow}>
          <View style={styles.themeLeft}>
            <Ionicons 
              name={mode === 'dark' ? 'moon' : 'sunny'} 
              size={24} 
              color={mode === 'dark' ? '#fbbf24' : '#f59e0b'} 
            />
            <Text style={[styles.themeLabel, { color: colors.text }]}>
              {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: '#e2e8f0', true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Menu Items */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={item.label}
            style={[
              styles.menuItem,
              index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
            ]}
          >
            <Ionicons name={item.icon as any} size={22} color={colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textSecondary }]}>
        AutoShift v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8b5cf6',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e1b4b',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 24,
  },
});
