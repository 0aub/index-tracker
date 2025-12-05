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
import { FileText, FileSpreadsheet, Presentation, ChevronDown, ChevronUp, AlertCircle, Layers, Users, ClipboardList, FileCheck, Clock, TrendingUp, PieChart as PieChartIcon, BarChart3, FolderOpen, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import MaturityGauge from '../components/MaturityGauge';
import LevelIndicator from '../components/LevelIndicator';
import ContributionBubbleCloud from '../components/ContributionBubbleCloud';
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
import { useAuthStore } from '../stores/authStore';
import { api, Assignment } from '../services/api';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { exportToPDF, exportToExcel, exportToPowerPoint, PDFExportData } from '../utils/exportReports';

const Reports = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const { currentIndex } = useIndexStore();
  const { user } = useAuthStore();
  const lang = language;

  // Access control - only admin or owner can view reports
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = currentIndex?.user_role?.toLowerCase() === 'owner';
  const canViewReports = isAdmin || isOwner;

  const [requirements, setRequirements] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [evidenceStats, setEvidenceStats] = useState({
    approved: 0,
    rejected: 0,
    underRevision: 0,
    draft: 0,
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
        draft: indexEvidence.filter(e => e.status === 'draft').length,
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
          section: req.main_area_ar, // القدرة (Main Area)
          element: req.element_ar, // العنصر (Element)
          criterion: req.sub_domain_ar, // المعيار (Criteria) - THIS is what we group by
          current_level: assignment?.current_level || 0,
          evidence_description_ar: req.evidence_description_ar,
          evidence_description_en: req.evidence_description_en,
          answer_status: req.answer_status, // Add answer_status for completion tracking
        };
      });

      console.log('Total evidence loaded:', indexEvidence.length);
      console.log('Evidence sample:', indexEvidence.slice(0, 3));
      console.log('Requirements sample with db_id:', transformedRequirements.slice(0, 3).map(r => ({ id: r.id, requirement_db_id: r.requirement_db_id })));

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

  // Access denied - only admin and owner can view reports
  if (!canViewReports) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'غير مصرح لك بالوصول' : 'Access Denied'}
            </h3>
            <p className={`${colors.textSecondary} mb-6`}>
              {lang === 'ar'
                ? 'صفحة التقارير متاحة فقط للمسؤولين والملاك'
                : 'Reports page is only accessible to Admins and Owners'}
            </p>
            <button
              onClick={() => navigate('/requirements')}
              className={`px-6 py-3 ${patterns.button}`}
            >
              {lang === 'ar' ? 'العودة للمتطلبات' : 'Go to Requirements'}
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
          <LoadingSpinner size="md" text={lang === 'ar' ? 'جاري تحميل التقارير...' : 'Loading reports...'} />
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
      // Count requirements with confirmed answers
      const confirmedReqs = sectionReqs.filter(r => r.answer_status === 'confirmed');
      completion = sectionReqs.length > 0
        ? Math.round((confirmedReqs.length / sectionReqs.length) * 100)
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
  // Group requirements by section and criterion (sub_domain_ar/المعيار)
  const domainData: any[] = [];
  sections.forEach(section => {
    const sectionReqs = requirements.filter(r => r.section === section);
    // Get unique criteria within this section - FIX: filter before Set
    const criteria = Array.from(new Set(
      sectionReqs
        .map(r => r.criterion)
        .filter(d => d && d.trim() !== '')
    )).sort();

    console.log(`Section: ${section}, Criteria found:`, criteria.length, criteria);

    criteria.forEach(criterion => {
      const domainReqs = sectionReqs.filter(r => r.criterion === criterion);

      // Calculate completion for this domain
      let domainCompletion;
      if (currentIndex?.index_type === 'ETARI') {
        const confirmedReqs = domainReqs.filter(r => r.answer_status === 'confirmed');
        domainCompletion = domainReqs.length > 0
          ? Math.round((confirmedReqs.length / domainReqs.length) * 100)
          : 0;
      } else {
        // NAII: Use maturity-based completion
        const domainEvidence = evidence.filter(e =>
          domainReqs.some(r => r.requirement_db_id === e.requirement_id)
        );
        domainCompletion = calculateSectionCompletion(domainReqs, domainEvidence, section);
      }

      const confirmedCount = domainReqs.filter(r => r.answer_status === 'confirmed').length;

      // Count evidence for this domain
      const domainEvidence = evidence.filter(e =>
        domainReqs.some(r => r.requirement_db_id === e.requirement_id)
      );

      domainData.push({
        section: section,
        domain: criterion,
        completion: Number(domainCompletion.toFixed(1)),
        totalRequirements: domainReqs.length,
        confirmedRequirements: confirmedCount,
        evidenceCount: domainEvidence.length,
        // Use section+criterion as unique key for grouping
        sectionDomainKey: `${section} - ${criterion}`
      });
    });
  });

  console.log('Total domainData entries:', domainData.length);
  console.log('Domain data sample:', domainData.slice(0, 3));

  // Sort domainData by section and then by domain
  domainData.sort((a, b) => {
    if (a.section !== b.section) {
      return a.section.localeCompare(b.section, 'ar');
    }
    return a.domain.localeCompare(b.domain, 'ar');
  });

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

  // Assign colors to domain data and add spacers before new sections
  const coloredDomainData: any[] = [];
  let lastSection = '';
  domainData.forEach((item, index) => {
    // Add spacer before new section (except first)
    if (item.section !== lastSection && lastSection !== '') {
      coloredDomainData.push({
        domain: '',
        section: item.section,
        completion: 0,
        isSpacer: true,
        barColor: 'transparent'
      });
    }
    coloredDomainData.push({
      ...item,
      barColor: sectionColors[item.section] || '#10B981',
      isSpacer: false
    });
    lastSection = item.section;
  });

  return (
    <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'تقارير المؤشر' : 'Index Reports'}
            </h1>
            <p className={`mt-2 text-sm sm:text-base ${colors.textSecondary}`}>
              {lang === 'ar'
                ? currentIndex.name_ar
                : currentIndex.name_en || currentIndex.name_ar}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Block 1: Requirements Status by Answer State - Split by Evidence Requirement */}
          {(() => {
            // Split requirements into two groups: with evidence required and without
            const reqsWithEvidence = requirements.filter(r => {
              return (r.evidence_description_ar && r.evidence_description_ar.trim() !== '') ||
                     (r.evidence_description_en && r.evidence_description_en.trim() !== '');
            });
            const reqsWithoutEvidence = requirements.filter(r => {
              return !((r.evidence_description_ar && r.evidence_description_ar.trim() !== '') ||
                     (r.evidence_description_en && r.evidence_description_en.trim() !== ''));
            });

            // Calculate confirmed for each group
            const confirmedWithEvidence = reqsWithEvidence.filter(r => r.answer_status === 'confirmed').length;
            const confirmedWithoutEvidence = reqsWithoutEvidence.filter(r => r.answer_status === 'confirmed').length;

            const totalReqs = requirements.length;

            return currentIndex?.index_type === 'ETARI' ? (
              <div className={`${patterns.section} p-4 sm:p-5`}>
                <h3 className={`text-base sm:text-lg font-semibold mb-3 flex items-center gap-2 ${colors.textPrimary}`}>
                  <ClipboardList className="text-blue-500" size={20} />
                  {lang === 'ar' ? 'حالة المتطلبات' : 'Requirements Status'}
                </h3>
                <div className="space-y-3">
                  {/* Big Total Number - Centered */}
                  <div className={`text-center py-3 rounded-lg ${colors.bgTertiary}`}>
                    <p className={`text-3xl font-bold ${colors.textPrimary}`}>{totalReqs}</p>
                    <p className={`text-xs ${colors.textSecondary}`}>
                      {lang === 'ar' ? 'إجمالي المتطلبات' : 'Total Requirements'}
                    </p>
                  </div>

                  {/* Requirements WITH Evidence */}
                  <div className={`p-2.5 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-medium text-orange-700 dark:text-orange-400`}>
                        {lang === 'ar' ? 'تحتاج أدلة' : 'Require Evidence'}
                      </span>
                      <span className={`text-sm font-bold text-orange-600 dark:text-orange-400`}>
                        {reqsWithEvidence.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={colors.textSecondary}>{lang === 'ar' ? 'مكتملة' : 'Completed'}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {confirmedWithEvidence}/{reqsWithEvidence.length} ({reqsWithEvidence.length > 0 ? Math.round((confirmedWithEvidence / reqsWithEvidence.length) * 100) : 0}%)
                      </span>
                    </div>
                    <div className={`w-full h-2 bg-orange-100 dark:bg-orange-900/30 rounded-full overflow-hidden`}>
                      <div
                        className="h-full bg-green-500 transition-all duration-700"
                        style={{ width: `${reqsWithEvidence.length > 0 ? (confirmedWithEvidence / reqsWithEvidence.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Requirements WITHOUT Evidence */}
                  <div className={`p-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-medium text-blue-700 dark:text-blue-400`}>
                        {lang === 'ar' ? 'بدون أدلة' : 'No Evidence Required'}
                      </span>
                      <span className={`text-sm font-bold text-blue-600 dark:text-blue-400`}>
                        {reqsWithoutEvidence.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={colors.textSecondary}>{lang === 'ar' ? 'مكتملة' : 'Completed'}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {confirmedWithoutEvidence}/{reqsWithoutEvidence.length} ({reqsWithoutEvidence.length > 0 ? Math.round((confirmedWithoutEvidence / reqsWithoutEvidence.length) * 100) : 0}%)
                      </span>
                    </div>
                    <div className={`w-full h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden`}>
                      <div
                        className="h-full bg-green-500 transition-all duration-700"
                        style={{ width: `${reqsWithoutEvidence.length > 0 ? (confirmedWithoutEvidence / reqsWithoutEvidence.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Overall Progress */}
                  <div className={`p-2.5 rounded-lg border ${colors.border} ${colors.bgTertiary}`}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-semibold ${colors.textPrimary}`}>{lang === 'ar' ? 'الإنجاز الكلي' : 'Overall Progress'}</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {totalReqs > 0 ? Math.round(((confirmedWithEvidence + confirmedWithoutEvidence) / totalReqs) * 100) : 0}%
                      </span>
                    </div>
                    <div className={`w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
                      <div
                        className="h-full bg-green-500 transition-all duration-700"
                        style={{ width: `${totalReqs > 0 ? ((confirmedWithEvidence + confirmedWithoutEvidence) / totalReqs) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`${patterns.section} p-4 sm:p-6`}>
                <h3 className={`text-base sm:text-lg font-semibold mb-4 flex items-center gap-2 ${colors.textPrimary}`}>
                  <TrendingUp className="text-green-500" size={20} />
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
            );
          })()}

          <div className={`${patterns.section} p-4 sm:p-6`}>
            <h3 className={`text-base sm:text-lg font-semibold mb-4 flex items-center gap-2 ${colors.textPrimary}`}>
              <FileCheck className="text-purple-500" size={20} />
              {lang === 'ar' ? 'إحصائيات الأدلة' : 'Evidence Statistics'}
            </h3>
            <div className="space-y-3">
              <div className={`flex justify-between items-center py-2 border-b ${colors.border}`}>
                <span className={colors.textSecondary}>{lang === 'ar' ? 'ملفات معتمدة' : 'Approved Files'}</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {evidenceStats.approved}
                </span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${colors.border}`}>
                <span className={colors.textSecondary}>{lang === 'ar' ? 'قيد المراجعة' : 'Under Revision'}</span>
                <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {evidenceStats.underRevision}
                </span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${colors.border}`}>
                <span className={colors.textSecondary}>{lang === 'ar' ? 'مسودات' : 'Drafts'}</span>
                <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
                  {evidenceStats.draft}
                </span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${colors.border}`}>
                <span className={colors.textSecondary}>{lang === 'ar' ? 'ملفات مرفوضة' : 'Rejected Files'}</span>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  {evidenceStats.rejected}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className={colors.textSecondary}>{lang === 'ar' ? 'إجمالي الملفات' : 'Total Files'}</span>
                <span className={`text-xl font-bold ${colors.textPrimary}`}>
                  {evidenceStats.total}
                </span>
              </div>
            </div>
          </div>

          <div ref={progressChartRef} className={`${patterns.section} p-4 sm:p-6`}>
            <h3 className={`text-base sm:text-lg font-semibold mb-4 flex items-center gap-2 ${colors.textPrimary}`}>
              <Clock className="text-orange-500" size={20} />
              {lang === 'ar' ? 'الجدول الزمني والتقدم' : 'Timeline & Progress'}
            </h3>

            {(() => {
              // Timeline calculations
              const startDate = currentIndex?.start_date ? new Date(currentIndex.start_date) : null;
              const endDate = currentIndex?.end_date ? new Date(currentIndex.end_date) : null;
              const now = new Date();

              let totalDays = 0;
              let elapsedDays = 0;
              let remainingDays = 0;
              let timeProgress = 0;

              if (startDate && endDate) {
                totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                elapsedDays = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                timeProgress = totalDays > 0 ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0;
              }

              // Work completion
              const totalCompleted = requirements.filter(r => r.answer_status === 'confirmed').length;
              const workProgress = requirements.length > 0 ? Math.round((totalCompleted / requirements.length) * 100) : 0;

              // Performance indicator: Are we on track?
              const performanceGap = workProgress - timeProgress;
              const isOnTrack = performanceGap >= 0;
              const isAhead = performanceGap > 10;
              const isBehind = performanceGap < -10;

              return (
                <div className="space-y-4">
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

                  {/* Time vs Work Progress Comparison */}
                  {startDate && endDate && (
                    <div className={`p-3 rounded-lg border ${colors.border}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-xs font-medium ${colors.textSecondary}`}>
                          {lang === 'ar' ? 'الوقت مقابل الإنجاز' : 'Time vs Work'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isAhead ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                          isBehind ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                        }`}>
                          {isAhead ? (lang === 'ar' ? 'متقدم' : 'Ahead') :
                           isBehind ? (lang === 'ar' ? 'متأخر' : 'Behind') :
                           (lang === 'ar' ? 'في الموعد' : 'On Track')}
                        </span>
                      </div>

                      {/* Time elapsed bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={colors.textTertiary}>{lang === 'ar' ? 'الوقت المنقضي' : 'Time Elapsed'}</span>
                          <span className="text-orange-600 dark:text-orange-400">{timeProgress}%</span>
                        </div>
                        <div className={`w-full h-2 ${colors.bgTertiary} rounded-full overflow-hidden`}>
                          <div className="h-full bg-orange-400 transition-all" style={{ width: `${timeProgress}%` }} />
                        </div>
                      </div>

                      {/* Work completed bar */}
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={colors.textTertiary}>{lang === 'ar' ? 'العمل المنجز' : 'Work Done'}</span>
                          <span className="text-green-600 dark:text-green-400">{workProgress}%</span>
                        </div>
                        <div className={`w-full h-2 ${colors.bgTertiary} rounded-full overflow-hidden`}>
                          <div className="h-full bg-green-500 transition-all" style={{ width: `${workProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Days remaining / Total days */}
                  {startDate && endDate && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`text-center p-2.5 rounded-lg ${colors.bgTertiary}`}>
                        <p className={`text-2xl font-bold ${remainingDays <= 7 ? 'text-red-500' : remainingDays <= 30 ? 'text-amber-500' : colors.textPrimary}`}>
                          {remainingDays}
                        </p>
                        <p className={`text-[10px] ${colors.textSecondary}`}>{lang === 'ar' ? 'يوم متبقي' : 'Days Left'}</p>
                      </div>
                      <div className={`text-center p-2.5 rounded-lg ${colors.bgTertiary}`}>
                        <p className={`text-2xl font-bold ${colors.textPrimary}`}>{totalDays}</p>
                        <p className={`text-[10px] ${colors.textSecondary}`}>{lang === 'ar' ? 'إجمالي الأيام' : 'Total Days'}</p>
                      </div>
                    </div>
                  )}

                  {/* Requirements to complete per day */}
                  {startDate && endDate && remainingDays > 0 && (
                    <div className={`flex items-center justify-between p-2 rounded border ${colors.border} text-xs`}>
                      <span className={colors.textSecondary}>{lang === 'ar' ? 'المطلوب يومياً' : 'Daily Target'}</span>
                      <span className={`font-bold ${isBehind ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {Math.ceil((requirements.length - totalCompleted) / remainingDays)} {lang === 'ar' ? 'متطلب' : 'reqs'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-8 mb-3 sm:mb-8">
          <div ref={radarChartRef} className={`${patterns.section} p-1.5 sm:p-6`}>
            <h2 className={`text-xs sm:text-xl font-bold mb-1 sm:mb-4 flex items-center gap-2 ${colors.textPrimary}`}>
              <Layers className="text-cyan-500 hidden sm:block" size={20} />
              {lang === 'ar' ? 'تحليل الأقسام' : 'Section Analysis'}
            </h2>
            <div className="h-[350px] sm:h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={sectionData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }} outerRadius="70%">
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
                    const offset = window.innerWidth < 640 ? 20 : 35;
                    const newX = x + Math.cos(angle) * offset;
                    const newY = y + Math.sin(angle) * offset;

                    return (
                      <text
                        x={newX}
                        y={newY}
                        textAnchor="middle"
                        fill="currentColor"
                        className={colors.textPrimary}
                        fontSize={window.innerWidth < 640 ? 10 : 12}
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
          </div>

          <div ref={pieChartRef} className={`${patterns.section} p-1.5 sm:p-6`}>
            <h2 className={`text-xs sm:text-xl font-bold mb-1 sm:mb-4 flex items-center gap-2 ${colors.textPrimary}`}>
              <PieChartIcon className="text-pink-500 hidden sm:block" size={20} />
              {lang === 'ar' ? 'توزيع حالة الأدلة' : 'Evidence Status'}
            </h2>
            {statusDistributionData.length > 0 ? (
              <div className="h-[350px] sm:h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="45%"
                    outerRadius="80%"
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
              </div>
            ) : (
              <div className="flex items-center justify-center h-[350px] sm:h-[450px]">
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

        <div className={`${patterns.section} p-1.5 sm:p-6 mb-3 sm:mb-8 overflow-x-auto`}>
          <h2 className={`text-xs sm:text-xl font-bold mb-1 sm:mb-4 ${colors.textPrimary} flex items-center gap-2`}>
            <BarChart3 className="text-teal-500 hidden sm:block" size={20} />
            {lang === 'ar' ? 'مقارنة الأقسام' : 'Section Comparison'}
          </h2>
          {coloredDomainData.length > 0 ? (
            <div className="min-w-[400px]">
            <ResponsiveContainer width="100%" height={Math.max(400, coloredDomainData.length * 40 + sections.length * 50)}>
              <BarChart
                data={coloredDomainData}
                margin={{ top: 10, right: 10, left: 2, bottom: 10 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                  className={colors.textSecondary}
                />
                <YAxis
                  type="category"
                  dataKey="domain"
                  width={220}
                  tick={(props: any) => {
                    const { x, y, payload, index } = props;
                    const item = coloredDomainData[index];

                    // If this is a spacer row, show section header
                    if (item?.isSpacer) {
                      return (
                        <g>
                          <line
                            x1={x}
                            y1={y}
                            x2={x + 420}
                            y2={y}
                            stroke={sectionColors[item.section] || '#10B981'}
                            strokeWidth={2}
                            opacity={0.6}
                          />
                          <text
                            x={x + 2}
                            y={y + 18}
                            textAnchor="start"
                            fill={sectionColors[item.section] || '#10B981'}
                            fontSize={14}
                            fontWeight="bold"
                          >
                            {item.section}
                          </text>
                        </g>
                      );
                    }

                    const text = payload.value || '';
                    const maxLength = 30;
                    const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

                    // Check if this is the first item (show section header above it)
                    const isFirstItem = index === 0 || (index === 1 && coloredDomainData[0]?.isSpacer);

                    return (
                      <g>
                        {isFirstItem && item && (
                          <>
                            <line
                              x1={x}
                              y1={y - 35}
                              x2={x + 420}
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
                          fontSize={12}
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
                                {lang === 'ar' ? 'الإجابات المؤكدة:' : 'Confirmed:'}
                              </p>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {data.confirmedRequirements} / {data.totalRequirements}
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
                  barSize={24}
                  label={{
                    position: 'right',
                    fill: 'currentColor',
                    fontSize: 11,
                    formatter: (value: number) => value > 0 ? `${value}%` : ''
                  }}
                >
                  {coloredDomainData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.barColor} stroke={entry.barColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
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

        {/* User Engagement Section - Categorized by Role */}
        <div ref={userEngagementTableRef} className={`${patterns.section} p-4 sm:p-6 mb-8`}>
          <h2 className={`text-lg sm:text-xl font-bold mb-6 flex items-center gap-2 ${colors.textPrimary}`}>
            <Users className="text-indigo-500" size={24} />
            {lang === 'ar' ? 'مساهمة المستخدمين' : 'User Engagement'}
          </h2>
          {(() => {
            // Filter out ADMIN users and categorize by index role
            const filteredUsers = userEngagement.filter(u => u.user_role !== 'ADMIN');
            const owners = filteredUsers.filter(u => u.index_role?.toUpperCase() === 'OWNER');
            const supervisors = filteredUsers.filter(u => u.index_role?.toUpperCase() === 'SUPERVISOR');
            const contributors = filteredUsers.filter(u => u.index_role?.toUpperCase() === 'CONTRIBUTOR');

            const roleLabels = {
              owner: { ar: 'المعتمدين', en: 'Owners' },
              supervisor: { ar: 'المدققين', en: 'Reviewers' },
              contributor: { ar: 'المساهمين', en: 'Contributors' }
            };

            const renderUserTable = (users: typeof userEngagement, role: 'owner' | 'supervisor' | 'contributor') => {
              if (users.length === 0) return null;

              const isContributor = role === 'contributor';

              return (
                <div className="mb-6 sm:mb-8">
                  <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${colors.textPrimary} flex items-center gap-2`}>
                    <span className={`w-3 h-3 rounded-full ${
                      role === 'owner' ? 'bg-purple-500' :
                      role === 'supervisor' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></span>
                    {lang === 'ar' ? roleLabels[role].ar : roleLabels[role].en}
                    <span className={`text-sm font-normal ${colors.textSecondary}`}>({users.length})</span>
                  </h3>
                  <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                    <table className="w-full min-w-[800px] sm:min-w-0">
                      <thead>
                        <tr className={`border-b-2 ${colors.border}`}>
                          <th className={`text-${lang === 'ar' ? 'right' : 'left'} py-3 px-4 font-semibold ${colors.textPrimary}`}>
                            {lang === 'ar' ? 'المستخدم' : 'User'}
                          </th>
                          <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                            {lang === 'ar' ? 'المتطلبات المسندة' : 'Assigned'}
                          </th>
                          <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                            {lang === 'ar' ? 'المرفقات' : 'Attachments'}
                          </th>
                          <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                            {lang === 'ar' ? 'المسودات' : 'Drafts'}
                          </th>
                          <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                            {lang === 'ar' ? 'قيد المراجعة' : 'Pending'}
                          </th>
                          {!isContributor && (
                            <>
                              <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                                {lang === 'ar' ? 'راجعها' : 'Reviewed'}
                              </th>
                              <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                                {lang === 'ar' ? 'قبول' : 'Approved'}
                              </th>
                              <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                                {lang === 'ar' ? 'رفض' : 'Rejected'}
                              </th>
                            </>
                          )}
                          <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                            {lang === 'ar' ? 'المهام المنجزة' : 'Tasks Done'}
                          </th>
                          <th className={`text-center py-3 px-4 font-semibold ${colors.textPrimary}`}>
                            {lang === 'ar' ? 'التعليقات' : 'Comments'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
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
                              <span className={`inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg ${colors.bgSecondary} ${colors.textPrimary} font-semibold`}>
                                {user.assigned_requirements}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold">
                                {user.total_uploads}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
                                {user.draft_documents || 0}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-semibold">
                                {user.submitted_documents || 0}
                              </span>
                            </td>
                            {!isContributor && (
                              <>
                                <td className="py-4 px-4 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold">
                                    {user.documents_reviewed || 0}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold">
                                    {user.approved_documents || 0}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold">
                                    {user.rejected_documents || 0}
                                  </span>
                                </td>
                              </>
                            )}
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-semibold">
                                {user.checklist_items_completed || 0}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-semibold">
                                {user.total_comments}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            };

            return filteredUsers.length > 0 ? (
              <div>
                {renderUserTable(owners, 'owner')}
                {renderUserTable(supervisors, 'supervisor')}
                {renderUserTable(contributors, 'contributor')}

                {/* Legend/Explanation */}
                <div className={`mt-4 p-4 rounded-lg ${colors.bgPrimary} border ${colors.border}`}>
                  <p className={`text-sm ${colors.textSecondary} leading-relaxed`}>
                    {lang === 'ar' ? (
                      <>
                        <strong className={colors.textPrimary}>ملاحظة:</strong> المعتمدين والمدققين يمكنهم مراجعة وقبول أو رفض المرفقات. المساهمين يمكنهم رفع المرفقات وإضافة التعليقات فقط.
                      </>
                    ) : (
                      <>
                        <strong className={colors.textPrimary}>Note:</strong> Owners and Reviewers can review and approve/reject attachments. Contributors can only upload attachments and add comments.
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
            );
          })()}
        </div>

        {/* Team Contribution Bubble Cloud - Placed after User Engagement table */}
        {userEngagement.length > 0 && (
          <div className={`${patterns.section} p-4 sm:p-6 mb-8`}>
            <h2 className={`text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 ${colors.textPrimary}`}>
              <TrendingUp className="text-blue-500" size={24} />
              {lang === 'ar' ? 'مساهمة الفريق' : 'Team Contribution'}
            </h2>
            <ContributionBubbleCloud userEngagement={userEngagement} />
          </div>
        )}

        <div className={`${patterns.section} p-4 sm:p-6 mb-8`}>
          <h2 className={`text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 ${colors.textPrimary}`}>
            <FolderOpen className="text-amber-500" size={24} />
            {lang === 'ar' ? 'تفاصيل الأقسام والمعايير' : 'Section and Domain Details'}
          </h2>
          <div className="space-y-4">
            {sections.map(section => {
              const sectionReqs = requirements.filter(r => r.section === section);
              const isExpanded = expandedSections.includes(section);

              // Group requirements by criterion (element_ar - المعيار) within this section
              const criteria = Array.from(new Set(sectionReqs.map(r => r.criterion || ''))).filter(d => d).sort((a, b) => a.localeCompare(b, 'ar'));

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
                        ({sectionReqs.length} {lang === 'ar' ? 'متطلبات' : 'requirements'} • {criteria.length} {lang === 'ar' ? 'معايير' : 'criteria'})
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className={colors.textSecondary} /> : <ChevronDown size={20} className={colors.textSecondary} />}
                  </button>
                  {isExpanded && (
                    <div className={`p-6 ${colors.bgSecondary}`}>
                      <div className="space-y-6">
                        {criteria.map(criterion => {
                          const criterionReqs = sectionReqs.filter(r => r.criterion === criterion);
                          const confirmedCriterionReqs = criterionReqs.filter(r => r.answer_status === 'confirmed');
                          const completionRate = criterionReqs.length > 0
                            ? Math.round((confirmedCriterionReqs.length / criterionReqs.length) * 100)
                            : 0;

                          return (
                            <div key={criterion} className={`border ${colors.border} rounded-lg p-4 ${colors.bgPrimary}`}>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className={`text-md font-semibold ${colors.textPrimary}`}>
                                  {lang === 'ar' ? 'المعيار: ' : 'Criterion: '}{criterion}
                                </h4>
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm ${colors.textSecondary}`}>
                                    {confirmedCriterionReqs.length} / {criterionReqs.length} {lang === 'ar' ? 'مكتملة' : 'completed'}
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
                                {criterionReqs.map(req => {
                                  const reqEvidence = evidence.filter(e => e.requirement_id === req.requirement_db_id);
                                  if (reqEvidence.length > 0) {
                                    console.log('Evidence found for req:', req.id, 'db_id:', req.requirement_db_id, 'evidence count:', reqEvidence.length);
                                  }
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
                                        {/* Only show evidence counts if requirement requires evidence */}
                                        {(req.evidence_description_ar || req.evidence_description_en) && (
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
                                        )}
                                      </div>
                                      {/* Show answer status badge for ETARI, LevelIndicator for NAII */}
                                      {currentIndex?.index_type === 'ETARI' ? (
                                        <div className="flex items-center gap-2">
                                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            req.answer_status === 'confirmed'
                                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                              : req.answer_status === 'approved'
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                              : req.answer_status === 'pending_review'
                                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                              : req.answer_status === 'rejected'
                                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                              : req.answer_status === 'draft'
                                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                          }`}>
                                            {req.answer_status === 'confirmed'
                                              ? (lang === 'ar' ? 'مُؤكدة' : 'Confirmed')
                                              : req.answer_status === 'approved'
                                              ? (lang === 'ar' ? 'مُوافق عليها' : 'Approved')
                                              : req.answer_status === 'pending_review'
                                              ? (lang === 'ar' ? 'قيد المراجعة' : 'Pending Review')
                                              : req.answer_status === 'rejected'
                                              ? (lang === 'ar' ? 'مرفوضة' : 'Rejected')
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

        <div className={`${patterns.section} p-4 sm:p-6`}>
          <h2 className={`text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 ${colors.textPrimary}`}>
            <Download className="text-gray-500" size={24} />
            {lang === 'ar' ? 'تصدير التقارير' : 'Export Reports'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
