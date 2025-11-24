export interface Requirement {
  id: string;
  requirement_db_id?: string; // Database ID for evidence mapping
  section: string;
  question: string;
  question_en: string;
  current_level: number;
  assigned_to?: string;
  due_date?: string;
  answer_status?: string; // Answer status for ETARI completion tracking
  evidence_description_ar?: string;
  evidence_description_en?: string;
}

export interface Evidence {
  id: string;
  requirement_id: string;
  level: number;
  status: string;
}

export const SECTION_WEIGHTS = {
  governance: 0.17,
  data: 0.17,
  technology: 0.17,
  skills: 0.17,
  ethics: 0.16,
  innovation: 0.16
};

export const SECTION_NAMES = {
  governance: { ar: 'الحوكمة', en: 'Governance' },
  data: { ar: 'البيانات', en: 'Data' },
  technology: { ar: 'التقنية', en: 'Technology' },
  skills: { ar: 'المهارات', en: 'Skills' },
  ethics: { ar: 'الأخلاقيات', en: 'Ethics' },
  innovation: { ar: 'الابتكار', en: 'Innovation' }
};

export const STATUS_NAMES = {
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  ready_for_audit: { ar: 'جاهز للمراجعة', en: 'Ready for Audit' },
  submitted: { ar: 'مُرسل', en: 'Submitted' },
  assigned: { ar: 'مُسند', en: 'Assigned' },
  changes_requested: { ar: 'مطلوب تعديلات', en: 'Changes Requested' },
  not_started: { ar: 'لم يبدأ', en: 'Not Started' }
};

export const STATUS_COLORS = {
  confirmed: '#10B981',
  ready_for_audit: '#F97316',
  submitted: '#EAB308',
  assigned: '#3B82F6',
  changes_requested: '#EF4444',
  not_started: '#9CA3AF'
};

// DEPRECATED: Use getLevelColor from config/indexConfigs instead
// Kept for backward compatibility only
export const LEVEL_COLORS = [
  '#E74C3C',
  '#F39C12',
  '#F1C40F',
  '#52BE80',
  '#3498DB',
  '#9B59B6'
];

export function calculateOverallMaturity(requirements: Requirement[]): number {
  if (requirements.length === 0) return 0;

  // Calculate average of all requirements' current levels
  const sum = requirements.reduce((acc, req) => acc + (req.current_level || 0), 0);
  const average = sum / requirements.length;

  return Math.round(average * 100) / 100;
}

export function calculateSectionMaturity(requirements: Requirement[], sectionId: string): number {
  const sectionReqs = requirements.filter(r => r.section === sectionId);
  if (sectionReqs.length === 0) return 0;

  const sum = sectionReqs.reduce((acc, req) => acc + req.current_level, 0);
  return Math.round((sum / sectionReqs.length) * 100) / 100;
}

export function calculateSectionCompletion(
  requirements: Requirement[],
  evidence: Evidence[],
  sectionId: string,
  completionThreshold: number = 5  // NEW: Configurable threshold
): number {
  const sectionReqs = requirements.filter(r => r.section === sectionId);
  if (sectionReqs.length === 0) return 0;

  // Calculate completion as percentage of requirements that reached the threshold
  const completedReqs = sectionReqs.filter(req => (req.current_level || 0) >= completionThreshold).length;
  return Math.round((completedReqs / sectionReqs.length) * 100);
}

export function getStatusDistribution(evidence: Evidence[]) {
  const distribution: Record<string, number> = {
    confirmed: 0,
    ready_for_audit: 0,
    submitted: 0,
    assigned: 0,
    changes_requested: 0,
    not_started: 0
  };

  evidence.forEach(e => {
    if (distribution[e.status] !== undefined) {
      distribution[e.status]++;
    }
  });

  return Object.entries(distribution).map(([name, value]) => ({
    name,
    value
  }));
}

export function getSectionData(
  requirements: Requirement[],
  lang: 'ar' | 'en' = 'ar',
  maxLevel: number = 5  // NEW: Configurable max level
) {
  const sections = Object.keys(SECTION_WEIGHTS);

  return sections.map(section => {
    const current = calculateSectionMaturity(requirements, section);

    return {
      section: SECTION_NAMES[section as keyof typeof SECTION_NAMES][lang],
      current: Number(current.toFixed(2)),
      fullMark: maxLevel
    };
  });
}
