import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import { Comment } from '../../types';

interface CommentListProps {
  comments: any[];
  requirementId: string;
  lang: 'ar' | 'en';
}

const CommentList = ({ comments: initialComments, requirementId, lang }: CommentListProps) => {
  const [comments, setComments] = useState(initialComments);

  const handleCommentAdded = (newComment: any) => {
    setComments([newComment, ...comments]);
  };

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      <CommentForm
        requirementId={requirementId}
        onCommentAdded={handleCommentAdded}
        lang={lang}
      />

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length > 0 ? (
          <>
            <div className="flex items-center gap-2 text-gray-600">
              <MessageSquare size={18} />
              <span className="text-sm font-medium">
                {comments.length} {lang === 'ar' ? 'تعليق' : 'comment(s)'}
              </span>
            </div>
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} lang={lang} />
            ))}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="mx-auto mb-3 text-gray-400" size={48} />
            <p>{lang === 'ar' ? 'لا توجد تعليقات بعد' : 'No comments yet'}</p>
            <p className="text-sm mt-1">
              {lang === 'ar' ? 'كن أول من يضيف تعليق' : 'Be the first to comment'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentList;
