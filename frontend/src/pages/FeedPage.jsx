import React, { useState, useEffect, useMemo } from 'react';
import { PostCard } from '../components/social/PostCard';
import { ListingCard } from '../components/marketplace/ListingCard';
import { PublishGemBanner } from '../components/marketplace/PublishGemBanner';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Award, Calendar, ExternalLink, X, PenLine } from 'lucide-react';
import { CreatePost } from '../components/social/CreatePost';
import { CreateShort } from '../components/social/CreateShort';
import { resolveAvatar, resolvePostMedia } from '../constants/sampleImages';
import { apiGet, apiPost } from '../lib/api';
import { onCatalogChange } from '../lib/catalogEvents';
import { useAuth } from '../contexts/AuthContext';
import { usePageReady } from '../contexts/PageLoadingContext';
import { LoadingImage } from '../components/ui/LoadingImage';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO, organizationJsonLd, websiteJsonLd } from '../lib/seo';
import { VendorLeaderboardModal } from '../components/vendors/VendorLeaderboardModal';

const DEFAULT_NEWS_IMAGE = '/assets/images/gemstone_collection_luxury_1781701065808.jpg';

export const FeedPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [activeShort, setActiveShort] = useState(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  usePageReady(contentReady);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      apiGet('/api/feed')
        .then((data) => {
          if (!cancelled) setCatalog(data);
        })
        .catch((err) => {
          if (!cancelled && err?.code !== 'SERVER_DOWN') {
            setError(err.message || 'Could not load the feed');
          }
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
    const posts = catalog?.posts || [];
    const listings = catalog?.listings || [];
    const vendors = catalog?.vendors || [];

    const enrichPost = (post) => ({
      ...post,
      authorAvatar: resolveAvatar(post.authorAvatar),
      media: resolvePostMedia(post.media),
    });

    const enrichListing = (listing) => ({
      ...listing,
      images: Array.isArray(listing.images) ? listing.images.filter(Boolean) : [],
    });

    const items = [
      ...posts.map((p) => ({ type: 'post', data: enrichPost(p) })),
      ...listings.map((l) => ({ type: 'listing', data: enrichListing(l) })),
    ];

    return { items, vendors };
  }, [catalog]);

  const openShort = (short) => {
    setActiveShort(short);
    apiPost(`/api/shorts/${encodeURIComponent(short.id)}/view`, {
      userId: userProfile?.uid || 'guest',
    }).catch((error) => console.error(error));
  };

  if (!contentReady) {
    return (
      <Seo
        title={PAGE_SEO.home.title}
        description={PAGE_SEO.home.description}
        path="/"
        jsonLd={[organizationJsonLd(), websiteJsonLd()]}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <Seo
        title={PAGE_SEO.home.title}
        description={PAGE_SEO.home.description}
        path="/"
        jsonLd={[organizationJsonLd(), websiteJsonLd()]}
      />
      {error && (
        <p className="lg:col-span-12 text-sm font-medium text-red-600">{error}</p>
      )}
      {/* Sidebar - Left (Desktop) */}
      <div className="hidden lg:block lg:col-span-3 space-y-6 lg:shrink-0 lg:overflow-hidden">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Trending Categories
          </h2>
          <div className="space-y-2">
            {(catalog?.categories || []).length > 0 ? (
              (catalog.categories || []).map(cat => (
                <button key={cat.id} type="button" onClick={() => navigate(`/marketplace?gem=${encodeURIComponent(cat.name)}`)} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                  <span>{cat.name}</span>
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">{cat.badge || cat.count || ''}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-slate-400">No marketplace gems yet.</p>
            )}
          </div>
        </div>

        <div className="bg-primary/5 rounded-xl border border-primary/10 p-4 shadow-sm">
          <h2 className="font-bold text-primary mb-2 flex items-center gap-2">
            <Award size={20} />
            Verified Dealers
          </h2>
          <p className="text-xs text-slate-500 mb-4">Top rated and verified businesses this week.</p>
          <div className="space-y-3">
            {data.vendors.map(vendor => (
              <div key={vendor.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-100 overflow-hidden">
                  <LoadingImage src={resolveAvatar(vendor.logo)} alt={vendor.companyName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{vendor.companyName}</p>
                  <p className="text-[10px] text-gray-500">Rating: {vendor.rating} ★</p>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLeaderboardOpen(true)}
            className="w-full mt-4 py-2 text-xs font-bold text-primary hover:bg-white rounded-lg transition-colors border border-transparent hover:border-primary/20"
          >
            View Leaderboard
          </button>
        </div>
      </div>

      {/* Main Feed */}
      <div className="lg:col-span-6 space-y-6 min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1 custom-scrollbar">
        {/* Marketplace gem carousel — loops listed gems with owner details */}
        <PublishGemBanner listings={catalog?.listings || []} />

        <CreatePost />

        {/* Gem Shorts */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Gem Shorts
            </h2>
            <button type="button" onClick={() => catalog?.shorts?.[0] && openShort(catalog.shorts[0])} className="text-[10px] font-bold text-primary uppercase tracking-tighter hover:underline">Watch All</button>
          </div>
          <div className="flex w-full max-w-full gap-4 overflow-x-auto overscroll-x-contain pb-4 scroll-smooth snap-x snap-mandatory touch-pan-x no-scrollbar">
            <CreateShort />
            {(catalog?.shorts || []).map((short) => (
              <div key={short.id} onClick={() => openShort(short)} className="shrink-0 snap-start w-32 md:w-40 aspect-[9/16] rounded-3xl bg-slate-900 overflow-hidden relative group cursor-pointer shadow-lg shadow-slate-200">
                <LoadingImage
                  src={short.thumbnail}
                  alt={short.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-0 transition-opacity duration-500"
                />
                <video
                  src={short.video}
                  poster={short.thumbnail}
                  className="w-full h-full object-cover opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700"
                  muted
                  loop
                  playsInline
                  preload="none"
                  onMouseEnter={(e) => {
                    e.currentTarget.play().catch(() => {});
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                   <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-4 h-4 rounded-full bg-primary border border-white/50 overflow-hidden">
                        <LoadingImage src={resolveAvatar(short.avatar || short.dealerAvatar)} alt={short.dealerName} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[8px] font-bold truncate">{short.dealerName}</span>
                   </div>
                  <p className="text-[8px] md:text-[10px] font-medium line-clamp-2 leading-tight">{short.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {data.items.map((item, idx) => (
          <div key={idx}>
            {item.type === 'post' ? (
              <PostCard post={item.data} />
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Listing in Marketplace</span>
                  <button type="button" onClick={() => navigate('/marketplace')} className="text-xs text-primary font-bold">See More</button>
                </div>
                <ListingCard listing={item.data} variant="feed" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sidebar - Right (Desktop) */}
      <div className="hidden lg:block lg:col-span-3 space-y-6 lg:shrink-0 lg:overflow-hidden">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-warning" />
            Upcoming Events
          </h2>
          <div className="space-y-4">
            {(catalog?.events || []).map(event => (
              <div key={event.title} className="group cursor-pointer">
                <div className="flex gap-3">
                  <div className="bg-slate-50 w-12 h-12 rounded-lg flex flex-col items-center justify-center border border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                    <span className="text-[10px] font-bold text-primary">{event.date.split(' ')[0]}</span>
                    <span className="text-sm font-bold text-slate-900">{event.date.split(' ')[1]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">{event.title}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{event.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => navigate('/events')} className="w-full mt-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 border border-gray-100 rounded-lg hover:bg-gray-50 transition-all">
            Browse All Events
          </button>
        </div>

        {catalog?.news?.title ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm overflow-hidden relative group min-h-[180px]">
            <LoadingImage
              src={catalog.news.image || DEFAULT_NEWS_IMAGE}
              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700"
              alt="Industry news"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="relative z-10 pt-20">
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase mb-2 inline-block">{catalog.news.badge || 'Industry News'}</span>
              <h3 className="text-white font-bold leading-tight mb-2">{catalog.news.title}</h3>
              <button type="button" onClick={() => navigate('/news')} className="flex items-center gap-1 text-white text-xs font-bold hover:underline">
                {catalog.news.cta || 'Read Article'} <ExternalLink size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!userProfile) {
                navigate('/login');
                return;
              }
              const composer = document.getElementById('create-post');
              if (composer) {
                composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                window.dispatchEvent(new CustomEvent('gem:open-create-post', { detail: { mode: 'ARTICLE' } }));
                return;
              }
              navigate('/community');
            }}
            className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 shadow-sm overflow-hidden relative group min-h-[180px] hover:border-primary/30 transition-colors"
          >
            <LoadingImage
              src={DEFAULT_NEWS_IMAGE}
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700"
              alt="Write an article"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10"></div>
            <div className="relative z-10 pt-16 space-y-2">
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase inline-block">Open Spot</span>
              <h3 className="text-white font-bold leading-tight">No article yet — write one</h3>
              <p className="text-white/80 text-[11px] leading-snug">Share industry insight, market notes, or a gem story with the community.</p>
              <span className="inline-flex items-center gap-1.5 text-white text-xs font-bold mt-1">
                <PenLine size={12} />
                Write Article
              </span>
            </div>
          </button>
        )}
      </div>
      {activeShort && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setActiveShort(null)}>
          <div className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-3xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <video src={activeShort.video} poster={activeShort.thumbnail} className="w-full h-full object-cover" controls autoPlay />
            <button type="button" onClick={() => setActiveShort(null)} className="absolute top-3 right-3 p-2 bg-white/90 rounded-full text-slate-800">
              <X size={16} />
            </button>
            <p className="absolute bottom-4 left-4 right-4 text-white text-sm font-bold">{activeShort.title}</p>
          </div>
        </div>
      )}

      <VendorLeaderboardModal open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
    </div>
  );
};
