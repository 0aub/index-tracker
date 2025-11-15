import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Loader2, AlertCircle } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useIndexStore } from '../stores/indexStore';
import { api, User, IndexUserWithDetails } from '../services/api';
import toast from 'react-hot-toast';
import { colors, patterns } from '../utils/darkMode';

const Users = () => {
  const { language } = useUIStore();
  const { user: currentUser } = useAuthStore();
  const { currentIndex } = useIndexStore();
  const lang = language;

  const [indexUsers, setIndexUsers] = useState<IndexUserWithDetails[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'supervisor' | 'contributor'>('contributor');
  const [editingIndexUser, setEditingIndexUser] = useState<IndexUserWithDetails | null>(null);

  useEffect(() => {
    if (currentIndex) {
      loadIndexUsers();
    } else {
      setLoading(false);
    }
  }, [currentIndex]);

  const loadIndexUsers = async () => {
    if (!currentIndex) return;

    try {
      setLoading(true);
      setError(null);
      const data = await api.indexUsers.getAllWithDetails({
        index_id: currentIndex.id,
      });
      setIndexUsers(data);
    } catch (err: any) {
      console.error('Failed to load index users:', err);
      setError(err.message || 'Failed to load users');
      toast.error(lang === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    if (!currentUser) return;

    try {
      const data = await api.users.getAll({
        organization_id: currentUser.organizationId,
        is_active: true,
      });
      setAllUsers(data);
    } catch (err: any) {
      console.error('Failed to load all users:', err);
      toast.error(lang === 'ar' ? 'فشل تحميل قائمة المستخدمين' : 'Failed to load users list');
    }
  };

  const filteredUsers = indexUsers.filter(indexUser => {
    const fullName = lang === 'ar' ? indexUser.user_full_name_ar : indexUser.user_full_name_en || indexUser.user_full_name_ar;
    const email = indexUser.user_email || '';
    const username = indexUser.user_username || '';

    const matchesSearch =
      (fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || indexUser.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleAddUser = async () => {
    if (!currentIndex || !currentUser || !selectedUserId) {
      toast.error(lang === 'ar' ? 'يرجى اختيار مستخدم' : 'Please select a user');
      return;
    }

    try {
      await api.indexUsers.create({
        index_id: currentIndex.id,
        user_id: selectedUserId,
        role: selectedRole,
        added_by: currentUser.id,
      });

      toast.success(lang === 'ar' ? 'تمت إضافة المستخدم بنجاح' : 'User added successfully');
      setShowAddUserModal(false);
      setSelectedUserId('');
      setSelectedRole('contributor');
      loadIndexUsers();
    } catch (err: any) {
      console.error('Failed to add user:', err);
      toast.error(err.message || (lang === 'ar' ? 'فشل إضافة المستخدم' : 'Failed to add user'));
    }
  };

  const handleEditUserRole = async (indexUser: IndexUserWithDetails) => {
    if (!currentIndex) return;

    const newRole = window.prompt(
      lang === 'ar'
        ? 'أدخل الدور الجديد (owner, supervisor, contributor):'
        : 'Enter new role (owner, supervisor, contributor):',
      indexUser.role
    );

    if (!newRole || !['owner', 'supervisor', 'contributor'].includes(newRole)) {
      toast.error(lang === 'ar' ? 'دور غير صالح' : 'Invalid role');
      return;
    }

    try {
      await api.indexUsers.update(indexUser.id, {
        role: newRole as 'owner' | 'supervisor' | 'contributor',
      });

      toast.success(lang === 'ar' ? 'تم تحديث دور المستخدم' : 'User role updated');
      loadIndexUsers();
    } catch (err: any) {
      console.error('Failed to update user role:', err);
      toast.error(err.message || (lang === 'ar' ? 'فشل تحديث الدور' : 'Failed to update role'));
    }
  };

  const handleRemoveUser = async (indexUserId: string) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من إزالة هذا المستخدم من المؤشر؟' : 'Are you sure you want to remove this user from the index?')) {
      return;
    }

    try {
      await api.indexUsers.delete(indexUserId);
      toast.success(lang === 'ar' ? 'تم إزالة المستخدم من المؤشر' : 'User removed from index');
      loadIndexUsers();
    } catch (err: any) {
      console.error('Failed to remove user:', err);
      toast.error(err.message || (lang === 'ar' ? 'فشل إزالة المستخدم' : 'Failed to remove user'));
    }
  };

  const openAddUserModal = async () => {
    await loadAllUsers();
    setShowAddUserModal(true);
  };

  const roleLabels = {
    owner: { ar: 'مالك', en: 'Owner' },
    supervisor: { ar: 'مشرف', en: 'Supervisor' },
    contributor: { ar: 'مساهم', en: 'Contributor' },
  };

  const roleStats = {
    all: indexUsers.length,
    owner: indexUsers.filter(u => u.role === 'owner').length,
    supervisor: indexUsers.filter(u => u.role === 'supervisor').length,
    contributor: indexUsers.filter(u => u.role === 'contributor').length
  };

  // No index selected
  if (!currentIndex) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'لم يتم اختيار مؤشر' : 'No Index Selected'}
            </h3>
            <p className={`${colors.textSecondary} mb-4`}>
              {lang === 'ar' ? 'يرجى اختيار مؤشر لإدارة مستخدميه' : 'Please select an index to manage its users'}
            </p>
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
              {lang === 'ar' ? 'جاري تحميل المستخدمين...' : 'Loading users...'}
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
              onClick={loadIndexUsers}
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
            </h1>
            <p className={`${colors.textSecondary} mt-2`}>
              {lang === 'ar'
                ? `مستخدمو المؤشر: ${currentIndex.name_ar}`
                : `Users for Index: ${currentIndex.name_en || currentIndex.name_ar}`}
            </p>
          </div>
          <button
            onClick={openAddUserModal}
            className={`flex items-center gap-2 px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition`}
          >
            <Plus size={20} />
            <span>{lang === 'ar' ? 'إضافة مستخدم' : 'Add User'}</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`${colors.bgSecondary} rounded-lg shadow p-4`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>{lang === 'ar' ? 'الكل' : 'All'}</p>
            <p className={`text-2xl font-bold ${colors.textPrimary}`}>{roleStats.all}</p>
          </div>
          <div className={`${colors.bgSecondary} rounded-lg shadow p-4`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>{lang === 'ar' ? 'مالكين' : 'Owners'}</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{roleStats.owner}</p>
          </div>
          <div className={`${colors.bgSecondary} rounded-lg shadow p-4`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>{lang === 'ar' ? 'مشرفين' : 'Supervisors'}</p>
            <p className={`text-2xl font-bold ${colors.primaryIcon}`}>{roleStats.supervisor}</p>
          </div>
          <div className={`${colors.bgSecondary} rounded-lg shadow p-4`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>{lang === 'ar' ? 'مساهمين' : 'Contributors'}</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{roleStats.contributor}</p>
          </div>
        </div>

        {/* Filters */}
        <div className={`${colors.bgSecondary} rounded-xl shadow-lg p-6 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colors.textTertiary}`} size={20} />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث في المستخدمين...' : 'Search users...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-4 pr-10 py-2 ${patterns.input}`}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-4 py-2 ${patterns.select}`}
            >
              <option value="all">{lang === 'ar' ? 'جميع الأدوار' : 'All Roles'}</option>
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label[lang]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className={`${colors.bgSecondary} rounded-xl shadow-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${colors.bgPrimary} border-b ${colors.border}`}>
                <tr>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textTertiary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'المستخدم' : 'User'}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textTertiary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textTertiary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'الدور' : 'Role'}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textTertiary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className={`${colors.bgSecondary} divide-y ${colors.border}`}>
                {filteredUsers.map((indexUser) => (
                  <tr key={indexUser.id} className={`hover:${colors.bgHover} transition`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 border-2 border-[rgb(var(--color-focus-ring))] rounded-md flex items-center justify-center`}>
                          <span className={`${colors.primaryIcon} font-semibold`}>
                            {(lang === 'ar'
                              ? indexUser.user_full_name_ar
                              : indexUser.user_full_name_en || indexUser.user_full_name_ar || ''
                            ).charAt(0)}
                          </span>
                        </div>
                        <div className="mr-4">
                          <div className={`text-sm font-medium ${colors.textPrimary}`}>
                            {lang === 'ar'
                              ? indexUser.user_full_name_ar
                              : indexUser.user_full_name_en || indexUser.user_full_name_ar}
                          </div>
                          <div className={`text-xs ${colors.textSecondary}`}>
                            @{indexUser.user_username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${colors.textPrimary}`} dir="ltr">{indexUser.user_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors.primaryLight} ${colors.primaryText}`}>
                        {roleLabels[indexUser.role as keyof typeof roleLabels]?.[lang] || indexUser.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditUserRole(indexUser)}
                          className={`${colors.primaryIcon} ${colors.primaryTextHover}`}
                          title={lang === 'ar' ? 'تعديل الدور' : 'Edit Role'}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveUser(indexUser.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title={lang === 'ar' ? 'إزالة من المؤشر' : 'Remove from Index'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className={colors.textTertiary}>
                {lang === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${colors.bgSecondary} rounded-lg p-6 max-w-md w-full mx-4`}>
            <h2 className={`text-xl font-bold ${colors.textPrimary} mb-4`}>
              {lang === 'ar' ? 'إضافة مستخدم إلى المؤشر' : 'Add User to Index'}
            </h2>

            <div className="mb-4">
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                {lang === 'ar' ? 'المستخدم' : 'User'}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={`w-full px-4 py-2 ${patterns.select}`}
              >
                <option value="">{lang === 'ar' ? 'اختر مستخدم...' : 'Select user...'}</option>
                {allUsers
                  .filter(u => !indexUsers.some(iu => iu.user_id === u.id))
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {lang === 'ar' ? user.full_name_ar : user.full_name_en || user.full_name_ar} (@{user.username})
                    </option>
                  ))}
              </select>
            </div>

            <div className="mb-6">
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                {lang === 'ar' ? 'الدور' : 'Role'}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className={`w-full px-4 py-2 ${patterns.select}`}
              >
                {Object.entries(roleLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label[lang]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddUser}
                className={`flex-1 px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition`}
              >
                {lang === 'ar' ? 'إضافة' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setSelectedUserId('');
                  setSelectedRole('contributor');
                }}
                className={`flex-1 px-4 py-2 ${colors.bgPrimary} ${colors.textPrimary} rounded-lg ${colors.bgHover} transition`}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
