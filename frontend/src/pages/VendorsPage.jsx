import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Star, Search, Award } from 'lucide-react';
import { resolveAvatar, resolveCover } from '../constants/sampleImages';
import { apiGet } from '../lib/api';
import { usePageReady } from '../contexts/PageLoadingContext';
import { LoadingImage } from '../components/ui/LoadingImage';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

export const VendorsPage = () => {
  const [vendors, setVendors] = useState([]);
  const [mode, setMode] = useState('all');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [contentReady, setContentReady] = useState(false);
  usePageReady(contentReady);

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/vendors')
      .then((data) => {
        if (!cancelled) setVendors(data);
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

  const filtered = vendors.filter((vendor) => {
    const haystack = `${vendor.companyName} ${vendor.location} ${vendor.description}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const grouped = filtered.reduce((groups, vendor) => {
    const key = vendor.location || 'Other';
    groups[key] = groups[key] || [];
    groups[key].push(vendor);
    return groups;
  }, {});

  const renderVendor = (vendor) => (
    <Link key={vendor.id} to={`/vendors/${vendor.id}`} className="group">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col h-full">
        <div className="h-24 bg-slate-100 relative">
          <LoadingImage
            src={resolveCover(vendor.coverImage, vendors.indexOf(vendor))}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
            alt={vendor.companyName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent"></div>
        </div>

        <div className="px-6 pb-6 relative -mt-8 flex-1 flex flex-col">
          <div className="flex justify-between items-end mb-4">
            <div className="w-16 h-16 rounded-xl border-4 border-white bg-white shadow-md overflow-hidden shrink-0">
              <LoadingImage src={resolveAvatar(vendor.logo)} className="w-full h-full object-cover" alt="Logo" />
            </div>
            <div className="flex gap-1 mb-2">
              {vendor.verified && (
                <div className="bg-success/10 text-success p-1 px-2 rounded-full flex items-center gap-1">
                  <BadgeCheck size={14} />
                  <span className="text-[10px] font-bold">VERIFIED</span>
                </div>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-2">
            {vendor.companyName}
            {vendor.verificationLevel === 'GOLD' && <Award size={16} className="text-warning shrink-0" />}
          </h3>

          <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
            <MapPin size={12} className="text-slate-400" />
            {vendor.location ? `${vendor.location}, Sri Lanka` : 'Sri Lanka'}
          </p>

          {vendor.description ? (
            <p className="text-sm text-slate-600 line-clamp-2 mb-4 italic">
              "{vendor.description}"
            </p>
          ) : (
            <p className="text-sm text-slate-400 line-clamp-2 mb-4">
              {vendor.listingCount === 1
                ? '1 gem listed on the marketplace'
                : `${vendor.listingCount || 0} gems listed on the marketplace`}
            </p>
          )}

          <div className="mt-auto pt-4 border-t border-slate-50 grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-primary font-bold text-sm">
                <Star size={12} fill="currentColor" />
                {Number(vendor.rating || 0).toFixed(1)}
              </div>
              <span className="text-[10px] text-slate-400 font-bold tracking-tighter uppercase">Rating</span>
            </div>
            <div className="flex flex-col items-center border-x border-slate-50 px-2">
              <span className="text-slate-900 font-bold text-sm">{vendor.reviewCount || 0}</span>
              <span className="text-[10px] text-slate-400 font-bold tracking-tighter uppercase">Reviews</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-slate-900 font-bold text-sm">{vendor.listingCount ?? Math.round(Number(vendor.followersCount || 0))}</span>
              <span className="text-[10px] text-slate-400 font-bold tracking-tighter uppercase">
                {vendor.listingCount != null ? 'Gems' : 'Network'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );

  if (!contentReady) {
    return <Seo title={PAGE_SEO.vendors.title} description={PAGE_SEO.vendors.description} />;
  }

  return (
    <div className="space-y-8 pb-12">
      <Seo title={PAGE_SEO.vendors.title} description={PAGE_SEO.vendors.description} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-slate-900 mb-2">Vendors</h1>
          <p className="text-slate-500 max-w-xl">
            Members with active gem listings — dealers, miners, and private sellers —
            including profile ratings from marketplace reviews.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button type="button" onClick={() => setMode('all')} className={`px-4 py-2 text-xs font-bold rounded-lg ${mode === 'all' ? 'text-primary bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>All Dealers</button>
          <button type="button" onClick={() => setMode('area')} className={`px-4 py-2 text-xs font-bold rounded-lg ${mode === 'area' ? 'text-primary bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>By Mining Area</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setQuery(draft);
            }}
            placeholder="Search by company name, location or stone specialty..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
          />
        </div>
        <button type="button" onClick={() => setQuery(draft)} className="bg-slate-900 text-white font-bold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
          Apply Filters
        </button>
      </div>

      {mode === 'area' ? (
        Object.entries(grouped).map(([location, list]) => (
          <section key={location} className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">{location}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {list.map(renderVendor)}
            </div>
          </section>
        ))
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(renderVendor)}
        </div>
      )}
    </div>
  );
};
