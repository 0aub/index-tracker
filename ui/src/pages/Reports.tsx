import { useState, useEffect } from 'react';
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
import { FileText, FileSpreadsheet, Presentation, ChevronDown, ChevronUp, Loader2, AlertCircle, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MaturityGauge from '../components/MaturityGauge';
import LevelIndicator from '../components/LevelIndicator';
import {
  calculateOverallMaturity,
  calculateSectionMaturity,
  calculateSectionCompletion,
  getStatusDistribution,
  STATUS_COLORS,
  STATUS_NAMES,
  type Requirement
} from '../utils/calculations';
import { colors, patterns } from '../utils/darkMode';
import { useUIStore } from '../stores/uiStore';
import { useIndexStore } from '../stores/indexStore';
import { api, Assignment } from '../services/api';
import toast from 'react-hot-toast';
import { exportToPDF, exportToExcel, exportToPowerPoint, PDFExportData } from '../utils/exportReports';

const Reports = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const { currentIndex } = useIndexStore();
  const lang = language;

  const [requirements, setRequirements] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [evidenceStats, setEvidenceStats] = useState({
    approved: 0,
    rejected: 0,
    underRevision: 0,
    total: 0
  });
  const [userEngagement, setUserEngagement] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Load data when index changes
  useEffect(() => {
    if (currentIndex) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [currentIndex?.id]);

  const loadData = async () => {
    if (!currentIndex) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch requirements, assignments, evidence, and user engagement for current index
      const [requirementsData, assignmentsData, evidenceData, userEngagementData] = await Promise.all([
        api.requirements.getAll({ index_id: currentIndex.id }),
        api.assignments.getByIndex(currentIndex.id),
        api.evidence.getAll({}), // Get all evidence
        api.indices.getUserEngagement(currentIndex.id),
      ]);

      // Filter evidence by requirements in this index
      const requirementIds = requirementsData.map(r => r.id);
      const indexEvidence = evidenceData.filter(e => requirementIds.includes(e.requirement_id));

      // Calculate evidence stats
      const stats = {
        approved: indexEvidence.filter(e => e.status === 'approved').length,
        rejected: indexEvidence.filter(e => e.status === 'rejected').length,
        underRevision: indexEvidence.filter(e => e.status === 'submitted' || e.status === 'confirmed').length,
        total: indexEvidence.length
      };

      // Create a map of requirement assignments to get current levels
      const assignmentMap = new Map();
      assignmentsData.forEach(assignment => {
        const existing = assignmentMap.get(assignment.requirement_id);
        const currentLevel = assignment.current_level ? parseInt(assignment.current_level) : 0;
        // Keep the highest level if multiple assignments exist
        if (!existing || currentLevel > (existing.current_level || 0)) {
          assignmentMap.set(assignment.requirement_id, {
            current_level: currentLevel,
            status: assignment.status
          });
        }
      });

      // Transform requirements to match the old format for calculations
      const transformedRequirements = requirementsData.map(req => {
        const assignment = assignmentMap.get(req.id);
        return {
          id: req.code,
          requirement_db_id: req.id, // Store original DB ID for evidence mapping
          question: req.question_ar,
          question_en: req.question_en,
          section: req.main_area_ar, // Use main_area_ar as section
          current_level: assignment?.current_level || 0,
        };
      });

      setRequirements(transformedRequirements);
      setEvidence(indexEvidence);
      setEvidenceStats(stats);
      setUserEngagement(userEngagementData.user_statistics);
    } catch (err: any) {
      console.error('Failed to load reports data:', err);
      setError(err.message || 'Failed to load reports data');
      toast.error(lang === 'ar' ? 'فشل تحميل بيانات التقارير' : 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleExport = async (type: 'pdf' | 'excel' | 'ppt') => {
    if (!currentIndex) {
      toast.error(lang === 'ar' ? 'الرجاء اختيار مؤشر أولاً' : 'Please select an index first');
      return;
    }

    try {
      toast.loading(lang === 'ar' ? 'جاري تصدير التقرير...' : 'Exporting report...');

      // Prepare section data
      const sections = Array.from(new Set(requirements.map(r => r.section))).sort();
      const sectionData = sections.map(section => ({
        name: section,
        maturity: calculateSectionMaturity(requirements, section),
        completion: calculateSectionCompletion(requirements, evidence, section),
        requirementCount: requirements.filter(r => r.section === section).length
      }));

      // Prepare export data
      const exportData: PDFExportData = {
        indexName: lang === 'ar' ? currentIndex.name_ar : currentIndex.name_en || currentIndex.name_ar,
        indexCode: currentIndex.code,
        overallMaturity: calculateOverallMaturity(requirements),
        sections: sectionData,
        userEngagement: userEngagement.map(u => ({
          username: u.username,
          fullName: lang === 'ar' ? u.full_name_ar || u.username : u.full_name_en || u.username,
          assignedRequirements: u.assigned_requirements,
          approvedDocuments: u.approved_documents,
          totalUploads: u.total_uploads,
          rejectedDocuments: u.rejected_documents,
          totalComments: u.total_comments
        })),
        requirements,
        lang
      };

      // Call appropriate export function
      if (type === 'pdf') {
        await exportToPDF(exportData);
        toast.dismiss();
        toast.success(lang === 'ar' ? 'تم تصدير تقرير PDF بنجاح' : 'PDF report exported successfully');
      } else if (type === 'excel') {
        await exportToExcel(exportData);
        toast.dismiss();
        toast.success(lang === 'ar' ? 'تم تصدير ملف Excel بنجاح' : 'Excel file exported successfully');
      } else if (type === 'ppt') {
        await exportToPowerPoint(exportData);
        toast.dismiss();
        toast.success(lang === 'ar' ? 'تم تصدير العرض التقديمي بنجاح' : 'PowerPoint presentation exported successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss();
      toast.error(lang === 'ar' ? 'فشل تصدير التقرير' : 'Failed to export report');
    }
  };

  // No index selected
  if (!currentIndex) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Layers className={`w-16 h-16 ${colors.textSecondary} mx-auto mb-4`} />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'لم يتم اختيار مؤشر' : 'No Index Selected'}
            </h3>
            <p className={`${colors.textSecondary} mb-6`}>
              {lang === 'ar'
                ? 'يرجى اختيار مؤشر من القائمة أعلاه لعرض التقارير'
                : 'Please select an index from the selector above to view reports'}
            </p>
            <button
              onClick={() => navigate('/index')}
              className={`px-6 py-3 ${patterns.button}`}
            >
              {lang === 'ar' ? 'إدارة المؤشرات' : 'Manage Index'}
            </button>
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
              {lang === 'ar' ? 'جاري تحميل التقارير...' : 'Loading reports...'}
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
              onClick={loadData}
              className={`px-6 py-2 ${patterns.button}`}
            >
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (requirements.length === 0) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <FileText className={`w-16 h-16 ${colors.textSecondary} mx-auto mb-4`} />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'لا توجد بيانات' : 'No Data Available'}
            </h3>
            <p className={`${colors.textSecondary} mb-6`}>
              {lang === 'ar'
                ? 'لا توجد متطلبات في هذا المؤشر لإنشاء التقارير'
                : 'No requirements in this index to generate reports'}
            </p>
            <button
              onClick={() => navigate('/requirements')}
              className={`px-6 py-3 ${patterns.button}`}
            >
              {lang === 'ar' ? 'الذهاب إلى المتطلبات' : 'Go to Requirements'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract unique sections from actual requirements data (from Excel file)
  const sections = Array.from(new Set(requirements.map(r => r.section))).sort();

  const overallScore = calculateOverallMaturity(requirements);

  // Calculate evidence status distribution from actual evidence data
  // Using app color system with dynamic CSS variables
  const evidenceStatusDistribution = [
    { name: 'approved', value: evidenceStats.approved, color: '#10B981' }, // Green
    { name: 'confirmed', value: evidence.filter(e => e.status === 'confirmed').length, color: 'rgb(var(--color-primary))' }, // Primary color
    { name: 'underRevision', value: evidenceStats.underRevision, color: '#F59E0B' }, // Orange
    { name: 'rejected', value: evidenceStats.rejected, color: '#EF4444' }, // Red
    { name: 'draft', value: evidence.filter(e => e.status === 'draft').length, color: '#9CA3AF' }, // Gray
  ].filter(item => item.value > 0);

  const evidenceStatusLabels = {
    approved: { ar: 'معتمد', en: 'Approved' },
    confirmed: { ar: 'مؤكد', en: 'Confirmed' },
    underRevision: { ar: 'قيد المراجعة', en: 'Under Revision' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
    draft: { ar: 'مسودة', en: 'Draft' },
  };

  const statusDistributionData = evidenceStatusDistribution.map(item => ({
    ...item,
    displayName: evidenceStatusLabels[item.name as keyof typeof evidenceStatusLabels][lang]
  }));

  // Create section data dynamically from actual sections (not hardcoded)
  const sectionData = sections.map(section => {
    const sectionReqs = requirements.filter(r => r.section === section);
    const maturity = calculateSectionMaturity(requirements, section);
    const completion = calculateSectionCompletion(requirements, evidence, section);

    return {
      section: section, // Section name from Excel (main_area_ar)
      current: Number(maturity.toFixed(2)), // Original maturity (0-5)
      maturityScaled: Number((maturity * 20).toFixed(1)), // Scaled to 0-100 for radar
      fullMark: 5,
      requirements: sectionReqs.length,
      completion: Number(completion.toFixed(1))
    };
  });

  return (
    <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تقارير المؤشر' : 'Index Reports'}
            </h1>
            <p className={`mt-2 ${colors.textSecondary}`}>
              {lang === 'ar'
                ? `${currentIndex.name_ar} - ${currentIndex.code}`
                : `${currentIndex.name_en || currentIndex.name_ar} - ${currentIndex.code}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className={`${patterns.section} p-6 flex flex-col items-center`}>
            <MaturityGauge
              value={overallScore}
            />
          </div>

          <div className={`${patterns.section} p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'إحصائيات الأدلة' : 'Evidence Statistics'}
            </h3>
            <div className="space-y-4">
              <div className={`flex justify-between items-center py-2 border-b ${colors.border}`}>
                <span className={colors.textSecondary}>{lang === 'ar' ? 'ملفات معتمدة' : 'Approved Files'}</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {evidenceStats.approved}
                </span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${colors.border}`}>
                <span className={colors.textSecondary}>{lang === 'ar' ? 'قيد المراجعة' : 'Under Revision'}</span>
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {evidenceStats.underRevision}
                </span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${colors.border}`}>
                <span className={colors.textSecondary}>{lang === 'ar' ? 'ملفات مرفوضة' : 'Rejected Files'}</span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {evidenceStats.rejected}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className={colors.textSecondary}>{lang === 'ar' ? 'إجمالي الملفات' : 'Total Files'}</span>
                <span className={`text-2xl font-bold ${colors.textPrimary}`}>
                  {evidenceStats.total}
                </span>
              </div>
            </div>
          </div>

          <div className={`${patterns.section} p-6`}>
            <h3 className={`text-lg font-semibold mb-6 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تقدم المشروع' : 'Project Progress'}
            </h3>

            <div className="space-y-5">
              {/* Maturity Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-medium ${colors.textSecondary}`}>
                    {lang === 'ar' ? 'النضج الإجمالي' : 'Overall Maturity'}
                  </span>
                  <span className={`text-lg font-bold ${colors.textPrimary}`}>
                    {overallScore.toFixed(1)} / 5.0
                  </span>
                </div>
                <div className={`w-full h-3 ${colors.bgTertiary} rounded-full overflow-hidden`}>
                  <div
                    className={`h-full ${colors.primary} transition-all duration-1000 ease-out`}
                    style={{ width: `${(overallScore / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Overall Completion Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-medium ${colors.textSecondary}`}>
                    {lang === 'ar' ? 'نسبة الإنجاز الإجمالية' : 'Overall Completion'}
                  </span>
                  <span className={`text-lg font-bold ${colors.textPrimary}`}>
                    {sectionData.length > 0
                      ? Math.round(sectionData.reduce((sum, s) => sum + s.completion, 0) / sectionData.length)
                      : 0}%
                  </span>
                </div>
                <div className={`w-full h-3 ${colors.bgTertiary} rounded-full overflow-hidden`}>
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-1000 ease-out"
                    style={{
                      width: `${sectionData.length > 0
                        ? sectionData.reduce((sum, s) => sum + s.completion, 0) / sectionData.length
                        : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Evidence Submission Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-medium ${colors.textSecondary}`}>
                    {lang === 'ar' ? 'الأدلة المعتمدة' : 'Approved Evidence'}
                  </span>
                  <span className={`text-lg font-bold ${colors.textPrimary}`}>
                    {evidenceStats.total > 0 ? Math.round((evidenceStats.approved / evidenceStats.total) * 100) : 0}%
                  </span>
                </div>
                <div className={`w-full h-3 ${colors.bgTertiary} rounded-full overflow-hidden`}>
                  <div
                    className="h-full bg-green-600 dark:bg-green-400 transition-all duration-1000 ease-out"
                    style={{ width: `${evidenceStats.total > 0 ? ((evidenceStats.approved / evidenceStats.total) * 100) : 0}%` }}
                  />
                </div>
                <div className={`text-xs ${colors.textTertiary} mt-1`}>
                  {evidenceStats.approved} / {evidenceStats.total} {lang === 'ar' ? 'معتمدة' : 'approved'}
                  {evidenceStats.rejected > 0 && ` • ${evidenceStats.rejected} ${lang === 'ar' ? 'مرفوضة' : 'rejected'}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className={`${patterns.section} p-6`}>
            <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تحليل الأقسام' : 'Section Analysis'}
            </h2>
            <ResponsiveContainer width="100%" height={600}>
              <RadarChart data={sectionData} margin={{ top: 40, right: 40, bottom: 40, left: 40 }} outerRadius="65%">
                <PolarGrid
                  stroke="#9CA3AF"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
                <PolarAngleAxis
                  dataKey="section"
                  tick={(props) => {
                    const { x, y, payload, cx, cy } = props;
                    // Calculate distance from center and push label further out
                    const angle = Math.atan2(y - cy, x - cx);
                    const offset = 35; // Additional offset to push labels outside
                    const newX = x + Math.cos(angle) * offset;
                    const newY = y + Math.sin(angle) * offset;

                    return (
                      <text
                        x={newX}
                        y={newY}
                        textAnchor="middle"
                        fill="currentColor"
                        className={colors.textPrimary}
                        fontSize={12}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  className={colors.textSecondary}
                  stroke="#9CA3AF"
                  strokeOpacity={0.3}
                />
                <Radar
                  name={lang === 'ar' ? ' مستوى النضج' : ' Maturity Level'}
                  dataKey="maturityScaled"
                  stroke="rgb(var(--color-primary))"
                  strokeWidth={2}
                  fill="rgb(var(--color-primary))"
                  fillOpacity={0.3}
                />
                <Radar
                  name={lang === 'ar' ? ' نسبة الإنجاز' : ' Completion %'}
                  dataKey="completion"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="#10B981"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)'
                  }}
                  content={({ payload }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className={`${colors.bgSecondary} p-3 rounded shadow-lg border ${colors.border}`}>
                          <p className={`font-semibold ${colors.textPrimary} mb-2`}>{data.section}</p>
                          <p className={colors.textSecondary}>{lang === 'ar' ? 'مستوى النضج' : 'Maturity'}: {data.current.toFixed(2)} / 5 ({data.maturityScaled.toFixed(0)}%)</p>
                          <p className={colors.textSecondary}>{lang === 'ar' ? 'المتطلبات' : 'Requirements'}: {data.requirements}</p>
                          <p className={colors.textSecondary}>{lang === 'ar' ? 'الإنجاز' : 'Completion'}: {data.completion}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '5px',
                    color: 'var(--color-text-primary)'
                  }}
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => (
                    <span style={{ color: 'var(--color-text-primary)', marginLeft: '16px' }}>
                      {value}
                    </span>
                  )}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className={`${patterns.section} p-6`}>
            <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'توزيع حالة الأدلة' : 'Evidence Status Distribution'}
            </h2>
            {statusDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={600}>
                <PieChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={130}
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={entry.color}
                        fillOpacity={0.3}
                        stroke={entry.color}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)'
                    }}
                    formatter={(value: any, name: any) => {
                      const item = statusDistributionData.find(d => d.name === name);
                      return [value, item?.displayName || name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '5px',
                      fontSize: '14px',
                      color: 'var(--color-text-primary)'
                    }}
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => {
                      const item = statusDistributionData.find(d => d.name === value);
                      return (
                        <span style={{ color: 'var(--color-text-primary)', marginLeft: '16px' }}>
                          {` ${item?.displayName || value}`}
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText className={`w-12 h-12 ${colors.textSecondary} mx-auto mb-3`} />
                  <p className={`${colors.textSecondary} font-medium`}>
                    {lang === 'ar' ? 'لا توجد بيانات أدلة' : 'No evidence data available'}
                  </p>
                  <p className={`${colors.textTertiary} text-sm mt-2`}>
                    {lang === 'ar' ? 'قم برفع الأدلة لعرض التوزيع' : 'Upload evidence to see distribution'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`${patterns.section} p-6 mb-8`}>
          <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
            {lang === 'ar' ? 'مقارنة الأقسام التفصيلية' : 'Detailed Section Comparison'}
          </h2>
          <ResponsiveContainer width="100%" height={600}>
            <BarChart
              data={sectionData}
              margin={{ top: 30, right: 40, left: 40, bottom: 20 }}
              barGap={8}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="5 5" stroke="#9CA3AF" strokeOpacity={0.3} />
              <XAxis
                dataKey="section"
                angle={-45}
                textAnchor="end"
                height={180}
                tick={{ fill: 'currentColor', fontSize: 11, dy: 40, dx: -8 }}
                className={colors.textPrimary}
                interval={0}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                domain={[0, 5]}
                tick={{ fill: 'currentColor', fontSize: 10 }}
                className={colors.textSecondary}
                label={{
                  value: lang === 'ar' ? 'مستوى النضج' : 'Maturity Level',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: 'currentColor', textAnchor: 'middle' }
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fill: 'currentColor', fontSize: 10 }}
                className={colors.textSecondary}
                label={{
                  value: lang === 'ar' ? 'نسبة الإنجاز (%)' : 'Completion (%)',
                  angle: 90,
                  position: 'insideRight',
                  style: { fill: 'currentColor', textAnchor: 'middle' }
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)'
                }}
                content={({ payload }) => {
                  if (payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className={`${colors.bgSecondary} p-4 rounded-lg shadow-xl border-2 ${colors.border}`}>
                        <p className={`font-bold ${colors.textPrimary} mb-3 text-base`}>{data.section}</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors.primary}`}></div>
                            <p className={colors.textSecondary}>
                              {lang === 'ar' ? 'مستوى النضج' : 'Maturity'}: <span className="font-semibold">{data.current.toFixed(2)}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-600 dark:bg-green-400"></div>
                            <p className={colors.textSecondary}>
                              {lang === 'ar' ? 'نسبة الإنجاز' : 'Completion'}: <span className="font-semibold">{data.completion}%</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                            <p className={colors.textSecondary}>
                              {lang === 'ar' ? 'عدد المتطلبات' : 'Requirements'}: <span className="font-semibold">{data.requirements}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '5px', color: 'var(--color-text-primary)' }}
                iconType="circle"
                iconSize={10}
                formatter={(value) => (
                  <span style={{ color: 'var(--color-text-primary)', marginLeft: '16px' }}>
                    {` ${value}`}
                  </span>
                )}
              />
              <Bar
                yAxisId="left"
                dataKey="current"
                fill="rgb(var(--color-primary))"
                fillOpacity={0.3}
                stroke="rgb(var(--color-primary))"
                strokeWidth={2}
                name={lang === 'ar' ? ' مستوى النضج' : ' Maturity Level'}
                radius={[8, 8, 0, 0]}
                activeBar={{ fillOpacity: 0.5 }}
              />
              <Bar
                yAxisId="right"
                dataKey="completion"
                fill="#10B981"
                fillOpacity={0.3}
                stroke="#10B981"
                strokeWidth={2}
                name={lang === 'ar' ? ' نسبة الإنجاز' : ' Completion %'}
                radius={[8, 8, 0, 0]}
                activeBar={{ fillOpacity: 0.5 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Engagement Section */}
        <div className={`${patterns.section} p-6 mb-8`}>
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${colors.textPrimary}`}>
            <Layers className={colors.primary} size={24} />
            {lang === 'ar' ? 'مساهمة المستخدمين' : 'User Engagement'}
          </h2>
          <div className="overflow-x-auto">
            <table className={`w-full ${colors.textPrimary}`}>
              <thead>
                <tr className={`border-b-2 ${colors.border}`}>
                  <th className={`px-4 py-3 text-${lang === 'ar' ? 'right' : 'left'} font-semibold`}>
                    {lang === 'ar' ? 'المستخدم' : 'User'}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    {lang === 'ar' ? 'المتطلبات المسندة' : 'Assigned Requirements'}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    {lang === 'ar' ? 'المستندات المعتمدة' : 'Approved Documents'}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    {lang === 'ar' ? 'إجمالي الرفوعات' : 'Total Uploads'}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    {lang === 'ar' ? 'المستندات المرفوضة' : 'Rejected Documents'}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    {lang === 'ar' ? 'التعليقات' : 'Comments'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {userEngagement.map((user, index) => (
                  <tr
                    key={user.user_id}
                    className={`border-b ${colors.border} ${index % 2 === 0 ? colors.bgSecondary : colors.bgPrimary} hover:${colors.bgHover} transition`}
                  >
                    <td className={`px-4 py-3 font-medium text-${lang === 'ar' ? 'right' : 'left'}`}>
                      <div>{lang === 'ar' ? user.full_name_ar || user.username : user.full_name_en || user.username}</div>
                      <div className={`text-xs ${colors.textSecondary}`}>@{user.username}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold">
                        {user.assigned_requirements}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold">
                        {user.approved_documents}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold">
                        {user.total_uploads}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold">
                        {user.rejected_documents}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-semibold">
                        {user.total_comments}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {userEngagement.length === 0 && (
              <div className={`text-center py-8 ${colors.textSecondary}`}>
                {lang === 'ar' ? 'لا توجد بيانات مساهمة المستخدمين' : 'No user engagement data available'}
              </div>
            )}
          </div>
        </div>

        <div className={`${patterns.section} p-6 mb-8`}>
          <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
            {lang === 'ar' ? 'تفاصيل الأقسام' : 'Section Details'}
          </h2>
          <div className="space-y-4">
            {sections.map(section => {
              const sectionReqs = requirements.filter(r => r.section === section);
              const isExpanded = expandedSections.includes(section);

              return (
                <div key={section} className={`border ${colors.border} rounded-lg overflow-hidden`}>
                  <button
                    onClick={() => toggleSection(section)}
                    className={`w-full px-6 py-4 ${colors.bgPrimary} ${colors.bgHover} transition flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-4">
                      <h3 className={`text-lg font-semibold ${colors.textPrimary}`}>
                        {section}
                      </h3>
                      <span className={`text-sm ${colors.textSecondary}`}>
                        ({sectionReqs.length} {lang === 'ar' ? 'متطلبات' : 'requirements'})
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className={colors.textSecondary} /> : <ChevronDown size={20} className={colors.textSecondary} />}
                  </button>
                  {isExpanded && (
                    <div className={`p-6 ${colors.bgSecondary}`}>
                      <div className="space-y-3">
                        {sectionReqs.map(req => {
                          const reqEvidence = evidence.filter(e => e.requirement_id === req.requirement_db_id);
                          const approvedCount = reqEvidence.filter(e => e.status === 'approved').length;
                          const rejectedCount = reqEvidence.filter(e => e.status === 'rejected').length;
                          const underRevisionCount = reqEvidence.filter(e => e.status === 'submitted' || e.status === 'confirmed').length;
                          const totalCount = reqEvidence.length;

                          return (
                            <div key={req.id} className={`flex items-center justify-between p-3 border ${colors.border} rounded ${colors.bgHover}`}>
                              <div className="flex-1">
                                <div className={`font-medium ${colors.textPrimary}`}>{req.id}</div>
                                <div className={`text-sm ${colors.textSecondary} mt-1`}>
                                  {lang === 'ar' ? req.question : req.question_en || req.question}
                                </div>
                                <div className="flex gap-3 mt-2 text-xs">
                                  <span className="text-green-600 dark:text-green-400">
                                    {lang === 'ar' ? 'معتمد' : 'Approved'}: {approvedCount}
                                  </span>
                                  <span className="text-yellow-600 dark:text-yellow-400">
                                    {lang === 'ar' ? 'قيد المراجعة' : 'Under Revision'}: {underRevisionCount}
                                  </span>
                                  <span className="text-red-600 dark:text-red-400">
                                    {lang === 'ar' ? 'مرفوض' : 'Rejected'}: {rejectedCount}
                                  </span>
                                  <span className={colors.textTertiary}>
                                    {lang === 'ar' ? 'الإجمالي' : 'Total'}: {totalCount}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <LevelIndicator currentLevel={req.current_level} />
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

        <div className={`${patterns.section} p-6`}>
          <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
            {lang === 'ar' ? 'تصدير التقارير' : 'Export Reports'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg transition border-2 border-red-200 dark:border-red-800"
            >
              <FileText size={24} />
              <div className="text-left">
                <div className="font-semibold">{lang === 'ar' ? 'تقرير PDF' : 'PDF Report'}</div>
                <div className="text-sm">{lang === 'ar' ? 'تقرير شامل تنفيذي' : 'Comprehensive Executive Report'}</div>
              </div>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg transition border-2 border-green-200 dark:border-green-800"
            >
              <FileSpreadsheet size={24} />
              <div className="text-left">
                <div className="font-semibold">{lang === 'ar' ? 'ملف Excel' : 'Excel File'}</div>
                <div className="text-sm">{lang === 'ar' ? 'بيانات تفصيلية' : 'Detailed Data'}</div>
              </div>
            </button>
            <button
              onClick={() => handleExport('ppt')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg transition border-2 border-orange-200 dark:border-orange-800"
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
