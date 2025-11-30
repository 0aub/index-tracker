import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { Requirement } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import { colors, patterns } from '../../utils/darkMode';

interface DeleteRequirementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (force: boolean) => Promise<void>;
  requirement: Requirement | null;
  hasData?: {
    has_answer: boolean;
    evidence_count: number;
    recommendation_count: number;
  } | null;
}

export const DeleteRequirementDialog: React.FC<DeleteRequirementDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  requirement,
  hasData,
}) => {
  const { language } = useUIStore();
  const lang = language;
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      // If requirement has data and user didn't check the box, don't proceed
      if (hasData && !confirmChecked) {
        return;
      }

      // Pass force=true if requirement has data
      await onConfirm(!!hasData);
      onClose();
      setConfirmChecked(false);
    } catch (error) {
      console.error('Failed to delete requirement:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !requirement) return null;

  const requiresConfirmation = hasData && (hasData.has_answer || hasData.evidence_count > 0 || hasData.recommendation_count > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`${colors.bgPrimary} rounded-lg shadow-xl max-w-md w-full`}>
        {/* Header */}
        <div className={`bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-6 py-4 flex justify-between items-center rounded-t-lg`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            <h2 className="text-xl font-bold text-red-900 dark:text-red-100">
              {lang === 'ar' ? 'حذف المتطلب' : 'Delete Requirement'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition"
          >
            <X size={20} className="text-red-900 dark:text-red-100" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className={colors.textPrimary}>
            {lang === 'ar'
              ? `هل أنت متأكد من حذف المتطلب "${requirement.code}"؟`
              : `Are you sure you want to delete requirement "${requirement.code}"?`}
          </p>

          <div className={`${colors.bgSecondary} rounded-lg p-3`}>
            <p className={`text-sm font-medium ${colors.textPrimary}`}>
              {lang === 'ar' ? 'السؤال:' : 'Question:'}
            </p>
            <p className={`text-sm ${colors.textSecondary} mt-1`}>
              {requirement.question_ar}
            </p>
          </div>

          {/* Warning if requirement has data */}
          {requiresConfirmation && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    {lang === 'ar' ? 'تحذير: هذا المتطلب يحتوي على بيانات' : 'Warning: This requirement contains data'}
                  </p>
                  <ul className="text-sm text-yellow-800 dark:text-yellow-200 mt-2 space-y-1">
                    {hasData?.has_answer && (
                      <li>• {lang === 'ar' ? 'يحتوي على إجابة' : 'Contains an answer'}</li>
                    )}
                    {hasData && hasData.evidence_count > 0 && (
                      <li>
                        • {lang === 'ar'
                          ? `يحتوي على ${hasData.evidence_count} من الأدلة`
                          : `Contains ${hasData.evidence_count} evidence items`}
                      </li>
                    )}
                    {hasData && hasData.recommendation_count > 0 && (
                      <li>
                        • {lang === 'ar'
                          ? `يحتوي على ${hasData.recommendation_count} من التوصيات`
                          : `Contains ${hasData.recommendation_count} recommendations`}
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Confirmation checkbox */}
              <div className="flex items-start gap-3 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                <input
                  type="checkbox"
                  id="confirm-delete"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-0.5"
                />
                <label htmlFor="confirm-delete" className="text-sm font-medium text-yellow-900 dark:text-yellow-100 cursor-pointer">
                  {lang === 'ar'
                    ? 'أفهم أن حذف هذا المتطلب سيؤدي إلى حذف جميع البيانات المرتبطة به بشكل دائم'
                    : 'I understand that deleting this requirement will permanently delete all associated data'}
                </label>
              </div>
            </div>
          )}

          {/* Simple warning if no data */}
          {!requiresConfirmation && (
            <div className={`${colors.bgSecondary} rounded-lg p-3`}>
              <p className={`text-sm ${colors.textSecondary}`}>
                {lang === 'ar'
                  ? 'لا توجد بيانات مرتبطة بهذا المتطلب. سيتم حذفه بشكل نهائي.'
                  : 'No data is associated with this requirement. It will be permanently deleted.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${colors.bgSecondary} px-6 py-4 flex justify-end gap-3 rounded-b-lg border-t border-[rgb(var(--color-border))]`}>
          <button
            onClick={onClose}
            disabled={deleting}
            className={patterns.buttonSecondary}
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting || (requiresConfirmation && !confirmChecked)}
            className={`px-4 py-2 rounded-lg transition font-medium flex items-center gap-2 ${
              deleting || (requiresConfirmation && !confirmChecked)
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {deleting && <Loader2 size={16} className="animate-spin" />}
            {lang === 'ar' ? 'حذف' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
