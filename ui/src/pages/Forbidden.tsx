import { useNavigate } from 'react-router-dom';
import { ShieldOff, Home } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { colors, patterns } from '../utils/darkMode';

const Forbidden = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const lang = language;

  return (
    <div className={`min-h-screen ${colors.bgPrimary} flex items-center justify-center p-4 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-8xl font-bold text-red-600 dark:text-red-400 mb-4">403</div>
          <ShieldOff className="mx-auto text-red-500 dark:text-red-400 mb-4" size={64} />
          <h1 className={`text-3xl font-bold mb-2 ${colors.textPrimary}`}>
            {lang === 'ar' ? 'غير مصرح بالدخول' : 'Access Forbidden'}
          </h1>
          <p className={`mb-8 ${colors.textSecondary}`}>
            {lang === 'ar'
              ? 'عذراً، ليس لديك صلاحية للوصول إلى هذه الصفحة'
              : 'Sorry, you do not have permission to access this page'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 ${patterns.button}`}
          >
            <Home size={20} />
            <span>{lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
