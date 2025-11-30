import { useState } from 'react';
import { User, Globe, Bell, Shield, Save } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { colors, patterns } from '../utils/darkMode';
import toast from 'react-hot-toast';

// Role translation helper
const getRoleLabel = (role: string | undefined, language: 'ar' | 'en'): string => {
  if (!role) return '-';

  const roleLabels: Record<string, { ar: string; en: string }> = {
    'ADMIN': { ar: 'مدير النظام', en: 'Admin' },
    'INDEX_MANAGER': { ar: 'مدير المؤشر', en: 'Index Manager' },
    'SECTION_COORDINATOR': { ar: 'منسق القسم', en: 'Section Coordinator' },
    'CONTRIBUTOR': { ar: 'مساهم', en: 'Contributor' },
    'UNASSIGNED': { ar: 'غير مخصص', en: 'Unassigned' },
  };

  return roleLabels[role]?.[language] || role;
};

const Settings = () => {
  const { language, setLanguage } = useUIStore();
  const { user } = useAuthStore();
  const lang = language;

  const [settings, setSettings] = useState({
    language: language,
    emailNotifications: true,
    taskReminders: true,
    weeklyReport: false
  });

  const handleSave = () => {
    setLanguage(settings.language);
    toast.success(lang === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
  };

  return (
    <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${colors.textPrimary}`}>
            {lang === 'ar' ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className={`${colors.textSecondary} mt-2`}>
            {lang === 'ar' ? 'إدارة إعدادات حسابك والنظام' : 'Manage your account and system preferences'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className={`${patterns.section} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 ${colors.primaryLight} rounded-full flex items-center justify-center`}>
                <User className={colors.primaryIcon} size={20} />
              </div>
              <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'معلومات الحساب' : 'Profile Information'}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                    {lang === 'ar' ? 'الاسم' : 'Name'}
                  </label>
                  <input
                    type="text"
                    value={lang === 'ar' ? user?.name : user?.name_en}
                    disabled
                    className={`w-full px-4 py-2 border ${colors.inputBorder} rounded-lg ${colors.bgTertiary} ${colors.textSecondary}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                    {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className={`w-full px-4 py-2 border ${colors.inputBorder} rounded-lg ${colors.bgTertiary} ${colors.textSecondary}`}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                    {lang === 'ar' ? 'الدور' : 'Role'}
                  </label>
                  <input
                    type="text"
                    value={getRoleLabel(user?.role, lang)}
                    disabled
                    className={`w-full px-4 py-2 border ${colors.inputBorder} rounded-lg ${colors.bgTertiary} ${colors.textSecondary}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                    {lang === 'ar' ? 'القسم' : 'Department'}
                  </label>
                  <input
                    type="text"
                    value={lang === 'ar' ? (user?.department_ar || '-') : (user?.department_en || user?.department_ar || '-')}
                    disabled
                    className={`w-full px-4 py-2 border ${colors.inputBorder} rounded-lg ${colors.bgTertiary} ${colors.textSecondary}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Language Preferences */}
          <div className={`${patterns.section} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 ${colors.primaryLight} rounded-full flex items-center justify-center`}>
                <Globe className={colors.primaryIcon} size={20} />
              </div>
              <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'اللغة والمنطقة' : 'Language & Region'}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                  {lang === 'ar' ? 'اللغة المفضلة' : 'Preferred Language'}
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value as 'ar' | 'en' })}
                  className={`w-full px-4 py-2 ${patterns.select}`}
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className={`p-4 ${colors.successLight} border ${colors.primaryBorder} rounded-lg`}>
                <p className={`text-sm ${colors.primaryText}`}>
                  {lang === 'ar'
                    ? 'سيتم تطبيق تغيير اللغة على جميع صفحات النظام'
                    : 'Language changes will be applied across all system pages'}
                </p>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className={`${patterns.section} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 ${colors.warningLight} rounded-full flex items-center justify-center`}>
                <Bell className={colors.warning} size={20} />
              </div>
              <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
              </h2>
            </div>

            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 border ${colors.border} rounded-lg`}>
                <div>
                  <h3 className={`font-medium ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    {lang === 'ar' ? 'تلقي إشعارات عن الأحداث المهمة' : 'Receive notifications about important events'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className={`w-5 h-5 ${colors.primaryText} ${colors.inputBorder} rounded ${colors.focusRing}`}
                />
              </div>

              <div className={`flex items-center justify-between p-4 border ${colors.border} rounded-lg`}>
                <div>
                  <h3 className={`font-medium ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'تذكير المهام' : 'Task Reminders'}
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    {lang === 'ar' ? 'تلقي تذكير بالمهام قبل موعدها النهائي' : 'Receive reminders about upcoming task deadlines'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.taskReminders}
                  onChange={(e) => setSettings({ ...settings, taskReminders: e.target.checked })}
                  className={`w-5 h-5 ${colors.primaryText} ${colors.inputBorder} rounded ${colors.focusRing}`}
                />
              </div>

              <div className={`flex items-center justify-between p-4 border ${colors.border} rounded-lg`}>
                <div>
                  <h3 className={`font-medium ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'التقرير الأسبوعي' : 'Weekly Report'}
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    {lang === 'ar' ? 'تلقي تقرير أسبوعي عن التقدم' : 'Receive weekly progress reports'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.weeklyReport}
                  onChange={(e) => setSettings({ ...settings, weeklyReport: e.target.checked })}
                  className={`w-5 h-5 ${colors.primaryText} ${colors.inputBorder} rounded ${colors.focusRing}`}
                />
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className={`${patterns.section} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 ${colors.infoLight} rounded-full flex items-center justify-center`}>
                <Shield className={colors.info} size={20} />
              </div>
              <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'معلومات النظام' : 'System Information'}
              </h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className={`flex justify-between py-2 border-b ${colors.border}`}>
                <span className={colors.textSecondary}>{lang === 'ar' ? 'الإصدار' : 'Version'}</span>
                <span className={`font-medium ${colors.textPrimary}`}>1.0.0</span>
              </div>
              <div className={`flex justify-between py-2 border-b ${colors.border}`}>
                <span className={colors.textSecondary}>{lang === 'ar' ? 'آخر تسجيل دخول' : 'Last Login'}</span>
                <span className={`font-medium ${colors.textPrimary}`}>
                  {user?.last_login ? new Date(user.last_login).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US') : '-'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className={colors.textSecondary}>{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</span>
                <span className={`font-medium ${colors.textPrimary}`}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US') : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-3 ${patterns.button} font-medium`}
            >
              <Save size={20} />
              <span>{lang === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
