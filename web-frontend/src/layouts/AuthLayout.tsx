import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-8">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4">AutoShift</h1>
            <p className="text-xl text-white/70 mb-8">Intelligent Roster Planning</p>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {[
                { icon: '🏥', text: 'Healthcare' },
                { icon: '🍳', text: 'Restaurants' },
                { icon: '🏪', text: 'Retail' },
                { icon: '🏭', text: 'Manufacturing' },
              ].map((item, i) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur rounded-xl"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-white/90">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}

