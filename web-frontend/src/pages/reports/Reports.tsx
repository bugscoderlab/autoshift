import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Clock, Download } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
          <p className="text-white/60">View workforce metrics and insights</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Avg Hours/Week', value: '38.5', change: '+2.3%', icon: Clock },
          { label: 'Overtime Hours', value: '120', change: '-5%', icon: TrendingUp },
          { label: 'Staff Utilization', value: '92%', change: '+3%', icon: Users },
          { label: 'Compliance Rate', value: '98%', change: '+1%', icon: BarChart3 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-5 h-5 text-primary-400" />
              <span className="text-sm text-emerald-400">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-white/60">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Hours Worked by Employee</h2>
        <div className="h-64 flex items-center justify-center text-white/40">
          Chart visualization would go here
        </div>
      </div>
    </div>
  );
}

