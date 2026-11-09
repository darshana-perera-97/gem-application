import React, { useEffect, useState } from 'react';
import { Gem, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListingCard } from '../components/marketplace/ListingCard';
import { useAuth } from '../contexts/AuthContext';
import { useAddListing } from '../contexts/AddListingContext';
import { usePageReady } from '../contexts/PageLoadingContext';
import { apiGet, apiPost } from '../lib/api';
import { emitCatalogChange, onCatalogChange } from '../lib/catalogEvents';
import { cn } from '../lib/utils';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

export const MyGemsPage = () => {
  const navigate = useNavigate();
  const { userProfile, loading: authLoading } = useAuth();
  const { openAddListing } = useAddListing();
  const [vendor, setVendor] = useState(null);
  const [listings, setListings] = useState([]);
  const [listingTab, setListingTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusBusyId, setStatusBusyId] = useState('');

  usePageReady(!authLoading && (!userProfile || !loading));

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, navigate, userProfile]);

  useEffect(() => {
    if (!userProfile?.uid) {
      setVendor(null);
      setListings([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = ({ showLoader = false } = {}) => {
      if (showLoader) setLoading(true);
      apiGet(`/api/vendors/${encodeURIComponent(userProfile.uid)}`)
        .then((data) => {
          if (cancelled) return;
          setVendor(data.vendor || null);
          setListings(data.listings || []);
          setError('');
        })
        .catch((err) => {
          console.error(err);
          if (!cancelled) {
            setVendor(null);
            setListings([]);
            setError(err.message || 'Could not load your gems.');
          }
        })
        .finally(() => {
          if (!cancelled && showLoader) setLoading(false);
        });
    };

    load({ showLoader: true });
    const unsubscribe = onCatalogChange(() => load({ showLoader: false }));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userProfile?.uid]);

  const updateListingStatus = async (listing, status) => {
    if (!userProfile?.uid || !listing?.id || statusBusyId) return;
    const nextStatus = status === 'SOLD' ? 'SOLD' : 'ACTIVE';
    const label = nextStatus === 'SOLD' ? 'sold' : 'available';
    if (!window.confirm(`Mark "${listing.title || 'this gem'}" as ${label}?`)) return;

    setStatusBusyId(listing.id);
    setError('');
    try {
      const saved = await apiPost(`/api/listings/${encodeURIComponent(listing.id)}/status`, {
        userId: userProfile.uid,
        status: nextStatus,
      });
      setListings((current) => current.map((item) => (
        item.id === listing.id ? { ...item, ...saved, status: nextStatus } : item
      )));
      emitCatalogChange();
    } catch (err) {
      console.error(err);
      setError(err.message || `Could not mark gem as ${label}.`);
    } finally {
      setStatusBusyId('');
    }
  };

  if (authLoading || !userProfile || loading) {
    return <Seo title={PAGE_SEO.myGems.title} description={PAGE_SEO.myGems.description} noindex />;
  }

  const activeListings = listings.filter((listing) => listing.status === 'ACTIVE');
  const soldListings = listings.filter((listing) => listing.status === 'SOLD');
  const visibleListings = listingTab === 'ACTIVE'
    ? activeListings
    : listingTab === 'SOLD'
      ? soldListings
      : listings;
  const emptyMessage = listingTab === 'SOLD'
    ? 'No sold gems yet.'
    : listingTab === 'ACTIVE'
      ? 'No available gems right now.'
      : 'You have not listed any gems yet.';

  return (
    <div className="w-full space-y-6">
      <Seo title={PAGE_SEO.myGems.title} description={PAGE_SEO.myGems.description} noindex />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Gems</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Gems you have listed on the marketplace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAddListing()}
          className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm"
        >
          <Plus size={18} />
          List Gem
        </button>
      </div>

      {error && (
        <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          label={`All gems (${listings.length})`}
          active={listingTab === 'ALL'}
          onClick={() => setListingTab('ALL')}
        />
        <FilterChip
          label={`Available (${activeListings.length})`}
          active={listingTab === 'ACTIVE'}
          onClick={() => setListingTab('ACTIVE')}
        />
        <FilterChip
          label={`Sold (${soldListings.length})`}
          active={listingTab === 'SOLD'}
          onClick={() => setListingTab('SOLD')}
        />
      </div>

      {visibleListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={{ ...listing, vendor: listing.vendor || vendor }}
              ownerMode
              statusBusy={statusBusyId === listing.id}
              onMarkSold={(item) => updateListingStatus(item, 'SOLD')}
              onMarkAvailable={(item) => updateListingStatus(item, 'ACTIVE')}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/5 text-primary flex items-center justify-center">
            <Gem size={24} />
          </div>
          <p className="text-slate-400 font-medium mb-4">
            {emptyMessage}
          </p>
          {listingTab !== 'SOLD' && (
            <button
              type="button"
              onClick={() => openAddListing()}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold text-sm"
            >
              <Plus size={16} />
              List your first gem
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const FilterChip = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'text-xs font-bold px-4 py-2 rounded-full transition-all',
      active ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100'
    )}
  >
    {label}
  </button>
);
