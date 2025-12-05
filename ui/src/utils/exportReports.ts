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
// Types and Interfaces
// ============================================================================

export interface PDFExportData {
  indexName: string;
  indexCode: string;
  overallMaturity: number;
  indexType?: string;
  startDate?: string;
  endDate?: string;
  sections: Array<{
    name: string;
    maturity: number;
    completion: number;
    requirementCount: number;
  }>;
  userEngagement: Array<{
    username: string;
    fullName: string;
    role?: string;
    assignedRequirements: number;
    approvedDocuments: number;
    totalUploads: number;
    rejectedDocuments: number;
    totalComments: number;
    draftDocuments?: number;
    submittedDocuments?: number;
    documentsReviewed?: number;
    checklistItemsCompleted?: number;
  }>;
  requirements: Requirement[];
  evidenceStats?: {
    approved: number;
    rejected: number;
    underRevision: number;
    draft: number;
    total: number;
  };
  lang: 'ar' | 'en';
  chartImages?: {
    radarChart?: string;
    pieChart?: string;
    progressChart?: string;
    userEngagementTable?: string;
  };
}

// Color palette
const COLORS = {
  primary: '#3B82F6',
  primaryDark: '#1E40AF',
  primaryLight: '#DBEAFE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  grayDark: '#374151',
  white: '#FFFFFF',
  black: '#000000',
};

// ============================================================================
// PDF Export - Completely Rewritten
// ============================================================================

export async function exportToPDF(data: PDFExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isArabic = data.lang === 'ar';
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 0;

  // Helper function to add a new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // Helper to draw a section header
  const drawSectionHeader = (title: string, icon?: string) => {
    checkNewPage(15);
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 5, yPos + 7);
    yPos += 15;
    doc.setTextColor(0, 0, 0);
  };

  // ========== PAGE 1: Cover Page ==========
  // Header Banner
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  const mainTitle = isArabic ? 'Index Maturity Report' : 'Index Maturity Report';
  doc.text(mainTitle, pageWidth / 2, 20, { align: 'center' });

  // Index Name
  doc.setFontSize(18);
  doc.text(data.indexName, pageWidth / 2, 32, { align: 'center' });

  // Index Code and Date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const reportDate = new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`${data.indexCode} | ${reportDate}`, pageWidth / 2, 44, { align: 'center' });

  yPos = 60;
  doc.setTextColor(0, 0, 0);

  // Overall Maturity Score Box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  doc.text(isArabic ? 'Overall Maturity Level' : 'Overall Maturity Level', pageWidth / 2, yPos + 10, { align: 'center' });

  doc.setFontSize(36);
  doc.setTextColor(59, 130, 246);
  doc.text(`${data.overallMaturity.toFixed(2)}`, pageWidth / 2 - 15, yPos + 28, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(107, 114, 128);
  doc.text('/ 5.00', pageWidth / 2 + 20, yPos + 28, { align: 'center' });

  // Progress bar
  const progressWidth = pageWidth - 2 * margin - 20;
  const progressX = margin + 10;
  const progressY = yPos + 32;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(progressX, progressY, progressWidth, 4, 2, 2, 'F');
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(progressX, progressY, progressWidth * (data.overallMaturity / 5), 4, 2, 2, 'F');

  yPos += 45;

  // Quick Statistics Grid
  const stats = [
    {
      label: isArabic ? 'Sections' : 'Sections',
      value: data.sections.length.toString(),
      color: COLORS.primary
    },
    {
      label: isArabic ? 'Requirements' : 'Requirements',
      value: data.sections.reduce((sum, s) => sum + s.requirementCount, 0).toString(),
      color: COLORS.success
    },
    {
      label: isArabic ? 'Avg Completion' : 'Avg Completion',
      value: `${(data.sections.reduce((sum, s) => sum + s.completion, 0) / Math.max(data.sections.length, 1)).toFixed(1)}%`,
      color: COLORS.warning
    },
    {
      label: isArabic ? 'Team Members' : 'Team Members',
      value: data.userEngagement.length.toString(),
      color: COLORS.primaryDark
    }
  ];

  const boxWidth = (pageWidth - 2 * margin - 15) / 4;
  stats.forEach((stat, i) => {
    const x = margin + i * (boxWidth + 5);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, yPos, boxWidth, 25, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(stat.color);
    doc.text(stat.value, x + boxWidth / 2, yPos + 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(stat.label, x + boxWidth / 2, yPos + 20, { align: 'center' });
  });

  yPos += 35;

  // ========== Sections Table ==========
  drawSectionHeader(isArabic ? 'Section Analysis' : 'Section Analysis');

  const sectionTableData = data.sections.map((section, index) => [
    (index + 1).toString(),
    section.name,
    section.maturity.toFixed(2),
    `${section.completion}%`,
    section.requirementCount.toString()
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      '#',
      isArabic ? 'Section' : 'Section',
      isArabic ? 'Maturity' : 'Maturity',
      isArabic ? 'Completion' : 'Completion',
      isArabic ? 'Requirements' : 'Requirements'
    ]],
    body: sectionTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 70, halign: 'left' },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 }
    },
    margin: { left: margin, right: margin },
    didDrawCell: (hookData) => {
      // Color code completion column
      if (hookData.column.index === 3 && hookData.section === 'body') {
        const completion = parseFloat(hookData.cell.text[0]);
        if (completion >= 75) {
          hookData.cell.styles.textColor = [16, 185, 129];
        } else if (completion >= 50) {
          hookData.cell.styles.textColor = [245, 158, 11];
        } else {
          hookData.cell.styles.textColor = [239, 68, 68];
        }
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ========== Evidence Statistics ==========
  if (data.evidenceStats && data.evidenceStats.total > 0) {
    checkNewPage(50);
    drawSectionHeader(isArabic ? 'Evidence Statistics' : 'Evidence Statistics');

    const evidenceData = [
      [isArabic ? 'Approved' : 'Approved', data.evidenceStats.approved.toString(), `${((data.evidenceStats.approved / data.evidenceStats.total) * 100).toFixed(1)}%`],
      [isArabic ? 'Under Revision' : 'Under Revision', data.evidenceStats.underRevision.toString(), `${((data.evidenceStats.underRevision / data.evidenceStats.total) * 100).toFixed(1)}%`],
      [isArabic ? 'Draft' : 'Draft', data.evidenceStats.draft.toString(), `${((data.evidenceStats.draft / data.evidenceStats.total) * 100).toFixed(1)}%`],
      [isArabic ? 'Rejected' : 'Rejected', data.evidenceStats.rejected.toString(), `${((data.evidenceStats.rejected / data.evidenceStats.total) * 100).toFixed(1)}%`],
      [isArabic ? 'Total' : 'Total', data.evidenceStats.total.toString(), '100%']
    ];

    autoTable(doc, {
      startY: yPos,
      head: [[
        isArabic ? 'Status' : 'Status',
        isArabic ? 'Count' : 'Count',
        isArabic ? 'Percentage' : 'Percentage'
      ]],
      body: evidenceData,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        halign: 'center',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 }
      },
      margin: { left: margin + 25, right: margin + 25 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ========== NEW PAGE: User Engagement ==========
  doc.addPage();
  yPos = 20;

  drawSectionHeader(isArabic ? 'User Engagement' : 'User Engagement');

  // Group users by role
  const owners = data.userEngagement.filter(u => u.role?.toUpperCase() === 'OWNER');
  const supervisors = data.userEngagement.filter(u => u.role?.toUpperCase() === 'SUPERVISOR');
  const contributors = data.userEngagement.filter(u => u.role?.toUpperCase() === 'CONTRIBUTOR');

  const renderUserTable = (users: typeof data.userEngagement, roleTitle: string, color: number[]) => {
    if (users.length === 0) return;

    checkNewPage(40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`${roleTitle} (${users.length})`, margin, yPos);
    yPos += 5;

    const userData = users.map((user, index) => [
      (index + 1).toString(),
      user.fullName || user.username,
      user.assignedRequirements.toString(),
      user.totalUploads.toString(),
      user.approvedDocuments.toString(),
      user.rejectedDocuments.toString(),
      user.totalComments.toString()
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Name', 'Assigned', 'Uploads', 'Approved', 'Rejected', 'Comments']],
      body: userData,
      theme: 'striped',
      headStyles: {
        fillColor: color as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 45, halign: 'left' },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 22 }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  };

  renderUserTable(owners, isArabic ? 'Owners' : 'Owners', [139, 92, 246]);
  renderUserTable(supervisors, isArabic ? 'Supervisors' : 'Supervisors', [59, 130, 246]);
  renderUserTable(contributors, isArabic ? 'Contributors' : 'Contributors', [16, 185, 129]);

  // ========== NEW PAGE: Top Performers Summary ==========
  doc.addPage();
  yPos = 20;

  drawSectionHeader(isArabic ? 'Performance Summary' : 'Performance Summary');

  // Top uploaders
  const topUploaders = [...data.userEngagement]
    .sort((a, b) => b.totalUploads - a.totalUploads)
    .slice(0, 5);

  if (topUploaders.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(59, 130, 246);
    doc.text(isArabic ? 'Top Contributors by Uploads' : 'Top Contributors by Uploads', margin, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Rank', 'Name', 'Uploads', 'Approved', 'Success Rate']],
      body: topUploaders.map((u, i) => [
        `#${i + 1}`,
        u.fullName || u.username,
        u.totalUploads.toString(),
        u.approvedDocuments.toString(),
        `${u.totalUploads > 0 ? ((u.approvedDocuments / u.totalUploads) * 100).toFixed(1) : 0}%`
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'center'
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Section performance ranking
  const sortedSections = [...data.sections].sort((a, b) => b.completion - a.completion);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(isArabic ? 'Section Ranking by Completion' : 'Section Ranking by Completion', margin, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Rank', 'Section', 'Completion', 'Maturity', 'Status']],
    body: sortedSections.map((s, i) => [
      `#${i + 1}`,
      s.name,
      `${s.completion}%`,
      s.maturity.toFixed(2),
      s.completion >= 75 ? 'On Track' : s.completion >= 50 ? 'In Progress' : 'Needs Attention'
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9,
      halign: 'center'
    },
    didDrawCell: (hookData) => {
      if (hookData.column.index === 4 && hookData.section === 'body') {
        const status = hookData.cell.text[0];
        if (status === 'On Track') {
          hookData.cell.styles.textColor = [16, 185, 129];
        } else if (status === 'In Progress') {
          hookData.cell.styles.textColor = [245, 158, 11];
        } else {
          hookData.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
    margin: { left: margin, right: margin }
  });

  // ========== Footer on all pages ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('Index Tracking System', margin, pageHeight - 10);
    doc.text(reportDate, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Save
  doc.save(`${data.indexCode}_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ============================================================================
// Excel Export - Enhanced
// ============================================================================

export async function exportToExcel(data: PDFExportData) {
  const workbook = XLSX.utils.book_new();
  const isArabic = data.lang === 'ar';

  // ========== Sheet 1: Executive Summary ==========
  const totalReqs = data.sections.reduce((sum, s) => sum + s.requirementCount, 0);
  const avgCompletion = data.sections.length > 0
    ? (data.sections.reduce((sum, s) => sum + s.completion, 0) / data.sections.length)
    : 0;
  const avgMaturity = data.sections.length > 0
    ? (data.sections.reduce((sum, s) => sum + s.maturity, 0) / data.sections.length)
    : 0;
  const totalUploads = data.userEngagement.reduce((sum, u) => sum + u.totalUploads, 0);
  const totalApproved = data.userEngagement.reduce((sum, u) => sum + u.approvedDocuments, 0);
  const totalRejected = data.userEngagement.reduce((sum, u) => sum + u.rejectedDocuments, 0);
  const totalComments = data.userEngagement.reduce((sum, u) => sum + u.totalComments, 0);

  const summaryData = [
    ['INDEX MATURITY REPORT'],
    [''],
    ['Report Generated:', new Date().toLocaleDateString()],
    ['Index Name:', data.indexName],
    ['Index Code:', data.indexCode],
    ['Index Type:', data.indexType || 'N/A'],
    [''],
    ['MATURITY METRICS'],
    ['Overall Maturity Level:', data.overallMaturity.toFixed(2), '/ 5.00', `${((data.overallMaturity / 5) * 100).toFixed(1)}%`],
    ['Average Section Maturity:', avgMaturity.toFixed(2)],
    ['Average Completion:', `${avgCompletion.toFixed(1)}%`],
    [''],
    ['SCOPE METRICS'],
    ['Total Sections:', data.sections.length],
    ['Total Requirements:', totalReqs],
    ['Team Members:', data.userEngagement.length],
    [''],
    ['ENGAGEMENT METRICS'],
    ['Total Documents Uploaded:', totalUploads],
    ['Documents Approved:', totalApproved],
    ['Documents Rejected:', totalRejected],
    ['Approval Rate:', totalUploads > 0 ? `${((totalApproved / totalUploads) * 100).toFixed(1)}%` : '0%'],
    ['Total Comments:', totalComments],
    [''],
    ['TOP 5 SECTIONS BY COMPLETION'],
    ['Section', 'Completion %', 'Maturity', 'Requirements'],
    ...data.sections
      .sort((a, b) => b.completion - a.completion)
      .slice(0, 5)
      .map(s => [s.name, `${s.completion}%`, s.maturity.toFixed(2), s.requirementCount]),
    [''],
    ['TOP 5 CONTRIBUTORS BY UPLOADS'],
    ['Name', 'Uploads', 'Approved', 'Success Rate'],
    ...data.userEngagement
      .sort((a, b) => b.totalUploads - a.totalUploads)
      .slice(0, 5)
      .map(u => [
        u.fullName || u.username,
        u.totalUploads,
        u.approvedDocuments,
        u.totalUploads > 0 ? `${((u.approvedDocuments / u.totalUploads) * 100).toFixed(1)}%` : '0%'
      ])
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // ========== Sheet 2: Sections Detail ==========
  const sectionsData = [
    ['SECTION ANALYSIS'],
    [''],
    ['#', 'Section Name', 'Maturity Level', 'Maturity %', 'Completion %', 'Requirements', 'Status'],
    ...data.sections.map((s, i) => [
      i + 1,
      s.name,
      s.maturity.toFixed(2),
      `${((s.maturity / 5) * 100).toFixed(1)}%`,
      `${s.completion}%`,
      s.requirementCount,
      s.completion >= 75 ? 'On Track' : s.completion >= 50 ? 'In Progress' : 'Needs Attention'
    ]),
    [''],
    ['Summary Statistics'],
    ['Total Sections:', data.sections.length],
    ['Average Maturity:', avgMaturity.toFixed(2)],
    ['Average Completion:', `${avgCompletion.toFixed(1)}%`],
    ['Total Requirements:', totalReqs]
  ];

  const sectionsSheet = XLSX.utils.aoa_to_sheet(sectionsData);
  sectionsSheet['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, sectionsSheet, 'Sections');

  // ========== Sheet 3: User Engagement - Owners ==========
  const owners = data.userEngagement.filter(u => u.role?.toUpperCase() === 'OWNER');
  if (owners.length > 0) {
    const ownersData = [
      ['OWNERS ENGAGEMENT'],
      [''],
      ['#', 'Username', 'Full Name', 'Assigned', 'Uploads', 'Approved', 'Rejected', 'Reviewed', 'Comments', 'Success Rate'],
      ...owners.map((u, i) => [
        i + 1,
        u.username,
        u.fullName,
        u.assignedRequirements,
        u.totalUploads,
        u.approvedDocuments,
        u.rejectedDocuments,
        u.documentsReviewed || 0,
        u.totalComments,
        u.totalUploads > 0 ? `${((u.approvedDocuments / u.totalUploads) * 100).toFixed(1)}%` : '0%'
      ])
    ];
    const ownersSheet = XLSX.utils.aoa_to_sheet(ownersData);
    ownersSheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, ownersSheet, 'Owners');
  }

  // ========== Sheet 4: User Engagement - Supervisors ==========
  const supervisors = data.userEngagement.filter(u => u.role?.toUpperCase() === 'SUPERVISOR');
  if (supervisors.length > 0) {
    const supervisorsData = [
      ['SUPERVISORS ENGAGEMENT'],
      [''],
      ['#', 'Username', 'Full Name', 'Assigned', 'Uploads', 'Approved', 'Rejected', 'Reviewed', 'Comments', 'Success Rate'],
      ...supervisors.map((u, i) => [
        i + 1,
        u.username,
        u.fullName,
        u.assignedRequirements,
        u.totalUploads,
        u.approvedDocuments,
        u.rejectedDocuments,
        u.documentsReviewed || 0,
        u.totalComments,
        u.totalUploads > 0 ? `${((u.approvedDocuments / u.totalUploads) * 100).toFixed(1)}%` : '0%'
      ])
    ];
    const supervisorsSheet = XLSX.utils.aoa_to_sheet(supervisorsData);
    supervisorsSheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, supervisorsSheet, 'Supervisors');
  }

  // ========== Sheet 5: User Engagement - Contributors ==========
  const contributors = data.userEngagement.filter(u => u.role?.toUpperCase() === 'CONTRIBUTOR');
  if (contributors.length > 0) {
    const contributorsData = [
      ['CONTRIBUTORS ENGAGEMENT'],
      [''],
      ['#', 'Username', 'Full Name', 'Assigned', 'Uploads', 'Drafts', 'Submitted', 'Approved', 'Comments', 'Tasks Done'],
      ...contributors.map((u, i) => [
        i + 1,
        u.username,
        u.fullName,
        u.assignedRequirements,
        u.totalUploads,
        u.draftDocuments || 0,
        u.submittedDocuments || 0,
        u.approvedDocuments,
        u.totalComments,
        u.checklistItemsCompleted || 0
      ])
    ];
    const contributorsSheet = XLSX.utils.aoa_to_sheet(contributorsData);
    contributorsSheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, contributorsSheet, 'Contributors');
  }

  // ========== Sheet 6: All Requirements ==========
  const requirementsData = [
    ['REQUIREMENTS LIST'],
    [''],
    ['#', 'Code', 'Section', 'Question', 'Maturity Level', 'Status'],
    ...data.requirements.map((r, i) => [
      i + 1,
      r.id,
      r.section,
      isArabic ? r.question : (r.question_en || r.question),
      r.current_level,
      r.answer_status || 'Not Set'
    ])
  ];

  const requirementsSheet = XLSX.utils.aoa_to_sheet(requirementsData);
  requirementsSheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 60 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, requirementsSheet, 'Requirements');

  // ========== Sheet 7: Evidence Statistics ==========
  if (data.evidenceStats) {
    const evidenceData = [
      ['EVIDENCE STATISTICS'],
      [''],
      ['Status', 'Count', 'Percentage'],
      ['Approved', data.evidenceStats.approved, data.evidenceStats.total > 0 ? `${((data.evidenceStats.approved / data.evidenceStats.total) * 100).toFixed(1)}%` : '0%'],
      ['Under Revision', data.evidenceStats.underRevision, data.evidenceStats.total > 0 ? `${((data.evidenceStats.underRevision / data.evidenceStats.total) * 100).toFixed(1)}%` : '0%'],
      ['Draft', data.evidenceStats.draft, data.evidenceStats.total > 0 ? `${((data.evidenceStats.draft / data.evidenceStats.total) * 100).toFixed(1)}%` : '0%'],
      ['Rejected', data.evidenceStats.rejected, data.evidenceStats.total > 0 ? `${((data.evidenceStats.rejected / data.evidenceStats.total) * 100).toFixed(1)}%` : '0%'],
      [''],
      ['Total Evidence Files', data.evidenceStats.total]
    ];

    const evidenceSheet = XLSX.utils.aoa_to_sheet(evidenceData);
    evidenceSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, evidenceSheet, 'Evidence Stats');
  }

  // Save
  XLSX.writeFile(workbook, `${data.indexCode}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ============================================================================
// PowerPoint Export - Enhanced
// ============================================================================

export async function exportToPowerPoint(data: PDFExportData) {
  const pptx = new PptxGenJS();
  const isArabic = data.lang === 'ar';

  // Presentation settings
  pptx.author = 'Index Tracking System';
  pptx.company = data.indexName;
  pptx.title = 'Index Maturity Report';
  pptx.subject = `Report for ${data.indexCode}`;

  const totalReqs = data.sections.reduce((sum, s) => sum + s.requirementCount, 0);
  const avgCompletion = data.sections.length > 0
    ? (data.sections.reduce((sum, s) => sum + s.completion, 0) / data.sections.length)
    : 0;

  // ========== Slide 1: Title Slide ==========
  const slide1 = pptx.addSlide();
  slide1.background = { color: '3B82F6' };

  slide1.addText('Index Maturity Report', {
    x: 0.5, y: 1.8, w: 9, h: 1,
    fontSize: 44, bold: true, color: 'FFFFFF', align: 'center'
  });

  slide1.addText(data.indexName, {
    x: 0.5, y: 3.0, w: 9, h: 0.6,
    fontSize: 24, color: 'FFFFFF', align: 'center'
  });

  slide1.addText(data.indexCode, {
    x: 0.5, y: 3.7, w: 9, h: 0.4,
    fontSize: 18, color: 'DBEAFE', align: 'center'
  });

  slide1.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), {
    x: 0.5, y: 4.3, w: 9, h: 0.3,
    fontSize: 14, color: 'BFDBFE', align: 'center'
  });

  // ========== Slide 2: Executive Summary ==========
  const slide2 = pptx.addSlide();

  slide2.addText('Executive Summary', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: '1E40AF'
  });

  // Maturity Score Card
  slide2.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 1.0, w: 3.0, h: 2.0,
    fill: { color: 'EFF6FF' },
    line: { color: '3B82F6', width: 2 }
  });

  slide2.addText('Overall Maturity', {
    x: 0.5, y: 1.2, w: 3.0, h: 0.4,
    fontSize: 12, bold: true, color: '1E40AF', align: 'center'
  });

  slide2.addText(data.overallMaturity.toFixed(2), {
    x: 0.5, y: 1.6, w: 3.0, h: 0.8,
    fontSize: 48, bold: true, color: '3B82F6', align: 'center'
  });

  slide2.addText('/ 5.00', {
    x: 0.5, y: 2.5, w: 3.0, h: 0.3,
    fontSize: 14, color: '6B7280', align: 'center'
  });

  // Stats boxes
  const statsBoxes = [
    { label: 'Sections', value: data.sections.length.toString(), color: '10B981' },
    { label: 'Requirements', value: totalReqs.toString(), color: 'F59E0B' },
    { label: 'Avg Completion', value: `${avgCompletion.toFixed(1)}%`, color: '8B5CF6' },
    { label: 'Team Members', value: data.userEngagement.length.toString(), color: 'EC4899' }
  ];

  statsBoxes.forEach((stat, i) => {
    const x = 4.0 + (i % 2) * 2.8;
    const y = 1.0 + Math.floor(i / 2) * 1.1;

    slide2.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 2.5, h: 0.9,
      fill: { color: 'F9FAFB' },
      line: { color: stat.color, width: 1.5 }
    });

    slide2.addText(stat.value, {
      x, y: y + 0.1, w: 2.5, h: 0.4,
      fontSize: 22, bold: true, color: stat.color, align: 'center'
    });

    slide2.addText(stat.label, {
      x, y: y + 0.55, w: 2.5, h: 0.25,
      fontSize: 10, color: '6B7280', align: 'center'
    });
  });

  // Key Insights
  slide2.addText('Key Insights', {
    x: 0.5, y: 3.3, w: 9, h: 0.4,
    fontSize: 14, bold: true, color: '1E40AF'
  });

  const insights = [
    `${data.sections.filter(s => s.completion >= 75).length} sections are on track (75%+ completion)`,
    `${data.sections.filter(s => s.completion < 50).length} sections need attention (<50% completion)`,
    `Team has uploaded ${data.userEngagement.reduce((sum, u) => sum + u.totalUploads, 0)} documents total`,
    `Overall approval rate: ${data.userEngagement.reduce((sum, u) => sum + u.totalUploads, 0) > 0 ? ((data.userEngagement.reduce((sum, u) => sum + u.approvedDocuments, 0) / data.userEngagement.reduce((sum, u) => sum + u.totalUploads, 0)) * 100).toFixed(1) : 0}%`
  ];

  insights.forEach((insight, i) => {
    slide2.addText(`• ${insight}`, {
      x: 0.7, y: 3.7 + i * 0.35, w: 8.5, h: 0.3,
      fontSize: 11, color: '374151'
    });
  });

  // ========== Slide 3: Section Performance Chart ==========
  const slide3 = pptx.addSlide();

  slide3.addText('Section Performance', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: '1E40AF'
  });

  const chartData = [
    {
      name: 'Completion %',
      labels: data.sections.map(s => s.name.length > 25 ? s.name.substring(0, 25) + '...' : s.name),
      values: data.sections.map(s => s.completion)
    },
    {
      name: 'Maturity (scaled)',
      labels: data.sections.map(s => s.name.length > 25 ? s.name.substring(0, 25) + '...' : s.name),
      values: data.sections.map(s => s.maturity * 20) // Scale to 0-100 for comparison
    }
  ];

  slide3.addChart(pptx.ChartType.bar, chartData, {
    x: 0.3, y: 1.0, w: 9.4, h: 4.2,
    barDir: 'bar',
    barGrouping: 'clustered',
    chartColors: ['10B981', '3B82F6'],
    showLegend: true,
    legendPos: 'b',
    valAxisMaxVal: 100,
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 10,
    showValue: false,
    valGridLine: { style: 'dash', color: 'E5E7EB' }
  });

  // ========== Slide 4: Section Details Table ==========
  const slide4 = pptx.addSlide();

  slide4.addText('Section Analysis', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: '1E40AF'
  });

  const sectionTableRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Section', options: { bold: true, fill: '3B82F6', color: 'FFFFFF', align: 'center' } },
      { text: 'Maturity', options: { bold: true, fill: '3B82F6', color: 'FFFFFF', align: 'center' } },
      { text: 'Completion', options: { bold: true, fill: '3B82F6', color: 'FFFFFF', align: 'center' } },
      { text: 'Requirements', options: { bold: true, fill: '3B82F6', color: 'FFFFFF', align: 'center' } },
      { text: 'Status', options: { bold: true, fill: '3B82F6', color: 'FFFFFF', align: 'center' } }
    ],
    ...data.sections.slice(0, 10).map(s => {
      const status = s.completion >= 75 ? 'On Track' : s.completion >= 50 ? 'In Progress' : 'Needs Attention';
      const statusColor = s.completion >= 75 ? '10B981' : s.completion >= 50 ? 'F59E0B' : 'EF4444';
      return [
        { text: s.name, options: { align: 'left' } },
        { text: s.maturity.toFixed(2), options: { align: 'center' } },
        { text: `${s.completion}%`, options: { align: 'center', color: statusColor } },
        { text: s.requirementCount.toString(), options: { align: 'center' } },
        { text: status, options: { align: 'center', color: statusColor, bold: true } }
      ];
    })
  ];

  slide4.addTable(sectionTableRows, {
    x: 0.3, y: 1.0, w: 9.4, h: 4.0,
    fontSize: 10,
    border: { pt: 0.5, color: 'E5E7EB' },
    colW: [3.5, 1.2, 1.3, 1.4, 1.5]
  });

  // ========== Slide 5: Team Performance ==========
  const slide5 = pptx.addSlide();

  slide5.addText('Team Engagement', {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 28, bold: true, color: '1E40AF'
  });

  const topUsers = [...data.userEngagement]
    .sort((a, b) => b.totalUploads - a.totalUploads)
    .slice(0, 8);

  const userChartData = [
    {
      name: 'Uploads',
      labels: topUsers.map(u => (u.fullName || u.username).split(' ')[0]),
      values: topUsers.map(u => u.totalUploads)
    },
    {
      name: 'Approved',
      labels: topUsers.map(u => (u.fullName || u.username).split(' ')[0]),
      values: topUsers.map(u => u.approvedDocuments)
    }
  ];

  slide5.addChart(pptx.ChartType.bar, userChartData, {
    x: 0.3, y: 1.0, w: 9.4, h: 4.2,
    barDir: 'col',
    barGrouping: 'clustered',
    chartColors: ['8B5CF6', '10B981'],
    showLegend: true,
    legendPos: 'b',
    catAxisLabelFontSize: 10,
    valAxisLabelFontSize: 10,
    showValue: false,
    valGridLine: { style: 'dash', color: 'E5E7EB' }
  });

  // ========== Slide 6: Evidence Statistics ==========
  if (data.evidenceStats && data.evidenceStats.total > 0) {
    const slide6 = pptx.addSlide();

    slide6.addText('Evidence Overview', {
      x: 0.5, y: 0.3, w: 9, h: 0.5,
      fontSize: 28, bold: true, color: '1E40AF'
    });

    const pieData = [
      {
        name: 'Status',
        labels: ['Approved', 'Under Revision', 'Draft', 'Rejected'],
        values: [
          data.evidenceStats.approved,
          data.evidenceStats.underRevision,
          data.evidenceStats.draft,
          data.evidenceStats.rejected
        ]
      }
    ];

    slide6.addChart(pptx.ChartType.pie, pieData, {
      x: 0.5, y: 1.0, w: 4.5, h: 4.0,
      chartColors: ['10B981', 'F59E0B', '9CA3AF', 'EF4444'],
      showLegend: true,
      legendPos: 'r',
      showPercent: true,
      showValue: false
    });

    // Stats summary
    const evidenceStats = [
      { label: 'Total Files', value: data.evidenceStats.total.toString(), color: '3B82F6' },
      { label: 'Approved', value: data.evidenceStats.approved.toString(), color: '10B981' },
      { label: 'Pending', value: data.evidenceStats.underRevision.toString(), color: 'F59E0B' },
      { label: 'Rejected', value: data.evidenceStats.rejected.toString(), color: 'EF4444' }
    ];

    evidenceStats.forEach((stat, i) => {
      slide6.addShape(pptx.ShapeType.roundRect, {
        x: 5.5, y: 1.0 + i * 1.0, w: 4.0, h: 0.8,
        fill: { color: 'F9FAFB' },
        line: { color: stat.color, width: 1 }
      });

      slide6.addText(stat.label, {
        x: 5.7, y: 1.1 + i * 1.0, w: 2.0, h: 0.6,
        fontSize: 12, color: '6B7280', valign: 'middle'
      });

      slide6.addText(stat.value, {
        x: 7.5, y: 1.1 + i * 1.0, w: 1.8, h: 0.6,
        fontSize: 20, bold: true, color: stat.color, align: 'right', valign: 'middle'
      });
    });
  }

  // ========== Slide 7: Thank You ==========
  const slideEnd = pptx.addSlide();
  slideEnd.background = { color: '1E40AF' };

  slideEnd.addText('Thank You', {
    x: 0.5, y: 2.0, w: 9, h: 1,
    fontSize: 48, bold: true, color: 'FFFFFF', align: 'center'
  });

  slideEnd.addText('Questions & Discussion', {
    x: 0.5, y: 3.2, w: 9, h: 0.5,
    fontSize: 20, color: 'BFDBFE', align: 'center'
  });

  slideEnd.addText(`${data.indexName} | ${data.indexCode}`, {
    x: 0.5, y: 4.5, w: 9, h: 0.3,
    fontSize: 12, color: 'DBEAFE', align: 'center'
  });

  // Save
  pptx.writeFile({ fileName: `${data.indexCode}_presentation_${new Date().toISOString().split('T')[0]}.pptx` });
}
