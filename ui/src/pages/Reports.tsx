import { useState, useEffect, useRef } from 'react';
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
import html2canvas from 'html2canvas';
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

  // Refs for chart capture
  const radarChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);
  const progressChartRef = useRef<HTMLDivElement>(null);
  const userEngagementTableRef = useRef<HTMLDivElement>(null);

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
          sub_domain: req.sub_domain_ar, // Include sub_domain (المعيار) for domain grouping
          current_level: assignment?.current_level || 0,
          evidence_description_ar: req.evidence_description_ar,
          evidence_description_en: req.evidence_description_en,
          answer_status: req.answer_status, // Add answer_status for completion tracking
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
        // Capture charts as images for PDF
        const chartImages: PDFExportData['chartImages'] = {};

        if (radarChartRef.current) {
          const canvas = await html2canvas(radarChartRef.current, { backgroundColor: '#ffffff', scale: 2 });
          chartImages.radarChart = canvas.toDataURL('image/png');
        }

        if (pieChartRef.current) {
          const canvas = await html2canvas(pieChartRef.current, { backgroundColor: '#ffffff', scale: 2 });
          chartImages.pieChart = canvas.toDataURL('image/png');
        }

        if (progressChartRef.current) {
          const canvas = await html2canvas(progressChartRef.current, { backgroundColor: '#ffffff', scale: 2 });
          chartImages.progressChart = canvas.toDataURL('image/png');
        }

        if (userEngagementTableRef.current) {
          const canvas = await html2canvas(userEngagementTableRef.current, { backgroundColor: '#ffffff', scale: 2 });
          chartImages.userEngagementTable = canvas.toDataURL('image/png');
        }

        exportData.chartImages = chartImages;
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

    // For ETARI: Calculate completion based on answer_status (requirements with approved answers)
    // For NAII: Use maturity-based completion
    let completion;
    if (currentIndex?.index_type === 'ETARI') {
      // Count requirements with approved answers
      const approvedReqs = sectionReqs.filter(r => r.answer_status === 'approved');
      completion = sectionReqs.length > 0
        ? Math.round((approvedReqs.length / sectionReqs.length) * 100)
        : 0;
    } else {
      // NAII: Use maturity-based completion
      completion = calculateSectionCompletion(requirements, evidence, section);
    }

    const data = {
      section: section, // Section name from Excel (main_area_ar)
      current: Number(maturity.toFixed(2)), // Original maturity (0-5)
      maturityScaled: Number((maturity * 20).toFixed(1)), // Scaled to 0-100 for radar
      fullMark: 5,
      requirements: sectionReqs.length,
      completion: Number(completion.toFixed(1))
    };

    console.log('Section:', section, 'Maturity:', maturity, 'MaturityScaled:', data.maturityScaled, 'Completion:', completion);
    return data;
  });

  // Create domain-level data for enhanced bar chart
  // Group requirements by section and domain (sub_domain_ar)
  const domainData: any[] = [];
  sections.forEach(section => {
    const sectionReqs = requirements.filter(r => r.section === section);
    // Get unique domains within this section - FIX: filter before Set
    const domains = Array.from(new Set(
      sectionReqs
        .map(r => r.sub_domain)
        .filter(d => d && d.trim() !== '')
    )).sort();

    console.log(`Section: ${section}, Domains found:`, domains.length, domains);

    domains.forEach(domain => {
      const domainReqs = sectionReqs.filter(r => r.sub_domain === domain);

      // Calculate completion for this domain
      let domainCompletion;
      if (currentIndex?.index_type === 'ETARI') {
        const approvedReqs = domainReqs.filter(r => r.answer_status === 'approved');
        domainCompletion = domainReqs.length > 0
          ? Math.round((approvedReqs.length / domainReqs.length) * 100)
          : 0;
      } else {
        // NAII: Use maturity-based completion
        const domainEvidence = evidence.filter(e =>
          domainReqs.some(r => r.requirement_db_id === e.requirement_id)
        );
        domainCompletion = calculateSectionCompletion(domainReqs, domainEvidence, section);
      }

      const approvedCount = domainReqs.filter(r => r.answer_status === 'approved').length;

      // Count evidence for this domain
      const domainEvidence = evidence.filter(e =>
        domainReqs.some(r => r.requirement_db_id === e.requirement_id)
      );

      domainData.push({
        section: section,
        domain: domain,
        completion: Number(domainCompletion.toFixed(1)),
        totalRequirements: domainReqs.length,
        approvedRequirements: approvedCount,
        evidenceCount: domainEvidence.length,
        // Use section+domain as unique key for grouping
        sectionDomainKey: `${section} - ${domain}`
      });
    });
  });

  console.log('Total domainData entries:', domainData.length);
  console.log('Domain data sample:', domainData.slice(0, 3));

  // Generate dynamic colors for sections
  const generateSectionColors = (sections: string[]) => {
    const colorPalette = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Orange
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F97316', // Orange-Red
      '#6366F1', // Indigo
    ];

    const sectionColors: { [key: string]: string } = {};
    sections.forEach((section, index) => {
      sectionColors[section] = colorPalette[index % colorPalette.length];
    });
    return sectionColors;
  };

  const sectionColors = generateSectionColors(sections);

  // Assign colors to domain data
  const coloredDomainData = domainData.map(item => ({
    ...item,
    barColor: sectionColors[item.section] || '#10B981'
  }));

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
            {currentIndex.end_date && (() => {
              const endDate = new Date(currentIndex.end_date);
              const today = new Date();
              const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              if (daysRemaining > 0) {
                return (
                  <p className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg font-medium">
                    <span>{lang === 'ar' ? '⏱ الوقت المتبقي:' : '⏱ Time Remaining:'}</span>
                    <span className="font-bold">{daysRemaining} {lang === 'ar' ? 'يوم' : daysRemaining === 1 ? 'day' : 'days'}</span>
                  </p>
                );
              } else if (daysRemaining === 0) {
                return (
                  <p className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg font-medium">
                    <span>{lang === 'ar' ? '⏱ ينتهي اليوم!' : '⏱ Ends Today!'}</span>
                  </p>
                );
              } else {
                return (
                  <p className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-medium">
                    <span>{lang === 'ar' ? '⏱ انتهى منذ:' : '⏱ Expired:'}</span>
                    <span className="font-bold">{Math.abs(daysRemaining)} {lang === 'ar' ? 'يوم' : Math.abs(daysRemaining) === 1 ? 'day' : 'days'}</span>
                  </p>
                );
              }
            })()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Show Overall Maturity Level for NAII, Requirements Overview for ETARI */}
          {currentIndex?.index_type === 'ETARI' ? (
            <div className={`${patterns.section} p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'نظرة عامة على المتطلبات' : 'Requirements Overview'}
              </h3>
              <div className="space-y-4">
                <div className={`flex justify-between items-center py-2 border-b ${colors.border}`}>
                  <span className={colors.textSecondary}>{lang === 'ar' ? 'إجمالي المتطلبات' : 'Total Requirements'}</span>
                  <span className={`text-2xl font-bold ${colors.textPrimary}`}>
                    {requirements.length}
                  </span>
                </div>
                <div className={`flex justify-between items-center py-2 border-b ${colors.border}`}>
                  <span className={colors.textSecondary}>{lang === 'ar' ? 'متطلبات بأدلة' : 'With Evidence Desc'}</span>
                  <span className={`text-2xl font-bold text-blue-600 dark:text-blue-400`}>
                    {requirements.filter(r => {
                      // Check if requirement has evidence description
                      return (r.evidence_description_ar && r.evidence_description_ar.trim() !== '') ||
                             (r.evidence_description_en && r.evidence_description_en.trim() !== '');
                    }).length}
                  </span>
                </div>
                <div className={`flex justify-between items-center py-2`}>
                  <span className={colors.textSecondary}>{lang === 'ar' ? 'نسبة الإنجاز' : 'Completion Rate'}</span>
                  <span className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
                    {sectionData.length > 0
                      ? Math.round(sectionData.reduce((sum, s) => sum + s.completion, 0) / sectionData.length)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className={`${patterns.section} p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'مستوى النضج الإجمالي' : 'Overall Maturity Level'}
              </h3>
              <div className="flex justify-center">
                <MaturityGauge
                  value={overallScore}
                  indexType={currentIndex?.index_type || 'NAII'}
                  lang={lang}
                />
              </div>
            </div>
          )}

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

          <div ref={progressChartRef} className={`${patterns.section} p-6`}>
            <h3 className={`text-lg font-semibold mb-6 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تقدم المشروع' : 'Project Progress'}
            </h3>

            <div className="space-y-5">
              {/* Maturity Progress - Only show for NAII (not ETARI) */}
              {currentIndex?.index_type !== 'ETARI' && (
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
              )}

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
          <div ref={radarChartRef} className={`${patterns.section} p-6`}>
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
                {/* Only show maturity radar for NAII (not ETARI) */}
                {currentIndex?.index_type !== 'ETARI' && (
                  <Radar
                    name={lang === 'ar' ? ' مستوى النضج' : ' Maturity Level'}
                    dataKey="maturityScaled"
                    stroke="rgb(var(--color-primary))"
                    strokeWidth={2}
                    fill="rgb(var(--color-primary))"
                    fillOpacity={0.3}
                  />
                )}
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
                          {/* Only show maturity for NAII (not ETARI) */}
                          {currentIndex?.index_type !== 'ETARI' && (
                            <p className={colors.textSecondary}>{lang === 'ar' ? 'مستوى النضج' : 'Maturity'}: {data.current.toFixed(2)} / 5 ({data.maturityScaled.toFixed(0)}%)</p>
                          )}
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

          <div ref={pieChartRef} className={`${patterns.section} p-6`}>
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
          <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary} flex items-center gap-2`}>
            {lang === 'ar' ? 'مقارنة الأقسام التفصيلية (حسب المعيار)' : 'Detailed Section Comparison (By Domain)'}
            <span className={`text-sm font-normal ${colors.textSecondary}`}>
              {lang === 'ar' ? '(مرر على الأعمدة لرؤية التفاصيل)' : '(Hover to see details)'}
            </span>
          </h2>
          {coloredDomainData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(800, coloredDomainData.length * 60 + sections.length * 30)}>
              <BarChart
                data={coloredDomainData}
                margin={{ top: 30, right: 20, left: 5, bottom: 20 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className={colors.textSecondary}
                />
                <YAxis
                  type="category"
                  dataKey="domain"
                  width={320}
                  tick={(props: any) => {
                    const { x, y, payload, index } = props;
                    const text = payload.value || '';
                    const maxLength = 40;
                    const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

                    // Get section for grouping visual
                    const item = coloredDomainData[index];
                    const prevItem = index > 0 ? coloredDomainData[index - 1] : null;
                    const isFirstInSection = !prevItem || prevItem.section !== item?.section;

                    return (
                      <g>
                        {isFirstInSection && item && (
                          <>
                            <line
                              x1={x}
                              y1={y - 35}
                              x2={x + 320}
                              y2={y - 35}
                              stroke={item.barColor}
                              strokeWidth={2}
                              opacity={0.6}
                            />
                            <text
                              x={x + 2}
                              y={y - 18}
                              textAnchor="start"
                              fill={item.barColor}
                              fontSize={14}
                              fontWeight="bold"
                            >
                              {item.section}
                            </text>
                          </>
                        )}
                        <text
                          x={x + 2}
                          y={y}
                          dy={4}
                          textAnchor="start"
                          fill="currentColor"
                          fontSize={11}
                          className={colors.textSecondary}
                        >
                          {displayText}
                        </text>
                      </g>
                    );
                  }}
                  interval={0}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '2px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)'
                  }}
                  content={({ payload }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className={`${colors.bgSecondary} p-4 rounded-lg shadow-xl border-2 ${colors.border}`}>
                          <div className="mb-3">
                            <p className={`font-bold ${colors.textPrimary} text-base mb-1`}>
                              {data.section}
                            </p>
                            <p className={`text-sm ${colors.textSecondary}`}>
                              {lang === 'ar' ? 'المعيار: ' : 'Domain: '}
                              <span className="font-semibold">{data.domain}</span>
                            </p>
                          </div>
                          <div className="space-y-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                            <div className="flex items-center justify-between gap-3">
                              <p className={colors.textSecondary}>
                                {lang === 'ar' ? 'نسبة الإنجاز:' : 'Completion:'}
                              </p>
                              <span className={`font-bold text-lg ${
                                data.completion >= 75 ? 'text-green-600 dark:text-green-400' :
                                data.completion >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {data.completion}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <p className={colors.textSecondary}>
                                {lang === 'ar' ? 'الإجابات المعتمدة:' : 'Approved:'}
                              </p>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {data.approvedRequirements} / {data.totalRequirements}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <p className={colors.textSecondary}>
                                {lang === 'ar' ? 'إجمالي المتطلبات:' : 'Total Requirements:'}
                              </p>
                              <span className="font-semibold">
                                {data.totalRequirements}
                              </span>
                            </div>
                            {data.evidenceCount > 0 && (
                              <div className="flex items-center justify-between gap-3">
                                <p className={colors.textSecondary}>
                                  {lang === 'ar' ? 'عدد الأدلة:' : 'Evidence Count:'}
                                </p>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {data.evidenceCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="completion"
                  fillOpacity={0.5}
                  strokeWidth={2}
                  radius={[0, 8, 8, 0]}
                  minPointSize={3}
                  barSize={35}
                  label={{
                    position: 'right',
                    fill: 'currentColor',
                    fontSize: 12,
                    formatter: (value: number) => value > 0 ? `${value}%` : ''
                  }}
                >
                  {coloredDomainData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.barColor} stroke={entry.barColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Layers className={`w-12 h-12 ${colors.textSecondary} mx-auto mb-3`} />
                <p className={`${colors.textSecondary} font-medium`}>
                  {lang === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User Engagement Section */}
        <div ref={userEngagementTableRef} className={`${patterns.section} p-6 mb-8`}>
          <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${colors.textPrimary}`}>
            <Layers className={colors.primary} size={24} />
            {lang === 'ar' ? 'مساهمة المستخدمين' : 'User Engagement'}
          </h2>
          {userEngagement.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b-2 ${colors.border}`}>
                    <th className={`text-${lang === 'ar' ? 'right' : 'left'} py-3 px-4 font-semibold ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'المستخدم' : 'User'}
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'المتطلبات المسندة' : 'Assigned Reqs'}
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'الرفوعات' : 'Uploads'}
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'التعليقات' : 'Comments'}
                    </th>
                    <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'وثائق راجعها' : 'Docs Reviewed'}
                    </th>
                    <th className={`text-${lang === 'ar' ? 'left' : 'right'} py-3 px-4 font-semibold ${colors.textPrimary}`}>
                      {lang === 'ar' ? 'معدل التأكيد' : 'Confirm Rate'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {userEngagement.map((user, index) => {
                    const successRate = user.total_uploads > 0
                      ? ((user.approved_documents / user.total_uploads) * 100)
                      : 0;
                    const completionRate = user.assigned_requirements > 0
                      ? ((user.approved_documents / user.assigned_requirements) * 100)
                      : 0;

                    return (
                      <tr
                        key={user.username}
                        className={`border-b ${colors.border} ${colors.hover} transition-colors`}
                      >
                        <td className={`py-4 px-4`}>
                          <div>
                            <div className={`font-medium ${colors.textPrimary}`}>
                              {lang === 'ar' ? user.full_name_ar || user.username : user.full_name_en || user.username}
                            </div>
                            <div className={`text-sm ${colors.textSecondary}`}>
                              @{user.username}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${colors.bgSecondary} ${colors.textPrimary} font-semibold`}>
                            {user.assigned_requirements}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold">
                            {user.total_uploads}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-semibold">
                            {user.total_comments}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold">
                            {user.documents_reviewed || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={`flex-1 h-2 ${colors.bgSecondary} rounded-full overflow-hidden`}>
                                <div
                                  className={`h-full transition-all ${
                                    successRate >= 75
                                      ? 'bg-green-500'
                                      : successRate >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(successRate, 100)}%` }}
                                />
                              </div>
                              <span className={`text-sm font-semibold ${colors.textPrimary} w-12 text-right`}>
                                {successRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Explanatory Caption */}
              <div className={`mt-4 p-4 rounded-lg ${colors.bgPrimary} border ${colors.border}`}>
                <p className={`text-sm ${colors.textSecondary} leading-relaxed`}>
                  {lang === 'ar' ? (
                    <>
                      <strong className={colors.textPrimary}>معدل التأكيد:</strong> يُحسب بقسمة عدد الوثائق المعتمدة على إجمالي عدد الرفوعات ثم الضرب في 100%.
                    </>
                  ) : (
                    <>
                      <strong className={colors.textPrimary}>Confirm Rate:</strong> Calculated as (Approved Documents ÷ Total Uploads) × 100%.
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className={`text-center py-12 ${colors.textSecondary}`}>
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{lang === 'ar' ? 'لا توجد بيانات مساهمة المستخدمين' : 'No user engagement data available'}</p>
            </div>
          )}
        </div>

        <div className={`${patterns.section} p-6 mb-8`}>
          <h2 className={`text-xl font-bold mb-4 ${colors.textPrimary}`}>
            {lang === 'ar' ? 'تفاصيل الأقسام والمعايير' : 'Section and Domain Details'}
          </h2>
          <div className="space-y-4">
            {sections.map(section => {
              const sectionReqs = requirements.filter(r => r.section === section);
              const isExpanded = expandedSections.includes(section);

              // Group requirements by domain (sub_domain) within this section
              const domains = Array.from(new Set(sectionReqs.map(r => r.sub_domain || ''))).filter(d => d).sort();

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
                        ({sectionReqs.length} {lang === 'ar' ? 'متطلبات' : 'requirements'} • {domains.length} {lang === 'ar' ? 'معايير' : 'domains'})
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className={colors.textSecondary} /> : <ChevronDown size={20} className={colors.textSecondary} />}
                  </button>
                  {isExpanded && (
                    <div className={`p-6 ${colors.bgSecondary}`}>
                      <div className="space-y-6">
                        {domains.map(domain => {
                          const domainReqs = sectionReqs.filter(r => r.sub_domain === domain);
                          const approvedDomainReqs = domainReqs.filter(r => r.answer_status === 'approved');
                          const completionRate = domainReqs.length > 0
                            ? Math.round((approvedDomainReqs.length / domainReqs.length) * 100)
                            : 0;

                          return (
                            <div key={domain} className={`border ${colors.border} rounded-lg p-4 ${colors.bgPrimary}`}>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className={`text-md font-semibold ${colors.textPrimary}`}>
                                  {lang === 'ar' ? 'المعيار: ' : 'Domain: '}{domain}
                                </h4>
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm ${colors.textSecondary}`}>
                                    {approvedDomainReqs.length} / {domainReqs.length} {lang === 'ar' ? 'مكتملة' : 'completed'}
                                  </span>
                                  <span className={`text-sm font-bold ${
                                    completionRate >= 75 ? 'text-green-600 dark:text-green-400' :
                                    completionRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {completionRate}%
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {domainReqs.map(req => {
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
                                      {/* Show answer status badge for ETARI, LevelIndicator for NAII */}
                                      {currentIndex?.index_type === 'ETARI' ? (
                                        <div className="flex items-center gap-2">
                                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            req.answer_status === 'approved'
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                              : req.answer_status === 'pending_review'
                                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                              : req.answer_status === 'rejected'
                                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                              : req.answer_status === 'draft'
                                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                          }`}>
                                            {req.answer_status === 'approved'
                                              ? (lang === 'ar' ? 'معتمد' : 'Approved')
                                              : req.answer_status === 'pending_review'
                                              ? (lang === 'ar' ? 'قيد المراجعة' : 'Pending Review')
                                              : req.answer_status === 'rejected'
                                              ? (lang === 'ar' ? 'مرفوض' : 'Rejected')
                                              : req.answer_status === 'draft'
                                              ? (lang === 'ar' ? 'مسودة' : 'Draft')
                                              : (lang === 'ar' ? 'غير محدد' : 'Not Set')
                                            }
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-4">
                                          <LevelIndicator
                                            currentLevel={req.current_level}
                                            indexType={currentIndex?.index_type || 'NAII'}
                                            lang={lang}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
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
