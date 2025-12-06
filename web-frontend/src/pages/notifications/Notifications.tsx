import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftRight, 
  Plane, 
  Calendar, 
  Bell, 
  Info,
  Trash2,
  CheckCheck
} from 'lucide-react';
import clsx from 'clsx';

// Mock notifications
const initialNotifications = [
  {
    id: '1',
    type: 'swap',
    title: 'Swap Request Approved',
    message: 'Your shift swap request with Jane Smith has been approved by the supervisor.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'leave',
    title: 'Leave Request Pending',
    message: 'Your annual leave request for Jan 20-22 is pending supervisor approval.',
    time: '5 hours ago',
    read: false,
  },
  {
    id: '3',
    type: 'schedule',
    title: 'Schedule Updated',
    message: 'Your schedule for next week has been published. Please review your shifts.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '4',
    type: 'reminder',
    title: 'Shift Reminder',
    message: 'You have a Morning shift tomorrow at 07:00 in Emergency Department.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'New Feature: AI Assistant',
    message: 'Try our new AI Assistant to help with scheduling questions and recommendations.',
    time: '3 days ago',
    read: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'swap': return ArrowLeftRight;
    case 'leave': return Plane;
    case 'schedule': return Calendar;
    case 'reminder': return Bell;
    case 'system': return Info;
    default: return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'swap': return 'bg-blue-500/20 text-blue-400';
    case 'leave': return 'bg-amber-500/20 text-amber-400';
    case 'schedule': return 'bg-emerald-500/20 text-emerald-400';
    case 'reminder': return 'bg-rose-500/20 text-rose-400';
    case 'system': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-white/60">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="btn-secondary flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={clearAll}
              className="btn-secondary flex items-center gap-2 text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="card text-center py-16">
            <Bell className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No notifications</h3>
            <p className="text-white/60">You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <>
            {/* Unread */}
            {notifications.filter(n => !n.read).length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">New</h2>
                {notifications.filter(n => !n.read).map((notification, index) => {
                  const Icon = getNotificationIcon(notification.type);
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={clsx(
                        'card-hover mb-3 flex items-start gap-4 cursor-pointer border-l-4 border-primary-500'
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className={clsx(
                        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                        getNotificationColor(notification.type)
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{notification.title}</h3>
                          <span className="w-2 h-2 rounded-full bg-primary-500" />
                        </div>
                        <p className="text-white/70 text-sm line-clamp-2">{notification.message}</p>
                        <p className="text-white/40 text-xs mt-2">{notification.time}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Read */}
            {notifications.filter(n => n.read).length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Earlier</h2>
                {notifications.filter(n => n.read).map((notification, index) => {
                  const Icon = getNotificationIcon(notification.type);
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="card mb-3 flex items-start gap-4 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <div className={clsx(
                        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                        getNotificationColor(notification.type)
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1">{notification.title}</h3>
                        <p className="text-white/60 text-sm line-clamp-2">{notification.message}</p>
                        <p className="text-white/40 text-xs mt-2">{notification.time}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

