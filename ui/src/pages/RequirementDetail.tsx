import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Calendar, CheckCircle2, Circle, Upload, FileText,
  Clock, MessageSquare, ChevronDown, ChevronUp, CheckSquare, Trash2, Download, X, History, Loader2, AlertCircle
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore} from '../stores/authStore';
import { useIndexStore } from '../stores/indexStore';
import toast from 'react-hot-toast';
import { api, Requirement, AssignmentWithUser } from '../services/api';
import { colors, patterns } from '../utils/darkMode';

// Document status type
type DocumentStatus = 'draft' | 'submitted' | 'confirmed' | 'approved';

// Review history for a document
interface ReviewHistory {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  action: 'uploaded_draft' | 'uploaded_version' | 'submitted' | 'confirmed' | 'rejected' | 'approved';
  version: number;  // Which version this action refers to
  comment?: string;
  timestamp: string;
}

// Version of a document
interface DocumentVersion {
  version: number;
  filename: string;
  file_size?: number;
  uploaded_by: string;
  uploaded_at: string;
  comment?: string;
}

// Document with version history
interface UploadedDoc {
  id: string;
  document_name: string;  // Base name without version suffix
  current_version: number;
  status: DocumentStatus;
  versions: DocumentVersion[];
  review_history: ReviewHistory[];  // Track all review actions
}

// Get level criteria structure (mock for now - TODO: should come from backend based on requirement's maturity_levels)
const getMockLevelCriteria = (lang: 'ar' | 'en') => {
  return [
    {
      level: 0,
      title: lang === 'ar' ? 'المستوى 0: غير موجود' : 'Level 0: Non-existent',
      description: lang === 'ar' ? 'لا توجد أي جهود أو خطط' : 'No efforts or plans exist',
      acceptance_criteria: [],
      required_documents: []
    },
    {
      level: 1,
      title: lang === 'ar' ? 'المستوى 1: مبدئي' : 'Level 1: Initial',
      description: lang === 'ar'
        ? 'يوجد إدراك أولي بأهمية الذكاء الاصطناعي ومبادرات استكشافية محدودة'
        : 'Initial awareness of AI importance with limited exploratory initiatives',
      acceptance_criteria: lang === 'ar'
        ? [
            'يوجد نقاش داخل القيادة حول أهمية الذكاء الاصطناعي',
            'تم تحديد بعض حالات الاستخدام المحتملة',
            'يوجد بعض الموظفين المهتمين بالذكاء الاصطناعي'
          ]
        : [
            'Leadership discussions about AI importance exist',
            'Some potential use cases have been identified',
            'Some employees interested in AI exist'
          ],
      required_documents: [
        {
          name: lang === 'ar' ? 'محضر اجتماع القيادة حول الذكاء الاصطناعي' : 'Leadership meeting minutes about AI',
          description: lang === 'ar' ? 'محضر يوضح نقاش القيادة' : 'Minutes showing leadership discussion',
          mandatory: true
        },
        {
          name: lang === 'ar' ? 'قائمة حالات الاستخدام المحتملة' : 'Potential use cases list',
          description: lang === 'ar' ? 'وثيقة تحتوي على حالات استخدام محتملة' : 'Document containing potential use cases',
          mandatory: true
        }
      ]
    },
    {
      level: 2,
      title: lang === 'ar' ? 'المستوى 2: متكرر' : 'Level 2: Repeatable',
      description: lang === 'ar'
        ? 'يوجد خطة استراتيجية مبدئية موثقة للذكاء الاصطناعي'
        : 'Initial documented AI strategic plan exists',
      acceptance_criteria: lang === 'ar'
        ? [
            'يوجد وثيقة استراتيجية للذكاء الاصطناعي معتمدة من القيادة',
            'تم تحديد الأهداف الاستراتيجية للذكاء الاصطناعي',
            'تم تخصيص ميزانية مبدئية',
            'تم تعيين فريق أو مسؤول للذكاء الاصطناعي'
          ]
        : [
            'AI strategy document approved by leadership',
            'AI strategic objectives defined',
            'Initial budget allocated',
            'AI team or officer appointed'
          ],
      required_documents: [
        {
          name: lang === 'ar' ? 'وثيقة الاستراتيجية للذكاء الاصطناعي' : 'AI Strategy Document',
          description: lang === 'ar' ? 'استراتيجية معتمدة من القيادة العليا' : 'Strategy approved by senior leadership',
          mandatory: true
        },
        {
          name: lang === 'ar' ? 'قرار تعيين فريق الذكاء الاصطناعي' : 'AI Team Appointment Decision',
          description: lang === 'ar' ? 'قرار رسمي بتعيين فريق أو مسؤول' : 'Official team appointment decision',
          mandatory: true
        },
        {
          name: lang === 'ar' ? 'وثيقة الميزانية المخصصة' : 'Budget Allocation Document',
          mandatory: false
        }
      ]
    },
    {
      level: 3,
      title: lang === 'ar' ? 'المستوى 3: محدد' : 'Level 3: Defined',
      description: lang === 'ar'
        ? 'استراتيجية الذكاء الاصطناعي مفصلة ومتكاملة مع الاستراتيجية المؤسسية'
        : 'AI strategy is detailed and integrated with organizational strategy',
      acceptance_criteria: lang === 'ar'
        ? [
            'الاستراتيجية متكاملة مع الاستراتيجية المؤسسية',
            'يوجد خارطة طريق واضحة للتنفيذ',
            'تم تحديد مؤشرات الأداء الرئيسية (KPIs)',
            'يوجد آليات للمراجعة والتحديث الدوري'
          ]
        : [
            'Strategy integrated with organizational strategy',
            'Clear implementation roadmap exists',
            'Key Performance Indicators (KPIs) defined',
            'Regular review and update mechanisms exist'
          ],
      required_documents: [
        {
          name: lang === 'ar' ? 'خارطة الطريق التفصيلية' : 'Detailed Roadmap',
          mandatory: true
        },
        {
          name: lang === 'ar' ? 'وثيقة مؤشرات الأداء' : 'KPIs Document',
          mandatory: true
        },
        {
          name: lang === 'ar' ? 'إطار الحوكمة والمراجعة' : 'Governance and Review Framework',
          mandatory: true
        }
      ]
    },
    {
      level: 4,
      title: lang === 'ar' ? 'المستوى 4: مُدار' : 'Level 4: Managed',
      description: lang === 'ar'
        ? 'يتم قياس وإدارة تنفيذ الاستراتيجية بشكل منتظم'
        : 'Strategy implementation is regularly measured and managed',
      acceptance_criteria: lang === 'ar'
        ? [
            'يتم قياس مؤشرات الأداء بشكل دوري',
            'يوجد تقارير منتظمة للقيادة',
            'يتم تعديل الاستراتيجية بناءً على النتائج',
            'يوجد أدلة على التحسين المستمر'
          ]
        : [
            'KPIs measured regularly',
            'Regular leadership reports exist',
            'Strategy adjusted based on results',
            'Evidence of continuous improvement'
          ],
      required_documents: [
        {
          name: lang === 'ar' ? 'تقارير الأداء الدورية' : 'Periodic Performance Reports',
          mandatory: true
        },
        {
          name: lang === 'ar' ? 'وثائق التحديثات الاستراتيجية' : 'Strategy Update Documents',
          mandatory: true
        }
      ]
    },
    {
      level: 5,
      title: lang === 'ar' ? 'المستوى 5: مُحسّن' : 'Level 5: Optimized',
      description: lang === 'ar'
        ? 'استراتيجية الذكاء الاصطناعي متطورة وتتم مراجعتها وتحسينها بشكل مستمر'
        : 'AI strategy is mature and continuously reviewed and improved',
      acceptance_criteria: lang === 'ar'
        ? [
            'الاستراتيجية تعتبر أفضل ممارسة في المجال',
            'يوجد نظام متطور للتحسين المستمر',
            'يوجد مشاركة في المعايير والمبادرات الوطنية/الدولية',
            'يتم قياس الأثر الفعلي على الأعمال'
          ]
        : [
            'Strategy considered best practice',
            'Advanced continuous improvement system',
            'Participation in national/international standards',
            'Actual business impact measured'
          ],
      required_documents: [
        {
          name: lang === 'ar' ? 'تقييم النضج والتحسين المستمر' : 'Maturity Assessment Report',
          mandatory: true
        },
        {
          name: lang === 'ar' ? 'شهادات المشاركة في المبادرات' : 'Initiative Participation Certificates',
          mandatory: false
        }
      ]
    }
  ];
};

const mockActivities = [
  {
    id: 'act-001',
    level: 2,
    action_type: 'document_uploaded',
    actor_name: 'أحمد محمد',
    actor_name_en: 'Ahmed Mohammed',
    description: 'تم رفع وثيقة: وثيقة الاستراتيجية للذكاء الاصطناعي (AI_Strategy_v1.pdf)',
    description_en: 'Uploaded document: AI Strategy Document (AI_Strategy_v1.pdf)',
    timestamp: '2025-01-15T10:30:00Z'
  },
  {
    id: 'act-002',
    level: 2,
    action_type: 'comment_added',
    actor_name: 'فاطمة علي',
    actor_name_en: 'Fatima Ali',
    description: 'أضافت تعليق: الوثيقة تحتاج لمراجعة القسم المالي',
    description_en: 'Added comment: Document needs finance review',
    timestamp: '2025-01-14T14:20:00Z'
  },
  {
    id: 'act-003',
    level: 2,
    action_type: 'document_uploaded',
    actor_name: 'سارة خالد',
    actor_name_en: 'Sara Khaled',
    description: 'تم رفع وثيقة: قرار تعيين فريق الذكاء الاصطناعي (Team_Appointment.pdf)',
    description_en: 'Uploaded document: AI Team Appointment Decision (Team_Appointment.pdf)',
    timestamp: '2025-01-12T09:15:00Z'
  },
  {
    id: 'act-004',
    level: 1,
    action_type: 'level_achieved',
    actor_name: 'النظام',
    actor_name_en: 'System',
    description: 'تم تحقيق المستوى 1 بنجاح - جميع المتطلبات مستوفاة',
    description_en: 'Level 1 achieved successfully - all requirements met',
    timestamp: '2025-01-10T09:00:00Z'
  },
  {
    id: 'act-005',
    level: 1,
    action_type: 'document_uploaded',
    actor_name: 'أحمد محمد',
    actor_name_en: 'Ahmed Mohammed',
    description: 'تم رفع وثيقة: قائمة حالات الاستخدام (Use_Cases.pdf)',
    description_en: 'Uploaded document: Use Cases List (Use_Cases.pdf)',
    timestamp: '2025-01-08T11:20:00Z'
  }
];

const RequirementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useUIStore();
  const { user } = useAuthStore();
  const { currentIndex } = useIndexStore();
  const lang = language;

  // Data states
  const [requirement, setRequirement] = useState<any>(null);
  const [assignees, setAssignees] = useState<AssignmentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI states
  const [expandedLevels, setExpandedLevels] = useState<number[]>([]);
  const [showActivities, setShowActivities] = useState(false);
  const [uploadingToLevel, setUploadingToLevel] = useState<number | null>(null);
  const [uploadingVersionForDoc, setUploadingVersionForDoc] = useState<string | null>(null);
  const [uploadComment, setUploadComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Record<number, UploadedDoc[]>>({});
  const [expandedDocVersions, setExpandedDocVersions] = useState<Record<string, boolean>>({});
  const [rejectingDoc, setRejectingDoc] = useState<{ level: number; docId: string } | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [showReviewHistory, setShowReviewHistory] = useState<{ level: number; docId: string } | null>(null);
  const [manuallyCompletedLevels, setManuallyCompletedLevels] = useState<number[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Fetch requirement data
  useEffect(() => {
    const loadRequirement = async () => {
      if (!id) {
        setError('No requirement ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch requirement details
        const reqData = await api.requirements.getById(id);

        // Fetch assignments for this requirement
        const assignmentsData = await api.assignments.getByRequirement(id);

        // Fetch evidence for this requirement
        const evidenceData = await api.evidence.getAll({ requirement_id: id });

        // Get current level from assignments (highest level)
        const currentLevel = assignmentsData.length > 0
          ? Math.max(...assignmentsData.map(a => a.current_level ? parseInt(a.current_level) : 0))
          : 0;

        // Transform to include level criteria (mock for now - TODO: get from backend)
        const transformedReq = {
          id: reqData.code,
          question: lang === 'ar' ? reqData.question_ar : reqData.question_en || reqData.question_ar,
          section: lang === 'ar' ? reqData.main_area_ar : reqData.main_area_en || reqData.main_area_ar,
          current_level: currentLevel,
          due_date: new Date().toISOString(), // TODO: Get from backend
          assignees: assignmentsData.map(a => a.user_id),
          level_criteria: getMockLevelCriteria(lang) // Using mock criteria for now
        };

        // Transform evidence data to match UI structure
        const docsGroupedByLevel: Record<number, UploadedDoc[]> = {};
        for (const evidence of evidenceData) {
          const evidenceDetails = await api.evidence.getById(evidence.id);
          const transformedDoc: UploadedDoc = {
            id: evidence.id,
            document_name: evidence.document_name,
            current_version: evidence.current_version,
            status: evidence.status as DocumentStatus,
            versions: evidenceDetails.versions.map(v => ({
              version: v.version_number,
              filename: v.filename,
              file_size: v.file_size || undefined,
              uploaded_by: v.uploaded_by,
              uploaded_at: v.uploaded_at,
              comment: v.upload_comment || undefined
            })),
            review_history: evidenceDetails.activities.map(a => ({
              id: a.id,
              reviewer_id: a.actor_id,
              reviewer_name: a.actor_id, // TODO: Get actual name from user
              action: a.action as any,
              version: a.version_number || 0,
              comment: a.comment || undefined,
              timestamp: a.created_at
            }))
          };

          if (!docsGroupedByLevel[evidence.maturity_level]) {
            docsGroupedByLevel[evidence.maturity_level] = [];
          }
          docsGroupedByLevel[evidence.maturity_level].push(transformedDoc);
        }

        setRequirement(transformedReq);
        setAssignees(assignmentsData);
        setDocuments(docsGroupedByLevel);
        setExpandedLevels([currentLevel]);

        // Initialize manually completed levels from database
        // Mark all levels up to and including current level as completed
        if (currentLevel > 0) {
          // Create array of all levels from 1 to currentLevel
          const completedLevels = Array.from({ length: currentLevel }, (_, i) => i + 1);
          setManuallyCompletedLevels(completedLevels);
        }

        // Load all activities
        const allActivities = evidenceData.flatMap(e => e.id).slice(0, 10); // Get recent activities
        // TODO: Load activities properly from backend
        setActivities([]);
      } catch (err: any) {
        console.error('Failed to load requirement:', err);
        setError(err.message || 'Failed to load requirement');
        toast.error(lang === 'ar' ? 'فشل تحميل المتطلب' : 'Failed to load requirement');
      } finally {
        setLoading(false);
      }
    };

    loadRequirement();
  }, [id, lang]);

  // Auto-expand the current level when requirement loads
  useEffect(() => {
    if (requirement) {
      setExpandedLevels([requirement.current_level]);
    }
  }, [requirement?.current_level]);

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleLevelCompletion = async (level: number) => {
    try {
      // Check if there are any assignees
      if (assignees.length === 0) {
        toast.error(lang === 'ar'
          ? 'يجب تعيين مسؤولين للمتطلب أولاً'
          : 'Please assign users to this requirement first');
        return;
      }

      const isCurrentlyCompleted = manuallyCompletedLevels.includes(level);

      // Calculate new completed levels
      let newCompletedLevels: number[];
      if (isCurrentlyCompleted) {
        // Removing this level - remove it and all levels above it
        newCompletedLevels = manuallyCompletedLevels.filter(l => l < level);
      } else {
        // Adding this level - add all levels up to this one
        const levelsToAdd = Array.from({ length: level }, (_, i) => i + 1);
        newCompletedLevels = Array.from(new Set([...manuallyCompletedLevels, ...levelsToAdd])).sort((a, b) => a - b);
      }

      // The highest completed level becomes the new current_level
      const newCurrentLevel = newCompletedLevels.length > 0 ? Math.max(...newCompletedLevels) : 0;

      // Update all assignments for this requirement to the new highest level
      const updatePromises = assignees.map(assignee =>
        api.assignments.update(assignee.id, {
          current_level: newCurrentLevel.toString()
        })
      );

      await Promise.all(updatePromises);

      // Update local state after successful backend update
      setManuallyCompletedLevels(newCompletedLevels);

      if (isCurrentlyCompleted) {
        toast.success(lang === 'ar' ? 'تم إلغاء اكتمال المستوى' : 'Level completion removed');
      } else {
        toast.success(lang === 'ar' ? 'تم تحديد المستوى كمكتمل' : 'Level marked as completed');
      }

      // Also update the requirement current level in local state
      if (requirement) {
        setRequirement({
          ...requirement,
          current_level: newCurrentLevel
        });
      }
    } catch (err: any) {
      console.error('Failed to update level:', err);
      toast.error(lang === 'ar' ? 'فشل تحديث المستوى' : 'Failed to update level');
    }
  };

  const getLevelStatus = (level: number): 'completed' | 'current' | 'pending' => {
    // Check if manually marked as completed by admin
    if (manuallyCompletedLevels.includes(level)) return 'completed';
    // Otherwise use current level logic
    if (level < requirement.current_level) return 'completed';
    if (level === requirement.current_level) return 'current';
    return 'pending';
  };

  const getLevelStatusColor = (status: 'completed' | 'current' | 'pending') => {
    if (status === 'completed') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'current') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600';
    return 'bg-gray-100 text-gray-600 border-gray-300';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'level_achieved':
        return <CheckCircle2 className="text-green-600" size={20} />;
      case 'document_uploaded':
        return <Upload className="text-green-600 dark:text-green-400" size={20} />;
      case 'document_removed':
        return <Trash2 className="text-red-600" size={20} />;
      case 'comment_added':
        return <MessageSquare className="text-purple-600" size={20} />;
      default:
        return <Clock className="text-gray-600" size={20} />;
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'level_achieved': return 'bg-green-100';
      case 'document_uploaded': return 'bg-green-100 dark:bg-green-900';
      case 'document_removed': return 'bg-red-100';
      case 'comment_added': return 'bg-purple-100';
      default: return 'bg-gray-100';
    }
  };

  const getDocumentStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2 py-1 bg-gray-200 dark:bg-[#313236] text-gray-700 dark:text-gray-300 text-xs font-medium rounded">
            {lang === 'ar' ? 'مسودة' : 'Draft'}
          </span>
        );
      case 'submitted':
        return (
          <span className="px-2 py-1 bg-green-200 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium rounded">
            {lang === 'ar' ? 'مرسل للمراجعة' : 'Submitted'}
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2 py-1 bg-green-200 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium rounded">
            {lang === 'ar' ? 'مؤكد' : 'Confirmed'}
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 bg-green-700 dark:bg-green-600 text-white text-xs font-bold rounded">
            {lang === 'ar' ? 'معتمد' : 'Approved'}
          </span>
        );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadDocument = async (level: number, asDraft: boolean) => {
    if (!selectedFile || !user || !id) {
      toast.error(lang === 'ar' ? 'الرجاء اختيار ملف' : 'Please select a file');
      return;
    }

    try {
      // Check if we're adding a new version to an existing document
      if (uploadingVersionForDoc) {
        // Upload new version
        const newVersion = await api.evidence.uploadVersion(uploadingVersionForDoc, {
          file: selectedFile,
          uploaded_by: user.id,
          upload_comment: uploadComment || undefined
        });

        // If not draft, submit for review
        if (!asDraft) {
          await api.evidence.performAction(uploadingVersionForDoc, 'submit', user.id);
        }

        toast.success(
          lang === 'ar'
            ? `تم رفع الإصدار الجديد بنجاح`
            : `New version uploaded successfully`
        );

        // Reload evidence data
        const evidenceData = await api.evidence.getAll({ requirement_id: id });
        const docsGroupedByLevel: Record<number, UploadedDoc[]> = {};
        for (const evidence of evidenceData) {
          const evidenceDetails = await api.evidence.getById(evidence.id);
          const transformedDoc: UploadedDoc = {
            id: evidence.id,
            document_name: evidence.document_name,
            current_version: evidence.current_version,
            status: evidence.status as DocumentStatus,
            versions: evidenceDetails.versions.map(v => ({
              version: v.version_number,
              filename: v.filename,
              file_size: v.file_size || undefined,
              uploaded_by: v.uploaded_by,
              uploaded_at: v.uploaded_at,
              comment: v.upload_comment || undefined
            })),
            review_history: evidenceDetails.activities.map(a => ({
              id: a.id,
              reviewer_id: a.actor_id,
              reviewer_name: a.actor_id,
              action: a.action as any,
              version: a.version_number || 0,
              comment: a.comment || undefined,
              timestamp: a.created_at
            }))
          };
          if (!docsGroupedByLevel[evidence.maturity_level]) {
            docsGroupedByLevel[evidence.maturity_level] = [];
          }
          docsGroupedByLevel[evidence.maturity_level].push(transformedDoc);
        }
        setDocuments(docsGroupedByLevel);
      } else {
        // Creating a new document
        const newEvidence = await api.evidence.upload({
          file: selectedFile,
          requirement_id: id,
          maturity_level: level,
          document_name: selectedFile.name.replace(/\.[^/.]+$/, ''),
          uploaded_by: user.id,
          upload_comment: uploadComment || undefined
        });

        // If not draft, submit for review
        if (!asDraft) {
          await api.evidence.performAction(newEvidence.id, 'submit', user.id);
        }

        toast.success(
          asDraft
            ? (lang === 'ar' ? 'تم حفظ المسودة بنجاح' : 'Draft saved successfully')
            : (lang === 'ar' ? 'تم رفع الملف للمراجعة' : 'File uploaded for review')
        );

        // Reload evidence data
        const evidenceData = await api.evidence.getAll({ requirement_id: id });
        const docsGroupedByLevel: Record<number, UploadedDoc[]> = {};
        for (const evidence of evidenceData) {
          const evidenceDetails = await api.evidence.getById(evidence.id);
          const transformedDoc: UploadedDoc = {
            id: evidence.id,
            document_name: evidence.document_name,
            current_version: evidence.current_version,
            status: evidence.status as DocumentStatus,
            versions: evidenceDetails.versions.map(v => ({
              version: v.version_number,
              filename: v.filename,
              file_size: v.file_size || undefined,
              uploaded_by: v.uploaded_by,
              uploaded_at: v.uploaded_at,
              comment: v.upload_comment || undefined
            })),
            review_history: evidenceDetails.activities.map(a => ({
              id: a.id,
              reviewer_id: a.actor_id,
              reviewer_name: a.actor_id,
              action: a.action as any,
              version: a.version_number || 0,
              comment: a.comment || undefined,
              timestamp: a.created_at
            }))
          };
          if (!docsGroupedByLevel[evidence.maturity_level]) {
            docsGroupedByLevel[evidence.maturity_level] = [];
          }
          docsGroupedByLevel[evidence.maturity_level].push(transformedDoc);
        }
        setDocuments(docsGroupedByLevel);
      }

      setUploadingToLevel(null);
      setUploadingVersionForDoc(null);
      setUploadComment('');
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Failed to upload document:', err);
      toast.error(lang === 'ar' ? 'فشل رفع الملف' : 'Failed to upload file');
    }
  };

  // Old local state implementation - keeping structure for reference but now using API
  const _oldHandleUploadDocument = (level: number, asDraft: boolean) => {
    if (!selectedFile) {
      toast.error(lang === 'ar' ? 'الرجاء اختيار ملف' : 'Please select a file');
      return;
    }

    // Check if we're adding a new version to an existing document
    if (uploadingVersionForDoc) {
      setDocuments(prev => {
        const levelDocs = prev[level] || [];
        const docIndex = levelDocs.findIndex(d => d.id === uploadingVersionForDoc);

        if (docIndex === -1) return prev;

        const doc = levelDocs[docIndex];
        const newVersion: DocumentVersion = {
          version: doc.current_version + 1,
          filename: selectedFile.name,
          file_size: selectedFile.size,
          uploaded_by: user?.name || 'Current User',
          uploaded_at: new Date().toISOString(),
          comment: uploadComment || undefined
        };

        // Add review history entries for upload and submission
        const uploadEntry: ReviewHistory = {
          id: `rv-${Date.now()}-upload`,
          reviewer_id: user?.id || 'current',
          reviewer_name: user?.name || 'Current User',
          action: 'uploaded_version',
          version: newVersion.version,
          comment: uploadComment || undefined,
          timestamp: new Date().toISOString()
        };

        const submitEntry: ReviewHistory | null = asDraft ? null : {
          id: `rv-${Date.now()}-submit`,
          reviewer_id: user?.id || 'current',
          reviewer_name: user?.name || 'Current User',
          action: 'submitted',
          version: newVersion.version,
          timestamp: new Date().toISOString()
        };

        const updatedDoc: UploadedDoc = {
          ...doc,
          current_version: newVersion.version,
          status: asDraft ? 'draft' : 'submitted',
          versions: [...doc.versions, newVersion],
          review_history: submitEntry
            ? [...doc.review_history, uploadEntry, submitEntry]
            : [...doc.review_history, uploadEntry]
        };

        const updatedLevelDocs = [...levelDocs];
        updatedLevelDocs[docIndex] = updatedDoc;

        return {
          ...prev,
          [level]: updatedLevelDocs
        };
      });

      toast.success(
        lang === 'ar'
          ? `تم رفع الإصدار الجديد بنجاح`
          : `New version uploaded successfully`
      );
    } else {
      // Creating a new document
      const uploadEntry: ReviewHistory = {
        id: `rv-${Date.now()}-upload`,
        reviewer_id: user?.id || 'current',
        reviewer_name: user?.name || 'Current User',
        action: 'uploaded_draft',
        version: 1,
        comment: uploadComment || undefined,
        timestamp: new Date().toISOString()
      };

      const submitEntry: ReviewHistory | null = asDraft ? null : {
        id: `rv-${Date.now()}-submit`,
        reviewer_id: user?.id || 'current',
        reviewer_name: user?.name || 'Current User',
        action: 'submitted',
        version: 1,
        timestamp: new Date().toISOString()
      };

      const newDoc: UploadedDoc = {
        id: `doc-${Date.now()}`,
        document_name: selectedFile.name.replace(/\.[^/.]+$/, ''), // Remove file extension for document name
        current_version: 1,
        status: asDraft ? 'draft' : 'submitted',
        versions: [{
          version: 1,
          filename: selectedFile.name,
          file_size: selectedFile.size,
          uploaded_by: user?.name || 'Current User',
          uploaded_at: new Date().toISOString(),
          comment: uploadComment || undefined
        }],
        review_history: submitEntry ? [uploadEntry, submitEntry] : [uploadEntry]
      };

      setDocuments(prev => ({
        ...prev,
        [level]: [...(prev[level] || []), newDoc]
      }));

      toast.success(
        asDraft
          ? (lang === 'ar' ? 'تم حفظ المسودة بنجاح' : 'Draft saved successfully')
          : (lang === 'ar' ? 'تم رفع الملف للمراجعة' : 'File uploaded for review')
      );
    }

    setUploadingToLevel(null);
    setUploadingVersionForDoc(null);
    setUploadComment('');
    setSelectedFile(null);
  };

  const handleDeleteDocument = async (level: number, docId: string) => {
    if (!id) return;

    try {
      await api.evidence.delete(docId);
      toast.success(lang === 'ar' ? 'تم حذف المستند' : 'Document deleted');

      // Reload evidence data
      const evidenceData = await api.evidence.getAll({ requirement_id: id });
      const docsGroupedByLevel: Record<number, UploadedDoc[]> = {};
      for (const evidence of evidenceData) {
        const evidenceDetails = await api.evidence.getById(evidence.id);
        const transformedDoc: UploadedDoc = {
          id: evidence.id,
          document_name: evidence.document_name,
          current_version: evidence.current_version,
          status: evidence.status as DocumentStatus,
          versions: evidenceDetails.versions.map(v => ({
            version: v.version_number,
            filename: v.filename,
            file_size: v.file_size || undefined,
            uploaded_by: v.uploaded_by,
            uploaded_at: v.uploaded_at,
            comment: v.upload_comment || undefined
          })),
          review_history: evidenceDetails.activities.map(a => ({
            id: a.id,
            reviewer_id: a.actor_id,
            reviewer_name: a.actor_id,
            action: a.action as any,
            version: a.version_number || 0,
            comment: a.comment || undefined,
            timestamp: a.created_at
          }))
        };
        if (!docsGroupedByLevel[evidence.maturity_level]) {
          docsGroupedByLevel[evidence.maturity_level] = [];
        }
        docsGroupedByLevel[evidence.maturity_level].push(transformedDoc);
      }
      setDocuments(docsGroupedByLevel);
    } catch (err: any) {
      console.error('Failed to delete document:', err);
      toast.error(lang === 'ar' ? 'فشل حذف المستند' : 'Failed to delete document');
    }
  };

  const handleChangeStatus = async (level: number, docId: string, newStatus: DocumentStatus) => {
    // This function is not used since we have specific handlers below
    toast.success(lang === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
  };

  const handleConfirmDocument = async (level: number, docId: string) => {
    if (!user || !id) return;

    try {
      await api.evidence.performAction(docId, 'confirm', user.id);
      toast.success(lang === 'ar' ? 'تم تأكيد المستند' : 'Document confirmed');

      // Reload evidence data
      const evidenceData = await api.evidence.getAll({ requirement_id: id });
      const docsGroupedByLevel: Record<number, UploadedDoc[]> = {};
      for (const evidence of evidenceData) {
        const evidenceDetails = await api.evidence.getById(evidence.id);
        const transformedDoc: UploadedDoc = {
          id: evidence.id,
          document_name: evidence.document_name,
          current_version: evidence.current_version,
          status: evidence.status as DocumentStatus,
          versions: evidenceDetails.versions.map(v => ({
            version: v.version_number,
            filename: v.filename,
            file_size: v.file_size || undefined,
            uploaded_by: v.uploaded_by,
            uploaded_at: v.uploaded_at,
            comment: v.upload_comment || undefined
          })),
          review_history: evidenceDetails.activities.map(a => ({
            id: a.id,
            reviewer_id: a.actor_id,
            reviewer_name: a.actor_id,
            action: a.action as any,
            version: a.version_number || 0,
            comment: a.comment || undefined,
            timestamp: a.created_at
          }))
        };
        if (!docsGroupedByLevel[evidence.maturity_level]) {
          docsGroupedByLevel[evidence.maturity_level] = [];
        }
        docsGroupedByLevel[evidence.maturity_level].push(transformedDoc);
      }
      setDocuments(docsGroupedByLevel);
    } catch (err: any) {
      console.error('Failed to confirm document:', err);
      toast.error(lang === 'ar' ? 'فشل تأكيد المستند' : 'Failed to confirm document');
    }
  };

  const handleApproveDocument = async (level: number, docId: string) => {
    if (!user || !id) return;

    try {
      await api.evidence.performAction(docId, 'approve', user.id);
      toast.success(lang === 'ar' ? 'تم اعتماد المستند' : 'Document approved');

      // Reload evidence data
      const evidenceData = await api.evidence.getAll({ requirement_id: id });
      const docsGroupedByLevel: Record<number, UploadedDoc[]> = {};
      for (const evidence of evidenceData) {
        const evidenceDetails = await api.evidence.getById(evidence.id);
        const transformedDoc: UploadedDoc = {
          id: evidence.id,
          document_name: evidence.document_name,
          current_version: evidence.current_version,
          status: evidence.status as DocumentStatus,
          versions: evidenceDetails.versions.map(v => ({
            version: v.version_number,
            filename: v.filename,
            file_size: v.file_size || undefined,
            uploaded_by: v.uploaded_by,
            uploaded_at: v.uploaded_at,
            comment: v.upload_comment || undefined
          })),
          review_history: evidenceDetails.activities.map(a => ({
            id: a.id,
            reviewer_id: a.actor_id,
            reviewer_name: a.actor_id,
            action: a.action as any,
            version: a.version_number || 0,
            comment: a.comment || undefined,
            timestamp: a.created_at
          }))
        };
        if (!docsGroupedByLevel[evidence.maturity_level]) {
          docsGroupedByLevel[evidence.maturity_level] = [];
        }
        docsGroupedByLevel[evidence.maturity_level].push(transformedDoc);
      }
      setDocuments(docsGroupedByLevel);
    } catch (err: any) {
      console.error('Failed to approve document:', err);
      toast.error(lang === 'ar' ? 'فشل اعتماد المستند' : 'Failed to approve document');
    }
  };

  const handleRejectDocument = async (level: number, docId: string) => {
    if (!rejectionComment.trim()) {
      toast.error(lang === 'ar' ? 'الرجاء إدخال سبب الرفض' : 'Please enter rejection reason');
      return;
    }

    if (!user || !id) return;

    try {
      await api.evidence.performAction(docId, 'reject', user.id, rejectionComment);
      toast.success(lang === 'ar' ? 'تم رفض المستند' : 'Document rejected');
      setRejectingDoc(null);
      setRejectionComment('');

      // Reload evidence data
      const evidenceData = await api.evidence.getAll({ requirement_id: id });
      const docsGroupedByLevel: Record<number, UploadedDoc[]> = {};
      for (const evidence of evidenceData) {
        const evidenceDetails = await api.evidence.getById(evidence.id);
        const transformedDoc: UploadedDoc = {
          id: evidence.id,
          document_name: evidence.document_name,
          current_version: evidence.current_version,
          status: evidence.status as DocumentStatus,
          versions: evidenceDetails.versions.map(v => ({
            version: v.version_number,
            filename: v.filename,
            file_size: v.file_size || undefined,
            uploaded_by: v.uploaded_by,
            uploaded_at: v.uploaded_at,
            comment: v.upload_comment || undefined
          })),
          review_history: evidenceDetails.activities.map(a => ({
            id: a.id,
            reviewer_id: a.actor_id,
            reviewer_name: a.actor_id,
            action: a.action as any,
            version: a.version_number || 0,
            comment: a.comment || undefined,
            timestamp: a.created_at
          }))
        };
        if (!docsGroupedByLevel[evidence.maturity_level]) {
          docsGroupedByLevel[evidence.maturity_level] = [];
        }
        docsGroupedByLevel[evidence.maturity_level].push(transformedDoc);
      }
      setDocuments(docsGroupedByLevel);
    } catch (err: any) {
      console.error('Failed to reject document:', err);
      toast.error(lang === 'ar' ? 'فشل رفض المستند' : 'Failed to reject document');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} p-6`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className={`w-12 h-12 animate-spin ${colors.primary} mx-auto mb-4`} />
              <p className={colors.textSecondary}>
                {lang === 'ar' ? 'جاري تحميل المتطلب...' : 'Loading requirement...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !requirement) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} p-6`}>
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/requirements')}
            className={`flex items-center gap-2 ${colors.textSecondary} hover:${colors.textPrimary} mb-6 transition`}
          >
            <ArrowLeft size={20} />
            <span>{lang === 'ar' ? 'العودة للمتطلبات' : 'Back to Requirements'}</span>
          </button>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
                {lang === 'ar' ? 'حدث خطأ' : 'Error Occurred'}
              </h3>
              <p className={`${colors.textSecondary} mb-4`}>{error || (lang === 'ar' ? 'لم يتم العثور على المتطلب' : 'Requirement not found')}</p>
              <button
                onClick={() => navigate('/requirements')}
                className={`px-6 py-2 ${patterns.button}`}
              >
                {lang === 'ar' ? 'العودة للمتطلبات' : 'Back to Requirements'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bgPrimary} p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/requirements')}
          className={`flex items-center gap-2 ${colors.textSecondary} hover:${colors.textPrimary} mb-6 transition`}
        >
          <ArrowLeft size={20} />
          <span>{lang === 'ar' ? 'العودة للمتطلبات' : 'Back to Requirements'}</span>
        </button>

        {/* Header Card */}
        <div className={`${colors.bgSecondary} rounded-xl shadow-md p-6 mb-6`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 ${colors.primaryLight} ${colors.primaryText} text-sm font-medium rounded-full`}>
                  {requirement.id}
                </span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full">
                  {requirement.section}
                </span>
              </div>
              <h1 className={`text-2xl font-bold ${colors.textPrimary} mb-4`}>
                {requirement.question}
              </h1>

              {/* Simplified Info */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={colors.primaryIcon} size={20} />
                  <span className={`text-sm ${colors.textSecondary}`}>
                    {lang === 'ar' ? 'المستوى الحالي:' : 'Current Level:'}
                    <span className="font-bold text-lg ml-2">{requirement.current_level}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="text-orange-600 dark:text-orange-400" size={20} />
                  <span className={`text-sm ${colors.textSecondary}`}>
                    {new Date(requirement.due_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Multiple Assignees */}
          <div className={`border-t ${colors.border} pt-4 mt-4`}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`flex items-center gap-2 ${colors.textSecondary}`}>
                <Users size={18} />
                <span className="text-sm font-medium">
                  {lang === 'ar' ? 'المسؤولون:' : 'Assigned To:'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className={`flex items-center gap-2 px-3 py-1.5 ${colors.primaryLight} border ${colors.primaryBorder} rounded-lg`}
                  >
                    <span className={`text-sm font-medium ${colors.textPrimary}`}>
                      {lang === 'ar' ? assignee.user_name_ar : assignee.user_name_en || assignee.user_name_ar}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline Toggle */}
        <button
          onClick={() => setShowActivities(!showActivities)}
          className={`w-full flex items-center justify-between px-6 py-4 ${colors.bgSecondary} rounded-xl shadow-md mb-6 hover:shadow-lg transition`}
        >
          <div className="flex items-center gap-3">
            <Clock className={colors.primaryIcon} size={24} />
            <div className="text-left">
              <h2 className={`text-lg font-bold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'سجل النشاطات والتغييرات' : 'Activity & Change History'}
              </h2>
              <p className={`text-sm ${colors.textSecondary}`}>
                {lang === 'ar' ? `${activities.length} نشاط` : `${activities.length} activities`}
              </p>
            </div>
          </div>
          {showActivities ? <ChevronUp size={24} className={colors.textSecondary} /> : <ChevronDown size={24} className={colors.textSecondary} />}
        </button>

        {/* Activity Timeline */}
        {showActivities && (
          <div className={`${colors.bgSecondary} rounded-xl shadow-md p-6 mb-6`}>
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityBgColor(activity.action_type)}`}>
                      {getActivityIcon(activity.action_type)}
                    </div>
                    {index < activities.length - 1 && (
                      <div className={`w-0.5 h-full ${colors.border} mt-2 flex-1`} style={{ minHeight: '40px' }} />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className={`font-medium ${colors.textPrimary} mb-1`}>
                          {lang === 'ar' ? activity.description : activity.description_en}
                        </p>
                        <p className={`text-sm ${colors.textSecondary}`}>
                          {lang === 'ar' ? activity.actor_name : activity.actor_name_en}
                          {' • '}
                          {lang === 'ar' ? `المستوى ${activity.level}` : `Level ${activity.level}`}
                        </p>
                      </div>
                      <span className={`text-xs ${colors.textTertiary} whitespace-nowrap ml-4`}>
                        {new Date(activity.timestamp).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maturity Levels */}
        <div className="space-y-4">
          <h2 className={`text-xl font-bold ${colors.textPrimary} mb-4`}>
            {lang === 'ar' ? 'مستويات النضج' : 'Maturity Levels'}
          </h2>

          {requirement.level_criteria?.map((criteria) => {
            const status = getLevelStatus(criteria.level);
            const isExpanded = expandedLevels.includes(criteria.level);
            const statusColor = getLevelStatusColor(status);
            const levelDocs = documents[criteria.level] || [];

            return (
              <div
                key={criteria.level}
                className={`${colors.bgSecondary} rounded-xl shadow-md overflow-hidden border-2 transition ${
                  status === 'current' ? 'border-green-500 dark:border-green-600 shadow-lg' : 'border-transparent'
                }`}
              >
                {/* Level Header */}
                <div className={`w-full px-6 py-4 flex items-center justify-between hover:${colors.bgHover} transition`}>
                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleLevel(criteria.level)}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${statusColor} flex-shrink-0`}>
                      {status === 'completed' ? (
                        <CheckCircle2 size={28} />
                      ) : status === 'current' ? (
                        <div className="w-4 h-4 bg-green-600 dark:bg-green-400 rounded-full animate-pulse" />
                      ) : (
                        <Circle size={28} />
                      )}
                    </div>
                    <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                      <h3 className={`text-lg font-bold ${colors.textPrimary}`}>
                        {criteria.title}
                      </h3>
                      <p className={`text-sm ${colors.textSecondary} mt-1`}>
                        {criteria.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Admin Level Completion Toggle */}
                    {user?.role === 'admin' && criteria.level > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLevelCompletion(criteria.level);
                        }}
                        className={`px-4 py-2 text-sm rounded-lg transition flex items-center gap-2 font-medium ${
                          manuallyCompletedLevels.includes(criteria.level)
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : `${colors.bgTertiary} ${colors.textSecondary} hover:${colors.bgHover}`
                        }`}
                      >
                        <CheckSquare size={16} />
                        {manuallyCompletedLevels.includes(criteria.level)
                          ? (lang === 'ar' ? 'مكتمل' : 'Completed')
                          : (lang === 'ar' ? 'تحديد كمكتمل' : 'Mark Complete')}
                      </button>
                    )}
                    <button onClick={() => toggleLevel(criteria.level)} className="p-2">
                      {isExpanded ? (
                        <ChevronUp size={24} className={colors.textTertiary} />
                      ) : (
                        <ChevronDown size={24} className={colors.textTertiary} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Level Details */}
                {isExpanded && criteria.level > 0 && (
                  <div className={`px-6 pb-6 border-t ${colors.border} ${colors.bgPrimary}`}>
                    {/* Acceptance Criteria */}
                    <div className="mt-6">
                      <h4 className={`text-md font-bold ${colors.textPrimary} mb-3 flex items-center gap-2`}>
                        <CheckSquare className={colors.primaryIcon} size={20} />
                        {lang === 'ar' ? 'معايير القبول' : 'Acceptance Criteria'}
                      </h4>
                      <div className="space-y-2">
                        {criteria.acceptance_criteria.map((criterion, idx) => (
                          <div key={idx} className={`flex items-start gap-3 p-3 ${colors.bgSecondary} border ${colors.border} rounded-lg`}>
                            <CheckCircle2 className={colors.primaryIcon} size={18} />
                            <span className={`text-sm ${colors.textSecondary}`}>{criterion}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Required Documents */}
                    <div className="mt-6">
                      <h4 className={`text-md font-bold ${colors.textPrimary} mb-3 flex items-center gap-2`}>
                        <FileText className="text-orange-600 dark:text-orange-400" size={20} />
                        {lang === 'ar' ? 'المستندات المطلوبة' : 'Required Documents'}
                      </h4>
                      <div className="space-y-2">
                        {criteria.required_documents.map((doc, idx) => (
                          <div key={idx} className={`flex items-start justify-between p-3 ${colors.bgSecondary} border ${colors.border} rounded-lg`}>
                            <div className="flex items-start gap-3 flex-1">
                              <FileText className={colors.textTertiary} size={18} />
                              <div>
                                <p className={`text-sm font-medium ${colors.textPrimary}`}>
                                  {doc.name}
                                </p>
                                {doc.description && (
                                  <p className={`text-xs ${colors.textSecondary} mt-1`}>
                                    {doc.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${
                              doc.mandatory
                                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                : `${colors.bgTertiary} ${colors.textSecondary}`
                            }`}>
                              {doc.mandatory
                                ? (lang === 'ar' ? 'إلزامي' : 'Mandatory')
                                : (lang === 'ar' ? 'اختياري' : 'Optional')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Uploaded Documents with Version History */}
                    {levelDocs.length > 0 && (
                      <div className="mt-6">
                        <h4 className={`text-md font-bold ${colors.textPrimary} mb-3 flex items-center gap-2`}>
                          <Download className={colors.primaryIcon} size={20} />
                          {lang === 'ar' ? 'المستندات المرفوعة' : 'Uploaded Documents'}
                        </h4>
                        <div className="space-y-4">
                          {levelDocs.map((doc) => {
                            const latestVersion = doc.versions[doc.versions.length - 1];
                            const showVersions = expandedDocVersions[doc.id] || false;

                            return (
                              <div key={doc.id} className={`p-4 ${colors.bgSecondary} border ${colors.border} rounded-lg hover:shadow-md transition`}>
                                {/* Document Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    <FileText className={colors.primaryIcon} size={20} />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className={`text-sm font-bold ${colors.textPrimary}`}>{doc.document_name}</p>
                                        <span className={`text-xs ${colors.primaryLight} ${colors.primaryText} px-2 py-0.5 rounded-full font-semibold`}>
                                          {lang === 'ar' ? `إصدار ${doc.current_version}` : `v${doc.current_version}`}
                                        </span>
                                      </div>
                                      <p className={`text-xs ${colors.textSecondary} mb-1`}>
                                        {lang === 'ar' ? 'آخر تحديث بواسطة' : 'Last updated by'} {latestVersion.uploaded_by} • {new Date(latestVersion.uploaded_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                                      </p>
                                      <p className={`text-xs ${colors.textTertiary}`}>
                                        {latestVersion.filename} • {(latestVersion.file_size! / 1024).toFixed(0)} KB
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-3">
                                    {getDocumentStatusBadge(doc.status)}
                                  </div>
                                </div>

                                {/* Latest Version Comment */}
                                {latestVersion.comment && (
                                  <div className={`mb-3 p-2 ${colors.primaryLight} rounded border ${colors.primaryBorder}`}>
                                    <p className={`text-xs ${colors.textSecondary}`}>
                                      <span className="font-semibold">{lang === 'ar' ? 'ملاحظة:' : 'Comment:'}</span> {latestVersion.comment}
                                    </p>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className={`flex items-center gap-2 mb-3 pb-3 border-b ${colors.border} flex-wrap`}>
                                  <button
                                    onClick={() => toast.success(lang === 'ar' ? 'جاري تحميل الملف...' : 'Downloading file...')}
                                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-1"
                                  >
                                    <Download size={14} />
                                    {lang === 'ar' ? 'تحميل' : 'Download'}
                                  </button>

                                  {/* Draft Status - Submit button */}
                                  {doc.status === 'draft' && (
                                    <button
                                      onClick={() => handleChangeStatus(criteria.level, doc.id, 'submitted')}
                                      className={`px-3 py-1.5 text-xs ${colors.primary} text-white rounded ${colors.primaryHover} transition flex items-center gap-1`}
                                    >
                                      <CheckCircle2 size={14} />
                                      {lang === 'ar' ? 'إرسال للمراجعة' : 'Submit for Review'}
                                    </button>
                                  )}

                                  {/* Submitted Status - Auditor buttons (Confirm/Reject) */}
                                  {doc.status === 'submitted' && user?.role === 'admin' && (
                                    <>
                                      <button
                                        onClick={() => handleConfirmDocument(criteria.level, doc.id)}
                                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-1"
                                      >
                                        <CheckCircle2 size={14} />
                                        {lang === 'ar' ? 'تأكيد' : 'Confirm'}
                                      </button>
                                      <button
                                        onClick={() => setRejectingDoc({ level: criteria.level, docId: doc.id })}
                                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-1"
                                      >
                                        <X size={14} />
                                        {lang === 'ar' ? 'رفض' : 'Reject'}
                                      </button>
                                    </>
                                  )}

                                  {/* Confirmed Status - Approve button */}
                                  {doc.status === 'confirmed' && user?.role === 'admin' && (
                                    <button
                                      onClick={() => handleApproveDocument(criteria.level, doc.id)}
                                      className="px-3 py-1.5 text-xs bg-green-700 text-white rounded hover:bg-green-800 transition flex items-center gap-1 font-semibold"
                                    >
                                      <CheckCircle2 size={14} />
                                      {lang === 'ar' ? 'اعتماد' : 'Approve'}
                                    </button>
                                  )}

                                  {/* Review History Button */}
                                  {doc.review_history && doc.review_history.length > 0 && (
                                    <button
                                      onClick={() => setShowReviewHistory({ level: criteria.level, docId: doc.id })}
                                      className={`px-3 py-1.5 text-xs ${colors.bgTertiary} ${colors.textSecondary} rounded hover:${colors.bgHover} transition flex items-center gap-1`}
                                    >
                                      <History size={14} />
                                      {lang === 'ar' ? 'سجل المراجعة' : 'Review History'}
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setUploadingToLevel(criteria.level);
                                      setUploadingVersionForDoc(doc.id);
                                    }}
                                    className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition flex items-center gap-1"
                                  >
                                    <Upload size={14} />
                                    {lang === 'ar' ? 'رفع نسخة جديدة' : 'Upload New Version'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(criteria.level, doc.id)}
                                    className={`px-3 py-1.5 text-xs ${colors.errorLight} ${colors.error} rounded hover:bg-red-200 dark:hover:bg-red-800 transition flex items-center gap-1`}
                                  >
                                    <Trash2 size={14} />
                                    {lang === 'ar' ? 'حذف' : 'Delete'}
                                  </button>
                                </div>

                                {/* Rejection Form */}
                                {rejectingDoc && rejectingDoc.docId === doc.id && rejectingDoc.level === criteria.level && (
                                  <div className={`mb-3 p-4 ${colors.errorLight} border ${colors.error} rounded-lg`}>
                                    <h5 className={`text-sm font-bold ${colors.error} mb-2`}>
                                      {lang === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}
                                    </h5>
                                    <textarea
                                      value={rejectionComment}
                                      onChange={(e) => setRejectionComment(e.target.value)}
                                      rows={3}
                                      placeholder={lang === 'ar' ? 'اكتب سبب رفض المستند...' : 'Enter reason for rejecting document...'}
                                      className={`w-full px-3 py-2 border ${colors.error} rounded ${colors.focusRing} text-sm mb-2 ${colors.inputBg} ${colors.inputText}`}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleRejectDocument(criteria.level, doc.id)}
                                        className={`px-4 py-2 ${colors.errorBg} text-white rounded hover:bg-red-700 transition text-sm`}
                                      >
                                        {lang === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setRejectingDoc(null);
                                          setRejectionComment('');
                                        }}
                                        className={`px-4 py-2 ${colors.bgTertiary} ${colors.textSecondary} rounded hover:${colors.bgHover} transition text-sm`}
                                      >
                                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Version History Toggle */}
                                {doc.versions.length > 1 && (
                                  <div>
                                    <button
                                      onClick={() => setExpandedDocVersions(prev => ({ ...prev, [doc.id]: !showVersions }))}
                                      className={`text-xs ${colors.primaryText} ${colors.primaryTextHover} font-medium flex items-center gap-1`}
                                    >
                                      {showVersions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                      {lang === 'ar'
                                        ? `${showVersions ? 'إخفاء' : 'عرض'} سجل الإصدارات (${doc.versions.length} إصدار)`
                                        : `${showVersions ? 'Hide' : 'Show'} Version History (${doc.versions.length} versions)`
                                      }
                                    </button>

                                    {/* Version History List */}
                                    {showVersions && (
                                      <div className={`mt-3 space-y-2 pl-6 border-l-2 ${colors.primaryBorder}`}>
                                        {doc.versions.slice().reverse().map((version, idx) => (
                                          <div
                                            key={version.version}
                                            className={`p-3 rounded ${idx === 0 ? `${colors.primaryLight} border ${colors.primaryBorder}` : colors.bgTertiary}`}
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className={`text-xs font-bold ${idx === 0 ? colors.primaryText : colors.textSecondary}`}>
                                                    {lang === 'ar' ? `الإصدار ${version.version}` : `Version ${version.version}`}
                                                  </span>
                                                  {idx === 0 && (
                                                    <span className={`text-xs ${colors.primary} text-white px-2 py-0.5 rounded-full`}>
                                                      {lang === 'ar' ? 'الأحدث' : 'Latest'}
                                                    </span>
                                                  )}
                                                </div>
                                                <p className={`text-xs ${colors.textSecondary} mb-1`}>{version.filename}</p>
                                                <p className={`text-xs ${colors.textSecondary}`}>
                                                  {version.uploaded_by} • {new Date(version.uploaded_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')} • {(version.file_size! / 1024).toFixed(0)} KB
                                                </p>
                                                {version.comment && (
                                                  <p className={`text-xs ${colors.textSecondary} mt-1 italic`}>"{version.comment}"</p>
                                                )}
                                              </div>
                                              <button
                                                onClick={() => toast.success(lang === 'ar' ? `جاري تحميل الإصدار ${version.version}...` : `Downloading version ${version.version}...`)}
                                                className={`px-2 py-1 text-xs ${colors.bgTertiary} ${colors.textSecondary} rounded hover:${colors.bgHover} transition flex items-center gap-1 ml-2`}
                                              >
                                                <Download size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Upload Section - Available for ALL levels */}
                    <div className={`mt-6 p-4 ${colors.primaryLight} border-2 ${colors.primaryBorder} rounded-lg`}>
                      {uploadingToLevel === criteria.level ? (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className={`text-md font-bold ${colors.primaryText} flex items-center gap-2`}>
                              <Upload size={20} />
                              {uploadingVersionForDoc
                                ? (lang === 'ar' ? 'رفع نسخة جديدة' : 'Upload New Version')
                                : (lang === 'ar' ? 'رفع مستند جديد' : 'Upload New Document')
                              }
                            </h4>
                            <button
                              onClick={() => {
                                setUploadingToLevel(null);
                                setUploadingVersionForDoc(null);
                                setUploadComment('');
                                setSelectedFile(null);
                              }}
                              className={colors.textTertiary}
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                                {lang === 'ar' ? 'اختر الملف' : 'Select File'}
                              </label>
                              <input
                                type="file"
                                onChange={handleFileSelect}
                                className={`w-full text-sm ${colors.textSecondary} file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:${colors.primary} file:text-white file:${colors.primaryHover}`}
                              />
                              {selectedFile && (
                                <p className={`text-xs ${colors.primaryText} mt-2`}>
                                  {lang === 'ar' ? 'تم اختيار:' : 'Selected:'} {selectedFile.name}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className={`block text-sm font-medium ${colors.textSecondary} mb-2`}>
                                {lang === 'ar' ? 'تعليق (اختياري)' : 'Comment (Optional)'}
                              </label>
                              <textarea
                                value={uploadComment}
                                onChange={(e) => setUploadComment(e.target.value)}
                                rows={3}
                                placeholder={lang === 'ar' ? 'أضف تعليقاً أو ملاحظة حول المستند...' : 'Add a comment or note about the document...'}
                                className={`w-full px-3 py-2 ${patterns.input} text-sm`}
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUploadDocument(criteria.level, true)}
                                className={`flex-1 px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition text-sm flex items-center justify-center gap-2`}
                              >
                                {lang === 'ar' ? 'حفظ كمسودة' : 'Save as Draft'}
                              </button>
                              <button
                                onClick={() => handleUploadDocument(criteria.level, false)}
                                className={`flex-1 px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition text-sm flex items-center justify-center gap-2`}
                              >
                                <CheckCircle2 size={16} />
                                {lang === 'ar' ? 'رفع وإرسال' : 'Upload & Submit'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className={`text-md font-bold ${colors.primaryText} flex items-center gap-2 mb-1`}>
                                <Upload size={20} />
                                {lang === 'ar' ? 'رفع المستندات' : 'Upload Documents'}
                              </h4>
                              <p className={`text-xs ${colors.primaryText}`}>
                                {lang === 'ar'
                                  ? 'يمكنك رفع المستندات المطلوبة لهذا المستوى'
                                  : 'You can upload required documents for this level'}
                              </p>
                            </div>
                            <button
                              onClick={() => setUploadingToLevel(criteria.level)}
                              className={`px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition text-sm flex items-center gap-2`}
                            >
                              <Upload size={16} />
                              {lang === 'ar' ? 'رفع ملف' : 'Upload File'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Review History Modal */}
      {showReviewHistory && (() => {
        const doc = documents[showReviewHistory.level]?.find(d => d.id === showReviewHistory.docId);
        if (!doc) return null;

        const getActionIcon = (action: 'uploaded_draft' | 'uploaded_version' | 'submitted' | 'confirmed' | 'rejected' | 'approved') => {
          switch (action) {
            case 'uploaded_draft':
              return <FileText size={16} className="text-gray-600" />;
            case 'uploaded_version':
              return <Upload size={16} className="text-purple-600" />;
            case 'submitted':
              return <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />;
            case 'confirmed':
              return <CheckCircle2 size={16} className="text-green-600" />;
            case 'rejected':
              return <X size={16} className="text-red-600" />;
            case 'approved':
              return <CheckSquare size={16} className="text-green-700" />;
          }
        };

        const getActionText = (action: 'uploaded_draft' | 'uploaded_version' | 'submitted' | 'confirmed' | 'rejected' | 'approved') => {
          switch (action) {
            case 'uploaded_draft':
              return lang === 'ar' ? 'رفع مسودة' : 'Uploaded Draft';
            case 'uploaded_version':
              return lang === 'ar' ? 'رفع نسخة جديدة' : 'Uploaded Version';
            case 'submitted':
              return lang === 'ar' ? 'تم الإرسال للمراجعة' : 'Submitted for Review';
            case 'confirmed':
              return lang === 'ar' ? 'تم التأكيد' : 'Confirmed';
            case 'rejected':
              return lang === 'ar' ? 'مرفوض' : 'Rejected';
            case 'approved':
              return lang === 'ar' ? 'معتمد' : 'Approved';
          }
        };

        const getActionBadge = (action: 'uploaded_draft' | 'uploaded_version' | 'submitted' | 'confirmed' | 'rejected' | 'approved') => {
          switch (action) {
            case 'uploaded_draft':
              return 'bg-gray-100 text-gray-700';
            case 'uploaded_version':
              return 'bg-purple-100 text-purple-700';
            case 'submitted':
              return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
            case 'confirmed':
              return 'bg-green-100 text-green-700';
            case 'rejected':
              return 'bg-red-100 text-red-700';
            case 'approved':
              return 'bg-green-700 text-white';
          }
        };

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${colors.bgSecondary} rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              {/* Modal Header */}
              <div className={`sticky top-0 bg-gradient-to-r from-green-600 to-green-700 dark:from-[#0f5132] dark:to-[#14452f] px-6 py-4 flex items-center justify-between`}>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <History size={24} />
                  {lang === 'ar' ? 'سجل المراجعة' : 'Review History'}
                </h3>
                <button
                  onClick={() => setShowReviewHistory(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Document Info */}
              <div className={`px-6 py-4 border-b ${colors.border} ${colors.bgPrimary}`}>
                <h4 className={`font-bold ${colors.textPrimary} mb-1`}>{doc.document_name}</h4>
                <p className={`text-sm ${colors.textSecondary}`}>
                  {lang === 'ar' ? 'الإصدار الحالي:' : 'Current Version:'} {doc.current_version} • {getDocumentStatusBadge(doc.status)}
                </p>
              </div>

              {/* Review History Timeline */}
              <div className="px-6 py-4">
                {doc.review_history && doc.review_history.length > 0 ? (
                  <div className="space-y-4">
                    {doc.review_history.slice().reverse().map((entry, idx) => (
                      <div key={entry.id} className="flex gap-4">
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center">
                          <div className={`rounded-full p-2 ${getActionBadge(entry.action)}`}>
                            {getActionIcon(entry.action)}
                          </div>
                          {idx < doc.review_history.length - 1 && (
                            <div className={`w-0.5 ${colors.border} flex-1 min-h-[30px] my-1`}></div>
                          )}
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-3 py-1 rounded text-sm font-bold ${getActionBadge(entry.action)}`}>
                                {getActionText(entry.action)}
                              </span>
                              <span className={`text-xs ${colors.bgTertiary} ${colors.textSecondary} px-2 py-1 rounded font-mono`}>
                                {lang === 'ar' ? `إصدار ${entry.version}` : `v${entry.version}`}
                              </span>
                            </div>
                            <span className={`text-xs ${colors.textTertiary}`}>
                              {new Date(entry.timestamp).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <p className={`text-sm ${colors.textSecondary} font-medium mb-1`}>
                            {entry.reviewer_name}
                          </p>

                          {/* Upload comment (for uploaded_draft and uploaded_version) */}
                          {entry.comment && (entry.action === 'uploaded_draft' || entry.action === 'uploaded_version') && (
                            <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg">
                              <p className={`text-sm ${colors.textSecondary}`}>
                                <span className="font-semibold">{lang === 'ar' ? 'ملاحظة:' : 'Note:'}</span> {entry.comment}
                              </p>
                            </div>
                          )}

                          {/* Rejection comment */}
                          {entry.comment && entry.action === 'rejected' && (
                            <div className={`mt-2 p-3 ${colors.errorLight} border ${colors.error} rounded-lg`}>
                              <p className={`text-sm ${colors.error}`}>
                                <span className="font-semibold">{lang === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'}</span> {entry.comment}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-8 ${colors.textTertiary}`}>
                    {lang === 'ar' ? 'لا يوجد سجل مراجعة' : 'No review history'}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className={`sticky bottom-0 ${colors.bgPrimary} px-6 py-4 border-t ${colors.border}`}>
                <button
                  onClick={() => setShowReviewHistory(null)}
                  className={`w-full px-4 py-2 ${colors.primary} text-white rounded-lg ${colors.primaryHover} transition`}
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default RequirementDetail;
