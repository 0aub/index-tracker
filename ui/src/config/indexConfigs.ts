/**
 * Index Type Configurations
 * Centralized configuration for all supported index types (NAII, ETARI, etc.)
 */

export interface IndexLevelConfig {
  level: number;
  nameAr: string;
  nameEn: string;
  color: string;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface IndexTypeConfig {
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  numLevels: number;
  minLevel: number;
  maxLevel: number;
  levels: IndexLevelConfig[];
  completionThreshold: number;
  templateFile: string;
  displaySettings: {
    showLevelZero: boolean;
    progressStyle: 'dots' | 'bar' | 'gauge';
    chartScaleByMaxLevel: boolean;
  };
}

export const INDEX_CONFIGS: Record<string, IndexTypeConfig> = {
  NAII: {
    code: 'NAII',
    nameAr: 'المؤشر الوطني للذكاء الاصطناعي',
    nameEn: 'National AI Index',
    descriptionAr: 'مؤشر قياس مستوى نضج الذكاء الاصطناعي',
    descriptionEn: 'Artificial Intelligence Maturity Assessment Index',

    numLevels: 6,
    minLevel: 0,
    maxLevel: 5,
    completionThreshold: 5,
    templateFile: 'NAII-2025-template.xlsx',

    displaySettings: {
      showLevelZero: true,
      progressStyle: 'dots',
      chartScaleByMaxLevel: true,
    },

    levels: [
      {
        level: 0,
        nameAr: 'غياب القدرات',
        nameEn: 'Non-existent',
        color: '#E74C3C',
        descriptionAr: 'غياب القدرات والإمكانيات',
        descriptionEn: 'No capabilities exist',
      },
      {
        level: 1,
        nameAr: 'البناء',
        nameEn: 'Initial',
        color: '#F39C12',
        descriptionAr: 'المرحلة الأولية للبناء',
        descriptionEn: 'Initial building phase',
      },
      {
        level: 2,
        nameAr: 'التفعيل',
        nameEn: 'Repeatable',
        color: '#F1C40F',
        descriptionAr: 'تفعيل القدرات وتكرارها',
        descriptionEn: 'Activation and repeatability',
      },
      {
        level: 3,
        nameAr: 'التمكين',
        nameEn: 'Defined',
        color: '#52BE80',
        descriptionAr: 'تمكين القدرات وتحديدها',
        descriptionEn: 'Enablement and definition',
      },
      {
        level: 4,
        nameAr: 'التميز',
        nameEn: 'Managed',
        color: '#3498DB',
        descriptionAr: 'التميز في إدارة القدرات',
        descriptionEn: 'Excellence in management',
      },
      {
        level: 5,
        nameAr: 'الريادة',
        nameEn: 'Optimized',
        color: '#9B59B6',
        descriptionAr: 'الريادة والتحسين المستمر',
        descriptionEn: 'Leadership and continuous improvement',
      },
    ],
  },

  // ETARI Configuration
  ETARI: {
    code: 'ETARI',
    nameAr: 'مؤشر جاهزية تبني التقنيات الناشئة',
    nameEn: 'Emerging Technology Adoption Readiness Index',
    descriptionAr: 'مؤشر لتقييم جاهزية المنظمات لتبني التقنيات الناشئة',
    descriptionEn: 'Index to assess organizational readiness for emerging technology adoption',

    numLevels: 3,
    minLevel: 0,
    maxLevel: 2,
    completionThreshold: 2,
    templateFile: 'ETARI-2024-template.xlsx',

    displaySettings: {
      showLevelZero: true,
      progressStyle: 'dots',
      chartScaleByMaxLevel: true,
    },

    levels: [
      {
        level: 0,
        nameAr: 'لم يبدأ',
        nameEn: 'Not Started',
        color: '#EF4444',
        descriptionAr: 'لم يتم البدء في الإجابة على السؤال',
        descriptionEn: 'Question not yet started',
      },
      {
        level: 1,
        nameAr: 'مسودة',
        nameEn: 'Draft',
        color: '#EAB308',
        descriptionAr: 'تم البدء في الإجابة ولكن لم تكتمل بعد',
        descriptionEn: 'Answer started but not complete',
      },
      {
        level: 2,
        nameAr: 'مؤكد',
        nameEn: 'Confirmed',
        color: '#10B981',
        descriptionAr: 'تمت الإجابة والتأكيد على السؤال',
        descriptionEn: 'Question answered and confirmed',
      },
    ],
  }
};

/**
 * Get configuration for a specific index type
 */
export function getIndexConfig(indexType: string): IndexTypeConfig {
  const config = INDEX_CONFIGS[indexType];
  if (!config) {
    console.error(`Unknown index type: ${indexType}. Falling back to NAII.`);
    return INDEX_CONFIGS.NAII;
  }
  return config;
}

/**
 * Get all available index types
 */
export function getAvailableIndexTypes(): string[] {
  return Object.keys(INDEX_CONFIGS);
}

/**
 * Get color for a specific maturity level
 */
export function getLevelColor(indexType: string, level: number): string {
  const config = getIndexConfig(indexType);
  const levelConfig = config.levels.find(l => l.level === level);
  return levelConfig?.color || '#666666';
}

/**
 * Get name for a specific maturity level
 */
export function getLevelName(indexType: string, level: number, lang: 'ar' | 'en'): string {
  const config = getIndexConfig(indexType);
  const levelConfig = config.levels.find(l => l.level === level);
  if (!levelConfig) return '';
  return lang === 'ar' ? levelConfig.nameAr : levelConfig.nameEn;
}

/**
 * Get description for a specific maturity level
 */
export function getLevelDescription(indexType: string, level: number, lang: 'ar' | 'en'): string {
  const config = getIndexConfig(indexType);
  const levelConfig = config.levels.find(l => l.level === level);
  if (!levelConfig) return '';
  return lang === 'ar' ? (levelConfig.descriptionAr || '') : (levelConfig.descriptionEn || '');
}

/**
 * Validate if a level number is valid for the index type
 */
export function isValidLevel(indexType: string, level: number): boolean {
  const config = getIndexConfig(indexType);
  return level >= config.minLevel && level <= config.maxLevel;
}

/**
 * Get all level colors for an index type (useful for charts)
 */
export function getAllLevelColors(indexType: string): string[] {
  const config = getIndexConfig(indexType);
  return config.levels.map(l => l.color);
}

/**
 * Calculate completion percentage based on current level
 */
export function calculateCompletionPercentage(indexType: string, currentLevel: number): number {
  const config = getIndexConfig(indexType);
  return Math.round((currentLevel / config.maxLevel) * 100);
}

/**
 * Check if requirement is complete based on index type
 */
export function isRequirementComplete(indexType: string, currentLevel: number): boolean {
  const config = getIndexConfig(indexType);
  return currentLevel >= config.completionThreshold;
}
