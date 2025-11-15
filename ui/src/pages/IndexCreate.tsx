/**
 * Index Create Page - Upload Excel to create new index
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Loader2, FileSpreadsheet, Check, X, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useIndexStore } from '../stores/indexStore';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';
import { colors, patterns } from '../utils/darkMode';

const TEMPLATES = [
  {
    id: 'naii',
    code: 'NAII',
    name_ar: 'المؤشر الوطني للذكاء الاصطناعي',
    name_en: 'National AI Index',
    description_ar: 'مؤشر النضج الوطني للذكاء الاصطناعي',
    description_en: 'National AI Maturity Index',
    filename: 'NAII_Template.xlsx',
    active: true
  },
  {
    id: 'dxmi',
    code: 'DXMI',
    name_ar: 'مؤشر نضج التجربة الرقمية',
    name_en: 'Digital Experience Maturity Index',
    description_ar: 'مؤشر قياس نضج التجربة الرقمية',
    description_en: 'Digital Experience Maturity Measurement',
    filename: 'DXMI_Template.xlsx',
    active: false
  },
  {
    id: 'ndi',
    code: 'NDI',
    name_ar: 'المؤشر الرقمي الوطني',
    name_en: 'National Digital Index',
    description_ar: 'المؤشر الوطني للتحول الرقمي',
    description_en: 'National Digital Transformation Index',
    filename: 'NDI_Template.xlsx',
    active: false
  },
  {
    id: 'etari',
    code: 'ETARI',
    name_ar: 'مؤشر جاهزية تبني التقنيات الناشئة',
    name_en: 'Emerging Technology Adoption Readiness Index',
    description_ar: 'مؤشر جاهزية تبني التقنيات الناشئة',
    description_en: 'Emerging Technology Adoption Readiness',
    filename: 'ETARI_Template.xlsx',
    active: false
  },
];

const IndexCreate: React.FC = () => {
  const { language } = useUIStore();
  const lang = language;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setCurrentIndex } = useIndexStore();

  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('naii'); // Default to NAII
  const [ownerEmail, setOwnerEmail] = useState(user?.email || '');
  const [indexYear, setIndexYear] = useState(new Date().getFullYear().toString());

  // Get selected template data - ensure it's an active template
  const selectedTemplateData = TEMPLATES.find(t => t.id === selectedTemplate && t.active) || TEMPLATES[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error(lang === 'ar' ? 'يجب اختيار ملف Excel (.xlsx أو .xls)' : 'Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      toast.success(lang === 'ar' ? `تم اختيار: ${selectedFile.name}` : `Selected: ${selectedFile.name}`);
    }
  };

  const handleDownloadTemplate = () => {
    const template = TEMPLATES.find(t => t.id === selectedTemplate);
    const templateUrl = api.indices.downloadTemplate();
    window.open(templateUrl, '_blank');
    toast.success(
      lang === 'ar'
        ? `جاري تحميل قالب: ${template?.name_ar}`
        : `Downloading template: ${template?.name_en}`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!indexYear || indexYear.length !== 4) {
      toast.error(lang === 'ar' ? 'يرجى إدخال سنة صحيحة' : 'Please enter a valid year');
      return;
    }

    if (!file) {
      toast.error(lang === 'ar' ? 'يرجى اختيار ملف Excel' : 'Please select an Excel file');
      return;
    }

    if (!ownerEmail || !ownerEmail.includes('@')) {
      toast.error(lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email');
      return;
    }

    try {
      setUploading(true);

      const indexCode = `${selectedTemplateData.code}-${indexYear}`;

      const index = await api.indices.createFromExcel({
        file,
        code: indexCode,
        name_ar: selectedTemplateData.name_ar,
        name_en: selectedTemplateData.name_en,
        version: '1.0',
        organization_id: user?.organizationId || 'default-org',
        created_by_user_id: user?.id || 'unknown',
      });

      toast.success(
        lang === 'ar'
          ? `تم إنشاء المؤشر بنجاح: ${index.name_ar}`
          : `Index created successfully: ${index.name_en || index.name_ar}`
      );

      // Set as current index
      setCurrentIndex(index);

      // Navigate to indices page
      navigate('/index');
    } catch (error: any) {
      console.error('Failed to create index:', error);
      toast.error(
        lang === 'ar'
          ? `فشل إنشاء المؤشر: ${error.message || 'خطأ غير معروف'}`
          : `Failed to create index: ${error.message || 'Unknown error'}`
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${colors.textPrimary}`}>
            {lang === 'ar' ? 'إنشاء مؤشر جديد' : 'Create New Index'}
          </h1>
          <p className={`text-sm ${colors.textSecondary} mt-2`}>
            {lang === 'ar'
              ? 'اختر القالب المناسب، حمّله، املأه، ثم ارفعه لإنشاء المؤشر'
              : 'Select the appropriate template, download it, fill it out, and upload to create the index'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Template */}
          <div className={`${colors.bgSecondary} rounded-xl shadow-lg dark:shadow-gray-900/50 p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`px-3 py-1.5 border ${colors.border} rounded-md flex items-center justify-center ${colors.textSecondary} font-medium`}>
                1
              </div>
              <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'اختر نوع المؤشر' : 'Select Index Type'}
              </h2>
            </div>

            {/* Template Blocks */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => template.active && setSelectedTemplate(template.id)}
                  disabled={!template.active}
                  className={`p-4 border-2 rounded-lg transition-all relative ${
                    !template.active
                      ? `opacity-50 cursor-not-allowed ${colors.border}`
                      : selectedTemplate === template.id
                      ? `border-[rgb(var(--color-focus-ring))] ${colors.primaryLight}`
                      : `${colors.border} hover:${colors.borderHover}`
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      !template.active
                        ? colors.textSecondary
                        : selectedTemplate === template.id
                        ? colors.primaryIcon
                        : colors.textPrimary
                    } mb-2`}>
                      {template.code}
                    </div>
                    <div className={`text-xs ${colors.textSecondary}`}>
                      {lang === 'ar' ? template.description_ar : template.description_en}
                    </div>
                    {template.active && selectedTemplate === template.id && (
                      <div className="mt-2">
                        <Check className={`w-5 h-5 ${colors.primaryIcon} mx-auto`} />
                      </div>
                    )}
                    {!template.active && (
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white rounded">
                          {lang === 'ar' ? 'قريباً' : 'Coming Soon'}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Template Info */}
            <div className={`mt-4 p-4 ${colors.primaryLight} border border-[rgb(var(--color-focus-ring))] rounded-lg`}>
              <div className="space-y-2">
                <div>
                  <span className={`text-sm font-medium ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'الاسم بالعربية: ' : 'Arabic Name: '}
                  </span>
                  <span className={`text-sm ${colors.textPrimary}`} dir="rtl">
                    {selectedTemplateData.name_ar}
                  </span>
                </div>
                <div>
                  <span className={`text-sm font-medium ${colors.textPrimary}`}>
                    {lang === 'ar' ? 'الاسم بالإنجليزية: ' : 'English Name: '}
                  </span>
                  <span className={`text-sm ${colors.textPrimary}`} dir="ltr">
                    {selectedTemplateData.name_en}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Year */}
          <div className={`${colors.bgSecondary} rounded-xl shadow-lg dark:shadow-gray-900/50 p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`px-3 py-1.5 border ${colors.border} rounded-md flex items-center justify-center ${colors.textSecondary} font-medium`}>
                2
              </div>
              <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'السنة' : 'Year'}
              </h2>
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                {lang === 'ar' ? 'السنة *' : 'Year *'}
              </label>
              <div className="flex items-center gap-3">
                <div className={`flex-1 flex items-center ${colors.inputBg} ${colors.inputBorder} border rounded-lg overflow-hidden`}>
                  <input
                    type="number"
                    value={indexYear}
                    onChange={(e) => setIndexYear(e.target.value)}
                    placeholder="2025"
                    min="2020"
                    max="2100"
                    className={`flex-1 px-4 py-3 bg-transparent ${colors.inputText} focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    required
                    dir="ltr"
                  />
                  <div className="flex flex-col border-l ${colors.inputBorder}">
                    <button
                      type="button"
                      onClick={() => {
                        const year = parseInt(indexYear) || new Date().getFullYear();
                        if (year < 2100) setIndexYear((year + 1).toString());
                      }}
                      className={`px-3 py-1.5 ${colors.bgHover} hover:${colors.primaryLight} ${colors.textSecondary} hover:${colors.primaryIcon} transition-colors border-b ${colors.inputBorder}`}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const year = parseInt(indexYear) || new Date().getFullYear();
                        if (year > 2020) setIndexYear((year - 1).toString());
                      }}
                      className={`px-3 py-1.5 ${colors.bgHover} hover:${colors.primaryLight} ${colors.textSecondary} hover:${colors.primaryIcon} transition-colors`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className={`text-xs ${colors.textSecondary} mt-2`}>
                {lang === 'ar'
                  ? `سيتم إنشاء المؤشر برمز: ${selectedTemplateData.code}-${indexYear}`
                  : `Index will be created with code: ${selectedTemplateData.code}-${indexYear}`}
              </p>
            </div>
          </div>

          {/* Step 3: Download & Upload Template */}
          <div className={`${colors.bgSecondary} rounded-xl shadow-lg dark:shadow-gray-900/50 p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`px-3 py-1.5 border ${colors.border} rounded-md flex items-center justify-center ${colors.textSecondary} font-medium`}>
                3
              </div>
              <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'القالب والملف' : 'Template & File'}
              </h2>
            </div>

            <div className="space-y-4">
              {/* Download Template */}
              <div className={`flex items-start gap-3 p-4 border ${colors.border} rounded-lg`}>
                <FileSpreadsheet className={`w-6 h-6 ${colors.primaryIcon} flex-shrink-0 mt-1`} />
                <div className="flex-1">
                  <p className={`text-sm ${colors.textSecondary} mb-3`}>
                    {lang === 'ar'
                      ? 'حمّل القالب، املأه بالبيانات، ثم ارفعه أدناه'
                      : 'Download the template, fill it with data, then upload it below'}
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className={`flex items-center gap-2 px-4 py-2 ${patterns.button} text-sm`}
                  >
                    <Download className="w-4 h-4" />
                    {lang === 'ar' ? 'تحميل القالب' : 'Download Template'}
                  </button>
                </div>
              </div>

              {/* Upload File */}
              <div className={`border-2 border-dashed ${colors.border} rounded-lg p-6`}>
                <div className="text-center">
                  {file ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <FileSpreadsheet className={`w-10 h-10 ${colors.primaryIcon}`} />
                      </div>
                      <div className={`flex items-center justify-center gap-2 ${colors.primaryIcon}`}>
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">{file.name}</span>
                      </div>
                      <p className={`text-xs ${colors.textSecondary}`}>
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        <X className="w-3 h-3" />
                        {lang === 'ar' ? 'إزالة' : 'Remove'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className={`w-12 h-12 ${colors.textSecondary} mx-auto mb-3`} />
                      <p className={`text-sm ${colors.textSecondary} mb-3`}>
                        {lang === 'ar'
                          ? 'اسحب الملف هنا أو انقر للاختيار'
                          : 'Drag file here or click to select'}
                      </p>
                      <label className={`inline-block px-4 py-2 ${patterns.button} cursor-pointer text-sm`}>
                        {lang === 'ar' ? 'اختيار ملف' : 'Select File'}
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className={`text-xs ${colors.textSecondary} mt-2`}>
                        {lang === 'ar' ? 'Excel (.xlsx, .xls)' : 'Excel (.xlsx, .xls)'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Owner Email */}
          <div className={`${colors.bgSecondary} rounded-xl shadow-lg dark:shadow-gray-900/50 p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`px-3 py-1.5 border ${colors.border} rounded-md flex items-center justify-center ${colors.textSecondary} font-medium`}>
                4
              </div>
              <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'المسؤول' : 'Owner'}
              </h2>
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                {lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder={lang === 'ar' ? 'admin@example.com' : 'admin@example.com'}
                className={`w-full px-4 py-3 ${patterns.input}`}
                required
                dir="ltr"
              />
              <p className={`text-xs ${colors.textSecondary} mt-2`}>
                {lang === 'ar'
                  ? 'البريد الإلكتروني للمسؤول عن هذا المؤشر'
                  : 'Email address of the person responsible for this index'}
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className={`${colors.primaryLight} border-l-4 border-[rgb(var(--color-focus-ring))] p-4 rounded`}>
            <div className="flex gap-3">
              <AlertCircle className={`w-5 h-5 ${colors.primaryIcon} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`text-sm ${colors.textPrimary} font-medium mb-1`}>
                  {lang === 'ar' ? 'ملاحظة هامة' : 'Important Note'}
                </p>
                <p className={`text-sm ${colors.textPrimary}`}>
                  {lang === 'ar'
                    ? 'تأكد من أن ملف Excel يتبع التنسيق الموجود في القالب بالضبط. أي تعديل في بنية الجدول قد يؤدي إلى فشل في الاستيراد.'
                    : 'Make sure the Excel file follows the exact format in the template. Any modification to the table structure may result in import failure.'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center justify-between pt-4 border-t ${colors.border}`}>
            <button
              type="button"
              onClick={() => navigate('/index')}
              className={`px-6 py-3 ${colors.textSecondary} hover:${colors.textPrimary} ${colors.bgHover} rounded-lg transition-colors font-medium`}
              disabled={uploading}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !ownerEmail || !indexYear}
              className={`flex items-center gap-2 px-8 py-3 ${patterns.button} disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {lang === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  {lang === 'ar' ? 'إنشاء المؤشر' : 'Create Index'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndexCreate;
