import React, { useState, useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import { colors, patterns } from '../utils/darkMode';
import { Building2, ChevronDown, ChevronRight, Plus, Save, X } from 'lucide-react';
import { agencyApi, generalManagementApi, departmentApi, getCompleteHierarchy, type Agency, type GeneralManagement, type Department } from '../services/organizationHierarchy';
import toast from 'react-hot-toast';

const OrganizationHierarchy: React.FC = () => {
  const { language } = useUIStore();
  const lang = language;

  const [hierarchy, setHierarchy] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [expandedGMs, setExpandedGMs] = useState<Set<string>>(new Set());

  // Modal states
  const [showAddAgency, setShowAddAgency] = useState(false);
  const [showAddGM, setShowAddGM] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [selectedGMId, setSelectedGMId] = useState<string>('');

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    display_order: 0
  });

  useEffect(() => {
    loadHierarchy();
  }, []);

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      const data = await getCompleteHierarchy();
      setHierarchy(data.agencies);
    } catch (error) {
      console.error('Failed to load hierarchy:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل الهيكل التنظيمي' : 'Failed to load hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const toggleAgency = (agencyId: string) => {
    const newExpanded = new Set(expandedAgencies);
    if (newExpanded.has(agencyId)) {
      newExpanded.delete(agencyId);
    } else {
      newExpanded.add(agencyId);
    }
    setExpandedAgencies(newExpanded);
  };

  const toggleGM = (gmId: string) => {
    const newExpanded = new Set(expandedGMs);
    if (newExpanded.has(gmId)) {
      newExpanded.delete(gmId);
    } else {
      newExpanded.add(gmId);
    }
    setExpandedGMs(newExpanded);
  };

  const handleAddAgency = async () => {
    if (!formData.code || !formData.name_ar) {
      toast.error(lang === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      await agencyApi.create({
        code: formData.code,
        name_ar: formData.name_ar,
        name_en: formData.name_en || undefined,
        display_order: formData.display_order,
        is_active: true
      });
      setShowAddAgency(false);
      resetForm();
      loadHierarchy();
      toast.success(lang === 'ar' ? 'تمت إضافة الوكالة بنجاح' : 'Agency added successfully');
    } catch (error) {
      console.error('Failed to add agency:', error);
      toast.error(lang === 'ar' ? 'فشل في إضافة الوكالة' : 'Failed to add agency');
    }
  };

  const handleAddGM = async () => {
    if (!formData.code || !formData.name_ar) {
      toast.error(lang === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      await generalManagementApi.create({
        agency_id: selectedAgencyId,
        code: formData.code,
        name_ar: formData.name_ar,
        name_en: formData.name_en || undefined,
        display_order: formData.display_order,
        is_active: true
      });
      setShowAddGM(false);
      resetForm();
      loadHierarchy();
      toast.success(lang === 'ar' ? 'تمت إضافة الإدارة العامة بنجاح' : 'General Management added successfully');
    } catch (error) {
      console.error('Failed to add GM:', error);
      toast.error(lang === 'ar' ? 'فشل في إضافة الإدارة العامة' : 'Failed to add General Management');
    }
  };

  const handleAddDept = async () => {
    if (!formData.code || !formData.name_ar) {
      toast.error(lang === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      await departmentApi.create({
        general_management_id: selectedGMId,
        code: formData.code,
        name_ar: formData.name_ar,
        name_en: formData.name_en || undefined,
        display_order: formData.display_order,
        is_active: true
      });
      setShowAddDept(false);
      resetForm();
      loadHierarchy();
      toast.success(lang === 'ar' ? 'تمت إضافة الإدارة بنجاح' : 'Department added successfully');
    } catch (error) {
      console.error('Failed to add department:', error);
      toast.error(lang === 'ar' ? 'فشل في إضافة الإدارة' : 'Failed to add department');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name_ar: '',
      name_en: '',
      display_order: 0
    });
  };

  const FormModal: React.FC<{ show: boolean; onClose: () => void; onSave: () => void; title: string }> = ({ show, onClose, onSave, title }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className={`${colors.bgSecondary} rounded-lg p-6 w-full max-w-md`}>
          <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>{title}</h2>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الرمز' : 'Code'} *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className={`w-full px-3 py-2 ${patterns.input}`}
                placeholder="IT-001"
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'} *
              </label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className={`w-full px-3 py-2 ${patterns.input}`}
                dir="rtl"
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الاسم بالإنجليزي' : 'English Name'}
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className={`w-full px-3 py-2 ${patterns.input}`}
                dir="ltr"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الترتيب' : 'Display Order'}
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 ${patterns.input}`}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={onSave}
              className={`flex-1 px-4 py-2 ${patterns.primaryButton} flex items-center justify-center gap-2`}
            >
              <Save size={18} />
              {lang === 'ar' ? 'حفظ' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2 ${patterns.secondaryButton} flex items-center justify-center gap-2`}
            >
              <X size={18} />
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className={`text-lg ${colors.textPrimary}`}>
          {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-3xl font-bold ${colors.textPrimary}`}>
            {lang === 'ar' ? 'الهيكل التنظيمي' : 'Organizational Hierarchy'}
          </h1>
          <p className={`${colors.textSecondary} mt-1`}>
            {lang === 'ar' ? 'إدارة الوكالات والإدارات العامة والإدارات' : 'Manage Agencies, General Managements, and Departments'}
          </p>
        </div>
        <button
          onClick={() => setShowAddAgency(true)}
          className={`px-4 py-2 ${patterns.primaryButton} flex items-center gap-2`}
        >
          <Plus size={20} />
          {lang === 'ar' ? 'إضافة وكالة' : 'Add Agency'}
        </button>
      </div>

      {/* Hierarchy Tree */}
      <div className={`${colors.bgSecondary} rounded-lg p-6 ${colors.border} border`}>
        {hierarchy.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={48} className={`mx-auto mb-4 ${colors.textTertiary}`} />
            <p className={`${colors.textSecondary}`}>
              {lang === 'ar' ? 'لا توجد وكالات بعد' : 'No agencies yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {hierarchy.map((agency) => (
              <div key={agency.id} className="space-y-2">
                {/* Agency Level */}
                <div className={`flex items-center gap-3 p-4 rounded-lg ${colors.bgTertiary} hover:${colors.bgHover} transition-colors border ${colors.border}`}>
                  <button onClick={() => toggleAgency(agency.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                    {expandedAgencies.has(agency.id) ? (
                      <ChevronDown size={20} className={colors.textPrimary} />
                    ) : (
                      <ChevronRight size={20} className={colors.textPrimary} />
                    )}
                  </button>
                  <Building2 size={22} className="text-purple-500" />
                  <div className="flex-1">
                    <p className={`font-semibold ${colors.textPrimary}`}>
                      {lang === 'ar' ? agency.name_ar : (agency.name_en || agency.name_ar)}
                    </p>
                    {agency.name_en && (
                      <p className={`text-sm ${colors.textSecondary}`}>
                        {lang === 'ar' ? agency.name_en : agency.name_ar}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${colors.bgPrimary} ${colors.textTertiary}`}>{agency.code}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAgencyId(agency.id);
                      setShowAddGM(true);
                    }}
                    className={`p-2 ${patterns.iconButton}`}
                    title={lang === 'ar' ? 'إضافة إدارة عامة' : 'Add General Management'}
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* General Managements */}
                {expandedAgencies.has(agency.id) && agency.general_managements && agency.general_managements.length > 0 && (
                  <div className={`${lang === 'ar' ? 'mr-8' : 'ml-8'} space-y-2`}>
                    {agency.general_managements.map((gm) => (
                      <div key={gm.id} className="space-y-2">
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${colors.bgPrimary} hover:${colors.bgHover} transition-colors border ${colors.border}`}>
                          <button onClick={() => toggleGM(gm.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                            {expandedGMs.has(gm.id) ? (
                              <ChevronDown size={18} className={colors.textPrimary} />
                            ) : (
                              <ChevronRight size={18} className={colors.textPrimary} />
                            )}
                          </button>
                          <Building2 size={20} className="text-blue-500" />
                          <div className="flex-1">
                            <p className={`font-medium ${colors.textPrimary}`}>
                              {lang === 'ar' ? gm.name_ar : (gm.name_en || gm.name_ar)}
                            </p>
                            {gm.name_en && (
                              <p className={`text-sm ${colors.textSecondary}`}>
                                {lang === 'ar' ? gm.name_en : gm.name_ar}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${colors.bgSecondary} ${colors.textTertiary}`}>{gm.code}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGMId(gm.id);
                              setShowAddDept(true);
                            }}
                            className={`p-2 ${patterns.iconButton}`}
                            title={lang === 'ar' ? 'إضافة إدارة' : 'Add Department'}
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        {/* Departments */}
                        {expandedGMs.has(gm.id) && gm.departments && gm.departments.length > 0 && (
                          <div className={`${lang === 'ar' ? 'mr-8' : 'ml-8'} space-y-1`}>
                            {gm.departments.map((dept) => (
                              <div key={dept.id} className={`flex items-center gap-3 p-2 rounded-lg ${colors.bgSecondary} hover:${colors.bgHover} transition-colors`}>
                                <div className="w-5" /> {/* Spacer for alignment */}
                                <Building2 size={18} className="text-green-500" />
                                <div className="flex-1">
                                  <p className={`text-sm ${colors.textPrimary}`}>
                                    {lang === 'ar' ? dept.name_ar : (dept.name_en || dept.name_ar)}
                                  </p>
                                  {dept.name_en && (
                                    <p className={`text-xs ${colors.textSecondary}`}>
                                      {lang === 'ar' ? dept.name_en : dept.name_ar}
                                    </p>
                                  )}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${colors.bgTertiary} ${colors.textTertiary}`}>{dept.code}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <FormModal
        show={showAddAgency}
        onClose={() => { setShowAddAgency(false); resetForm(); }}
        onSave={handleAddAgency}
        title={lang === 'ar' ? 'إضافة وكالة جديدة' : 'Add New Agency'}
      />
      <FormModal
        show={showAddGM}
        onClose={() => { setShowAddGM(false); resetForm(); }}
        onSave={handleAddGM}
        title={lang === 'ar' ? 'إضافة إدارة عامة جديدة' : 'Add New General Management'}
      />
      <FormModal
        show={showAddDept}
        onClose={() => { setShowAddDept(false); resetForm(); }}
        onSave={handleAddDept}
        title={lang === 'ar' ? 'إضافة إدارة جديدة' : 'Add New Department'}
      />
    </div>
  );
};

export default OrganizationHierarchy;
