import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, FileText, CheckSquare, LogOut, User, ListTodo, Users, Settings, Layers, Moon, Sun, Building2, UserCog, Home } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { colors, patterns } from '../../utils/darkMode';
import toast from 'react-hot-toast';
import { IndexSelector } from '../index/IndexSelector';
import { WaveAnimation } from '../WaveAnimation';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { language, theme, setTheme } = useUIStore();
  const lang = language;
  const isDark = theme === 'dark';

  // Check if user has management access (index_manager or section_coordinator)
  const isManagement = user?.role === 'INDEX_MANAGER' || user?.role === 'SECTION_COORDINATOR' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const isContributor = user?.role === 'CONTRIBUTOR';

  // Track whether user has access to any indices
  const [hasIndices, setHasIndices] = useState<boolean | null>(null);
  const [loadingIndices, setLoadingIndices] = useState(true);

  // Load indices to check if user has access
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

  // Menu items - Role-based access control
  const menuItems = isContributor
    ? [
        // Contributors see Home, Requirements, Tasks, and Settings (backend filters tasks by assignment)
        { id: 'home', path: '/home', icon: Home, label: { ar: 'الرئيسية', en: 'Home' } },
        { id: 'requirements', path: '/requirements', icon: CheckSquare, label: { ar: 'المتطلبات', en: 'Requirements' } },
        { id: 'tasks', path: '/tasks', icon: ListTodo, label: { ar: 'المهام', en: 'Tasks' } },
        { id: 'settings', path: '/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } }
      ]
    : hasIndices === false
    ? [
        // Management/Admin with no indices: show Home, Org Hierarchy (for admin), and Settings
        { id: 'home', path: '/home', icon: Home, label: { ar: 'الرئيسية', en: 'Home' } },
        ...(isAdmin ? [
          { id: 'organization-hierarchy', path: '/organization-hierarchy', icon: Building2, label: { ar: 'الهيكل التنظيمي', en: 'Organization' } }
        ] : []),
        { id: 'settings', path: '/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } }
      ]
    : [
        // Full menu for management/admin with indices
        { id: 'home', path: '/home', icon: Home, label: { ar: 'الرئيسية', en: 'Home' } },
        { id: 'index', path: '/index', icon: Layers, label: { ar: 'إدارة المؤشرات', en: 'Index Management' } },
        { id: 'requirements', path: '/requirements', icon: CheckSquare, label: { ar: 'المتطلبات', en: 'Requirements' } },
        { id: 'reports', path: '/reports', icon: BarChart3, label: { ar: 'التقارير', en: 'Reports' } },
        // Tasks page visible to all users (backend filters based on role and assignments)
        { id: 'tasks', path: '/tasks', icon: ListTodo, label: { ar: 'المهام', en: 'Tasks' } },
        { id: 'users', path: '/users', icon: Users, label: { ar: 'المستخدمين', en: 'Users' } },
        // Admin-only pages
        ...(isAdmin ? [
          { id: 'organization-hierarchy', path: '/organization-hierarchy', icon: Building2, label: { ar: 'الهيكل التنظيمي', en: 'Organization' } }
        ] : []),
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

  // Pages that are accessible even without indices
  const allowedPagesWithoutIndices = ['/', '/home', '/settings'];
  const isAllowedPage = allowedPagesWithoutIndices.includes(location.pathname);
  const isHomePage = location.pathname === '/' || location.pathname === '/home';

  return (
    <div className={`min-h-screen flex ${lang === 'ar' ? 'rtl' : 'ltr'} ${colors.bgPrimary}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <aside className={`w-64 shadow-lg flex flex-col fixed h-full ${colors.bgSecondary} ${colors.border} ${lang === 'ar' ? 'border-l' : 'border-r'}`}>
        {/* Logo Section with Dark Mode Toggle */}
        <div className={`p-6 border-b ${colors.border} relative`}>
          {/* Dark Mode Toggle - Top Right */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} p-2 rounded-lg transition ${colors.bgTertiary} ${colors.bgHover} ${colors.primaryIcon}`}
            title={isDark ? (lang === 'ar' ? 'الوضع النهاري' : 'Light Mode') : (lang === 'ar' ? 'الوضع الليلي' : 'Dark Mode')}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="flex flex-col items-center">
            <div className="mb-3">
              <img src="/logo.png" alt="Raqib Logo" className="w-20 h-20 object-contain" />
            </div>
            <h1 className={`text-2xl font-bold mb-1 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'راقب' : 'Raqib'}
            </h1>
            <p className={`text-xs text-center ${colors.textTertiary}`}>
              {lang === 'ar' ? 'المنصة الذكية لإدارة المؤشرات' : 'Index Management System'}
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? `${colors.primary} text-white shadow-md`
                      : `${colors.textSecondary} ${colors.bgHover}`
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label[lang]}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className={`p-4 border-t ${colors.border}`}>
          {/* User Card */}
          <div className={`flex items-center gap-3 p-3 rounded-lg mb-2 ${colors.bgTertiary}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.primaryLight}`}>
              <User size={20} className={colors.primaryIcon} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${colors.textPrimary}`}>
                {lang === 'ar' ? user?.name : user?.name_en}
              </p>
              <p className={`text-xs truncate ${colors.textSecondary}`}>{user?.email}</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:${colors.bgHover}`}
          >
            <LogOut size={18} />
            <span className="font-medium">
              {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${lang === 'ar' ? 'mr-64' : 'ml-64'}`}>
        {/* Show Index Selector header only if user has indices */}
        {hasIndices !== false && (
          <header className={`sticky top-0 z-10 ${colors.bgSecondary} border-b ${colors.border} shadow-sm`}>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'المؤشر الحالي' : 'Current Index'}
                </h2>
              </div>
              <IndexSelector />
            </div>
          </header>
        )}

        {/* Page Content */}
        <div className={isHomePage ? '' : (hasIndices === false && !isAllowedPage ? 'h-full' : 'p-6')}>
          {loadingIndices ? (
            // Loading state
            <div className="h-screen flex items-center justify-center">
              <div className="text-center">
                <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 ${colors.primary}`}></div>
                <p className={`mt-4 ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </p>
              </div>
            </div>
          ) : hasIndices === false && !isAllowedPage ? (
            // No access state - redirect to home
            <div className="h-screen flex items-center justify-center relative">
              <WaveAnimation />
              <div className="relative z-10 text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="Raqib Logo" className="w-32 h-32 object-contain mx-auto animate-pulse" />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'راقب' : 'Raqib'}
                </h2>
                <p className={`text-lg mb-4 ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'المنصة الذكية لإدارة المؤشرات' : 'Index Management System'}
                </p>
                <p className={`${colors.textTertiary}`}>
                  {lang === 'ar' ? 'لا توجد مؤشرات مخصصة لك حالياً' : 'No indices assigned to you'}
                </p>
              </div>
            </div>
          ) : (
            // Normal page content or allowed pages
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
