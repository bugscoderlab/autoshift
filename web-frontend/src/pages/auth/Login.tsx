import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

type DemoRole = 'ADMIN' | 'EMPLOYEE';

// Demo users for testing without backend
const DEMO_USERS: Record<DemoRole, { id: string; email: string; role: string; employee: { id: string; firstName: string; lastName: string; orgId: string } }> = {
  ADMIN: {
    id: 'demo-admin-001',
    email: 'admin@autoshift.demo',
    role: 'ADMIN',
    employee: {
      id: 'emp-admin-001',
      firstName: 'Demo',
      lastName: 'Admin',
      orgId: 'org-001',
    },
  },
  EMPLOYEE: {
    id: 'demo-employee-001',
    email: 'employee@autoshift.demo',
    role: 'EMPLOYEE',
    employee: {
      id: 'emp-001',
      firstName: 'John',
      lastName: 'Doe',
      orgId: 'org-001',
    },
  },
};

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<DemoRole | null>(null);
  const { setDemoUser } = useAuthStore();
  const navigate = useNavigate();

  const handleDemoLogin = (role: DemoRole) => {
    setSelectedRole(role);
    
    // Set demo user in store
    const demoUser = DEMO_USERS[role];
    setDemoUser(demoUser);
    
    toast.success(`Logged in as ${role === 'ADMIN' ? 'Administrator' : 'Employee'}!`);
    navigate('/');
  };

  return (
    <div className="space-y-8">
      {/* Mobile logo */}
      <div className="lg:hidden text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold gradient-text">AutoShift</h1>
      </div>

      <div className="text-center lg:text-left">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome to AutoShift</h2>
        <p className="text-white/60">Select a role to continue with demo mode</p>
      </div>

      {/* Demo Mode Selection */}
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <p className="text-amber-300 text-sm text-center">
            🎮 Demo Mode - No authentication required
          </p>
        </div>

        <p className="text-white/70 text-center mb-4">Choose your role:</p>

        <div className="grid grid-cols-1 gap-4">
          {/* Admin Option */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleDemoLogin('ADMIN')}
            className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
              selectedRole === 'ADMIN'
                ? 'border-primary-500 bg-primary-500/20'
                : 'border-white/10 bg-white/5 hover:border-primary-500/50 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-semibold text-white">Administrator</h3>
                <p className="text-white/60 text-sm">
                  Full access: Manage roster, approve requests, view reports
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Roster Management', 'Staff Management', 'Reports', 'AI Tools'].map((feature) => (
                <span key={feature} className="px-2 py-1 bg-primary-500/20 text-primary-300 text-xs rounded-full">
                  {feature}
                </span>
              ))}
            </div>
          </motion.button>

          {/* Employee Option */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleDemoLogin('EMPLOYEE')}
            className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
              selectedRole === 'EMPLOYEE'
                ? 'border-accent-500 bg-accent-500/20'
                : 'border-white/10 bg-white/5 hover:border-accent-500/50 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-500 to-teal-500 flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-semibold text-white">Employee</h3>
                <p className="text-white/60 text-sm">
                  View schedule, request leave & swaps, access AI chat
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['View Schedule', 'Request Leave', 'Swap Shifts', 'AI Assistant'].map((feature) => (
                <span key={feature} className="px-2 py-1 bg-accent-500/20 text-accent-300 text-xs rounded-full">
                  {feature}
                </span>
              ))}
            </div>
          </motion.button>
        </div>
      </div>

      <p className="text-center text-sm text-white/40 mt-8">
        This is a demo version. In production, real authentication would be required.
      </p>
    </div>
  );
}
