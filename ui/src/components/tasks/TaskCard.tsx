import { useNavigate } from 'react-router-dom';
import { Calendar, User, AlertCircle, CheckCircle, Clock, Edit, Trash2, Flag } from 'lucide-react';
import { Task } from '../../types';
import { colors, patterns } from '../../utils/darkMode';
import toast from 'react-hot-toast';
import usersData from '../../data/users.json';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  lang: 'ar' | 'en';
}

const STATUS_CONFIG = {
  assigned: {
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: { ar: 'مُسندة', en: 'Assigned' }
  },
  in_progress: {
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: { ar: 'قيد التنفيذ', en: 'In Progress' }
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: { ar: 'مكتملة', en: 'Completed' }
  },
  overdue: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: { ar: 'متأخرة', en: 'Overdue' }
  }
};

const PRIORITY_CONFIG = {
  urgent: { color: 'text-red-600', bg: 'bg-red-100', label: { ar: 'عاجل', en: 'Urgent' } },
  high: { color: 'text-orange-600', bg: 'bg-orange-100', label: { ar: 'عالية', en: 'High' } },
  medium: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: { ar: 'متوسطة', en: 'Medium' } },
  low: { color: 'text-green-600', bg: 'bg-green-100', label: { ar: 'منخفضة', en: 'Low' } }
};

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, lang }: TaskCardProps) => {
  const navigate = useNavigate();
  const users = usersData.users;

  const dueDate = new Date(task.due_date);
  const isOverdue = dueDate < new Date() && task.status !== 'completed';
  const displayStatus = isOverdue ? 'overdue' : task.status;

  const statusConfig = STATUS_CONFIG[displayStatus as keyof typeof STATUS_CONFIG];
  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
  const StatusIcon = statusConfig.icon;

  const assignedUser = users.find(u => u.id === task.assigned_to);
  const assignedByUser = users.find(u => u.id === task.assigned_by);

  const handleDelete = () => {
    if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'Are you sure you want to delete this task?')) {
      onDelete(task.id);
      toast.success(lang === 'ar' ? 'تم حذف المهمة بنجاح' : 'Task deleted successfully');
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    onStatusChange(task.id, newStatus);
    toast.success(lang === 'ar' ? 'تم تحديث حالة المهمة' : 'Task status updated');
  };

  return (
    <div className={`${colors.bgSecondary} rounded-lg shadow dark:shadow-gray-900/50 border-l-4 ${statusConfig.border} p-6 hover:shadow-lg transition`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {/* Priority Badge */}
          <div className="flex items-center gap-3 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${priorityConfig.bg} dark:bg-opacity-20 ${priorityConfig.color} dark:text-opacity-90`}>
              <Flag size={14} />
              {priorityConfig.label[lang]}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${statusConfig.bg} dark:bg-opacity-20 ${statusConfig.color} dark:text-opacity-90`}>
              <StatusIcon size={14} />
              {statusConfig.label[lang]}
            </span>
          </div>

          {/* Title */}
          <h3 className={`text-lg font-bold mb-2 ${colors.textPrimary}`}>
            {task.title}
          </h3>

          {/* Description */}
          {task.description && (
            <p className={`text-sm mb-3 ${colors.textSecondary}`}>
              {task.description}
            </p>
          )}

          {/* Requirement Link */}
          {task.requirement_id && (
            <button
              onClick={() => navigate(`/requirements/${task.requirement_id}`)}
              className={`inline-flex items-center text-sm font-medium mb-3 ${patterns.link}`}
            >
              {lang === 'ar' ? 'المتطلب:' : 'Requirement:'} {task.requirement_id}
            </button>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`flex items-center gap-2 text-sm ${colors.textSecondary}`}>
              <User size={16} />
              <div>
                <span className={`block text-xs ${colors.textTertiary}`}>
                  {lang === 'ar' ? 'المسؤول' : 'Assigned To'}
                </span>
                <span className={`font-medium ${colors.textPrimary}`}>
                  {lang === 'ar' ? assignedUser?.name : assignedUser?.name_en}
                </span>
              </div>
            </div>

            <div className={`flex items-center gap-2 text-sm ${colors.textSecondary}`}>
              <Calendar size={16} />
              <div>
                <span className={`block text-xs ${colors.textTertiary}`}>
                  {lang === 'ar' ? 'الموعد النهائي' : 'Due Date'}
                </span>
                <span className={`font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : colors.textPrimary}`}>
                  {dueDate.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                </span>
              </div>
            </div>

            <div className={`flex items-center gap-2 text-sm ${colors.textSecondary}`}>
              <User size={16} />
              <div>
                <span className={`block text-xs ${colors.textTertiary}`}>
                  {lang === 'ar' ? 'مُسندة من' : 'Assigned By'}
                </span>
                <span className={`font-medium ${colors.textPrimary}`}>
                  {lang === 'ar' ? assignedByUser?.name : assignedByUser?.name_en}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onEdit(task)}
            className={`p-2 ${colors.primaryIcon} hover:bg-green-50 dark:hover:${colors.bgHover} rounded-lg transition`}
            title={lang === 'ar' ? 'تعديل' : 'Edit'}
          >
            <Edit size={18} />
          </button>
          <button
            onClick={handleDelete}
            className={`p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:${colors.bgHover} rounded-lg transition`}
            title={lang === 'ar' ? 'حذف' : 'Delete'}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Status Changer */}
      {task.status !== 'completed' && (
        <div className={`mt-4 pt-4 border-t ${colors.border}`}>
          <label className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>
            {lang === 'ar' ? 'تحديث الحالة' : 'Update Status'}
          </label>
          <select
            value={task.status}
            onChange={handleStatusChange}
            className={`w-full md:w-auto px-4 py-2 ${patterns.select}`}
          >
            <option value="assigned">{lang === 'ar' ? 'مُسندة' : 'Assigned'}</option>
            <option value="in_progress">{lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
            <option value="completed">{lang === 'ar' ? 'مكتملة' : 'Completed'}</option>
          </select>
        </div>
      )}

      {/* Completed Info */}
      {task.status === 'completed' && task.completed_at && (
        <div className={`mt-4 pt-4 border-t ${colors.border}`}>
          <div className={`flex items-center gap-2 text-sm ${colors.primaryIcon}`}>
            <CheckCircle size={16} />
            <span>
              {lang === 'ar' ? 'تم الإنجاز في' : 'Completed on'}{' '}
              {new Date(task.completed_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
