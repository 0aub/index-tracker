import { useNavigate } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

const NotFound = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const lang = language;

  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-8xl font-bold text-blue-600 mb-4">404</div>
          <Search className="mx-auto text-gray-400 mb-4" size={64} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {lang === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}
          </h1>
          <p className="text-gray-600 mb-8">
            {lang === 'ar'
              ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها'
              : 'Sorry, the page you are looking for does not exist or has been moved'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Home size={20} />
            <span>{lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            {lang === 'ar' ? 'العودة للصفحة السابقة' : 'Go Back'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
