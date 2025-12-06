import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, MoreVertical, Mail, Phone } from 'lucide-react';
import clsx from 'clsx';

const mockStaff = [
  { id: 1, name: 'Dr. John Doe', role: 'Doctor', type: 'Fixed', email: 'john@hospital.com', phone: '+1234567890', status: 'active' },
  { id: 2, name: 'Jane Smith', role: 'Nurse', type: 'Fixed', email: 'jane@hospital.com', phone: '+1234567891', status: 'active' },
  { id: 3, name: 'Bob Miller', role: 'Houseman', type: 'Contract', email: 'bob@hospital.com', phone: '+1234567892', status: 'active' },
  { id: 4, name: 'Alice King', role: 'Nurse', type: 'Fixed', email: 'alice@hospital.com', phone: '+1234567893', status: 'on_leave' },
  { id: 5, name: 'Charlie Brown', role: 'Doctor', type: 'Probation', email: 'charlie@hospital.com', phone: '+1234567894', status: 'active' },
];

export default function StaffList() {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filteredStaff = mockStaff.filter((staff) => {
    const matchesSearch = staff.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || staff.role.toLowerCase() === filterRole.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Staff Management</h1>
          <p className="text-white/60">Manage your team members and their details</p>
        </div>

        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex gap-2">
            {['all', 'Doctor', 'Nurse', 'Houseman'].map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  filterRole === role
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                )}
              >
                {role === 'all' ? 'All' : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((staff, index) => (
          <motion.div
            key={staff.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-hover"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg">
                  {staff.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{staff.name}</h3>
                  <p className="text-sm text-white/60">{staff.role}</p>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <MoreVertical className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-white/40" />
                <span className="text-white/70">{staff.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-white/40" />
                <span className="text-white/70">{staff.phone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className={clsx(
                'status-badge',
                staff.status === 'active' ? 'status-success' : 'status-warning'
              )}>
                {staff.status === 'active' ? 'Active' : 'On Leave'}
              </span>
              <span className="text-xs text-white/50">{staff.type}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

