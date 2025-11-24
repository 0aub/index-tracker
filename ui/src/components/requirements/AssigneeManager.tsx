import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { colors, patterns } from '../../utils/darkMode';
import toast from 'react-hot-toast';
import { api, User, AssignmentWithUser } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface AssigneeManagerProps {
  requirementId: string;
  indexId: string;
  onSave: () => void;
  onClose: () => void;
  lang: 'ar' | 'en';
}

const AssigneeManager = ({ requirementId, indexId, onSave, onClose, lang }: AssigneeManagerProps) => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [requirementId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load index users with details (all roles: owner, supervisor, contributor)
      const [indexUsersData, assignmentsData] = await Promise.all([
        api.indexUsers.getAllWithDetails({
          index_id: indexId,
        }),
        api.assignments.getByRequirement(requirementId),
      ]);

      // Transform index users to User format (include all roles)
      const filteredUsers = indexUsersData
        .map(indexUser => ({
          id: indexUser.user_id,
          username: indexUser.user_username || '',
          full_name_ar: indexUser.user_full_name_ar || '',
          full_name_en: indexUser.user_full_name_en || '',
          email: indexUser.user_email || '',
          department_ar: '',
          department_en: '',
          role: indexUser.role,
          is_active: true,
          organizationId: currentUser?.organizationId || '',
        }));

      setUsers(filteredUsers);
      setAssignments(assignmentsData);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = users.filter(
    u => !assignments.some(a => a.user_id === u.id)
  );

  const handleAddAssignee = async () => {
    if (!selectedUser) {
      toast.error(lang === 'ar' ? 'يرجى اختيار مستخدم' : 'Please select a user');
      return;
    }

    try {
      setSaving(true);

      await api.assignments.create({
        index_id: indexId,
        requirement_id: requirementId,
        user_id: selectedUser,
        assigned_by: currentUser?.id,
      });

      toast.success(lang === 'ar' ? 'تمت الإضافة بنجاح' : 'Added successfully');
      setSelectedUser('');
      await loadData(); // Reload assignments
    } catch (error: any) {
      console.error('Failed to add assignee:', error);
      toast.error(lang === 'ar' ? 'فشل إضافة المسؤول' : 'Failed to add assignee');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    try {
      setSaving(true);

      await api.assignments.deleteByRequirementAndUser(requirementId, userId);

      toast.success(lang === 'ar' ? 'تمت الإزالة بنجاح' : 'Removed successfully');
      await loadData(); // Reload assignments
    } catch (error: any) {
      console.error('Failed to remove assignee:', error);
      toast.error(lang === 'ar' ? 'فشل إزالة المسؤول' : 'Failed to remove assignee');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${colors.bgSecondary} rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
          <div>
            <h2 className={`text-2xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'إدارة المسؤولين' : 'Manage Assignees'}
            </h2>
            <p className={`text-sm mt-1 ${colors.textSecondary}`}>
              {lang === 'ar' ? `المتطلب: ${requirementId}` : `Requirement: ${requirementId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${colors.bgHover} ${colors.textSecondary} hover:${colors.textPrimary} transition`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`w-8 h-8 animate-spin ${colors.primary}`} />
            </div>
          ) : (
            <>
              {/* Add Assignee Section */}
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-2 ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'إضافة مسؤول' : 'Add Assignee'}
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className={`flex-1 px-4 py-2 ${patterns.select}`}
                    disabled={saving}
                  >
                    <option value="">
                      {lang === 'ar' ? 'اختر مستخدم...' : 'Select a user...'}
                    </option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {lang === 'ar' ? user.full_name_ar : user.full_name_en || user.full_name_ar}
                        {' '}
                        ({user.role === 'owner'
                          ? (lang === 'ar' ? 'مالك' : 'Owner')
                          : user.role === 'supervisor'
                          ? (lang === 'ar' ? 'مشرف' : 'Supervisor')
                          : (lang === 'ar' ? 'مساهم' : 'Contributor')
                        })
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddAssignee}
                    disabled={!selectedUser || saving}
                    className={`flex items-center gap-2 px-4 py-2 ${patterns.button} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <UserPlus size={20} />
                    )}
                    <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                  </button>
                </div>
              </div>

              {/* Current Assignees */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'المسؤولين الحاليين' : 'Current Assignees'}
                  <span className={`ml-2 ${colors.textTertiary} font-normal`}>
                    ({assignments.length})
                  </span>
                </label>

                {assignments.length === 0 ? (
                  <div className={`${colors.bgTertiary} rounded-lg p-6 text-center`}>
                    <p className={colors.textSecondary}>
                      {lang === 'ar' ? 'لا يوجد مسؤولون مضافون' : 'No assignees added'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments.map(assignment => (
                      <div
                        key={assignment.id}
                        className={`flex items-center justify-between p-4 ${colors.bgTertiary} rounded-lg hover:${colors.bgHover} transition`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${colors.primary} rounded-full flex items-center justify-center text-white font-bold`}>
                            {(lang === 'ar' ? assignment.user_name_ar : assignment.user_name_en || assignment.user_name_ar).charAt(0)}
                          </div>
                          <div>
                            <p className={`font-medium ${colors.textPrimary}`}>
                              {lang === 'ar' ? assignment.user_name_ar : assignment.user_name_en || assignment.user_name_ar}
                            </p>
                            <p className={`text-sm ${colors.textSecondary}`}>
                              {lang === 'ar' ? assignment.user_department_ar : assignment.user_department_ar || assignment.user_role}
                              {' '} • {assignment.user_role}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAssignee(assignment.user_id)}
                          disabled={saving}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
                          title={lang === 'ar' ? 'إزالة' : 'Remove'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${colors.border}`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 ${colors.bgTertiary} ${colors.textPrimary} rounded-lg hover:${colors.bgHover} transition`}
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            className={`px-6 py-2.5 ${patterns.button}`}
          >
            {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssigneeManager;
