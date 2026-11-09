import React, { useEffect, useState } from 'react';
import { MessageSquare, TrendingUp, Star, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { resolveAvatar } from '../constants/sampleImages';
import { apiGet, apiPost } from '../lib/api';
import { useActivity } from '../contexts/ActivityContext';
import { usePageReady } from '../contexts/PageLoadingContext';
import { LoadingImage } from '../components/ui/LoadingImage';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

export const CommunityPage = () => {
  const [groups, setGroups] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [openDiscussion, setOpenDiscussion] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const { userId, groups: joinedGroups, debates, toggleGroup, toggleDebate, ensureUser } = useActivity();
  const [contentReady, setContentReady] = useState(false);
  usePageReady(contentReady);

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/community')
      .then((data) => {
        if (cancelled) return;
        setGroups(data.groups || []);
        setDiscussions(data.discussions || []);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (!cancelled) setContentReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleGroups = showAllGroups ? groups : groups.slice(0, 3);

  const sendInvite = async (event) => {
    event.preventDefault();
    if (!ensureUser()) return;
    setInviteStatus('');
    try {
      await apiPost('/api/invites', { userId, email: inviteEmail });
      setInviteStatus('Invite saved');
      setInviteEmail('');
    } catch (error) {
      setInviteStatus(error.message);
    }
  };

  if (!contentReady) {
    return <Seo title={PAGE_SEO.community.title} description={PAGE_SEO.community.description} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Seo title={PAGE_SEO.community.title} description={PAGE_SEO.community.description} />
      {/* Left Sidebar - Groups & Stats */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Trending Groups
          </h2>
          <div className="space-y-4">
            {visibleGroups.map((group) => {
              const joined = joinedGroups.includes(group.id);
              return (
              <div key={group.id || group.name} className="flex items-center gap-4 group">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold", group.color)}>
                  {group.name[0]}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{group.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{group.members} Members</span>
                    <button type="button" onClick={() => toggleGroup(group.id)} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 hover:border-primary">
                      {joined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          <button type="button" onClick={() => setShowAllGroups((open) => !open)} className="w-full mt-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-slate-200">
            {showAllGroups ? 'Show Fewer Groups' : 'Explore All Groups'}
          </button>
        </div>

        <div className="bg-primary p-6 rounded-2xl shadow-lg shadow-primary/20 text-white relative overflow-hidden group">
          <Globe className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform" size={120} />
          <h3 className="text-lg font-bold mb-2">Build Your Expert Network</h3>
          <p className="text-sm text-primary-foreground/80 mb-6 leading-relaxed">
            Connect with verified miners and lapidaries directly to get the best industry insights.
          </p>
          <button type="button" onClick={() => setInviteOpen((open) => !open)} className="bg-white text-primary font-bold py-2.5 px-6 rounded-xl text-xs hover:bg-slate-50 transition-colors shadow-sm">
            Invite Contacts
          </button>
          {inviteOpen && (
            <form onSubmit={sendInvite} className="mt-4 flex gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@email.com"
                className="flex-1 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none"
              />
              <button type="submit" className="bg-slate-900 text-white text-xs font-bold px-3 rounded-xl">Save</button>
            </form>
          )}
          {inviteStatus && <p className="text-xs mt-2 text-white/80">{inviteStatus}</p>}
        </div>
      </div>

      {/* Main Content Area - Discussions & Activity */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-12rem)]">
          <div className="p-6 border-b border-slate-50 shrink-0">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <MessageSquare size={24} className="text-primary" />
              Community Discussion
            </h2>
          </div>
          
          <div className="divide-y divide-slate-50 overflow-y-auto min-h-0 flex-1 custom-scrollbar">
            {discussions.map((discussion, i) => (
              <div key={discussion.id} onClick={() => setOpenDiscussion(openDiscussion === discussion.id ? null : discussion.id)} className="p-6 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border-2 border-white shadow-sm">
                    <LoadingImage src={resolveAvatar(discussion.authorAvatar, i)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-sm">{discussion.authorName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">• {discussion.timeLabel} in</span>
                      <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded uppercase tracking-wider">{discussion.topic}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors mb-2 leading-snug">
                      {discussion.title}
                    </h3>
                    <p className={cn("text-sm text-slate-500 leading-relaxed mb-4", openDiscussion === discussion.id ? "" : "line-clamp-2")}>
                      {discussion.body}
                    </p>
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <MessageSquare size={14} /> {discussion.replies} Replies
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Star size={14} /> {discussion.upvotes} Upvotes
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleDebate(discussion.id).then((result) => {
                            if (result && typeof result.replies === 'number') {
                              setDiscussions((current) => current.map((row) => row.id === discussion.id ? { ...row, replies: result.replies } : row));
                            }
                          });
                        }}
                        className="ml-auto text-[10px] font-bold text-slate-900 uppercase tracking-widest border border-slate-200 px-3 py-1 rounded-lg hover:border-primary transition-colors"
                      >
                        {debates.includes(discussion.id) ? 'Joined' : 'Join Debates'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
