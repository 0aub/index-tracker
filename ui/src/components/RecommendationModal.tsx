import { useState, useEffect } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { api, Recommendation } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { colors } from '../utils/darkMode';
import toast from 'react-hot-toast';

interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  existingRecommendation?: Recommendation | null;
  onSuccess: () => void;
}

const RecommendationModal = ({
  isOpen,
  onClose,
  requirementId,
  existingRecommendation,
  onSuccess
}: RecommendationModalProps) => {
  const { language } = useUIStore();
  const lang = language;

  const [currentStatus, setCurrentStatus] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingRecommendation) {
      setCurrentStatus(existingRecommendation.current_status_ar);
      setRecommendation(existingRecommendation.recommendation_ar);
    } else {
      setCurrentStatus('');
      setRecommendation('');
    }
  }, [existingRecommendation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentStatus.trim() || !recommendation.trim()) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      if (existingRecommendation) {
        // Update existing
        await api.recommendations.update(existingRecommendation.id, {
          current_status_ar: currentStatus,
          recommendation_ar: recommendation
        });
        toast.success(lang === 'ar' ? 'تم تحديث التوصية بنجاح' : 'Recommendation updated successfully');
      } else {
        // Create new
        await api.recommendations.create({
          requirement_id: requirementId,
          current_status_ar: currentStatus,
          recommendation_ar: recommendation
        });
        toast.success(lang === 'ar' ? 'تم إضافة التوصية بنجاح' : 'Recommendation added successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || (lang === 'ar' ? 'فشل في حفظ التوصية' : 'Failed to save recommendation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className={`${colors.cardBg} rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.primaryLight}`}>
              <FileText className={colors.primaryIcon} size={24} />
            </div>
            <h2 className={`text-xl font-bold ${colors.text}`}>
              {existingRecommendation
                ? (lang === 'ar' ? 'تعديل التوصية' : 'Edit Recommendation')
                : (lang === 'ar' ? 'إضافة توصية' : 'Add Recommendation')
              }
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition ${colors.bgHover}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Status */}
          <div>
            <label className={`block text-sm font-medium ${colors.text} mb-2`}>
              {lang === 'ar' ? 'الوضع الراهن' : 'Current Status'}
              <span className="text-red-500 mr-1">*</span>
            </label>
            <textarea
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder={lang === 'ar' ? 'اكتب الوضع الراهن...' : 'Describe the current status...'}
              required
            />
          </div>

          {/* Recommendation */}
          <div>
            <label className={`block text-sm font-medium ${colors.text} mb-2`}>
              {lang === 'ar' ? 'التوصية' : 'Recommendation'}
              <span className="text-red-500 mr-1">*</span>
            </label>
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={6}
              className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder={lang === 'ar' ? 'اكتب التوصية...' : 'Write your recommendation...'}
              required
            />
          </div>

          {/* Info Note */}
          <div className={`flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border ${colors.border}`}>
            <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {lang === 'ar'
                ? 'هذه التوصية ستكون مرتبطة بالمعيار (Criteria) الخاص بهذا المتطلب'
                : 'This recommendation will be linked to the criteria (sub-domain) of this requirement'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-2.5 rounded-lg font-medium transition ${colors.textSecondary} ${colors.bgHover}`}
              disabled={loading}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                </>
              ) : (
                <span>
                  {existingRecommendation
                    ? (lang === 'ar' ? 'تحديث' : 'Update')
                    : (lang === 'ar' ? 'إضافة' : 'Add')
                  }
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecommendationModal;
