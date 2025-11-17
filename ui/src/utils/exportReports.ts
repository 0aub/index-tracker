/**
 * Export Reports Utilities
 * Functions to export reports to PDF, Excel, and PowerPoint formats
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { Requirement } from './calculations';

// ============================================================================
// PDF Export
// ============================================================================

export interface PDFExportData {
  indexName: string;
  indexCode: string;
  overallMaturity: number;
  sections: Array<{
    name: string;
    maturity: number;
    completion: number;
    requirementCount: number;
  }>;
  userEngagement: Array<{
    username: string;
    fullName: string;
    assignedRequirements: number;
    approvedDocuments: number;
    totalUploads: number;
    rejectedDocuments: number;
    totalComments: number;
  }>;
  requirements: Requirement[];
  lang: 'ar' | 'en';
  chartImages?: {
    radarChart?: string;
    pieChart?: string;
    progressChart?: string;
    userEngagementTable?: string;
  };
}

export async function exportToPDF(data: PDFExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isArabic = data.lang === 'ar';
  let yPosition = 20;

  // Header Banner
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 35, 'F');

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const title = isArabic ? 'تقرير نضج المؤشر' : 'Index Maturity Report';
  doc.text(title, 105, 15, { align: 'center' });

  // Subtitle
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.indexName}`, 105, 23, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${data.indexCode} • ${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}`, 105, 30, { align: 'center' });

  yPosition = 45;
  doc.setTextColor(0, 0, 0);

  // Overall Maturity Section - Highlighted Box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, yPosition, 180, 25, 3, 3, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPosition, 180, 25, 3, 3, 'S');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(isArabic ? 'مستوى النضج الإجمالي' : 'Overall Maturity Level', 105, yPosition + 8, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(59, 130, 246);
  doc.text(`${data.overallMaturity.toFixed(2)} / 5.00`, 105, yPosition + 20, { align: 'center' });

  yPosition += 35;
  doc.setTextColor(0, 0, 0);

  // Summary Statistics
  const totalRequirements = data.sections.reduce((sum, s) => sum + s.requirementCount, 0);
  const avgCompletion = data.sections.length > 0
    ? (data.sections.reduce((sum, s) => sum + s.completion, 0) / data.sections.length).toFixed(1)
    : 0;

  doc.setFillColor(248, 250, 252);
  doc.rect(15, yPosition, 180, 18, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(isArabic ? 'إحصائيات سريعة' : 'Quick Statistics', 20, yPosition + 6);

  doc.setFont('helvetica', 'normal');
  doc.text(`${isArabic ? 'عدد الأقسام:' : 'Sections:'} ${data.sections.length}`, 20, yPosition + 12);
  doc.text(`${isArabic ? 'إجمالي المتطلبات:' : 'Total Requirements:'} ${totalRequirements}`, 75, yPosition + 12);
  doc.text(`${isArabic ? 'متوسط الإنجاز:' : 'Avg Completion:'} ${avgCompletion}%`, 140, yPosition + 12);

  yPosition += 25;

  // Charts Section
  if (data.chartImages) {
    // Radar Chart (Section Maturity)
    if (data.chartImages.radarChart) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(isArabic ? 'نضج الأقسام' : 'Section Maturity', 105, yPosition, { align: 'center' });
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      const imgWidth = 170;
      const imgHeight = 100;
      doc.addImage(data.chartImages.radarChart, 'PNG', 20, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 15;
    }

    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    // Pie and Progress Charts side by side
    if (data.chartImages.pieChart || data.chartImages.progressChart) {
      const chartWidth = 85;
      const chartHeight = 80;

      if (data.chartImages.pieChart) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(isArabic ? 'توزيع الأقسام' : 'Section Distribution', 62, yPosition, { align: 'center' });
        doc.addImage(data.chartImages.pieChart, 'PNG', 20, yPosition + 5, chartWidth, chartHeight);
      }

      if (data.chartImages.progressChart) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        doc.text(isArabic ? 'تقدم المشروع' : 'Project Progress', 150, yPosition, { align: 'center' });
        doc.addImage(data.chartImages.progressChart, 'PNG', 105, yPosition + 5, chartWidth, chartHeight);
      }

      yPosition += chartHeight + 20;
    }

    // User Engagement Table Image
    if (data.chartImages.userEngagementTable) {
      if (yPosition > 150) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(isArabic ? 'مساهمة المستخدمين' : 'User Engagement', 105, yPosition, { align: 'center' });
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      const tableWidth = 170;
      const tableHeight = 120;
      doc.addImage(data.chartImages.userEngagementTable, 'PNG', 20, yPosition, tableWidth, tableHeight);
      yPosition += tableHeight + 10;
    }
  }

  // Footer with page numbers and branding
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, 285, 190, 285);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${isArabic ? 'صفحة' : 'Page'} ${i} ${isArabic ? 'من' : 'of'} ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
    doc.text(
      isArabic ? 'نظام تتبع المؤشرات' : 'Index Tracking System',
      20,
      290
    );
  }

  // Save
  doc.save(`${data.indexCode}_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================================
// Excel Export
// ============================================================================

export async function exportToExcel(data: PDFExportData) {
  const workbook = XLSX.utils.book_new();
  const isArabic = data.lang === 'ar';

  // Overview Sheet - Enhanced Design
  const totalReqs = data.sections.reduce((sum, s) => sum + s.requirementCount, 0);
  const avgCompletion = data.sections.length > 0
    ? (data.sections.reduce((sum, s) => sum + s.completion, 0) / data.sections.length).toFixed(1)
    : 0;
  const totalUsers = data.userEngagement.length;
  const totalUploads = data.userEngagement.reduce((sum, u) => sum + u.totalUploads, 0);
  const totalApproved = data.userEngagement.reduce((sum, u) => sum + u.approvedDocuments, 0);
  const totalComments = data.userEngagement.reduce((sum, u) => sum + u.totalComments, 0);

  const overviewData = [
    ['', '', '', '', '', ''],
    ['', isArabic ? 'تقرير نضج المؤشر' : 'INDEX MATURITY REPORT', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', isArabic ? 'معلومات المؤشر' : 'INDEX INFORMATION', '', '', '', ''],
    ['', isArabic ? 'اسم المؤشر:' : 'Index Name:', data.indexName, '', '', ''],
    ['', isArabic ? 'رمز المؤشر:' : 'Index Code:', data.indexCode, '', '', ''],
    ['', isArabic ? 'تاريخ التقرير:' : 'Report Date:', new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US'), '', '', ''],
    ['', '', '', '', '', ''],
    ['', isArabic ? 'مقاييس النضج' : 'MATURITY METRICS', '', '', '', ''],
    ['', isArabic ? 'مستوى النضج الإجمالي' : 'Overall Maturity Level', data.overallMaturity.toFixed(2) + ' / 5.00', '', isArabic ? 'النسبة المئوية' : 'Percentage', ((data.overallMaturity / 5) * 100).toFixed(1) + '%'],
    ['', isArabic ? 'عدد الأقسام' : 'Number of Sections', data.sections.length, '', isArabic ? 'متوسط نضج الأقسام' : 'Avg Section Maturity', (data.sections.reduce((sum, s) => sum + s.maturity, 0) / data.sections.length).toFixed(2)],
    ['', isArabic ? 'إجمالي المتطلبات' : 'Total Requirements', totalReqs, '', isArabic ? 'متوسط الإنجاز' : 'Avg Completion', avgCompletion + '%'],
    ['', '', '', '', '', ''],
    ['', isArabic ? 'مقاييس التفاعل' : 'ENGAGEMENT METRICS', '', '', '', ''],
    ['', isArabic ? 'عدد المستخدمين' : 'Total Users', totalUsers, '', isArabic ? 'إجمالي الرفوعات' : 'Total Uploads', totalUploads],
    ['', isArabic ? 'المستندات المعتمدة' : 'Approved Documents', totalApproved, '', isArabic ? 'إجمالي التعليقات' : 'Total Comments', totalComments],
    ['', isArabic ? 'معدل القبول' : 'Approval Rate', totalUploads > 0 ? ((totalApproved / totalUploads) * 100).toFixed(1) + '%' : '0%', '', '', ''],
    ['', '', '', '', '', ''],
    ['', isArabic ? 'أعلى الأقسام أداءً' : 'TOP PERFORMING SECTIONS', '', '', '', ''],
    ...data.sections
      .sort((a, b) => b.maturity - a.maturity)
      .slice(0, 5)
      .map((s, i) => ['', `${i + 1}. ${s.name}`, isArabic ? 'النضج:' : 'Maturity:', s.maturity.toFixed(2), isArabic ? 'الإنجاز:' : 'Completion:', s.completion + '%']),
    ['', '', '', '', '', ''],
    ['', isArabic ? 'أنشط المستخدمين' : 'MOST ACTIVE USERS', '', '', '', ''],
    ...data.userEngagement
      .sort((a, b) => b.totalUploads - a.totalUploads)
      .slice(0, 5)
      .map((u, i) => ['', `${i + 1}. ${u.fullName || u.username}`, isArabic ? 'الرفوعات:' : 'Uploads:', u.totalUploads, isArabic ? 'المعتمدة:' : 'Approved:', u.approvedDocuments]),
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);

  // Set column widths
  overviewSheet['!cols'] = [
    { wch: 3 },
    { wch: 35 },
    { wch: 25 },
    { wch: 5 },
    { wch: 25 },
    { wch: 20 }
  ];

  // Set row heights
  if (!overviewSheet['!rows']) overviewSheet['!rows'] = [];
  overviewSheet['!rows'][1] = { hpt: 35 }; // Title row

  // Merge cells for titles
  if (!overviewSheet['!merges']) overviewSheet['!merges'] = [];
  overviewSheet['!merges'].push(
    { s: { r: 1, c: 1 }, e: { r: 1, c: 5 } }, // Main title
    { s: { r: 3, c: 1 }, e: { r: 3, c: 5 } }, // Index info header
    { s: { r: 8, c: 1 }, e: { r: 8, c: 5 } }, // Maturity metrics header
    { s: { r: 13, c: 1 }, e: { r: 13, c: 5 } }, // Engagement metrics header
    { s: { r: 18, c: 1 }, e: { r: 18, c: 5 } }, // Top sections header
    { s: { r: 18 + data.sections.slice(0, 5).length + 2, c: 1 }, e: { r: 18 + data.sections.slice(0, 5).length + 2, c: 5 } } // Top users header
  );

  XLSX.utils.book_append_sheet(workbook, overviewSheet, isArabic ? 'نظرة عامة' : 'Overview');

  // Sections Sheet
  const sectionsData = [
    [
      isArabic ? 'القسم' : 'Section',
      isArabic ? 'النضج' : 'Maturity',
      isArabic ? 'الإنجاز %' : 'Completion %',
      isArabic ? 'المتطلبات' : 'Requirements'
    ],
    ...data.sections.map(s => [
      s.name,
      parseFloat(s.maturity.toFixed(2)),
      s.completion,
      s.requirementCount
    ])
  ];
  const sectionsSheet = XLSX.utils.aoa_to_sheet(sectionsData);

  // Set column widths for sections
  sectionsSheet['!cols'] = [
    { wch: 50 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(workbook, sectionsSheet, isArabic ? 'الأقسام' : 'Sections');

  // User Engagement Sheet
  const userEngagementData = [
    [
      isArabic ? 'المستخدم' : 'Username',
      isArabic ? 'الاسم الكامل' : 'Full Name',
      isArabic ? 'المتطلبات المسندة' : 'Assigned Req.',
      isArabic ? 'المستندات المعتمدة' : 'Approved Docs',
      isArabic ? 'إجمالي الرفوعات' : 'Total Uploads',
      isArabic ? 'المستندات المرفوضة' : 'Rejected Docs',
      isArabic ? 'التعليقات' : 'Comments',
      isArabic ? 'معدل النجاح %' : 'Success Rate %'
    ],
    ...data.userEngagement.map(u => [
      u.username,
      u.fullName,
      u.assignedRequirements,
      u.approvedDocuments,
      u.totalUploads,
      u.rejectedDocuments,
      u.totalComments,
      u.totalUploads > 0 ? parseFloat(((u.approvedDocuments / u.totalUploads) * 100).toFixed(1)) : 0
    ])
  ];
  const userEngagementSheet = XLSX.utils.aoa_to_sheet(userEngagementData);

  // Set column widths for user engagement
  userEngagementSheet['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(workbook, userEngagementSheet, isArabic ? 'مساهمة المستخدمين' : 'User Engagement');

  // Requirements Sheet
  const requirementsData = [
    [
      isArabic ? 'رمز المتطلب' : 'Requirement Code',
      isArabic ? 'السؤال' : 'Question',
      isArabic ? 'القسم' : 'Section',
      isArabic ? 'مستوى النضج' : 'Maturity Level'
    ],
    ...data.requirements.map(r => [
      r.id,
      isArabic ? r.question : r.question_en || r.question,
      r.section,
      r.current_level
    ])
  ];
  const requirementsSheet = XLSX.utils.aoa_to_sheet(requirementsData);

  // Set column widths for requirements
  requirementsSheet['!cols'] = [
    { wch: 20 },
    { wch: 60 },
    { wch: 30 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(workbook, requirementsSheet, isArabic ? 'المتطلبات' : 'Requirements');

  // Save
  XLSX.writeFile(workbook, `${data.indexCode}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ============================================================================
// PowerPoint Export
// ============================================================================

export async function exportToPowerPoint(data: PDFExportData) {
  const pptx = new PptxGenJS();
  const isArabic = data.lang === 'ar';

  // Set presentation properties
  pptx.author = 'Index Tracking System';
  pptx.company = data.indexName;
  pptx.title = isArabic ? 'تقرير نضج المؤشر' : 'Index Maturity Report';

  // Slide 1: Title Slide
  const slide1 = pptx.addSlide();
  slide1.background = { color: '3B82F6' };
  slide1.addText(isArabic ? 'تقرير نضج المؤشر' : 'Index Maturity Report', {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 1.5,
    fontSize: 48,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  });
  slide1.addText(`${data.indexName}`, {
    x: 0.5,
    y: 3.2,
    w: 9,
    h: 0.6,
    fontSize: 28,
    color: 'FFFFFF',
    align: 'center',
  });
  slide1.addText(`${data.indexCode}`, {
    x: 0.5,
    y: 3.9,
    w: 9,
    h: 0.4,
    fontSize: 20,
    color: 'E0E7FF',
    align: 'center',
  });
  slide1.addText(new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US'), {
    x: 0.5,
    y: 4.5,
    w: 9,
    h: 0.3,
    fontSize: 16,
    color: 'DBEAFE',
    align: 'center',
  });

  // Slide 2: Overall Maturity with Summary
  const slide2 = pptx.addSlide();
  slide2.addText(isArabic ? 'النظرة العامة' : 'Overview', {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.6,
    fontSize: 36,
    bold: true,
    color: '1E3A8A',
  });

  // Maturity Score Box
  slide2.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: 1.5,
    w: 3.5,
    h: 2.5,
    fill: { color: 'EFF6FF' },
    line: { color: '3B82F6', width: 2 }
  });
  slide2.addText(isArabic ? 'مستوى النضج الإجمالي' : 'Overall Maturity', {
    x: 1.0,
    y: 1.7,
    w: 3.5,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: '1E40AF',
    align: 'center',
  });
  slide2.addText(data.overallMaturity.toFixed(2), {
    x: 1.0,
    y: 2.3,
    w: 3.5,
    h: 1.0,
    fontSize: 72,
    bold: true,
    color: '3B82F6',
    align: 'center',
  });
  slide2.addText('/ 5.00', {
    x: 1.0,
    y: 3.3,
    w: 3.5,
    h: 0.4,
    fontSize: 20,
    color: '6B7280',
    align: 'center',
  });

  // Statistics Table
  const statsData = [
    [
      { text: isArabic ? 'الإحصائية' : 'Metric', options: { bold: true, color: 'FFFFFF', fill: '10B981', fontSize: 14 } },
      { text: isArabic ? 'القيمة' : 'Value', options: { bold: true, color: 'FFFFFF', fill: '10B981', fontSize: 14 } }
    ],
    [
      { text: isArabic ? 'عدد الأقسام' : 'Number of Sections', options: { fontSize: 13 } },
      { text: data.sections.length.toString(), options: { bold: true, fontSize: 13 } }
    ],
    [
      { text: isArabic ? 'إجمالي المتطلبات' : 'Total Requirements', options: { fontSize: 13 } },
      { text: data.sections.reduce((sum, s) => sum + s.requirementCount, 0).toString(), options: { bold: true, fontSize: 13 } }
    ],
    [
      { text: isArabic ? 'متوسط الإنجاز' : 'Average Completion', options: { fontSize: 13 } },
      {
        text: (data.sections.length > 0
          ? (data.sections.reduce((sum, s) => sum + s.completion, 0) / data.sections.length).toFixed(1)
          : 0) + '%',
        options: { bold: true, fontSize: 13 }
      }
    ]
  ];

  slide2.addTable(statsData, {
    x: 5.0,
    y: 1.5,
    w: 4.5,
    h: 2.5,
    border: { pt: 1, color: 'E5E7EB' },
  });

  // Slide 3: Section Maturity Chart
  const slide3 = pptx.addSlide();
  slide3.addText(isArabic ? 'نضج الأقسام' : 'Section Maturity Analysis', {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '1E3A8A',
  });

  // Prepare chart data - limit to top 10 sections for readability
  const topSections = data.sections.slice(0, 10);
  const chartData = [
    {
      name: isArabic ? 'النضج' : 'Maturity',
      labels: topSections.map(s => s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name),
      values: topSections.map(s => s.maturity)
    },
    {
      name: isArabic ? 'الإنجاز %' : 'Completion %',
      labels: topSections.map(s => s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name),
      values: topSections.map(s => s.completion)
    }
  ];

  slide3.addChart(pptx.ChartType.bar, chartData, {
    x: 0.5,
    y: 1.3,
    w: 9,
    h: 4.0,
    barDir: 'bar',
    barGrouping: 'clustered',
    chartColors: ['3B82F6', '10B981'],
    showLegend: true,
    legendPos: 'b',
    showTitle: false,
    valAxisMaxVal: 100,
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 10,
  });

  // Slide 4: User Engagement Chart
  const slide4 = pptx.addSlide();
  slide4.addText(isArabic ? 'مساهمة المستخدمين' : 'User Engagement', {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '1E3A8A',
  });

  // Top users chart
  const topUsers = data.userEngagement.slice(0, 8);
  const userChartData = [
    {
      name: isArabic ? 'المتطلبات المسندة' : 'Assigned',
      labels: topUsers.map(u => u.fullName?.split(' ')[0] || u.username),
      values: topUsers.map(u => u.assignedRequirements)
    },
    {
      name: isArabic ? 'المعتمدة' : 'Approved',
      labels: topUsers.map(u => u.fullName?.split(' ')[0] || u.username),
      values: topUsers.map(u => u.approvedDocuments)
    },
    {
      name: isArabic ? 'الرفوعات' : 'Uploads',
      labels: topUsers.map(u => u.fullName?.split(' ')[0] || u.username),
      values: topUsers.map(u => u.totalUploads)
    }
  ];

  slide4.addChart(pptx.ChartType.bar, userChartData, {
    x: 0.5,
    y: 1.3,
    w: 9,
    h: 4.0,
    barDir: 'col',
    barGrouping: 'clustered',
    chartColors: ['3B82F6', '10B981', '8B5CF6'],
    showLegend: true,
    legendPos: 'b',
    showTitle: false,
    catAxisLabelFontSize: 10,
    valAxisLabelFontSize: 10,
  });

  // Slide 5: Document Success Rate Chart
  const slide5 = pptx.addSlide();
  slide5.addText(isArabic ? 'معدل نجاح المستندات' : 'Document Success Rate', {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '1E3A8A',
  });

  const docChartData = [
    {
      name: isArabic ? 'معتمدة' : 'Approved',
      labels: topUsers.map(u => u.fullName?.split(' ')[0] || u.username),
      values: topUsers.map(u => u.approvedDocuments)
    },
    {
      name: isArabic ? 'مرفوضة' : 'Rejected',
      labels: topUsers.map(u => u.fullName?.split(' ')[0] || u.username),
      values: topUsers.map(u => u.rejectedDocuments)
    }
  ];

  slide5.addChart(pptx.ChartType.bar, docChartData, {
    x: 0.5,
    y: 1.3,
    w: 9,
    h: 4.0,
    barDir: 'col',
    barGrouping: 'stacked',
    chartColors: ['10B981', 'EF4444'],
    showLegend: true,
    legendPos: 'b',
    showTitle: false,
    catAxisLabelFontSize: 10,
    valAxisLabelFontSize: 10,
  });

  // Save
  pptx.writeFile({ fileName: `${data.indexCode}_presentation_${new Date().toISOString().split('T')[0]}.pptx` });
}
