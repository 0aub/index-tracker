import { useNavigate } from 'react-router-dom';
import { ServerCrash, Home, RefreshCw } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

const ServerError = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const lang = language;

  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-8xl font-bold text-orange-600 mb-4">500</div>
          <ServerCrash className="mx-auto text-orange-400 mb-4" size={64} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {lang === 'ar' ? 'خطأ في الخادم' : 'Server Error'}
          </h1>
          <p className="text-gray-600 mb-8">
            {lang === 'ar'
              ? 'عذراً، حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً'
              : 'Sorry, something went wrong on our end. Please try again later'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <RefreshCw size={20} />
            <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Try Again'}</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            <Home size={20} />
            <span>{lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerError;
