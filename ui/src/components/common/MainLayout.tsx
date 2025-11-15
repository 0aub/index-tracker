import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, FileText, CheckSquare, LogOut, User, ListTodo, Users, Settings, Layers, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { colors, patterns } from '../../utils/darkMode';
import toast from 'react-hot-toast';
import { IndexSelector } from '../index/IndexSelector';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { language, theme, setTheme } = useUIStore();
  const lang = language;
  const isDark = theme === 'dark';

  // Check if user has management access (index_manager or section_coordinator)
  const isManagement = user?.role === 'index_manager' || user?.role === 'section_coordinator' || user?.role === 'admin';

  const menuItems = [
    { id: 'index', path: '/index', icon: Layers, label: { ar: 'إدارة المؤشرات', en: 'Index Management' } },
    { id: 'reports', path: '/reports', icon: BarChart3, label: { ar: 'التقارير', en: 'Reports' } },
    { id: 'requirements', path: '/requirements', icon: CheckSquare, label: { ar: 'المتطلبات', en: 'Requirements' } },
    // Tasks page only visible to management team (index_manager, section_coordinator, admin)
    ...(isManagement ? [{ id: 'tasks', path: '/tasks', icon: ListTodo, label: { ar: 'المهام', en: 'Tasks' } }] : []),
    { id: 'users', path: '/users', icon: Users, label: { ar: 'إدارة المستخدمين', en: 'User Management' } },
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
              {lang === 'ar' ? 'نظام إدارة المؤشرات' : 'Index Management System'}
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
        {/* Header with Index Selector */}
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

        {/* Page Content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
