import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Task, TaskCreateRequest, TaskUpdateRequest, User } from '../../types';
import { colors, patterns } from '../../utils/darkMode';
import { fetchUsers } from '../../services/userManagement';
import { Index } from '../../services/api';
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

  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    index_id: task?.index_id || '',
    assignee_ids: task?.assignments?.map(a => a.user_id) || [],
    due_date: task?.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo'
  });

  const [userSearch, setUserSearch] = useState('');

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

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = lang === 'ar' ? 'العنوان مطلوب' : 'Title is required';
    }

    if (formData.assignee_ids.length === 0) {
      newErrors.assignee_ids = lang === 'ar' ? 'يجب تعيين المهمة لمستخدم واحد على الأقل' : 'At least one assignee is required';
    }

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

  const toggleAssignee = (userId: string) => {
    if (formData.assignee_ids.includes(userId)) {
      setFormData({
        ...formData,
        assignee_ids: formData.assignee_ids.filter(id => id !== userId)
      });
    } else {
      setFormData({
        ...formData,
        assignee_ids: [...formData.assignee_ids, userId]
      });
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
              value={formData.index_id}
              onChange={(e) => setFormData({ ...formData, index_id: e.target.value })}
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

          {/* Assignees - Searchable Multi-Select (Moved to end) */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تعيين إلى' : 'Assign To'} *
            </label>

            {/* Search Input */}
            <div className="relative mb-2">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className={`w-full px-4 py-2 ${patterns.input}`}
                placeholder={lang === 'ar' ? 'ابحث عن مستخدم...' : 'Search for users...'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Selected Users */}
            {formData.assignee_ids.length > 0 && (
              <div className={`mb-2 p-3 ${colors.bgTertiary} rounded-lg`}>
                <div className="flex flex-wrap gap-2">
                  {formData.assignee_ids.map((userId) => {
                    const user = users.find(u => u.id === userId);
                    if (!user) return null;
                    return (
                      <div
                        key={userId}
                        className={`flex items-center gap-2 px-3 py-1 ${colors.bgSecondary} rounded-full border ${colors.border}`}
                      >
                        <span className={`text-sm ${colors.textPrimary}`}>
                          {lang === 'ar' ? user.name : user.name_en}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleAssignee(userId)}
                          className={`${colors.textSecondary} hover:text-red-500 transition`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* User Selection List - Only show when searching */}
            {userSearch.trim() && (
              <div className={`max-h-48 overflow-y-auto ${colors.border} border rounded-lg divide-y ${colors.border}`}>
                {users
                  .filter(user => {
                    const searchTerm = userSearch.toLowerCase();
                    const userName = (lang === 'ar' ? user.name : user.name_en).toLowerCase();
                    const userEmail = user.email.toLowerCase();
                    return userName.includes(searchTerm) || userEmail.includes(searchTerm);
                  })
                  .map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleAssignee(user.id)}
                      className={`w-full flex items-center justify-between p-3 ${colors.bgHover} transition ${
                        formData.assignee_ids.includes(user.id) ? `${colors.bgTertiary} font-medium` : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          formData.assignee_ids.includes(user.id) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`} />
                        <div className="text-left">
                          <div className={colors.textPrimary}>
                            {lang === 'ar' ? user.name : user.name_en}
                          </div>
                          <div className={`text-xs ${colors.textSecondary}`}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${colors.bgSecondary} ${colors.textSecondary}`}>
                        {user.role}
                      </span>
                    </button>
                  ))}
              </div>
            )}
            {errors.assignee_ids && (
              <p className="mt-1 text-sm text-red-600">{errors.assignee_ids}</p>
            )}
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
