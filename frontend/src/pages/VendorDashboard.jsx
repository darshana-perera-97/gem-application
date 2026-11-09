import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Package, DollarSign, Eye } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { resolveGem } from '../constants/sampleImages';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { usePageReady } from '../contexts/PageLoadingContext';
import { LoadingImage } from '../components/ui/LoadingImage';
import { useAuth } from '../contexts/AuthContext';
import { useAddListing } from '../contexts/AddListingContext';
import { onCatalogChange } from '../lib/catalogEvents';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

const STAT_ICONS = {
  revenue: DollarSign,
  items: Package,
  views: Eye,
  inquiries: MessageSquare,
};

export const VendorDashboard = () => {
  const navigate = useNavigate();
  const { userProfile, loading: authLoading } = useAuth();
  const { openAddListing } = useAddListing();
  const [data, setData] = useState(null);
  const [contentReady, setContentReady] = useState(false);
  usePageReady(contentReady);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!userProfile?.uid) {
      setData(null);
      setContentReady(true);
      return undefined;
    }

    let cancelled = false;
    const load = () => {
      apiGet(`/api/dashboard/vendor?userId=${encodeURIComponent(userProfile.uid)}`)
        .then((dashboard) => {
          if (!cancelled) setData(dashboard);
        })
        .catch((error) => {
          console.error(error);
          if (!cancelled) setData(null);
        })
        .finally(() => {
          if (!cancelled) setContentReady(true);
        });
    };

    setContentReady(false);
    load();
    const unsubscribe = onCatalogChange(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authLoading, userProfile?.uid]);

  const week = data?.revenue || [];

  if (authLoading || !contentReady) {
    return (
      <Seo
        title={PAGE_SEO.vendorDashboard.title}
        description={PAGE_SEO.vendorDashboard.description}
        noindex
      />
    );
  }

  if (!userProfile) {
    return (
      <div className="py-20 text-center space-y-4">
        <Seo
          title={PAGE_SEO.vendorDashboard.title}
          description={PAGE_SEO.vendorDashboard.description}
          noindex
        />
        <p className="font-bold text-slate-500">Sign in to open Business Command.</p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 rounded-2xl bg-primary text-white font-bold text-sm"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!data?.vendor) {
    return (
      <>
        <Seo
          title={PAGE_SEO.vendorDashboard.title}
          description={PAGE_SEO.vendorDashboard.description}
          noindex
        />
        <div className="py-20 text-center font-bold text-slate-500">Could not load the vendor dashboard.</div>
      </>
    );
  }

  const displayName = data.vendor.companyName || data.vendor.displayName || 'Your shop';
  const location = data.vendor.location || 'Sri Lanka';

  return (
    <div className="space-y-8 pb-12">
      <Seo
        title={PAGE_SEO.vendorDashboard.title}
        description={PAGE_SEO.vendorDashboard.description}
        noindex
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Business Command</h1>
          <p className="text-slate-500 font-medium">
            {displayName}
            {location ? ` • ${location}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAddListing()}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          New Listing
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {(data.stats || []).map((stat) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={stat.format === 'currency'
              ? formatCurrency(stat.value, stat.currency || 'USD')
              : stat.value}
            icon={STAT_ICONS[stat.key] || Package}
            trend={stat.trend}
            color={stat.color}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-black text-slate-900 text-lg uppercase tracking-widest">Sales Performance</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 7 days</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={week}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CC10FE" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#CC10FE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => (val >= 1000 ? `$${Math.round(val / 1000)}k` : `$${val}`)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [formatCurrency(value, 'USD'), 'Sales']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#CC10FE"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="font-black text-slate-900 text-lg uppercase tracking-widest mb-6">Inventory</h2>
          <div className="space-y-4 flex-1">
            {(data.listings || []).slice(0, 5).map((listing) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => navigate(`/listings/${listing.id}`)}
                className="w-full flex gap-4 group cursor-pointer text-left"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                  <LoadingImage src={resolveGem(listing.images?.[0])} alt={listing.title || 'Gem listing'} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate text-sm group-hover:text-primary transition-colors">
                    {listing.title || `${listing.variety || ''} ${listing.type || ''}`.trim() || 'Gem listing'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {listing.caratWeight || listing.weight || '—'}ct • {listing.origin || 'Unknown'} • {listing.status || 'ACTIVE'}
                  </p>
                  <p className="text-accent font-black text-sm mt-1">
                    {formatCurrency(listing.price, listing.currency || 'USD')}
                  </p>
                </div>
              </button>
            ))}
            {(data.listings || []).length === 0 && (
              <div className="py-10 text-center text-sm text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
                No listings yet. Publish your first gem.
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-full mt-8 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all text-xs uppercase tracking-widest border border-slate-100"
          >
            Full Inventory
          </button>
        </div>
      </div>

    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, trend, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-primary/30 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={cn('p-3 rounded-2xl transition-transform group-hover:scale-110', color)}>
        <Icon size={24} />
      </div>
      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-lg">
        {trend}
      </span>
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
  </div>
);
