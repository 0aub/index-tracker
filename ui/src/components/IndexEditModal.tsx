import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { colors, patterns } from '../utils/darkMode';
import { Index } from '../services/api';

interface IndexEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name_ar?: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }) => void;
  index: Index;
  language: 'ar' | 'en';
}

const IndexEditModal = ({
  isOpen,
  onClose,
  onSave,
  index,
  language
}: IndexEditModalProps) => {
  const lang = language;

  const [formData, setFormData] = useState({
    name_ar: index.name_ar,
    name_en: index.name_en || '',
    description_ar: index.description_ar || '',
    description_en: index.description_en || '',
    status: index.status,
    start_date: index.start_date ? new Date(index.start_date).toISOString().split('T')[0] : '',
    end_date: index.end_date ? new Date(index.end_date).toISOString().split('T')[0] : ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name_ar: index.name_ar,
        name_en: index.name_en || '',
        description_ar: index.description_ar || '',
        description_en: index.description_en || '',
        status: index.status,
        start_date: index.start_date ? new Date(index.start_date).toISOString().split('T')[0] : '',
        end_date: index.end_date ? new Date(index.end_date).toISOString().split('T')[0] : ''
      });
    }
  }, [isOpen, index]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: any = {};
    if (formData.name_ar !== index.name_ar) updates.name_ar = formData.name_ar;
    if (formData.name_en !== (index.name_en || '')) updates.name_en = formData.name_en || null;
    if (formData.description_ar !== (index.description_ar || '')) updates.description_ar = formData.description_ar || null;
    if (formData.description_en !== (index.description_en || '')) updates.description_en = formData.description_en || null;
    if (formData.status !== index.status) updates.status = formData.status;

    // Handle dates
    const oldStartDate = index.start_date ? new Date(index.start_date).toISOString().split('T')[0] : '';
    const oldEndDate = index.end_date ? new Date(index.end_date).toISOString().split('T')[0] : '';

    if (formData.start_date !== oldStartDate) {
      updates.start_date = formData.start_date ? new Date(formData.start_date).toISOString() : null;
    }
    if (formData.end_date !== oldEndDate) {
      updates.end_date = formData.end_date ? new Date(formData.end_date).toISOString() : null;
    }

    onSave(updates);
    onClose();
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      not_started: { ar: 'لم يبدأ', en: 'Not Started' },
      in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      archived: { ar: 'مؤرشف', en: 'Archived' },
    };
    return labels[status as keyof typeof labels]?.[lang] || status;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${colors.bgPrimary} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border} sticky top-0 ${colors.bgPrimary} z-10`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${colors.primaryLight} rounded-lg flex items-center justify-center`}>
              <Save className={colors.primaryIcon} size={20} />
            </div>
            <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تعديل المؤشر' : 'Edit Index'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 ${colors.textSecondary} hover:${colors.bgHover} rounded-lg transition`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Index Code (Read-only) */}
          <div>
            <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'رمز المؤشر' : 'Index Code'}
            </label>
            <input
              type="text"
              value={index.code}
              disabled
              className={`w-full px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg ${colors.textSecondary} cursor-not-allowed`}
            />
          </div>

          {/* Arabic Name */}
          <div>
            <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'الاسم بالعربي' : 'Name (Arabic)'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              required
              className={`w-full px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg ${colors.textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* English Name */}
          <div>
            <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'الاسم بالإنجليزي' : 'Name (English)'}
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className={`w-full px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg ${colors.textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Arabic Description */}
          <div>
            <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'الوصف بالعربي' : 'Description (Arabic)'}
            </label>
            <textarea
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              rows={3}
              className={`w-full px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg ${colors.textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* English Description */}
          <div>
            <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'الوصف بالإنجليزي' : 'Description (English)'}
            </label>
            <textarea
              value={formData.description_en}
              onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
              rows={3}
              className={`w-full px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg ${colors.textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Status */}
          <div>
            <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'حالة المؤشر' : 'Index Status'}
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className={`w-full px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg ${colors.textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="not_started">{getStatusLabel('not_started')}</option>
              <option value="in_progress">{getStatusLabel('in_progress')}</option>
              <option value="completed">{getStatusLabel('completed')}</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={`w-full px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg ${colors.textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {/* End Date */}
            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className={`w-full px-4 py-2 ${colors.bgSecondary} border ${colors.border} rounded-lg ${colors.textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex items-center justify-end gap-3 pt-4 border-t ${colors.border}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-2.5 ${colors.bgSecondary} border ${colors.border} ${colors.textPrimary} rounded-lg hover:${colors.bgHover} transition font-medium`}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 ${patterns.button} font-medium`}
            >
              {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndexEditModal;
