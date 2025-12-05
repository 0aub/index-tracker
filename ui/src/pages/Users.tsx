import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Loader2, AlertCircle, Users as UsersIcon, Key, Eye, CheckCircle, Copy, Mail, Shield } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useIndexStore } from '../stores/indexStore';
import { api, User, IndexUserWithDetails } from '../services/api';
import { userManagementApi, type UserWithRoles, type CreateUserRequest, type UpdateUserRequest } from '../services/userManagement';
import { getCompleteHierarchy } from '../services/organizationHierarchy';
import toast from 'react-hot-toast';
import { colors, patterns } from '../utils/darkMode';
import UserSearchSelector from '../components/common/UserSearchSelector';

const Users = () => {
  const { language } = useUIStore();
  const { user: currentUser } = useAuthStore();
  const { currentIndex, setCurrentIndex } = useIndexStore();
  const lang = language;
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const isOwner = currentIndex?.user_role?.toLowerCase() === 'owner';
  const canManageRoles = isAdmin || isOwner;

  // Tab state
  const [activeTab, setActiveTab] = useState<'index' | 'system'>('index');

  // Index Users State
  const [indexUsers, setIndexUsers] = useState<IndexUserWithDetails[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'supervisor' | 'contributor'>('contributor');

  // System Users State (Admin only)
  const [systemUsers, setSystemUsers] = useState<UserWithRoles[]>([]);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemSearchTerm, setSystemSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [showAddSystemUserModal, setShowAddSystemUserModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [indices, setIndices] = useState<any[]>([]);

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [createdUserEmail, setCreatedUserEmail] = useState('');

  // New system user form
  const [newUserEmail, setNewUserEmail] = useState('');

  // Role change modal state
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState<IndexUserWithDetails | null>(null);
  const [newRole, setNewRole] = useState<'owner' | 'supervisor' | 'contributor'>('contributor');

  // Edit user modal state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserData, setEditUserData] = useState({
    user_id: '',
    first_name_ar: '',
    last_name_ar: '',
    first_name_en: '',
    last_name_en: '',
    agency_id: '',
    general_management_id: '',
    department_id: ''
  });
  const [hierarchy, setHierarchy] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'index' && currentIndex) {
      loadIndexUsers();
    } else if (activeTab === 'system' && isAdmin) {
      loadSystemUsers();
      loadIndices();
    } else if (activeTab === 'index') {
      setLoading(false);
    }
  }, [currentIndex, activeTab]);

  // Index Users Functions
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

  const openRoleChangeModal = (indexUser: IndexUserWithDetails) => {
    setRoleChangeUser(indexUser);
    setNewRole(indexUser.role as 'owner' | 'supervisor' | 'contributor');
    setShowRoleChangeModal(true);
  };

  const handleRoleChange = async () => {
    if (!roleChangeUser || !currentIndex) return;

    // Check if current user can change this role
    const isCurrentUserAdmin = currentUser?.role?.toLowerCase() === 'admin';
    const isCurrentUserOwner = currentIndex.user_role?.toLowerCase() === 'owner';
    const isTargetOwner = roleChangeUser.role?.toLowerCase() === 'owner';

    // Only admin or owner can change roles
    if (!isCurrentUserAdmin && !isCurrentUserOwner) {
      toast.error(lang === 'ar' ? 'ليس لديك صلاحية لتغيير الأدوار' : 'You do not have permission to change roles');
      return;
    }

    // Owner can only be downgraded by another owner or admin
    if (isTargetOwner && !isCurrentUserAdmin && !isCurrentUserOwner) {
      toast.error(lang === 'ar' ? 'فقط المعتمد أو المدير يمكنه تغيير دور المعتمد' : 'Only owner or admin can change owner role');
      return;
    }

    try {
      await api.indexUsers.update(roleChangeUser.id, { role: newRole });
      toast.success(lang === 'ar' ? 'تم تغيير الدور بنجاح' : 'Role changed successfully');
      setShowRoleChangeModal(false);
      setRoleChangeUser(null);
      loadIndexUsers();

      // If the changed user is the current user, refresh the current index to update user_role
      if (roleChangeUser.user_id === currentUser?.id && currentIndex) {
        // Fetch fresh index data to update cached user_role
        const freshIndex = await api.indices.getById(currentIndex.id);
        setCurrentIndex(freshIndex);
      }
    } catch (err: any) {
      console.error('Failed to change role:', err);
      toast.error(err.message || (lang === 'ar' ? 'فشل تغيير الدور' : 'Failed to change role'));
    }
  };

  const openAddUserModal = async () => {
    await loadAllUsers();
    setShowAddUserModal(true);
  };

  // System Users Functions (Admin only)
  const loadSystemUsers = async () => {
    try {
      setSystemLoading(true);
      const params: any = {};
      if (filterActive !== undefined) params.is_active = filterActive;
      if (systemSearchTerm) params.search = systemSearchTerm;

      const data = await userManagementApi.getAllUsers(params);
      setSystemUsers(data);
    } catch (error) {
      console.error('Failed to load system users:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users');
    } finally {
      setSystemLoading(false);
    }
  };

  const loadIndices = async () => {
    try {
      const data = await api.indices.getAll();
      setIndices(data);
    } catch (error) {
      console.error('Failed to load indices:', error);
    }
  };

  const handleCreateSystemUser = async () => {
    if (!newUserEmail) {
      toast.error(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter email');
      return;
    }

    try {
      const requestData: CreateUserRequest = {
        email: newUserEmail,
      };

      const response = await userManagementApi.createUser(requestData);

      // Show password in modal instead of toast
      setCreatedUserEmail(newUserEmail);
      setGeneratedPassword(response.temp_password);
      setShowPasswordModal(true);

      setShowAddSystemUserModal(false);
      setNewUserEmail('');
      loadSystemUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      toast.error(error.message || (lang === 'ar' ? 'فشل إنشاء المستخدم' : 'Failed to create user'));
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await userManagementApi.updateUserStatus({
        user_id: userId,
        is_active: newStatus,
      });

      toast.success(
        lang === 'ar'
          ? (newStatus ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب')
          : (newStatus ? 'Account activated' : 'Account deactivated')
      );

      loadSystemUsers();
    } catch (error: any) {
      console.error('Failed to update user status:', error);
      toast.error(error.message || (lang === 'ar' ? 'فشل تحديث حالة المستخدم' : 'Failed to update user status'));
    }
  };

  const handleResetPassword = async (userId: string) => {
    const user = systemUsers.find(u => u.id === userId);
    if (!user) return;

    if (!window.confirm(lang === 'ar' ? 'هل تريد إعادة تعيين كلمة المرور؟' : 'Reset password?')) {
      return;
    }

    try {
      const response = await userManagementApi.resetPassword(userId);
      // Show password in modal
      setGeneratedPassword(response.temp_password);
      setCreatedUserEmail(user.email);
      setShowPasswordModal(true);
      toast.success(lang === 'ar' ? 'تم إعادة تعيين كلمة المرور بنجاح' : 'Password reset successfully');
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      toast.error(error.message || (lang === 'ar' ? 'فشل إعادة تعيين كلمة المرور' : 'Failed to reset password'));
    }
  };

  const openEditUserModal = async (user: UserWithRoles) => {
    // Load hierarchy for dropdowns
    try {
      const hierarchyData = await getCompleteHierarchy();
      setHierarchy(hierarchyData);
    } catch (error) {
      console.error('Failed to load hierarchy:', error);
    }

    setEditUserData({
      user_id: user.id,
      first_name_ar: user.first_name_ar || '',
      last_name_ar: user.last_name_ar || '',
      first_name_en: user.first_name_en || '',
      last_name_en: user.last_name_en || '',
      agency_id: user.agency_id || '',
      general_management_id: user.general_management_id || '',
      department_id: user.department_id || ''
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    if (!editUserData.first_name_ar || !editUserData.last_name_ar) {
      toast.error(lang === 'ar' ? 'يرجى إدخال الاسم بالعربي' : 'Please enter Arabic name');
      return;
    }

    try {
      await userManagementApi.updateUser(editUserData);
      toast.success(lang === 'ar' ? 'تم تحديث المستخدم بنجاح' : 'User updated successfully');
      setShowEditUserModal(false);
      loadSystemUsers();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast.error(error.message || (lang === 'ar' ? 'فشل تحديث المستخدم' : 'Failed to update user'));
    }
  };

  const roleLabels = {
    // Index roles (per-index, not system-wide)
    owner: { ar: 'معتمد', en: 'Owner' },
    supervisor: { ar: 'مدقق', en: 'Reviewer' },
    contributor: { ar: 'مساهم', en: 'Contributor' },
    // System role (only ADMIN exists as global role)
    admin: { ar: 'مدير المنصة', en: 'Admin' },
    // For users with no system role (most users)
    '': { ar: 'لا يوجد دور نظام', en: 'No System Role' },
    null: { ar: 'لا يوجد دور نظام', en: 'No System Role' },
  };

  const getRoleLabel = (role: string | null | undefined) => {
    if (!role) return roleLabels[null][lang];
    const roleKey = role.toLowerCase();
    return roleLabels[roleKey as keyof typeof roleLabels]?.[lang] || role;
  };

  const getRoleBadgeColor = (role: string | null | undefined) => {
    if (!role) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    const roleKey = role.toLowerCase();
    switch (roleKey) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'supervisor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'contributor':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const filteredIndexUsers = indexUsers.filter(indexUser => {
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

  const roleStats = {
    all: indexUsers.length,
    owner: indexUsers.filter(u => u.role?.toLowerCase() === 'owner').length,
    supervisor: indexUsers.filter(u => u.role?.toLowerCase() === 'supervisor').length,
    contributor: indexUsers.filter(u => u.role?.toLowerCase() === 'contributor').length
  };

  // Render Index Users Tab
  const renderIndexUsersTab = () => {
    if (!currentIndex) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'لم يتم اختيار مؤشر' : 'No Index Selected'}
            </h3>
            <p className={`${colors.textSecondary}`}>
              {lang === 'ar' ? 'يرجى اختيار مؤشر لإدارة مستخدميه' : 'Please select an index to manage its users'}
            </p>
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <img src="/logo.png" alt="Loading..." className="w-16 h-16 animate-pulse" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-[rgb(var(--color-primary))] rounded-full animate-spin" />
            </div>
            <p className={colors.textSecondary}>
              {lang === 'ar' ? 'جاري تحميل المستخدمين...' : 'Loading users...'}
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
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
      );
    }

    return (
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <p className={`${colors.textSecondary}`}>
            {lang === 'ar'
              ? `مستخدمو المؤشر: ${currentIndex.name_ar}`
              : `Users for Index: ${currentIndex.name_en || currentIndex.name_ar}`}
          </p>
          <button
            onClick={openAddUserModal}
            className={`flex items-center gap-2 px-4 py-2 ${patterns.primaryButton}`}
          >
            <Plus size={20} />
            <span>{lang === 'ar' ? 'إضافة مستخدم' : 'Add User'}</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`${colors.bgSecondary} rounded-lg p-4 ${colors.border} border`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>{lang === 'ar' ? 'الكل' : 'All'}</p>
            <p className={`text-2xl font-bold ${colors.textPrimary}`}>{roleStats.all}</p>
          </div>
          <div className={`${colors.bgSecondary} rounded-lg p-4 ${colors.border} border`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>{lang === 'ar' ? 'معتمدين' : 'Owners'}</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{roleStats.owner}</p>
          </div>
          <div className={`${colors.bgSecondary} rounded-lg p-4 ${colors.border} border`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>{lang === 'ar' ? 'مدققين' : 'Reviewers'}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{roleStats.supervisor}</p>
          </div>
          <div className={`${colors.bgSecondary} rounded-lg p-4 ${colors.border} border`}>
            <p className={`text-sm ${colors.textSecondary} mb-1`}>{lang === 'ar' ? 'مساهمين' : 'Contributors'}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{roleStats.contributor}</p>
          </div>
        </div>

        {/* Filters */}
        <div className={`${colors.bgSecondary} rounded-lg p-4 mb-6 ${colors.border} border`}>
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
              className={`px-4 py-2 ${patterns.input}`}
            >
              <option value="all">{lang === 'ar' ? 'جميع الأدوار' : 'All Roles'}</option>
              <option value="owner">{lang === 'ar' ? 'معتمد' : 'Owner'}</option>
              <option value="supervisor">{lang === 'ar' ? 'مدقق' : 'Reviewer'}</option>
              <option value="contributor">{lang === 'ar' ? 'مساهم' : 'Contributor'}</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className={`${colors.bgSecondary} rounded-lg overflow-hidden ${colors.border} border`}>
          <table className="w-full">
            <thead className={`${colors.bgTertiary}`}>
              <tr>
                <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textSecondary} uppercase tracking-wider`}>
                  {lang === 'ar' ? 'المستخدم' : 'User'}
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textSecondary} uppercase tracking-wider`}>
                  {lang === 'ar' ? 'الدور' : 'Role'}
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textSecondary} uppercase tracking-wider`}>
                  {lang === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${colors.border}`}>
              {filteredIndexUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center">
                    <p className={colors.textSecondary}>
                      {lang === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredIndexUsers.map((indexUser) => (
                  <tr key={indexUser.id} className={`${colors.bgHover} transition`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className={`font-medium ${colors.textPrimary}`}>
                          {lang === 'ar' ? indexUser.user_full_name_ar : indexUser.user_full_name_en || indexUser.user_full_name_ar}
                        </p>
                        <p className={`text-sm ${colors.textSecondary}`}>{indexUser.user_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(indexUser.role)}`}>
                        {getRoleLabel(indexUser.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {canManageRoles && (
                          <button
                            onClick={() => openRoleChangeModal(indexUser)}
                            className={`p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition`}
                            title={lang === 'ar' ? 'تغيير الدور' : 'Change Role'}
                          >
                            <Shield size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveUser(indexUser.id)}
                          className={`p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition`}
                          title={lang === 'ar' ? 'إزالة' : 'Remove'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Role Change Modal */}
        {showRoleChangeModal && roleChangeUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className={`${colors.bgSecondary} rounded-xl p-6 w-full max-w-md shadow-xl`}>
              <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'تغيير دور المستخدم' : 'Change User Role'}
              </h2>

              <div className="mb-4">
                <p className={`${colors.textSecondary} mb-2`}>
                  {lang === 'ar' ? 'المستخدم:' : 'User:'}
                </p>
                <p className={`font-medium ${colors.textPrimary}`}>
                  {lang === 'ar' ? roleChangeUser.user_full_name_ar : roleChangeUser.user_full_name_en || roleChangeUser.user_full_name_ar}
                </p>
                <p className={`text-sm ${colors.textSecondary}`}>
                  {roleChangeUser.user_email}
                </p>
              </div>

              <div className="mb-4">
                <p className={`${colors.textSecondary} mb-2`}>
                  {lang === 'ar' ? 'الدور الحالي:' : 'Current Role:'}
                </p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(roleChangeUser.role)}`}>
                  {getRoleLabel(roleChangeUser.role)}
                </span>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'الدور الجديد' : 'New Role'}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className={`w-full px-3 py-2.5 ${patterns.input}`}
                >
                  <option value="contributor">{lang === 'ar' ? 'مساهم' : 'Contributor'}</option>
                  <option value="supervisor">{lang === 'ar' ? 'مدقق' : 'Reviewer'}</option>
                  <option value="owner">{lang === 'ar' ? 'معتمد' : 'Owner'}</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRoleChange}
                  disabled={newRole === roleChangeUser.role}
                  className={`flex-1 px-4 py-2.5 ${patterns.primaryButton} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {lang === 'ar' ? 'تغيير الدور' : 'Change Role'}
                </button>
                <button
                  onClick={() => {
                    setShowRoleChangeModal(false);
                    setRoleChangeUser(null);
                  }}
                  className={`flex-1 px-4 py-2.5 ${patterns.secondaryButton}`}
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className={`${colors.bgSecondary} rounded-xl p-6 w-full max-w-lg shadow-xl`}>
              <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'إضافة مستخدم للمؤشر' : 'Add User to Index'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'المستخدم' : 'User'}
                  </label>
                  <UserSearchSelector
                    users={allUsers.map(user => ({
                      id: user.id,
                      name: user.name,
                      name_en: user.name_en || user.name,
                      email: user.email,
                    }))}
                    selectedIds={selectedUserId ? [selectedUserId] : []}
                    onSelect={(userId) => setSelectedUserId(userId)}
                    onDeselect={() => setSelectedUserId('')}
                    placeholder={{
                      ar: 'ابحث بالاسم أو البريد الإلكتروني...',
                      en: 'Search by name or email...'
                    }}
                    multiple={false}
                    showRole={false}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'الدور في المؤشر' : 'Role in Index'}
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className={`w-full px-3 py-2.5 ${patterns.input}`}
                  >
                    <option value="contributor">{lang === 'ar' ? 'مساهم' : 'Contributor'}</option>
                    <option value="supervisor">{lang === 'ar' ? 'مدقق' : 'Reviewer'}</option>
                    <option value="owner">{lang === 'ar' ? 'معتمد' : 'Owner'}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleAddUser}
                  disabled={!selectedUserId}
                  className={`flex-1 px-4 py-2.5 ${patterns.primaryButton} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {lang === 'ar' ? 'إضافة' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowAddUserModal(false);
                    setSelectedUserId('');
                  }}
                  className={`flex-1 px-4 py-2.5 ${patterns.secondaryButton}`}
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

  // Render System Users Tab (Admin only)
  const renderSystemUsersTab = () => {
    return (
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <p className={`${colors.textSecondary}`}>
            {lang === 'ar' ? 'إدارة جميع مستخدمي النظام' : 'Manage all system users'}
          </p>
          <button
            onClick={() => setShowAddSystemUserModal(true)}
            className={`flex items-center gap-2 px-4 py-2 ${patterns.primaryButton}`}
          >
            <Plus size={20} />
            <span>{lang === 'ar' ? 'إنشاء مستخدم' : 'Create User'}</span>
          </button>
        </div>

        {/* Filters */}
        <div className={`${colors.bgSecondary} rounded-lg p-4 mb-6 ${colors.border} border`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colors.textTertiary}`} size={20} />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
                value={systemSearchTerm}
                onChange={(e) => setSystemSearchTerm(e.target.value)}
                className={`w-full pl-4 pr-10 py-2 ${patterns.input}`}
              />
            </div>

            <button
              onClick={loadSystemUsers}
              className={`px-4 py-2 ${patterns.secondaryButton} flex items-center justify-center gap-2`}
            >
              <Search size={18} />
              {lang === 'ar' ? 'بحث' : 'Search'}
            </button>
          </div>
        </div>

        {/* Users Table */}
        {systemLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative w-16 h-16">
              <img src="/logo.png" alt="Loading..." className="w-16 h-16 animate-pulse" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-[rgb(var(--color-primary))] rounded-full animate-spin" />
            </div>
          </div>
        ) : (
          <div className={`${colors.bgSecondary} rounded-lg overflow-hidden ${colors.border} border`}>
            <table className="w-full">
              <thead className={`${colors.bgTertiary}`}>
                <tr>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textSecondary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'المستخدم' : 'User'}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textSecondary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'الدور' : 'Role'}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textSecondary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${colors.textSecondary} uppercase tracking-wider`}>
                    {lang === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${colors.border}`}>
                {systemUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center">
                      <p className={colors.textSecondary}>
                        {lang === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  systemUsers.map((user) => (
                    <tr key={user.id} className={`${colors.bgHover} transition`}>
                      <td className="px-6 py-4">
                        <div>
                          <p className={`font-medium ${colors.textPrimary}`}>
                            {lang === 'ar' ? user.full_name_ar : user.full_name_en || user.full_name_ar}
                          </p>
                          <p className={`text-sm ${colors.textSecondary}`}>{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_active ? (
                          <UserCheck className="text-green-600 dark:text-green-400" size={20} />
                        ) : (
                          <UserX className="text-red-600 dark:text-red-400" size={20} />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserDetailsModal(true);
                            }}
                            className={`p-2 ${patterns.iconButton}`}
                            title={lang === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openEditUserModal(user)}
                            className={`p-2 ${patterns.iconButton}`}
                            title={lang === 'ar' ? 'تعديل المستخدم' : 'Edit User'}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className={`p-2 ${patterns.iconButton}`}
                            title={lang === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                          >
                            <Key size={18} />
                          </button>
                          {user.role?.toLowerCase() !== 'admin' && (
                            <button
                              onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                              className={`p-2 ${user.is_active ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300' : 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'} transition`}
                              title={user.is_active ? (lang === 'ar' ? 'تعطيل الحساب' : 'Deactivate') : (lang === 'ar' ? 'تفعيل الحساب' : 'Activate')}
                            >
                              {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add System User Modal */}
        {showAddSystemUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className={`${colors.bgSecondary} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'إنشاء مستخدم جديد' : 'Create New User'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} *
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className={`w-full px-3 py-2 ${patterns.input}`}
                    placeholder="user@example.com"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                <div className={`text-sm ${colors.textSecondary} mt-2`}>
                  {lang === 'ar'
                    ? 'سيتم إرسال كلمة مرور مؤقتة إلى بريد المستخدم. سيقوم المستخدم بإكمال معلوماته الشخصية والتنظيمية عند تسجيل الدخول لأول مرة.'
                    : 'A temporary password will be sent to the user\'s email. The user will complete their personal and organizational information on first login.'}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleCreateSystemUser}
                  className={`flex-1 px-4 py-2 ${patterns.primaryButton}`}
                >
                  {lang === 'ar' ? 'إنشاء' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowAddSystemUserModal(false);
                    setNewUserEmail('');
                  }}
                  className={`flex-1 px-4 py-2 ${patterns.secondaryButton}`}
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {showUserDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className={`${colors.bgSecondary} rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto`}>
              <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'تفاصيل المستخدم' : 'User Details'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'}</p>
                    <p className={`font-medium ${colors.textPrimary}`}>{selectedUser.full_name_ar}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'الاسم بالإنجليزي' : 'English Name'}</p>
                    <p className={`font-medium ${colors.textPrimary}`}>{selectedUser.full_name_en || '-'}</p>
                  </div>
                </div>

                <div>
                  <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                  <p className={`font-medium ${colors.textPrimary}`}>{selectedUser.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'الدور' : 'Role'}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(selectedUser.role)}`}>
                      {getRoleLabel(selectedUser.role)}
                    </span>
                  </div>
                  <div>
                    <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'الحالة' : 'Status'}</p>
                    <p className={`font-medium ${colors.textPrimary}`}>
                      {selectedUser.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
                    </p>
                  </div>
                </div>

                {selectedUser.agency_name_ar && (
                  <div>
                    <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'الوكالة' : 'Agency'}</p>
                    <p className={`font-medium ${colors.textPrimary}`}>{selectedUser.agency_name_ar}</p>
                  </div>
                )}

                {selectedUser.gm_name_ar && (
                  <div>
                    <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'الإدارة العامة' : 'General Management'}</p>
                    <p className={`font-medium ${colors.textPrimary}`}>{selectedUser.gm_name_ar}</p>
                  </div>
                )}

                {selectedUser.dept_name_ar && (
                  <div>
                    <p className={`text-sm ${colors.textSecondary}`}>{lang === 'ar' ? 'الإدارة' : 'Department'}</p>
                    <p className={`font-medium ${colors.textPrimary}`}>{selectedUser.dept_name_ar}</p>
                  </div>
                )}

                {selectedUser.index_roles && selectedUser.index_roles.length > 0 && (
                  <div>
                    <p className={`text-sm ${colors.textSecondary} mb-2`}>{lang === 'ar' ? 'المؤشرات' : 'Indices'}</p>
                    <div className="space-y-2">
                      {selectedUser.index_roles.map((indexRole, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${colors.bgTertiary}`}>
                          <p className={`font-medium ${colors.textPrimary}`}>{indexRole.index_name_ar}</p>
                          <p className={`text-sm ${colors.textSecondary}`}>
                            {lang === 'ar' ? 'الدور:' : 'Role:'} {getRoleLabel(indexRole.role)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setShowUserDetailsModal(false);
                  setSelectedUser(null);
                }}
                className={`w-full mt-6 px-4 py-2 ${patterns.secondaryButton}`}
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className={`${colors.bgSecondary} rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
              <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'تعديل بيانات المستخدم' : 'Edit User Details'}
              </h2>

              <div className="space-y-4">
                {/* Arabic Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'الاسم الأول (عربي)' : 'First Name (Arabic)'} *
                    </label>
                    <input
                      type="text"
                      value={editUserData.first_name_ar}
                      onChange={(e) => setEditUserData(prev => ({ ...prev, first_name_ar: e.target.value }))}
                      className={`w-full px-3 py-2 ${patterns.input}`}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'الاسم الأخير (عربي)' : 'Last Name (Arabic)'} *
                    </label>
                    <input
                      type="text"
                      value={editUserData.last_name_ar}
                      onChange={(e) => setEditUserData(prev => ({ ...prev, last_name_ar: e.target.value }))}
                      className={`w-full px-3 py-2 ${patterns.input}`}
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* English Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'الاسم الأول (إنجليزي)' : 'First Name (English)'}
                    </label>
                    <input
                      type="text"
                      value={editUserData.first_name_en}
                      onChange={(e) => setEditUserData(prev => ({ ...prev, first_name_en: e.target.value }))}
                      className={`w-full px-3 py-2 ${patterns.input}`}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'الاسم الأخير (إنجليزي)' : 'Last Name (English)'}
                    </label>
                    <input
                      type="text"
                      value={editUserData.last_name_en}
                      onChange={(e) => setEditUserData(prev => ({ ...prev, last_name_en: e.target.value }))}
                      className={`w-full px-3 py-2 ${patterns.input}`}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Organizational Hierarchy */}
                {hierarchy && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                        {lang === 'ar' ? 'الوكالة' : 'Agency'}
                      </label>
                      <select
                        value={editUserData.agency_id}
                        onChange={(e) => setEditUserData(prev => ({
                          ...prev,
                          agency_id: e.target.value,
                          general_management_id: '',
                          department_id: ''
                        }))}
                        className={`w-full px-3 py-2 ${patterns.input}`}
                      >
                        <option value="">{lang === 'ar' ? 'اختر الوكالة' : 'Select Agency'}</option>
                        {hierarchy.agencies?.map((agency: any) => (
                          <option key={agency.id} value={agency.id}>
                            {lang === 'ar' ? agency.name_ar : agency.name_en || agency.name_ar}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editUserData.agency_id && (
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                          {lang === 'ar' ? 'الإدارة العامة' : 'General Management'}
                        </label>
                        <select
                          value={editUserData.general_management_id}
                          onChange={(e) => setEditUserData(prev => ({
                            ...prev,
                            general_management_id: e.target.value,
                            department_id: ''
                          }))}
                          className={`w-full px-3 py-2 ${patterns.input}`}
                        >
                          <option value="">{lang === 'ar' ? 'اختر الإدارة العامة' : 'Select General Management'}</option>
                          {hierarchy.agencies
                            ?.find((a: any) => a.id === editUserData.agency_id)
                            ?.general_managements?.map((gm: any) => (
                              <option key={gm.id} value={gm.id}>
                                {lang === 'ar' ? gm.name_ar : gm.name_en || gm.name_ar}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {editUserData.general_management_id && (
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                          {lang === 'ar' ? 'الإدارة' : 'Department'}
                        </label>
                        <select
                          value={editUserData.department_id}
                          onChange={(e) => setEditUserData(prev => ({ ...prev, department_id: e.target.value }))}
                          className={`w-full px-3 py-2 ${patterns.input}`}
                        >
                          <option value="">{lang === 'ar' ? 'اختر الإدارة' : 'Select Department'}</option>
                          {hierarchy.agencies
                            ?.find((a: any) => a.id === editUserData.agency_id)
                            ?.general_managements
                            ?.find((gm: any) => gm.id === editUserData.general_management_id)
                            ?.departments?.map((dept: any) => (
                              <option key={dept.id} value={dept.id}>
                                {lang === 'ar' ? dept.name_ar : dept.name_en || dept.name_ar}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleUpdateUser}
                  className={`flex-1 px-4 py-2 ${patterns.primaryButton}`}
                >
                  {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className={`flex-1 px-4 py-2 ${patterns.secondaryButton}`}
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

  return (
    <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Tabs */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
            {lang === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
          </h1>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-300 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('index')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'index'
                  ? `${colors.primary} text-white rounded-t-lg`
                  : `${colors.textSecondary} hover:${colors.textPrimary}`
              }`}
            >
              {lang === 'ar' ? 'مستخدمو المؤشر' : 'Index Users'}
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('system')}
                className={`px-4 py-2 font-medium transition ${
                  activeTab === 'system'
                    ? `${colors.primary} text-white rounded-t-lg`
                    : `${colors.textSecondary} hover:${colors.textPrimary}`
                }`}
              >
                {lang === 'ar' ? 'مستخدمو النظام' : 'System Users'}
              </button>
            )}
          </div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className={`${colors.bgSecondary} rounded-2xl shadow-2xl w-full max-w-lg border ${colors.border} overflow-hidden animate-in fade-in zoom-in duration-200`}>
              {/* Success Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center">
                <div className="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center">
                  <CheckCircle className="text-green-500" size={36} />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {lang === 'ar' ? 'تم إنشاء المستخدم بنجاح!' : 'User Created Successfully!'}
                </h2>
                <p className="text-green-50 text-sm mt-1">
                  {lang === 'ar' ? 'يمكنك الآن مشاركة معلومات الحساب مع المستخدم' : 'You can now share account credentials with the user'}
                </p>
              </div>

              <div className="p-8 space-y-5">
                {/* Email */}
                <div>
                  <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${colors.textPrimary}`}>
                    <Mail size={16} className={colors.textSecondary} />
                    {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <div className={`px-4 py-3 rounded-xl ${colors.bgPrimary} border-2 ${colors.border} ${colors.textPrimary} font-medium`}>
                    {createdUserEmail}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${colors.textPrimary}`}>
                    <Key size={16} className={colors.textSecondary} />
                    {lang === 'ar' ? 'كلمة المرور المؤقتة' : 'Temporary Password'}
                  </label>
                  <div className="relative">
                    <div className={`px-6 py-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 font-mono text-xl tracking-widest text-center select-all font-bold shadow-inner`}>
                      {generatedPassword}
                    </div>
                    <button
                      onClick={() => {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(generatedPassword);
                          toast.success(lang === 'ar' ? 'تم نسخ كلمة المرور!' : 'Password copied!');
                        } else {
                          // Fallback for HTTP: select the text
                          const textArea = document.createElement('textarea');
                          textArea.value = generatedPassword;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                          toast.success(lang === 'ar' ? 'تم نسخ كلمة المرور!' : 'Password copied!');
                        }
                      }}
                      className="mt-3 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <Copy size={18} />
                      {lang === 'ar' ? 'نسخ كلمة المرور' : 'Copy Password'}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className={`p-4 rounded-xl bg-amber-50 dark:bg-amber-950 border-2 border-amber-200 dark:border-amber-800`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                      {lang === 'ar'
                        ? 'يرجى إرسال هذه المعلومات للمستخدم. الحساب غير مفعّل حتى يقوم المستخدم بتسجيل الدخول وإكمال البيانات الشخصية.'
                        : 'Please send this information to the user. The account will remain inactive until the user logs in and completes their profile.'}
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className={`w-full px-4 py-3 ${patterns.primaryButton} font-semibold text-base shadow-lg`}
                >
                  {lang === 'ar' ? 'تم، إغلاق' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'index' ? renderIndexUsersTab() : renderSystemUsersTab()}
      </div>
    </div>
  );
};

export default Users;
