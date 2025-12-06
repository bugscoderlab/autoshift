import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Plane,
  ArrowLeftRight,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  Library,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import clsx from 'clsx';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/roster', icon: Calendar, label: 'Roster' },
  { path: '/staff', icon: Users, label: 'Staff' },
  { path: '/leave', icon: Plane, label: 'Leave' },
  { path: '/swaps', icon: ArrowLeftRight, label: 'Swaps' },
  { path: '/resources', icon: Library, label: 'Resources' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/ai', icon: Sparkles, label: 'AI Assistant' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount] = useState(3);
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  // Apply theme on mount
  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 backdrop-blur-2xl border-r transition-all duration-300',
          'dark:bg-white/5 dark:border-white/10 bg-white border-slate-200',
          'transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b dark:border-white/10 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">AutoShift</h1>
                <p className="text-xs dark:text-white/50 text-slate-500">Roster Planning</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary-600/20 text-primary-500 dark:text-primary-300 border-l-4 border-primary-500'
                      : 'dark:text-white/70 text-slate-600 dark:hover:bg-white/10 hover:bg-slate-100 dark:hover:text-white hover:text-slate-900'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t dark:border-white/10 border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                {user?.employee?.firstName?.[0] || user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium dark:text-white text-slate-900 truncate">
                  {user?.employee
                    ? `${user.employee.firstName} ${user.employee.lastName}`
                    : user?.email}
                </p>
                <p className="text-xs dark:text-white/50 text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 backdrop-blur-xl border-b dark:bg-primary-950/80 dark:border-white/10 bg-white/80 border-slate-200">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 dark:text-white/70 text-slate-600 dark:hover:text-white hover:text-slate-900"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg dark:text-white/70 text-slate-600 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/10 hover:bg-slate-100 transition-colors"
                title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notifications */}
              <button 
                onClick={() => navigate('/notifications')}
                className="relative p-2 dark:text-white/70 text-slate-600 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/10 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-rose-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* User Avatar */}
              <button 
                onClick={() => navigate('/settings')}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm hover:ring-2 hover:ring-primary-400 transition-all"
              >
                {user?.employee?.firstName?.[0] || user?.email?.[0]?.toUpperCase()}
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
