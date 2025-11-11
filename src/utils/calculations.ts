export interface Requirement {
  id: string;
  section: string;
  question: string;
  question_en: string;
  current_level: number;
  assigned_to: string;
  due_date: string;
}

export interface Evidence {
  id: string;
  requirement_id: string;
  level: number;
  status: string;
}

export const SECTION_WEIGHTS = {
  strategy: 0.15,
  governance: 0.15,
  data: 0.15,
  infrastructure: 0.15,
  human_capabilities: 0.15,
  applications: 0.15,
  impact: 0.10
};

export const SECTION_NAMES = {
  strategy: { ar: 'الاستراتيجية', en: 'Strategy' },
  governance: { ar: 'الحوكمة', en: 'Governance' },
  data: { ar: 'البيانات', en: 'Data' },
  infrastructure: { ar: 'البنية التحتية', en: 'Infrastructure' },
  human_capabilities: { ar: 'القدرات البشرية', en: 'Human Capabilities' },
  applications: { ar: 'التطبيقات', en: 'Applications' },
  impact: { ar: 'الأثر', en: 'Impact' }
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

export const LEVEL_COLORS = [
  '#E74C3C',
  '#F39C12',
  '#F1C40F',
  '#52BE80',
  '#3498DB',
  '#9B59B6'
];

export function calculateOverallMaturity(requirements: Requirement[]): number {
  const sections: Record<string, number[]> = {
    strategy: [],
    governance: [],
    data: [],
    infrastructure: [],
    human_capabilities: [],
    applications: [],
    impact: []
  };

  requirements.forEach(req => {
    if (sections[req.section]) {
      sections[req.section].push(req.current_level);
    }
  });

  let weightedSum = 0;
  Object.keys(sections).forEach(key => {
    const section = sections[key];
    if (section.length > 0) {
      const avg = section.reduce((a, b) => a + b, 0) / section.length;
      weightedSum += avg * (SECTION_WEIGHTS[key as keyof typeof SECTION_WEIGHTS] || 0);
    }
  });

  return Math.round(weightedSum * 100) / 100;
}

export function calculateSectionMaturity(requirements: Requirement[], sectionId: string): number {
  const sectionReqs = requirements.filter(r => r.section === sectionId);
  if (sectionReqs.length === 0) return 0;

  const sum = sectionReqs.reduce((acc, req) => acc + req.current_level, 0);
  return Math.round((sum / sectionReqs.length) * 100) / 100;
}

export function calculateSectionCompletion(requirements: Requirement[], evidence: Evidence[], sectionId: string): number {
  const sectionReqs = requirements.filter(r => r.section === sectionId);
  let totalPoints = 0;
  let earnedPoints = 0;

  sectionReqs.forEach(req => {
    for (let level = 0; level <= 5; level++) {
      totalPoints++;
      const hasEvidence = evidence.some(
        e => e.requirement_id === req.id && e.level === level && e.status === 'confirmed'
      );
      if (hasEvidence) {
        earnedPoints++;
      }
    }
  });

  return totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);
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

export function getSectionData(requirements: Requirement[], lang: 'ar' | 'en' = 'ar') {
  const sections = Object.keys(SECTION_WEIGHTS);

  return sections.map(section => {
    const current = calculateSectionMaturity(requirements, section);

    return {
      section: SECTION_NAMES[section as keyof typeof SECTION_NAMES][lang],
      current: Number(current.toFixed(2)),
      fullMark: 5
    };
  });
}
