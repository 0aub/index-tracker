import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Task } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { colors, patterns } from '../../utils/darkMode';
import toast from 'react-hot-toast';
import requirementsData from '../../data/requirements.json';
import usersData from '../../data/users.json';

interface TaskFormProps {
  task: Task | null;
  onSave: (task: Task) => void;
  onCancel: () => void;
  lang: 'ar' | 'en';
}

const TaskForm = ({ task, onSave, onCancel, lang }: TaskFormProps) => {
  const { user } = useAuthStore();
  const requirements = requirementsData.requirements;
  const users = usersData.users;

  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    requirement_id: task?.requirement_id || '',
    assigned_to: task?.assigned_to || '',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    priority: task?.priority || 'medium',
    status: task?.status || 'assigned'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = lang === 'ar' ? 'عنوان المهمة مطلوب' : 'Task title is required';
    }

    if (!formData.assigned_to) {
      newErrors.assigned_to = lang === 'ar' ? 'يجب تعيين المهمة لمستخدم' : 'Task must be assigned to a user';
    }

    if (!formData.due_date) {
      newErrors.due_date = lang === 'ar' ? 'الموعد النهائي مطلوب' : 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error(lang === 'ar' ? 'الرجاء تصحيح الأخطاء' : 'Please fix the errors');
      return;
    }

    const taskData: Task = {
      id: task?.id || 'task-' + Date.now(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      requirement_id: formData.requirement_id || undefined,
      assigned_to: formData.assigned_to,
      assigned_by: task?.assigned_by || user?.id || '',
      due_date: new Date(formData.due_date).toISOString(),
      status: formData.status as any,
      priority: formData.priority as any,
      created_at: task?.created_at || new Date().toISOString(),
      completed_at: formData.status === 'completed' ? new Date().toISOString() : undefined
    };

    onSave(taskData);
    toast.success(
      task
        ? (lang === 'ar' ? 'تم تحديث المهمة بنجاح' : 'Task updated successfully')
        : (lang === 'ar' ? 'تم إنشاء المهمة بنجاح' : 'Task created successfully')
    );
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
              {lang === 'ar' ? 'عنوان المهمة' : 'Task Title'} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.input} ${
                errors.title ? 'border-red-500' : ''
              }`}
              placeholder={lang === 'ar' ? 'أدخل عنوان المهمة' : 'Enter task title'}
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
              placeholder={lang === 'ar' ? 'أدخل وصف المهمة' : 'Enter task description'}
            />
          </div>

          {/* Requirement */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'المتطلب المرتبط' : 'Related Requirement'}
            </label>
            <select
              value={formData.requirement_id}
              onChange={(e) => setFormData({ ...formData, requirement_id: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.select}`}
            >
              <option value="">{lang === 'ar' ? 'لا يوجد' : 'None'}</option>
              {requirements.map((req: any) => (
                <option key={req.id} value={req.id}>
                  {req.id} - {lang === 'ar' ? req.question : req.question_en}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تعيين إلى' : 'Assign To'} *
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.select} ${
                errors.assigned_to ? 'border-red-500' : ''
              }`}
            >
              <option value="">{lang === 'ar' ? 'اختر مستخدم' : 'Select a user'}</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {lang === 'ar' ? u.name : u.name_en} - {u.role}
                </option>
              ))}
            </select>
            {errors.assigned_to && (
              <p className="mt-1 text-sm text-red-600">{errors.assigned_to}</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'الموعد النهائي' : 'Due Date'} *
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.input} ${
                errors.due_date ? 'border-red-500' : ''
              }`}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.due_date && (
              <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
            )}
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
              <option value="urgent">{lang === 'ar' ? 'عاجل' : 'Urgent'}</option>
            </select>
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
                <option value="assigned">{lang === 'ar' ? 'مُسندة' : 'Assigned'}</option>
                <option value="in_progress">{lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                <option value="completed">{lang === 'ar' ? 'مكتملة' : 'Completed'}</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className={`flex items-center gap-3 pt-4 border-t ${colors.border}`}>
            <button
              type="submit"
              className={`flex-1 px-6 py-3 ${patterns.button} font-medium`}
            >
              {task
                ? (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                : (lang === 'ar' ? 'إنشاء المهمة' : 'Create Task')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 px-6 py-3 ${colors.bgTertiary} ${colors.textPrimary} rounded-lg ${colors.bgHover} transition font-medium`}
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
