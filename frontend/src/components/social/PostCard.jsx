import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { CommentSection } from './CommentSection';
import { resolveAvatar, resolveGem, resolvePostMedia } from '../../constants/sampleImages';
import { useActivity } from '../../contexts/ActivityContext';
import { LoadingImage } from '../ui/LoadingImage';

export const PostCard = ({ post }) => {
  const media = resolvePostMedia(post.media);
  const { likes, follows, toggleLike, toggleFollow } = useActivity();
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const isFollowing = follows.some((row) => row.targetId === post.authorId && row.targetType === 'user');

  useEffect(() => {
    setIsLiked(likes.includes(post.id));
  }, [likes, post.id]);

  useEffect(() => {
    setLikesCount(post.likesCount || 0);
    setCommentsCount(post.commentsCount || 0);
  }, [post.id, post.likesCount, post.commentsCount]);

  const handleLike = async () => {
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount((count) => Math.max(0, count + (wasLiked ? -1 : 1)));
    try {
      const result = await toggleLike(post.id);
      if (!result) {
        setIsLiked(wasLiked);
        setLikesCount((count) => Math.max(0, count + (wasLiked ? 1 : -1)));
        return;
      }
      setIsLiked(result.liked);
      if (typeof result.likesCount === 'number') setLikesCount(result.likesCount);
    } catch (error) {
      console.error(error);
      setIsLiked(wasLiked);
      setLikesCount((count) => Math.max(0, count + (wasLiked ? 1 : -1)));
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.authorName} | Ceylon Gem Book`,
          text: post.content,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4 hover:border-slate-300 transition-all">
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 overflow-hidden ring-2 ring-white shadow-sm shrink-0">
              <LoadingImage src={resolveAvatar(post.authorAvatar)} alt={post.authorName} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-xs md:text-sm">{post.authorName}</span>
                {post.authorType === 'VENDOR' && (
                  <span className="bg-primary/5 text-primary text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Vendor</span>
                )}
              </div>
              <p className="text-[9px] md:text-[10px] text-slate-400 font-medium lowercase">
                {post.createdAt && typeof post.createdAt !== 'string' && (post.createdAt).toDate
                  ? formatDistanceToNow((post.createdAt).toDate(), { addSuffix: true }) 
                  : typeof post.createdAt === 'string'
                    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
                    : 'just now'}{post.location ? ` • ${post.location}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => toggleFollow(post.authorId, 'user')}
              className="text-primary font-bold text-[10px] md:text-xs hover:bg-primary/5 px-4 py-2 rounded-full border-2 border-primary/20 transition-all hover:border-primary/40 active:scale-95 shadow-sm"
            >
              {isFollowing ? 'Following' : '+ Follow'}
            </button>
          </div>
        </div>

        <p className="text-slate-800 text-[13px] md:text-[15px] leading-relaxed mb-4 whitespace-pre-wrap">
          {post.content}
        </p>

        {media[0] && (
        <div className="rounded-xl overflow-hidden border border-slate-100 mb-4 bg-slate-50">
          <LoadingImage
            src={resolveGem(media[0])}
            alt="Post content"
            className="w-full max-h-[500px] object-cover hover:scale-[1.02] transition-transform duration-700"
          />
        </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={handleLike}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-colors group",
                isLiked ? "text-primary" : "text-slate-500 hover:text-primary"
              )}
            >
              <div className="flex items-center gap-1.5 group-active:scale-125 transition-all">
                <Heart size={20} className={cn(isLiked && "fill-current")} />
                <span className="text-xs font-bold">{likesCount}</span>
              </div>
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-colors group",
                showComments ? "text-primary" : "text-slate-500 hover:text-primary"
              )}
            >
              <div className="flex items-center gap-1.5 group-active:scale-110 transition-all">
                <MessageCircle size={20} className={cn(showComments && "fill-current")} />
                <span className="text-xs font-bold">{commentsCount}</span>
              </div>
            </button>
          </div>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors bg-slate-50 px-3 py-1.5 rounded-full group"
          >
            <Share2 size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold">Share</span>
          </button>
        </div>

        {showComments && (
          <CommentSection
            postId={post.id}
            onAdded={(count) => setCommentsCount(typeof count === 'number' ? count : (value) => value + 1)}
          />
        )}
      </div>
    </div>
  );
};
