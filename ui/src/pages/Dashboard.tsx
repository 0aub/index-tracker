import { useState } from 'react';
import { Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import MaturityGauge from '../components/MaturityGauge';
import LevelIndicator from '../components/LevelIndicator';
import {
  calculateOverallMaturity,
  calculateSectionMaturity,
  SECTION_NAMES,
  type Requirement
} from '../utils/calculations';
import requirementsData from '../data/requirements.json';
import evidenceData from '../data/evidence_submissions.json';
import auditLogData from '../data/audit_log.json';
import usersData from '../data/users.json';

const Dashboard = () => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const requirements: Requirement[] = requirementsData.requirements;
  const evidence = evidenceData.evidence_submissions;
  const auditLog = auditLogData.audit_log;
  const users = usersData.users;

  const overallScore = calculateOverallMaturity(requirements);
  const totalRequirements = requirements.length;
  const confirmedEvidence = evidence.filter(e => e.status === 'confirmed').length;
  const totalEvidence = requirements.length * 6;
  const completionPercentage = Math.round((confirmedEvidence / totalEvidence) * 100);

  const targetDate = new Date('2025-03-31');
  const today = new Date();
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const pendingReviews = evidence.filter(e => e.status === 'submitted' || e.status === 'ready_for_audit').length;
  const changesRequested = evidence.filter(e => e.status === 'changes_requested').length;

  const sections = Object.keys(SECTION_NAMES);

  return (
    <div className={`min-h-screen bg-gray-50 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {lang === 'ar' ? 'لوحة المعلومات' : 'Dashboard'}
            </h1>
            <p className="text-gray-600 mt-2">
              {lang === 'ar' ? 'نظرة عامة على المؤشر الوطني للذكاء الاصطناعي' : 'Overview of National AI Index'}
            </p>
          </div>
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="text-blue-600" size={24} />
              </div>
              <span className="text-3xl font-bold text-blue-600">{overallScore.toFixed(2)}</span>
            </div>
            <h3 className="text-gray-600 text-sm">
              {lang === 'ar' ? 'النضج الإجمالي' : 'Overall Maturity'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {lang === 'ar' ? 'من 5.00' : 'Out of 5.00'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <span className="text-3xl font-bold text-green-600">{completionPercentage}%</span>
            </div>
            <h3 className="text-gray-600 text-sm">
              {lang === 'ar' ? 'نسبة الإنجاز' : 'Completion Rate'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {confirmedEvidence} / {totalEvidence} {lang === 'ar' ? 'مستوى' : 'levels'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="text-orange-600" size={24} />
              </div>
              <span className="text-3xl font-bold text-orange-600">{daysRemaining}</span>
            </div>
            <h3 className="text-gray-600 text-sm">
              {lang === 'ar' ? 'الأيام المتبقية' : 'Days Remaining'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {lang === 'ar' ? 'حتى 31 مارس 2025' : 'Until March 31, 2025'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <AlertCircle className="text-purple-600" size={24} />
              </div>
              <span className="text-3xl font-bold text-purple-600">{totalRequirements}</span>
            </div>
            <h3 className="text-gray-600 text-sm">
              {lang === 'ar' ? 'إجمالي المتطلبات' : 'Total Requirements'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {lang === 'ar' ? 'عبر 7 أقسام' : 'Across 7 sections'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800">
              {lang === 'ar' ? 'الأداء حسب القسم' : 'Performance by Section'}
            </h2>
            <div className="space-y-4">
              {sections.map(section => {
                const maturity = calculateSectionMaturity(requirements, section);
                const sectionReqs = requirements.filter(r => r.section === section);
                const targetAvg = sectionReqs.reduce((acc, r) => acc + r.target_level, 0) / sectionReqs.length;
                const percentage = (maturity / 5) * 100;

                return (
                  <div key={section}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {SECTION_NAMES[section as keyof typeof SECTION_NAMES][lang]}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {maturity.toFixed(1)} / {targetAvg.toFixed(1)}
                        </span>
                        <LevelIndicator currentLevel={Math.floor(maturity)} size="sm" />
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800">
              {lang === 'ar' ? 'التنبيهات والإشعارات' : 'Alerts & Notifications'}
            </h2>
            <div className="space-y-4">
              {pendingReviews > 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-yellow-900">
                      {lang === 'ar' ? 'مراجعات معلقة' : 'Pending Reviews'}
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {pendingReviews} {lang === 'ar' ? 'مستند بانتظار المراجعة' : 'documents awaiting review'}
                    </p>
                  </div>
                </div>
              )}

              {changesRequested > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-red-900">
                      {lang === 'ar' ? 'تحتاج تعديل' : 'Changes Requested'}
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      {changesRequested} {lang === 'ar' ? 'مستند يحتاج إلى تعديل' : 'documents need modification'}
                    </p>
                  </div>
                </div>
              )}

              {daysRemaining <= 30 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <Clock className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-orange-900">
                      {lang === 'ar' ? 'موعد نهائي قريب' : 'Deadline Approaching'}
                    </h4>
                    <p className="text-sm text-orange-700 mt-1">
                      {daysRemaining} {lang === 'ar' ? 'يوم متبقي حتى الموعد النهائي' : 'days until deadline'}
                    </p>
                  </div>
                </div>
              )}

              {pendingReviews === 0 && changesRequested === 0 && daysRemaining > 30 && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-green-900">
                      {lang === 'ar' ? 'كل شيء على ما يرام' : 'All Good'}
                    </h4>
                    <p className="text-sm text-green-700 mt-1">
                      {lang === 'ar' ? 'لا توجد تنبيهات عاجلة' : 'No urgent alerts'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-6 text-gray-800">
            {lang === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
          </h2>
          <div className="space-y-4">
            {auditLog.slice(0, 8).map(log => {
              const user = users.find(u => u.id === log.user_id);
              const actionLabels = {
                ar: {
                  index_created: 'تم إنشاء المؤشر',
                  coordinator_assigned: 'تم تعيين منسق',
                  document_uploaded: 'تم رفع مستند',
                  document_approved: 'تم اعتماد مستند',
                  changes_requested: 'تم طلب تعديلات'
                },
                en: {
                  index_created: 'Index created',
                  coordinator_assigned: 'Coordinator assigned',
                  document_uploaded: 'Document uploaded',
                  document_approved: 'Document approved',
                  changes_requested: 'Changes requested'
                }
              };

              return (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {actionLabels[lang][log.action as keyof typeof actionLabels.ar] || log.action}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {lang === 'ar' ? user?.name : user?.name_en}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
