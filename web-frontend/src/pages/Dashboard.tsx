import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  Plane,
  ArrowLeftRight,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react';

const stats = [
  { label: 'Total Staff', value: '48', icon: Users, color: 'from-blue-500 to-cyan-500' },
  { label: 'Shifts Today', value: '12', icon: Calendar, color: 'from-purple-500 to-pink-500' },
  { label: 'On Leave', value: '5', icon: Plane, color: 'from-amber-500 to-orange-500' },
  { label: 'Pending Swaps', value: '3', icon: ArrowLeftRight, color: 'from-emerald-500 to-teal-500' },
];

const alerts = [
  { type: 'warning', message: '2 understaffed shifts tomorrow', time: '5 min ago' },
  { type: 'info', message: 'New swap request from Dr. Sarah', time: '1 hour ago' },
  { type: 'success', message: 'February roster published', time: '2 hours ago' },
];

const recentActivity = [
  { action: 'Leave approved', user: 'John Doe', time: '10 min ago' },
  { action: 'Shift swap completed', user: 'Jane Smith', time: '30 min ago' },
  { action: 'New employee added', user: 'Admin', time: '1 hour ago' },
  { action: 'Roster generated', user: 'AI System', time: '2 hours ago' },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/60">Welcome back! Here's your roster overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-hover"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-sm text-white/60">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Alerts</h2>
            <span className="text-sm text-white/50">View all</span>
          </div>
          
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-white/5 rounded-xl"
              >
                <div className={`p-2 rounded-lg ${
                  alert.type === 'warning' ? 'bg-amber-500/20' :
                  alert.type === 'info' ? 'bg-blue-500/20' :
                  'bg-emerald-500/20'
                }`}>
                  {alert.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : alert.type === 'info' ? (
                    <Clock className="w-5 h-5 text-blue-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white">{alert.message}</p>
                  <p className="text-sm text-white/50">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
          
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary-400" />
                <div className="flex-1">
                  <p className="text-white text-sm">{activity.action}</p>
                  <p className="text-xs text-white/50">
                    {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card"
      >
        <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Generate Roster', icon: Calendar, color: 'from-primary-500 to-purple-500' },
            { label: 'Add Employee', icon: Users, color: 'from-emerald-500 to-teal-500' },
            { label: 'Approve Leave', icon: Plane, color: 'from-amber-500 to-orange-500' },
            { label: 'View Reports', icon: TrendingUp, color: 'from-rose-500 to-pink-500' },
          ].map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color}`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm text-white/80">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

