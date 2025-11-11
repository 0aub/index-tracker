import { useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { FileText, FileSpreadsheet, Presentation, ChevronDown, ChevronUp } from 'lucide-react';
import MaturityGauge from '../components/MaturityGauge';
import LevelIndicator from '../components/LevelIndicator';
import {
  calculateOverallMaturity,
  calculateSectionMaturity,
  calculateSectionCompletion,
  getStatusDistribution,
  getSectionData,
  SECTION_NAMES,
  STATUS_COLORS,
  STATUS_NAMES,
  type Requirement
} from '../utils/calculations';

import requirementsData from '../data/requirements.json';
import evidenceData from '../data/evidence_submissions.json';

const Reports = () => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const requirements: Requirement[] = requirementsData.requirements;
  const evidence = evidenceData.evidence_submissions;

  const overallScore = calculateOverallMaturity(requirements);
  const sectionData = getSectionData(requirements, lang);
  const statusDistribution = getStatusDistribution(evidence);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleExport = (type: 'pdf' | 'excel' | 'ppt') => {
    alert(`تصدير ${type === 'pdf' ? 'PDF' : type === 'excel' ? 'Excel' : 'PowerPoint'} - قيد التطوير`);
  };

  const sections = Object.keys(SECTION_NAMES);

  const statusDistributionData = statusDistribution.map(item => ({
    ...item,
    displayName: STATUS_NAMES[item.name as keyof typeof STATUS_NAMES][lang]
  }));

  return (
    <div className={`min-h-screen bg-gray-50 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {lang === 'ar' ? 'تقارير المؤشر الوطني للذكاء الاصطناعي' : 'National AI Index Reports'}
            </h1>
            <p className="text-gray-600 mt-2">
              {lang === 'ar' ? 'تحليل شامل لمستوى النضج في الذكاء الاصطناعي' : 'Comprehensive AI Maturity Analysis'}
            </p>
          </div>
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
            <MaturityGauge
              value={overallScore}
              label={lang === 'ar' ? 'النضج الإجمالي' : 'Overall Maturity'}
              sublabel={lang === 'ar' ? 'المستوى الحالي' : 'Current Level'}
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {lang === 'ar' ? 'الإحصائيات السريعة' : 'Quick Statistics'}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{lang === 'ar' ? 'إجمالي المتطلبات' : 'Total Requirements'}</span>
                <span className="text-2xl font-bold text-gray-900">{requirements.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{lang === 'ar' ? 'الأدلة المؤكدة' : 'Confirmed Evidence'}</span>
                <span className="text-2xl font-bold text-green-600">
                  {evidence.filter(e => e.status === 'confirmed').length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{lang === 'ar' ? 'قيد المراجعة' : 'Under Review'}</span>
                <span className="text-2xl font-bold text-yellow-600">
                  {evidence.filter(e => e.status === 'submitted' || e.status === 'ready_for_audit').length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">{lang === 'ar' ? 'تحتاج تعديل' : 'Need Changes'}</span>
                <span className="text-2xl font-bold text-red-600">
                  {evidence.filter(e => e.status === 'changes_requested').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {lang === 'ar' ? 'تقدم المشروع' : 'Project Progress'}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {lang === 'ar' ? 'إكمال الأدلة' : 'Evidence Completion'}
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {Math.round((evidence.filter(e => e.status === 'confirmed').length / (requirements.length * 6)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((evidence.filter(e => e.status === 'confirmed').length / (requirements.length * 6)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 mb-8">
          {sections.map(section => {
            const maturity = calculateSectionMaturity(requirements, section);
            const completion = calculateSectionCompletion(requirements, evidence, section);

            return (
              <div key={section} className="bg-white rounded-lg shadow p-4">
                <h4 className="text-sm font-semibold mb-2 text-gray-700">
                  {SECTION_NAMES[section as keyof typeof SECTION_NAMES][lang]}
                </h4>
                <div className="text-2xl font-bold mb-1 text-blue-600">
                  {maturity.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {lang === 'ar' ? 'من 5' : 'out of 5'}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600">{completion}% {lang === 'ar' ? 'مكتمل' : 'complete'}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {lang === 'ar' ? 'تحليل الأقسام' : 'Section Analysis'}
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={sectionData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="section" />
                <PolarRadiusAxis angle={90} domain={[0, 5]} />
                <Radar
                  name={lang === 'ar' ? 'المستوى الحالي' : 'Current Level'}
                  dataKey="current"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {lang === 'ar' ? 'توزيع حالة الأدلة' : 'Evidence Status Distribution'}
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={statusDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ displayName, value }) => `${value}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistributionData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value} />
                <Legend formatter={(value) => {
                  const item = statusDistributionData.find(d => d.name === value);
                  return item?.displayName || value;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            {lang === 'ar' ? 'مقارنة الأقسام' : 'Section Comparison'}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="section" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" fill="#3B82F6" name={lang === 'ar' ? 'المستوى الحالي' : 'Current Level'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            {lang === 'ar' ? 'تفاصيل الأقسام' : 'Section Details'}
          </h2>
          <div className="space-y-4">
            {sections.map(section => {
              const sectionReqs = requirements.filter(r => r.section === section);
              const isExpanded = expandedSections.includes(section);

              return (
                <div key={section} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {SECTION_NAMES[section as keyof typeof SECTION_NAMES][lang]}
                      </h3>
                      <span className="text-sm text-gray-600">
                        ({sectionReqs.length} {lang === 'ar' ? 'متطلبات' : 'requirements'})
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {isExpanded && (
                    <div className="p-6 bg-white">
                      <div className="space-y-3">
                        {sectionReqs.map(req => {
                          const reqEvidence = evidence.filter(e => e.requirement_id === req.id);
                          const confirmedCount = reqEvidence.filter(e => e.status === 'confirmed').length;
                          return (
                            <div key={req.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{req.id}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {lang === 'ar' ? req.question : req.question_en}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <LevelIndicator currentLevel={req.current_level} />
                                <span className="text-sm text-gray-600 whitespace-nowrap">
                                  {confirmedCount} / 6
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            {lang === 'ar' ? 'تصدير التقارير' : 'Export Reports'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition border-2 border-red-200"
            >
              <FileText size={24} />
              <div className="text-left">
                <div className="font-semibold">{lang === 'ar' ? 'تقرير PDF' : 'PDF Report'}</div>
                <div className="text-sm">{lang === 'ar' ? 'تقرير شامل تنفيذي' : 'Comprehensive Executive Report'}</div>
              </div>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition border-2 border-green-200"
            >
              <FileSpreadsheet size={24} />
              <div className="text-left">
                <div className="font-semibold">{lang === 'ar' ? 'ملف Excel' : 'Excel File'}</div>
                <div className="text-sm">{lang === 'ar' ? 'بيانات تفصيلية' : 'Detailed Data'}</div>
              </div>
            </button>
            <button
              onClick={() => handleExport('ppt')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition border-2 border-orange-200"
            >
              <Presentation size={24} />
              <div className="text-left">
                <div className="font-semibold">{lang === 'ar' ? 'عرض تقديمي' : 'PowerPoint'}</div>
                <div className="text-sm">{lang === 'ar' ? 'عرض للإدارة التنفيذية' : 'Executive Presentation'}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
