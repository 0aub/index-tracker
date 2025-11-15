import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { colors, patterns } from '../utils/darkMode';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { language, setLanguage, theme } = useUIStore();
  const lang = language;
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast.success(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.message || (lang === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${lang === 'ar' ? 'rtl' : 'ltr'} ${
      isDark ? 'bg-gradient-to-br from-[#212224] to-[#1d2e28]' : 'bg-gradient-to-br from-blue-50 to-blue-100'
    }`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Raqib Logo" className="w-24 h-24 object-contain" />
          </div>
          <h1 className={`text-4xl font-bold mb-2 ${colors.textPrimary}`}>
            {lang === 'ar' ? 'راقب' : 'Raqib'}
          </h1>
          <p className={colors.textSecondary}>
            {lang === 'ar' ? 'نظام إدارة المؤشرات' : 'Index Management System'}
          </p>
        </div>

        {/* Login Card */}
        <div className={`rounded-2xl shadow-xl p-8 ${colors.bgSecondary}`}>
          <h2 className={`text-2xl font-bold mb-6 text-center ${colors.textPrimary}`}>
            {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </h2>

          {/* Demo Credentials Info */}
          <div className={`mb-6 p-4 border rounded-lg ${colors.infoLight} border ${colors.info}`}>
            <p className={`text-sm font-medium mb-2 ${colors.info}`}>
              {lang === 'ar' ? 'بيانات الدخول التجريبية:' : 'Demo Credentials:'}
            </p>
            <p className={`text-sm font-mono ${colors.info}`}>
              admin@sdaia.gov.sa<br />
              Admin@2025
            </p>
          </div>

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
              className={`w-full py-3 px-4 ${colors.infoBg} text-white rounded-lg font-semibold hover:opacity-90 focus:outline-none ${colors.focusRing} transition disabled:opacity-50 disabled:cursor-not-allowed`}
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
  );
};

export default Login;
