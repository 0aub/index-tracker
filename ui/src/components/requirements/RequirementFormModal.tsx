import { useState, useEffect, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { colors, patterns } from '../../utils/darkMode';
import { Requirement } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import toast from 'react-hot-toast';

interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RequirementFormData) => Promise<void>;
  requirement?: Requirement | null; // If provided, we're editing
  indexId: string;
  sections?: {
    main_areas: Array<{
      ar: string;
      en: string;
      elements: Array<{
        ar: string;
        en: string;
        sub_domains: Array<{ ar: string; en: string }>;
      }>
    }>;
    sub_domains: Array<{ ar: string; en: string }>;
    elements: Array<{ ar: string; en: string }>;
  };
  maxDisplayOrder: number; // For creating new requirements
}

export interface RequirementFormData {
  code?: string; // Optional for create, auto-generated
  question_ar: string;
  question_en?: string;
  main_area_ar: string;
  main_area_en?: string;
  sub_domain_ar: string;
  sub_domain_en?: string;
  element_ar?: string;
  element_en?: string;
  objective_ar?: string;
  objective_en?: string;
  evidence_description_ar?: string;
  evidence_description_en?: string;
  requires_evidence: boolean;
  display_order: number;
}

export const RequirementFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  requirement,
  indexId,
  sections,
  maxDisplayOrder,
}: RequirementFormModalProps) => {
  const { language } = useUIStore();
  const lang = language;

  const isEditing = !!requirement;

  const [formData, setFormData] = useState<RequirementFormData>({
    code: '',
    question_ar: '',
    question_en: '',
    main_area_ar: '',
    main_area_en: '',
    sub_domain_ar: '',
    sub_domain_en: '',
    element_ar: '',
    element_en: '',
    objective_ar: '',
    objective_en: '',
    evidence_description_ar: '',
    evidence_description_en: '',
    requires_evidence: true,
    display_order: maxDisplayOrder + 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // State for creating new values
  const [creatingNewMainArea, setCreatingNewMainArea] = useState(false);
  const [creatingNewElement, setCreatingNewElement] = useState(false);
  const [creatingNewSubDomain, setCreatingNewSubDomain] = useState(false);

  // Filter elements based on selected main_area
  const filteredElements = useMemo(() => {
    if (!sections || !formData.main_area_ar) {
      return sections?.elements || [];
    }
    const selectedMainArea = sections.main_areas.find(ma => ma.ar === formData.main_area_ar);
    return selectedMainArea?.elements || [];
  }, [sections, formData.main_area_ar]);

  // Filter sub_domains based on selected element
  const filteredSubDomains = useMemo(() => {
    if (!sections || !formData.element_ar) {
      return sections?.sub_domains || [];
    }
    // Find the selected element in the filtered elements list
    const selectedElement = filteredElements.find(el => el.ar === formData.element_ar);
    return selectedElement?.sub_domains || [];
  }, [sections, formData.element_ar, filteredElements]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (requirement) {
        // Editing existing requirement
        setFormData({
          code: requirement.code || '',
          question_ar: requirement.question_ar || '',
          question_en: requirement.question_en || '',
          main_area_ar: requirement.main_area_ar || '',
          main_area_en: requirement.main_area_en || '',
          sub_domain_ar: requirement.sub_domain_ar || '',
          sub_domain_en: requirement.sub_domain_en || '',
          element_ar: requirement.element_ar || '',
          element_en: requirement.element_en || '',
          objective_ar: requirement.objective_ar || '',
          objective_en: requirement.objective_en || '',
          evidence_description_ar: requirement.evidence_description_ar || '',
          evidence_description_en: requirement.evidence_description_en || '',
          requires_evidence: requirement.requires_evidence ?? true,
          display_order: requirement.display_order || 1,
        });
      } else {
        // Creating new requirement
        setFormData({
          code: '',
          question_ar: '',
          question_en: '',
          main_area_ar: '',
          main_area_en: '',
          sub_domain_ar: '',
          sub_domain_en: '',
          element_ar: '',
          element_en: '',
          objective_ar: '',
          objective_en: '',
          evidence_description_ar: '',
          evidence_description_en: '',
          requires_evidence: true,
          display_order: maxDisplayOrder + 1,
        });
      }
      setErrors({});
      // Reset "creating new" flags
      setCreatingNewMainArea(false);
      setCreatingNewElement(false);
      setCreatingNewSubDomain(false);
    }
  }, [isOpen, requirement, maxDisplayOrder]);

  const handleChange = (field: keyof RequirementFormData, value: any) => {
    // If main_area changes, reset element and sub_domain selections and creation flags
    if (field === 'main_area_ar') {
      setFormData((prev) => ({ ...prev, [field]: value, element_ar: '', element_en: '', sub_domain_ar: '', sub_domain_en: '' }));
      setCreatingNewElement(false);
      setCreatingNewSubDomain(false);
    }
    // If element changes, reset sub_domain selection and creation flag
    else if (field === 'element_ar') {
      setFormData((prev) => ({ ...prev, [field]: value, sub_domain_ar: '', sub_domain_en: '' }));
      setCreatingNewSubDomain(false);
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Code validation (edit mode only)
    if (isEditing && !formData.code?.trim()) {
      newErrors.code = lang === 'ar'
        ? 'رمز المتطلب مطلوب - أدخل رمزاً فريداً (مثال: 1.1.1)'
        : 'Requirement code is required - Enter a unique code (e.g., 1.1.1)';
    } else if (isEditing && formData.code && !/^[\d.]+$/.test(formData.code)) {
      newErrors.code = lang === 'ar'
        ? 'الرمز يجب أن يحتوي على أرقام ونقاط فقط (مثال: 1.1.1)'
        : 'Code must contain only numbers and dots (e.g., 1.1.1)';
    }

    // Main area validation
    if (!formData.main_area_ar.trim()) {
      newErrors.main_area_ar = lang === 'ar'
        ? 'المحور الأساسي مطلوب - اختر محوراً من القائمة'
        : 'Main area is required - Select an area from the list';
    }

    // Sub-domain validation
    if (!formData.sub_domain_ar.trim()) {
      newErrors.sub_domain_ar = lang === 'ar'
        ? 'العنصر مطلوب - اختر عنصراً من القائمة'
        : 'Sub-domain is required - Select a sub-domain from the list';
    }

    // Question validation
    if (!formData.question_ar.trim()) {
      newErrors.question_ar = lang === 'ar'
        ? 'السؤال بالعربية مطلوب - أدخل السؤال الذي يحدد المتطلب'
        : 'Arabic question is required - Enter the question that defines this requirement';
    } else if (formData.question_ar.trim().length < 10) {
      newErrors.question_ar = lang === 'ar'
        ? 'السؤال قصير جداً - يجب أن يكون 10 أحرف على الأقل'
        : 'Question is too short - Must be at least 10 characters';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(
        lang === 'ar'
          ? 'يرجى تصحيح الأخطاء في النموذج'
          : 'Please fix the errors in the form'
      );
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);

      // Show success message
      toast.success(
        lang === 'ar'
          ? isEditing ? 'تم حفظ التغييرات بنجاح' : 'تم إضافة المتطلب بنجاح'
          : isEditing ? 'Changes saved successfully' : 'Requirement added successfully'
      );

      onClose();
    } catch (error: any) {
      console.error('Failed to save requirement:', error);

      // Parse and display API errors
      let errorMessage = lang === 'ar'
        ? 'فشل حفظ المتطلب - حدث خطأ غير متوقع'
        : 'Failed to save requirement - An unexpected error occurred';

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;

        // Check for duplicate code error
        if (typeof detail === 'string') {
          if (detail.includes('already exists') || detail.includes('duplicate') || detail.includes('موجود بالفعل')) {
            errorMessage = lang === 'ar'
              ? 'هذا الرمز مستخدم بالفعل في مؤشر آخر - يرجى اختيار رمز مختلف'
              : 'This code is already in use in another index - Please choose a different code';
            setErrors({ code: errorMessage });
          } else if (detail.includes('validation') || detail.includes('invalid')) {
            errorMessage = lang === 'ar'
              ? 'البيانات المدخلة غير صحيحة - يرجى التحقق من جميع الحقول'
              : 'Invalid data provided - Please check all fields';
          } else {
            errorMessage = detail;
          }
        } else if (Array.isArray(detail)) {
          // Handle validation errors array
          errorMessage = detail.map((err: any) => err.msg || err).join(', ');
        }
      } else if (error.response?.status === 409) {
        errorMessage = lang === 'ar'
          ? 'هذا الرمز مستخدم بالفعل - يرجى اختيار رمز آخر'
          : 'This code is already in use - Please choose a different code';
        setErrors({ code: errorMessage });
      } else if (error.response?.status === 400) {
        errorMessage = lang === 'ar'
          ? 'بيانات غير صحيحة - يرجى مراجعة جميع الحقول المطلوبة'
          : 'Invalid data - Please review all required fields';
      } else if (error.response?.status === 403) {
        errorMessage = lang === 'ar'
          ? 'ليس لديك صلاحية لتنفيذ هذا الإجراء'
          : 'You do not have permission to perform this action';
      } else if (error.response?.status === 404) {
        errorMessage = lang === 'ar'
          ? 'المتطلب غير موجود - يرجى تحديث الصفحة'
          : 'Requirement not found - Please refresh the page';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`${colors.bgSecondary} rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
          <h2 className={`text-2xl font-bold ${colors.textPrimary}`}>
            {isEditing
              ? lang === 'ar' ? 'تعديل المتطلب' : 'Edit Requirement'
              : lang === 'ar' ? 'إضافة متطلب جديد' : 'Add New Requirement'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 ${colors.textSecondary} hover:${colors.textPrimary} hover:${colors.bgHover} rounded-lg transition`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Auto-generation notice for create mode */}
          {!isEditing && (
            <div className={`p-4 ${colors.primaryLight} border ${colors.border} rounded-lg`}>
              <p className={`text-sm ${colors.textPrimary}`}>
                {lang === 'ar'
                  ? 'سيتم توليد الرمز وترتيب العرض تلقائياً بناءً على المحور والمعيار المختارين'
                  : 'Code and display order will be automatically generated based on selected main area and standard'}
              </p>
            </div>
          )}

          {/* Code - Edit Mode Only */}
          {isEditing && (
            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'رمز المتطلب' : 'Requirement Code'} *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className={`w-full px-4 py-2 ${patterns.input} ${errors.code ? 'border-red-500' : ''}`}
                placeholder={lang === 'ar' ? 'مثال: 1.1.1' : 'Example: 1.1.1'}
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
              <p className={`mt-1 text-xs ${colors.textSecondary}`}>
                {lang === 'ar'
                  ? 'استخدم الأسهم في جدول المتطلبات لتغيير ترتيب العرض'
                  : 'Use the arrows in the requirements table to change display order'}
              </p>
            </div>
          )}

          {/* Main Area - Arabic & English */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'المحور الأساسي (عربي)' : 'Main Area (Arabic)'} *
              </label>
              <div className="flex gap-2">
                {!creatingNewMainArea ? (
                  <>
                    <select
                      value={formData.main_area_ar}
                      onChange={(e) => handleChange('main_area_ar', e.target.value)}
                      className={`flex-1 px-4 py-2 ${patterns.select} ${errors.main_area_ar ? 'border-red-500' : ''}`}
                    >
                      <option value="">{lang === 'ar' ? 'اختر المحور' : 'Select main area'}</option>
                      {sections?.main_areas.map((area, idx) => (
                        <option key={idx} value={area.ar}>{area.ar}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingNewMainArea(true);
                        handleChange('main_area_ar', '');
                        handleChange('main_area_en', '');
                      }}
                      className={`px-3 py-2 ${colors.primary} text-white rounded-lg hover:opacity-90 transition`}
                      title={lang === 'ar' ? 'إنشاء محور جديد' : 'Create new main area'}
                    >
                      +
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={formData.main_area_ar}
                      onChange={(e) => handleChange('main_area_ar', e.target.value)}
                      className={`flex-1 px-4 py-2 ${patterns.input} ${errors.main_area_ar ? 'border-red-500' : ''}`}
                      placeholder={lang === 'ar' ? 'أدخل اسم المحور الجديد' : 'Enter new main area name'}
                      autoFocus
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={() => setCreatingNewMainArea(false)}
                      className={`px-3 py-2 ${colors.bgTertiary} ${colors.textPrimary} rounded-lg hover:${colors.bgHover} transition`}
                      title={lang === 'ar' ? 'العودة للقائمة' : 'Back to list'}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
              {errors.main_area_ar && <p className="mt-1 text-sm text-red-600">{errors.main_area_ar}</p>}
              {creatingNewMainArea && (
                <p className={`mt-1 text-xs ${colors.primaryText}`}>
                  {lang === 'ar' ? '✓ سيتم إنشاء محور جديد' : '✓ Will create a new main area'}
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'المحور الأساسي (إنجليزي)' : 'Main Area (English)'}
              </label>
              <input
                type="text"
                value={formData.main_area_en}
                onChange={(e) => handleChange('main_area_en', e.target.value)}
                className={`w-full px-4 py-2 ${patterns.input}`}
                placeholder={lang === 'ar' ? 'اختياري' : 'Optional'}
                dir="ltr"
              />
            </div>
          </div>

          {/* Standard (Element) - Arabic & English */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'المعيار (عربي)' : 'Standard (Arabic)'}
              </label>
              <div className="flex gap-2">
                {!creatingNewElement ? (
                  <>
                    <select
                      value={formData.element_ar}
                      onChange={(e) => handleChange('element_ar', e.target.value)}
                      disabled={!formData.main_area_ar}
                      className={`flex-1 px-4 py-2 ${patterns.select} ${!formData.main_area_ar ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">{lang === 'ar' ? 'اختر المعيار' : 'Select standard'}</option>
                      {filteredElements.map((element, idx) => (
                        <option key={idx} value={element.ar}>{element.ar}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingNewElement(true);
                        handleChange('element_ar', '');
                        handleChange('element_en', '');
                      }}
                      disabled={!formData.main_area_ar}
                      className={`px-3 py-2 ${colors.primary} text-white rounded-lg hover:opacity-90 transition ${!formData.main_area_ar ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={lang === 'ar' ? 'إنشاء معيار جديد' : 'Create new standard'}
                    >
                      +
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={formData.element_ar}
                      onChange={(e) => handleChange('element_ar', e.target.value)}
                      className={`flex-1 px-4 py-2 ${patterns.input}`}
                      placeholder={lang === 'ar' ? 'أدخل اسم المعيار الجديد' : 'Enter new standard name'}
                      autoFocus
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={() => setCreatingNewElement(false)}
                      className={`px-3 py-2 ${colors.bgTertiary} ${colors.textPrimary} rounded-lg hover:${colors.bgHover} transition`}
                      title={lang === 'ar' ? 'العودة للقائمة' : 'Back to list'}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
              {!formData.main_area_ar && !creatingNewElement && (
                <p className={`mt-1 text-xs ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'اختر المحور الأساسي أولاً' : 'Select main area first'}
                </p>
              )}
              {creatingNewElement && (
                <p className={`mt-1 text-xs ${colors.primaryText}`}>
                  {lang === 'ar' ? '✓ سيتم إنشاء معيار جديد' : '✓ Will create a new standard'}
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'المعيار (إنجليزي)' : 'Standard (English)'}
              </label>
              <input
                type="text"
                value={formData.element_en}
                onChange={(e) => handleChange('element_en', e.target.value)}
                className={`w-full px-4 py-2 ${patterns.input}`}
                placeholder={lang === 'ar' ? 'اختياري' : 'Optional'}
                dir="ltr"
              />
            </div>
          </div>

          {/* Sub-domain (العنصر) - Arabic & English */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'العنصر (عربي)' : 'Sub-domain (Arabic)'} *
              </label>
              <div className="flex gap-2">
                {!creatingNewSubDomain ? (
                  <>
                    <select
                      value={formData.sub_domain_ar}
                      onChange={(e) => handleChange('sub_domain_ar', e.target.value)}
                      disabled={!formData.element_ar}
                      className={`flex-1 px-4 py-2 ${patterns.select} ${errors.sub_domain_ar ? 'border-red-500' : ''} ${!formData.element_ar ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">{lang === 'ar' ? 'اختر العنصر' : 'Select sub-domain'}</option>
                      {filteredSubDomains.map((subdomain, idx) => (
                        <option key={idx} value={subdomain.ar}>{subdomain.ar}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingNewSubDomain(true);
                        handleChange('sub_domain_ar', '');
                        handleChange('sub_domain_en', '');
                      }}
                      disabled={!formData.element_ar}
                      className={`px-3 py-2 ${colors.primary} text-white rounded-lg hover:opacity-90 transition ${!formData.element_ar ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={lang === 'ar' ? 'إنشاء عنصر جديد' : 'Create new sub-domain'}
                    >
                      +
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={formData.sub_domain_ar}
                      onChange={(e) => handleChange('sub_domain_ar', e.target.value)}
                      className={`flex-1 px-4 py-2 ${patterns.input} ${errors.sub_domain_ar ? 'border-red-500' : ''}`}
                      placeholder={lang === 'ar' ? 'أدخل اسم العنصر الجديد' : 'Enter new sub-domain name'}
                      autoFocus
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={() => setCreatingNewSubDomain(false)}
                      className={`px-3 py-2 ${colors.bgTertiary} ${colors.textPrimary} rounded-lg hover:${colors.bgHover} transition`}
                      title={lang === 'ar' ? 'العودة للقائمة' : 'Back to list'}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
              {errors.sub_domain_ar && <p className="mt-1 text-sm text-red-600">{errors.sub_domain_ar}</p>}
              {!formData.element_ar && !creatingNewSubDomain && (
                <p className={`mt-1 text-xs ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'اختر المعيار أولاً' : 'Select standard first'}
                </p>
              )}
              {creatingNewSubDomain && (
                <p className={`mt-1 text-xs ${colors.primaryText}`}>
                  {lang === 'ar' ? '✓ سيتم إنشاء عنصر جديد' : '✓ Will create a new sub-domain'}
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'العنصر (إنجليزي)' : 'Sub-domain (English)'}
              </label>
              <input
                type="text"
                value={formData.sub_domain_en}
                onChange={(e) => handleChange('sub_domain_en', e.target.value)}
                className={`w-full px-4 py-2 ${patterns.input}`}
                placeholder={lang === 'ar' ? 'اختياري' : 'Optional'}
                dir="ltr"
              />
            </div>
          </div>

          {/* Question - Arabic & English */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'السؤال (عربي)' : 'Question (Arabic)'} *
              </label>
              <textarea
                value={formData.question_ar}
                onChange={(e) => handleChange('question_ar', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 ${patterns.input} ${errors.question_ar ? 'border-red-500' : ''}`}
                placeholder={lang === 'ar' ? 'أدخل السؤال بالعربية...' : 'Enter question in Arabic...'}
              />
              {errors.question_ar && <p className="mt-1 text-sm text-red-600">{errors.question_ar}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'السؤال (إنجليزي)' : 'Question (English)'}
              </label>
              <textarea
                value={formData.question_en}
                onChange={(e) => handleChange('question_en', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 ${patterns.input}`}
                placeholder={lang === 'ar' ? 'اختياري' : 'Optional'}
              />
            </div>
          </div>

          {/* Objective - Arabic & English */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'الهدف (عربي)' : 'Objective (Arabic)'}
              </label>
              <textarea
                value={formData.objective_ar}
                onChange={(e) => handleChange('objective_ar', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 ${patterns.input}`}
                placeholder={lang === 'ar' ? 'اختياري' : 'Optional'}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'الهدف (إنجليزي)' : 'Objective (English)'}
              </label>
              <textarea
                value={formData.objective_en}
                onChange={(e) => handleChange('objective_en', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 ${patterns.input}`}
                placeholder={lang === 'ar' ? 'اختياري' : 'Optional'}
              />
            </div>
          </div>

          {/* Evidence Description - Arabic & English */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'وصف الدليل (عربي)' : 'Evidence Description (Arabic)'}
              </label>
              <textarea
                value={formData.evidence_description_ar}
                onChange={(e) => {
                  handleChange('evidence_description_ar', e.target.value);
                  // Automatically set requires_evidence based on description
                  if (e.target.value.trim()) {
                    handleChange('requires_evidence', true);
                  } else if (!formData.evidence_description_en?.trim()) {
                    handleChange('requires_evidence', false);
                  }
                }}
                rows={3}
                className={`w-full px-4 py-2 ${patterns.input}`}
                placeholder={lang === 'ar' ? 'اختياري - إذا أضفت وصفاً، سيتطلب المتطلب أدلة' : 'Optional - Adding description will require evidence'}
              />
              {formData.evidence_description_ar && (
                <p className={`mt-1 text-xs ${colors.primaryText}`}>
                  {lang === 'ar' ? '✓ سيتطلب هذا المتطلب أدلة إثبات' : '✓ This requirement will require evidence'}
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'وصف الدليل (إنجليزي)' : 'Evidence Description (English)'}
              </label>
              <textarea
                value={formData.evidence_description_en}
                onChange={(e) => {
                  handleChange('evidence_description_en', e.target.value);
                  // Automatically set requires_evidence based on description
                  if (e.target.value.trim()) {
                    handleChange('requires_evidence', true);
                  } else if (!formData.evidence_description_ar?.trim()) {
                    handleChange('requires_evidence', false);
                  }
                }}
                rows={3}
                className={`w-full px-4 py-2 ${patterns.input}`}
                placeholder={lang === 'ar' ? 'اختياري' : 'Optional'}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-3 pt-4 border-t ${colors.border}`}>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-6 py-3 ${patterns.button} disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2`}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {isEditing
                ? (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                : (lang === 'ar' ? 'إضافة المتطلب' : 'Add Requirement')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`flex-1 px-6 py-3 ${colors.bgTertiary} ${colors.textPrimary} rounded-lg hover:${colors.bgHover} transition font-medium`}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
