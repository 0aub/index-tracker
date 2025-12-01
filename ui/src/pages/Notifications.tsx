import { useState, useEffect } from 'react';
import { Bell, Loader2, AlertCircle, Check, CheckCheck, Trash2, Clock, User, FileText, ListTodo } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { notificationsAPI, Notification, NotificationListResponse } from '../services/api';
import { colors, patterns } from '../utils/darkMode';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { language } = useUIStore();
  const navigate = useNavigate();
  const lang = language;

  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [readFilter, setReadFilter] = useState<string>('all'); // 'all' | 'read' | 'unread'

  // Load notifications
  useEffect(() => {
    loadNotifications();
  }, [readFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (readFilter === 'read') params.is_read = true;
      if (readFilter === 'unread') params.is_read = false;

      const response = await notificationsAPI.getAll(params);
      setData(response);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications');
      toast.error(lang === 'ar' ? 'فشل تحميل الإشعارات' : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await notificationsAPI.markAsRead(notificationIds);
      loadNotifications();
      toast.success(lang === 'ar' ? 'تم وضع علامة مقروء' : 'Marked as read');
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل وضع علامة مقروء' : 'Failed to mark as read'));
    }
  };

  const handleToggleReadStatus = async (notification: Notification) => {
    try {
      if (notification.is_read) {
        // Mark as unread
        await notificationsAPI.markAsUnread([notification.id]);
        loadNotifications();
        toast.success(lang === 'ar' ? 'تم وضع علامة غير مقروء' : 'Marked as unread');
      } else {
        // Mark as read
        await handleMarkAsRead([notification.id]);
      }
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل تغيير الحالة' : 'Failed to change status'));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      loadNotifications();
      toast.success(lang === 'ar' ? 'تم وضع علامة مقروء على الكل' : 'Marked all as read');
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل وضع علامة مقروء' : 'Failed to mark all as read'));
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationsAPI.delete(notificationId);
      loadNotifications();
      toast.success(lang === 'ar' ? 'تم حذف الإشعار' : 'Notification deleted');
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل حذف الإشعار' : 'Failed to delete notification'));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      handleMarkAsRead([notification.id]);
    }

    // Navigate to related entity
    if (notification.task_id) {
      navigate('/tasks');
    } else if (notification.requirement_id) {
      navigate(`/requirements/${notification.requirement_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('task')) return <ListTodo size={20} />;
    if (type.includes('requirement') || type.includes('evidence')) return <FileText size={20} />;
    return <Bell size={20} />;
  };

  const getNotificationColor = (type: string) => {
    if (type.includes('assigned')) return 'text-blue-600 dark:text-blue-400';
    if (type.includes('completed') || type.includes('approved')) return 'text-green-600 dark:text-green-400';
    if (type.includes('rejected') || type.includes('overdue')) return 'text-red-600 dark:text-red-400';
    if (type.includes('comment')) return 'text-purple-600 dark:text-purple-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return lang === 'ar' ? 'الآن' : 'Now';
    if (diffMins < 60) return lang === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return lang === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7) return lang === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;

    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className={colors.textSecondary}>{error}</p>
          <button
            onClick={loadNotifications}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${colors.text}`}>
            {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
          </h1>
          <p className={colors.textSecondary}>
            {lang === 'ar'
              ? `${notifications.length} إشعار، ${unreadCount} غير مقروء`
              : `${notifications.length} notifications, ${unreadCount} unread`
            }
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CheckCheck size={16} />
            {lang === 'ar' ? 'وضع علامة مقروء على الكل' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={`flex gap-2 p-4 rounded-lg ${colors.cardBg}`}>
        <button
          onClick={() => setReadFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            readFilter === 'all'
              ? 'bg-blue-600 text-white'
              : `${colors.textSecondary} hover:bg-gray-200 dark:hover:bg-gray-700`
          }`}
        >
          {lang === 'ar' ? 'الكل' : 'All'}
        </button>
        <button
          onClick={() => setReadFilter('unread')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            readFilter === 'unread'
              ? 'bg-blue-600 text-white'
              : `${colors.textSecondary} hover:bg-gray-200 dark:hover:bg-gray-700`
          }`}
        >
          {lang === 'ar' ? 'غير مقروء' : 'Unread'}
        </button>
        <button
          onClick={() => setReadFilter('read')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            readFilter === 'read'
              ? 'bg-blue-600 text-white'
              : `${colors.textSecondary} hover:bg-gray-200 dark:hover:bg-gray-700`
          }`}
        >
          {lang === 'ar' ? 'مقروء' : 'Read'}
        </button>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className={`text-center py-12 rounded-lg ${colors.cardBg}`}>
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className={colors.textSecondary}>
            {lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                !notification.is_read
                  ? `${colors.cardBg} ${patterns.borderHighlight} bg-blue-50 dark:bg-blue-950/20`
                  : `${colors.cardBg} ${patterns.border}`
              } hover:shadow-md transition-all cursor-pointer`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${
                  !notification.is_read ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'
                } ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className={`font-semibold ${colors.text} mb-1`}>
                        {notification.title}
                      </h3>
                      <p className={colors.textSecondary}>
                        {notification.message}
                      </p>
                      {notification.actor_name && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <User size={14} />
                          <span>{notification.actor_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock size={14} />
                      <span>{formatRelativeTime(notification.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleReadStatus(notification);
                    }}
                    className={`p-2 rounded transition-colors ${
                      notification.is_read
                        ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : 'hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}
                    title={notification.is_read
                      ? (lang === 'ar' ? 'وضع علامة غير مقروء' : 'Mark as unread')
                      : (lang === 'ar' ? 'وضع علامة مقروء' : 'Mark as read')
                    }
                  >
                    {notification.is_read ? <CheckCheck size={18} /> : <Check size={18} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                    title={lang === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
