import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Youtube,
  FileText,
  Presentation,
  Download,
  ExternalLink,
  Trash2,
  Edit,
  X,
  Upload,
  Loader2,
  AlertCircle,
  Play,
  Layers
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { api, KnowledgeItem } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useIndexStore } from '../stores/indexStore';
import { useAuthStore } from '../stores/authStore';
import { colors, patterns } from '../utils/darkMode';
import toast from 'react-hot-toast';

// YouTube video ID extraction
const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Get YouTube thumbnail
const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Content type icons and colors - using green theme
const contentTypeConfig = {
  youtube: {
    icon: Youtube,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    label: { ar: 'فيديو يوتيوب', en: 'YouTube Video' }
  },
  pdf: {
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    label: { ar: 'ملف PDF', en: 'PDF Document' }
  },
  pptx: {
    icon: Presentation,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    label: { ar: 'عرض تقديمي', en: 'PowerPoint' }
  }
};

// Component to fetch and display authenticated thumbnail images
interface ThumbnailImageProps {
  src: string;
  alt: string;
  className?: string;
  token: string | null;
}

const ThumbnailImage = ({ src, alt, className, token }: ThumbnailImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(src, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) throw new Error('Failed to fetch thumbnail');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setImageSrc(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, token]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <FileText className="text-gray-400" size={48} />
      </div>
    );
  }

  return <img src={imageSrc} alt={alt} className={className} />;
};

const KnowledgeCenter = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const { currentIndex } = useIndexStore();
  const { user } = useAuthStore();
  const lang = language;

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);

  // Check if user can manage (add/edit/delete) - admin or owner
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = currentIndex?.user_role?.toLowerCase() === 'owner';
  const canManage = isAdmin || isOwner;

  // Load data
  useEffect(() => {
    if (currentIndex?.id && currentIndex.index_type === 'ETARI') {
      loadItems();
    } else {
      setLoading(false);
    }
  }, [currentIndex?.id]);

  const loadItems = async () => {
    if (!currentIndex?.id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.knowledge.getAll(currentIndex.id);
      setItems(response.items);
    } catch (err: any) {
      console.error('Failed to load knowledge items:', err);
      setError(err.message || 'Failed to load knowledge items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: KnowledgeItem) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا العنصر؟' : 'Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await api.knowledge.delete(item.id);
      toast.success(lang === 'ar' ? 'تم حذف العنصر بنجاح' : 'Item deleted successfully');
      loadItems();
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل حذف العنصر' : 'Failed to delete item');
    }
  };

  // Helper to get auth token from zustand storage
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

  // Get thumbnail URL for PDF/PPTX items
  const getThumbnailUrl = (item: KnowledgeItem): string | null => {
    if (item.content_type === 'youtube') {
      const videoId = extractYouTubeVideoId(item.content_url);
      return videoId ? getYouTubeThumbnail(videoId) : null;
    }
    // For PDF/PPTX, use the API thumbnail endpoint
    if (item.thumbnail_path) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      return `${apiUrl}/api/v1/knowledge/${item.id}/thumbnail`;
    }
    return null;
  };

  const handleItemClick = (item: KnowledgeItem) => {
    if (item.content_type === 'youtube') {
      window.open(item.content_url, '_blank');
    } else {
      // Download file
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const downloadUrl = `${apiUrl}/api/v1/knowledge/${item.id}/download`;
      const token = getAuthToken();

      // Create a temporary anchor to trigger download with auth
      const link = document.createElement('a');
      link.setAttribute('download', item.file_name || 'download');

      // Add auth header via fetch and blob
      fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Download failed');
          return res.blob();
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(() => {
          toast.error(lang === 'ar' ? 'فشل تحميل الملف' : 'Failed to download file');
        });
    }
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
                ? 'مركز المعرفة متاح فقط لمؤشرات ETARI'
                : 'Knowledge Center is only available for ETARI indexes'}
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
              onClick={loadItems}
              className={`px-6 py-2 ${patterns.button}`}
            >
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bgPrimary} ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'مركز المعرفة' : 'Knowledge Center'}
            </h1>
            <p className={`mt-2 ${colors.textSecondary}`}>
              {lang === 'ar'
                ? 'مقاطع فيديو وملفات تعليمية'
                : 'Educational videos and files'}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              {lang === 'ar' ? 'إضافة عنصر' : 'Add Item'}
            </button>
          )}
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className={`${patterns.section} p-12 text-center`}>
            <h3 className={`text-xl font-semibold mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'لا توجد عناصر بعد' : 'No Items Yet'}
            </h3>
            <p className={`${colors.textSecondary} mb-6`}>
              {lang === 'ar'
                ? 'ابدأ بإضافة مقاطع فيديو أو ملفات تعليمية'
                : 'Start by adding educational videos or files'}
            </p>
            {canManage && (
              <button
                onClick={() => setShowAddModal(true)}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors`}
              >
                <Plus size={20} />
                {lang === 'ar' ? 'إضافة أول عنصر' : 'Add First Item'}
              </button>
            )}
          </div>
        )}

        {/* Items Grid */}
        {items.length > 0 && (
          <div className="space-y-6">
            {items.map((item) => {
              const config = contentTypeConfig[item.content_type];
              const Icon = config.icon;
              const thumbnail = getThumbnailUrl(item);

              return (
                <div
                  key={item.id}
                  className={`${patterns.section} overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group`}
                >
                  {/* Title Header */}
                  <div className={`px-4 sm:px-6 py-4 border-b ${colors.border} ${config.bgColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colors.bgPrimary}`}>
                          <Icon className={config.color} size={24} />
                        </div>
                        <div>
                          <h3 className={`text-lg sm:text-xl font-bold ${colors.textPrimary}`}>
                            {item.title}
                          </h3>
                          <span className={`text-sm ${colors.textSecondary}`}>
                            {config.label[lang]}
                            {item.file_size && ` • ${formatFileSize(item.file_size)}`}
                          </span>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                              setShowAddModal(true);
                            }}
                            className={`p-2 rounded-lg ${colors.bgPrimary} ${colors.hover} transition`}
                            title={lang === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            <Edit size={18} className={colors.textSecondary} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item);
                            }}
                            className={`p-2 rounded-lg ${colors.bgPrimary} hover:bg-red-100 dark:hover:bg-red-900/30 transition`}
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 size={18} className="text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Body */}
                  <div
                    className="flex flex-col md:flex-row cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    {/* Thumbnail/Preview - Left Side */}
                    <div className="md:w-80 lg:w-96 flex-shrink-0 relative overflow-hidden">
                      {thumbnail ? (
                        <div className="relative aspect-video md:h-full">
                          {item.content_type === 'youtube' ? (
                            <img
                              src={thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                // Fallback to lower quality thumbnail
                                const target = e.target as HTMLImageElement;
                                if (target.src.includes('maxresdefault')) {
                                  target.src = target.src.replace('maxresdefault', 'hqdefault');
                                }
                              }}
                            />
                          ) : (
                            <ThumbnailImage
                              src={thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              token={getAuthToken()}
                            />
                          )}
                          {/* Play button overlay for YouTube */}
                          {item.content_type === 'youtube' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                <Play className="text-white ml-1" size={28} fill="white" />
                              </div>
                            </div>
                          )}
                          {/* File type badge for PDF/PPTX */}
                          {item.content_type !== 'youtube' && (
                            <div className="absolute top-3 left-3">
                              <div className={`px-2 py-1 rounded-md ${config.bgColor} border ${config.borderColor} flex items-center gap-1`}>
                                <Icon className={config.color} size={16} />
                                <span className={`text-xs font-medium ${config.color}`}>
                                  {item.content_type.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`aspect-video md:h-full flex items-center justify-center ${config.bgColor}`}>
                          <div className="text-center p-6">
                            <Icon className={`${config.color} mx-auto mb-3`} size={64} />
                            <p className={`text-sm font-medium ${colors.textSecondary}`}>
                              {item.file_name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description - Right Side */}
                    <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between">
                      <div>
                        {item.description ? (
                          <p className={`${colors.textSecondary} text-base leading-relaxed`}>
                            {item.description}
                          </p>
                        ) : (
                          <p className={`${colors.textTertiary} italic`}>
                            {lang === 'ar' ? 'لا يوجد وصف' : 'No description'}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`text-sm ${colors.textTertiary}`}>
                          {lang === 'ar' ? 'بواسطة: ' : 'By: '}
                          {lang === 'ar' ? item.creator_name : item.creator_name_en || item.creator_name}
                        </span>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${config.bgColor} border ${config.borderColor} ${config.color} font-medium transition-all group-hover:shadow-md`}>
                          {item.content_type === 'youtube' ? (
                            <>
                              <ExternalLink size={18} />
                              {lang === 'ar' ? 'مشاهدة' : 'Watch'}
                            </>
                          ) : (
                            <>
                              <Download size={18} />
                              {lang === 'ar' ? 'تحميل' : 'Download'}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <AddEditModal
            item={editingItem}
            indexId={currentIndex.id}
            lang={lang}
            onClose={() => {
              setShowAddModal(false);
              setEditingItem(null);
            }}
            onSuccess={() => {
              setShowAddModal(false);
              setEditingItem(null);
              loadItems();
            }}
          />
        )}
      </div>
    </div>
  );
};

// Add/Edit Modal Component
interface AddEditModalProps {
  item: KnowledgeItem | null;
  indexId: string;
  lang: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddEditModal = ({ item, indexId, lang, onClose, onSuccess }: AddEditModalProps) => {
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [contentType, setContentType] = useState<'youtube' | 'pdf' | 'pptx'>(item?.content_type || 'youtube');
  const [youtubeUrl, setYoutubeUrl] = useState(item?.content_type === 'youtube' ? item.content_url : '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!item;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(lang === 'ar' ? 'يرجى إدخال العنوان' : 'Please enter a title');
      return;
    }

    if (contentType === 'youtube') {
      if (!youtubeUrl.trim()) {
        toast.error(lang === 'ar' ? 'يرجى إدخال رابط يوتيوب' : 'Please enter a YouTube URL');
        return;
      }
      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        toast.error(lang === 'ar' ? 'رابط يوتيوب غير صالح' : 'Invalid YouTube URL');
        return;
      }
    } else if (!isEdit && !file) {
      toast.error(lang === 'ar' ? 'يرجى اختيار ملف' : 'Please select a file');
      return;
    }

    try {
      setSaving(true);

      if (isEdit) {
        await api.knowledge.update(item.id, {
          title,
          description: description || undefined,
          content_url: contentType === 'youtube' ? youtubeUrl : undefined,
        });
        toast.success(lang === 'ar' ? 'تم تحديث العنصر بنجاح' : 'Item updated successfully');
      } else {
        await api.knowledge.create({
          index_id: indexId,
          title,
          description: description || undefined,
          content_type: contentType,
          content_url: contentType === 'youtube' ? youtubeUrl : undefined,
          file: file || undefined,
        });
        toast.success(lang === 'ar' ? 'تم إضافة العنصر بنجاح' : 'Item added successfully');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Failed to save knowledge item:', err);
      toast.error(err.message || (lang === 'ar' ? 'فشل حفظ العنصر' : 'Failed to save item'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (contentType === 'pdf' && ext !== 'pdf') {
        toast.error(lang === 'ar' ? 'يرجى اختيار ملف PDF' : 'Please select a PDF file');
        return;
      }
      if (contentType === 'pptx' && ext !== 'pptx') {
        toast.error(lang === 'ar' ? 'يرجى اختيار ملف PowerPoint' : 'Please select a PowerPoint file');
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`${colors.bgSecondary} rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${colors.border}`}>
          <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
            {isEdit
              ? (lang === 'ar' ? 'تعديل العنصر' : 'Edit Item')
              : (lang === 'ar' ? 'إضافة عنصر جديد' : 'Add New Item')
            }
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${colors.hover} transition`}
          >
            <X size={20} className={colors.textSecondary} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Content Type Selection (only for new items) */}
          {!isEdit && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'نوع المحتوى' : 'Content Type'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['youtube', 'pdf', 'pptx'] as const).map((type) => {
                  const config = contentTypeConfig[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setContentType(type);
                        setFile(null);
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition ${
                        contentType === type
                          ? `${config.borderColor} ${config.bgColor}`
                          : `${colors.border} ${colors.bgPrimary} ${colors.hover}`
                      }`}
                    >
                      <Icon className={config.color} size={24} />
                      <span className={`text-xs font-medium ${colors.textPrimary}`}>
                        {config.label[lang]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'العنوان' : 'Title'} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder={lang === 'ar' ? 'أدخل العنوان...' : 'Enter title...'}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
              placeholder={lang === 'ar' ? 'أدخل وصفاً للمحتوى...' : 'Enter description...'}
            />
          </div>

          {/* YouTube URL or File Upload */}
          {contentType === 'youtube' ? (
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'رابط يوتيوب' : 'YouTube URL'} *
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.textPrimary} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="https://www.youtube.com/watch?v=..."
                required={contentType === 'youtube'}
              />
              {/* YouTube Preview */}
              {youtubeUrl && extractYouTubeVideoId(youtubeUrl) && (
                <div className="mt-2 rounded-lg overflow-hidden border ${colors.border}">
                  <img
                    src={getYouTubeThumbnail(extractYouTubeVideoId(youtubeUrl)!)}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.includes('maxresdefault')) {
                        target.src = target.src.replace('maxresdefault', 'hqdefault');
                      }
                    }}
                  />
                </div>
              )}
            </div>
          ) : !isEdit ? (
            <div>
              <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
                {lang === 'ar' ? 'الملف' : 'File'} *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept={contentType === 'pdf' ? '.pdf' : '.pptx'}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed ${colors.border} rounded-lg ${colors.hover} transition`}
              >
                {file ? (
                  <div className="text-center">
                    {contentType === 'pdf' ? (
                      <FileText className="text-red-500 mx-auto mb-2" size={32} />
                    ) : (
                      <Presentation className="text-orange-500 mx-auto mb-2" size={32} />
                    )}
                    <p className={`font-medium ${colors.textPrimary}`}>{file.name}</p>
                    <p className={`text-sm ${colors.textSecondary}`}>{formatFileSize(file.size)}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className={`${colors.textSecondary} mx-auto mb-2`} size={32} />
                    <p className={colors.textSecondary}>
                      {lang === 'ar'
                        ? `اضغط لاختيار ملف ${contentType.toUpperCase()}`
                        : `Click to select a ${contentType.toUpperCase()} file`
                      }
                    </p>
                  </div>
                )}
              </button>
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${colors.bgTertiary}`}>
              <p className={`text-sm ${colors.textSecondary}`}>
                {lang === 'ar'
                  ? 'لا يمكن تغيير الملف. قم بحذف العنصر وإضافته مجدداً إذا كنت تريد تغيير الملف.'
                  : 'File cannot be changed. Delete and re-add the item if you want to change the file.'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`px-4 py-2 rounded-lg border ${colors.border} ${colors.textSecondary} ${colors.hover} transition`}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2 ${patterns.button} disabled:opacity-50`}
            >
              {saving && <Loader2 className="animate-spin" size={18} />}
              {isEdit
                ? (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                : (lang === 'ar' ? 'إضافة' : 'Add')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KnowledgeCenter;
