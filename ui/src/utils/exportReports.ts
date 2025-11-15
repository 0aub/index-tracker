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
}

export async function exportToPDF(data: PDFExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isArabic = data.lang === 'ar';
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const title = isArabic ? 'تقرير نضج المؤشر' : 'Index Maturity Report';
  doc.text(title, 105, yPosition, { align: 'center' });
  yPosition += 10;

  // Index Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${isArabic ? 'المؤشر' : 'Index'}: ${data.indexName} (${data.indexCode})`, 20, yPosition);
  yPosition += 7;
  doc.text(`${isArabic ? 'التاريخ' : 'Date'}: ${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}`, 20, yPosition);
  yPosition += 10;

  // Overall Maturity
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(isArabic ? 'مستوى النضج الإجمالي' : 'Overall Maturity Level', 20, yPosition);
  yPosition += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.overallMaturity.toFixed(2)} / 5.00`, 20, yPosition);
  yPosition += 12;

  // Sections Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(isArabic ? 'نضج الأقسام' : 'Section Maturity', 20, yPosition);
  yPosition += 5;

  autoTable(doc, {
    startY: yPosition,
    head: [[
      isArabic ? 'القسم' : 'Section',
      isArabic ? 'النضج' : 'Maturity',
      isArabic ? 'الإنجاز %' : 'Completion %',
      isArabic ? 'المتطلبات' : 'Requirements'
    ]],
    body: data.sections.map(s => [
      s.name,
      s.maturity.toFixed(2),
      `${s.completion}%`,
      s.requirementCount
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { font: 'helvetica', fontSize: 10 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // User Engagement Table
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(isArabic ? 'مساهمة المستخدمين' : 'User Engagement', 20, yPosition);
  yPosition += 5;

  autoTable(doc, {
    startY: yPosition,
    head: [[
      isArabic ? 'المستخدم' : 'User',
      isArabic ? 'المتطلبات' : 'Assigned',
      isArabic ? 'المعتمد' : 'Approved',
      isArabic ? 'الرفوعات' : 'Uploads',
      isArabic ? 'المرفوض' : 'Rejected',
      isArabic ? 'التعليقات' : 'Comments'
    ]],
    body: data.userEngagement.map(u => [
      u.fullName || u.username,
      u.assignedRequirements,
      u.approvedDocuments,
      u.totalUploads,
      u.rejectedDocuments,
      u.totalComments
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { font: 'helvetica', fontSize: 9 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${isArabic ? 'صفحة' : 'Page'} ${i} ${isArabic ? 'من' : 'of'} ${pageCount}`,
      105,
      290,
      { align: 'center' }
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

  // Overview Sheet
  const overviewData = [
    [data.lang === 'ar' ? 'تقرير نضج المؤشر' : 'Index Maturity Report'],
    [],
    [data.lang === 'ar' ? 'المؤشر' : 'Index', data.indexName],
    [data.lang === 'ar' ? 'الرمز' : 'Code', data.indexCode],
    [data.lang === 'ar' ? 'التاريخ' : 'Date', new Date().toLocaleDateString()],
    [data.lang === 'ar' ? 'مستوى النضج الإجمالي' : 'Overall Maturity', data.overallMaturity.toFixed(2)],
    [],
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, data.lang === 'ar' ? 'نظرة عامة' : 'Overview');

  // Sections Sheet
  const sectionsData = [
    [
      data.lang === 'ar' ? 'القسم' : 'Section',
      data.lang === 'ar' ? 'النضج' : 'Maturity',
      data.lang === 'ar' ? 'الإنجاز %' : 'Completion %',
      data.lang === 'ar' ? 'المتطلبات' : 'Requirements'
    ],
    ...data.sections.map(s => [s.name, s.maturity.toFixed(2), s.completion, s.requirementCount])
  ];
  const sectionsSheet = XLSX.utils.aoa_to_sheet(sectionsData);
  XLSX.utils.book_append_sheet(workbook, sectionsSheet, data.lang === 'ar' ? 'الأقسام' : 'Sections');

  // User Engagement Sheet
  const userEngagementData = [
    [
      data.lang === 'ar' ? 'المستخدم' : 'User',
      data.lang === 'ar' ? 'الاسم الكامل' : 'Full Name',
      data.lang === 'ar' ? 'المتطلبات المسندة' : 'Assigned Requirements',
      data.lang === 'ar' ? 'المستندات المعتمدة' : 'Approved Documents',
      data.lang === 'ar' ? 'إجمالي الرفوعات' : 'Total Uploads',
      data.lang === 'ar' ? 'المستندات المرفوضة' : 'Rejected Documents',
      data.lang === 'ar' ? 'التعليقات' : 'Comments'
    ],
    ...data.userEngagement.map(u => [
      u.username,
      u.fullName,
      u.assignedRequirements,
      u.approvedDocuments,
      u.totalUploads,
      u.rejectedDocuments,
      u.totalComments
    ])
  ];
  const userEngagementSheet = XLSX.utils.aoa_to_sheet(userEngagementData);
  XLSX.utils.book_append_sheet(workbook, userEngagementSheet, data.lang === 'ar' ? 'مساهمة المستخدمين' : 'User Engagement');

  // Requirements Sheet
  const requirementsData = [
    [
      data.lang === 'ar' ? 'رمز المتطلب' : 'Requirement Code',
      data.lang === 'ar' ? 'السؤال' : 'Question',
      data.lang === 'ar' ? 'القسم' : 'Section',
      data.lang === 'ar' ? 'مستوى النضج' : 'Maturity Level'
    ],
    ...data.requirements.map(r => [
      r.id,
      data.lang === 'ar' ? r.question : r.question_en || r.question,
      r.section,
      r.current_level
    ])
  ];
  const requirementsSheet = XLSX.utils.aoa_to_sheet(requirementsData);
  XLSX.utils.book_append_sheet(workbook, requirementsSheet, data.lang === 'ar' ? 'المتطلبات' : 'Requirements');

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
  pptx.author = 'Raqib Index Tracker';
  pptx.company = data.indexName;
  pptx.title = isArabic ? 'تقرير نضج المؤشر' : 'Index Maturity Report';

  // Slide 1: Title
  const slide1 = pptx.addSlide();
  slide1.background = { color: '3B82F6' };
  slide1.addText(isArabic ? 'تقرير نضج المؤشر' : 'Index Maturity Report', {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  });
  slide1.addText(`${data.indexName} (${data.indexCode})`, {
    x: 0.5,
    y: 3.5,
    w: 9,
    h: 0.5,
    fontSize: 24,
    color: 'FFFFFF',
    align: 'center',
  });
  slide1.addText(new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US'), {
    x: 0.5,
    y: 4.2,
    w: 9,
    h: 0.3,
    fontSize: 16,
    color: 'E0E0E0',
    align: 'center',
  });

  // Slide 2: Overall Maturity
  const slide2 = pptx.addSlide();
  slide2.addText(isArabic ? 'مستوى النضج الإجمالي' : 'Overall Maturity Level', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '1E3A8A',
  });
  slide2.addText(data.overallMaturity.toFixed(2), {
    x: 3.5,
    y: 2.0,
    w: 3,
    h: 2,
    fontSize: 96,
    bold: true,
    color: '3B82F6',
    align: 'center',
  });
  slide2.addText('/ 5.00', {
    x: 3.5,
    y: 4.0,
    w: 3,
    h: 0.5,
    fontSize: 24,
    color: '6B7280',
    align: 'center',
  });

  // Slide 3: Sections Maturity
  const slide3 = pptx.addSlide();
  slide3.addText(isArabic ? 'نضج الأقسام' : 'Section Maturity', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '1E3A8A',
  });

  const sectionsTableData = [
    [
      { text: isArabic ? 'القسم' : 'Section', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } },
      { text: isArabic ? 'النضج' : 'Maturity', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } },
      { text: isArabic ? 'الإنجاز %' : 'Completion %', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } },
      { text: isArabic ? 'المتطلبات' : 'Requirements', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } }
    ],
    ...data.sections.map((s, idx) => [
      { text: s.name, options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } },
      { text: s.maturity.toFixed(2), options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } },
      { text: `${s.completion}%`, options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } },
      { text: s.requirementCount.toString(), options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } }
    ])
  ];

  slide3.addTable(sectionsTableData, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 3.5,
    fontSize: 14,
    border: { pt: 1, color: 'E5E7EB' },
  });

  // Slide 4: User Engagement
  const slide4 = pptx.addSlide();
  slide4.addText(isArabic ? 'مساهمة المستخدمين' : 'User Engagement', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '1E3A8A',
  });

  const userEngagementTableData = [
    [
      { text: isArabic ? 'المستخدم' : 'User', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } },
      { text: isArabic ? 'المتطلبات' : 'Assigned', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } },
      { text: isArabic ? 'المعتمد' : 'Approved', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } },
      { text: isArabic ? 'الرفوعات' : 'Uploads', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } },
      { text: isArabic ? 'المرفوض' : 'Rejected', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } },
      { text: isArabic ? 'التعليقات' : 'Comments', options: { bold: true, color: 'FFFFFF', fill: '3B82F6' } }
    ],
    ...data.userEngagement.slice(0, 10).map((u, idx) => [
      { text: u.fullName || u.username, options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } },
      { text: u.assignedRequirements.toString(), options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } },
      { text: u.approvedDocuments.toString(), options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } },
      { text: u.totalUploads.toString(), options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } },
      { text: u.rejectedDocuments.toString(), options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } },
      { text: u.totalComments.toString(), options: { fill: idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } }
    ])
  ];

  slide4.addTable(userEngagementTableData, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 3.5,
    fontSize: 11,
    border: { pt: 1, color: 'E5E7EB' },
  });

  // Save
  pptx.writeFile({ fileName: `${data.indexCode}_presentation_${new Date().toISOString().split('T')[0]}.pptx` });
}
