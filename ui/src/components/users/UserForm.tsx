import { useState } from 'react';
import { X } from 'lucide-react';
import { User, UserRole } from '../../types';
import { colors, patterns } from '../../utils/darkMode';
import toast from 'react-hot-toast';

interface UserFormProps {
  user: User | null;
  onSave: (user: User) => void;
  onCancel: () => void;
  lang: 'ar' | 'en';
}

const UserForm = ({ user, onSave, onCancel, lang }: UserFormProps) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    name_en: user?.name_en || '',
    email: user?.email || '',
    role: user?.role || 'contributor',
    department: user?.department || '',
    active: user?.active ?? true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const roleLabels = {
    admin: { ar: 'مدير', en: 'Admin' },
    index_manager: { ar: 'مدير المؤشر', en: 'Index Manager' },
    section_coordinator: { ar: 'منسق قسم', en: 'Section Coordinator' },
    contributor: { ar: 'مساهم', en: 'Contributor' },
    auditor: { ar: 'مراجع', en: 'Auditor' },
    viewer: { ar: 'مشاهد', en: 'Viewer' }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = lang === 'ar' ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    }

    if (!formData.name_en.trim()) {
      newErrors.name_en = lang === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format';
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

    const userData: User = {
      id: user?.id || 'usr-' + Date.now(),
      name: formData.name.trim(),
      name_en: formData.name_en.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role as any,
      department: formData.department.trim() || undefined,
      active: formData.active,
      created_at: user?.created_at || new Date().toISOString(),
      last_login: user?.last_login
    };

    onSave(userData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`${colors.bgSecondary} rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
          <h2 className={`text-2xl font-bold ${colors.textPrimary}`}>
            {user
              ? (lang === 'ar' ? 'تعديل المستخدم' : 'Edit User')
              : (lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User')}
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
          {/* Arabic Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.input} ${
                errors.name ? 'border-red-500' : ''
              }`}
              placeholder={lang === 'ar' ? 'أدخل الاسم بالعربية' : 'Enter Arabic name'}
              dir="rtl"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* English Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'} *
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.input} ${
                errors.name_en ? 'border-red-500' : ''
              }`}
              placeholder={lang === 'ar' ? 'أدخل الاسم بالإنجليزية' : 'Enter English name'}
              dir="ltr"
            />
            {errors.name_en && (
              <p className="mt-1 text-sm text-red-600">{errors.name_en}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.input} ${
                errors.email ? 'border-red-500' : ''
              }`}
              placeholder={lang === 'ar' ? 'example@domain.com' : 'example@domain.com'}
              dir="ltr"
              disabled={!!user}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
            {user && (
              <p className={`mt-1 text-xs ${colors.textSecondary}`}>
                {lang === 'ar' ? 'لا يمكن تعديل البريد الإلكتروني' : 'Email cannot be changed'}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'الدور' : 'Role'} *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.select}`}
            >
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label[lang]}
                </option>
              ))}
            </select>
            <p className={`mt-1 text-xs ${colors.textSecondary}`}>
              {lang === 'ar'
                ? 'يحدد الدور الصلاحيات والوصول في النظام'
                : 'Role determines permissions and access level in the system'}
            </p>
          </div>

          {/* Department */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'القسم' : 'Department'}
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className={`w-full px-4 py-2 ${patterns.input}`}
              placeholder={lang === 'ar' ? 'مثال: قسم الذكاء الاصطناعي' : 'e.g., AI Department'}
            />
          </div>

          {/* Active Status */}
          <div className={`flex items-center gap-3 p-4 ${colors.bgTertiary} rounded-lg`}>
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className={`w-4 h-4 text-green-600 ${colors.border} rounded focus:ring-green-400`}
            />
            <label htmlFor="active" className={`text-sm font-medium ${colors.textPrimary} cursor-pointer`}>
              {lang === 'ar' ? 'حساب نشط' : 'Active Account'}
            </label>
          </div>

          {/* Password Note (for new users) */}
          {!user && (
            <div className={`p-4 ${colors.primaryLight} border ${colors.border} rounded-lg`}>
              <p className={`text-sm ${colors.primaryText}`}>
                {lang === 'ar'
                  ? 'سيتم إرسال كلمة مرور مؤقتة إلى البريد الإلكتروني للمستخدم'
                  : 'A temporary password will be sent to the user\'s email'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className={`flex items-center gap-3 pt-4 border-t ${colors.border}`}>
            <button
              type="submit"
              className={`flex-1 px-6 py-3 ${patterns.button} font-medium`}
            >
              {user
                ? (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                : (lang === 'ar' ? 'إضافة المستخدم' : 'Add User')}
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

export default UserForm;
