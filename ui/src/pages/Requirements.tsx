import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, ChevronLeft, Users, UserCog, Loader2, AlertCircle, Layers, FileText, Paperclip, Lightbulb, Plus, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useIndexStore } from '../stores/indexStore';
import LevelIndicator from '../components/LevelIndicator';
import AssigneeManager from '../components/requirements/AssigneeManager';
import { RequirementFormModal, RequirementFormData } from '../components/requirements/RequirementFormModal';
import { DeleteRequirementDialog } from '../components/requirements/DeleteRequirementDialog';
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
  const canManageAssignees = user?.role === 'INDEX_MANAGER' ||
                            user?.role === 'SECTION_COORDINATOR' ||
                            user?.role === 'ADMIN';

  // Check if user can manage requirements (create/edit/delete/reorder)
  const canManageRequirements = canManageAssignees; // Same permissions as assignee management

  // Modal states for requirement CRUD
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingRequirement, setDeletingRequirement] = useState<Requirement | null>(null);
  const [sections, setSections] = useState<{
    main_areas: Array<{ ar: string; en: string }>;
    sub_domains: Array<{ ar: string; en: string }>;
    elements: Array<{ ar: string; en: string }>;
  } | null>(null);

  // Load requirements when index changes
  useEffect(() => {
    if (currentIndex) {
      loadRequirements();
      loadSections();
    }
  }, [currentIndex?.id]);

  // Load sections data for autocomplete
  const loadSections = async () => {
    if (!currentIndex) return;

    try {
      const sectionsData = await api.requirements.getSections(currentIndex.id);
      setSections(sectionsData);
    } catch (err) {
      console.error('Failed to load sections:', err);
      // Non-critical - continue without sections
    }
  };

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
  }).sort((a, b) => {
    // Sort by display_order
    return a.display_order - b.display_order;
  });

  // Get unique main areas (sections) from requirements, preserving display order
  const sortedRequirements = [...requirements].sort((a, b) => a.display_order - b.display_order);
  const mainAreas: string[] = [];
  sortedRequirements.forEach(r => {
    if (!mainAreas.includes(r.main_area_ar)) {
      mainAreas.push(r.main_area_ar);
    }
  });

  const handleSaveAssignees = async (requirementId: string) => {
    // Reload requirements to get updated assignments
    await loadRequirements();
  };

  const handleEditAssignees = (e: React.MouseEvent, requirementId: string) => {
    e.stopPropagation(); // Prevent row click navigation
    setEditingAssignees(requirementId);
  };

  // Requirement CRUD handlers
  const handleCreateRequirement = () => {
    setEditingRequirement(null);
    setShowRequirementModal(true);
  };

  const handleEditRequirement = (e: React.MouseEvent, requirement: Requirement) => {
    e.stopPropagation(); // Prevent row click navigation
    setEditingRequirement(requirement);
    setShowRequirementModal(true);
  };

  const handleDeleteRequirement = async (e: React.MouseEvent, requirement: Requirement) => {
    e.stopPropagation(); // Prevent row click navigation
    setDeletingRequirement(requirement);
    setShowDeleteDialog(true);
  };

  const handleSubmitRequirement = async (data: RequirementFormData) => {
    if (!currentIndex || !user) return;

    try {
      if (editingRequirement) {
        // Update existing requirement
        await api.requirements.updateRequirement(editingRequirement.id, user.id, data);
        toast.success(lang === 'ar' ? 'تم تحديث المتطلب بنجاح' : 'Requirement updated successfully');
      } else {
        // Create new requirement
        await api.requirements.create(currentIndex.id, user.id, data);
        toast.success(lang === 'ar' ? 'تم إنشاء المتطلب بنجاح' : 'Requirement created successfully');
      }

      setShowRequirementModal(false);
      setEditingRequirement(null);
      await loadRequirements();
      await loadSections(); // Refresh sections for autocomplete
    } catch (err: any) {
      console.error('Failed to save requirement:', err);
      toast.error(
        lang === 'ar'
          ? err.response?.data?.detail || 'فشل حفظ المتطلب'
          : err.response?.data?.detail || 'Failed to save requirement'
      );
    }
  };

  const handleConfirmDelete = async (force: boolean) => {
    if (!deletingRequirement || !user) return;

    try {
      await api.requirements.delete(deletingRequirement.id, user.id, force);
      toast.success(lang === 'ar' ? 'تم حذف المتطلب بنجاح' : 'Requirement deleted successfully');
      setShowDeleteDialog(false);
      setDeletingRequirement(null);
      await loadRequirements();
      await loadSections(); // Refresh sections
    } catch (err: any) {
      console.error('Failed to delete requirement:', err);
      toast.error(
        lang === 'ar'
          ? err.response?.data?.detail || 'فشل حذف المتطلب'
          : err.response?.data?.detail || 'Failed to delete requirement'
      );
    }
  };

  const handleReorder = async (e: React.MouseEvent, requirementId: string, direction: 'up' | 'down') => {
    e.stopPropagation(); // Prevent row click navigation

    if (!currentIndex || !user) return;

    try {
      await api.requirements.reorder(currentIndex.id, requirementId, direction, user.id);
      toast.success(lang === 'ar' ? 'تم إعادة الترتيب بنجاح' : 'Reordered successfully');
      await loadRequirements();
    } catch (err: any) {
      console.error('Failed to reorder requirement:', err);
      toast.error(
        lang === 'ar'
          ? err.response?.data?.detail || 'فشل إعادة الترتيب'
          : err.response?.data?.detail || 'Failed to reorder'
      );
    }
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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className={`text-3xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'إدارة المتطلبات' : 'Requirements Management'}
            </h1>
            <p className={`mt-2 ${colors.textSecondary}`}>
              {lang === 'ar' ? 'إدارة ومتابعة جميع متطلبات المؤشر' : 'Manage and track all index requirements'}
            </p>
          </div>
          {canManageRequirements && (
            <button
              onClick={handleCreateRequirement}
              className={`flex items-center gap-2 px-4 py-2 ${patterns.button}`}
            >
              <Plus size={20} />
              {lang === 'ar' ? 'إضافة متطلب' : 'Add Requirement'}
            </button>
          )}
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
              {mainAreas.map(section => (
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
                    {lang === 'ar' ? 'المسؤولين' : 'Assignees'}
                  </th>
                  {canManageRequirements && (
                    <th className={`w-40 px-4 py-3 text-center text-xs font-semibold ${colors.textSecondary} uppercase tracking-wider`}>
                      {lang === 'ar' ? 'الإجراءات' : 'Actions'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--color-border))]">
                {mainAreas.map(section => {
                  const sectionReqs = filteredRequirements.filter(r => r.main_area_ar === section);
                  if (sectionReqs.length === 0 && selectedSection !== 'all' && selectedSection !== section) return null;
                  if (sectionReqs.length === 0 && selectedSection === 'all') return null;

                  // Get unique criteria (المعيار/element_ar) within this section, preserving display order
                  const criteria: string[] = [];
                  sectionReqs.forEach(r => {
                    if (r.element_ar && !criteria.includes(r.element_ar)) {
                      criteria.push(r.element_ar);
                    }
                  });

                  return (
                    <>
                      {/* Section Header Row */}
                      <tr key={`section-${section}`}>
                        <td colSpan={canManageRequirements ? 5 : 4} className="p-0">
                          <div className={`${colors.primary} px-5 py-3`}>
                            <h3 className="text-base font-semibold text-white">
                              {section}
                            </h3>
                          </div>
                        </td>
                      </tr>

                      {/* Criteria groups (المعيار) */}
                      {criteria.map(criterion => {
                        const criterionReqs = sectionReqs.filter(r => r.element_ar === criterion);

                        return (
                          <>
                            {/* Criterion Header Row (المعيار) */}
                            <tr key={`criterion-${section}-${criterion}`}>
                              <td colSpan={canManageRequirements ? 5 : 4} className="p-0">
                                <div className={`${colors.bgTertiary} px-5 py-2`}>
                                  <h4 className={`text-sm font-semibold ${colors.textPrimary}`}>
                                    {criterion}
                                  </h4>
                                </div>
                              </td>
                            </tr>

                            {/* Requirement Rows */}
                            {criterionReqs.map(req => {
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
                                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                                  {/* Show orange file icon if evidence is required */}
                                  {(req.evidence_description_ar || req.evidence_description_en) && (
                                    <FileText
                                      className="text-orange-400 dark:text-orange-500 opacity-60"
                                      size={13}
                                      title={lang === 'ar' ? 'يتطلب إرفاق دليل' : 'Requires evidence attachment'}
                                    />
                                  )}
                                  {/* Show green paperclip with count if evidence is attached */}
                                  {req.evidence_count > 0 && (
                                    <span className="flex items-center gap-0.5 text-green-600 dark:text-green-500" title={lang === 'ar' ? `${req.evidence_count} مرفقات` : `${req.evidence_count} attachments`}>
                                      <Paperclip size={13} />
                                      <span className="text-xs font-medium">{req.evidence_count}</span>
                                    </span>
                                  )}
                                  {/* Show amber lightbulb with count if recommendations exist */}
                                  {req.recommendations_count > 0 && (
                                    <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-500" title={lang === 'ar' ? `${req.recommendations_count} توصيات` : `${req.recommendations_count} recommendations`}>
                                      <Lightbulb size={13} />
                                      <span className="text-xs font-medium">{req.recommendations_count}</span>
                                    </span>
                                  )}
                                  {lang === 'ar' ? (
                                    <ChevronLeft className={`${colors.textTertiary} ${colors.primaryIcon} transition`} size={18} />
                                  ) : (
                                    <ChevronRight className={`${colors.textTertiary} ${colors.primaryIcon} transition`} size={18} />
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Current Level / Answer Status */}
                            <td className="px-4 py-4">
                              <div className="flex justify-center">
                                {currentIndex?.index_type === 'ETARI' ? (
                                  // Show single dot status indicator for ETARI - 5 colors for 5 statuses
                                  <div
                                    className={`w-4 h-4 rounded-full transition-all shadow-sm ${
                                      req.answer_status === 'approved' ? 'bg-blue-500' :
                                      req.answer_status === 'rejected' ? 'bg-orange-500' :
                                      req.answer_status === 'pending_review' ? 'bg-green-500' :
                                      req.answer_status === 'draft' ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    title={
                                      req.answer_status === 'approved' ? (lang === 'ar' ? 'مُوافق عليها' : 'Approved') :
                                      req.answer_status === 'rejected' ? (lang === 'ar' ? 'مرفوضة' : 'Rejected') :
                                      req.answer_status === 'pending_review' ? (lang === 'ar' ? 'قيد المراجعة' : 'Under Review') :
                                      req.answer_status === 'draft' ? (lang === 'ar' ? 'مسودة' : 'Draft') :
                                      (lang === 'ar' ? 'لم يبدأ' : 'Not Started')
                                    }
                                  />
                                ) : (
                                  // Show level indicator for NAII
                                  <LevelIndicator
                                    currentLevel={assignees.length > 0 ? Math.max(...assignees.map(a => a.current_level ? parseInt(a.current_level) : 0)) : 0}
                                    indexType={currentIndex?.index_type || 'NAII'}
                                    size="md"
                                    lang={lang}
                                  />
                                )}
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

                            {/* Actions - Edit, Delete, Reorder */}
                            {canManageRequirements && (
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Reorder Up */}
                                  <button
                                    onClick={(e) => handleReorder(e, req.id, 'up')}
                                    disabled={req.display_order === 1}
                                    className={`p-1.5 rounded-lg transition ${
                                      req.display_order === 1
                                        ? 'opacity-30 cursor-not-allowed'
                                        : `${colors.textSecondary} hover:${colors.primaryIcon} hover:bg-blue-50 dark:hover:${colors.bgHover}`
                                    }`}
                                    title={lang === 'ar' ? 'تحريك لأعلى' : 'Move Up'}
                                  >
                                    <ChevronUp size={16} />
                                  </button>

                                  {/* Reorder Down */}
                                  <button
                                    onClick={(e) => handleReorder(e, req.id, 'down')}
                                    disabled={req.display_order === requirements.length}
                                    className={`p-1.5 rounded-lg transition ${
                                      req.display_order === requirements.length
                                        ? 'opacity-30 cursor-not-allowed'
                                        : `${colors.textSecondary} hover:${colors.primaryIcon} hover:bg-blue-50 dark:hover:${colors.bgHover}`
                                    }`}
                                    title={lang === 'ar' ? 'تحريك لأسفل' : 'Move Down'}
                                  >
                                    <ChevronDown size={16} />
                                  </button>

                                  {/* Edit */}
                                  <button
                                    onClick={(e) => handleEditRequirement(e, req)}
                                    className={`p-1.5 ${colors.textSecondary} hover:${colors.primaryIcon} hover:bg-yellow-50 dark:hover:${colors.bgHover} rounded-lg transition`}
                                    title={lang === 'ar' ? 'تعديل المتطلب' : 'Edit Requirement'}
                                  >
                                    <Edit2 size={16} />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={(e) => handleDeleteRequirement(e, req)}
                                    className={`p-1.5 ${colors.textSecondary} hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition`}
                                    title={lang === 'ar' ? 'حذف المتطلب' : 'Delete Requirement'}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                          </>
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

      {/* Requirement Form Modal (Create/Edit) */}
      {currentIndex && (
        <RequirementFormModal
          isOpen={showRequirementModal}
          onClose={() => {
            setShowRequirementModal(false);
            setEditingRequirement(null);
          }}
          onSubmit={handleSubmitRequirement}
          requirement={editingRequirement}
          indexId={currentIndex.id}
          sections={sections}
          maxDisplayOrder={requirements.length > 0 ? Math.max(...requirements.map(r => r.display_order)) : 0}
        />
      )}

      {/* Delete Requirement Dialog */}
      <DeleteRequirementDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletingRequirement(null);
        }}
        onConfirm={handleConfirmDelete}
        requirement={deletingRequirement}
        hasData={
          deletingRequirement
            ? {
                has_answer: !!deletingRequirement.answer_ar,
                evidence_count: deletingRequirement.evidence_count || 0,
                recommendation_count: deletingRequirement.recommendations_count || 0,
              }
            : null
        }
      />
    </div>
  );
};

export default Requirements;
