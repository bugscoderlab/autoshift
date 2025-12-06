import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Plus, Check, X, Clock, User, Calendar, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';

// Mock data for user's shifts
const myShifts = [
  { id: '1', date: '2024-01-15', day: 'Mon', type: 'Morning', time: '07:00-15:00', department: 'Emergency' },
  { id: '2', date: '2024-01-17', day: 'Wed', type: 'Evening', time: '15:00-23:00', department: 'Ward A' },
  { id: '3', date: '2024-01-19', day: 'Fri', type: 'Morning', time: '07:00-15:00', department: 'ICU' },
  { id: '4', date: '2024-01-22', day: 'Mon', type: 'Night', time: '23:00-07:00', department: 'Emergency' },
];

// Mock data for available shifts to swap with
const availableShifts = [
  { id: 'a1', employeeId: 'emp-002', employeeName: 'Jane Smith', date: '2024-01-16', day: 'Tue', type: 'Morning', time: '07:00-15:00', department: 'Ward B' },
  { id: 'a2', employeeId: 'emp-003', employeeName: 'Bob Johnson', date: '2024-01-18', day: 'Thu', type: 'Evening', time: '15:00-23:00', department: 'ICU' },
  { id: 'a3', employeeId: 'emp-004', employeeName: 'Alice Brown', date: '2024-01-20', day: 'Sat', type: 'Morning', time: '07:00-15:00', department: 'Emergency' },
  { id: 'a4', employeeId: 'emp-005', employeeName: 'Charlie Davis', date: '2024-01-21', day: 'Sun', type: 'Evening', time: '15:00-23:00', department: 'Ward A' },
];

// Mock swap requests
const initialSwapRequests = [
  { 
    id: 'sr1', 
    status: 'pending',
    requesterId: 'emp-001',
    requesterName: 'John Doe',
    myShift: { date: '2024-01-15', type: 'Morning', time: '07:00-15:00', department: 'Emergency' },
    theirShift: { date: '2024-01-16', type: 'Morning', time: '07:00-15:00', department: 'Ward B', employeeName: 'Jane Smith' },
    createdAt: '2024-01-10',
  },
  { 
    id: 'sr2', 
    status: 'approved',
    requesterId: 'emp-002',
    requesterName: 'Jane Smith',
    myShift: { date: '2024-01-20', type: 'Evening', time: '15:00-23:00', department: 'Ward B' },
    theirShift: { date: '2024-01-22', type: 'Night', time: '23:00-07:00', department: 'Emergency', employeeName: 'John Doe' },
    createdAt: '2024-01-08',
  },
];

interface SwapRequest {
  id: string;
  status: string;
  requesterId: string;
  requesterName: string;
  myShift: {
    date: string;
    type: string;
    time: string;
    department: string;
  };
  theirShift: {
    date: string;
    type: string;
    time: string;
    department: string;
    employeeName: string;
  };
  createdAt: string;
}

export default function SwapRequests() {
  const { isAdmin, user } = useAuthStore();
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>(initialSwapRequests);
  const [showModal, setShowModal] = useState(false);
  const [selectedMyShift, setSelectedMyShift] = useState<typeof myShifts[0] | null>(null);
  const [selectedTheirShift, setSelectedTheirShift] = useState<typeof availableShifts[0] | null>(null);
  const [reason, setReason] = useState('');

  const handleCreateSwap = () => {
    if (selectedMyShift && selectedTheirShift) {
      const newRequest: SwapRequest = {
        id: `sr${Date.now()}`,
        status: 'pending',
        requesterId: user?.employee?.id || 'emp-001',
        requesterName: `${user?.employee?.firstName || 'John'} ${user?.employee?.lastName || 'Doe'}`,
        myShift: {
          date: selectedMyShift.date,
          type: selectedMyShift.type,
          time: selectedMyShift.time,
          department: selectedMyShift.department,
        },
        theirShift: {
          date: selectedTheirShift.date,
          type: selectedTheirShift.type,
          time: selectedTheirShift.time,
          department: selectedTheirShift.department,
          employeeName: selectedTheirShift.employeeName,
        },
        createdAt: new Date().toISOString().split('T')[0],
      };
      setSwapRequests([newRequest, ...swapRequests]);
      setShowModal(false);
      setSelectedMyShift(null);
      setSelectedTheirShift(null);
      setReason('');
    }
  };

  const handleApprove = (id: string) => {
    setSwapRequests(requests => 
      requests.map(r => r.id === id ? { ...r, status: 'approved' } : r)
    );
  };

  const handleReject = (id: string) => {
    setSwapRequests(requests => 
      requests.map(r => r.id === id ? { ...r, status: 'rejected' } : r)
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="status-success">Approved</span>;
      case 'rejected':
        return <span className="status-error">Rejected</span>;
      default:
        return <span className="status-warning">Pending</span>;
    }
  };

  const shiftTypeColors: Record<string, string> = {
    Morning: 'bg-blue-500',
    Evening: 'bg-purple-500',
    Night: 'bg-indigo-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-slate-900 mb-2">Shift Swaps</h1>
          <p className="dark:text-white/60 text-slate-600">Request and manage shift swaps with colleagues</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Swap Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Pending', count: swapRequests.filter(r => r.status === 'pending').length, color: 'amber' },
          { label: 'Approved', count: swapRequests.filter(r => r.status === 'approved').length, color: 'emerald' },
          { label: 'Rejected', count: swapRequests.filter(r => r.status === 'rejected').length, color: 'rose' },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-4">
              <div className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                stat.color === 'amber' && 'bg-amber-500/20',
                stat.color === 'emerald' && 'bg-emerald-500/20',
                stat.color === 'rose' && 'bg-rose-500/20',
              )}>
                <Clock className={clsx(
                  'w-6 h-6',
                  stat.color === 'amber' && 'text-amber-400',
                  stat.color === 'emerald' && 'text-emerald-400',
                  stat.color === 'rose' && 'text-rose-400',
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold dark:text-white text-slate-900">{stat.count}</p>
                <p className="dark:text-white/60 text-slate-600">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Swap Requests List */}
      <div className="card">
        <h3 className="text-lg font-semibold dark:text-white text-slate-900 mb-4">Swap Requests</h3>
        
        {swapRequests.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftRight className="w-12 h-12 dark:text-white/20 text-slate-300 mx-auto mb-4" />
            <p className="dark:text-white/60 text-slate-600">No swap requests yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {swapRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 dark:bg-white/5 bg-slate-50 rounded-xl border dark:border-white/10 border-slate-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Requester Info */}
                  <div className="flex items-center gap-3 min-w-[150px]">
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium dark:text-white text-slate-900">{request.requesterName}</p>
                      <p className="text-xs dark:text-white/50 text-slate-500">{request.createdAt}</p>
                    </div>
                  </div>

                  {/* Shift Details */}
                  <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
                    {/* Their current shift */}
                    <div className="flex-1 p-3 dark:bg-white/5 bg-white rounded-lg border dark:border-white/10 border-slate-200">
                      <p className="text-xs dark:text-white/50 text-slate-500 mb-1">Offering</p>
                      <div className="flex items-center gap-2">
                        <div className={clsx('w-2 h-2 rounded-full', shiftTypeColors[request.myShift.type])} />
                        <span className="dark:text-white text-slate-900 font-medium">{request.myShift.date}</span>
                      </div>
                      <p className="text-sm dark:text-white/70 text-slate-600">
                        {request.myShift.type} • {request.myShift.time}
                      </p>
                      <p className="text-xs dark:text-white/50 text-slate-500 mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {request.myShift.department}
                      </p>
                    </div>

                    <ArrowLeftRight className="w-5 h-5 dark:text-white/40 text-slate-400" />

                    {/* Requested shift */}
                    <div className="flex-1 p-3 dark:bg-white/5 bg-white rounded-lg border dark:border-white/10 border-slate-200">
                      <p className="text-xs dark:text-white/50 text-slate-500 mb-1">Requesting from {request.theirShift.employeeName}</p>
                      <div className="flex items-center gap-2">
                        <div className={clsx('w-2 h-2 rounded-full', shiftTypeColors[request.theirShift.type])} />
                        <span className="dark:text-white text-slate-900 font-medium">{request.theirShift.date}</span>
                      </div>
                      <p className="text-sm dark:text-white/70 text-slate-600">
                        {request.theirShift.type} • {request.theirShift.time}
                      </p>
                      <p className="text-xs dark:text-white/50 text-slate-500 mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {request.theirShift.department}
                      </p>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3">
                    {getStatusBadge(request.status)}
                    
                    {isAdmin() && request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-colors"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Swap Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="dark:bg-primary-950 bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border dark:border-white/10 border-slate-200"
          >
            <div className="p-6 border-b dark:border-white/10 border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white text-slate-900">New Swap Request</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 dark:text-white/60 text-slate-500 dark:hover:text-white hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Select Your Shift */}
              <div>
                <h3 className="font-medium dark:text-white text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center">1</span>
                  Select Your Shift to Swap
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myShifts.map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() => setSelectedMyShift(shift)}
                      className={clsx(
                        'p-4 rounded-xl border text-left transition-all',
                        selectedMyShift?.id === shift.id
                          ? 'border-primary-500 dark:bg-primary-500/20 bg-primary-50'
                          : 'dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 hover:border-primary-500/50'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-primary-400" />
                        <span className="font-medium dark:text-white text-slate-900">{shift.day}, {shift.date}</span>
                      </div>
                      <p className="text-sm dark:text-white/70 text-slate-600">{shift.type} Shift • {shift.time}</p>
                      <p className="text-xs dark:text-white/50 text-slate-500 mt-1">{shift.department}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Shift to Swap With */}
              <div>
                <h3 className="font-medium dark:text-white text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center">2</span>
                  Select Shift to Swap With
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableShifts.map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() => setSelectedTheirShift(shift)}
                      className={clsx(
                        'p-4 rounded-xl border text-left transition-all',
                        selectedTheirShift?.id === shift.id
                          ? 'border-primary-500 dark:bg-primary-500/20 bg-primary-50'
                          : 'dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 hover:border-primary-500/50'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-accent-400" />
                        <span className="font-medium text-accent-400">{shift.employeeName}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-primary-400" />
                        <span className="dark:text-white text-slate-900">{shift.day}, {shift.date}</span>
                      </div>
                      <p className="text-sm dark:text-white/70 text-slate-600">{shift.type} Shift • {shift.time}</p>
                      <p className="text-xs dark:text-white/50 text-slate-500 mt-1">{shift.department}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Reason */}
              <div>
                <h3 className="font-medium dark:text-white text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center">3</span>
                  Reason (Optional)
                </h3>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for swap request..."
                  className="input-field min-h-[100px]"
                />
              </div>
            </div>

            <div className="p-6 border-t dark:border-white/10 border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSwap}
                disabled={!selectedMyShift || !selectedTheirShift}
                className={clsx(
                  'btn-primary',
                  (!selectedMyShift || !selectedTheirShift) && 'opacity-50 cursor-not-allowed'
                )}
              >
                Submit Request
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
