import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { colors, patterns } from '../utils/darkMode';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  indexName: string;
  indexCode: string;
  language: 'ar' | 'en';
}

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  indexName,
  indexCode,
  language
}: DeleteConfirmModalProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [codeInput, setCodeInput] = useState('');
  const lang = language;

  if (!isOpen) return null;

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleSecondConfirm = () => {
    if (codeInput === indexCode) {
      onConfirm();
      handleClose();
    }
  };

  const handleClose = () => {
    setStep(1);
    setCodeInput('');
    onClose();
  };

  const isCodeValid = codeInput === indexCode;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${colors.bgPrimary} rounded-2xl shadow-2xl max-w-md w-full`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 ${colors.textSecondary} hover:${colors.bgHover} rounded-lg transition`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <>
              <p className={`${colors.textPrimary} mb-4`}>
                {lang === 'ar'
                  ? `هل أنت متأكد من حذف المؤشر "${indexName}"؟`
                  : `Are you sure you want to delete the index "${indexName}"?`}
              </p>
              <p className={`text-sm ${colors.textSecondary} mb-6`}>
                {lang === 'ar'
                  ? 'سيتم أرشفة المؤشر ولن يمكن استرجاعه بسهولة. جميع البيانات المرتبطة به ستبقى ولكن لن تكون متاحة للاستخدام.'
                  : 'The index will be archived and cannot be easily recovered. All associated data will remain but will not be available for use.'}
              </p>
            </>
          ) : (
            <>
              <p className={`${colors.textPrimary} mb-4`}>
                {lang === 'ar'
                  ? 'لتأكيد الحذف، الرجاء كتابة رمز المؤشر:'
                  : 'To confirm deletion, please type the index code:'}
              </p>
              <div className={`mb-4 p-3 ${colors.bgSecondary} rounded-lg border ${colors.border}`}>
                <p className={`text-lg font-mono font-bold ${colors.primaryText} text-center`}>
                  {indexCode}
                </p>
              </div>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder={lang === 'ar' ? 'اكتب رمز المؤشر هنا' : 'Type the index code here'}
                className={`w-full px-4 py-3 ${colors.bgSecondary} border ${colors.border} rounded-lg ${colors.textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
                autoFocus
              />
              {codeInput && !isCodeValid && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                  {lang === 'ar'
                    ? 'الرمز المدخل غير صحيح'
                    : 'The code entered is incorrect'}
                </p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${colors.border}`}>
          <button
            onClick={handleClose}
            className={`px-6 py-2.5 ${colors.bgSecondary} border ${colors.border} ${colors.textPrimary} rounded-lg hover:${colors.bgHover} transition font-medium`}
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          {step === 1 ? (
            <button
              onClick={handleFirstConfirm}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
            >
              {lang === 'ar' ? 'متابعة' : 'Continue'}
            </button>
          ) : (
            <button
              onClick={handleSecondConfirm}
              disabled={!isCodeValid}
              className={`px-6 py-2.5 rounded-lg transition font-medium ${
                isCodeValid
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {lang === 'ar' ? 'حذف المؤشر' : 'Delete Index'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
