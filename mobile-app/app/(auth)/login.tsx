import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';

type DemoRole = 'ADMIN' | 'DOCTOR_PERMANENT' | 'DOCTOR_FLEXIBLE' | 'HOUSEMAN';

const DEMO_USERS: Record<DemoRole, { id: string; email: string; role: string; employee: { id: string; firstName: string; lastName: string; orgId: string; type: string }; doctor_id?: number }> = {
  ADMIN: {
    id: 'demo-admin-001',
    email: 'admin@autoshift.demo',
    role: 'ADMIN',
    employee: { id: 'emp-admin-001', firstName: 'Dr. Admin', lastName: 'User', orgId: 'org-001', type: 'admin' },
    doctor_id: 1, // Dr. John Smith from backend
  },
  DOCTOR_PERMANENT: {
    id: 'demo-doctor-perm-001',
    email: 'doctor.perm@autoshift.demo',
    role: 'EMPLOYEE',
    employee: { id: 'emp-perm-001', firstName: 'Dr. John', lastName: 'Smith', orgId: 'org-001', type: 'permanent' },
  },
  DOCTOR_FLEXIBLE: {
    id: 'demo-doctor-flex-001',
    email: 'doctor.flex@autoshift.demo',
    role: 'EMPLOYEE',
    employee: { id: 'emp-flex-001', firstName: 'Dr. Sarah', lastName: 'Lee', orgId: 'org-001', type: 'flexible' },
  },
  HOUSEMAN: {
    id: 'demo-houseman-001',
    email: 'houseman@autoshift.demo',
    role: 'EMPLOYEE',
    employee: { id: 'emp-hm-001', firstName: 'Dr. Alex', lastName: 'Wong', orgId: 'org-001', type: 'houseman' },
  },
};

const ROLES = [
  { key: 'ADMIN' as DemoRole, name: 'Administrator', desc: 'Full access to all features', icon: 'shield-checkmark', color: '#8b5cf6', features: ['Manage Roster', 'Approve Requests', 'Generate Schedules'] },
  { key: 'DOCTOR_PERMANENT' as DemoRole, name: 'Doctor (Permanent)', desc: 'Full-time staff member', icon: 'medical', color: '#6366f1', features: ['View Schedule', 'Swap Shifts', 'Request Leave'] },
  { key: 'DOCTOR_FLEXIBLE' as DemoRole, name: 'Doctor (Flexible)', desc: 'Locum / On-call staff', icon: 'time', color: '#10b981', features: ['View Schedule', 'Accept Shifts', 'Flexible Hours'] },
  { key: 'HOUSEMAN' as DemoRole, name: 'Houseman', desc: 'Medical trainee', icon: 'school', color: '#f59e0b', features: ['View Schedule', 'Request Leave', 'Training Mode'] },
];

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<DemoRole | null>(null);
  const { setDemoUser } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();

  const handleDemoLogin = (role: DemoRole) => {
    setSelectedRole(role);
    setDemoUser(DEMO_USERS[role]);
    router.replace('/(tabs)');
  };

  const isLight = mode === 'light';

  return (
    <LinearGradient colors={isLight ? ['#f8fafc', '#e2e8f0', '#f1f5f9'] : ['#0f0c29', '#1e1b4b', '#24243e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.themeToggle, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }]} onPress={toggleTheme}>
          <Ionicons name={isLight ? 'moon' : 'sunny'} size={20} color={isLight ? '#64748b' : '#fcd34d'} />
        </TouchableOpacity>

        <View style={styles.logoSection}>
          <View style={[styles.logoIcon, { backgroundColor: isLight ? '#6366f1' + '20' : 'rgba(167, 139, 250, 0.3)' }]}>
            <Ionicons name="calendar" size={40} color={isLight ? '#6366f1' : '#a78bfa'} />
          </View>
          <Text style={[styles.logoText, { color: isLight ? '#1e293b' : 'white' }]}>AutoShift</Text>
          <Text style={[styles.logoSubtext, { color: isLight ? '#64748b' : 'rgba(255,255,255,0.6)' }]}>Roster Planning System</Text>
        </View>

        <View style={[styles.demoBanner, { backgroundColor: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.1)', borderColor: isLight ? '#fcd34d' : 'rgba(245, 158, 11, 0.3)' }]}>
          <Ionicons name="game-controller" size={18} color="#f59e0b" />
          <Text style={[styles.demoBannerText, { color: isLight ? '#92400e' : '#fcd34d' }]}>Demo Mode - Select a role to continue</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: isLight ? '#374151' : 'rgba(255,255,255,0.8)' }]}>Choose your role</Text>

        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.key}
            onPress={() => handleDemoLogin(role.key)}
            style={[styles.roleCard, { backgroundColor: isLight ? '#ffffff' : 'rgba(255,255,255,0.05)', borderColor: selectedRole === role.key ? role.color : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'), borderWidth: selectedRole === role.key ? 2 : 1 }]}
          >
            <View style={styles.roleHeader}>
              <View style={[styles.roleIconContainer, { backgroundColor: role.color + '20' }]}>
                <Ionicons name={role.icon as any} size={26} color={role.color} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={[styles.roleName, { color: isLight ? '#1e293b' : 'white' }]}>{role.name}</Text>
                <Text style={[styles.roleDesc, { color: isLight ? '#64748b' : 'rgba(255,255,255,0.6)' }]}>{role.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={isLight ? '#94a3b8' : 'rgba(255,255,255,0.4)'} />
            </View>
            <View style={styles.roleFeatures}>
              {role.features.map((f) => (
                <View key={f} style={[styles.featureBadge, { backgroundColor: role.color + '15' }]}>
                  <Text style={[styles.featureText, { color: role.color }]}>{f}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        <Text style={[styles.footerText, { color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.4)' }]}>Demo version for testing</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60 },
  themeToggle: { position: 'absolute', top: 50, right: 24, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  logoSection: { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  logoIcon: { width: 72, height: 72, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoText: { fontSize: 26, fontWeight: 'bold' },
  logoSubtext: { marginTop: 4, fontSize: 13 },
  demoBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 20, gap: 8 },
  demoBannerText: { fontSize: 13, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 14, textAlign: 'center' },
  roleCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  roleHeader: { flexDirection: 'row', alignItems: 'center' },
  roleIconContainer: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 15, fontWeight: '600' },
  roleDesc: { fontSize: 12, marginTop: 2 },
  roleFeatures: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 6 },
  featureBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  featureText: { fontSize: 10, fontWeight: '500' },
  footerText: { textAlign: 'center', fontSize: 11, marginTop: 20, marginBottom: 16 },
});
