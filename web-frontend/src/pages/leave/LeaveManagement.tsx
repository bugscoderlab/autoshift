import { motion } from 'framer-motion';
import { Calendar, Check, X, Clock } from 'lucide-react';
import clsx from 'clsx';

const mockRequests = [
  { id: 1, employee: 'John Doe', type: 'Annual Leave', start: '2024-02-01', end: '2024-02-03', days: 3, status: 'pending', reason: 'Family vacation' },
  { id: 2, employee: 'Jane Smith', type: 'Medical Leave', start: '2024-01-25', end: '2024-01-26', days: 2, status: 'approved', reason: 'Doctor appointment' },
  { id: 3, employee: 'Bob Miller', type: 'Emergency Leave', start: '2024-01-28', end: '2024-01-28', days: 1, status: 'pending', reason: 'Family emergency' },
  { id: 4, employee: 'Alice King', type: 'Annual Leave', start: '2024-02-10', end: '2024-02-15', days: 5, status: 'rejected', reason: 'Travel plans' },
];

export default function LeaveManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Leave Management</h1>
        <p className="text-white/60">Review and manage leave requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Requests', value: '4', icon: Clock, color: 'from-amber-500 to-orange-500' },
          { label: 'Approved This Month', value: '12', icon: Check, color: 'from-emerald-500 to-teal-500' },
          { label: 'Rejected', value: '2', icon: X, color: 'from-rose-500 to-pink-500' },
          { label: 'On Leave Today', value: '5', icon: Calendar, color: 'from-blue-500 to-cyan-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/60">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Requests Table */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Leave Requests</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-white/10">
                <th className="pb-4 text-sm font-medium text-white/50">Employee</th>
                <th className="pb-4 text-sm font-medium text-white/50">Type</th>
                <th className="pb-4 text-sm font-medium text-white/50">Dates</th>
                <th className="pb-4 text-sm font-medium text-white/50">Days</th>
                <th className="pb-4 text-sm font-medium text-white/50">Status</th>
                <th className="pb-4 text-sm font-medium text-white/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockRequests.map((request, index) => (
                <motion.tr
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-300 font-medium">
                        {request.employee.charAt(0)}
                      </div>
                      <span className="text-white">{request.employee}</span>
                    </div>
                  </td>
                  <td className="py-4 text-white/70">{request.type}</td>
                  <td className="py-4 text-white/70">
                    {request.start} → {request.end}
                  </td>
                  <td className="py-4 text-white/70">{request.days}</td>
                  <td className="py-4">
                    <span className={clsx(
                      'status-badge',
                      request.status === 'approved' ? 'status-success' :
                      request.status === 'rejected' ? 'status-error' :
                      'status-warning'
                    )}>
                      {request.status}
                    </span>
                  </td>
                  <td className="py-4">
                    {request.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

