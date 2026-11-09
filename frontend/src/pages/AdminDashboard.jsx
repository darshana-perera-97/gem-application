import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  ShoppingBag,
  CheckCircle,
  BarChart3,
  DollarSign,
  Activity,
  Calendar,
  FileText,
  LogOut,
  Plus,
  Shield,
  Loader2,
  UsersRound,
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { apiDelete, apiGet, apiPost } from '../lib/api';
import { usePageReady } from '../contexts/PageLoadingContext';
import { cn } from '../lib/utils';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

const STAT_META = {
  users: { icon: Users, color: 'text-primary', bg: 'bg-primary/5' },
  listings: { icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/5' },
  vendors: { icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  revenue: { icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { id: 'groups', label: 'Groups', icon: UsersRound },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'posts', label: 'Posts', icon: FileText },
];

const GROUP_COLOR_OPTIONS = [
  { value: 'bg-primary', label: 'Purple' },
  { value: 'bg-emerald-600', label: 'Emerald' },
  { value: 'bg-amber-500', label: 'Amber' },
  { value: 'bg-blue-600', label: 'Blue' },
  { value: 'bg-rose-500', label: 'Rose' },
  { value: 'bg-slate-700', label: 'Slate' },
];

const emptyEvent = { title: '', date: '', type: 'Exhibitions', location: '', description: '' };
const emptyPost = { title: '', content: '', type: 'NEWS', setAsNews: true };
const emptyGroup = { name: '', members: '0', activity: 'Medium', color: 'bg-primary' };

export const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postFilter, setPostFilter] = useState('pending');
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [postForm, setPostForm] = useState(emptyPost);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [contentReady, setContentReady] = useState(false);
  usePageReady(contentReady);

  const withCredentials = { credentials: 'include' };

  const loadSession = useCallback(async () => {
    try {
      const data = await apiGet('/api/admin/me', withCredentials);
      setAdmin(data.admin || null);
    } catch (error) {
      console.error(error);
      setAdmin(null);
    } finally {
      setAuthChecked(true);
      setContentReady(true);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const refreshData = useCallback(async () => {
    if (!admin) return;
    try {
      const [analyticsData, usersData, postsData, eventsData, groupsData] = await Promise.all([
        apiGet('/api/admin/analytics', withCredentials),
        apiGet('/api/admin/users', withCredentials),
        apiGet(`/api/admin/posts?status=${encodeURIComponent(postFilter)}`, withCredentials),
        apiGet('/api/admin/events', withCredentials),
        apiGet('/api/admin/groups', withCredentials),
      ]);
      setAnalytics(analyticsData);
      setUsers(usersData);
      setPosts(postsData);
      setEvents(eventsData);
      setGroups(groupsData);
    } catch (error) {
      console.error(error);
      if (error.status === 401) {
        setAdmin(null);
      }
      setMessage(error.message || 'Could not load admin data');
    }
  }, [admin, postFilter]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const data = await apiPost('/api/admin/login', loginForm, withCredentials);
      setAdmin(data.admin);
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      setLoginError(error.message || 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiPost('/api/admin/logout', null, withCredentials);
    } catch (error) {
      console.error(error);
    }
    setAdmin(null);
    setAnalytics(null);
  };

  const createEvent = async (event) => {
    event.preventDefault();
    setBusy('event');
    setMessage('');
    try {
      await apiPost('/api/admin/events', eventForm, withCredentials);
      setEventForm(emptyEvent);
      setMessage('Event published to Upcoming Events.');
      await refreshData();
    } catch (error) {
      setMessage(error.message || 'Could not create event');
    } finally {
      setBusy('');
    }
  };

  const createGroup = async (event) => {
    event.preventDefault();
    setBusy('group');
    setMessage('');
    try {
      await apiPost('/api/admin/groups', groupForm, withCredentials);
      setGroupForm(emptyGroup);
      setMessage('Group published to Community.');
      await refreshData();
    } catch (error) {
      setMessage(error.message || 'Could not create group');
    } finally {
      setBusy('');
    }
  };

  const removeGroup = async (id) => {
    setBusy(`group-${id}`);
    try {
      await apiDelete(`/api/admin/groups/${encodeURIComponent(id)}`, withCredentials);
      await refreshData();
    } catch (error) {
      setMessage(error.message || 'Could not delete group');
    } finally {
      setBusy('');
    }
  };

  const removeEvent = async (id) => {
    setBusy(`event-${id}`);
    try {
      await apiDelete(`/api/admin/events/${encodeURIComponent(id)}`, withCredentials);
      await refreshData();
    } catch (error) {
      setMessage(error.message || 'Could not delete event');
    } finally {
      setBusy('');
    }
  };

  const publishPost = async (event) => {
    event.preventDefault();
    setBusy('publish');
    setMessage('');
    try {
      await apiPost('/api/admin/posts', postForm, withCredentials);
      setPostForm(emptyPost);
      setMessage('Post published.');
      setPostFilter('published');
      await refreshData();
    } catch (error) {
      setMessage(error.message || 'Could not publish post');
    } finally {
      setBusy('');
    }
  };

  const approvePost = async (id) => {
    setBusy(`approve-${id}`);
    try {
      await apiPost(`/api/admin/posts/${encodeURIComponent(id)}/approve`, { setAsNews: true }, withCredentials);
      setMessage('Article approved and published.');
      await refreshData();
    } catch (error) {
      setMessage(error.message || 'Could not approve post');
    } finally {
      setBusy('');
    }
  };

  const rejectPost = async (id) => {
    const reason = window.prompt('Optional rejection reason') || '';
    setBusy(`reject-${id}`);
    try {
      await apiPost(`/api/admin/posts/${encodeURIComponent(id)}/reject`, { reason }, withCredentials);
      setMessage('Article rejected.');
      await refreshData();
    } catch (error) {
      setMessage(error.message || 'Could not reject post');
    } finally {
      setBusy('');
    }
  };

  if (!contentReady || !authChecked) {
    return <Seo title={PAGE_SEO.admin.title} description={PAGE_SEO.admin.description} noindex />;
  }

  if (!admin) {
    return (
      <div className="max-w-md mx-auto py-16">
        <Seo title={PAGE_SEO.admin.title} description={PAGE_SEO.admin.description} noindex />
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Admin Login</h1>
              <p className="text-sm text-slate-500">Credentials come from backend `.env`.</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Username</label>
              <input
                value={loginForm.username}
                onChange={(e) => setLoginForm((current) => ({ ...current, username: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((current) => ({ ...current, password: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                autoComplete="current-password"
                required
              />
            </div>
            {loginError && <p className="text-sm font-medium text-red-600">{loginError}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-slate-900 text-white rounded-xl py-3 font-black text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loggingIn ? <Loader2 className="animate-spin" size={16} /> : null}
              Sign in as admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  const growth = analytics?.growth || [];
  const marketplaceTypes = analytics?.marketplace?.byType || [];

  return (
    <div className="space-y-6">
      <Seo title={PAGE_SEO.admin.title} description={PAGE_SEO.admin.description} noindex />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Admin</h1>
          <p className="text-sm text-slate-500">Signed in as {admin.username}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-colors',
                tab === item.id ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              )}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      {message && (
        <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {message}
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(analytics?.stats || []).map((stat) => {
              const meta = STAT_META[stat.key] || STAT_META.users;
              const Icon = meta.icon;
              return (
                <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn('p-2 rounded-lg', meta.bg)}>
                      <Icon className={meta.color} size={24} />
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded">{stat.trend}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={20} className="text-gray-400" />
                  User Growth
                </h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growth}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#CC10FE" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#CC10FE" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#CC10FE', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#CC10FE" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Activity size={20} className="text-gray-400" />
                  Platform Activity
                </h2>
              </div>
              <div className="space-y-6">
                {(analytics?.activity || []).map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className="text-sm font-bold text-gray-900">{item.count}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', item.color)} style={{ width: `${Math.min(100, (item.count / (item.max || 40)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Posts', analytics?.totals?.posts],
              ['Published', analytics?.totals?.publishedPosts],
              ['Events', analytics?.totals?.events],
              ['Reviews', analytics?.totals?.reviews],
              ['Messages', analytics?.totals?.messages],
              ['Shorts', analytics?.totals?.shorts],
              ['Reports', analytics?.totals?.reports],
              ['Pending articles', analytics?.totals?.pendingPosts],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="text-xl font-black text-slate-900 mt-1">{value ?? 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">All users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-black">Name</th>
                  <th className="px-4 py-3 font-black">Email / Phone</th>
                  <th className="px-4 py-3 font-black">Role</th>
                  <th className="px-4 py-3 font-black">Vendor</th>
                  <th className="px-4 py-3 font-black">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid || user.id} className="border-t border-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800">{user.displayName || 'Member'}</td>
                    <td className="px-4 py-3 text-slate-500">{user.email || user.phone || '—'}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{user.role || 'USER'}</td>
                    <td className="px-4 py-3 text-slate-500">{user.vendorStatus || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="p-8 text-center text-slate-400">No users found.</p>}
          </div>
        </div>
      )}

      {tab === 'marketplace' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Active listings</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{analytics?.totals?.activeListings ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sold listings</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{analytics?.totals?.soldListings ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Avg listing price</p>
              <p className="text-2xl font-black text-slate-900 mt-2">
                ${Math.round(analytics?.totals?.averageListingPrice || 0).toLocaleString('en-US')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-6">Listings by gem type</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marketplaceTypes}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#CC10FE" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">Recent listings</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {(analytics?.recentListings || []).map((listing) => (
                  <div key={listing.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{listing.title}</p>
                      <p className="text-xs text-slate-400">{listing.status} · {listing.gemType || listing.variety || 'Gem'}</p>
                    </div>
                    <p className="font-black text-slate-900 shrink-0">${Number(listing.price || 0).toLocaleString('en-US')}</p>
                  </div>
                ))}
                {(analytics?.recentListings || []).length === 0 && (
                  <p className="p-8 text-center text-slate-400">No listings yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={createGroup} className="bg-white rounded-xl border border-slate-100 p-6 space-y-4 shadow-sm">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Plus size={18} />
              Create community group
            </h2>
            <input
              required
              value={groupForm.name}
              onChange={(e) => setGroupForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Group name"
              className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={groupForm.members}
                onChange={(e) => setGroupForm((current) => ({ ...current, members: e.target.value }))}
                placeholder="Members (e.g. 1.2k)"
                className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={groupForm.activity}
                onChange={(e) => setGroupForm((current) => ({ ...current, activity: e.target.value }))}
                className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Real-time">Real-time</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <select
              value={groupForm.color}
              onChange={(e) => setGroupForm((current) => ({ ...current, color: e.target.value }))}
              className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            >
              {GROUP_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold', groupForm.color)}>
                {(groupForm.name || 'G')[0].toUpperCase()}
              </div>
              <p className="text-sm text-slate-500">Preview badge color</p>
            </div>
            <button
              type="submit"
              disabled={busy === 'group'}
              className="w-full bg-primary text-white rounded-xl py-3 font-black text-sm disabled:opacity-60"
            >
              {busy === 'group' ? 'Saving…' : 'Publish group'}
            </button>
          </form>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Community groups ({groups.length})</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {groups.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0', item.color || 'bg-primary')}>
                      {(item.name || 'G')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs uppercase tracking-wider text-slate-400 mt-1">
                        {item.members || 0} members · {item.activity || 'Medium'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGroup(item.id)}
                    disabled={busy === `group-${item.id}`}
                    className="text-xs font-bold text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {groups.length === 0 && <p className="p-8 text-center text-slate-400">No groups yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={createEvent} className="bg-white rounded-xl border border-slate-100 p-6 space-y-4 shadow-sm">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Plus size={18} />
              Create upcoming event
            </h2>
            <input
              required
              value={eventForm.title}
              onChange={(e) => setEventForm((current) => ({ ...current, title: e.target.value }))}
              placeholder="Event title"
              className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                value={eventForm.date}
                onChange={(e) => setEventForm((current) => ({ ...current, date: e.target.value }))}
                placeholder="Date (e.g. Jul 15)"
                className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                value={eventForm.type}
                onChange={(e) => setEventForm((current) => ({ ...current, type: e.target.value }))}
                placeholder="Type"
                className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <input
              value={eventForm.location}
              onChange={(e) => setEventForm((current) => ({ ...current, location: e.target.value }))}
              placeholder="Location (optional)"
              className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            />
            <textarea
              value={eventForm.description}
              onChange={(e) => setEventForm((current) => ({ ...current, description: e.target.value }))}
              placeholder="Description (optional)"
              className="w-full min-h-[100px] rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={busy === 'event'}
              className="w-full bg-primary text-white rounded-xl py-3 font-black text-sm disabled:opacity-60"
            >
              {busy === 'event' ? 'Saving…' : 'Publish event'}
            </button>
          </form>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Upcoming events ({events.length})</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {events.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="text-xs uppercase tracking-wider text-slate-400 mt-1">
                      {item.date} · {item.type}{item.location ? ` · ${item.location}` : ''}
                    </p>
                    {item.description && <p className="text-sm text-slate-500 mt-2">{item.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEvent(item.id)}
                    disabled={busy === `event-${item.id}`}
                    className="text-xs font-bold text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {events.length === 0 && <p className="p-8 text-center text-slate-400">No events yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'posts' && (
        <div className="space-y-6">
          <form onSubmit={publishPost} className="bg-white rounded-xl border border-slate-100 p-6 space-y-4 shadow-sm">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Plus size={18} />
              Publish a post
            </h2>
            <input
              value={postForm.title}
              onChange={(e) => setPostForm((current) => ({ ...current, title: e.target.value }))}
              placeholder="Title"
              className="w-full rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            />
            <textarea
              required
              value={postForm.content}
              onChange={(e) => setPostForm((current) => ({ ...current, content: e.target.value }))}
              placeholder="Post body"
              className="w-full min-h-[120px] rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={postForm.type}
                onChange={(e) => setPostForm((current) => ({ ...current, type: e.target.value }))}
                className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-2 text-sm font-bold outline-none"
              >
                <option value="NEWS">News</option>
                <option value="ARTICLE">Article</option>
                <option value="STORY">Story</option>
                <option value="DISCUSSION">Discussion</option>
              </select>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={postForm.setAsNews}
                  onChange={(e) => setPostForm((current) => ({ ...current, setAsNews: e.target.checked }))}
                />
                Feature on Industry News
              </label>
              <button
                type="submit"
                disabled={busy === 'publish'}
                className="ml-auto bg-primary text-white rounded-xl px-5 py-2.5 font-black text-sm disabled:opacity-60"
              >
                {busy === 'publish' ? 'Publishing…' : 'Publish now'}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-slate-900">Moderate posts</h2>
              <div className="flex gap-2">
                {['pending', 'published', 'rejected', 'all'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setPostFilter(status)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider',
                      postFilter === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {posts.map((post) => (
                <div key={post.id} className="px-6 py-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{post.title || post.content?.slice(0, 80)}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {post.authorName} · {post.type} · {post.status || 'published'} · {post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                    {post.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => approvePost(post.id)}
                          disabled={busy === `approve-${post.id}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectPost(post.id)}
                          disabled={busy === `reject-${post.id}`}
                          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-black disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{post.content}</p>
                </div>
              ))}
              {posts.length === 0 && <p className="p-8 text-center text-slate-400">No posts in this filter.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
