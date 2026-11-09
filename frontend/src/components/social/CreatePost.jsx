import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Image, Send, X } from 'lucide-react';
import { resolveAvatar } from '../../constants/sampleImages';
import { apiPost } from '../../lib/api';
import { emitCatalogChange } from '../../lib/catalogEvents';
import { LoadingImage } from '../ui/LoadingImage';
import { cn } from '../../lib/utils';

export const CreatePost = () => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState([]);
  const [mode, setMode] = useState('STORY');
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    const openComposer = (event) => {
      const nextMode = event?.detail?.mode === 'ARTICLE' ? 'ARTICLE' : 'STORY';
      setMode(nextMode);
      setIsExpanded(true);
    };
    window.addEventListener('gem:open-create-post', openComposer);
    return () => window.removeEventListener('gem:open-create-post', openComposer);
  }, []);

  const isArticle = mode === 'ARTICLE';

  const reset = () => {
    setContent('');
    setTitle('');
    setMedia([]);
    setMode('STORY');
    setIsExpanded(false);
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 700000) {
      alert('Please choose a photo under 700KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setMedia([String(reader.result)]);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !userProfile) return;
    if (isArticle && !title.trim()) {
      alert('Add a title for your article.');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/api/posts', {
        userId: userProfile.uid,
        authorName: userProfile.displayName,
        authorAvatar: userProfile.photoURL,
        authorType: userProfile.role === 'VENDOR' ? 'VENDOR' : 'USER',
        title: title.trim(),
        content: content.trim(),
        media,
        type: mode,
      });
      emitCatalogChange();
      if (isArticle) {
        alert('Article submitted for admin approval. You will be notified when it is published.');
      }
      reset();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) return null;

  return (
    <div id="create-post" className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 overflow-hidden transition-all duration-300">
      {!isExpanded ? (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0">
            <LoadingImage src={resolveAvatar(userProfile.photoURL)} alt="Me" className="w-full h-full object-cover" />
          </div>
          <button 
            onClick={() => setIsExpanded(true)}
            className="flex-1 text-left px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 text-xs md:text-sm transition-colors flex items-center"
          >
            Share your latest find or gem story...
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0">
                  <LoadingImage src={resolveAvatar(userProfile.photoURL)} alt="Me" className="w-full h-full object-cover" />
               </div>
               <span className="text-xs font-bold text-slate-700">{userProfile.displayName}</span>
            </div>
            <button 
              type="button"
              onClick={reset}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'STORY', label: 'Story' },
              { id: 'ARTICLE', label: 'Article' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors',
                  mode === option.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {isArticle && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
          
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isArticle ? 'Write your industry article for admin review…' : "What's happening in the gem world?"}
            className="w-full min-h-[120px] p-2 text-slate-800 text-sm md:text-base placeholder:text-slate-300 outline-none resize-none"
          />

          {isArticle && (
            <p className="text-[11px] font-medium text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
              Articles are reviewed by an admin before they appear on the feed or news page.
            </p>
          )}

          {media[0] && (
            <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
              <LoadingImage src={media[0]} alt="Post preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setMedia([])}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors"
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <div className="flex gap-2 items-center">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <button 
                type="button"
                onClick={() => fileRef.current?.click()}
                className="p-2 hover:bg-primary/5 rounded-full text-primary transition-colors flex items-center gap-2 text-xs font-bold"
              >
                <Image size={20} />
                <span className="hidden md:inline">{media.length ? 'Change photo' : 'Photo'}</span>
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || !content.trim() || (isArticle && !title.trim())}
              className="bg-primary text-white px-6 py-2 rounded-full font-black text-xs md:text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (isArticle ? 'Submitting...' : 'Posting...') : (isArticle ? 'Submit article' : 'Post')}
              <Send size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
