import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { colors, patterns } from '../utils/darkMode';
import { User, Building2, Lock, CheckCircle } from 'lucide-react';
import { agencyApi, generalManagementApi, departmentApi, type Agency, type GeneralManagement, type Department } from '../services/organizationHierarchy';
import { userManagementApi } from '../services/userManagement';
import toast from 'react-hot-toast';

const FirstTimeSetup: React.FC = () => {
  const { language } = useUIStore();
  const lang = language;
  const navigate = useNavigate();

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

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');

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
      setError(lang === 'ar' ? 'يرجى اختيار الوكالة والإدارة العامة والإدارة' : 'Please select Agency, GM, and Department');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep3 = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(lang === 'ar' ? 'يرجى ملء جميع حقول كلمة المرور' : 'Please fill all password fields');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError(lang === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return false;
    }
    if (newPassword.length < 8) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
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

      // Success!
      toast.success(lang === 'ar' ? 'تم إكمال الإعداد بنجاح!' : 'Setup completed successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Setup failed:', error);
      const errorMsg = error.response?.data?.detail || (lang === 'ar' ? 'فشل إكمال الإعداد' : 'Setup failed');
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`w-full max-w-2xl ${colors.bgPrimary} rounded-2xl shadow-2xl p-8`}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold ${colors.textPrimary} mb-2`}>
            {lang === 'ar' ? 'مرحباً بك في منصة راقب!' : 'Welcome to Raqib Platform!'}
          </h1>
          <p className={`${colors.textSecondary}`}>
            {lang === 'ar' ? 'يرجى إكمال بياناتك لإنهاء الإعداد' : 'Please complete your information to finish setup'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s <= step ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : colors.bgTertiary + ' ' + colors.textTertiary}`}>
                {s < step ? <CheckCircle size={20} /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-1 mx-2 ${s < step ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : colors.bgTertiary}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="text-purple-500" size={24} />
                <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'الاسم الأول (عربي)' : 'First Name (Arabic)'} *
                  </label>
                  <input
                    type="text"
                    value={firstNameAr}
                    onChange={(e) => setFirstNameAr(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
                    dir="rtl"
                    placeholder="أحمد"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'اسم العائلة (عربي)' : 'Last Name (Arabic)'} *
                  </label>
                  <input
                    type="text"
                    value={lastNameAr}
                    onChange={(e) => setLastNameAr(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
                    dir="rtl"
                    placeholder="محمد"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'الاسم الأول (إنجليزي)' : 'First Name (English)'} *
                  </label>
                  <input
                    type="text"
                    value={firstNameEn}
                    onChange={(e) => setFirstNameEn(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
                    dir="ltr"
                    placeholder="Ahmed"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'اسم العائلة (إنجليزي)' : 'Last Name (English)'} *
                  </label>
                  <input
                    type="text"
                    value={lastNameEn}
                    onChange={(e) => setLastNameEn(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
                    dir="ltr"
                    placeholder="Mohammed"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Organizational Info */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="text-purple-500" size={24} />
                <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'المعلومات الوظيفية' : 'Organizational Information'}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'الوكالة' : 'Agency'} *
                  </label>
                  <select
                    value={selectedAgencyId}
                    onChange={(e) => setSelectedAgencyId(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
                    required
                  >
                    <option value="">{lang === 'ar' ? 'اختر الوكالة' : 'Select Agency'}</option>
                    {agencies.map((agency) => (
                      <option key={agency.id} value={agency.id}>
                        {lang === 'ar' ? agency.name_ar : agency.name_en || agency.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'الإدارة العامة' : 'General Management'} *
                  </label>
                  <select
                    value={selectedGMId}
                    onChange={(e) => setSelectedGMId(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
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
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'الإدارة' : 'Department'} *
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
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
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="text-purple-500" size={24} />
                <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                  {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                </h2>
              </div>

              {/* Review Info */}
              <div className={`${colors.bgSecondary} rounded-lg p-4 mb-6`}>
                <h3 className={`font-semibold ${colors.textPrimary} mb-2`}>
                  {lang === 'ar' ? 'مراجعة معلوماتك:' : 'Review Your Information:'}
                </h3>
                <div className={`text-sm ${colors.textSecondary} space-y-1`}>
                  <p>{lang === 'ar' ? 'الاسم:' : 'Name:'} {firstNameAr} {lastNameAr} ({firstNameEn} {lastNameEn})</p>
                  <p>{lang === 'ar' ? 'الوكالة:' : 'Agency:'} {getSelectedAgencyName()}</p>
                  <p>{lang === 'ar' ? 'الإدارة العامة:' : 'GM:'} {getSelectedGMName()}</p>
                  <p>{lang === 'ar' ? 'الإدارة:' : 'Dept:'} {getSelectedDeptName()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'} *
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'} *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
                    required
                  />
                  <p className={`text-xs ${colors.textTertiary} mt-1`}>
                    {lang === 'ar' ? 'يجب أن تحتوي على 8 أحرف على الأقل' : 'Must be at least 8 characters'}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 ${patterns.input}`}
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className={`flex-1 px-6 py-3 ${patterns.secondaryButton}`}
            >
              {lang === 'ar' ? 'السابق' : 'Previous'}
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              className={`flex-1 px-6 py-3 ${patterns.primaryButton}`}
            >
              {lang === 'ar' ? 'التالي' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className={`flex-1 px-6 py-3 ${patterns.primaryButton} disabled:opacity-50`}
            >
              {loading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'إنهاء الإعداد' : 'Complete Setup')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirstTimeSetup;
