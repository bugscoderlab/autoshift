import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Download, Send, Lock, Eye } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Mock data
const mockShifts: Record<string, Array<{ name: string; shift: string; color: string }>> = {
  '2024-01-15': [
    { name: 'Dr. John', shift: 'Morning', color: 'bg-blue-500' },
    { name: 'Jane S.', shift: 'Morning', color: 'bg-blue-500' },
    { name: 'Bob M.', shift: 'Evening', color: 'bg-purple-500' },
  ],
  '2024-01-16': [
    { name: 'Alice K.', shift: 'Morning', color: 'bg-blue-500' },
    { name: 'Dr. John', shift: 'Night', color: 'bg-indigo-500' },
  ],
  '2024-01-17': [
    { name: 'Jane S.', shift: 'Morning', color: 'bg-blue-500' },
    { name: 'Bob M.', shift: 'Morning', color: 'bg-blue-500' },
    { name: 'Alice K.', shift: 'Evening', color: 'bg-purple-500' },
  ],
};

export default function RosterCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 0, 1));
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const { canEditRoster, isAdmin } = useAuthStore();

  // Check if user can edit
  const canEdit = canEditRoster();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getShiftsForDay = (day: number | null) => {
    if (!day) return [];
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mockShifts[dateKey] || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Roster Calendar</h1>
          <div className="flex items-center gap-3">
            <p className="text-white/60">
              {canEdit ? 'Manage and edit employee schedules' : 'View employee schedules'}
            </p>
            {!canEdit && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full">
                <Eye className="w-3 h-3" />
                View Only
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          
          {/* Admin-only buttons */}
          {canEdit ? (
            <>
              <button className="btn-secondary flex items-center gap-2">
                <Send className="w-4 h-4" />
                Publish
              </button>
              <button className="btn-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Generate
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg text-white/40 text-sm">
              <Lock className="w-4 h-4" />
              Admin access required to edit
            </div>
          )}
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-xl font-semibold text-white">{monthName}</h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {['month', 'week'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as 'month' | 'week')}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  viewMode === mode
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="text-center py-2 text-sm font-medium text-white/50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const shifts = getShiftsForDay(day);
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                className={clsx(
                  'min-h-[120px] p-2 rounded-lg border transition-colors',
                  day
                    ? canEdit
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer'
                      : 'bg-white/5 border-white/10 cursor-default'
                    : 'bg-transparent border-transparent',
                  isToday && 'ring-2 ring-primary-500 border-primary-500'
                )}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={clsx(
                          'text-sm font-medium',
                          isToday ? 'text-primary-400' : 'text-white/70'
                        )}
                      >
                        {day}
                      </span>
                      {/* Only show add button for admins */}
                      {shifts.length === 0 && canEdit && (
                        <button className="p-1 rounded hover:bg-white/10">
                          <Plus className="w-3 h-3 text-white/40" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      {shifts.slice(0, 3).map((shift, i) => (
                        <div
                          key={i}
                          className={clsx(
                            'px-2 py-1 rounded text-xs text-white truncate',
                            shift.color,
                            canEdit && 'cursor-move hover:opacity-80'
                          )}
                          draggable={canEdit}
                        >
                          {shift.name}
                        </div>
                      ))}
                      {shifts.length > 3 && (
                        <div className="text-xs text-white/50 pl-2">
                          +{shifts.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Shift Legend */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Shift Types</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { name: 'Morning', color: 'bg-blue-500', time: '07:00-15:00' },
            { name: 'Evening', color: 'bg-purple-500', time: '15:00-23:00' },
            { name: 'Night', color: 'bg-indigo-500', time: '23:00-07:00' },
          ].map((shift) => (
            <div key={shift.name} className="flex items-center gap-2">
              <div className={clsx('w-3 h-3 rounded-full', shift.color)} />
              <span className="text-white/80">{shift.name}</span>
              <span className="text-white/40 text-sm">({shift.time})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role Info Card */}
      <div className={clsx(
        'card border',
        canEdit ? 'border-primary-500/30 bg-primary-500/5' : 'border-amber-500/30 bg-amber-500/5'
      )}>
        <div className="flex items-center gap-3">
          {canEdit ? (
            <>
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h4 className="text-white font-medium">Administrator Access</h4>
                <p className="text-white/60 text-sm">You can edit shifts, publish rosters, and use AI generation</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-white font-medium">Employee View</h4>
                <p className="text-white/60 text-sm">You can view the roster and export schedules. Contact admin to request changes.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
