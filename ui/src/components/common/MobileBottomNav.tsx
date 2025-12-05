import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CheckSquare, ListTodo, Bell, Menu } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useState, useEffect } from 'react';
import { notificationsAPI } from '../../services/api';

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, theme } = useUIStore();
  const lang = language;
  const isDark = theme === 'dark';

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const result = await notificationsAPI.getUnreadCount();
        setUnreadCount(result.count);
      } catch (error) {
        console.error('Failed to fetch unread notifications count:', error);
      }
    };
    fetchUnreadCount();
  }, []);

  const isActivePath = (path: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { id: 'home', path: '/home', icon: Home, label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'requirements', path: '/requirements', icon: CheckSquare, label: lang === 'ar' ? 'المتطلبات' : 'Requirements' },
    { id: 'tasks', path: '/tasks', icon: ListTodo, label: lang === 'ar' ? 'المهام' : 'Tasks' },
    { id: 'notifications', path: '/notifications', icon: Bell, label: lang === 'ar' ? 'الإشعارات' : 'Notifications' },
    { id: 'more', path: '/settings', icon: Menu, label: lang === 'ar' ? 'المزيد' : 'More' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: isDark ? '#29292d' : '#ffffff',
        borderTop: `1px solid ${isDark ? '#313236' : '#e5e7eb'}`,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        zIndex: 99999,
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        WebkitTransform: 'translateZ(0)', // Force GPU layer on iOS
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0'
        }}
      >
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = isActivePath(item.path);
          const isNotifications = item.id === 'notifications';

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: isActive ? '#16a34a' : (isDark ? '#9ca3af' : '#6b7280'),
                position: 'relative',
                minWidth: '60px'
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon size={24} />
                {isNotifications && unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '10px', fontWeight: 500 }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
