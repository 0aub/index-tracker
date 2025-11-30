import { Calendar, Users, MessageSquare, AlertCircle, CheckCircle, Flag, Clock } from 'lucide-react';
import { Task } from '../../types';
import { colors } from '../../utils/darkMode';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  lang: 'ar' | 'en';
}

const TaskCard = ({ task, onClick, lang }: TaskCardProps) => {
  const title = task.title;
  const description = task.description;

  // Priority colors
  const priorityColors = {
    low: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    high: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
  };

  const priorityLabels = {
    low: { ar: 'منخفضة', en: 'Low' },
    medium: { ar: 'متوسطة', en: 'Medium' },
    high: { ar: 'عالية', en: 'High' }
  };

  const statusLabels = {
    todo: { ar: 'قيد الانتظار', en: 'To Do' },
    in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
    completed: { ar: 'مكتملة', en: 'Completed' }
  };

  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors];
  const priorityLabel = priorityLabels[task.priority as keyof typeof priorityLabels];
  const statusLabel = statusLabels[task.status as keyof typeof statusLabels];

  // Check if task is/was overdue
  const isCurrentlyOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  // Check if task was completed late (for performance tracking)
  const wasCompletedLate = task.status === 'completed' &&
    task.due_date &&
    task.completed_at &&
    new Date(task.completed_at) > new Date(task.due_date);

  return (
    <div
      onClick={onClick}
      className={`${colors.bgSecondary} ${colors.border} border rounded-lg p-4 hover:shadow-md transition cursor-pointer relative ${
        isCurrentlyOverdue ? 'border-l-4 border-l-red-500' : ''
      } ${
        wasCompletedLate ? 'border-l-4 border-l-orange-500' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className={`text-lg font-semibold ${colors.textPrimary} flex-1`}>
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColor}`}>
            <Flag size={12} className="inline mr-1" />
            {priorityLabel[lang]}
          </span>

          {/* Late Completion Indicator */}
          {wasCompletedLate && (
            <span
              className="px-2 py-1 rounded text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20"
              title={lang === 'ar' ? 'مكتملة متأخرة' : 'Completed Late'}
            >
              <Clock size={12} className="inline mr-1" />
              {lang === 'ar' ? 'متأخر' : 'Late'}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className={`${colors.textSecondary} text-sm mb-3 line-clamp-2`}>
          {description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        {/* Status */}
        <div className={`flex items-center gap-1 ${colors.textSecondary}`}>
          {task.status === 'completed' ? (
            <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle size={14} className={task.status === 'in_progress' ? 'text-yellow-600 dark:text-yellow-400' : ''} />
          )}
          <span>{statusLabel[lang]}</span>
        </div>

        {/* Assignees */}
        {task.assignments && task.assignments.length > 0 && (
          <div className={`flex items-center gap-1 ${colors.textSecondary}`}>
            <Users size={14} />
            <span>{task.assignments.length}</span>
          </div>
        )}

        {/* Comments */}
        {task.comment_count > 0 && (
          <div className={`flex items-center gap-1 ${colors.textSecondary}`}>
            <MessageSquare size={14} />
            <span>{task.comment_count}</span>
          </div>
        )}

        {/* Due Date */}
        {task.due_date && (
          <div className={`flex items-center gap-1 ${
            isCurrentlyOverdue ? 'text-red-600 dark:text-red-400 font-semibold' :
            wasCompletedLate ? 'text-orange-600 dark:text-orange-400' :
            colors.textSecondary
          }`}>
            {isCurrentlyOverdue && <AlertCircle size={14} />}
            {wasCompletedLate && <Clock size={14} />}
            <Calendar size={14} />
            <span>
              {new Date(task.due_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        )}

        {/* Index Tag */}
        {task.index_name && (
          <div className={`px-2 py-1 ${colors.bgTertiary} rounded text-xs`}>
            {lang === 'ar' ? task.index_name : (task.index_name_en || task.index_name)}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
