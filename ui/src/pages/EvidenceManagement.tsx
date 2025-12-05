import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Download,
  Eye,
  Home,
  Layers,
  AlertCircle,
  Loader2,
  Paperclip,
  ArrowLeft,
  FolderTree,
  Archive
} from 'lucide-react';
import JSZip from 'jszip';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { api, Requirement, Evidence } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useIndexStore } from '../stores/indexStore';
import { useAuthStore } from '../stores/authStore';
import { colors, patterns } from '../utils/darkMode';
import toast from 'react-hot-toast';

// Types for folder structure
interface FolderItem {
  id: string;
  name: string;
  nameEn?: string;
  type: 'folder' | 'file' | 'txt';
  children?: FolderItem[];
  requirementId?: string;
  evidence?: Evidence;
  content?: string; // For txt file content
}

// Get auth token helper
const getAuthToken = (): string | null => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }
  return null;
};

const EvidenceManagement = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const { currentIndex } = useIndexStore();
  const { user } = useAuthStore();
  const lang = language;

  // Check if user is admin or owner
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = currentIndex?.user_role?.toLowerCase() === 'owner';
  const canAccess = isAdmin || isOwner;

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<{ [reqId: string]: Evidence[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FolderItem | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Load data
  useEffect(() => {
    if (currentIndex?.id && currentIndex.index_type === 'ETARI') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [currentIndex?.id]);

  const loadData = async () => {
    if (!currentIndex?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load requirements
      const reqs = await api.requirements.getAll({ index_id: currentIndex.id });
      setRequirements(reqs);

      // Load evidence for each requirement
      const evidenceByReq: { [reqId: string]: Evidence[] } = {};
      for (const req of reqs) {
        try {
          const evidence = await api.evidence.getByRequirement(req.id);
          // Only include confirmed/approved evidence
          evidenceByReq[req.id] = evidence.filter(
            (e: Evidence) => e.status === 'confirmed' || e.status === 'approved'
          );
        } catch {
          evidenceByReq[req.id] = [];
        }
      }
      setEvidenceMap(evidenceByReq);

    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Build folder structure from requirements
  const buildFolderStructure = (): FolderItem[] => {
    if (!currentIndex || requirements.length === 0) return [];

    const root: FolderItem = {
      id: 'root',
      name: currentIndex.name_ar,
      nameEn: currentIndex.name_en || currentIndex.name_ar,
      type: 'folder',
      children: []
    };

    // Group by main_area (Capability)
    const areaMap: { [key: string]: FolderItem } = {};

    requirements.forEach(req => {
      const areaKey = req.main_area_ar;
      const areaKeyEn = req.main_area_en || req.main_area_ar;

      if (!areaMap[areaKey]) {
        areaMap[areaKey] = {
          id: `area_${areaKey}`,
          name: areaKey,
          nameEn: areaKeyEn,
          type: 'folder',
          children: []
        };
      }

      // Group by sub_domain (Standard)
      const subDomainKey = `${areaKey}_${req.sub_domain_ar}`;
      let subDomainFolder = areaMap[areaKey].children?.find(
        c => c.id === `subdomain_${subDomainKey}`
      );

      if (!subDomainFolder) {
        subDomainFolder = {
          id: `subdomain_${subDomainKey}`,
          name: req.sub_domain_ar,
          nameEn: req.sub_domain_en || req.sub_domain_ar,
          type: 'folder',
          children: []
        };
        areaMap[areaKey].children?.push(subDomainFolder);
      }

      // Group by element (if exists)
      let parentFolder = subDomainFolder;
      if (req.element_ar) {
        const elementKey = `${subDomainKey}_${req.element_ar}`;
        let elementFolder = subDomainFolder.children?.find(
          c => c.id === `element_${elementKey}`
        );

        if (!elementFolder) {
          elementFolder = {
            id: `element_${elementKey}`,
            name: req.element_ar,
            nameEn: req.element_en || req.element_ar,
            type: 'folder',
            children: []
          };
          subDomainFolder.children?.push(elementFolder);
        }
        parentFolder = elementFolder;
      }

      // Create requirement folder
      const reqFolder: FolderItem = {
        id: `req_${req.id}`,
        name: req.code,
        nameEn: req.code,
        type: 'folder',
        requirementId: req.id,
        children: []
      };

      // Add requirement.txt with question and answer
      const txtContent = buildRequirementTxt(req);
      reqFolder.children?.push({
        id: `txt_${req.id}`,
        name: 'requirement.txt',
        type: 'txt',
        content: txtContent,
        requirementId: req.id
      });

      // Add attachments folder if has evidence
      const reqEvidence = evidenceMap[req.id] || [];
      if (req.evidence_description_ar && req.evidence_description_ar.trim()) {
        const attachmentsFolder: FolderItem = {
          id: `attachments_${req.id}`,
          name: lang === 'ar' ? 'المرفقات' : 'Attachments',
          nameEn: 'Attachments',
          type: 'folder',
          children: reqEvidence.map(ev => ({
            id: `evidence_${ev.id}`,
            name: ev.document_name,
            type: 'file' as const,
            evidence: ev
          }))
        };
        reqFolder.children?.push(attachmentsFolder);
      }

      parentFolder.children?.push(reqFolder);
    });

    root.children = Object.values(areaMap);
    return [root];
  };

  const buildRequirementTxt = (req: Requirement): string => {
    const lines = [];

    lines.push(`# ${req.code}`);
    lines.push('');
    lines.push('## السؤال / Question');
    lines.push(req.question_ar);
    if (req.question_en) {
      lines.push('');
      lines.push(req.question_en);
    }
    lines.push('');

    if (req.answer_status === 'confirmed' || req.answer_status === 'approved') {
      lines.push('---');
      lines.push('');
      lines.push('## الإجابة المعتمدة / Confirmed Answer');
      if (req.answer_ar) {
        lines.push(req.answer_ar);
      }
      if (req.answer_en) {
        lines.push('');
        lines.push(req.answer_en);
      }
    }

    return lines.join('\n');
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleDownloadEvidence = async (evidence: Evidence) => {
    const token = getAuthToken();
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/evidence/${evidence.id}/download`;

    try {
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = evidence.document_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل تحميل الملف' : 'Failed to download file');
    }
  };

  // Download all as ZIP
  const handleDownloadZip = async () => {
    if (!currentIndex) return;

    try {
      setDownloadingZip(true);
      toast.loading(lang === 'ar' ? 'جاري إنشاء الملف المضغوط...' : 'Creating ZIP file...');

      const zip = new JSZip();
      const indexName = lang === 'ar' ? currentIndex.name_ar : (currentIndex.name_en || currentIndex.name_ar);

      // Group requirements by hierarchy
      for (const req of requirements) {
        const areaName = lang === 'ar' ? req.main_area_ar : (req.main_area_en || req.main_area_ar);
        const subDomainName = lang === 'ar' ? req.sub_domain_ar : (req.sub_domain_en || req.sub_domain_ar);
        const elementName = req.element_ar ? (lang === 'ar' ? req.element_ar : (req.element_en || req.element_ar)) : null;

        // Build folder path
        let folderPath = `${indexName}/${areaName}/${subDomainName}`;
        if (elementName) {
          folderPath += `/${elementName}`;
        }
        folderPath += `/${req.code}`;

        // Add requirement.txt
        const txtContent = buildRequirementTxt(req);
        zip.file(`${folderPath}/requirement.txt`, txtContent);

        // Add evidence files
        const reqEvidence = evidenceMap[req.id] || [];
        for (const ev of reqEvidence) {
          try {
            const token = getAuthToken();
            const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/evidence/${ev.id}/download`;
            const response = await fetch(url, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
              const blob = await response.blob();
              zip.file(`${folderPath}/Attachments/${ev.document_name}`, blob);
            }
          } catch (err) {
            console.error(`Failed to download evidence ${ev.id}:`, err);
          }
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${indexName.replace(/[/\\?%*:|"<>]/g, '-')}_evidence.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.dismiss();
      toast.success(lang === 'ar' ? 'تم تحميل الملف المضغوط بنجاح' : 'ZIP file downloaded successfully');
    } catch (err) {
      toast.dismiss();
      toast.error(lang === 'ar' ? 'فشل إنشاء الملف المضغوط' : 'Failed to create ZIP file');
    } finally {
      setDownloadingZip(false);
    }
  };

  // Get folder icon color based on level
  const getFolderColor = (itemId: string) => {
    if (itemId === 'root') return 'text-blue-500';
    if (itemId.startsWith('area_')) return 'text-purple-500';
    if (itemId.startsWith('subdomain_')) return 'text-teal-500';
    if (itemId.startsWith('element_')) return 'text-orange-500';
    if (itemId.startsWith('req_')) return 'text-green-500';
    if (itemId.startsWith('attachments_')) return 'text-amber-500';
    return 'text-gray-500';
  };

  // Get level colors for vertical lines
  const getLevelColor = (depth: number): string => {
    const levelColors = [
      'bg-blue-400 dark:bg-blue-500',      // Level 0 - Domain
      'bg-purple-400 dark:bg-purple-500',  // Level 1 - Sub-domain
      'bg-orange-400 dark:bg-orange-500',  // Level 2 - Element
      'bg-green-400 dark:bg-green-500',    // Level 3 - Requirement
      'bg-amber-400 dark:bg-amber-500',    // Level 4 - Attachments
    ];
    return levelColors[depth] || 'bg-gray-300 dark:bg-gray-600';
  };

  const renderFolderItem = (item: FolderItem, depth: number = 0, parentLines: number[] = []): React.ReactNode => {
    const isExpanded = expandedFolders.has(item.id);
    const folderColor = getFolderColor(item.id);
    const isRTL = lang === 'ar';

    // Render vertical lines for all parent levels (on the right side for RTL)
    const renderParentLines = () => {
      return parentLines.map((lineDepth) => (
        <div
          key={`line-${lineDepth}`}
          className={`absolute top-0 bottom-0 w-0.5 ${getLevelColor(lineDepth)}`}
          style={isRTL
            ? { right: `${lineDepth * 24 + 8}px` }
            : { left: `${lineDepth * 24 + 8}px` }
          }
        />
      ));
    };

    if (item.type === 'folder') {
      const hasChildren = item.children && item.children.length > 0;
      const FolderIcon = isExpanded ? FolderOpen : Folder;

      return (
        <div key={item.id} className="relative">
          {/* Parent vertical lines */}
          {depth > 0 && renderParentLines()}

          {/* Current level horizontal connector */}
          {depth > 0 && (
            <div
              className={`absolute h-0.5 ${getLevelColor(depth - 1)}`}
              style={isRTL
                ? { right: `${(depth - 1) * 24 + 8}px`, top: '14px', width: '12px' }
                : { left: `${(depth - 1) * 24 + 8}px`, top: '14px', width: '12px' }
              }
            />
          )}

          <div
            className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer ${colors.hover} rounded transition-colors`}
            style={isRTL
              ? { marginRight: `${depth * 24}px` }
              : { marginLeft: `${depth * 24}px` }
            }
            onClick={() => hasChildren && toggleFolder(item.id)}
          >
            {/* Expand/Collapse icon */}
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={14} className={colors.textSecondary} />
              ) : (
                <ChevronRight size={14} className={`${colors.textSecondary} ${isRTL ? 'rotate-180' : ''}`} />
              )
            ) : (
              <div style={{ width: '14px' }} />
            )}

            {/* Folder icon */}
            <FolderIcon size={16} className={folderColor} />

            {/* Folder name */}
            <span className={`text-sm ${colors.textPrimary} flex-1 truncate`}>
              {lang === 'ar' ? item.name : (item.nameEn || item.name)}
            </span>

            {/* View button for requirements */}
            {item.requirementId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/requirements/${item.requirementId}`);
                }}
                className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                {lang === 'ar' ? 'عرض' : 'View'}
              </button>
            )}
          </div>

          {/* Children */}
          {isExpanded && hasChildren && (
            <div className="relative">
              {item.children?.map((child, index) =>
                renderFolderItem(
                  child,
                  depth + 1,
                  // Pass current depth to children for drawing vertical lines, except for last child
                  index < (item.children?.length || 0) - 1 ? [...parentLines, depth] : parentLines
                )
              )}
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'txt') {
      return (
        <div key={item.id} className="relative">
          {/* Parent vertical lines */}
          {depth > 0 && renderParentLines()}

          {/* Current level horizontal connector */}
          {depth > 0 && (
            <div
              className={`absolute h-0.5 ${getLevelColor(depth - 1)}`}
              style={isRTL
                ? { right: `${(depth - 1) * 24 + 8}px`, top: '14px', width: '12px' }
                : { left: `${(depth - 1) * 24 + 8}px`, top: '14px', width: '12px' }
              }
            />
          )}

          <div
            className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer ${colors.hover} rounded transition-colors`}
            style={isRTL
              ? { marginRight: `${depth * 24}px` }
              : { marginLeft: `${depth * 24}px` }
            }
            onClick={() => setSelectedFile(item)}
          >
            <div style={{ width: '14px' }} />
            <FileText size={16} className="text-gray-500" />
            <span className={`text-sm ${colors.textPrimary} flex-1`}>{item.name}</span>
            <Eye size={14} className={colors.textSecondary} />
          </div>
        </div>
      );
    }

    if (item.type === 'file' && item.evidence) {
      return (
        <div key={item.id} className="relative">
          {/* Parent vertical lines */}
          {depth > 0 && renderParentLines()}

          {/* Current level horizontal connector */}
          {depth > 0 && (
            <div
              className={`absolute h-0.5 ${getLevelColor(depth - 1)}`}
              style={isRTL
                ? { right: `${(depth - 1) * 24 + 8}px`, top: '14px', width: '12px' }
                : { left: `${(depth - 1) * 24 + 8}px`, top: '14px', width: '12px' }
              }
            />
          )}

          <div
            className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer ${colors.hover} rounded transition-colors`}
            style={isRTL
              ? { marginRight: `${depth * 24}px` }
              : { marginLeft: `${depth * 24}px` }
            }
            onClick={() => handleDownloadEvidence(item.evidence!)}
          >
            <div style={{ width: '14px' }} />
            <Paperclip size={16} className="text-blue-500" />
            <span className={`text-sm ${colors.textPrimary} truncate flex-1`}>{item.name}</span>
            <Download size={14} className={colors.textSecondary} />
          </div>
        </div>
      );
    }

    return null;
  };

  // No index selected
  if (!currentIndex) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Layers className={`w-16 h-16 ${colors.textSecondary} mx-auto mb-4`} />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'لم يتم اختيار مؤشر' : 'No Index Selected'}
            </h3>
            <p className={`${colors.textSecondary} mb-6`}>
              {lang === 'ar'
                ? 'يرجى اختيار مؤشر من القائمة أعلاه'
                : 'Please select an index from the selector above'}
            </p>
            <button
              onClick={() => navigate('/index')}
              className={`px-6 py-3 ${patterns.button}`}
            >
              {lang === 'ar' ? 'إدارة المؤشرات' : 'Manage Index'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not ETARI index
  if (currentIndex.index_type !== 'ETARI') {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'غير متاح لهذا المؤشر' : 'Not Available'}
            </h3>
            <p className={`${colors.textSecondary} mb-6`}>
              {lang === 'ar'
                ? 'إدارة المرفقات متاحة فقط لمؤشرات ETARI'
                : 'Evidence Management is only available for ETARI indexes'}
            </p>
            <button
              onClick={() => navigate('/requirements')}
              className={`px-6 py-3 ${patterns.button}`}
            >
              {lang === 'ar' ? 'العودة للمتطلبات' : 'Go to Requirements'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not admin or owner - restricted access
  if (!canAccess) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'غير مصرح لك' : 'Access Denied'}
            </h3>
            <p className={`${colors.textSecondary} mb-6`}>
              {lang === 'ar'
                ? 'هذه الصفحة متاحة فقط لمالك المؤشر'
                : 'This page is only available to the index owner'}
            </p>
            <button
              onClick={() => navigate('/requirements')}
              className={`px-6 py-3 ${patterns.button}`}
            >
              {lang === 'ar' ? 'العودة للمتطلبات' : 'Go to Requirements'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="md" text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className={`text-xl font-bold ${colors.textPrimary} mb-2`}>
              {lang === 'ar' ? 'حدث خطأ' : 'Error Occurred'}
            </h3>
            <p className={`${colors.textSecondary} mb-4`}>{error}</p>
            <button
              onClick={loadData}
              className={`px-6 py-2 ${patterns.button}`}
            >
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const folderStructure = buildFolderStructure();

  return (
    <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'إدارة المرفقات' : 'Evidence Management'}
            </h1>
            <p className={`mt-2 ${colors.textSecondary}`}>
              {lang === 'ar'
                ? 'استعراض المرفقات والأدلة بهيكل شجري'
                : 'Browse evidence and attachments in folder structure'}
            </p>
          </div>
          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip || requirements.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 ${patterns.button} disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
          >
            {downloadingZip ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Archive size={18} />
            )}
            {lang === 'ar' ? 'تحميل الكل (ZIP)' : 'Download All (ZIP)'}
          </button>
        </div>

        {/* Hierarchy Legend */}
        <div className={`${patterns.section} p-4 mb-6`}>
          <h3 className={`text-sm font-semibold mb-3 ${colors.textPrimary}`}>
            {lang === 'ar' ? 'دليل المستويات:' : 'Hierarchy Legend:'}
          </h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className={`text-xs ${colors.textSecondary}`}>{lang === 'ar' ? 'المؤشر' : 'Index'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className={`text-xs ${colors.textSecondary}`}>{lang === 'ar' ? 'القدرة' : 'Capability'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-500"></div>
              <span className={`text-xs ${colors.textSecondary}`}>{lang === 'ar' ? 'المعيار' : 'Standard'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className={`text-xs ${colors.textSecondary}`}>{lang === 'ar' ? 'العنصر' : 'Element'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className={`text-xs ${colors.textSecondary}`}>{lang === 'ar' ? 'المتطلب' : 'Requirement'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Folder Tree */}
          <div className={`flex-1 ${patterns.section} p-4 overflow-auto`} style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <FolderTree className="text-amber-500" size={20} />
              <span className={`font-semibold ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الهيكل الشجري' : 'Folder Structure'}
              </span>
            </div>

            {folderStructure.length > 0 ? (
              <div>
                {folderStructure.map(folder => renderFolderItem(folder))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Folder className={`w-12 h-12 mx-auto mb-3 ${colors.textSecondary}`} />
                <p className={colors.textSecondary}>
                  {lang === 'ar' ? 'لا توجد متطلبات' : 'No requirements found'}
                </p>
              </div>
            )}
          </div>

          {/* File Preview Panel */}
          {selectedFile && selectedFile.type === 'txt' && (
            <div className={`w-96 ${patterns.section} p-4`}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FileText className="text-gray-500" size={18} />
                  <span className={`font-semibold ${colors.textPrimary}`}>
                    {selectedFile.name}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className={`p-1 rounded ${colors.hover}`}
                >
                  <ArrowLeft size={18} className={colors.textSecondary} />
                </button>
              </div>
              <pre className={`text-sm ${colors.textPrimary} whitespace-pre-wrap font-sans leading-relaxed`}>
                {selectedFile.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidenceManagement;
