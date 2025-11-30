import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../utils/darkMode';
import { WaveAnimation } from '../components/WaveAnimation';

const Home = () => {
  const { language } = useUIStore();
  const { user } = useAuthStore();
  const lang = language;

  return (
    <div className="h-screen flex items-center justify-center relative">
      {/* Animated Wave Background */}
      <WaveAnimation />

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Animated Logo */}
        <div className="mb-6">
          <img
            src="/logo.png"
            alt="Raqib Logo"
            className="w-32 h-32 object-contain mx-auto animate-pulse"
          />
        </div>

        {/* Title */}
        <h2 className={`text-3xl font-bold mb-3 ${colors.textPrimary}`}>
          {lang === 'ar' ? 'راقب' : 'Raqib'}
        </h2>

        {/* Subtitle */}
        <p className={`text-xl mb-6 ${colors.textSecondary}`}>
          {lang === 'ar' ? 'المنصة الذكية لإدارة المؤشرات' : 'Index Management System'}
        </p>

        {/* Welcome Message */}
        <div className={`max-w-md mx-auto p-4 rounded-lg ${colors.bgSecondary} border ${colors.border}`}>
          <p className={`text-lg ${colors.textPrimary}`}>
            {lang === 'ar' ? `مرحباً، ${user?.name}` : `Welcome, ${user?.name_en || user?.name}`}
          </p>
          <p className={`text-sm mt-2 ${colors.textTertiary}`}>
            {lang === 'ar'
              ? 'استخدم القائمة الجانبية للتنقل بين أقسام النظام'
              : 'Use the sidebar to navigate through the system'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
