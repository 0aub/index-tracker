/**
 * Index Actions Panel - Complete index and upload recommendations
 */
import React, { useState, useRef } from 'react';
import { CheckCircle2, Upload, Download, Loader2, AlertCircle, FileSpreadsheet, X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useIndexStore } from '../../stores/indexStore';
import { api, Index, RecommendationUploadResult } from '../../services/api';
import { toast } from 'react-hot-toast';
import { colors } from '../../utils/darkMode';

interface IndexActionsPanelProps {
  onIndexUpdated?: (index: Index) => void;
}

export const IndexActionsPanel: React.FC<IndexActionsPanelProps> = ({ onIndexUpdated }) => {
  const { language } = useUIStore();
  const lang = language;
  const { currentIndex, setCurrentIndex } = useIndexStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [completingIndex, setCompletingIndex] = useState(false);
  const [uploadingRecommendations, setUploadingRecommendations] = useState(false);
  const [uploadResult, setUploadResult] = useState<RecommendationUploadResult | null>(null);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);

  if (!currentIndex) {
    return null;
  }

  const handleCompleteIndex = async () => {
    if (!currentIndex) return;

    try {
      setCompletingIndex(true);
      const updatedIndex = await api.indices.complete(currentIndex.id);
      setCurrentIndex(updatedIndex);
      onIndexUpdated?.(updatedIndex);
      setShowConfirmComplete(false);
      toast.success(
        lang === 'ar'
          ? 'تم اكتمال المؤشر بنجاح'
          : 'Index marked as completed successfully'
      );
    } catch (error) {
      console.error('Failed to complete index:', error);
      toast.error(
        lang === 'ar'
          ? 'فشل في إكمال المؤشر'
          : 'Failed to complete index'
      );
    } finally {
      setCompletingIndex(false);
    }
  };

  const handleDownloadTemplate = () => {
    const url = api.recommendations.getTemplateUrl();
    window.open(url, '_blank');
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentIndex) return;

    try {
      setUploadingRecommendations(true);
      const result = await api.recommendations.upload(currentIndex.id, file);
      setUploadResult(result);
      toast.success(
        lang === 'ar'
          ? `تم رفع ${result.created} توصية جديدة`
          : `Uploaded ${result.created} new recommendations`
      );
    } catch (error) {
      console.error('Failed to upload recommendations:', error);
      toast.error(
        lang === 'ar'
          ? 'فشل في رفع التوصيات'
          : 'Failed to upload recommendations'
      );
    } finally {
      setUploadingRecommendations(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`${colors.bgSecondary} border ${colors.border} rounded-lg p-4`}>
      <h3 className={`text-sm font-medium ${colors.textPrimary} mb-4`}>
        {lang === 'ar' ? 'إجراءات المؤشر' : 'Index Actions'}
      </h3>

      {/* Index Status */}
      <div className={`flex items-center gap-2 mb-4 text-sm ${colors.textSecondary}`}>
        {currentIndex.is_completed ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400">
              {lang === 'ar' ? 'مكتمل' : 'Completed'}
            </span>
            {currentIndex.completed_at && (
              <span className={colors.textTertiary}>
                ({new Date(currentIndex.completed_at).toLocaleDateString()})
              </span>
            )}
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-600 dark:text-yellow-400">
              {lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Complete Index Button - Only show if not completed */}
        {!currentIndex.is_completed && (
          <>
            {showConfirmComplete ? (
              <div className={`p-3 ${colors.bgTertiary} rounded-lg`}>
                <p className={`text-sm ${colors.textSecondary} mb-3`}>
                  {lang === 'ar'
                    ? 'هل أنت متأكد من إكمال هذا المؤشر؟ لن تتمكن من التراجع عن هذا الإجراء.'
                    : 'Are you sure you want to complete this index? This action cannot be undone.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCompleteIndex}
                    disabled={completingIndex}
                    className={`flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm`}
                  >
                    {completingIndex ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {lang === 'ar' ? 'تأكيد الإكمال' : 'Confirm Complete'}
                  </button>
                  <button
                    onClick={() => setShowConfirmComplete(false)}
                    className={`px-3 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg hover:${colors.bgHover} text-sm ${colors.textSecondary}`}
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmComplete(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {lang === 'ar' ? 'إكمال المؤشر' : 'Complete Index'}
              </button>
            )}
          </>
        )}

        {/* Recommendations Section - Only show for completed indices */}
        {currentIndex.is_completed && (
          <div className={`border-t ${colors.border} pt-4 mt-4`}>
            <h4 className={`text-sm font-medium ${colors.textPrimary} mb-3`}>
              {lang === 'ar' ? 'توصيات التقييم' : 'Evaluation Recommendations'}
            </h4>

            {/* Download Template */}
            <button
              onClick={handleDownloadTemplate}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 ${colors.bgTertiary} border ${colors.border} rounded-lg hover:${colors.bgHover} transition-colors text-sm ${colors.textSecondary} mb-2`}
            >
              <Download className="w-4 h-4" />
              {lang === 'ar' ? 'تحميل قالب التوصيات' : 'Download Template'}
            </button>

            {/* Upload Recommendations */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={triggerFileUpload}
              disabled={uploadingRecommendations}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium`}
            >
              {uploadingRecommendations ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {lang === 'ar' ? 'رفع التوصيات' : 'Upload Recommendations'}
            </button>

            {/* Upload Result */}
            {uploadResult && (
              <div className={`mt-4 p-3 ${colors.bgTertiary} rounded-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <h5 className={`text-sm font-medium ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'نتيجة الرفع' : 'Upload Result'}
                  </h5>
                  <button
                    onClick={() => setUploadResult(null)}
                    className={`p-1 ${colors.textTertiary} hover:${colors.textSecondary}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className={`text-sm ${colors.textSecondary} space-y-1`}>
                  <div className="flex justify-between">
                    <span>{lang === 'ar' ? 'إجمالي الصفوف:' : 'Total rows:'}</span>
                    <span>{uploadResult.total_rows}</span>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>{lang === 'ar' ? 'تم التطابق:' : 'Matched:'}</span>
                    <span>{uploadResult.matched}</span>
                  </div>
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span>{lang === 'ar' ? 'تم الإنشاء:' : 'Created:'}</span>
                    <span>{uploadResult.created}</span>
                  </div>
                  {uploadResult.unmatched > 0 && (
                    <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                      <span>{lang === 'ar' ? 'غير متطابق:' : 'Unmatched:'}</span>
                      <span>{uploadResult.unmatched}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IndexActionsPanel;
