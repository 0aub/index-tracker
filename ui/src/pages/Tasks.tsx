import { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, X, Paperclip, Send, Trash2, Edit2 } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useIndexStore } from '../stores/indexStore';
import { useAuthStore } from '../stores/authStore';
import { fetchTasks, createTask, updateTask, deleteTask, addComment, uploadAttachment } from '../services/tasks';
import { fetchIndices } from '../services/api';
import { Task, TaskListResponse, TaskCreateRequest, TaskUpdateRequest, TaskComment, Index } from '../types';
import TaskCard from '../components/tasks/TaskCard';
import TaskForm from '../components/tasks/TaskForm';
import { colors, patterns } from '../utils/darkMode';
import toast from 'react-hot-toast';

const Tasks = () => {
  const { language } = useUIStore();
  const { user } = useAuthStore();
  const lang = language;

  const [taskData, setTaskData] = useState<TaskListResponse | null>(null);
  const [indices, setIndices] = useState<Index[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [indexFilter, setIndexFilter] = useState<string>('all');
  const [assignedToMe, setAssignedToMe] = useState(false);

  // Modals
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Comment form
  const [commentText, setCommentText] = useState('');
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Load tasks and indices
  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, indexFilter, assignedToMe]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (indexFilter !== 'all') filters.index_id = indexFilter;
      if (assignedToMe) filters.assigned_to_me = true;

      const [tasksResponse, indicesData] = await Promise.all([
        fetchTasks(filters),
        fetchIndices()
      ]);

      setTaskData(tasksResponse);
      setIndices(indicesData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
      toast.error(lang === 'ar' ? 'فشل تحميل المهام' : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (data: TaskCreateRequest) => {
    try {
      await createTask(data);
      toast.success(lang === 'ar' ? 'تم إنشاء المهمة بنجاح' : 'Task created successfully');
      setShowTaskForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل إنشاء المهمة' : 'Failed to create task'));
      throw err;
    }
  };

  const handleUpdateTask = async (data: TaskUpdateRequest) => {
    if (!selectedTask) return;

    try {
      await updateTask(selectedTask.id, data);
      toast.success(lang === 'ar' ? 'تم تحديث المهمة بنجاح' : 'Task updated successfully');
      setShowTaskForm(false);
      setSelectedTask(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل تحديث المهمة' : 'Failed to update task'));
      throw err;
    }
  };

  const handleQuickStatusChange = async (status: 'todo' | 'in_progress' | 'completed') => {
    if (!selectedTask) return;

    try {
      await updateTask(selectedTask.id, { status });
      toast.success(lang === 'ar' ? 'تم تحديث حالة المهمة' : 'Task status updated');
      // Update local state
      setSelectedTask({ ...selectedTask, status });
      loadData();
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status'));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await deleteTask(taskId);
      toast.success(lang === 'ar' ? 'تم حذف المهمة بنجاح' : 'Task deleted successfully');
      setShowTaskDetail(false);
      setSelectedTask(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل حذف المهمة' : 'Failed to delete task'));
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !commentText.trim()) return;

    try {
      setSubmittingComment(true);

      const comment = await addComment(selectedTask.id, {
        comment: commentText.trim()
      });

      // Upload attachment if there is one
      if (commentFile) {
        await uploadAttachment(selectedTask.id, comment.id, commentFile);
      }

      toast.success(lang === 'ar' ? 'تم إضافة التعليق بنجاح' : 'Comment added successfully');
      setCommentText('');
      setCommentFile(null);

      // Reload task detail
      const updatedTasks = await fetchTasks();
      const updatedTask = updatedTasks.tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل إضافة التعليق' : 'Failed to add comment'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const openEditForm = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(false);
    setShowTaskForm(true);
  };

  // Group tasks by status
  const todoTasks = taskData?.tasks.filter(t => t.status === 'todo') || [];
  const inProgressTasks = taskData?.tasks.filter(t => t.status === 'in_progress') || [];
  const completedTasks = taskData?.tasks.filter(t => t.status === 'completed') || [];

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className={`w-12 h-12 animate-spin ${colors.primary} mx-auto mb-4`} />
            <p className={colors.textSecondary}>
              {lang === 'ar' ? 'جاري تحميل المهام...' : 'Loading tasks...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'حدث خطأ' : 'Error Occurred'}
            </h3>
            <p className={`${colors.textSecondary} mb-4`}>{error}</p>
            <button
              onClick={loadData}
              className={`px-6 py-2 ${patterns.button}`}
            >
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className={`text-3xl font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'إدارة المهام' : 'Task Management'}
              </h1>
              <p className={`${colors.textSecondary} mt-2`}>
                {lang === 'ar'
                  ? 'تنظيم وتتبع جميع المهام والتكليفات'
                  : 'Organize and track all tasks and assignments'}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTask(null);
                setShowTaskForm(true);
              }}
              className={`flex items-center gap-2 px-6 py-3 ${patterns.button}`}
            >
              <Plus size={20} />
              <span>{lang === 'ar' ? 'إنشاء مهمة جديدة' : 'Create New Task'}</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`${colors.bgSecondary} rounded-lg shadow p-6`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>
              {lang === 'ar' ? 'إجمالي المهام' : 'Total Tasks'}
            </p>
            <p className={`text-3xl font-bold ${colors.textPrimary}`}>{taskData?.total || 0}</p>
          </div>
          <div className={`${colors.bgSecondary} rounded-lg shadow p-6`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>
              {lang === 'ar' ? 'قيد الانتظار' : 'To Do'}
            </p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{taskData?.todo_count || 0}</p>
          </div>
          <div className={`${colors.bgSecondary} rounded-lg shadow p-6`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>
              {lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
            </p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{taskData?.in_progress_count || 0}</p>
          </div>
          <div className={`${colors.bgSecondary} rounded-lg shadow p-6`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>
              {lang === 'ar' ? 'مكتملة' : 'Completed'}
            </p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{taskData?.completed_count || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className={`${colors.bgSecondary} rounded-lg shadow p-6 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'المؤشر' : 'Index'}
              </label>
              <select
                value={indexFilter}
                onChange={(e) => setIndexFilter(e.target.value)}
                className={`w-full px-4 py-2 ${patterns.select}`}
              >
                <option value="all">{lang === 'ar' ? 'جميع المؤشرات' : 'All Indices'}</option>
                {indices.map((index) => (
                  <option key={index.id} value={index.id}>
                    {lang === 'ar' ? index.name_ar : (index.name_en || index.name_ar)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الأولوية' : 'Priority'}
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`w-full px-4 py-2 ${patterns.select}`}
              >
                <option value="all">{lang === 'ar' ? 'جميع الأولويات' : 'All Priorities'}</option>
                <option value="low">{lang === 'ar' ? 'منخفضة' : 'Low'}</option>
                <option value="medium">{lang === 'ar' ? 'متوسطة' : 'Medium'}</option>
                <option value="high">{lang === 'ar' ? 'عالية' : 'High'}</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الحالة' : 'Status'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full px-4 py-2 ${patterns.select}`}
              >
                <option value="all">{lang === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="todo">{lang === 'ar' ? 'قيد الانتظار' : 'To Do'}</option>
                <option value="in_progress">{lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                <option value="completed">{lang === 'ar' ? 'مكتملة' : 'Completed'}</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className={`flex items-center gap-2 cursor-pointer`}>
                <input
                  type="checkbox"
                  checked={assignedToMe}
                  onChange={(e) => setAssignedToMe(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-400"
                />
                <span className={`text-sm ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'المهام المعينة لي فقط' : 'Assigned to me only'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Tasks Lists */}
        <div className="space-y-8">
          {/* To Do Section */}
          <div>
            <h2 className={`text-xl font-bold ${colors.textPrimary} mb-4 flex items-center gap-2`}>
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              {lang === 'ar' ? 'قيد الانتظار' : 'To Do'}
              <span className={`text-sm font-normal ${colors.textSecondary}`}>({todoTasks.length})</span>
            </h2>
            <div className="space-y-3">
              {todoTasks.length > 0 ? (
                todoTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => openTaskDetail(task)}
                    lang={lang}
                  />
                ))
              ) : (
                <div className={`${colors.bgSecondary} rounded-lg p-6 text-center ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'لا توجد مهام قيد الانتظار' : 'No tasks to do'}
                </div>
              )}
            </div>
          </div>

          {/* In Progress Section */}
          <div>
            <h2 className={`text-xl font-bold ${colors.textPrimary} mb-4 flex items-center gap-2`}>
              <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
              {lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
              <span className={`text-sm font-normal ${colors.textSecondary}`}>({inProgressTasks.length})</span>
            </h2>
            <div className="space-y-3">
              {inProgressTasks.length > 0 ? (
                inProgressTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => openTaskDetail(task)}
                    lang={lang}
                  />
                ))
              ) : (
                <div className={`${colors.bgSecondary} rounded-lg p-6 text-center ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'لا توجد مهام قيد التنفيذ' : 'No tasks in progress'}
                </div>
              )}
            </div>
          </div>

          {/* Completed Section */}
          <div>
            <h2 className={`text-xl font-bold ${colors.textPrimary} mb-4 flex items-center gap-2`}>
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              {lang === 'ar' ? 'مكتملة' : 'Completed'}
              <span className={`text-sm font-normal ${colors.textSecondary}`}>({completedTasks.length})</span>
            </h2>
            <div className="space-y-3">
              {completedTasks.length > 0 ? (
                completedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => openTaskDetail(task)}
                    lang={lang}
                  />
                ))
              ) : (
                <div className={`${colors.bgSecondary} rounded-lg p-6 text-center ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'لا توجد مهام مكتملة' : 'No completed tasks'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          task={selectedTask}
          onSave={selectedTask ? handleUpdateTask : handleCreateTask}
          onCancel={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
          }}
          indices={indices}
          lang={lang}
        />
      )}

      {/* Task Detail Modal */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`${colors.bgSecondary} rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
              <h2 className={`text-2xl font-bold ${colors.textPrimary}`}>
                {selectedTask.title}
              </h2>
              <div className="flex items-center gap-2">
                {/* Only show edit/delete buttons to task creator */}
                {user?.id === selectedTask.created_by && (
                  <>
                    <button
                      onClick={() => openEditForm(selectedTask)}
                      className={`p-2 ${colors.textSecondary} hover:${colors.textPrimary} ${colors.bgHover} rounded-lg transition`}
                      title={lang === 'ar' ? 'تعديل' : 'Edit'}
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className={`p-2 text-red-600 hover:text-red-700 ${colors.bgHover} rounded-lg transition`}
                      title={lang === 'ar' ? 'حذف' : 'Delete'}
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowTaskDetail(false);
                    setSelectedTask(null);
                  }}
                  className={`p-2 ${colors.textSecondary} hover:${colors.textPrimary} ${colors.bgHover} rounded-lg transition`}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h3 className={`text-lg font-semibold ${colors.textPrimary} mb-2`}>
                    {lang === 'ar' ? 'الوصف' : 'Description'}
                  </h3>
                  <p className={`${colors.textSecondary} whitespace-pre-wrap`}>
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Quick Status Change - Available to task creator and assignees */}
              {(user?.id === selectedTask.created_by || selectedTask.assignments?.some(a => a.user_id === user?.id)) && (
                <div>
                  <p className={`text-sm ${colors.textSecondary} mb-2`}>
                    {lang === 'ar' ? 'تغيير الحالة' : 'Change Status'}
                  </p>
                  <div className="flex gap-2">
                  <button
                    onClick={() => handleQuickStatusChange('todo')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedTask.status === 'todo'
                        ? 'bg-gray-500 text-white'
                        : `${colors.bgTertiary} ${colors.textSecondary} hover:${colors.bgHover}`
                    }`}
                  >
                    {lang === 'ar' ? 'قيد الانتظار' : 'To Do'}
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange('in_progress')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedTask.status === 'in_progress'
                        ? 'bg-blue-500 text-white'
                        : `${colors.bgTertiary} ${colors.textSecondary} hover:${colors.bgHover}`
                    }`}
                  >
                    {lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange('completed')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedTask.status === 'completed'
                        ? 'bg-green-500 text-white'
                        : `${colors.bgTertiary} ${colors.textSecondary} hover:${colors.bgHover}`
                    }`}
                  >
                    {lang === 'ar' ? 'مكتملة' : 'Completed'}
                  </button>
                </div>
              </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm ${colors.textSecondary} mb-1`}>
                    {lang === 'ar' ? 'الأولوية' : 'Priority'}
                  </p>
                  <p className={`font-medium ${colors.textPrimary}`}>
                    {selectedTask.priority === 'low' ? (lang === 'ar' ? 'منخفضة' : 'Low') :
                     selectedTask.priority === 'medium' ? (lang === 'ar' ? 'متوسطة' : 'Medium') :
                     (lang === 'ar' ? 'عالية' : 'High')}
                  </p>
                </div>
                {selectedTask.due_date && (
                  <div>
                    <p className={`text-sm ${colors.textSecondary} mb-1`}>
                      {lang === 'ar' ? 'الموعد النهائي' : 'Due Date'}
                    </p>
                    <p className={`font-medium ${colors.textPrimary}`}>
                      {new Date(selectedTask.due_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                )}
                {selectedTask.index_name && (
                  <div>
                    <p className={`text-sm ${colors.textSecondary} mb-1`}>
                      {lang === 'ar' ? 'المؤشر' : 'Index'}
                    </p>
                    <p className={`font-medium ${colors.textPrimary}`}>
                      {lang === 'ar' ? selectedTask.index_name : (selectedTask.index_name_en || selectedTask.index_name)}
                    </p>
                  </div>
                )}
              </div>

              {/* Assignees */}
              {selectedTask.assignments && selectedTask.assignments.length > 0 && (
                <div>
                  <h3 className={`text-lg font-semibold ${colors.textPrimary} mb-3`}>
                    {lang === 'ar' ? 'المكلفون' : 'Assignees'}
                  </h3>
                  <div className="space-y-2">
                    {selectedTask.assignments.map((assignment) => (
                      <div key={assignment.id} className={`p-3 ${colors.bgTertiary} rounded-lg`}>
                        <p className={`font-semibold text-base ${colors.textPrimary} mb-1`}>
                          {lang === 'ar' ? assignment.user_name : (assignment.user_name_en || assignment.user_name)}
                        </p>
                        <p className={`text-sm ${colors.textTertiary}`}>
                          {lang === 'ar' ? 'معين في' : 'Assigned on'} {new Date(assignment.assigned_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className={`text-lg font-semibold ${colors.textPrimary} mb-3`}>
                  {lang === 'ar' ? 'التعليقات' : 'Comments'} ({selectedTask.comments?.length || 0})
                </h3>

                {/* Comment List */}
                <div className="space-y-4 mb-4">
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map((comment) => (
                      <div key={comment.id} className={`p-4 ${colors.bgTertiary} rounded-lg`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className={`font-semibold text-base ${colors.textPrimary}`}>
                              {lang === 'ar' ? comment.user_name : (comment.user_name_en || comment.user_name)}
                            </p>
                            <span className={`text-xs ${colors.textTertiary}`}>•</span>
                            <p className={`text-xs ${colors.textTertiary}`}>
                              {new Date(comment.created_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                            </p>
                          </div>
                            <p className={`${colors.textSecondary} whitespace-pre-wrap`}>
                              {comment.comment}
                            </p>
                          {/* Attachments */}
                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {comment.attachments.map((attachment) => (
                                <a
                                  key={attachment.id}
                                  href={attachment.file_path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 text-sm ${colors.primary} hover:underline`}
                                >
                                  <Paperclip size={14} />
                                  {attachment.file_name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={`text-center ${colors.textSecondary} py-4`}>
                      {lang === 'ar' ? 'لا توجد تعليقات بعد' : 'No comments yet'}
                    </p>
                  )}
                </div>

                {/* Add Comment Form */}
                <div className={`border-t ${colors.border} pt-4`}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={lang === 'ar' ? 'أضف تعليق...' : 'Add a comment...'}
                    rows={3}
                    className={`w-full px-4 py-2 ${patterns.input} resize-none mb-3`}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  />
                  <div className="flex items-center gap-3">
                    <label className={`flex-1 cursor-pointer`}>
                      <div className={`flex items-center gap-2 px-4 py-2 ${colors.bgTertiary} ${colors.textSecondary} rounded-lg ${colors.bgHover} transition`}>
                        <Paperclip size={16} />
                        <span className="text-sm">
                          {commentFile ? commentFile.name : (lang === 'ar' ? 'إرفاق ملف' : 'Attach file')}
                        </span>
                      </div>
                      <input
                        type="file"
                        onChange={(e) => setCommentFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || submittingComment}
                      className={`flex items-center gap-2 px-6 py-2 ${patterns.button} disabled:opacity-50`}
                    >
                      <Send size={16} />
                      {submittingComment ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال' : 'Send')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
