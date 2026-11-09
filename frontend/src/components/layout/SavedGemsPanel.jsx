import React, { useEffect, useMemo, useState } from 'react';
import { Heart, MapPin, ShoppingBag, Store, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, formatCurrency } from '../../lib/utils';
import { resolveAvatar, resolveGem } from '../../constants/sampleImages';
import { useActivity } from '../../contexts/ActivityContext';
import { apiGet } from '../../lib/api';
import { LoadingImage } from '../ui/LoadingImage';

export function SavedGemsPanel({ open, onClose }) {
  const { saves, follows, toggleSave, toggleFollow } = useActivity();
  const [listings, setListings] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('gems');

  const vendorFollowIds = useMemo(
    () => new Set(
      follows
        .filter((row) => row.targetType === 'vendor')
        .map((row) => row.targetId)
    ),
    [follows]
  );

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiGet('/api/listings'),
      apiGet('/api/vendors'),
    ])
      .then(([listingRows, vendorRows]) => {
        if (cancelled) return;
        setListings(Array.isArray(listingRows) ? listingRows : []);
        setVendors(Array.isArray(vendorRows) ? vendorRows : []);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setListings([]);
          setVendors([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const savedGems = useMemo(() => {
    const order = new Map(saves.map((id, index) => [id, index]));
    return listings
      .filter((listing) => order.has(listing.id))
      .sort((a, b) => order.get(a.id) - order.get(b.id));
  }, [listings, saves]);

  const savedMarketplaces = useMemo(() => {
    return vendors.filter((vendor) => {
      const ids = [vendor.id, vendor.userId].filter(Boolean);
      return ids.some((id) => vendorFollowIds.has(id));
    });
  }, [vendors, vendorFollowIds]);

  const gemCount = saves.length;
  const marketplaceCount = vendorFollowIds.size;

  const removeGem = async (listingId) => {
    try {
      await toggleSave(listingId);
    } catch (error) {
      console.error(error);
    }
  };

  const removeMarketplace = async (vendor) => {
    try {
      await toggleFollow(vendor.id, 'vendor');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[70]',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close saved gems"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-slate-900/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />

      <aside
        className={cn(
          'absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Saved Gems"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your collection</p>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Heart size={18} className="text-primary fill-primary" />
              Saved Gems
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setTab('gems')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all',
                tab === 'gems' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <ShoppingBag size={14} />
              Gems
              <span className={cn(
                'min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] flex items-center justify-center',
                tab === 'gems' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-600'
              )}>
                {gemCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('marketplaces')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all',
                tab === 'marketplaces' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Store size={14} />
              Marketplaces
              <span className={cn(
                'min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] flex items-center justify-center',
                tab === 'marketplaces' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-600'
              )}>
                {marketplaceCount}
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-16">Loading saved items…</p>
          ) : tab === 'gems' ? (
            savedGems.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No saved gems yet"
                body="Tap the heart on any marketplace listing to keep it here."
              />
            ) : (
              <ul className="space-y-3">
                {savedGems.map((listing) => {
                  const title = listing.title || `${listing.variety || ''} ${listing.type || listing.gemType || ''}`.trim() || 'Gem';
                  const image = resolveGem((listing.images || [])[0]);
                  const dealer = listing.vendor?.displayName || listing.vendor?.companyName || '';
                  return (
                    <li key={listing.id} className="group relative flex gap-3 p-3 rounded-2xl border border-slate-100 hover:border-primary/20 hover:shadow-sm transition-all">
                      <Link to={`/listings/${listing.id}`} onClick={onClose} className="flex gap-3 min-w-0 flex-1">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                          {image ? (
                            <LoadingImage src={image} alt={title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ShoppingBag size={20} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors">{title}</p>
                          {dealer && <p className="text-[11px] text-slate-500 truncate mt-0.5">{dealer}</p>}
                          <p className="text-sm font-black text-primary mt-1">
                            {listing.price != null ? formatCurrency(listing.price, listing.currency) : 'Price on request'}
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeGem(listing.id)}
                        className="self-start p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Remove from saved gems"
                      >
                        <Heart size={16} className="fill-current" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : savedMarketplaces.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No saved marketplaces"
              body="Follow a vendor business to keep their marketplace in this list."
            />
          ) : (
            <ul className="space-y-3">
              {savedMarketplaces.map((vendor) => (
                <li key={vendor.id} className="group relative flex gap-3 p-3 rounded-2xl border border-slate-100 hover:border-primary/20 hover:shadow-sm transition-all">
                  <Link to={`/vendors/${vendor.id}`} onClick={onClose} className="flex gap-3 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                      <LoadingImage
                        src={resolveAvatar(vendor.logo || vendor.photoURL)}
                        alt={vendor.companyName || vendor.displayName || 'Vendor'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                        {vendor.companyName || vendor.displayName || 'Vendor'}
                      </p>
                      {vendor.location && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={10} className="shrink-0" />
                          {vendor.location}, Sri Lanka
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {vendor.listingCount === 1
                          ? '1 gem listed'
                          : `${vendor.listingCount || 0} gems listed`}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeMarketplace(vendor)}
                    className="self-start px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Unfollow
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-4">
        <Icon size={24} />
      </div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">{body}</p>
    </div>
  );
}
