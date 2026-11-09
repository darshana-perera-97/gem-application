import React, { useEffect, useState } from 'react';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Users, Newspaper, LayoutDashboard, Gem, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PageLoadingProvider } from '../../contexts/PageLoadingContext';
import { ServerDown, useServerDown } from '../ui/ServerDown';
import { apiGet } from '../../lib/api';

const SIDE_NAV_ITEMS = [
  { icon: Home, label: 'Feed', href: '/' },
  { icon: ShoppingBag, label: 'Marketplace', href: '/marketplace' },
  { icon: Newspaper, label: 'Vendors', href: '/vendors' },
  { icon: Users, label: 'Community', href: '/community' },
];

const EMPTY_MARKET = {
  activeListings: null,
  verifiedDealers: null,
  volume24hLabel: '—',
  weekChangePct: null,
  activity: [40, 60, 55, 90, 75, 85],
  platformOnline: true,
};

function formatCount(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('en-US');
}

function formatWeekChange(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return '—';
  const value = Number(pct);
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

export const Layout = ({ children }) => (
  <PageLoadingProvider>
    <LayoutShell>{children}</LayoutShell>
  </PageLoadingProvider>
);

const LayoutShell = ({ children }) => {
  const location = useLocation();
  const isFeedPage = location.pathname === '/';
  const serverDown = useServerDown();
  const [market, setMarket] = useState(EMPTY_MARKET);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/market/stats')
      .then((data) => {
        if (cancelled || !data) return;
        setMarket({
          activeListings: data.activeListings ?? 0,
          verifiedDealers: data.verifiedDealers ?? 0,
          volume24hLabel: data.volume24hLabel || '$0 USD',
          weekChangePct: data.weekChangePct ?? 0,
          activity: Array.isArray(data.activity) && data.activity.length
            ? data.activity
            : EMPTY_MARKET.activity,
          platformOnline: data.platformOnline !== false,
        });
      })
      .catch(() => {
        if (!cancelled) setMarket(EMPTY_MARKET);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      );
    };
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-slate-800 font-sans">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Side Navigation */}
        <nav className="hidden lg:flex w-64 bg-white border-r border-slate-200 p-6 flex-col shrink-0">
          <div className="space-y-1 mb-6">
            {SIDE_NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors font-bold text-sm",
                    isActive 
                      ? "bg-primary/5 text-primary" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-1 mb-8 pt-6 border-t border-slate-100">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Professional</p>
            <Link
              to="/vendor/dashboard"
              className={cn(
                "flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors font-bold text-sm",
                location.pathname === '/vendor/dashboard'
                  ? "bg-primary/5 text-primary"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/my-gems"
              className={cn(
                "flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors font-bold text-sm",
                location.pathname === '/my-gems'
                  ? "bg-primary/5 text-primary"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Gem size={18} />
              <span>My Gems</span>
            </Link>
            <Link
              to="/profile"
              className={cn(
                "flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors font-bold text-sm",
                location.pathname === '/profile'
                  ? "bg-primary/5 text-primary"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <User size={18} />
              <span>My Profile</span>
            </Link>
          </div>

          <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Market Activity</p>
            <div className="flex justify-between items-end h-12 space-x-1">
              {market.activity.map((height, index) => (
                <div
                  key={`bar-${index}`}
                  className="bg-primary w-full rounded-t-sm"
                  style={{ height: `${Math.min(100, Math.max(8, height))}%` }}
                />
              ))}
            </div>
            <p className="text-xs mt-2 font-medium">
              {formatWeekChange(market.weekChangePct)}{' '}
              <span className="text-slate-400 font-normal">this week</span>
            </p>
          </div>
        </nav>

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6 min-h-0',
            isFeedPage
              ? 'overflow-y-auto lg:overflow-hidden lg:flex lg:flex-col custom-scrollbar'
              : 'overflow-y-auto custom-scrollbar'
          )}
        >
          <div className={cn('max-w-6xl mx-auto', isFeedPage && 'lg:h-full lg:min-h-0 lg:flex lg:flex-col')}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={isFeedPage ? 'lg:h-full lg:min-h-0 lg:flex lg:flex-col' : undefined}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      <BottomNav />
      {serverDown ? <ServerDown /> : null}

      {/* Bottom Status Bar */}
      <footer className="h-8 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] font-medium text-slate-400 shrink-0 uppercase tracking-tighter">
        <div className="hidden sm:flex space-x-6">
          <span>Active Listings: <span className="text-slate-800">{formatCount(market.activeListings)}</span></span>
          <span>Verified Dealers: <span className="text-slate-800">{formatCount(market.verifiedDealers)}</span></span>
          <span>24h Volume: <span className="text-slate-800">{market.volume24hLabel}</span></span>
        </div>
        <div className="flex space-x-4 ml-auto">
          <span className="flex items-center">
            <div className={cn('w-1.5 h-1.5 rounded-full mr-1.5', market.platformOnline && !serverDown ? 'bg-success' : 'bg-amber-400')} />
            {market.platformOnline && !serverDown ? 'Platform Online' : 'Platform Offline'}
          </span>
          <Link to="/news" className="hover:text-primary">News</Link>
          <Link to="/privacy" className="hover:text-primary">Privacy</Link>
          <span className="text-primary">Sri Lanka Standard Time: {clock}</span>
        </div>
      </footer>
    </div>
  );
};
