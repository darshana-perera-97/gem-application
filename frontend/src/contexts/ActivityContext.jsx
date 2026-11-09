import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiGet, apiPost } from '../lib/api';

const ActivityContext = createContext(null);

const EMPTY = {
  likes: [],
  follows: [],
  saves: [],
  groups: [],
  debates: [],
  rsvps: [],
  reads: [],
};

export function ActivityProvider({ children }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const userId = userProfile?.uid || '';
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (!userId) {
      setState(EMPTY);
      return undefined;
    }
    let cancelled = false;
    apiGet(`/api/activity?userId=${encodeURIComponent(userId)}`)
      .then((data) => {
        if (!cancelled) setState({ ...EMPTY, ...data });
      })
      .catch(() => {
        if (!cancelled) setState(EMPTY);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const ensureUser = useCallback(() => {
    if (!userId) {
      navigate('/login');
      return false;
    }
    return true;
  }, [navigate, userId]);

  const actor = useCallback(() => ({
    userId,
    authorName: userProfile?.displayName || 'Member',
    authorAvatar: userProfile?.photoURL || '',
    authorType: userProfile?.role === 'VENDOR' ? 'VENDOR' : 'USER',
  }), [userId, userProfile]);

  const toggleLike = useCallback(async (postId) => {
    if (!ensureUser()) return null;
    const result = await apiPost(`/api/posts/${encodeURIComponent(postId)}/like`, { userId });
    setState((prev) => ({
      ...prev,
      likes: result.liked
        ? [...new Set([...prev.likes, postId])]
        : prev.likes.filter((id) => id !== postId),
    }));
    return result;
  }, [ensureUser, userId]);

  const toggleFollow = useCallback(async (targetId, targetType) => {
    if (!ensureUser()) return null;
    const result = await apiPost('/api/follows', { userId, targetId, targetType });
    setState((prev) => ({
      ...prev,
      follows: result.following
        ? [...prev.follows.filter((row) => !(row.targetId === targetId && row.targetType === targetType)), { targetId, targetType }]
        : prev.follows.filter((row) => !(row.targetId === targetId && row.targetType === targetType)),
    }));
    return result;
  }, [ensureUser, userId]);

  const toggleSave = useCallback(async (listingId) => {
    if (!ensureUser()) return null;
    const result = await apiPost('/api/saves', { userId, listingId });
    setState((prev) => ({
      ...prev,
      saves: result.saved
        ? [...new Set([...prev.saves, listingId])]
        : prev.saves.filter((id) => id !== listingId),
    }));
    return result;
  }, [ensureUser, userId]);

  const toggleGroup = useCallback(async (groupId) => {
    if (!ensureUser()) return null;
    const result = await apiPost(`/api/groups/${encodeURIComponent(groupId)}/join`, { userId });
    setState((prev) => ({
      ...prev,
      groups: result.joined
        ? [...new Set([...prev.groups, groupId])]
        : prev.groups.filter((id) => id !== groupId),
    }));
    return result;
  }, [ensureUser, userId]);

  const toggleDebate = useCallback(async (discussionId) => {
    if (!ensureUser()) return null;
    const result = await apiPost(`/api/discussions/${encodeURIComponent(discussionId)}/join`, { userId });
    setState((prev) => ({
      ...prev,
      debates: result.joined
        ? [...new Set([...prev.debates, discussionId])]
        : prev.debates.filter((id) => id !== discussionId),
    }));
    return result;
  }, [ensureUser, userId]);

  const toggleRsvp = useCallback(async (eventId) => {
    if (!ensureUser()) return null;
    const result = await apiPost(`/api/events/${encodeURIComponent(eventId)}/rsvp`, { userId });
    setState((prev) => ({
      ...prev,
      rsvps: result.going
        ? [...new Set([...prev.rsvps, eventId])]
        : prev.rsvps.filter((id) => id !== eventId),
    }));
    return result;
  }, [ensureUser, userId]);

  const toggleArticle = useCallback(async (articleKey) => {
    if (!ensureUser()) return null;
    const result = await apiPost('/api/articles/read', { userId, articleKey });
    setState((prev) => ({
      ...prev,
      reads: result.saved
        ? [...new Set([...prev.reads, articleKey])]
        : prev.reads.filter((id) => id !== articleKey),
    }));
    return result;
  }, [ensureUser, userId]);

  const value = {
    ...state,
    userId,
    actor,
    ensureUser,
    toggleLike,
    toggleFollow,
    toggleSave,
    toggleGroup,
    toggleDebate,
    toggleRsvp,
    toggleArticle,
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}
