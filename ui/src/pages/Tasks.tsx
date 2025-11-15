import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Search, Loader2, AlertCircle, Layers } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useIndexStore } from '../stores/indexStore';
import { useAuthStore } from '../stores/authStore';
import { api, Assignment, Requirement } from '../services/api';
import { colors, patterns } from '../utils/darkMode';
import toast from 'react-hot-toast';

interface AssignmentWithRequirement extends Assignment {
  requirement_code: string;
  requirement_question_ar: string;
  requirement_question_en: string | null;
  user_name_ar: string;
  user_name_en: string | null;
}

const Tasks = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const { currentIndex } = useIndexStore();
  const { user } = useAuthStore();
  const lang = language;

  const [assignments, setAssignments] = useState<AssignmentWithRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load assignments when index changes
  useEffect(() => {
    if (currentIndex) {
      loadAssignments();
    } else {
      setLoading(false);
    }
  }, [currentIndex?.id]);

  const loadAssignments = async () => {
    if (!currentIndex) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch assignments and requirements for current index
      const [assignmentsData, requirementsData] = await Promise.all([
        api.assignments.getByIndex(currentIndex.id),
        api.requirements.getAll({ index_id: currentIndex.id }),
      ]);

      // Create a map of requirements for quick lookup
      const reqMap = new Map(requirementsData.map(r => [r.id, r]));

      // Enrich assignments with requirement and user data
      // Filter to show only assignments that need management attention (review status)
      const enrichedAssignments: AssignmentWithRequirement[] = assignmentsData
        .filter(assignment => assignment.status === 'review') // Only show review status for management
        .map(assignment => {
          const req = reqMap.get(assignment.requirement_id);
          return {
            ...assignment,
            requirement_code: req?.code || assignment.requirement_id,
            requirement_question_ar: req?.question_ar || '',
            requirement_question_en: req?.question_en || null,
            user_name_ar: '', // These will be populated if using AssignmentWithUser type
            user_name_en: null,
          };
        });

      setAssignments(enrichedAssignments);
    } catch (err: any) {
      console.error('Failed to load assignments:', err);
      setError(err.message || 'Failed to load assignments');
      toast.error(lang === 'ar' ? 'فشل تحميل المهام' : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const question = lang === 'ar' ? assignment.requirement_question_ar : assignment.requirement_question_en || assignment.requirement_question_ar;

    const matchesSearch =
      assignment.requirement_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // All tasks shown are review tasks (management oversight)
  const statusCounts = {
    review: assignments.length, // All shown tasks are in review status
  };

  // No index selected
  if (!currentIndex) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Layers className={`w-16 h-16 ${colors.textSecondary} mx-auto mb-4`} />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'لم يتم اختيار مؤشر' : 'No Index Selected'}
            </h3>
            <p className={`${colors.textSecondary} mb-6`}>
              {lang === 'ar'
                ? 'يرجى اختيار مؤشر من القائمة أعلاه لعرض المهام'
                : 'Please select an index from the selector above to view tasks'}
            </p>
            <button
              onClick={() => navigate('/index')}
              className={`px-6 py-3 ${patterns.button}`}
            >
              {lang === 'ar' ? 'إدارة المؤشرات' : 'Manage Index'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              onClick={loadAssignments}
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
                  ? 'عرض جميع المهام والتكليفات لمتطلبات المؤشر'
                  : 'View all tasks and assignments for index requirements'}
              </p>
            </div>
            <button
              onClick={() => navigate('/requirements')}
              className={`flex items-center gap-2 px-4 py-2 ${patterns.button}`}
            >
              <Plus size={20} />
              <span>{lang === 'ar' ? 'إضافة تكليف' : 'Add Assignment'}</span>
            </button>
          </div>

          {/* Info Banner */}
          <div className={`${colors.primaryLight} border-l-4 ${colors.primary} px-4 py-3 rounded`}>
            <p className={`text-sm ${colors.textPrimary}`}>
              {lang === 'ar'
                ? 'هذه الصفحة مخصصة لمهام المديرين والمشرفين - عرض المهام التي تحتاج إلى مراجعة أو اعتماد فقط.'
                : 'This page is for managers and supervisors - showing only tasks that need review or approval.'}
            </p>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
          <div className={`${colors.bgSecondary} rounded-lg shadow dark:shadow-gray-900/50 p-6`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>
              {lang === 'ar' ? 'المهام التي تحتاج إلى مراجعة' : 'Tasks Awaiting Review'}
            </p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{statusCounts.review}</p>
            <p className={`text-xs ${colors.textTertiary} mt-2`}>
              {lang === 'ar' ? 'تتطلب اهتمام المدير أو المشرف' : 'Requires manager or supervisor attention'}
            </p>
          </div>
        </div>

        {/* Search Filter */}
        <div className={`${colors.bgSecondary} rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 mb-6`}>
          <div className="relative">
            <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colors.textSecondary}`} size={20} />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث في المهام...' : 'Search tasks...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-4 pr-10 py-2 ${patterns.input}`}
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredAssignments.length > 0 ? (
            filteredAssignments.map(assignment => {
              const question = lang === 'ar' ? assignment.requirement_question_ar : assignment.requirement_question_en || assignment.requirement_question_ar;

              const statusColors = {
                pending: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
                in_progress: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
                review: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
                completed: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
              };

              const statusLabels = {
                pending: { ar: 'قيد الانتظار', en: 'Pending' },
                in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
                review: { ar: 'قيد المراجعة', en: 'Review' },
                completed: { ar: 'مكتمل', en: 'Completed' },
              };

              return (
                <div
                  key={assignment.id}
                  onClick={() => navigate(`/requirements/${assignment.requirement_id}`)}
                  className={`${colors.bgSecondary} rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 cursor-pointer hover:shadow-xl transition`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-block font-mono text-xs font-semibold px-2.5 py-1.5 rounded ${colors.primaryLight} ${colors.primaryText}`}>
                          {assignment.requirement_code}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[assignment.status as keyof typeof statusColors]}`}>
                          {statusLabels[assignment.status as keyof typeof statusLabels]?.[lang] || assignment.status}
                        </span>
                      </div>
                      <h3 className={`text-lg font-semibold ${colors.textPrimary} mb-2`}>
                        {question}
                      </h3>
                      {assignment.completion_percentage && (
                        <div className="flex items-center gap-2 mt-3">
                          <div className={`flex-1 h-2 ${colors.bgTertiary} rounded-full overflow-hidden`}>
                            <div
                              className={`h-full ${colors.primary} transition-all duration-300`}
                              style={{ width: `${assignment.completion_percentage}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${colors.textSecondary}`}>
                            {assignment.completion_percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 text-sm ${colors.textSecondary}`}>
                    <span>
                      {lang === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(assignment.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                    {assignment.completed_at && (
                      <span>
                        {lang === 'ar' ? 'تاريخ الإكمال:' : 'Completed:'} {new Date(assignment.completed_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`${colors.bgSecondary} rounded-xl shadow-lg dark:shadow-gray-900/50 p-12 text-center`}>
              <Filter className={`mx-auto ${colors.textSecondary} mb-4`} size={48} />
              <h3 className={`text-xl font-semibold ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'لا توجد مهام' : 'No Tasks'}
              </h3>
              <p className={colors.textSecondary}>
                {lang === 'ar' ? 'لم يتم العثور على مهام تطابق معايير البحث' : 'No tasks match your search criteria'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
