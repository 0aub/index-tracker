import { useState } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

interface CommentFormProps {
  requirementId: string;
  onCommentAdded: (comment: any) => void;
  lang: 'ar' | 'en';
}

const CommentForm = ({ requirementId, onCommentAdded, lang }: CommentFormProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error(lang === 'ar' ? 'الرجاء إدخال تعليق' : 'Please enter a comment');
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock API call - in real implementation, this would call the API
      const newComment = {
        id: 'comment-' + Date.now(),
        content: content.trim(),
        user_id: user?.id || '',
        user_name: lang === 'ar' ? user?.name : user?.name_en || '',
        created_at: new Date().toISOString(),
        type: 'general' as const
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      onCommentAdded(newComment);
      setContent('');
      toast.success(lang === 'ar' ? 'تم إضافة التعليق بنجاح' : 'Comment added successfully');
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل إضافة التعليق' : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={lang === 'ar' ? 'أضف تعليق أو ملاحظة...' : 'Add a comment or note...'}
        rows={4}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
          <span>{lang === 'ar' ? 'إرسال' : 'Send'}</span>
        </button>
      </div>
    </form>
  );
};

export default CommentForm;
