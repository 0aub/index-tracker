import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Plus,
  Send,
  Paperclip,
  X,
  Trash2,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  AlertCircle,
  Layers,
  User
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { api, SupportThread, SupportReply, SupportAttachment } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useIndexStore } from '../stores/indexStore';
import { useAuthStore } from '../stores/authStore';
import { colors, patterns } from '../utils/darkMode';
import toast from 'react-hot-toast';

// Format date
const formatDate = (dateString: string, lang: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return lang === 'ar' ? 'الآن' : 'Just now';
  if (diffMins < 60) return lang === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
  if (diffHours < 24) return lang === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
  if (diffDays < 7) return lang === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;

  return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format file size
const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

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

const Support = () => {
  const navigate = useNavigate();
  const { language } = useUIStore();
  const { currentIndex } = useIndexStore();
  const { user } = useAuthStore();
  const lang = language;

  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [threadDetails, setThreadDetails] = useState<{ [key: string]: SupportThread }>({});
  const [loadingThread, setLoadingThread] = useState<string | null>(null);

  // Load threads
  useEffect(() => {
    if (currentIndex?.id && currentIndex.index_type === 'ETARI') {
      loadThreads();
    } else {
      setLoading(false);
    }
  }, [currentIndex?.id]);

  const loadThreads = async () => {
    if (!currentIndex?.id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.support.getAll(currentIndex.id);
      setThreads(response.threads);
    } catch (err: any) {
      console.error('Failed to load support threads:', err);
      setError(err.message || 'Failed to load support threads');
    } finally {
      setLoading(false);
    }
  };

  const loadThreadDetails = async (threadId: string) => {
    if (threadDetails[threadId]) return;

    try {
      setLoadingThread(threadId);
      const thread = await api.support.getById(threadId);
      setThreadDetails(prev => ({ ...prev, [threadId]: thread }));
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل تحميل الردود' : 'Failed to load replies');
    } finally {
      setLoadingThread(null);
    }
  };

  const handleToggleThread = async (threadId: string) => {
    if (expandedThread === threadId) {
      setExpandedThread(null);
    } else {
      setExpandedThread(threadId);
      await loadThreadDetails(threadId);
    }
  };

  const handleDeleteThread = async (thread: SupportThread) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا السؤال؟' : 'Are you sure you want to delete this thread?')) {
      return;
    }

    try {
      await api.support.delete(thread.id);
      toast.success(lang === 'ar' ? 'تم حذف السؤال بنجاح' : 'Thread deleted successfully');
      loadThreads();
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل حذف السؤال' : 'Failed to delete thread');
    }
  };

  const handleMarkResolved = async (thread: SupportThread) => {
    try {
      await api.support.update(thread.id, { is_resolved: !thread.is_resolved });
      toast.success(
        thread.is_resolved
          ? (lang === 'ar' ? 'تم إعادة فتح السؤال' : 'Thread reopened')
          : (lang === 'ar' ? 'تم تحديد السؤال كمحلول' : 'Thread marked as resolved')
      );
      loadThreads();
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل تحديث الحالة' : 'Failed to update status');
    }
  };

  const handleDownloadAttachment = async (attachment: SupportAttachment) => {
    const token = getAuthToken();
    const url = api.support.getAttachmentDownloadUrl(attachment.id);

    try {
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل تحميل الملف' : 'Failed to download file');
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
                ? 'الدعم متاح فقط لمؤشرات ETARI'
                : 'Support is only available for ETARI indexes'}
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
              onClick={loadThreads}
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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${colors.textPrimary}`}>
              {lang === 'ar' ? 'الدعم' : 'Support'}
            </h1>
            <p className={`mt-2 ${colors.textSecondary}`}>
              {lang === 'ar'
                ? 'اطرح سؤالك وساعد الآخرين'
                : 'Ask your question and help others'}
            </p>
          </div>
          <button
            onClick={() => setShowNewThreadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            {lang === 'ar' ? 'سؤال جديد' : 'New Question'}
          </button>
        </div>

        {/* Empty State */}
        {threads.length === 0 && (
          <div className={`${patterns.section} p-12 text-center`}>
            <MessageCircle className={`w-16 h-16 mx-auto mb-4 ${colors.textSecondary}`} />
            <h3 className={`text-xl font-semibold mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'لا توجد أسئلة بعد' : 'No Questions Yet'}
            </h3>
            <p className={`${colors.textSecondary} mb-6`}>
              {lang === 'ar'
                ? 'كن أول من يطرح سؤالاً'
                : 'Be the first to ask a question'}
            </p>
            <button
              onClick={() => setShowNewThreadModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              {lang === 'ar' ? 'طرح سؤال' : 'Ask Question'}
            </button>
          </div>
        )}

        {/* Threads List */}
        {threads.length > 0 && (
          <div className="space-y-4">
            {threads.map((thread) => {
              const isExpanded = expandedThread === thread.id;
              const details = threadDetails[thread.id];
              const canDelete = thread.created_by === user?.id || user?.role === 'ADMIN';

              return (
                <div
                  key={thread.id}
                  className={`${patterns.section} overflow-hidden`}
                >
                  {/* Thread Header */}
                  <div
                    className={`p-4 cursor-pointer ${colors.hover}`}
                    onClick={() => handleToggleThread(thread.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {thread.is_resolved ? (
                            <CheckCircle className="text-green-500 flex-shrink-0" size={18} />
                          ) : (
                            <Clock className="text-teal-500 flex-shrink-0" size={18} />
                          )}
                          <h3 className={`font-semibold truncate ${colors.textPrimary}`}>
                            {thread.title}
                          </h3>
                        </div>
                        <p className={`text-sm ${colors.textSecondary} line-clamp-2`}>
                          {thread.content}
                        </p>
                        <div className={`flex items-center gap-4 mt-2 text-xs ${colors.textTertiary}`}>
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {lang === 'ar' ? thread.creator_name : thread.creator_name_en || thread.creator_name}
                          </span>
                          <span>{formatDate(thread.created_at, lang)}</span>
                          <span className="flex items-center gap-1">
                            <MessageCircle size={12} />
                            {thread.replies_count} {lang === 'ar' ? 'رد' : 'replies'}
                          </span>
                          {thread.attachments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip size={12} />
                              {thread.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteThread(thread);
                            }}
                            className={`p-1.5 rounded ${colors.hover}`}
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkResolved(thread);
                          }}
                          className={`p-1.5 rounded ${colors.hover}`}
                          title={thread.is_resolved ? (lang === 'ar' ? 'إعادة فتح' : 'Reopen') : (lang === 'ar' ? 'تم الحل' : 'Mark Resolved')}
                        >
                          <CheckCircle size={16} className={thread.is_resolved ? 'text-green-500' : colors.textSecondary} />
                        </button>
                        {isExpanded ? (
                          <ChevronUp size={20} className={colors.textSecondary} />
                        ) : (
                          <ChevronDown size={20} className={colors.textSecondary} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className={`border-t ${colors.border}`}>
                      {/* Thread Attachments */}
                      {thread.attachments.length > 0 && (
                        <div className={`px-4 py-3 ${colors.bgTertiary} border-b ${colors.border}`}>
                          <p className={`text-xs font-semibold mb-3 ${colors.textSecondary}`}>
                            {lang === 'ar' ? 'المرفقات:' : 'Attachments:'}
                          </p>
                          <div className="space-y-2">
                            {thread.attachments.map((att) => {
                              const extension = att.file_name.split('.').pop()?.toLowerCase() || '';
                              return (
                                <div
                                  key={att.id}
                                  className={`flex items-center justify-between p-3 rounded-lg ${colors.bgSecondary} border ${colors.border} hover:shadow-sm transition`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                      ['pdf'].includes(extension) ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                      ['doc', 'docx'].includes(extension) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                      ['xls', 'xlsx'].includes(extension) ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                                      ['ppt', 'pptx'].includes(extension) ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                      ['png', 'jpg', 'jpeg', 'gif'].includes(extension) ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                                      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    }`}>
                                      <Paperclip size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium ${colors.textPrimary} truncate`}>
                                        {att.file_name}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {extension && (
                                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono uppercase">
                                            {extension}
                                          </span>
                                        )}
                                        {att.file_size && (
                                          <span className={`text-xs ${colors.textTertiary}`}>
                                            {formatFileSize(att.file_size)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDownloadAttachment(att)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-800 transition text-xs font-medium"
                                  >
                                    <Download size={14} />
                                    {lang === 'ar' ? 'تحميل' : 'Download'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Loading Replies */}
                      {loadingThread === thread.id && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="animate-spin text-teal-500" size={24} />
                        </div>
                      )}

                      {/* Replies */}
                      {details?.replies && details.replies.length > 0 && (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {details.replies.map((reply) => (
                            <ReplyItem
                              key={reply.id}
                              reply={reply}
                              threadId={thread.id}
                              lang={lang}
                              currentUserId={user?.id}
                              isAdmin={user?.role === 'ADMIN'}
                              onDelete={() => {
                                // Reload thread details after delete
                                setThreadDetails(prev => {
                                  const newDetails = { ...prev };
                                  delete newDetails[thread.id];
                                  return newDetails;
                                });
                                loadThreadDetails(thread.id);
                                loadThreads();
                              }}
                              onDownloadAttachment={handleDownloadAttachment}
                            />
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      <ReplyForm
                        threadId={thread.id}
                        lang={lang}
                        onSuccess={() => {
                          setThreadDetails(prev => {
                            const newDetails = { ...prev };
                            delete newDetails[thread.id];
                            return newDetails;
                          });
                          loadThreadDetails(thread.id);
                          loadThreads();
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* New Thread Modal */}
        {showNewThreadModal && currentIndex && (
          <NewThreadModal
            indexId={currentIndex.id}
            lang={lang}
            onClose={() => setShowNewThreadModal(false)}
            onSuccess={() => {
              setShowNewThreadModal(false);
              loadThreads();
            }}
          />
        )}
      </div>
    </div>
  );
};

// Reply Item Component
interface ReplyItemProps {
  reply: SupportReply;
  threadId: string;
  lang: string;
  currentUserId?: string;
  isAdmin?: boolean;
  onDelete: () => void;
  onDownloadAttachment: (att: SupportAttachment) => void;
}

const ReplyItem = ({ reply, threadId, lang, currentUserId, isAdmin, onDelete, onDownloadAttachment }: ReplyItemProps) => {
  const canDelete = reply.created_by === currentUserId || isAdmin;

  const handleDelete = async () => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الرد؟' : 'Are you sure you want to delete this reply?')) {
      return;
    }

    try {
      await api.support.deleteReply(threadId, reply.id);
      toast.success(lang === 'ar' ? 'تم حذف الرد' : 'Reply deleted');
      onDelete();
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل حذف الرد' : 'Failed to delete reply');
    }
  };

  return (
    <div className={`px-4 py-3 ${colors.bgSecondary}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className={`flex items-center gap-2 text-xs ${colors.textTertiary} mb-1`}>
            <User size={12} />
            <span className="font-medium">
              {lang === 'ar' ? reply.creator_name : reply.creator_name_en || reply.creator_name}
            </span>
            <span>•</span>
            <span>{formatDate(reply.created_at, lang)}</span>
          </div>
          <p className={`text-sm ${colors.textPrimary}`}>{reply.content}</p>

          {/* Reply Attachments */}
          {reply.attachments.length > 0 && (
            <div className="space-y-2 mt-3">
              {reply.attachments.map((att) => {
                const extension = att.file_name.split('.').pop()?.toLowerCase() || '';
                return (
                  <div
                    key={att.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg ${colors.bgTertiary} border ${colors.border}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        ['pdf'].includes(extension) ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                        ['doc', 'docx'].includes(extension) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        ['xls', 'xlsx'].includes(extension) ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                        ['ppt', 'pptx'].includes(extension) ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Paperclip size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${colors.textPrimary} truncate`}>{att.file_name}</p>
                        {att.file_size && (
                          <p className={`text-[10px] ${colors.textTertiary}`}>{formatFileSize(att.file_size)}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onDownloadAttachment(att)}
                      className="flex items-center gap-1 px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded hover:bg-teal-200 dark:hover:bg-teal-800 transition text-xs"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            className={`p-1 rounded ${colors.hover}`}
            title={lang === 'ar' ? 'حذف' : 'Delete'}
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
};

// Reply Form Component
interface ReplyFormProps {
  threadId: string;
  lang: string;
  onSuccess: () => void;
}

const ReplyForm = ({ threadId, lang, onSuccess }: ReplyFormProps) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error(lang === 'ar' ? 'يرجى كتابة الرد' : 'Please enter a reply');
      return;
    }

    try {
      setSending(true);
      await api.support.createReply(threadId, {
        content: content.trim(),
        files: files.length > 0 ? files : undefined
      });
      setContent('');
      setFiles([]);
      toast.success(lang === 'ar' ? 'تم إرسال الرد' : 'Reply sent');
      onSuccess();
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل إرسال الرد' : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className={`p-4 ${colors.bgTertiary}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={lang === 'ar' ? 'اكتب ردك هنا...' : 'Write your reply here...'}
            className={`w-full px-3 py-2 rounded-lg border ${colors.border} ${colors.bgSecondary} ${colors.textPrimary} text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
            rows={2}
          />

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${colors.bgSecondary} border ${colors.border}`}
                >
                  <Paperclip size={12} />
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg ${colors.hover}`}
            title={lang === 'ar' ? 'إرفاق ملف' : 'Attach file'}
          >
            <Paperclip size={18} className={colors.textSecondary} />
          </button>
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="p-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

// New Thread Modal Component
interface NewThreadModalProps {
  indexId: string;
  lang: string;
  onClose: () => void;
  onSuccess: () => void;
}

const NewThreadModal = ({ indexId, lang, onClose, onSuccess }: NewThreadModalProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(lang === 'ar' ? 'يرجى إدخال العنوان' : 'Please enter a title');
      return;
    }

    if (!content.trim()) {
      toast.error(lang === 'ar' ? 'يرجى إدخال السؤال' : 'Please enter your question');
      return;
    }

    try {
      setSaving(true);
      await api.support.create({
        index_id: indexId,
        title: title.trim(),
        content: content.trim(),
        files: files.length > 0 ? files : undefined
      });
      toast.success(lang === 'ar' ? 'تم نشر السؤال بنجاح' : 'Question posted successfully');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || (lang === 'ar' ? 'فشل نشر السؤال' : 'Failed to post question'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`${colors.bgSecondary} rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${colors.border}`}>
          <h2 className={`text-xl font-bold ${colors.textPrimary}`}>
            {lang === 'ar' ? 'سؤال جديد' : 'New Question'}
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
          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'العنوان' : 'Title'} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.textPrimary} focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
              placeholder={lang === 'ar' ? 'عنوان السؤال...' : 'Question title...'}
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'السؤال' : 'Question'} *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className={`w-full px-4 py-2 rounded-lg border ${colors.border} ${colors.bgPrimary} ${colors.textPrimary} focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none`}
              placeholder={lang === 'ar' ? 'اكتب سؤالك بالتفصيل...' : 'Describe your question in detail...'}
              required
            />
          </div>

          {/* File Upload */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${colors.textPrimary}`}>
              {lang === 'ar' ? 'المرفقات' : 'Attachments'}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed ${colors.border} rounded-lg ${colors.hover} transition`}
            >
              <Paperclip className={colors.textSecondary} size={20} />
              <span className={colors.textSecondary}>
                {lang === 'ar' ? 'اضغط لإرفاق ملفات' : 'Click to attach files'}
              </span>
            </button>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bgTertiary} border ${colors.border}`}
                  >
                    <Paperclip size={14} className={colors.textSecondary} />
                    <span className={`text-sm truncate max-w-[150px] ${colors.textPrimary}`}>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-1 text-red-500 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              className="flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="animate-spin" size={18} />}
              {lang === 'ar' ? 'نشر السؤال' : 'Post Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Support;
