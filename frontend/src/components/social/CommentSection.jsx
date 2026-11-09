import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { resolveAvatar } from '../../constants/sampleImages';
import { apiGet, apiPost } from '../../lib/api';
import { LoadingImage } from '../ui/LoadingImage';

export const CommentSection = ({ postId, onAdded }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    apiGet(`/api/posts/${encodeURIComponent(postId)}/comments`)
      .then((rows) => {
        if (!cancelled) setComments(rows);
      })
      .catch((error) => console.error(error));

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!userProfile) {
      navigate('/login');
      return;
    }

    setLoading(true);
    const content = newComment.trim();
    try {
      const saved = await apiPost(`/api/posts/${encodeURIComponent(postId)}/comments`, {
        userId: userProfile.uid,
        authorName: userProfile.displayName,
        authorAvatar: userProfile.photoURL,
        content,
      });
      setComments((current) => [saved.comment, ...current]);
      if (onAdded) onAdded(saved.commentsCount);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 pt-4 border-t border-slate-100">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-100">
          {userProfile?.photoURL ? (
            <LoadingImage src={resolveAvatar(userProfile.photoURL)} alt="Me" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={16} className="text-slate-400" />
            </div>
          )}
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
          />
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary disabled:opacity-30 hover:scale-110 transition-transform"
          >
            <Send size={18} />
          </button>
        </div>
      </form>

      <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-100 mt-1">
              <LoadingImage src={resolveAvatar(comment.authorAvatar)} alt={comment.authorName} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="bg-slate-50 rounded-2xl p-3 inline-block max-w-full">
                <p className="text-[10px] font-black text-slate-900 mb-0.5">{comment.authorName}</p>
                <p className="text-xs text-slate-700 leading-relaxed break-words">{comment.content}</p>
              </div>
              <p className="text-[9px] text-slate-400 mt-1 ml-2">
                {comment.createdAt && typeof comment.createdAt !== 'string' && (comment.createdAt).toDate
                  ? formatDistanceToNow((comment.createdAt).toDate(), { addSuffix: true }) 
                  : typeof comment.createdAt === 'string' 
                    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                    : 'just now'}
              </p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-[10px] text-slate-400 text-center py-2 italic font-medium">No comments yet. Be the first to share your thoughts!</p>
        )}
      </div>
    </div>
  );
};
