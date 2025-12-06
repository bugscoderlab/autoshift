import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import RosterCalendar from './pages/roster/RosterCalendar';
import StaffList from './pages/staff/StaffList';
import LeaveManagement from './pages/leave/LeaveManagement';
import SwapRequests from './pages/swaps/SwapRequests';
import Reports from './pages/reports/Reports';
import AIAssistant from './pages/ai/AIAssistant';
import Settings from './pages/Settings';
import Resources from './pages/resources/Resources';
import Notifications from './pages/notifications/Notifications';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/roster" element={<RosterCalendar />} />
        <Route path="/staff" element={<StaffList />} />
        <Route path="/leave" element={<LeaveManagement />} />
        <Route path="/swaps" element={<SwapRequests />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/ai" element={<AIAssistant />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
