import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, ChevronLeft, Users, UserCog, Loader2, AlertCircle, Layers } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useIndexStore } from '../stores/indexStore';
import LevelIndicator from '../components/LevelIndicator';
import AssigneeManager from '../components/requirements/AssigneeManager';
import { colors, patterns } from '../utils/darkMode';
import { api, Requirement, AssignmentWithUser } from '../services/api';
import toast from 'react-hot-toast';

interface RequirementWithAssignments extends Requirement {
  assignments: AssignmentWithUser[];
}

const Requirements = () => {
  const navigate = useNavigate();
  const { language, theme } = useUIStore();
  const { user } = useAuthStore();
  const { currentIndex } = useIndexStore();
  const lang = language;
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [editingAssignees, setEditingAssignees] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<RequirementWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has management access (can edit assignees)
  const canManageAssignees = user?.role === 'index_manager' ||
                            user?.role === 'section_coordinator' ||
                            user?.role === 'admin';

  // Load requirements when index changes
  useEffect(() => {
    if (currentIndex) {
      loadRequirements();
    }
  }, [currentIndex?.id]);

  const loadRequirements = async () => {
    if (!currentIndex) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch requirements for current index
      const reqData = await api.requirements.getAll({
        index_id: currentIndex.id,
      });

      // Fetch assignments for each requirement
      const requirementsWithAssignments = await Promise.all(
        reqData.map(async (req) => {
          try {
            const assignments = await api.assignments.getByRequirement(req.id);
            return { ...req, assignments };
          } catch (err) {
            console.warn(`Failed to load assignments for ${req.id}:`, err);
            return { ...req, assignments: [] };
          }
        })
      );

      setRequirements(requirementsWithAssignments);
    } catch (err: any) {
      console.error('Failed to load requirements:', err);
      setError(err.message || 'Failed to load requirements');
      toast.error(lang === 'ar' ? 'فشل تحميل المتطلبات' : 'Failed to load requirements');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const question = lang === 'ar' ? req.question_ar : req.question_en || req.question_ar;
    const mainArea = lang === 'ar' ? req.main_area_ar : req.main_area_en || req.main_area_ar;

    const matchesSearch =
      req.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mainArea.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSection = selectedSection === 'all' || req.main_area_ar === selectedSection;

    return matchesSearch && matchesSection;
  });

  // Get unique main areas (sections) from requirements
  const sections = Array.from(new Set(requirements.map(r => r.main_area_ar))).sort();

  const handleSaveAssignees = async (requirementId: string) => {
    // Reload requirements to get updated assignments
    await loadRequirements();
  };

  const handleEditAssignees = (e: React.MouseEvent, requirementId: string) => {
    e.stopPropagation(); // Prevent row click navigation
    setEditingAssignees(requirementId);
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
                ? 'يرجى اختيار مؤشر من القائمة أعلاه لعرض المتطلبات'
                : 'Please select an index from the selector above to view requirements'}
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
              {lang === 'ar' ? 'جاري تحميل المتطلبات...' : 'Loading requirements...'}
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
              onClick={loadRequirements}
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
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${colors.textPrimary}`}>
            {lang === 'ar' ? 'إدارة المتطلبات' : 'Requirements Management'}
          </h1>
          <p className={`mt-2 ${colors.textSecondary}`}>
            {lang === 'ar' ? 'إدارة ومتابعة جميع متطلبات المؤشر' : 'Manage and track all index requirements'}
          </p>
        </div>

        <div className={`${patterns.section} p-6 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colors.textTertiary}`} size={20} />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث في المتطلبات...' : 'Search requirements...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-4 pr-10 py-2 ${patterns.input}`}
              />
            </div>

            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className={`px-4 py-2 ${patterns.select}`}
            >
              <option value="all">{lang === 'ar' ? 'جميع الأقسام' : 'All Sections'}</option>
              {sections.map(section => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Compact Table View */}
        <div className={`${patterns.section} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${colors.bgTertiary} border-b-2 ${colors.border}`}>
                <tr>
                  <th className={`w-28 px-4 py-3 ${lang === 'ar' ? 'text-right' : 'text-left'} text-xs font-semibold ${colors.textSecondary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'المتطلب' : 'Requirement'}
                  </th>
                  <th className={`px-4 py-3 ${lang === 'ar' ? 'text-right' : 'text-left'} text-xs font-semibold ${colors.textSecondary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'السؤال' : 'Question'}
                  </th>
                  <th className={`w-28 px-4 py-3 text-center text-xs font-semibold ${colors.textSecondary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'المستوى' : 'Level'}
                  </th>
                  <th className={`w-52 px-4 py-3 text-center text-xs font-semibold ${colors.textSecondary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'المسؤولون' : 'Assignees'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--color-border))]">
                {sections.map(section => {
                  const sectionReqs = filteredRequirements.filter(r => r.main_area_ar === section);
                  if (sectionReqs.length === 0 && selectedSection !== 'all' && selectedSection !== section) return null;
                  if (sectionReqs.length === 0 && selectedSection === 'all') return null;

                  return (
                    <>
                      {/* Section Header Row */}
                      <tr key={`section-${section}`}>
                        <td colSpan={4} className="p-0">
                          <div className={`${colors.primary} px-5 py-3`}>
                            <h3 className="text-base font-semibold text-white">
                              {section}
                            </h3>
                          </div>
                        </td>
                      </tr>

                      {/* Requirement Rows */}
                      {sectionReqs.map(req => {
                        const assignees = req.assignments || [];

                        return (
                          <tr
                            key={req.id}
                            onClick={() => navigate(`/requirements/${req.id}`)}
                            className={`${colors.bgHover} hover:shadow-md transition cursor-pointer group`}
                          >
                            {/* Requirement ID */}
                            <td className={`px-4 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                              <span className={`inline-block font-mono text-xs font-semibold px-2.5 py-1.5 rounded ${colors.primaryLight} ${colors.primaryText}`}>
                                {req.code}
                              </span>
                            </td>

                            {/* Question */}
                            <td className={`px-4 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                              <div className="flex items-start justify-between gap-3">
                                <span
                                  className={`text-sm ${colors.textPrimary} leading-relaxed ${colors.primaryTextHover} transition`}
                                  title={lang === 'ar' ? req.question_ar : req.question_en || req.question_ar}
                                >
                                  {lang === 'ar' ? req.question_ar : req.question_en || req.question_ar}
                                </span>
                                {lang === 'ar' ? (
                                  <ChevronLeft className={`${colors.textTertiary} ${colors.primaryIcon} transition flex-shrink-0 mt-0.5`} size={18} />
                                ) : (
                                  <ChevronRight className={`${colors.textTertiary} ${colors.primaryIcon} transition flex-shrink-0 mt-0.5`} size={18} />
                                )}
                              </div>
                            </td>

                            {/* Current Level */}
                            <td className="px-4 py-4">
                              <div className="flex justify-center">
                                <LevelIndicator
                                  currentLevel={assignees.length > 0 ? Math.max(...assignees.map(a => a.current_level ? parseInt(a.current_level) : 0)) : 0}
                                  size="md"
                                />
                              </div>
                            </td>

                            {/* Assignees */}
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex items-center -space-x-2">
                                  {assignees.slice(0, 3).map((assignment, idx) => (
                                    <div
                                      key={assignment.id}
                                      className={`w-8 h-8 border-2 border-[rgb(var(--color-focus-ring))] ${colors.bgSecondary} rounded-md flex items-center justify-center ${colors.primaryIcon} text-xs font-bold shadow-sm`}
                                      style={{ zIndex: 10 - idx }}
                                      title={lang === 'ar' ? assignment.user_name_ar : assignment.user_name_en || assignment.user_name_ar}
                                    >
                                      {(lang === 'ar' ? assignment.user_name_ar : assignment.user_name_en || assignment.user_name_ar).charAt(0)}
                                    </div>
                                  ))}
                                  {assignees.length > 3 && (
                                    <div
                                      className={`w-8 h-8 ${colors.bgTertiary} ${colors.textSecondary} rounded-md flex items-center justify-center text-xs font-bold shadow-sm border-2 ${colors.border}`}
                                      style={{ zIndex: 0 }}
                                      title={`+${assignees.length - 3} more`}
                                    >
                                      +{assignees.length - 3}
                                    </div>
                                  )}
                                </div>
                                {canManageAssignees && (
                                  <button
                                    onClick={(e) => handleEditAssignees(e, req.id)}
                                    className={`p-1.5 ${colors.primaryIcon} hover:bg-green-50 dark:hover:${colors.bgHover} rounded-lg transition opacity-0 group-hover:opacity-100`}
                                    title={lang === 'ar' ? 'إدارة المسؤولين' : 'Manage Assignees'}
                                  >
                                    <UserCog size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredRequirements.length === 0 && (
          <div className={`${patterns.section} p-12 text-center`}>
            <h3 className={`text-xl font-semibold mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'لا توجد نتائج' : 'No Results'}
            </h3>
            <p className={colors.textSecondary}>
              {lang === 'ar'
                ? 'لم يتم العثور على متطلبات تطابق معايير البحث'
                : 'No requirements match your search criteria'}
            </p>
          </div>
        )}
      </div>

      {/* Assignee Manager Modal */}
      {editingAssignees && currentIndex && (
        <AssigneeManager
          requirementId={editingAssignees}
          indexId={currentIndex.id}
          onSave={() => handleSaveAssignees(editingAssignees)}
          onClose={() => setEditingAssignees(null)}
          lang={lang}
        />
      )}
    </div>
  );
};

export default Requirements;
