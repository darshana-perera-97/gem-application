import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Star, MessageSquare, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { resolveAvatar } from '../../constants/sampleImages';
import { apiGet, apiPost } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { LoadingImage } from '../ui/LoadingImage';

export const ReviewsSection = ({ vendorId, vendorUserId, isOwnProfile = false }) => {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const reviewingOwnProfile = Boolean(
    isOwnProfile
    || (userProfile && (
      userProfile.uid === vendorId
      || (vendorUserId && userProfile.uid === vendorUserId)
    ))
  );

  useEffect(() => {
    let cancelled = false;
    apiGet(`/api/reviews?targetId=${encodeURIComponent(vendorId)}`)
      .then((rows) => {
        if (!cancelled) setReviews(rows);
      })
      .catch((error) => console.error(error));

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || reviewingOwnProfile) return;
    if (!userProfile) {
      navigate('/login');
      return;
    }

    setLoading(true);
    const text = content.trim();
    try {
      const saved = await apiPost('/api/reviews', {
        userId: userProfile.uid,
        targetId: vendorId,
        authorName: userProfile.displayName,
        authorAvatar: userProfile.photoURL,
        rating,
        content: text,
      });
      setReviews((current) => [saved, ...current]);
      setContent('');
      setRating(5);
    } catch (error) {
      console.error('Error adding review:', error);
      alert(error.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {userProfile && reviewingOwnProfile && (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
          You cannot leave a review on your own profile.
        </div>
      )}

      {userProfile && !reviewingOwnProfile && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            Write a Review
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="transition-transform active:scale-125"
                >
                  <Star 
                    size={24} 
                    className={cn(
                      s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                    )} 
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-slate-500">{rating}/5 Stars</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience with this dealer..."
              className="w-full min-h-[100px] p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none"
            />
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 px-2 flex items-center gap-2">
          Customer Reviews 
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-bold">{reviews.length}</span>
        </h3>
        
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-slate-100">
                  <LoadingImage src={resolveAvatar(review.authorAvatar)} alt={review.authorName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{review.authorName}</p>
                  <p className="text-[10px] text-slate-400">
                    {review.createdAt && typeof review.createdAt !== 'string' && (review.createdAt).toDate
                      ? formatDistanceToNow((review.createdAt).toDate(), { addSuffix: true }) 
                      : typeof review.createdAt === 'string'
                        ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })
                        : 'just now'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star 
                    key={s} 
                    size={12} 
                    className={cn(s <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-100")} 
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed italic">"{review.content}"</p>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">No reviews yet for this business.</p>
          </div>
        )}
      </div>
    </div>
  );
};
