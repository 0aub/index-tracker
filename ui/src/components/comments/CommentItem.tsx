import { MessageCircle } from 'lucide-react';
import { Comment } from '../../types';

interface CommentItemProps {
  comment: Comment;
  lang: 'ar' | 'en';
}

const CommentItem = ({ comment, lang }: CommentItemProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <MessageCircle className="text-blue-600" size={20} />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-900">{comment.user_name}</h4>
          <span className="text-xs text-gray-500">
            {formatDate(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>
        {comment.type && comment.type !== 'general' && (
          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
            {comment.type === 'review' && (lang === 'ar' ? 'مراجعة' : 'Review')}
            {comment.type === 'feedback' && (lang === 'ar' ? 'ملاحظة' : 'Feedback')}
            {comment.type === 'question' && (lang === 'ar' ? 'سؤال' : 'Question')}
          </span>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
