import React, { useMemo, useState } from 'react';
import { Search, MessageSquare, Bell, Heart } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useActivity } from '../../contexts/ActivityContext';
import { SAMPLE_LOGO, resolveAvatar } from '../../constants/sampleImages';
import { apiGet, apiPost } from '../../lib/api';
import { LoadingImage } from '../ui/LoadingImage';
import { SavedGemsPanel } from './SavedGemsPanel';

export const Navbar = () => {
  const { userProfile } = useAuth();
  const { saves, follows } = useActivity();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [savedOpen, setSavedOpen] = useState(false);

  const savedCount = useMemo(() => {
    const marketplaceFollows = follows.filter((row) => row.targetType === 'vendor').length;
    return saves.length + marketplaceFollows;
  }, [saves, follows]);

  const openNotes = async () => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    setSavedOpen(false);
    setNotesOpen((open) => !open);
    try {
      const rows = await apiGet(`/api/notifications?userId=${encodeURIComponent(userProfile.uid)}`);
      setNotes(rows);
    } catch (error) {
      console.error(error);
    }
  };

  const openSaved = () => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    setNotesOpen(false);
    setSavedOpen(true);
  };

  const markRead = async (note) => {
    try {
      await apiPost('/api/notifications/read', { userId: userProfile.uid, id: note.id });
      setNotes((current) => current.map((row) => row.id === note.id ? { ...row, read: true } : row));
    } catch (error) {
      console.error(error);
    }
    setNotesOpen(false);
    if (note.href) navigate(note.href);
  };

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-8 md:h-10 w-auto group-hover:scale-105 transition-transform">
            <LoadingImage 
              src={SAMPLE_LOGO} 
              alt="GemBook Logo" 
              className="h-full w-auto object-contain"
            />
          </div>
        </Link>
        
        <form
          className="hidden md:block relative"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(`/marketplace?q=${encodeURIComponent(search.trim())}`);
          }}
        >
          <input 
            type="text" 
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search gems, vendors, or news..." 
            className="w-80 bg-slate-100 border-none rounded-full py-2 px-10 text-sm focus:ring-2 focus:ring-primary transition-all outline-none"
          />
          <button type="submit" className="absolute left-3 top-2.5" aria-label="Search">
            <Search className="w-4 h-4 text-slate-400" />
          </button>
        </form>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-1 md:gap-4">
          <button
            type="button"
            onClick={openSaved}
            className={cn(
              'p-2 hover:bg-slate-100 rounded-full transition-colors relative',
              savedOpen ? 'text-primary bg-primary/5' : 'text-slate-500'
            )}
            aria-label="Saved Gems"
            title="Saved Gems"
          >
            <Heart size={20} className={savedOpen || savedCount > 0 ? 'fill-primary text-primary' : undefined} />
            {savedCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
                {savedCount > 99 ? '99+' : savedCount}
              </span>
            )}
          </button>
          <div className="relative hidden md:block">
          <button type="button" onClick={openNotes} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
          </button>
          {notesOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Notifications</p>
                <button
                  type="button"
                  onClick={() => apiPost('/api/notifications/read', { userId: userProfile.uid }).then(() => setNotes((current) => current.map((note) => ({ ...note, read: true }))))}
                  className="text-[10px] font-bold text-primary"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {notes.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No notifications yet</p>}
                {notes.map((note) => (
                  <button key={note.id} type="button" onClick={() => markRead(note)} className={cn("w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-slate-50", note.read ? "text-slate-400" : "text-slate-800 font-medium")}>
                    {note.message}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>
          <Link to="/messages" className="hidden md:inline-flex p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors relative">
            <MessageSquare size={20} />
          </Link>
        </div>
        
        <div className="flex items-center gap-3 md:border-l md:border-slate-200 md:pl-6">
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-slate-800">{userProfile?.displayName || 'Guest User'}</p>
            <p className="text-[10px] text-success font-medium uppercase tracking-wider">{userProfile?.role === 'VENDOR' ? 'Verified Vendor' : 'Member'}</p>
          </div>
          <Link to="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
            <LoadingImage src={resolveAvatar(userProfile?.photoURL)} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          </Link>
        </div>
      </div>
    </nav>
    <SavedGemsPanel open={savedOpen} onClose={() => setSavedOpen(false)} />
    </>
  );
};

const NavItem = ({ icon: Icon, label, href }) => {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
        isActive 
          ? "bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10" 
          : "text-gray-500 hover:bg-slate-50 hover:text-gray-900"
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
};
