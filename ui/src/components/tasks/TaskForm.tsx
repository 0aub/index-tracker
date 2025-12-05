import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Task, TaskCreateRequest, TaskUpdateRequest, User } from '../../types';
import { colors, patterns } from '../../utils/darkMode';
import { fetchUsers } from '../../services/userManagement';
import { Index, Requirement, api } from '../../services/api';
import UserSearchSelector from '../common/UserSearchSelector';
import toast from 'react-hot-toast';

interface TaskFormProps {
  task: Task | null;
  onSave: (data: TaskCreateRequest | TaskUpdateRequest) => Promise<void>;
  onCancel: () => void;
  indices: Index[];
  lang: 'ar' | 'en';
}

const TaskForm = ({ task, onSave, onCancel, indices, lang }: TaskFormProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Requirement selection state
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [selectedMainArea, setSelectedMainArea] = useState<string>(task?.requirement_main_area_ar || '');
  const [uniqueMainAreas, setUniqueMainAreas] = useState<string[]>([]);
  const [selectedIndexId, setSelectedIndexId] = useState<string>(task?.index_id || '');

  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    index_id: task?.index_id || '',
    requirement_id: task?.requirement_id || '',
    assignee_ids: task?.assignments?.map(a => a.user_id) || [],
    due_date: task?.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to load users:', error);
        toast.error(lang === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users');
      }
    };
    loadUsers();
  }, [lang]);

  // Load requirements when selectedIndexId changes (not formData.index_id to avoid loops)
  useEffect(() => {
    const loadRequirements = async () => {
      if (!selectedIndexId) {
        setRequirements([]);
        setUniqueMainAreas([]);
        return;
      }

      try {
        setLoadingRequirements(true);
        const data = await api.requirements.getAll({ index_id: selectedIndexId });
        setRequirements(data);

        // Extract unique main areas
        const areas = [...new Set(data.map(r => r.main_area_ar))].filter(Boolean);
        setUniqueMainAreas(areas);
      } catch (error) {
        console.error('Failed to load requirements:', error);
      } finally {
        setLoadingRequirements(false);
      }
    };

    loadRequirements();
  }, [selectedIndexId]);

  // Filtered requirements by selected main area
  const filteredRequirements = selectedMainArea
    ? requirements.filter(r => r.main_area_ar === selectedMainArea)
    : requirements;

  // Handle index change
  const handleIndexChange = (newIndexId: string) => {
    setSelectedIndexId(newIndexId);
    setSelectedMainArea('');
    setFormData(prev => ({ ...prev, index_id: newIndexId, requirement_id: '' }));
  };

  // Handle main area change
  const handleMainAreaChange = (newMainArea: string) => {
    setSelectedMainArea(newMainArea);
    setFormData(prev => ({ ...prev, requirement_id: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = lang === 'ar' ? 'العنوان مطلوب' : 'Title is required';
    }

    // Assignees are now optional - if not provided, task will be assigned to the creator

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error(lang === 'ar' ? 'الرجاء تصحيح الأخطاء' : 'Please fix the errors');
      return;
    }

    setLoading(true);
    try {
      if (task) {
        // Update existing task
        const updateData: TaskUpdateRequest = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          index_id: formData.index_id || undefined,
          requirement_id: formData.requirement_id || undefined,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
          priority: formData.priority,
          status: formData.status
        };
        await onSave(updateData);
      } else {
        // Create new task
        const createData: TaskCreateRequest = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          index_id: formData.index_id || undefined,
          requirement_id: formData.requirement_id || undefined,
          assignee_ids: formData.assignee_ids,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
          priority: formData.priority
        };
        await onSave(createData);
      }
    } catch (error) {
      setLoading(false);
      // Error already handled in parent
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`${colors.bgSecondary} rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
          <h2 className={`text-2xl font-bold ${colors.textPrimary}`}>
            {task
              ? (lang === 'ar' ? 'تعديل المهمة' : 'Edit Task')
              : (lang === 'ar' ? 'إنشاء مهمة جديدة' : 'Create New Task')}
          </h2>
          <button
            onClick={onCancel}
            className={`p-2 ${colors.textSecondary} hover:${colors.textPrimary} ${colors.bgHover} rounded-lg transition`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'العنوان' : 'Title'} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.input} ${
                errors.title ? 'border-red-500' : ''
              }`}
              placeholder={lang === 'ar' ? 'أدخل العنوان' : 'Enter title'}
              dir="rtl"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className={`w-full px-4 py-2 ${patterns.input} resize-none`}
              placeholder={lang === 'ar' ? 'أدخل الوصف' : 'Enter description'}
              dir="rtl"
            />
          </div>

          {/* Index */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'المؤشر المرتبط' : 'Related Index'}
            </label>
            <select
              value={selectedIndexId}
              onChange={(e) => handleIndexChange(e.target.value)}
              className={`w-full px-4 py-2 ${patterns.select}`}
            >
              <option value="">{lang === 'ar' ? 'لا يوجد' : 'None'}</option>
              {indices.map((index) => (
                <option key={index.id} value={index.id}>
                  {lang === 'ar' ? index.name_ar : (index.name_en || index.name_ar)}
                </option>
              ))}
            </select>
          </div>

          {/* Main Area and Requirement - Only show if index is selected */}
          {selectedIndexId && (
            <>
              {/* Main Area Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'المجال الرئيسي' : 'Main Area'}
                </label>
                {loadingRequirements ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="animate-spin" size={16} />
                    <span className={`text-sm ${colors.textSecondary}`}>
                      {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedMainArea}
                    onChange={(e) => handleMainAreaChange(e.target.value)}
                    className={`w-full px-4 py-2 ${patterns.select}`}
                  >
                    <option value="">{lang === 'ar' ? 'جميع المجالات' : 'All Areas'}</option>
                    {uniqueMainAreas.map((area, idx) => (
                      <option key={idx} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Requirement Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'المتطلب المرتبط' : 'Related Requirement'}
                </label>
                <select
                  value={formData.requirement_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirement_id: e.target.value }))}
                  className={`w-full px-4 py-2 ${patterns.select}`}
                  disabled={loadingRequirements}
                >
                  <option value="">{lang === 'ar' ? 'لا يوجد' : 'None'}</option>
                  {filteredRequirements.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.code} - {lang === 'ar' ? req.question_ar : (req.question_en || req.question_ar)}
                    </option>
                  ))}
                </select>
                {filteredRequirements.length === 0 && !loadingRequirements && (
                  <p className={`text-sm ${colors.textSecondary} mt-1`}>
                    {lang === 'ar' ? 'لا توجد متطلبات' : 'No requirements found'}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Due Date and Priority - Two Columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الموعد النهائي' : 'Due Date'}
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className={`w-full px-4 py-2 ${patterns.input}`}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Priority */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الأولوية' : 'Priority'}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className={`w-full px-4 py-2 ${patterns.select}`}
              >
                <option value="low">{lang === 'ar' ? 'منخفضة' : 'Low'}</option>
                <option value="medium">{lang === 'ar' ? 'متوسطة' : 'Medium'}</option>
                <option value="high">{lang === 'ar' ? 'عالية' : 'High'}</option>
              </select>
            </div>
          </div>

          {/* Assignees - Searchable Multi-Select with User Cards */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تعيين إلى' : 'Assign To'}
            </label>
            <p className={`text-xs ${colors.textSecondary} mb-3`}>
              {lang === 'ar' ? 'اختياري - إذا لم يتم التعيين، ستكون المهمة لك' : 'Optional - If not assigned, the task will be for yourself'}
            </p>

            <UserSearchSelector
              users={users}
              selectedIds={formData.assignee_ids}
              onSelect={(userId) => setFormData(prev => ({
                ...prev,
                assignee_ids: [...prev.assignee_ids, userId]
              }))}
              onDeselect={(userId) => setFormData(prev => ({
                ...prev,
                assignee_ids: prev.assignee_ids.filter(id => id !== userId)
              }))}
              placeholder={{
                ar: 'ابحث بالاسم أو البريد الإلكتروني...',
                en: 'Search by name or email...'
              }}
              multiple={true}
              showRole={true}
            />
          </div>

          {/* Status (only when editing) */}
          {task && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الحالة' : 'Status'}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`w-full px-4 py-2 ${patterns.select}`}
              >
                <option value="todo">{lang === 'ar' ? 'قيد الانتظار' : 'To Do'}</option>
                <option value="in_progress">{lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                <option value="completed">{lang === 'ar' ? 'مكتملة' : 'Completed'}</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className={`flex items-center gap-3 pt-4 border-t ${colors.border}`}>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-6 py-3 ${patterns.button} font-medium disabled:opacity-50`}
            >
              {loading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (
                task
                  ? (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                  : (lang === 'ar' ? 'إنشاء المهمة' : 'Create Task')
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className={`flex-1 px-6 py-3 ${colors.bgTertiary} ${colors.textPrimary} rounded-lg ${colors.bgHover} transition font-medium disabled:opacity-50`}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
