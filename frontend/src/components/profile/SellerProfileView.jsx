import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck, MapPin, Globe, Phone, Mail, Users, Star, MessageSquare, Info,
  Loader2, MessageCircle, Camera, Pencil, ImagePlus, Plus,
} from 'lucide-react';
import { ListingCard } from '../marketplace/ListingCard';
import { ReviewsSection } from '../vendors/ReviewsSection';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useAddListing } from '../../contexts/AddListingContext';
import { startConversation } from '../../lib/chat';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { resolveAvatar, resolveCover } from '../../constants/sampleImages';
import { apiGet, apiPost } from '../../lib/api';
import { onCatalogChange } from '../../lib/catalogEvents';
import { LoadingImage } from '../ui/LoadingImage';
import { useActivity } from '../../contexts/ActivityContext';
import { Seo } from '../seo/Seo';
import { truncateMeta, vendorJsonLd } from '../../lib/seo';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_COVER_BYTES = 4 * 1024 * 1024;
const PROFILE_TABS = new Set(['COLLECTION', 'REVIEWS', 'SETTINGS']);

function tabFromSearch(searchParams, hasSettings) {
  const raw = String(searchParams.get('tab') || 'collection').trim().toLowerCase();
  if (raw === 'settings' && hasSettings) return 'SETTINGS';
  if (raw === 'reviews') return 'REVIEWS';
  return 'COLLECTION';
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

export function SellerProfileView({
  profileId,
  settings = null,
  onLoaded = null,
  onProfileUpdated = null,
  indexable = false,
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userProfile, refreshSession } = useAuth();
  const { openAddListing } = useAddListing();
  const { follows, toggleFollow } = useActivity();
  const [followersCount, setFollowersCount] = useState(0);
  const [activeTab, setActiveTab] = useState(() => tabFromSearch(searchParams, Boolean(settings)));
  const [listingTab, setListingTab] = useState('ALL');
  const [messageLoading, setMessageLoading] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [coverBusy, setCoverBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    displayName: '',
    location: '',
    description: '',
    website: '',
  });
  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    const nextTab = tabFromSearch(searchParams, Boolean(settings));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [searchParams, settings]);

  const selectTab = (tab) => {
    if (!PROFILE_TABS.has(tab)) return;
    if (tab === 'SETTINGS' && !settings) return;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab.toLowerCase());
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (!profileId) {
      setVendor(null);
      setAllListings([]);
      setLoading(false);
      onLoadedRef.current?.(false);
      return undefined;
    }

    let cancelled = false;
    const load = ({ showLoader = false } = {}) => {
      if (showLoader) setLoading(true);
      apiGet(`/api/vendors/${profileId}`)
        .then((data) => {
          if (cancelled) return;
          setVendor(data.vendor);
          setFollowersCount(data.vendor?.followersCount || 0);
          setAllListings(data.listings || []);
          onLoadedRef.current?.(Boolean(data.vendor));
        })
        .catch((error) => {
          console.error(error);
          if (!cancelled) {
            setVendor(null);
            setAllListings([]);
            onLoadedRef.current?.(false);
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
  }, [profileId, reloadToken]);

  const isOwnProfile = Boolean(
    userProfile && vendor && (
      userProfile.uid === vendor.userId
      || userProfile.uid === vendor.id
      || userProfile.uid === profileId
    )
  );

  const saveProfileFields = async (fields) => {
    if (!userProfile) {
      navigate('/login');
      return null;
    }
    const saved = await apiPost('/api/users/profile', {
      userId: userProfile.uid,
      ...fields,
    });
    try {
      const firestoreUpdates = {};
      for (const key of Object.keys(fields)) {
        if (saved?.[key] !== undefined) firestoreUpdates[key] = saved[key];
        else firestoreUpdates[key] = fields[key];
      }
      if (Object.keys(firestoreUpdates).length) {
        await updateDoc(doc(db, 'users', userProfile.uid), firestoreUpdates);
      }
    } catch (firestoreError) {
      console.error(firestoreError);
    }
    if (fields.photoURL !== undefined) {
      try {
        await refreshSession?.();
      } catch (sessionError) {
        console.error(sessionError);
      }
    }
    onProfileUpdated?.(saved);
    setReloadToken((token) => token + 1);
    return saved;
  };

  const uploadImage = async (file, { field, maxBytes, label, setBusy }) => {
    if (!file) return;
    if (!userProfile) {
      navigate('/login');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setEditError(`Please choose an image file for your ${label}.`);
      return;
    }
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      setEditError(`${label} must be ${mb}MB or smaller.`);
      return;
    }
    setBusy(true);
    setEditError('');
    try {
      const dataUrl = await readAsDataUrl(file);
      await saveProfileFields({ [field]: dataUrl });
    } catch (error) {
      console.error(error);
      setEditError(error.message || `Could not update your ${label}.`);
    } finally {
      setBusy(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      displayName: vendor?.displayName || vendor?.companyName || '',
      location: vendor?.location || '',
      description: vendor?.description || '',
      website: vendor?.website || '',
    });
    setEditError('');
    setEditOpen(true);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (editBusy) return;
    setEditBusy(true);
    setEditError('');
    try {
      await saveProfileFields({
        displayName: editForm.displayName,
        location: editForm.location,
        description: editForm.description,
        website: editForm.website,
      });
      setEditOpen(false);
    } catch (error) {
      console.error(error);
      setEditError(error.message || 'Could not save profile changes.');
    } finally {
      setEditBusy(false);
    }
  };

  const handleMessage = async () => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    if (!vendor || isOwnProfile) return;

    setMessageLoading(true);
    try {
      const vendorUserId = vendor.userId || vendor.id;
      const vendorUserDoc = await getDoc(doc(db, 'users', vendorUserId));
      const vendorData = vendorUserDoc.exists()
        ? vendorUserDoc.data()
        : {
          uid: vendorUserId,
          displayName: vendor.displayName || vendor.companyName,
          photoURL: vendor.photoURL || vendor.logo,
        };

      await startConversation(userProfile, {
        uid: vendorData.uid || vendorUserId,
        displayName: vendorData.displayName,
        photoURL: vendorData.photoURL,
      });
      navigate('/messages');
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setMessageLoading(false);
    }
  };

  const following = Boolean(vendor && follows.some((row) => row.targetId === vendor.id && row.targetType === 'vendor'));

  const handleFollow = async () => {
    if (!vendor || isOwnProfile) return;
    const result = await toggleFollow(vendor.id, 'vendor');
    if (result && typeof result.followersCount === 'number') {
      setFollowersCount(result.followersCount);
    } else if (result) {
      setFollowersCount((count) => Math.max(0, count + (result.following ? 1 : -1)));
    }
  };

  const activeListings = allListings.filter((listing) => listing.status === 'ACTIVE');
  const soldListings = allListings.filter((listing) => listing.status === 'SOLD');
  const visibleListings = listingTab === 'ACTIVE'
    ? activeListings
    : listingTab === 'SOLD'
      ? soldListings
      : allListings;
  const displayName = vendor?.companyName || vendor?.displayName || 'Member';
  const coverSrc = resolveCover(vendor?.coverImage);

  if (loading) {
    return (
      <Seo
        title={indexable ? 'Vendor Profile' : 'Your Profile'}
        description={indexable ? 'Loading vendor profile on GemBook.' : 'Manage your GemBook profile.'}
        noindex={!indexable}
      />
    );
  }
  if (!vendor) {
    return (
      <>
        <Seo title="Profile not found" description="This GemBook profile is unavailable." noindex />
        <div className="py-20 text-center font-bold text-slate-500">Profile not found.</div>
      </>
    );
  }

  const vendorDescription = truncateMeta(
    vendor.description
      || `${displayName}${vendor.location ? ` · ${vendor.location}` : ''} on GemBook.`
  );
  const vendorImage = vendor.coverImage || vendor.logo || vendor.photoURL || undefined;

  return (
    <div className="space-y-6">
      <Seo
        title={displayName}
        description={vendorDescription}
        image={vendorImage}
        path={indexable ? `/vendors/${profileId}` : '/profile'}
        noindex={!indexable}
        jsonLd={indexable ? vendorJsonLd(vendor) : null}
      />
      <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-slate-800">
        {coverSrc ? (
          <LoadingImage src={coverSrc} className="w-full h-full object-cover" alt="Cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {isOwnProfile && (
          <div className="absolute top-3 right-3 z-10 flex flex-wrap gap-2">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                uploadImage(file, {
                  field: 'coverImage',
                  maxBytes: MAX_COVER_BYTES,
                  label: 'Cover photo',
                  setBusy: setCoverBusy,
                });
              }}
            />
            <button
              type="button"
              disabled={coverBusy}
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/55 text-white text-xs font-bold backdrop-blur-sm hover:bg-black/70 disabled:opacity-60"
            >
              {coverBusy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {coverBusy ? 'Uploading…' : 'Change cover'}
            </button>
            <button
              type="button"
              onClick={openEdit}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 text-slate-900 text-xs font-bold hover:bg-white"
            >
              <Pencil size={14} />
              Edit profile
            </button>
          </div>
        )}

        <div className="absolute bottom-4 md:bottom-6 left-4 md:left-10 right-4 flex flex-col md:flex-row items-start md:items-end gap-3 md:gap-6">
          <div className="w-16 h-16 md:w-32 md:h-32 rounded-xl md:rounded-2xl bg-white p-0.5 md:p-1 shadow-2xl border border-white/20 relative shrink-0">
            <LoadingImage
              src={resolveAvatar(vendor.logo || vendor.photoURL)}
              className="w-full h-full object-cover rounded-lg md:rounded-xl"
              alt={displayName}
            />
            {vendor.verified && (
              <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-white rounded-full p-0.5 shadow-md">
                <BadgeCheck size={16} className="text-primary md:w-6 md:h-6" />
              </div>
            )}
            {isOwnProfile && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    uploadImage(file, {
                      field: 'photoURL',
                      maxBytes: MAX_AVATAR_BYTES,
                      label: 'Avatar',
                      setBusy: setAvatarBusy,
                    });
                  }}
                />
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 md:bottom-1 md:right-1 w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-primary transition-colors disabled:opacity-50"
                  aria-label="Change profile photo"
                >
                  {avatarBusy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
              </>
            )}
          </div>
          <div className="pb-1 text-white min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl md:text-3xl font-black tracking-tight truncate">{displayName}</h1>
              {vendor.verificationLevel === 'GOLD' && (
                <span className="bg-amber-400 text-black text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-lg">
                  <Star size={10} fill="currentColor" /> Gold Member
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-sm text-gray-300 font-medium">
              <span className="flex items-center gap-1"><Users size={12} className="md:w-[14px] md:h-[14px]" /> {followersCount} Followers</span>
              <span className="flex items-center gap-1"><Star size={12} className="text-amber-400 fill-amber-400 md:w-[14px] md:h-[14px]" /> {Number(vendor.rating || 0).toFixed(1)} · {vendor.reviewCount || 0} reviews</span>
              {vendor.location && (
                <span className="flex items-center gap-1 truncate"><MapPin size={12} className="md:w-[14px] md:h-[14px]" /> {vendor.location}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {editError && (
        <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{editError}</p>
      )}

      <div className="w-full border-b border-gray-100">
        <div className="flex w-full items-stretch overflow-x-auto">
          <button
            type="button"
            onClick={() => selectTab('COLLECTION')}
            className={cn(
              'flex-1 min-w-0 pb-3 pt-1 text-center text-sm font-bold uppercase tracking-widest transition-all',
              activeTab === 'COLLECTION' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
            )}
          >
            Collection
          </button>
          <button
            type="button"
            onClick={() => selectTab('REVIEWS')}
            className={cn(
              'flex-1 min-w-0 pb-3 pt-1 text-center text-sm font-bold uppercase tracking-widest transition-all',
              activeTab === 'REVIEWS' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
            )}
          >
            Reviews
          </button>
          {settings && (
            <button
              type="button"
              onClick={() => selectTab('SETTINGS')}
              className={cn(
                'flex-1 min-w-0 pb-3 pt-1 text-center text-sm font-bold uppercase tracking-widest transition-all',
                activeTab === 'SETTINGS' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
              )}
            >
              Account Settings
            </button>
          )}
        </div>
      </div>

      {activeTab === 'SETTINGS' && settings ? (
        settings
      ) : activeTab === 'COLLECTION' ? (
        <div className="w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setListingTab('ALL')}
                className={cn(
                  'text-xs font-bold px-4 py-2 rounded-full transition-all',
                  listingTab === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100'
                )}
              >
                All gems ({allListings.length})
              </button>
              <button
                type="button"
                onClick={() => setListingTab('ACTIVE')}
                className={cn(
                  'text-xs font-bold px-4 py-2 rounded-full transition-all',
                  listingTab === 'ACTIVE' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100'
                )}
              >
                Available ({activeListings.length})
              </button>
              <button
                type="button"
                onClick={() => setListingTab('SOLD')}
                className={cn(
                  'text-xs font-bold px-4 py-2 rounded-full transition-all',
                  listingTab === 'SOLD' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100'
                )}
              >
                Sold ({soldListings.length})
              </button>
            </div>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => openAddListing()}
                className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm"
              >
                <Plus size={18} />
                List Gem
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleListings.map((listing) => (
              <ListingCard key={listing.id} listing={{ ...listing, vendor }} />
            ))}
          </div>

          {visibleListings.length === 0 && (
            <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium mb-4">
                {isOwnProfile ? 'You have not listed any gems yet.' : 'No gems found in this collection.'}
              </p>
              {isOwnProfile && (
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Info size={20} className="text-primary" />
                  About
                </h2>
                {isOwnProfile && (
                  <button type="button" onClick={openEdit} className="text-xs font-bold text-primary uppercase tracking-wider hover:underline">
                    Edit
                  </button>
                )}
              </div>
              {vendor.description ? (
                <p className="text-sm text-gray-600 leading-relaxed mb-6">{vendor.description}</p>
              ) : isOwnProfile ? (
                <p className="text-sm text-slate-400 mb-6">Add a short bio so buyers know who you are.</p>
              ) : null}

              <div className="space-y-4 pt-4 border-t border-gray-50">
                {(vendor.contactEmail || vendor.email) && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Mail size={18} className="text-gray-400" />
                    <span>{vendor.contactEmail || vendor.email}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone size={18} className="text-gray-400" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Globe size={18} className="text-gray-400" />
                    <a href={vendor.website} className="text-primary hover:underline truncate">
                      {vendor.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {!vendor.website && isOwnProfile && (
                  <p className="text-xs text-slate-400">No website added yet.</p>
                )}
              </div>

              {!isOwnProfile && (
                <div className="flex flex-col gap-2 mt-8">
                  <button type="button" onClick={handleFollow} className="w-full py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all">
                    {following ? 'Following' : 'Follow'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleMessage}
                      disabled={messageLoading}
                      className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {messageLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                      {messageLoading ? 'Starting Chat...' : 'Message'}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectTab('REVIEWS')}
                      className={cn(
                        'p-2 rounded-lg border transition-all',
                        activeTab === 'REVIEWS' ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                      )}
                    >
                      <MessageSquare size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <ReviewsSection
              vendorId={vendor.id}
              vendorUserId={vendor.userId}
              isOwnProfile={isOwnProfile}
            />
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-end sm:items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="edit-profile-title" className="text-2xl font-black text-slate-900 tracking-tight">Edit profile</h2>
            <p className="text-sm text-slate-500 mt-2">Update how your public profile looks to buyers.</p>
            <form onSubmit={submitEdit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display name</span>
                <input
                  value={editForm.displayName}
                  onChange={(event) => setEditForm((current) => ({ ...current, displayName: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                  required
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</span>
                <input
                  value={editForm.location}
                  onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Colombo, Sri Lanka"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</span>
                <input
                  value={editForm.website}
                  onChange={(event) => setEditForm((current) => ({ ...current, website: event.target.value }))}
                  placeholder="https://yoursite.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">About</span>
                <textarea
                  value={editForm.description}
                  onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  maxLength={1000}
                  placeholder="Tell buyers about your gems and experience."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-primary resize-y"
                />
              </label>
              {editError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{editError}</p>
              )}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-5 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit" disabled={editBusy} className="px-5 py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-40 inline-flex items-center justify-center gap-2">
                  {editBusy ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editBusy ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
