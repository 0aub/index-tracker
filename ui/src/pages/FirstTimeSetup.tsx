import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { colors, patterns } from '../utils/darkMode';
import { User, Building2, Lock, CheckCircle, Plus, X, Sun, Moon, Eye, EyeOff, ChevronDown, Check } from 'lucide-react';
import { agencyApi, generalManagementApi, departmentApi, type Agency, type GeneralManagement, type Department } from '../services/organizationHierarchy';
import { userManagementApi } from '../services/userManagement';
import { WaveAnimation } from '../components/WaveAnimation';
import toast from 'react-hot-toast';

const FirstTimeSetup: React.FC = () => {
  const { language, theme, setTheme } = useUIStore();
  const { updateUser } = useAuthStore();
  const lang = language;
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Personal Info
  const [firstNameAr, setFirstNameAr] = useState('');
  const [lastNameAr, setLastNameAr] = useState('');
  const [firstNameEn, setFirstNameEn] = useState('');
  const [lastNameEn, setLastNameEn] = useState('');

  // Organizational Info
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [generalManagements, setGeneralManagements] = useState<GeneralManagement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [selectedGMId, setSelectedGMId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Create New forms
  const [showCreateAgency, setShowCreateAgency] = useState(false);
  const [showCreateGM, setShowCreateGM] = useState(false);
  const [showCreateDept, setShowCreateDept] = useState(false);

  const [newAgencyCode, setNewAgencyCode] = useState('');
  const [newAgencyNameAr, setNewAgencyNameAr] = useState('');
  const [newAgencyNameEn, setNewAgencyNameEn] = useState('');

  const [newGMCode, setNewGMCode] = useState('');
  const [newGMNameAr, setNewGMNameAr] = useState('');
  const [newGMNameEn, setNewGMNameEn] = useState('');

  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptNameAr, setNewDeptNameAr] = useState('');
  const [newDeptNameEn, setNewDeptNameEn] = useState('');

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');

  // Password validation states
  const getPasswordValidation = () => {
    return {
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    };
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  useEffect(() => {
    if (selectedAgencyId) {
      loadGeneralManagements(selectedAgencyId);
      setSelectedGMId('');
      setSelectedDeptId('');
    }
  }, [selectedAgencyId]);

  useEffect(() => {
    if (selectedGMId) {
      loadDepartments(selectedGMId);
      setSelectedDeptId('');
    }
  }, [selectedGMId]);

  const loadAgencies = async () => {
    try {
      const data = await agencyApi.getAll();
      setAgencies(data);
    } catch (error) {
      console.error('Failed to load agencies:', error);
    }
  };

  const loadGeneralManagements = async (agencyId: string) => {
    try {
      const data = await generalManagementApi.getAll(agencyId);
      setGeneralManagements(data);
    } catch (error) {
      console.error('Failed to load general managements:', error);
    }
  };

  const loadDepartments = async (gmId: string) => {
    try {
      const data = await departmentApi.getAll(gmId);
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const handleCreateAgency = async () => {
    if (!newAgencyCode || !newAgencyNameAr || !newAgencyNameEn) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع حقول الوكالة' : 'Please fill all agency fields');
      return;
    }

    setLoading(true);
    try {
      const newAgency = await agencyApi.create({
        code: newAgencyCode,
        name_ar: newAgencyNameAr,
        name_en: newAgencyNameEn,
        display_order: 0,
        is_active: true,
      });

      toast.success(lang === 'ar' ? 'تم إنشاء الوكالة بنجاح' : 'Agency created successfully');
      setAgencies([...agencies, newAgency]);
      setSelectedAgencyId(newAgency.id);
      setShowCreateAgency(false);
      setNewAgencyCode('');
      setNewAgencyNameAr('');
      setNewAgencyNameEn('');
    } catch (error: any) {
      console.error('Failed to create agency:', error);
      toast.error(error.message || (lang === 'ar' ? 'فشل إنشاء الوكالة' : 'Failed to create agency'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGM = async () => {
    if (!selectedAgencyId) {
      toast.error(lang === 'ar' ? 'يرجى اختيار الوكالة أولاً' : 'Please select an agency first');
      return;
    }
    if (!newGMCode || !newGMNameAr || !newGMNameEn) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع حقول الإدارة العامة' : 'Please fill all general management fields');
      return;
    }

    setLoading(true);
    try {
      const newGM = await generalManagementApi.create({
        agency_id: selectedAgencyId,
        code: newGMCode,
        name_ar: newGMNameAr,
        name_en: newGMNameEn,
        display_order: 0,
        is_active: true,
      });

      toast.success(lang === 'ar' ? 'تم إنشاء الإدارة العامة بنجاح' : 'General Management created successfully');
      setGeneralManagements([...generalManagements, newGM]);
      setSelectedGMId(newGM.id);
      setShowCreateGM(false);
      setNewGMCode('');
      setNewGMNameAr('');
      setNewGMNameEn('');
    } catch (error: any) {
      console.error('Failed to create GM:', error);
      toast.error(error.message || (lang === 'ar' ? 'فشل إنشاء الإدارة العامة' : 'Failed to create GM'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDept = async () => {
    if (!selectedGMId) {
      toast.error(lang === 'ar' ? 'يرجى اختيار الإدارة العامة أولاً' : 'Please select a general management first');
      return;
    }
    if (!newDeptCode || !newDeptNameAr || !newDeptNameEn) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع حقول الإدارة' : 'Please fill all department fields');
      return;
    }

    setLoading(true);
    try {
      const newDept = await departmentApi.create({
        general_management_id: selectedGMId,
        code: newDeptCode,
        name_ar: newDeptNameAr,
        name_en: newDeptNameEn,
        display_order: 0,
        is_active: true,
      });

      toast.success(lang === 'ar' ? 'تم إنشاء الإدارة بنجاح' : 'Department created successfully');
      setDepartments([...departments, newDept]);
      setSelectedDeptId(newDept.id);
      setShowCreateDept(false);
      setNewDeptCode('');
      setNewDeptNameAr('');
      setNewDeptNameEn('');
    } catch (error: any) {
      console.error('Failed to create department:', error);
      toast.error(error.message || (lang === 'ar' ? 'فشل إنشاء الإدارة' : 'Failed to create department'));
    } finally {
      setLoading(false);
    }
  };

  const validateStep1 = () => {
    if (!firstNameAr || !lastNameAr || !firstNameEn || !lastNameEn) {
      setError(lang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (!selectedAgencyId || !selectedGMId || !selectedDeptId) {
      setError(lang === 'ar' ? 'يرجى اختيار جميع المعلومات الوظيفية' : 'Please select all organizational information');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep3 = () => {
    if (!newPassword || !confirmPassword) {
      setError(lang === 'ar' ? 'يرجى ملء جميع حقول كلمة المرور' : 'Please fill all password fields');
      return false;
    }

    const validation = getPasswordValidation();

    if (!validation.minLength) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return false;
    }
    if (!validation.hasUppercase) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)' : 'Password must contain at least one uppercase letter (A-Z)');
      return false;
    }
    if (!validation.hasLowercase) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)' : 'Password must contain at least one lowercase letter (a-z)');
      return false;
    }
    if (!validation.hasNumber) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)' : 'Password must contain at least one number (0-9)');
      return false;
    }
    if (!validation.hasSpecialChar) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)' : 'Password must contain at least one special character (!@#$%^&*)');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError(lang === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return false;
    }

    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleComplete = async () => {
    if (!validateStep3()) return;

    setLoading(true);
    try {
      await userManagementApi.completeSetup({
        first_name_ar: firstNameAr,
        last_name_ar: lastNameAr,
        first_name_en: firstNameEn,
        last_name_en: lastNameEn,
        agency_id: selectedAgencyId,
        general_management_id: selectedGMId,
        department_id: selectedDeptId,
        new_password: newPassword
      });

      // Update user in auth store with new name
      updateUser({
        name: `${firstNameAr} ${lastNameAr}`,
        name_en: `${firstNameEn} ${lastNameEn}`,
        is_first_login: false
      });

      // Success!
      toast.success(lang === 'ar' ? 'تم إكمال الإعداد بنجاح!' : 'Setup completed successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Setup failed:', error);
      // Display only the specific error message from the API
      const errorMsg = error.message || error.response?.data?.detail || error.toString();
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedAgencyName = () => {
    const agency = agencies.find(a => a.id === selectedAgencyId);
    return agency ? (lang === 'ar' ? agency.name_ar : agency.name_en || agency.name_ar) : '';
  };

  const getSelectedGMName = () => {
    const gm = generalManagements.find(g => g.id === selectedGMId);
    return gm ? (lang === 'ar' ? gm.name_ar : gm.name_en || gm.name_ar) : '';
  };

  const getSelectedDeptName = () => {
    const dept = departments.find(d => d.id === selectedDeptId);
    return dept ? (lang === 'ar' ? dept.name_ar : dept.name_en || dept.name_ar) : '';
  };

  return (
    <div className={`min-h-screen grid grid-cols-1 lg:grid-cols-2 ${colors.bgPrimary}`}>
      {/* Left Side - Logo and Animation */}
      <div className={`hidden lg:flex items-center justify-center relative ${colors.bgSecondary} border-r ${colors.border}`}>
        {/* Wave Animation Background */}
        <WaveAnimation />
      </div>

      {/* Right Side - Setup Form */}
      <div className={`flex items-center justify-center p-8 relative ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`absolute top-6 ${lang === 'ar' ? 'left-6' : 'right-6'} p-3 rounded-full ${colors.bgSecondary} ${colors.border} border shadow-lg hover:scale-110 transition-all`}
          title={isDark ? (lang === 'ar' ? 'الوضع النهاري' : 'Light Mode') : (lang === 'ar' ? 'الوضع الليلي' : 'Dark Mode')}
        >
          {isDark ? (
            <Sun className={colors.textSecondary} size={24} />
          ) : (
            <Moon className={colors.textSecondary} size={24} />
          )}
        </button>

        <div className="w-full max-w-2xl">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/logo.png" alt="Sahem Logo" className="w-24 h-24 object-contain" />
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'ساهم' : 'Sahem'}
            </h1>
            <p className={colors.textSecondary}>
              {lang === 'ar' ? 'المنصة الذكية لإدارة المؤشرات' : 'Index Management System'}
            </p>
          </div>

          {/* Setup Card */}
          <div className={`rounded-2xl shadow-xl p-8 ${colors.bgSecondary} border ${colors.border}`}>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'إعداد الحساب' : 'Account Setup'}
              </h2>
              <p className={`text-sm ${colors.textSecondary}`}>
                {lang === 'ar' ? 'يرجى إكمال بياناتك لإنهاء الإعداد' : 'Complete your information to finish setup'}
              </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8 px-4">
              <div className="flex items-start justify-between max-w-md mx-auto">
                {[
                  { num: 1, labelAr: 'المعلومات الشخصية', labelEn: 'Personal Info', icon: User },
                  { num: 2, labelAr: 'المعلومات الوظيفية', labelEn: 'Organization', icon: Building2 },
                  { num: 3, labelAr: 'كلمة المرور', labelEn: 'Password', icon: Lock }
                ].map((s, idx) => (
                  <React.Fragment key={s.num}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all duration-300 mb-2 ${
                        s.num <= step
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg'
                          : `${colors.bgTertiary} ${colors.textTertiary} border-2 ${colors.border}`
                      }`}>
                        {s.num < step ? (
                          <CheckCircle size={24} strokeWidth={2.5} />
                        ) : (
                          <s.icon size={22} />
                        )}
                      </div>
                      <span className={`text-xs font-medium text-center ${
                        s.num <= step ? colors.textPrimary : colors.textTertiary
                      }`}>
                        {lang === 'ar' ? s.labelAr : s.labelEn}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div className="flex-1 flex items-center mt-4">
                        <div className={`h-1 w-full rounded-full transition-all duration-300 ${
                          s.num < step ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : colors.bgTertiary
                        }`} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[320px]">
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <div className="space-y-6">

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>
                        {lang === 'ar' ? 'الاسم الأول (عربي)' : 'First Name (Arabic)'} *
                      </label>
                      <input
                        type="text"
                        value={firstNameAr}
                        onChange={(e) => setFirstNameAr(e.target.value)}
                        className={`w-full px-4 py-3 ${patterns.input}`}
                        dir="rtl"
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>
                        {lang === 'ar' ? 'اسم العائلة (عربي)' : 'Last Name (Arabic)'} *
                      </label>
                      <input
                        type="text"
                        value={lastNameAr}
                        onChange={(e) => setLastNameAr(e.target.value)}
                        className={`w-full px-4 py-3 ${patterns.input}`}
                        dir="rtl"
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>
                        {lang === 'ar' ? 'الاسم الأول (إنجليزي)' : 'First Name (English)'} *
                      </label>
                      <input
                        type="text"
                        value={firstNameEn}
                        onChange={(e) => setFirstNameEn(e.target.value)}
                        className={`w-full px-4 py-3 ${patterns.input}`}
                        dir="ltr"
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>
                        {lang === 'ar' ? 'اسم العائلة (إنجليزي)' : 'Last Name (English)'} *
                      </label>
                      <input
                        type="text"
                        value={lastNameEn}
                        onChange={(e) => setLastNameEn(e.target.value)}
                        className={`w-full px-4 py-3 ${patterns.input}`}
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Organizational Info */}
              {step === 2 && (
                <div className="space-y-6">

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`block text-sm font-medium ${colors.textSecondary}`}>
                          {lang === 'ar' ? 'الوكالة' : 'Agency'} *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCreateAgency(!showCreateAgency)}
                          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                            showCreateAgency
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {showCreateAgency ? <><X size={14} /> {lang === 'ar' ? 'إلغاء' : 'Cancel'}</> : <><Plus size={14} /> {lang === 'ar' ? 'إنشاء جديد' : 'Create New'}</>}
                        </button>
                      </div>
                      {!showCreateAgency ? (
                        <div className="relative">
                          <select
                            value={selectedAgencyId}
                            onChange={(e) => setSelectedAgencyId(e.target.value)}
                            className={`w-full px-4 py-3.5 pr-10 appearance-none cursor-pointer ${patterns.input} font-medium`}
                            required
                          >
                            <option value="">{lang === 'ar' ? 'اختر الوكالة' : 'Select Agency'}</option>
                            {agencies.map((agency) => (
                              <option key={agency.id} value={agency.id}>
                                {lang === 'ar' ? agency.name_ar : agency.name_en || agency.name_ar}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none ${colors.textTertiary}`} size={20} />
                        </div>
                      ) : (
                        <div className={`${colors.bgTertiary} border ${colors.border} rounded-lg p-4 space-y-3`}>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'الرمز' : 'Code'} *
                            </label>
                            <input
                              type="text"
                              value={newAgencyCode}
                              onChange={(e) => setNewAgencyCode(e.target.value)}
                              className={`w-full px-3 py-2 text-sm ${patterns.input}`}
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *
                            </label>
                            <input
                              type="text"
                              value={newAgencyNameAr}
                              onChange={(e) => setNewAgencyNameAr(e.target.value)}
                              className={`w-full px-3 py-2 text-sm ${patterns.input}`}
                              dir="rtl"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *
                            </label>
                            <input
                              type="text"
                              value={newAgencyNameEn}
                              onChange={(e) => setNewAgencyNameEn(e.target.value)}
                              className={`w-full px-3 py-2 text-sm ${patterns.input}`}
                              dir="ltr"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateAgency}
                            disabled={loading}
                            className={`w-full py-2 text-sm ${patterns.button} disabled:opacity-50`}
                          >
                            {loading ? (lang === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : (lang === 'ar' ? 'إنشاء الوكالة' : 'Create Agency')}
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`block text-sm font-medium ${colors.textSecondary}`}>
                          {lang === 'ar' ? 'الإدارة العامة' : 'General Management'} *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCreateGM(!showCreateGM)}
                          disabled={!selectedAgencyId}
                          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                            showCreateGM
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {showCreateGM ? <><X size={14} /> {lang === 'ar' ? 'إلغاء' : 'Cancel'}</> : <><Plus size={14} /> {lang === 'ar' ? 'إنشاء جديد' : 'Create New'}</>}
                        </button>
                      </div>
                      {!showCreateGM ? (
                        <div className="relative">
                          <select
                            value={selectedGMId}
                            onChange={(e) => setSelectedGMId(e.target.value)}
                            className={`w-full px-4 py-3.5 pr-10 appearance-none cursor-pointer ${patterns.input} font-medium disabled:opacity-60 disabled:cursor-not-allowed`}
                            disabled={!selectedAgencyId}
                            required
                          >
                            <option value="">{lang === 'ar' ? 'اختر الإدارة العامة' : 'Select General Management'}</option>
                            {generalManagements.map((gm) => (
                              <option key={gm.id} value={gm.id}>
                                {lang === 'ar' ? gm.name_ar : gm.name_en || gm.name_ar}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none ${colors.textTertiary}`} size={20} />
                        </div>
                      ) : (
                        <div className={`${colors.bgTertiary} border ${colors.border} rounded-lg p-4 space-y-3`}>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'الرمز' : 'Code'} *
                            </label>
                            <input
                              type="text"
                              value={newGMCode}
                              onChange={(e) => setNewGMCode(e.target.value)}
                              className={`w-full px-3 py-2 text-sm ${patterns.input}`}
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *
                            </label>
                            <input
                              type="text"
                              value={newGMNameAr}
                              onChange={(e) => setNewGMNameAr(e.target.value)}
                              className={`w-full px-3 py-2 text-sm ${patterns.input}`}
                              dir="rtl"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *
                            </label>
                            <input
                              type="text"
                              value={newGMNameEn}
                              onChange={(e) => setNewGMNameEn(e.target.value)}
                              className={`w-full px-3 py-2 text-sm ${patterns.input}`}
                              dir="ltr"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateGM}
                            disabled={loading}
                            className={`w-full py-2 text-sm ${patterns.button} disabled:opacity-50`}
                          >
                            {loading ? (lang === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : (lang === 'ar' ? 'إنشاء الإدارة العامة' : 'Create GM')}
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`block text-sm font-medium ${colors.textSecondary}`}>
                          {lang === 'ar' ? 'الإدارة' : 'Department'} *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCreateDept(!showCreateDept)}
                          disabled={!selectedGMId}
                          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                            showCreateDept
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {showCreateDept ? <><X size={14} /> {lang === 'ar' ? 'إلغاء' : 'Cancel'}</> : <><Plus size={14} /> {lang === 'ar' ? 'إنشاء جديد' : 'Create New'}</>}
                        </button>
                      </div>
                      {!showCreateDept ? (
                        <div className="relative">
                          <select
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            className={`w-full px-4 py-3.5 pr-10 appearance-none cursor-pointer ${patterns.input} font-medium disabled:opacity-60 disabled:cursor-not-allowed`}
                            disabled={!selectedGMId}
                            required
                          >
                            <option value="">{lang === 'ar' ? 'اختر الإدارة' : 'Select Department'}</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {lang === 'ar' ? dept.name_ar : dept.name_en || dept.name_ar}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none ${colors.textTertiary}`} size={20} />
                        </div>
                      ) : (
                        <div className={`${colors.bgTertiary} border ${colors.border} rounded-lg p-4 space-y-3`}>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'الرمز' : 'Code'} *
                            </label>
                            <input
                              type="text"
                              value={newDeptCode}
                              onChange={(e) => setNewDeptCode(e.target.value)}
                              className={`w-full px-3 py-2 text-sm ${patterns.input}`}
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *
                            </label>
                            <input
                              type="text"
                              value={newDeptNameAr}
                              onChange={(e) => setNewDeptNameAr(e.target.value)}
                              className={`w-full px-3 py-2 text-sm ${patterns.input}`}
                              dir="rtl"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *
                            </label>
                            <input
                              type="text"
                              value={newDeptNameEn}
                              onChange={(e) => setNewDeptNameEn(e.target.value)}
                              className={`w-full px-3 py-2 text-sm ${patterns.input}`}
                              dir="ltr"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateDept}
                            disabled={loading}
                            className={`w-full py-2 text-sm ${patterns.button} disabled:opacity-50`}
                          >
                            {loading ? (lang === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : (lang === 'ar' ? 'إنشاء الإدارة' : 'Create Department')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Password */}
              {step === 3 && (
                <div className="space-y-6">

                  {/* Review Info */}
                  <div className={`${colors.bgTertiary} border ${colors.border} rounded-lg p-4 mb-6`}>
                    <h4 className={`font-semibold ${colors.textPrimary} mb-3 text-sm`}>
                      {lang === 'ar' ? 'مراجعة معلوماتك:' : 'Review Your Information:'}
                    </h4>
                    <div className={`text-xs ${colors.textSecondary} space-y-2`}>
                      <div className="flex justify-between">
                        <span className="font-medium">{lang === 'ar' ? 'الاسم:' : 'Name:'}</span>
                        <span>{firstNameAr} {lastNameAr} ({firstNameEn} {lastNameEn})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{lang === 'ar' ? 'الوكالة:' : 'Agency:'}</span>
                        <span>{getSelectedAgencyName()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{lang === 'ar' ? 'الإدارة العامة:' : 'GM:'}</span>
                        <span>{getSelectedGMName()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{lang === 'ar' ? 'الإدارة:' : 'Dept:'}</span>
                        <span>{getSelectedDeptName()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`text-sm font-semibold ${colors.textPrimary}`}>
                          {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'} *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${colors.bgTertiary} hover:${colors.bgSecondary} transition ${colors.textSecondary}`}
                        >
                          {showNewPassword ? <><EyeOff size={16} /> {lang === 'ar' ? 'إخفاء' : 'Hide'}</> : <><Eye size={16} /> {lang === 'ar' ? 'إظهار' : 'Show'}</>}
                        </button>
                      </div>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`w-full px-4 py-3.5 ${patterns.input} font-medium`}
                        dir="ltr"
                        required
                      />
                      <div className={`text-xs mt-3 space-y-1`}>
                        <div className={`flex items-center gap-1.5 font-medium ${colors.textSecondary} mb-2`}>
                          <Lock size={12} />
                          {lang === 'ar' ? 'متطلبات كلمة المرور:' : 'Password requirements:'}
                        </div>
                        <div className="space-y-1.5">
                          {(() => {
                            const validation = getPasswordValidation();
                            const requirements = [
                              { key: 'minLength', isValid: validation.minLength, textAr: '8 أحرف على الأقل', textEn: 'At least 8 characters' },
                              { key: 'hasUppercase', isValid: validation.hasUppercase, textAr: 'حرف كبير واحد على الأقل (A-Z)', textEn: 'At least one uppercase letter (A-Z)' },
                              { key: 'hasLowercase', isValid: validation.hasLowercase, textAr: 'حرف صغير واحد على الأقل (a-z)', textEn: 'At least one lowercase letter (a-z)' },
                              { key: 'hasNumber', isValid: validation.hasNumber, textAr: 'رقم واحد على الأقل (0-9)', textEn: 'At least one number (0-9)' },
                              { key: 'hasSpecialChar', isValid: validation.hasSpecialChar, textAr: 'رمز خاص واحد على الأقل (!@#$%^&*)', textEn: 'At least one special character (!@#$%^&*)' }
                            ];

                            return requirements.map((req) => (
                              <div key={req.key} className={`flex items-center gap-2 transition-colors ${
                                newPassword.length === 0
                                  ? colors.textTertiary
                                  : req.isValid
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                              }`}>
                                {newPassword.length > 0 && (
                                  req.isValid
                                    ? <Check size={14} strokeWidth={2.5} />
                                    : <X size={14} strokeWidth={2.5} />
                                )}
                                {newPassword.length === 0 && <span className="w-3.5">•</span>}
                                <span className="font-medium">{lang === 'ar' ? req.textAr : req.textEn}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`text-sm font-semibold ${colors.textPrimary}`}>
                          {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${colors.bgTertiary} hover:${colors.bgSecondary} transition ${colors.textSecondary}`}
                        >
                          {showConfirmPassword ? <><EyeOff size={16} /> {lang === 'ar' ? 'إخفاء' : 'Hide'}</> : <><Eye size={16} /> {lang === 'ar' ? 'إظهار' : 'Show'}</>}
                        </button>
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full px-4 py-3.5 ${patterns.input} font-medium`}
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className={`mt-6 p-3 rounded-lg ${colors.errorLight} border ${colors.error} flex items-start gap-2`}>
                <p className={`text-sm ${colors.error}`}>{error}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold border ${colors.border} ${colors.bgTertiary} ${colors.textPrimary} hover:opacity-80 transition`}
                >
                  {lang === 'ar' ? 'السابق' : 'Previous'}
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={handleNext}
                  className={`flex-1 px-6 py-3 ${patterns.button} font-semibold`}
                >
                  {lang === 'ar' ? 'التالي' : 'Next'}
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className={`flex-1 px-6 py-3 ${patterns.button} font-semibold disabled:opacity-50`}
                >
                  {loading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'إنهاء الإعداد' : 'Complete Setup')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstTimeSetup;
