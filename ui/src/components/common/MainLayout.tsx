import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, CheckSquare, LogOut, User, ListTodo, Users, Settings, Layers, Moon, Sun, Building2, Home, Bell, ChevronLeft, ChevronRight, Menu, X, Clock, BookOpen, MessageCircle, FolderTree } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useIndexStore } from '../../stores/indexStore';
import toast from 'react-hot-toast';
import { IndexSelector } from '../index/IndexSelector';
import { WaveAnimation } from '../WaveAnimation';
import { useState, useEffect, useMemo } from 'react';
import { api, notificationsAPI, supportAPI } from '../../services/api';

// Countdown Timer Component - Clean minimal design without animation
const CountdownTimer = () => {
  const { language, theme } = useUIStore();
  const { currentIndex } = useIndexStore();
  const lang = language;
  const isDark = theme === 'dark';

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!currentIndex?.end_date) {
      setTimeLeft(null);
      setIsExpired(false);
      return;
    }

    const calculateTimeLeft = () => {
      const endDate = new Date(currentIndex.end_date!);
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setIsExpired(false);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [currentIndex?.end_date]);

  if (!currentIndex?.end_date || !timeLeft) {
    return <div style={{ flex: 1 }} />;
  }

  const isUrgent = timeLeft.days < 7;
  const textColor = isExpired ? '#ef4444' : (isUrgent ? '#f59e0b' : (isDark ? '#e5e7eb' : '#374151'));

  const TimeBlock = ({ value, label }: { value: number; label: string }) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '6px 8px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          borderRadius: '8px',
          minWidth: '50px'
        }}
      >
        <span style={{
          fontSize: '18px',
          fontWeight: 700,
          color: textColor,
          fontFamily: 'ui-monospace, monospace',
          lineHeight: 1.2
        }}>
          {String(value).padStart(2, '0')}
        </span>
        <span style={{
          fontSize: '9px',
          color: isDark ? '#6b7280' : '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          marginTop: '2px',
          fontWeight: 500
        }}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <TimeBlock value={timeLeft.days} label={lang === 'ar' ? 'يوم' : 'Days'} />
          <span style={{ color: isDark ? '#4b5563' : '#9ca3af', fontWeight: 'bold', fontSize: '14px' }}>:</span>
          <TimeBlock value={timeLeft.hours} label={lang === 'ar' ? 'ساعة' : 'Hours'} />
          <span style={{ color: isDark ? '#4b5563' : '#9ca3af', fontWeight: 'bold', fontSize: '14px' }}>:</span>
          <TimeBlock value={timeLeft.minutes} label={lang === 'ar' ? 'دقيقة' : 'Mins'} />
          <span style={{ color: isDark ? '#4b5563' : '#9ca3af', fontWeight: 'bold', fontSize: '14px' }}>:</span>
          <TimeBlock value={timeLeft.seconds} label={lang === 'ar' ? 'ثانية' : 'Secs'} />
          {isExpired && (
            <span style={{
              fontSize: '11px',
              color: '#ef4444',
              fontWeight: 600,
              marginLeft: '8px'
            }}>
              {lang === 'ar' ? 'انتهى!' : 'Ended'}
            </span>
          )}
        </div>
      </div>
  );
};

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { language, theme, setTheme, sidebarOpen, toggleSidebar } = useUIStore();
  const { currentIndex } = useIndexStore();
  const lang = language;
  const isDark = theme === 'dark';

  const isAdmin = user?.role === 'ADMIN';
  const isIndexOwner = currentIndex?.user_role === 'OWNER';
  const isIndexSupervisor = currentIndex?.user_role === 'SUPERVISOR';
  const isIndexOwnerOrSupervisor = isIndexOwner || isIndexSupervisor;
  const isETARIIndex = currentIndex?.index_type === 'ETARI';

  const [hasIndices, setHasIndices] = useState<boolean | null>(null);
  const [loadingIndices, setLoadingIndices] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Detect mobile devices - check width only (simpler and more reliable)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Close mobile sidebar when switching to desktop
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar when navigating
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const checkUserAccess = async () => {
      try {
        const indices = await api.indices.getAll();
        setHasIndices(indices.length > 0);
      } catch (error) {
        console.error('Failed to check user access:', error);
        setHasIndices(false);
      } finally {
        setLoadingIndices(false);
      }
    };
    checkUserAccess();
  }, []);

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
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch support unread count for ETARI indexes
  useEffect(() => {
    const fetchSupportUnreadCount = async () => {
      if (!currentIndex?.id || currentIndex.index_type !== 'ETARI') {
        setSupportUnreadCount(0);
        return;
      }
      try {
        const result = await supportAPI.getUnreadCount(currentIndex.id);
        setSupportUnreadCount(result.count);
      } catch (error) {
        console.error('Failed to fetch support unread count:', error);
      }
    };
    fetchSupportUnreadCount();
    const interval = setInterval(fetchSupportUnreadCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [currentIndex?.id, currentIndex?.index_type]);

  const menuItems = hasIndices === false
    ? [
        { id: 'home', path: '/home', icon: Home, label: { ar: 'الرئيسية', en: 'Home' } },
        ...(isAdmin ? [{ id: 'organization-hierarchy', path: '/organization-hierarchy', icon: Building2, label: { ar: 'الهيكل التنظيمي', en: 'Organization' } }] : []),
        { id: 'settings', path: '/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } }
      ]
    : isAdmin || isIndexOwner
    ? [
        // Admin and Index Owner: Full access to all features
        { id: 'home', path: '/home', icon: Home, label: { ar: 'الرئيسية', en: 'Home' } },
        { id: 'index', path: '/index', icon: Layers, label: { ar: 'المؤشرات', en: 'Indices' } },
        { id: 'requirements', path: '/requirements', icon: CheckSquare, label: { ar: 'المتطلبات', en: 'Requirements' } },
        { id: 'reports', path: '/reports', icon: BarChart3, label: { ar: 'التقارير', en: 'Reports' } },
        { id: 'tasks', path: '/tasks', icon: ListTodo, label: { ar: 'المهام', en: 'Tasks' } },
        ...(isETARIIndex ? [{ id: 'knowledge', path: '/knowledge', icon: BookOpen, label: { ar: 'مركز المعرفة', en: 'Knowledge' } }] : []),
        ...(isETARIIndex ? [{ id: 'support', path: '/support', icon: MessageCircle, label: { ar: 'الدعم', en: 'Support' }, badge: supportUnreadCount }] : []),
        ...(isETARIIndex && (isAdmin || isIndexOwner) ? [{ id: 'evidence-management', path: '/evidence-management', icon: FolderTree, label: { ar: 'إدارة المرفقات', en: 'Evidence' } }] : []),
        { id: 'users', path: '/users', icon: Users, label: { ar: 'المستخدمين', en: 'Users' } },
        ...(isAdmin ? [{ id: 'organization-hierarchy', path: '/organization-hierarchy', icon: Building2, label: { ar: 'الهيكل', en: 'Org' } }] : []),
        { id: 'settings', path: '/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } }
      ]
    : isIndexSupervisor
    ? [
        // Supervisor: No access to Indices, Reports, Users, Org, and Evidence Management pages
        { id: 'home', path: '/home', icon: Home, label: { ar: 'الرئيسية', en: 'Home' } },
        { id: 'requirements', path: '/requirements', icon: CheckSquare, label: { ar: 'المتطلبات', en: 'Requirements' } },
        { id: 'tasks', path: '/tasks', icon: ListTodo, label: { ar: 'المهام', en: 'Tasks' } },
        ...(isETARIIndex ? [{ id: 'knowledge', path: '/knowledge', icon: BookOpen, label: { ar: 'مركز المعرفة', en: 'Knowledge' } }] : []),
        ...(isETARIIndex ? [{ id: 'support', path: '/support', icon: MessageCircle, label: { ar: 'الدعم', en: 'Support' }, badge: supportUnreadCount }] : []),
        { id: 'settings', path: '/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } }
      ]
    : [
        // Contributor: Minimal access (no Evidence Management)
        { id: 'home', path: '/home', icon: Home, label: { ar: 'الرئيسية', en: 'Home' } },
        { id: 'requirements', path: '/requirements', icon: CheckSquare, label: { ar: 'المتطلبات', en: 'Requirements' } },
        { id: 'tasks', path: '/tasks', icon: ListTodo, label: { ar: 'المهام', en: 'Tasks' } },
        ...(isETARIIndex ? [{ id: 'knowledge', path: '/knowledge', icon: BookOpen, label: { ar: 'مركز المعرفة', en: 'Knowledge' } }] : []),
        ...(isETARIIndex ? [{ id: 'support', path: '/support', icon: MessageCircle, label: { ar: 'الدعم', en: 'Support' }, badge: supportUnreadCount }] : []),
        { id: 'settings', path: '/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } }
      ];

  const handleLogout = () => {
    logout();
    toast.success(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
    navigate('/login');
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Get current page title for mobile header
  const getCurrentPageTitle = () => {
    const allPages = [
      { path: '/home', label: { ar: 'الرئيسية', en: 'Home' } },
      { path: '/index', label: { ar: 'المؤشرات', en: 'Indices' } },
      { path: '/requirements', label: { ar: 'المتطلبات', en: 'Requirements' } },
      { path: '/reports', label: { ar: 'التقارير', en: 'Reports' } },
      { path: '/tasks', label: { ar: 'المهام', en: 'Tasks' } },
      { path: '/knowledge', label: { ar: 'مركز المعرفة', en: 'Knowledge Center' } },
      { path: '/support', label: { ar: 'الدعم', en: 'Support' } },
      { path: '/evidence-management', label: { ar: 'إدارة المرفقات', en: 'Evidence Management' } },
      { path: '/users', label: { ar: 'المستخدمين', en: 'Users' } },
      { path: '/organization-hierarchy', label: { ar: 'الهيكل التنظيمي', en: 'Organization' } },
      { path: '/settings', label: { ar: 'الإعدادات', en: 'Settings' } },
      { path: '/notifications', label: { ar: 'الإشعارات', en: 'Notifications' } },
    ];
    const currentPage = allPages.find(page => isActivePath(page.path));
    return currentPage ? currentPage.label[lang] : (lang === 'ar' ? 'ساهم' : 'Sahem');
  };

  const allowedPagesWithoutIndices = ['/', '/home', '/settings', '/notifications'];
  const isAllowedPage = allowedPagesWithoutIndices.includes(location.pathname);
  const isHomePage = location.pathname === '/' || location.pathname === '/home';

  // Sidebar width: 60px when collapsed, 200px when expanded
  const sidebarWidth = sidebarOpen ? 200 : 60;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        backgroundColor: isDark ? '#212224' : '#f9fafb'
      }}
    >
      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 199,
          }}
        />
      )}

      {/* Sidebar - Slide-over on mobile, collapsible on desktop */}
      <aside
        style={{
          width: isMobile ? '280px' : `${sidebarWidth}px`,
          minWidth: isMobile ? '280px' : `${sidebarWidth}px`,
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: lang === 'ar' ? 'auto' : (isMobile ? (mobileSidebarOpen ? 0 : '-280px') : 0),
          right: lang === 'ar' ? (isMobile ? (mobileSidebarOpen ? 0 : '-280px') : 0) : 'auto',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isDark ? '#29292d' : '#ffffff',
          borderRight: lang === 'ar' ? 'none' : `1px solid ${isDark ? '#313236' : '#e5e7eb'}`,
          borderLeft: lang === 'ar' ? `1px solid ${isDark ? '#313236' : '#e5e7eb'}` : 'none',
          boxShadow: isMobile && mobileSidebarOpen ? '4px 0 16px rgba(0,0,0,0.2)' : '2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 200,
          transition: isMobile ? 'left 0.3s ease, right 0.3s ease' : 'width 0.3s ease',
          overflow: 'hidden'
        }}
      >
        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: lang === 'ar' ? 'auto' : '12px',
              left: lang === 'ar' ? '12px' : 'auto',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isDark ? '#313236' : '#f3f4f6',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 201,
            }}
          >
            <X size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
          </button>
        )}

        {/* Logo with Theme Toggle */}
        <div style={{
          padding: (isMobile || sidebarOpen) ? '12px 16px' : '12px 8px',
          borderBottom: `1px solid ${isDark ? '#313236' : '#e5e7eb'}`,
          position: 'relative'
        }}>
          {/* Theme Toggle - Top Left */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            style={{
              position: 'absolute',
              top: '8px',
              left: lang === 'ar' ? 'auto' : '8px',
              right: lang === 'ar' ? '8px' : 'auto',
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: isDark ? '#fbbf24' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Logo Center */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: (isMobile || sidebarOpen) ? '8px' : '0'
          }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                width: (isMobile || sidebarOpen) ? '50px' : '36px',
                height: (isMobile || sidebarOpen) ? '50px' : '36px',
                objectFit: 'contain'
              }}
            />
            {(isMobile || sidebarOpen) && (
              <>
                <span style={{
                  marginTop: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: isDark ? '#f3f4f6' : '#111827'
                }}>
                  {lang === 'ar' ? 'ساهم' : 'Sahem'}
                </span>
                <span style={{
                  marginTop: '4px',
                  fontSize: '10px',
                  color: isDark ? '#6b7280' : '#9ca3af',
                  textAlign: 'center',
                  lineHeight: 1.3
                }}>
                  {lang === 'ar' ? 'المنصة الذكية لإدارة المؤشرات' : 'Smart Index Management Platform'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Index Selector */}
        {hasIndices !== false && (isMobile || sidebarOpen) && (
          <div style={{
            padding: '12px',
            borderBottom: `1px solid ${isDark ? '#313236' : '#e5e7eb'}`
          }}>
            <p style={{
              fontSize: '11px',
              color: isDark ? '#9ca3af' : '#6b7280',
              marginBottom: '8px',
              fontWeight: 500
            }}>
              {lang === 'ar' ? 'المؤشر الحالي' : 'Current Index'}
            </p>
            <IndexSelector />
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            const badge = (item as any).badge;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={(!isMobile && !sidebarOpen) ? item.label[lang] : undefined}
                style={{
                  width: '100%',
                  padding: (isMobile || sidebarOpen) ? '10px 12px' : '10px 8px',
                  marginBottom: '2px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? (isDark ? '#0f5132' : '#dcfce7') : 'transparent',
                  color: isActive ? (isDark ? '#4ade80' : '#15803d') : (isDark ? '#9ca3af' : '#4b5563'),
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: (isMobile || sidebarOpen) ? 'flex-start' : 'center',
                  gap: (isMobile || sidebarOpen) ? '10px' : '0',
                  transition: 'background-color 0.15s ease',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Icon size={18} />
                  {/* Teal badge for support */}
                  {badge > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      backgroundColor: '#0d9488',
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                {(isMobile || sidebarOpen) && (
                  <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap' }}>
                    {item.label[lang]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div style={{
          padding: '8px',
          borderTop: `1px solid ${isDark ? '#313236' : '#e5e7eb'}`
        }}>
          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '4px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: isDark ? '#9ca3af' : '#4b5563',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: (isMobile || sidebarOpen) ? 'flex-start' : 'center',
              gap: (isMobile || sidebarOpen) ? '10px' : '0',
              position: 'relative'
            }}
          >
            <div style={{ position: 'relative' }}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {(isMobile || sidebarOpen) && <span style={{ fontSize: '13px' }}>{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>}
          </button>

          {/* User */}
          <div style={{
            padding: '8px',
            marginBottom: '4px',
            borderRadius: '8px',
            backgroundColor: isDark ? '#313236' : '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: (isMobile || sidebarOpen) ? 'flex-start' : 'center',
            gap: (isMobile || sidebarOpen) ? '8px' : '0'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: isDark ? '#14532d' : '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={14} style={{ color: isDark ? '#22c55e' : '#16a34a' }} />
            </div>
            {(isMobile || sidebarOpen) && (
              <div style={{ overflow: 'hidden' }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: isDark ? '#f3f4f6' : '#111827',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {lang === 'ar' ? user?.name : user?.name_en}
                </p>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#dc2626',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: (isMobile || sidebarOpen) ? 'flex-start' : 'center',
              gap: (isMobile || sidebarOpen) ? '8px' : '0'
            }}
          >
            <LogOut size={18} />
            {(isMobile || sidebarOpen) && <span style={{ fontSize: '13px' }}>{lang === 'ar' ? 'خروج' : 'Logout'}</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar Toggle Button - Fixed position, outside sidebar for proper z-index */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            top: '50%',
            transform: 'translateY(-50%)',
            left: lang === 'ar' ? 'auto' : `${sidebarWidth - 14}px`,
            right: lang === 'ar' ? `${sidebarWidth - 14}px` : 'auto',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
            boxShadow: isDark
              ? '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
            transition: 'left 0.3s ease, right 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            e.currentTarget.style.background = isDark
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.boxShadow = isDark
              ? '0 6px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
              : '0 6px 24px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            e.currentTarget.style.background = isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.boxShadow = isDark
              ? '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.8)';
          }}
        >
          {lang === 'ar'
            ? (sidebarOpen ? <ChevronRight size={16} color={isDark ? '#e5e7eb' : '#374151'} strokeWidth={2.5} /> : <ChevronLeft size={16} color={isDark ? '#e5e7eb' : '#374151'} strokeWidth={2.5} />)
            : (sidebarOpen ? <ChevronLeft size={16} color={isDark ? '#e5e7eb' : '#374151'} strokeWidth={2.5} /> : <ChevronRight size={16} color={isDark ? '#e5e7eb' : '#374151'} strokeWidth={2.5} />)
          }
        </button>
      )}

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : (lang === 'ar' ? 0 : `${sidebarWidth}px`),
          marginRight: isMobile ? 0 : (lang === 'ar' ? `${sidebarWidth}px` : 0),
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin 0.3s ease'
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: '12px 16px',
            backgroundColor: isDark ? '#29292d' : '#ffffff',
            borderBottom: `1px solid ${isDark ? '#313236' : '#e5e7eb'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            position: 'sticky',
            top: 0,
            zIndex: 50
          }}
        >
          {/* Mobile hamburger menu */}
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(true)}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isDark ? '#313236' : '#f3f4f6',
                color: isDark ? '#9ca3af' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Menu size={20} />
            </button>
          )}
          {/* Page title on mobile, countdown on desktop */}
          {isMobile ? (
            <h2 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: isDark ? '#f3f4f6' : '#111827',
              flex: 1
            }}>
              {getCurrentPageTitle()}
            </h2>
          ) : (
            <CountdownTimer />
          )}
        </header>

        {/* Page Content */}
        <div style={{ flex: 1 }} className={isHomePage ? '' : (hasIndices === false && !isAllowedPage ? 'h-full' : 'p-4')}>
          {loadingIndices ? (
            <div style={{
              minHeight: 'calc(100vh - 60px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: `3px solid ${isDark ? '#0f5132' : '#16a34a'}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }} />
                <p style={{ marginTop: '12px', color: isDark ? '#9ca3af' : '#6b7280', fontSize: '14px' }}>
                  {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </p>
              </div>
            </div>
          ) : hasIndices === false && !isAllowedPage ? (
            <div style={{
              minHeight: 'calc(100vh - 60px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <WaveAnimation />
              <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '80px', height: '80px', margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: isDark ? '#f3f4f6' : '#111827', marginBottom: '8px' }}>
                  {lang === 'ar' ? 'ساهم' : 'Sahem'}
                </h2>
                <p style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: '14px' }}>
                  {lang === 'ar' ? 'لا توجد مؤشرات مخصصة لك' : 'No indices assigned'}
                </p>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
