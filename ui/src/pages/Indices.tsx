import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Edit, Trash2, CheckSquare, TrendingUp, Loader2, AlertCircle, FileText } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useIndexStore } from '../stores/indexStore';
import { colors, patterns } from '../utils/darkMode';
import toast from 'react-hot-toast';
import { api, Index } from '../services/api';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import IndexEditModal from '../components/IndexEditModal';

const Indices = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const { user } = useAuthStore();
  const { setCurrentIndex } = useIndexStore();
  const lang = language;

  const [indices, setIndices] = useState<Index[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<Index | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [indexToEdit, setIndexToEdit] = useState<Index | null>(null);

  // Load indices on mount
  useEffect(() => {
    loadIndices();
  }, []);

  const loadIndices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.indices.getAll({
        organization_id: user?.organizationId,
      });
      setIndices(data);
    } catch (err: any) {
      console.error('Failed to load indices:', err);
      setError(err.message || 'Failed to load indices');
      toast.error(lang === 'ar' ? 'فشل تحميل المؤشرات' : 'Failed to load indices');
    } finally {
      setLoading(false);
    }
  };

  const handleViewIndex = (index: Index) => {
    setCurrentIndex(index);
    navigate('/requirements');
    toast.success(lang === 'ar' ? 'تم اختيار المؤشر' : 'Index selected');
  };

  const handleAddIndex = () => {
    navigate('/index/new');
  };

  const handleEditIndex = (index: Index) => {
    setIndexToEdit(index);
    setEditModalOpen(true);
  };

  const handleSaveIndex = async (updates: any) => {
    if (!indexToEdit) return;

    try {
      await api.indices.update(indexToEdit.id, updates);
      toast.success(lang === 'ar' ? 'تم تحديث المؤشر بنجاح' : 'Index updated successfully');
      loadIndices(); // Reload list
    } catch (err: any) {
      console.error('Failed to update index:', err);
      toast.error(
        lang === 'ar'
          ? `فشل تحديث المؤشر: ${err.message}`
          : `Failed to update index: ${err.message}`
      );
    }
  };

  const handleDeleteIndex = (index: Index) => {
    setIndexToDelete(index);
    setDeleteModalOpen(true);
  };

  const confirmDeleteIndex = async () => {
    if (!indexToDelete) return;

    try {
      await api.indices.delete(indexToDelete.id);
      toast.success(lang === 'ar' ? 'تم حذف المؤشر' : 'Index deleted');
      loadIndices(); // Reload list
    } catch (err: any) {
      console.error('Failed to delete index:', err);
      toast.error(
        lang === 'ar'
          ? `فشل حذف المؤشر: ${err.message}`
          : `Failed to delete index: ${err.message}`
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      not_started: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      in_progress: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      completed: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      archived: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
    };
    return statusColors[status as keyof typeof statusColors] || statusColors.not_started;
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className={`w-12 h-12 animate-spin ${colors.primary} mx-auto mb-4`} />
          <p className={colors.textSecondary}>
            {lang === 'ar' ? 'جاري تحميل المؤشرات...' : 'Loading indices...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
            {lang === 'ar' ? 'حدث خطأ' : 'Error Occurred'}
          </h3>
          <p className={`${colors.textSecondary} mb-4`}>{error}</p>
          <button
            onClick={loadIndices}
            className={`px-6 py-2 ${patterns.button}`}
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'إدارة المؤشرات' : 'Index Management'}
            </h1>
            <p className={colors.textSecondary}>
              {lang === 'ar'
                ? 'إدارة وتتبع جميع مؤشرات التقييم في النظام'
                : 'Manage and track all assessment indices in the system'}
            </p>
          </div>
          {(user?.role === 'admin' || user?.role === 'index_manager') && (
            <button
              onClick={handleAddIndex}
              className={`flex items-center gap-2 px-4 py-2.5 ${patterns.button}`}
            >
              <Plus size={20} />
              <span className="font-medium">{lang === 'ar' ? 'إضافة مؤشر جديد' : 'Add New Index'}</span>
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${patterns.card} p-4 rounded-lg`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${colors.primaryLight} rounded-lg flex items-center justify-center`}>
                <Layers className={colors.primaryIcon} size={20} />
              </div>
              <div>
                <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'إجمالي المؤشرات' : 'Total Indices'}</p>
                <p className={`text-2xl font-bold ${colors.textPrimary}`}>{indices.length}</p>
              </div>
            </div>
          </div>

          <div className={`${patterns.card} p-4 rounded-lg`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${colors.primaryLight} rounded-lg flex items-center justify-center`}>
                <CheckSquare className={colors.primaryIcon} size={20} />
              </div>
              <div>
                <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'المؤشرات النشطة' : 'Active Indices'}</p>
                <p className={`text-2xl font-bold ${colors.textPrimary}`}>
                  {indices.filter(idx => idx.status === 'in_progress' || idx.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${colors.bgSecondary} p-4 rounded-lg border ${colors.border}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <CheckSquare className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'إجمالي المتطلبات' : 'Total Requirements'}</p>
                <p className={`text-2xl font-bold ${colors.textPrimary}`}>
                  {indices.reduce((sum, idx) => sum + idx.total_requirements, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indices List */}
      {indices.length > 0 ? (
        <div className="space-y-4">
          {indices.map((index) => (
            <div
              key={index.id}
              className={`${colors.bgSecondary} rounded-xl border ${colors.border} p-6 hover:shadow-lg transition`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-16 h-16 ${colors.primary} rounded-xl flex items-center justify-center`}>
                    <Layers className="text-white" size={28} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                        {lang === 'ar' ? index.name_ar : index.name_en || index.name_ar}
                      </h2>
                      <span className={`px-3 py-1 ${colors.primaryLight} ${colors.primaryText} text-xs font-medium rounded-full`}>
                        {index.code}
                      </span>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(index.status)}`}>
                        {getStatusLabel(index.status)}
                      </span>
                    </div>
                    {(index.description_ar || index.description_en) && (
                      <p className={`${colors.textSecondary} mb-4`}>
                        {lang === 'ar' ? index.description_ar : index.description_en || index.description_ar}
                      </p>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <CheckSquare className={colors.textSecondary} size={18} />
                        <div>
                          <p className={`text-xs ${colors.textSecondary}`}>
                            {lang === 'ar' ? 'المتطلبات' : 'Requirements'}
                          </p>
                          <p className={`text-sm font-bold ${colors.textPrimary}`}>{index.total_requirements}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <TrendingUp className={colors.textSecondary} size={18} />
                        <div>
                          <p className={`text-xs ${colors.textSecondary}`}>
                            {lang === 'ar' ? 'المجالات' : 'Areas'}
                          </p>
                          <p className={`text-sm font-bold ${colors.textPrimary}`}>{index.total_areas}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <FileText className={colors.textSecondary} size={18} />
                        <div>
                          <p className={`text-xs ${colors.textSecondary}`}>
                            {lang === 'ar' ? 'الأدلة' : 'Evidence'}
                          </p>
                          <p className={`text-sm font-bold ${colors.textPrimary}`}>{index.total_evidence}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewIndex(index)}
                    className={`px-4 py-2 ${patterns.button} text-sm font-medium`}
                  >
                    {lang === 'ar' ? 'عرض المؤشر' : 'View Index'}
                  </button>
                  {(user?.role === 'admin' || user?.role === 'index_manager') && (
                    <>
                      <button
                        onClick={() => handleEditIndex(index)}
                        className={`p-2 ${colors.textSecondary} hover:${colors.bgHover} rounded-lg transition`}
                        title={lang === 'ar' ? 'تعديل' : 'Edit'}
                      >
                        <Edit size={18} />
                      </button>
                      {index.status !== 'completed' && index.status !== 'archived' && (
                        <button
                          onClick={() => handleDeleteIndex(index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[#313236] rounded-lg transition"
                          title={lang === 'ar' ? 'حذف' : 'Delete'}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className={`mt-4 pt-4 border-t ${colors.border} flex items-center gap-4 text-xs ${colors.textSecondary}`}>
                <span>
                  {lang === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(index.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                </span>
                {index.excel_filename && (
                  <span>
                    {lang === 'ar' ? 'ملف Excel:' : 'Excel File:'} {index.excel_filename}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className={`${colors.bgSecondary} rounded-xl border ${colors.border} p-12 text-center`}>
          <Layers className={`mx-auto ${colors.textSecondary} mb-4`} size={64} />
          <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
            {lang === 'ar' ? 'لا توجد مؤشرات' : 'No Indices'}
          </h3>
          <p className={`${colors.textSecondary} mb-6`}>
            {lang === 'ar'
              ? 'ابدأ بإضافة مؤشر جديد لتتبع وقياس الأداء'
              : 'Start by adding a new index to track and measure performance'}
          </p>
          {(user?.role === 'admin' || user?.role === 'index_manager') && (
            <button
              onClick={handleAddIndex}
              className={`px-6 py-3 ${patterns.button}`}
            >
              {lang === 'ar' ? 'إضافة مؤشر جديد' : 'Add New Index'}
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {indexToDelete && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setIndexToDelete(null);
          }}
          onConfirm={confirmDeleteIndex}
          indexName={lang === 'ar' ? indexToDelete.name_ar : indexToDelete.name_en || indexToDelete.name_ar}
          indexCode={indexToDelete.code}
          language={lang}
        />
      )}

      {/* Edit Index Modal */}
      {indexToEdit && (
        <IndexEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setIndexToEdit(null);
          }}
          onSave={handleSaveIndex}
          index={indexToEdit}
          language={lang}
        />
      )}
    </div>
  );
};

export default Indices;
