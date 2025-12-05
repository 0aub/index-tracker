import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export const exportToPDF = (title: string, data: any[], lang: 'ar' | 'en' = 'ar') => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(20);
  doc.text(title, 20, 20);

  // Add generation date
  doc.setFontSize(10);
  const date = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US');
  doc.text(`${lang === 'ar' ? 'تاريخ التوليد:' : 'Generated:'} ${date}`, 20, 30);

  // Add data summary
  doc.setFontSize(12);
  let yPosition = 50;

  if (Array.isArray(data) && data.length > 0) {
    doc.text(`${lang === 'ar' ? 'إجمالي السجلات:' : 'Total Records:'} ${data.length}`, 20, yPosition);
  }

  // Add footer
  doc.setFontSize(8);
  doc.text(
    lang === 'ar' ? 'ساهم' : 'Sahem',
    20,
    doc.internal.pageSize.height - 10
  );

  // Save the PDF
  doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

export const exportToExcel = (sheetName: string, data: any[], filename: string) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate filename with timestamp
  const file = `${filename}_${Date.now()}.xlsx`;

  // Save file
  XLSX.writeFile(wb, file);
};

export const generateDashboardPDF = (dashboardData: any, lang: 'ar' | 'en' = 'ar') => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(24);
  doc.text(
    lang === 'ar' ? 'تقرير ساهم' : 'Sahem Report',
    20,
    20
  );

  // Date
  doc.setFontSize(10);
  const date = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(date, 20, 30);

  // Overall Maturity Score
  doc.setFontSize(16);
  doc.text(
    `${lang === 'ar' ? 'النضج الإجمالي:' : 'Overall Maturity:'} ${dashboardData.overallScore?.toFixed(2) || '0.00'} ${lang === 'ar' ? 'من 5.00' : '/ 5.00'}`,
    20,
    50
  );

  // Statistics
  doc.setFontSize(12);
  let yPos = 70;

  if (dashboardData.totalRequirements) {
    doc.text(
      `${lang === 'ar' ? 'إجمالي المتطلبات:' : 'Total Requirements:'} ${dashboardData.totalRequirements}`,
      20,
      yPos
    );
    yPos += 10;
  }

  if (dashboardData.completionPercentage !== undefined) {
    doc.text(
      `${lang === 'ar' ? 'نسبة الإنجاز:' : 'Completion Rate:'} ${dashboardData.completionPercentage}%`,
      20,
      yPos
    );
    yPos += 10;
  }

  // Footer
  doc.setFontSize(8);
  doc.text(
    lang === 'ar'
      ? '© 2025 ساهم - جميع الحقوق محفوظة'
      : '© 2025 Sahem - All Rights Reserved',
    20,
    doc.internal.pageSize.height - 10
  );

  doc.save(`AI_Index_Report_${Date.now()}.pdf`);
};

export const generateRequirementsExcel = (requirements: any[], lang: 'ar' | 'en' = 'ar') => {
  const data = requirements.map(req => ({
    [lang === 'ar' ? 'الرمز' : 'Code']: req.id,
    [lang === 'ar' ? 'السؤال' : 'Question']: lang === 'ar' ? req.question : req.question_en,
    [lang === 'ar' ? 'القسم' : 'Section']: req.section,
    [lang === 'ar' ? 'المستوى الحالي' : 'Current Level']: req.current_level,
    [lang === 'ar' ? 'المستوى المستهدف' : 'Target Level']: req.target_level || '-',
    [lang === 'ar' ? 'المسؤول' : 'Assigned To']: req.assigned_to,
    [lang === 'ar' ? 'الموعد النهائي' : 'Due Date']: new Date(req.due_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')
  }));

  exportToExcel(
    lang === 'ar' ? 'المتطلبات' : 'Requirements',
    data,
    'Requirements_Export'
  );
};
