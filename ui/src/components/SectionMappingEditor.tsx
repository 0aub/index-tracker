import { useState, useEffect } from 'react';
import { X, Loader2, ArrowRight, Check, AlertCircle, ChevronDown, ChevronUp, Save, RefreshCw, Layers } from 'lucide-react';
import { colors, patterns } from '../utils/darkMode';
import { api, Index, Requirement } from '../services/api';
import toast from 'react-hot-toast';

interface SectionMappingEditorProps {
  currentIndex: Index;
  indices: Index[];
  onClose: () => void;
  lang: 'ar' | 'en';
}

interface SectionHierarchy {
  main_area_ar: string;
  main_area_en: string | null;
  elements: {
    element_ar: string;
    element_en: string | null;
    sub_domains: {
      sub_domain_ar: string;
      sub_domain_en: string | null;
    }[];
  }[];
}

interface MappingState {
  // Key format: "{type}|{previous_value}|{parent1}|{parent2}"
  // e.g., "main_area|القدرات البشرية||" or "element|التخطيط|القدرات البشرية|" or "sub_domain|المعيار 1|التخطيط|القدرات البشرية"
  [key: string]: string; // Value is the mapped-to value from current index
}

const SectionMappingEditor = ({ currentIndex, indices, onClose, lang }: SectionMappingEditorProps) => {
  const [previousIndexId, setPreviousIndexId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());

  // Section hierarchies from both indices
  const [previousSections, setPreviousSections] = useState<SectionHierarchy[]>([]);
  const [currentSections, setCurrentSections] = useState<SectionHierarchy[]>([]);

  // Mapping state
  const [mappings, setMappings] = useState<MappingState>({});

  // Get available previous indices (exclude current)
  const availablePreviousIndices = indices.filter(idx => idx.id !== currentIndex.id);

  // Load sections when previous index is selected
  useEffect(() => {
    if (previousIndexId) {
      loadSections();
    } else {
      setPreviousSections([]);
      setMappings({});
    }
  }, [previousIndexId]);

  // Load current index sections on mount
  useEffect(() => {
    loadCurrentSections();
  }, [currentIndex.id]);

  const buildHierarchy = (requirements: Requirement[]): SectionHierarchy[] => {
    const hierarchyMap = new Map<string, SectionHierarchy>();

    for (const req of requirements) {
      const mainAreaKey = req.main_area_ar;

      if (!hierarchyMap.has(mainAreaKey)) {
        hierarchyMap.set(mainAreaKey, {
          main_area_ar: req.main_area_ar,
          main_area_en: req.main_area_en || null,
          elements: []
        });
      }

      const hierarchy = hierarchyMap.get(mainAreaKey)!;

      // Handle element level (for ETARI)
      if (req.element_ar) {
        let element = hierarchy.elements.find(e => e.element_ar === req.element_ar);
        if (!element) {
          element = {
            element_ar: req.element_ar,
            element_en: req.element_en || null,
            sub_domains: []
          };
          hierarchy.elements.push(element);
        }

        // Handle sub-domain (criteria)
        if (req.sub_domain_ar) {
          const existingSubDomain = element.sub_domains.find(sd => sd.sub_domain_ar === req.sub_domain_ar);
          if (!existingSubDomain) {
            element.sub_domains.push({
              sub_domain_ar: req.sub_domain_ar,
              sub_domain_en: req.sub_domain_en || null
            });
          }
        }
      } else if (req.sub_domain_ar) {
        // No element, but has sub_domain (for NAII-style indices)
        let element = hierarchy.elements.find(e => e.element_ar === '__no_element__');
        if (!element) {
          element = {
            element_ar: '__no_element__',
            element_en: null,
            sub_domains: []
          };
          hierarchy.elements.push(element);
        }

        const existingSubDomain = element.sub_domains.find(sd => sd.sub_domain_ar === req.sub_domain_ar);
        if (!existingSubDomain) {
          element.sub_domains.push({
            sub_domain_ar: req.sub_domain_ar,
            sub_domain_en: req.sub_domain_en || null
          });
        }
      }
    }

    return Array.from(hierarchyMap.values());
  };

  const loadCurrentSections = async () => {
    try {
      const requirements = await api.requirements.getAll({ index_id: currentIndex.id });
      const hierarchy = buildHierarchy(requirements);
      setCurrentSections(hierarchy);
    } catch (err) {
      console.error('Failed to load current sections:', err);
    }
  };

  const loadSections = async () => {
    try {
      setLoading(true);

      // Load requirements for previous index
      const previousRequirements = await api.requirements.getAll({ index_id: previousIndexId });
      const previousHierarchy = buildHierarchy(previousRequirements);
      setPreviousSections(previousHierarchy);

      // Expand all main areas by default
      setExpandedAreas(new Set(previousHierarchy.map(h => h.main_area_ar)));

      // Expand all elements by default (to show Level 3 sub-domains)
      const allElementKeys = new Set<string>();
      for (const area of previousHierarchy) {
        for (const element of area.elements) {
          if (element.element_ar !== '__no_element__') {
            allElementKeys.add(`element|${element.element_ar}|${area.main_area_ar}|`);
          }
        }
      }
      setExpandedElements(allElementKeys);

      // Initialize mappings with exact matches
      const initialMappings: MappingState = {};
      for (const prevArea of previousHierarchy) {
        const mainAreaKey = `main_area|${prevArea.main_area_ar}||`;
        // Check for exact match
        const matchingCurrent = currentSections.find(c => c.main_area_ar === prevArea.main_area_ar);
        if (matchingCurrent) {
          initialMappings[mainAreaKey] = matchingCurrent.main_area_ar;
        }

        for (const prevElement of prevArea.elements) {
          if (prevElement.element_ar !== '__no_element__') {
            const elementKey = `element|${prevElement.element_ar}|${prevArea.main_area_ar}|`;
            // Check for exact match in current sections
            for (const currArea of currentSections) {
              const matchingElement = currArea.elements.find(e => e.element_ar === prevElement.element_ar);
              if (matchingElement) {
                initialMappings[elementKey] = matchingElement.element_ar;
                break;
              }
            }
          }

          for (const prevSubDomain of prevElement.sub_domains) {
            const subDomainKey = `sub_domain|${prevSubDomain.sub_domain_ar}|${prevElement.element_ar}|${prevArea.main_area_ar}`;
            // Check for exact match
            for (const currArea of currentSections) {
              for (const currElement of currArea.elements) {
                const matchingSubDomain = currElement.sub_domains.find(sd => sd.sub_domain_ar === prevSubDomain.sub_domain_ar);
                if (matchingSubDomain) {
                  initialMappings[subDomainKey] = matchingSubDomain.sub_domain_ar;
                  break;
                }
              }
            }
          }
        }
      }
      setMappings(initialMappings);

    } catch (err: any) {
      console.error('Failed to load sections:', err);
      toast.error(lang === 'ar' ? 'فشل في تحميل الأقسام' : 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (key: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleExpandArea = (area: string) => {
    setExpandedAreas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(area)) {
        newSet.delete(area);
      } else {
        newSet.add(area);
      }
      return newSet;
    });
  };

  const toggleExpandElement = (elementKey: string) => {
    setExpandedElements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(elementKey)) {
        newSet.delete(elementKey);
      } else {
        newSet.add(elementKey);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!previousIndexId) return;

    try {
      setSaving(true);

      // Build mappings array for bulk save
      const mappingsToSave = Object.entries(mappings)
        .filter(([_, value]) => value) // Only save if there's a mapping value
        .map(([key, value]) => {
          const parts = key.split('|');
          const type = parts[0];
          const fromValue = parts[1];
          const parent1 = parts[2] || undefined;
          const parent2 = parts[3] || undefined;

          if (type === 'main_area') {
            return {
              main_area_from_ar: fromValue,
              main_area_to_ar: value
            };
          } else if (type === 'element') {
            return {
              main_area_from_ar: parent1 || '',
              main_area_to_ar: mappings[`main_area|${parent1}||`] || parent1 || '',
              element_from_ar: fromValue,
              element_to_ar: value
            };
          } else {
            // sub_domain
            return {
              main_area_from_ar: parent2 || '',
              main_area_to_ar: mappings[`main_area|${parent2}||`] || parent2 || '',
              element_from_ar: parent1 !== '__no_element__' ? parent1 : undefined,
              element_to_ar: parent1 !== '__no_element__' ? (mappings[`element|${parent1}|${parent2}|`] || parent1) : undefined,
              sub_domain_from_ar: fromValue,
              sub_domain_to_ar: value
            };
          }
        });

      if (mappingsToSave.length === 0) {
        toast.error(lang === 'ar' ? 'لا توجد تعيينات للحفظ' : 'No mappings to save');
        return;
      }

      await api.sectionMappings.bulkCreate(
        currentIndex.id,
        previousIndexId,
        mappingsToSave
      );

      toast.success(
        lang === 'ar'
          ? `تم حفظ ${mappingsToSave.length} تعيين بنجاح`
          : `Successfully saved ${mappingsToSave.length} mappings`
      );
    } catch (err: any) {
      console.error('Failed to save mappings:', err);
      toast.error(lang === 'ar' ? 'فشل في حفظ التعيينات' : 'Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  const autoMapAll = () => {
    const newMappings: MappingState = { ...mappings };

    // Helper to find best match using similarity scoring
    const findBestMatch = (needle: string, haystack: string[]): string | null => {
      // First try exact match
      const exact = haystack.find(h => h === needle);
      if (exact) return exact;

      // Then try partial contains (bidirectional)
      const partial = haystack.find(h =>
        h.includes(needle) || needle.includes(h)
      );
      if (partial) return partial;

      // Finally try word overlap
      const needleWords = needle.split(/[\s\-\/]+/);
      let bestMatch: { value: string; score: number } | null = null;

      for (const h of haystack) {
        const haystackWords = h.split(/[\s\-\/]+/);
        let matchCount = 0;
        for (const nw of needleWords) {
          if (haystackWords.some(hw => hw.includes(nw) || nw.includes(hw))) {
            matchCount++;
          }
        }
        const score = matchCount / Math.max(needleWords.length, haystackWords.length);
        if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { value: h, score };
        }
      }

      return bestMatch?.value || null;
    };

    // Collect all available values from current sections
    const allCurrentMainAreas = currentSections.map(s => s.main_area_ar);
    const allCurrentElements: string[] = [];
    const allCurrentSubDomains: string[] = [];

    for (const section of currentSections) {
      for (const element of section.elements) {
        if (element.element_ar !== '__no_element__' && !allCurrentElements.includes(element.element_ar)) {
          allCurrentElements.push(element.element_ar);
        }
        for (const sd of element.sub_domains) {
          if (!allCurrentSubDomains.includes(sd.sub_domain_ar)) {
            allCurrentSubDomains.push(sd.sub_domain_ar);
          }
        }
      }
    }

    for (const prevArea of previousSections) {
      const mainAreaKey = `main_area|${prevArea.main_area_ar}||`;

      // Find best matching main area from ALL current main areas
      const matchedMainAreaName = findBestMatch(prevArea.main_area_ar, allCurrentMainAreas);
      if (matchedMainAreaName) {
        newMappings[mainAreaKey] = matchedMainAreaName;
      }

      // Map elements - search ALL current elements, not just within matched area
      for (const prevElement of prevArea.elements) {
        if (prevElement.element_ar !== '__no_element__') {
          const elementKey = `element|${prevElement.element_ar}|${prevArea.main_area_ar}|`;

          const matchedElementName = findBestMatch(prevElement.element_ar, allCurrentElements);
          if (matchedElementName) {
            newMappings[elementKey] = matchedElementName;
          }

          // Map sub-domains - search ALL current sub-domains
          for (const prevSubDomain of prevElement.sub_domains) {
            const subDomainKey = `sub_domain|${prevSubDomain.sub_domain_ar}|${prevElement.element_ar}|${prevArea.main_area_ar}`;

            const matchedSubDomainName = findBestMatch(prevSubDomain.sub_domain_ar, allCurrentSubDomains);
            if (matchedSubDomainName) {
              newMappings[subDomainKey] = matchedSubDomainName;
            }
          }
        } else {
          // Handle NAII-style with no element level
          for (const prevSubDomain of prevElement.sub_domains) {
            const subDomainKey = `sub_domain|${prevSubDomain.sub_domain_ar}|${prevElement.element_ar}|${prevArea.main_area_ar}`;

            const matchedSubDomainName = findBestMatch(prevSubDomain.sub_domain_ar, allCurrentSubDomains);
            if (matchedSubDomainName) {
              newMappings[subDomainKey] = matchedSubDomainName;
            }
          }
        }
      }
    }

    setMappings(newMappings);
    toast.success(lang === 'ar' ? 'تم التعيين التلقائي' : 'Auto-mapping completed');
  };

  // Get unique values for dropdowns - Filter based on parent selections
  const getAllMainAreas = () => currentSections.map(s => s.main_area_ar);

  const getElementsForMainArea = (mappedMainArea?: string) => {
    // If a main area is selected, only show elements from that main area
    if (mappedMainArea) {
      const mappedSection = currentSections.find(s => s.main_area_ar === mappedMainArea);
      if (mappedSection) {
        return mappedSection.elements
          .filter(e => e.element_ar !== '__no_element__')
          .map(e => e.element_ar);
      }
    }
    // Fallback: show all elements if no main area is mapped
    const elements: string[] = [];
    for (const section of currentSections) {
      for (const element of section.elements) {
        if (element.element_ar !== '__no_element__' && !elements.includes(element.element_ar)) {
          elements.push(element.element_ar);
        }
      }
    }
    return elements;
  };

  const getSubDomainsForElement = (mappedMainArea?: string, mappedElement?: string) => {
    // If an element is selected, only show sub-domains from that element
    if (mappedMainArea && mappedElement) {
      const mappedSection = currentSections.find(s => s.main_area_ar === mappedMainArea);
      if (mappedSection) {
        const mappedElem = mappedSection.elements.find(e => e.element_ar === mappedElement);
        if (mappedElem) {
          return mappedElem.sub_domains.map(sd => sd.sub_domain_ar);
        }
      }
    }
    // If only main area is selected, show sub-domains from all elements in that main area
    if (mappedMainArea) {
      const mappedSection = currentSections.find(s => s.main_area_ar === mappedMainArea);
      if (mappedSection) {
        const subDomains: string[] = [];
        for (const elem of mappedSection.elements) {
          for (const sd of elem.sub_domains) {
            if (!subDomains.includes(sd.sub_domain_ar)) {
              subDomains.push(sd.sub_domain_ar);
            }
          }
        }
        return subDomains;
      }
    }
    // Fallback: show all sub-domains if no parent is mapped
    const subDomains: string[] = [];
    for (const section of currentSections) {
      for (const elem of section.elements) {
        for (const sd of elem.sub_domains) {
          if (!subDomains.includes(sd.sub_domain_ar)) {
            subDomains.push(sd.sub_domain_ar);
          }
        }
      }
    }
    return subDomains;
  };

  const getMappingStats = () => {
    let totalMainAreas = previousSections.length;
    let mappedMainAreas = 0;
    let totalElements = 0;
    let mappedElements = 0;
    let totalSubDomains = 0;
    let mappedSubDomains = 0;

    for (const area of previousSections) {
      if (mappings[`main_area|${area.main_area_ar}||`]) mappedMainAreas++;

      for (const element of area.elements) {
        if (element.element_ar !== '__no_element__') {
          totalElements++;
          if (mappings[`element|${element.element_ar}|${area.main_area_ar}|`]) mappedElements++;
        }

        for (const sd of element.sub_domains) {
          totalSubDomains++;
          if (mappings[`sub_domain|${sd.sub_domain_ar}|${element.element_ar}|${area.main_area_ar}`]) mappedSubDomains++;
        }
      }
    }

    return {
      totalMainAreas, mappedMainAreas,
      totalElements, mappedElements,
      totalSubDomains, mappedSubDomains
    };
  };

  const stats = getMappingStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`${colors.bgSecondary} rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
          <div>
            <h2 className={`text-2xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'محرر تعيين الأقسام' : 'Section Mapping Editor'}
            </h2>
            <p className={`text-sm ${colors.textSecondary} mt-1`}>
              {lang === 'ar'
                ? `تعيين أقسام ${currentIndex.name_ar} من مؤشر سابق`
                : `Map sections for ${currentIndex.name_en || currentIndex.name_ar} from a previous index`}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 ${colors.textSecondary} hover:${colors.textPrimary} ${colors.bgHover} rounded-lg transition`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Previous Index Selector */}
        <div className={`p-4 border-b ${colors.border} ${colors.bgTertiary}`}>
          <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
            {lang === 'ar' ? 'اختر المؤشر السابق للمقارنة' : 'Select Previous Index to Compare'}
          </label>
          <div className="flex gap-3">
            <select
              value={previousIndexId}
              onChange={(e) => setPreviousIndexId(e.target.value)}
              className={`flex-1 px-4 py-2 ${patterns.select}`}
            >
              <option value="">{lang === 'ar' ? '-- اختر مؤشر --' : '-- Select Index --'}</option>
              {availablePreviousIndices.map(idx => (
                <option key={idx.id} value={idx.id}>
                  {lang === 'ar' ? idx.name_ar : idx.name_en || idx.name_ar} ({idx.code})
                </option>
              ))}
            </select>
            {previousIndexId && (
              <button
                onClick={autoMapAll}
                disabled={loading}
                className={`px-4 py-2 ${colors.bgHover} border ${colors.border} rounded-lg flex items-center gap-2 ${colors.textSecondary} hover:${colors.textPrimary} transition disabled:opacity-50`}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {lang === 'ar' ? 'تعيين تلقائي شامل' : 'Auto-map All'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {previousSections.length > 0 && (
          <div className={`px-6 py-3 ${colors.bgTertiary} border-b ${colors.border} flex items-center justify-between`}>
            <div className="flex gap-6 text-sm">
              <span className={colors.textSecondary}>
                <Layers size={14} className="inline me-1" />
                {lang === 'ar' ? 'المحاور:' : 'Main Areas:'}{' '}
                <strong className={stats.mappedMainAreas === stats.totalMainAreas ? 'text-green-600' : colors.textPrimary}>
                  {stats.mappedMainAreas}/{stats.totalMainAreas}
                </strong>
              </span>
              <span className={colors.textSecondary}>
                {lang === 'ar' ? 'العناصر:' : 'Elements:'}{' '}
                <strong className={stats.mappedElements === stats.totalElements ? 'text-green-600' : colors.textPrimary}>
                  {stats.mappedElements}/{stats.totalElements}
                </strong>
              </span>
              <span className={colors.textSecondary}>
                {lang === 'ar' ? 'المعايير:' : 'Criteria:'}{' '}
                <strong className={stats.mappedSubDomains === stats.totalSubDomains ? 'text-green-600' : colors.textPrimary}>
                  {stats.mappedSubDomains}/{stats.totalSubDomains}
                </strong>
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 ${patterns.button} flex items-center gap-2 disabled:opacity-50`}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التعيينات' : 'Save Mappings')}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className={`w-12 h-12 ${colors.textSecondary} mx-auto mb-4 animate-spin`} />
                <p className={colors.textSecondary}>
                  {lang === 'ar' ? 'جاري تحميل الأقسام...' : 'Loading sections...'}
                </p>
              </div>
            </div>
          ) : !previousIndexId ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <AlertCircle className={`w-12 h-12 ${colors.textSecondary} mx-auto mb-4`} />
                <p className={colors.textSecondary}>
                  {lang === 'ar'
                    ? 'اختر مؤشراً سابقاً للبدء في تعيين الأقسام'
                    : 'Select a previous index to start mapping sections'}
                </p>
              </div>
            </div>
          ) : previousSections.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <AlertCircle className={`w-12 h-12 ${colors.textSecondary} mx-auto mb-4`} />
                <p className={colors.textSecondary}>
                  {lang === 'ar' ? 'لا توجد أقسام في المؤشر المحدد' : 'No sections found in the selected index'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Loop through previous index sections */}
              {previousSections.map((area) => {
                const mainAreaKey = `main_area|${area.main_area_ar}||`;
                const isExpanded = expandedAreas.has(area.main_area_ar);
                const mainAreaMapped = !!mappings[mainAreaKey];

                return (
                  <div
                    key={area.main_area_ar}
                    className={`border-2 rounded-xl overflow-hidden shadow-sm ${
                      mainAreaMapped ? 'border-purple-400/50 dark:border-purple-500/30' : 'border-amber-400/50 dark:border-amber-500/30'
                    }`}
                  >
                    {/* LEVEL 1: Main Area Row - Purple theme */}
                    <div className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20">
                      <button
                        onClick={() => toggleExpandArea(area.main_area_ar)}
                        className={`p-1.5 bg-purple-100 dark:bg-purple-800/50 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700/50 transition`}
                      >
                        {isExpanded ? <ChevronUp size={18} className="text-purple-600 dark:text-purple-400" /> : <ChevronDown size={18} className="text-purple-600 dark:text-purple-400" />}
                      </button>

                      {/* Level indicator badge */}
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-500 text-white rounded">
                          {lang === 'ar' ? 'المستوى 1' : 'Level 1'}
                        </span>
                        <span className={`text-xs ${colors.textSecondary}`}>
                          {lang === 'ar' ? 'المحور الرئيسي' : 'Main Area'}
                        </span>
                      </div>

                      <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                        {/* Previous Value */}
                        <div className="ps-2 border-s-2 border-purple-400 dark:border-purple-600">
                          <p className={`text-xs text-purple-600 dark:text-purple-400 mb-1 font-medium`}>
                            {lang === 'ar' ? 'السابق' : 'Previous'}
                          </p>
                          <p className={`font-semibold ${colors.textPrimary}`}>
                            {area.main_area_ar}
                          </p>
                        </div>

                        {/* Current Value - Dropdown */}
                        <div className="flex items-center gap-3">
                          <ArrowRight className="text-purple-500" size={20} />
                          <div className="flex-1">
                            <p className={`text-xs text-purple-600 dark:text-purple-400 mb-1 font-medium`}>
                              {lang === 'ar' ? 'الحالي' : 'Current'}
                            </p>
                            <select
                              value={mappings[mainAreaKey] || ''}
                              onChange={(e) => handleMappingChange(mainAreaKey, e.target.value)}
                              className={`w-full px-3 py-2 ${patterns.select} text-sm border-purple-300 dark:border-purple-700 focus:ring-purple-500`}
                            >
                              <option value="">{lang === 'ar' ? '-- اختر المحور --' : '-- Select Main Area --'}</option>
                              {getAllMainAreas().map((ma, idx) => (
                                <option key={idx} value={ma}>{ma}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        mainAreaMapped
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                      }`}>
                        {mainAreaMapped ? <Check size={16} /> : <AlertCircle size={16} />}
                      </div>
                    </div>

                    {/* Elements */}
                    {isExpanded && area.elements.length > 0 && (
                      <div className={`border-t ${colors.border}`}>
                        {area.elements.map((element) => {
                          if (element.element_ar === '__no_element__') {
                            // No element level, show sub-domains directly with teal theme (Level 2 in this case)
                            return element.sub_domains.map((sd, sdIndex) => {
                              const subDomainKey = `sub_domain|${sd.sub_domain_ar}|${element.element_ar}|${area.main_area_ar}`;
                              const subDomainMapped = !!mappings[subDomainKey];

                              return (
                                <div
                                  key={sd.sub_domain_ar}
                                  className={`flex items-center gap-3 p-4 ps-8 bg-teal-50 dark:bg-teal-900/10 border-s-4 border-teal-400 dark:border-teal-600 ms-4 ${sdIndex > 0 ? 'border-t border-teal-200 dark:border-teal-800' : ''}`}
                                >
                                  {/* Level indicator badge */}
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-teal-500 text-white rounded">
                                      {lang === 'ar' ? 'المستوى 2' : 'Level 2'}
                                    </span>
                                    <span className={`text-xs ${colors.textSecondary}`}>
                                      {lang === 'ar' ? 'المعيار' : 'Criteria'}
                                    </span>
                                  </div>

                                  <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                                    <div className="ps-2 border-s-2 border-teal-400 dark:border-teal-600">
                                      <p className={`text-xs text-teal-600 dark:text-teal-400 mb-1 font-medium`}>
                                        {lang === 'ar' ? 'السابق' : 'Previous'}
                                      </p>
                                      <p className={`text-sm font-medium ${colors.textPrimary}`}>{sd.sub_domain_ar}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <ArrowRight className="text-teal-500" size={16} />
                                      <div className="flex-1">
                                        <p className={`text-xs text-teal-600 dark:text-teal-400 mb-1 font-medium`}>
                                          {lang === 'ar' ? 'الحالي' : 'Current'}
                                        </p>
                                        <select
                                          value={mappings[subDomainKey] || ''}
                                          onChange={(e) => handleMappingChange(subDomainKey, e.target.value)}
                                          className={`w-full px-3 py-2 ${patterns.select} text-sm border-teal-300 dark:border-teal-700`}
                                        >
                                          <option value="">{lang === 'ar' ? '-- اختر المعيار --' : '-- Select Criteria --'}</option>
                                          {getSubDomainsForElement(mappings[mainAreaKey]).map((sda, idx) => (
                                            <option key={idx} value={sda}>{sda}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    subDomainMapped
                                      ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                  }`}>
                                    {subDomainMapped ? <Check size={12} /> : null}
                                  </div>
                                </div>
                              );
                            });
                          }

                          const elementKey = `element|${element.element_ar}|${area.main_area_ar}|`;
                          const elementMapped = !!mappings[elementKey];
                          const isElementExpanded = expandedElements.has(elementKey);

                          return (
                            <div key={element.element_ar} className={`border-b last:border-b-0 ${colors.border}`}>
                              {/* LEVEL 2: Element Row - Blue theme */}
                              <div className="flex items-center gap-4 p-4 ps-8 bg-blue-50 dark:bg-blue-900/10 border-s-4 border-blue-400 dark:border-blue-600 ms-4">
                                {element.sub_domains.length > 0 && (
                                  <button
                                    onClick={() => toggleExpandElement(elementKey)}
                                    className="p-1 bg-blue-100 dark:bg-blue-800/50 rounded hover:bg-blue-200 dark:hover:bg-blue-700/50 transition"
                                  >
                                    {isElementExpanded ? <ChevronUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ChevronDown size={14} className="text-blue-600 dark:text-blue-400" />}
                                  </button>
                                )}

                                {/* Level indicator badge */}
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-500 text-white rounded">
                                    {lang === 'ar' ? 'المستوى 2' : 'Level 2'}
                                  </span>
                                  <span className={`text-xs ${colors.textSecondary}`}>
                                    {lang === 'ar' ? 'العنصر' : 'Element'}
                                  </span>
                                </div>

                                <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                                  <div className="ps-2 border-s-2 border-blue-400 dark:border-blue-600">
                                    <p className={`text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium`}>
                                      {lang === 'ar' ? 'السابق' : 'Previous'}
                                    </p>
                                    <p className={`text-sm font-medium ${colors.textPrimary}`}>{element.element_ar}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <ArrowRight className="text-blue-500" size={16} />
                                    <div className="flex-1">
                                      <p className={`text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium`}>
                                        {lang === 'ar' ? 'الحالي' : 'Current'}
                                      </p>
                                      <select
                                        value={mappings[elementKey] || ''}
                                        onChange={(e) => handleMappingChange(elementKey, e.target.value)}
                                        className={`w-full px-3 py-2 ${patterns.select} text-sm border-blue-300 dark:border-blue-700`}
                                      >
                                        <option value="">{lang === 'ar' ? '-- اختر العنصر --' : '-- Select Element --'}</option>
                                        {getElementsForMainArea(mappings[mainAreaKey]).map((el, idx) => (
                                          <option key={idx} value={el}>{el}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  elementMapped
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                }`}>
                                  {elementMapped ? <Check size={12} /> : null}
                                </div>
                              </div>

                              {/* LEVEL 3: Sub-domains - Teal theme */}
                              {isElementExpanded && element.sub_domains.length > 0 && (
                                <div className="ms-8 border-s-2 border-dashed border-teal-300 dark:border-teal-700">
                                  {element.sub_domains.map((sd, sdIndex) => {
                                    const subDomainKey = `sub_domain|${sd.sub_domain_ar}|${element.element_ar}|${area.main_area_ar}`;
                                    const subDomainMapped = !!mappings[subDomainKey];

                                    return (
                                      <div
                                        key={sd.sub_domain_ar}
                                        className={`flex items-center gap-3 p-3 ps-6 ms-4 bg-teal-50 dark:bg-teal-900/10 ${sdIndex > 0 ? 'border-t border-teal-200 dark:border-teal-800' : ''}`}
                                      >
                                        {/* Level indicator badge */}
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-teal-500 text-white rounded">
                                            {lang === 'ar' ? 'المستوى 3' : 'L3'}
                                          </span>
                                        </div>

                                        <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                                          <div className="ps-2 border-s-2 border-teal-400 dark:border-teal-600">
                                            <p className={`text-xs text-teal-600 dark:text-teal-400 mb-1 font-medium`}>
                                              {lang === 'ar' ? 'المعيار (السابق)' : 'Criteria (Previous)'}
                                            </p>
                                            <p className={`text-sm ${colors.textPrimary}`}>{sd.sub_domain_ar}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <ArrowRight className="text-teal-500" size={14} />
                                            <div className="flex-1">
                                              <p className={`text-xs text-teal-600 dark:text-teal-400 mb-1 font-medium`}>
                                                {lang === 'ar' ? 'المعيار (الحالي)' : 'Criteria (Current)'}
                                              </p>
                                              <select
                                                value={mappings[subDomainKey] || ''}
                                                onChange={(e) => handleMappingChange(subDomainKey, e.target.value)}
                                                className={`w-full px-2 py-1.5 ${patterns.select} text-sm border-teal-300 dark:border-teal-700`}
                                              >
                                                <option value="">{lang === 'ar' ? '-- اختر المعيار --' : '-- Select Criteria --'}</option>
                                                {getSubDomainsForElement(mappings[mainAreaKey], mappings[elementKey]).map((sda, idx) => (
                                                  <option key={idx} value={sda}>{sda}</option>
                                                ))}
                                              </select>
                                            </div>
                                          </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                          subDomainMapped
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                        }`}>
                                          {subDomainMapped ? <Check size={10} /> : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-4 border-t ${colors.border}`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 ${colors.bgTertiary} ${colors.textPrimary} rounded-lg ${colors.bgHover} transition font-medium`}
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SectionMappingEditor;
