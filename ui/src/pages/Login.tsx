import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { colors, patterns } from '../utils/darkMode';
import { WaveAnimation } from '../components/WaveAnimation';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { language, setLanguage, theme, setTheme } = useUIStore();
  const lang = language;
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      toast.success(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful');

      // Check if user needs to complete first-time setup
      if (result?.is_first_login) {
        navigate('/first-time-setup');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const errorMessage = err.message || (lang === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen grid grid-cols-1 lg:grid-cols-2 ${colors.bgPrimary}`}>
      {/* Left Side - Logo and Animation */}
      <div className={`hidden lg:flex items-center justify-center relative ${colors.bgSecondary} border-r ${colors.border}`}>
        {/* Wave Animation Background */}
        <WaveAnimation />
      </div>

      {/* Right Side - Login Form */}
      <div className={`flex items-center justify-center p-8 relative ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`absolute top-6 ${lang === 'ar' ? 'left-6' : 'right-6'} p-3 rounded-full ${colors.bgSecondary} ${colors.border} border shadow-lg hover:scale-110 transition-all`}
          title={isDark ? (lang === 'ar' ? 'الوضع النهاري' : 'Light Mode') : (lang === 'ar' ? 'الوضع الليلي' : 'Dark Mode')}
        >
          {isDark ? (
            <Sun className={colors.textSecondary} size={24} />
          ) : (
            <Moon className={colors.textSecondary} size={24} />
          )}
        </button>

        <div className="w-full max-w-md">
          {/* Mobile Header - Show logo and title on mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/logo.png" alt="Raqib Logo" className="w-24 h-24 object-contain" />
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'راقب' : 'Raqib'}
            </h1>
            <p className={colors.textSecondary}>
              {lang === 'ar' ? 'المنصة الذكية لإدارة المؤشرات' : 'Index Management System'}
            </p>
          </div>

          {/* Login Card */}
          <div className={`rounded-2xl shadow-xl p-8 ${colors.bgSecondary} border ${colors.border}`}>
            <h2 className={`text-2xl font-bold mb-6 text-center ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <div className="relative">
                  <Mail className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colors.textTertiary}`} size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-4 pr-12 py-3 ${patterns.input}`}
                    placeholder={lang === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter your email'}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colors.textTertiary}`} size={20} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-4 pr-12 py-3 ${patterns.input}`}
                    placeholder={lang === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className={`flex items-start gap-3 p-4 border rounded-lg ${colors.errorLight} border ${colors.error}`}>
                  <AlertCircle className={`flex-shrink-0 mt-0.5 ${colors.error}`} size={20} />
                  <p className={`text-sm ${colors.error}`}>{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 ${patterns.button} font-semibold focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading
                  ? (lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging in...')
                  : (lang === 'ar' ? 'تسجيل الدخول' : 'Login')}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className={`mt-8 text-center text-sm ${colors.textTertiary}`}>
            {lang === 'ar' ? '© 2025 جميع الحقوق محفوظة' : '© 2025 All Rights Reserved'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
