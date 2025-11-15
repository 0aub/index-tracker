import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, Upload, FileText, Download } from 'lucide-react';
import FileUpload from './FileUpload';
import { Evidence } from '../../types';

interface EvidenceCardProps {
  level: number;
  requirementId: string;
  evidence: any[];
  status: string;
  lang: 'ar' | 'en';
}

const LEVEL_NAMES = {
  0: { ar: 'المستوى 0 - غير جاهز', en: 'Level 0 - Not Ready' },
  1: { ar: 'المستوى 1 - الوعي الأولي', en: 'Level 1 - Initial Awareness' },
  2: { ar: 'المستوى 2 - التخطيط', en: 'Level 2 - Planning' },
  3: { ar: 'المستوى 3 - التنفيذ', en: 'Level 3 - Implementation' },
  4: { ar: 'المستوى 4 - الإدارة', en: 'Level 4 - Management' },
  5: { ar: 'المستوى 5 - التحسين المستمر', en: 'Level 5 - Continuous Improvement' }
};

const STATUS_CONFIG = {
  confirmed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: { ar: 'مؤكد', en: 'Confirmed' }
  },
  submitted: {
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: { ar: 'قيد المراجعة', en: 'Under Review' }
  },
  changes_requested: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: { ar: 'يحتاج تعديل', en: 'Changes Requested' }
  },
  not_started: {
    icon: Upload,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    label: { ar: 'لم يبدأ', en: 'Not Started' }
  }
};

const EvidenceCard = ({ level, requirementId, evidence, status, lang }: EvidenceCardProps) => {
  const [isExpanded, setIsExpanded] = useState(level === 0 || level === 1);

  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;
  const StatusIcon = statusConfig.icon;

  const handleFileUpload = async (files: File[]) => {
    // Mock file upload - in real implementation, this would call an API
    console.log('Uploading files for level', level, ':', files);
    // TODO: Implement actual file upload logic
  };

  const handleDownload = (filename: string) => {
    // Mock download - in real implementation, this would download from server
    console.log('Downloading file:', filename);
    // TODO: Implement actual file download logic
  };

  return (
    <div className={`bg-white rounded-lg shadow border-2 ${statusConfig.border}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${statusConfig.bg} flex items-center justify-center`}>
            <StatusIcon className={statusConfig.color} size={24} />
          </div>
          <div className="text-right">
            <h3 className="text-lg font-semibold text-gray-900">
              {LEVEL_NAMES[level as keyof typeof LEVEL_NAMES][lang]}
            </h3>
            <p className="text-sm text-gray-600">
              {statusConfig.label[lang]} • {evidence.length} {lang === 'ar' ? 'مستند' : 'document(s)'}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {/* Evidence Description */}
          <div className="mt-4 mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              {lang === 'ar' ? 'متطلبات الأدلة' : 'Evidence Requirements'}
            </h4>
            <p className="text-sm text-gray-600">
              {lang === 'ar'
                ? `يجب تقديم الأدلة والمستندات الداعمة التي تثبت تحقيق معايير المستوى ${level}`
                : `Evidence and supporting documents must be provided to demonstrate achievement of Level ${level} criteria`}
            </p>
          </div>

          {/* Uploaded Files */}
          {evidence.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                {lang === 'ar' ? 'المستندات المرفوعة' : 'Uploaded Documents'}
              </h4>
              <div className="space-y-2">
                {evidence.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-600" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {lang === 'ar' ? 'مستند أدلة' : 'Evidence Document'} - {item.id}
                        </p>
                        <p className="text-xs text-gray-600">
                          {lang === 'ar' ? 'حالة:' : 'Status:'} {STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]?.label[lang]}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(item.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title={lang === 'ar' ? 'تحميل' : 'Download'}
                    >
                      <Download size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload Component */}
          <FileUpload
            onFilesSelected={handleFileUpload}
            maxFiles={5}
            maxSizePerFile={10}
            acceptedFileTypes={['.pdf', '.docx', '.xlsx', '.pptx']}
            lang={lang}
          />

          {/* Action Buttons */}
          {evidence.length > 0 && (
            <div className="mt-4 flex gap-3">
              {status === 'not_started' || status === 'changes_requested' ? (
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  {lang === 'ar' ? 'إرسال للمراجعة' : 'Submit for Review'}
                </button>
              ) : null}
              {status === 'submitted' && (
                <>
                  <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    {lang === 'ar' ? 'اعتماد' : 'Approve'}
                  </button>
                  <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                    {lang === 'ar' ? 'طلب تعديلات' : 'Request Changes'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvidenceCard;
