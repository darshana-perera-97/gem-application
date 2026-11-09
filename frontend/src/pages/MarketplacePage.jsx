import React, { useState, useEffect, useMemo } from 'react';
import { ListingCard } from '../components/marketplace/ListingCard';
import { PublishGemBanner } from '../components/marketplace/PublishGemBanner';
import { Search, SlidersHorizontal, Grid2X2, List, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { apiGet } from '../lib/api';
import { onCatalogChange } from '../lib/catalogEvents';
import { usePageReady } from '../contexts/PageLoadingContext';
import { useAddListing } from '../contexts/AddListingContext';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

const GEM_CHIPS = ['All Gems', 'Sapphires', 'Rubies', 'Spinels', 'Emeralds', 'Padparadscha'];
const PAGE_SIZE = 8;
const BANNER_EVERY = 5;

function matchesGem(listing, gem) {
  if (!gem || gem === 'All Gems') return true;
  const haystack = `${listing.gemType || ''} ${listing.variety || ''} ${listing.title || ''} ${listing.type || ''}`.toLowerCase();
  const words = gem.toLowerCase().split(' ').filter((word) => word.length > 2);
  return words.some((word) => haystack.includes(word.replace(/ies$/, 'y').replace(/s$/, '')));
}

export const MarketplacePage = () => {
  const [params] = useSearchParams();
  const { openAddListing } = useAddListing();
  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');
  const [gemFilter, setGemFilter] = useState(params.get('gem') || 'All Gems');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('grid');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [origin, setOrigin] = useState('Any');
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [catalogListings, setCatalogListings] = useState([]);
  const [contentReady, setContentReady] = useState(false);
  usePageReady(contentReady);

  useEffect(() => {
    setSearchQuery(params.get('q') || '');
    setGemFilter(params.get('gem') || 'All Gems');
    setVisibleCount(PAGE_SIZE);
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      apiGet('/api/listings')
        .then((listings) => {
          if (!cancelled) setCatalogListings(listings);
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          if (!cancelled) setContentReady(true);
        });
    };
    load();
    const unsubscribe = onCatalogChange(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const data = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    const priceCap = Number(maxPrice);
    let listings = catalogListings.filter((listing) => {
      if (queryText) {
        const haystack = `${listing.title || ''} ${listing.gemType || ''} ${listing.variety || ''} ${listing.vendor?.displayName || ''} ${listing.vendor?.companyName || ''}`.toLowerCase();
        if (!haystack.includes(queryText)) return false;
      }
      if (!matchesGem(listing, gemFilter)) return false;
      if (origin !== 'Any' && listing.origin !== origin) return false;
      if (certifiedOnly && (listing.certification === 'None' || !listing.certification)) return false;
      if (priceCap > 0 && Number(listing.price) > priceCap) return false;
      return true;
    });
    listings = [...listings].sort((a, b) => {
      if (sort === 'price-asc') return Number(a.price) - Number(b.price);
      if (sort === 'price-desc') return Number(b.price) - Number(a.price);
      if (sort === 'weight') return Number(b.caratWeight || b.weight || 0) - Number(a.caratWeight || a.weight || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return { listings, origins: [...new Set(catalogListings.map((listing) => listing.origin).filter(Boolean))] };
  }, [catalogListings, searchQuery, gemFilter, origin, certifiedOnly, maxPrice, sort]);

  const chips = GEM_CHIPS.includes(gemFilter) ? GEM_CHIPS : ['All Gems', gemFilter, ...GEM_CHIPS.slice(1)];
  const gridItems = useMemo(() => {
    const visibleListings = data.listings.slice(0, visibleCount);
    const items = [];
    visibleListings.forEach((listing, index) => {
      items.push({ kind: 'listing', listing });
      if ((index + 1) % BANNER_EVERY === 0) {
        items.push({ kind: 'banner', key: `publish-banner-${index + 1}` });
      }
    });
    return items;
  }, [data.listings, visibleCount]);

  if (!contentReady) {
    return <Seo title={PAGE_SEO.marketplace.title} description={PAGE_SEO.marketplace.description} />;
  }

  return (
    <div className="space-y-6">
      <Seo title={PAGE_SEO.marketplace.title} description={PAGE_SEO.marketplace.description} />
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gem Marketplace</h1>
          <p className="text-gray-500 text-sm">Discover verified gems from Sri Lanka's top dealers.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openAddListing()}
            className="bg-primary text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap"
          >
            <Plus size={18} />
            List Gem
          </button>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="button" onClick={() => setFiltersOpen((open) => !open)} className={cn("p-2.5 bg-white border border-gray-100 rounded-2xl transition-all shadow-sm", filtersOpen ? "text-primary bg-primary/5" : "text-gray-400 hover:text-primary hover:bg-primary/5")}>
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>
      {filtersOpen && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
          <select value={origin} onChange={(event) => { setOrigin(event.target.value); setVisibleCount(PAGE_SIZE); }} className="bg-slate-50 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none">
            <option>Any</option>
            {data.origins.map((name) => <option key={name}>{name}</option>)}
          </select>
          <input type="number" min="0" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="Max price (USD)" className="bg-slate-50 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none" />
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={certifiedOnly} onChange={(event) => { setCertifiedOnly(event.target.checked); setVisibleCount(PAGE_SIZE); }} />
            Certified only
          </label>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 border-y border-gray-100">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-full md:w-auto">
          {chips.map((filter) => (
            <button 
              key={filter}
              type="button"
              onClick={() => { setGemFilter(filter); setVisibleCount(PAGE_SIZE); }}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tight transition-all",
                gemFilter === filter
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                  : "bg-white text-gray-400 hover:text-slate-900 hover:bg-gray-50 border border-gray-100"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
             <select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/10">
                <option value="newest">Newest Arrivals</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="weight">Weight: High to Low</option>
             </select>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
            <button type="button" aria-label="Grid view" onClick={() => setView('grid')} className={cn("p-2 rounded-lg", view === 'grid' ? "bg-white shadow-sm text-primary" : "text-gray-400 hover:text-slate-900")}>
              <Grid2X2 size={16} />
            </button>
            <button type="button" aria-label="List view" onClick={() => setView('list')} className={cn("p-2 rounded-lg", view === 'list' ? "bg-white shadow-sm text-primary" : "text-gray-400 hover:text-slate-900")}>
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Listings — marketplace gem banner after every 5 gems */}
      <div className={cn("grid gap-6", view === 'list' ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
        {gridItems.map((item) =>
          item.kind === 'banner' ? (
            <PublishGemBanner
              key={item.key}
              listings={catalogListings}
              className={view === 'list' ? '' : 'col-span-full'}
            />
          ) : (
            <ListingCard key={item.listing.id} listing={item.listing} variant={view} />
          )
        )}
      </div>

      {visibleCount < data.listings.length && (
      <div className="flex justify-center pt-8">
        <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="px-6 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
          Load More Listings
        </button>
      </div>
      )}
    </div>
  );
};
