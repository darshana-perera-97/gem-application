import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Search, MoreVertical, User as UserIcon, ArrowLeft, Loader2, Check, CheckCheck, MessageSquare, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { resolveAvatar } from '../constants/sampleImages';
import { useNavigate } from 'react-router-dom';
import { usePageReady } from '../contexts/PageLoadingContext';
import { LoadingImage } from '../components/ui/LoadingImage';
import { apiGet, apiPost } from '../lib/api';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function otherParty(conv, uid) {
  const names = conv.participantNames || {};
  const avatars = conv.participantAvatars || {};
  const preferred = conv.peerId && conv.peerId !== uid ? conv.peerId : null;
  const otherUid = preferred || (conv.participants || []).find((id) => id !== uid);
  return {
    uid: otherUid,
    name: (otherUid && names[otherUid]) || 'User',
    avatar: otherUid ? avatars[otherUid] : undefined,
  };
}

export const ChatPage = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!userProfile;
  const currentUid = userProfile?.uid;
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  usePageReady(!loading);
  const [mobileView, setMobileView] = useState('list');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportStatus, setReportStatus] = useState('');
  const scrollRef = useRef(null);

  const queryText = search.trim().toLowerCase();
  const displayConversations = conversations.filter((conv) => {
    if (!queryText) return true;
    const party = otherParty(conv, currentUid);
    return `${party.name} ${conv.lastMessage || ''} ${conv.listingTitle || ''}`.toLowerCase().includes(queryText);
  });

  useEffect(() => {
    setActiveConversationId(null);
    setMobileView('list');
    setNewMessage('');
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !userProfile?.uid) {
      setConversations([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    apiGet(`/api/conversations?userId=${encodeURIComponent(userProfile.uid)}`)
      .then((rows) => {
        if (!cancelled) setConversations(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setConversations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userProfile?.uid]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return undefined;
    }

    let cancelled = false;
    apiGet(`/api/conversations/${encodeURIComponent(activeConversationId)}/messages`)
      .then((rows) => {
        if (!cancelled) setMessages(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setMessages([]);
      });

    if (isLoggedIn && userProfile?.uid) {
      apiPost(`/api/conversations/${encodeURIComponent(activeConversationId)}/read`, {
        userId: userProfile.uid,
      }).then(() => {
        if (cancelled) return;
        setConversations((current) => current.map((conv) => (
          conv.id === activeConversationId
            ? { ...conv, unreadCount: { ...(conv.unreadCount || {}), [userProfile.uid]: 0 } }
            : conv
        )));
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, isLoggedIn, userProfile?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!newMessage.trim() || !activeConversationId || !userProfile) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const saved = await apiPost(`/api/conversations/${encodeURIComponent(activeConversationId)}/messages`, {
        userId: userProfile.uid,
        senderName: userProfile.displayName,
        text: messageText,
      });
      setMessages((current) => [...current, saved]);
      setConversations((current) => current.map((conv) => (
        conv.id === activeConversationId
          ? {
            ...conv,
            lastMessage: messageText,
            lastSenderId: userProfile.uid,
            lastUpdatedAt: saved.createdAt,
            participants: conv.participants?.includes(userProfile.uid)
              ? conv.participants
              : [...(conv.participants || []), userProfile.uid],
          }
          : conv
      )));
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const selectConversation = (id) => {
    setActiveConversationId(id);
    setMobileView('chat');
    setMenuOpen(false);
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeParty = activeConversation ? otherParty(activeConversation, currentUid) : null;
  const otherParticipantName = activeParty?.name || '';
  const otherParticipantAvatar = activeParty?.avatar;
  const viewerId = activeConversation?.participants?.includes(currentUid)
    ? currentUid
    : activeConversation?.participants?.[0];

  return (
    <div className="space-y-6">
      <Seo title={PAGE_SEO.messages.title} description={PAGE_SEO.messages.description} noindex />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={24} className="text-primary" />
            Messages
          </h1>
          <p className="text-slate-500 text-sm">
            {isLoggedIn
              ? 'Chat with gemstone sellers and industry experts.'
              : 'Log in to message sellers.'}
          </p>
        </div>
        {!isLoggedIn && (
          <button
            onClick={() => navigate('/login')}
            className="bg-primary text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap self-start md:self-auto"
          >
            <LogIn size={18} />
            Login to Chat
          </button>
        )}
      </div>

      <div className="h-[calc(100vh-14rem)] flex bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={cn(
          "w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50",
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        )}>
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conversations</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : displayConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-primary/5 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <p className="text-slate-500 text-sm">No conversations yet.</p>
                <p className="text-slate-400 text-xs mt-1">Inquire about a gem to start chatting.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayConversations.map((conv) => {
                  const party = otherParty(conv, currentUid);
                  const isActive = activeConversationId === conv.id;
                  const unread = conv.unreadCount?.[currentUid] || 0;
                  const updated = toDate(conv.lastUpdatedAt);

                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={cn(
                        "w-full p-4 flex items-start gap-3 transition-colors text-left group",
                        isActive ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-white border-l-2 border-transparent"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        {party.avatar ? (
                          <LoadingImage
                            src={resolveAvatar(party.avatar)}
                            alt={party.name}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/10"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-2 ring-primary/10">
                            <UserIcon className="w-6 h-6" />
                          </div>
                        )}
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            {unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={cn(
                            "font-bold truncate text-sm",
                            unread > 0 ? "text-slate-900" : "text-slate-700"
                          )}>{party.name}</h3>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                            {updated ? format(updated, 'HH:mm') : ''}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs truncate",
                          unread > 0 ? "text-slate-900 font-medium" : "text-slate-500"
                        )}>
                          {conv.lastSenderId === currentUid && 'You: '}{conv.lastMessage || conv.listingTitle || 'Start a conversation'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={cn(
          "flex-1 flex flex-col bg-white min-w-0",
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        )}>
          {activeConversationId ? (
            <>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative flex-shrink-0">
                    {otherParticipantAvatar ? (
                      <LoadingImage
                        src={resolveAvatar(otherParticipantAvatar)}
                        alt={otherParticipantName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-2 ring-primary/10">
                        <UserIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 text-sm truncate">{otherParticipantName}</h2>
                    {activeConversation?.listingTitle && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{activeConversation.listingTitle}</p>
                    )}
                  </div>
                </div>
                <div className="relative">
                <button type="button" onClick={() => setMenuOpen((open) => !open)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors flex-shrink-0">
                  <MoreVertical className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-11 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-20">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!userProfile) {
                          navigate('/login');
                          return;
                        }
                        try {
                          await apiPost('/api/reports', {
                            userId: userProfile.uid,
                            targetType: 'conversation',
                            targetId: activeConversationId,
                            reason: 'Reported from chat',
                          });
                          setReportStatus('Report saved');
                        } catch (error) {
                          setReportStatus(error.message);
                        }
                        setMenuOpen(false);
                      }}
                      className="w-full text-left text-sm font-bold px-3 py-2 rounded-lg hover:bg-slate-50"
                    >
                      Report conversation
                    </button>
                  </div>
                )}
                {reportStatus && <p className="absolute right-0 top-12 text-[10px] font-bold text-primary whitespace-nowrap">{reportStatus}</p>}
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-background custom-scrollbar"
              >
                <AnimatePresence initial={false}>
                  {messages.map((msg, index) => {
                    const isMe = msg.senderId === viewerId;
                    const created = toDate(msg.createdAt);
                    const previous = toDate(messages[index - 1]?.createdAt);
                    const showDate = index === 0 ||
                      format(created || new Date(), 'yyyy-MM-dd') !==
                      format(previous || new Date(), 'yyyy-MM-dd');

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-6">
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] text-slate-400 font-black shadow-sm uppercase tracking-widest">
                              {format(created || new Date(), 'MMMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={cn(
                            "flex group",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn(
                            "max-w-[75%] rounded-2xl p-3 shadow-sm relative",
                            isMe
                              ? "bg-primary text-white rounded-tr-sm"
                              : "bg-white text-slate-800 border border-slate-200 rounded-tl-sm"
                          )}>
                            {!isMe && msg.senderName && (
                              <p className="text-[10px] font-bold text-slate-400 mb-1">{msg.senderName}</p>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            <div className={cn(
                              "flex items-center gap-1 mt-1 justify-end",
                              isMe ? "text-white/70" : "text-slate-400"
                            )}>
                              <span className="text-[10px] font-medium">
                                {created ? format(created, 'HH:mm') : '...'}
                              </span>
                              {isMe && (
                                (msg.readBy || []).length > 1 ? (
                                  <CheckCheck className="w-3 h-3 text-white" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="p-4 border-t border-slate-200 bg-white">
                {isLoggedIn ? (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="p-3 bg-primary text-white rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg shadow-primary/20"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                ) : (
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-slate-600 text-center sm:text-left">
                      Log in to send messages and start real conversations with sellers.
                    </p>
                    <button
                      onClick={() => navigate('/login')}
                      className="bg-primary text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      <LogIn size={16} />
                      Login / Register
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6 ring-4 ring-primary/10">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Your Messages</h2>
              <p className="text-slate-500 max-w-sm text-sm">
                {isLoggedIn
                  ? 'Select a conversation to start chatting with gemstone sellers and industry experts.'
                  : 'Select a conversation on the left, or log in to message sellers directly.'}
              </p>
              {!isLoggedIn && (
                <button
                  onClick={() => navigate('/login')}
                  className="mt-6 bg-primary text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm"
                >
                  Login to Chat
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
