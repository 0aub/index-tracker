import { useState, useEffect } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { colors } from '../utils/darkMode';
import toast from 'react-hot-toast';

interface GroupRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  indexId: string;
  mainAreas: Array<{ ar: string; en?: string }>;
  elements: Array<{ ar: string; en?: string }>;
  subDomains: Array<{ ar: string; en?: string }>;
  onSuccess: () => void;
}

const GroupRecommendationModal = ({
  isOpen,
  onClose,
  indexId,
  mainAreas,
  elements,
  subDomains,
  onSuccess
}: GroupRecommendationModalProps) => {
  const { language } = useUIStore();
  const lang = language;

  const [mainAreaAr, setMainAreaAr] = useState('');
  const [elementAr, setElementAr] = useState('');
  const [subDomainAr, setSubDomainAr] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setMainAreaAr('');
      setElementAr('');
      setSubDomainAr('');
      setCurrentStatus('');
      setRecommendation('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mainAreaAr.trim() || !elementAr.trim() || !subDomainAr.trim()) {
      toast.error(lang === 'ar' ? 'يرجى اختيار المحور والعنصر والمعيار' : 'Please select main area, element and criteria');
      return;
    }

    if (!currentStatus.trim() || !recommendation.trim()) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await api.recommendations.createForGroup({
        index_id: indexId,
        main_area_ar: mainAreaAr,
        element_ar: elementAr,
        sub_domain_ar: subDomainAr,
        current_status_ar: currentStatus,
        recommendation_ar: recommendation
      });

      toast.success(
        lang === 'ar'
          ? `تم إضافة التوصية بنجاح لـ ${response.requirements_count} متطلب`
          : `Recommendation added successfully for ${response.requirements_count} requirements`
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || (lang === 'ar' ? 'فشل في حفظ التوصية' : 'Failed to save recommendation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`${colors.bgSecondary} rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.primaryLight}`}>
              <FileText className={colors.primaryIcon} size={24} />
            </div>
            <h2 className={`text-xl font-bold ${colors.text}`}>
              {lang === 'ar' ? 'إضافة توصية لمجموعة' : 'Add Group Recommendation'}
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
          {/* Main Area, Element, and Criteria in one row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main Area */}
            <div>
              <label className={`block text-sm font-medium ${colors.text} mb-2`}>
                {lang === 'ar' ? 'المحور الأساسي' : 'Main Area'}
                <span className="text-red-500 mr-1">*</span>
              </label>
              <select
                value={mainAreaAr}
                onChange={(e) => {
                  setMainAreaAr(e.target.value);
                  setElementAr('');
                  setSubDomainAr('');
                }}
                className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
              >
                <option value="">{lang === 'ar' ? 'اختر المحور الأساسي' : 'Select main area'}</option>
                {mainAreas.map((area, idx) => (
                  <option key={idx} value={area.ar}>{area.ar}</option>
                ))}
              </select>
            </div>

            {/* Element */}
            <div>
              <label className={`block text-sm font-medium ${colors.text} mb-2`}>
                {lang === 'ar' ? 'العنصر' : 'Element'}
                <span className="text-red-500 mr-1">*</span>
              </label>
              <select
                value={elementAr}
                onChange={(e) => {
                  setElementAr(e.target.value);
                  setSubDomainAr('');
                }}
                disabled={!mainAreaAr}
                className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 ${!mainAreaAr ? 'opacity-50 cursor-not-allowed' : ''}`}
                required
              >
                <option value="">{lang === 'ar' ? 'اختر العنصر' : 'Select element'}</option>
                {elements
                  .filter(el => !mainAreaAr || el.ar) // Show all if no filtering needed
                  .map((element, idx) => (
                    <option key={idx} value={element.ar}>{element.ar}</option>
                  ))}
              </select>
            </div>

            {/* Criteria (sub_domain) */}
            <div>
              <label className={`block text-sm font-medium ${colors.text} mb-2`}>
                {lang === 'ar' ? 'المعيار' : 'Criteria'}
                <span className="text-red-500 mr-1">*</span>
              </label>
              <select
                value={subDomainAr}
                onChange={(e) => setSubDomainAr(e.target.value)}
                disabled={!elementAr}
                className={`w-full px-4 py-3 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500 ${!elementAr ? 'opacity-50 cursor-not-allowed' : ''}`}
                required
              >
                <option value="">{lang === 'ar' ? 'اختر المعيار' : 'Select criteria'}</option>
                {subDomains
                  .filter(sd => !elementAr || sd.ar) // Show all if no filtering needed
                  .map((subdomain, idx) => (
                    <option key={idx} value={subdomain.ar}>{subdomain.ar}</option>
                  ))}
              </select>
            </div>
          </div>

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
          <div className={`flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border ${colors.border}`}>
            <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {lang === 'ar'
                ? 'سيتم تطبيق هذه التوصية على جميع المتطلبات التي تطابق المحور والعنصر والمعيار المختارة'
                : 'This recommendation will be applied to ALL requirements matching the selected main area, element and criteria'
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
                <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupRecommendationModal;
