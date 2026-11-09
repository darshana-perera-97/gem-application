import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, MapPin, Scale, Shield, MessageCircle, Share2, Info, ChevronRight, Award, Ruler, Sparkles, Play, Heart, Loader2, Pencil } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { apiGet } from '../lib/api';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { startConversation } from '../lib/chat';
import { useActivity } from '../contexts/ActivityContext';
import { resolveGem } from '../constants/sampleImages';
import { usePageReady } from '../contexts/PageLoadingContext';
import { LoadingImage } from '../components/ui/LoadingImage';
import { Seo } from '../components/seo/Seo';
import { productJsonLd, truncateMeta } from '../lib/seo';

export const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { saves, toggleSave } = useActivity();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [catalogListing, setCatalogListing] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  usePageReady(!loading);

  useEffect(() => {
    let cancelled = false;
    const fetchListing = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await apiGet(`/api/listings/${id}`);
        if (!cancelled) {
          setCatalogListing(data.listing);
          setVendor(data.vendor);
        }
      } catch (error) {
        if (error.status !== 404) console.error('Error fetching catalog listing:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchListing();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSendInquiry = async () => {
    if (!userProfile) {
      navigate('/login');
      return;
    }

    const vendorUserId = vendor?.userId || listing.vendorId;
    if (!vendorUserId) return;

    setInquiryLoading(true);
    try {
      const vendorUserDoc = await getDoc(doc(db, 'users', vendorUserId));
      let vendorData;
      
      if (vendorUserDoc.exists()) {
        vendorData = vendorUserDoc.data();
      } else {
        vendorData = {
          uid: vendorUserId,
          displayName: vendor?.companyName || '',
          photoURL: vendor?.logo || ''
        };
      }

      const conversationId = await startConversation(userProfile, {
        uid: vendorData.uid,
        displayName: vendorData.displayName,
        photoURL: vendorData.photoURL
      });

      navigate('/messages');
    } catch (error) {
      console.error("Error starting conversation:", error);
    } finally {
      setInquiryLoading(false);
    }
  };
  
  const listing = catalogListing;
  const isSaved = Boolean(listing && saves.includes(listing.id));
  const photos = listing?.images?.length ? listing.images : [];
  const dealerName = vendor?.displayName || vendor?.companyName || '';
  const dealerAvatar = resolveGem(vendor?.photoURL || vendor?.logo);
  const dealerLocation = vendor?.location || '';
  const dealerRating = typeof vendor?.rating === 'number' ? vendor.rating.toFixed(1) : '';
  const dealerReviews = vendor?.reviewCount ? `${vendor.reviewCount} Reviews` : '';
  const ownerIds = new Set(
    [listing?.vendorId, vendor?.id, vendor?.userId].filter(Boolean).map(String)
  );
  const isOwner = Boolean(userProfile?.uid && ownerIds.has(userProfile.uid));

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listing.title || listing.name} | Ceylon Gem Book`,
          text: `Check out this ${listing.gemType || listing.variety} on Ceylon Gem Book!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading && id) {
    return <Seo title="Gem Listing" description="Loading gem listing on GemBook." />;
  }
  if (!listing) {
    return (
      <>
        <Seo title="Listing not found" description="This gem listing is unavailable on GemBook." noindex />
        <div className="py-20 text-center font-bold text-slate-500">Listing not found.</div>
      </>
    );
  }

  const listingTitle = listing.title || listing.name || 'Gem Listing';
  const listingDescription = truncateMeta(
    listing.description
      || [
        listing.gemType || listing.type,
        listing.variety,
        listing.caratWeight || listing.weight ? `${listing.caratWeight || listing.weight}ct` : '',
        listing.origin,
        dealerName ? `from ${dealerName}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
  );
  const listingImage = photos[0] || undefined;

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <Seo
        title={listingTitle}
        description={listingDescription}
        image={listingImage}
        type="product"
        jsonLd={productJsonLd(listing, vendor)}
      />
      {/* Mobile Vendor Header - Only visible on small screens */}
      <div className="md:hidden">
        <Link to={`/vendors/${listing.vendorId}`} className="p-4 bg-slate-900 rounded-3xl flex items-center gap-4 group relative overflow-hidden shadow-xl">
           <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent opacity-50"></div>
           <div className="w-12 h-12 rounded-xl bg-white border border-white/20 overflow-hidden relative z-10 shrink-0">
              {dealerAvatar && <LoadingImage src={dealerAvatar} className="w-full h-full object-cover" alt={dealerName || 'Vendor'} referrerPolicy="no-referrer" />}
           </div>
           <div className="flex-1 relative z-10 min-w-0 text-left">
              <p className="text-[8px] text-accent font-black uppercase tracking-widest mb-0.5">Premier Dealer</p>
              {dealerName && <h4 className="font-black text-white text-sm truncate">{dealerName}</h4>}
              {(dealerRating || dealerReviews || vendor?.verified) && (
              <div className="flex items-center gap-1.5">
                 <span className="text-[8px] text-white/60 font-bold uppercase">{[dealerRating, dealerReviews, vendor?.verified ? 'Verified' : ''].filter(Boolean).join(' • ')}</span>
              </div>
              )}
           </div>
           <ChevronRight size={18} className="text-white/40 relative z-10" />
        </Link>
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <Link to="/marketplace" className="hover:text-primary">Marketplace</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900">{listing.gemType || listing.type}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Media Section */}
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-xl relative group">
            {photos[photoIndex] && (
            <LoadingImage src={resolveGem(photos[photoIndex])} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt={listing.title || listing.name} />
            )}
            <div className="absolute top-6 right-6">
               <button 
                 onClick={() => toggleSave(listing.id)}
                 className={cn(
                   "p-3 rounded-full backdrop-blur-md shadow-xl transition-all active:scale-90",
                   isSaved ? "bg-red-500 text-white" : "bg-white/80 text-gray-900 hover:bg-white"
                 )}
               >
                 <Heart size={24} fill={isSaved ? "currentColor" : "none"} />
               </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {(listing.images || []).map((img, idx) => (
              <button type="button" key={idx} onClick={() => setPhotoIndex(idx)} className="aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-white cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-sm">
                <LoadingImage src={resolveGem(img)} className="w-full h-full object-cover" alt="Gallery" />
              </button>
            ))}
          </div>

          {/* Certificate Section - Primary on Mobile, stacks after images */}
          {listing.certificate && (
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-primary flex items-center gap-2">
                <Shield size={20} />
                Certified Authentication
              </h2>
              <BadgeCheck className="text-primary" size={24} />
            </div>
            {listing.certificate.lab && (
              <p className="text-sm text-gray-600 mb-4">
                This gemstone has been verified and authenticated by <strong>{listing.certificate.lab}</strong>.
              </p>
            )}
            <div className="text-xs space-y-1 text-gray-500 font-mono">
              {listing.certificate.number && <p>CERTIFICATE #: {listing.certificate.number}</p>}
              {listing.certificate.date && <p>ISSUED: {listing.certificate.date}</p>}
            </div>
          </div>
          )}

          {/* Expert Review Video */}
          {listing.video && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden scroll-mt-20" id="expert-video">
              <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Play size={20} className="text-primary fill-primary" />
                  Expert Video Review
                </h2>

              </div>
              <div className="aspect-video bg-black relative group">
                <video 
                  src={listing.video} 
                  controls 
                  className="w-full h-full object-cover"
                  poster={listing.images?.[1] || listing.images?.[0]}
                />
              </div>
              {(listing.videoCaption || listing.reviewNote) && (
              <div className="p-6 bg-slate-50 border-t border-gray-100">
                <div className="flex items-start gap-3">
                   <Info size={16} className="text-primary shrink-0 mt-0.5" />
                   <p className="text-sm text-slate-600 italic leading-relaxed">
                      {listing.videoCaption || listing.reviewNote}
                   </p>
                </div>
              </div>
              )}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">{listing.gemType || listing.variety}</span>
              {listing.featured && <span className="bg-[#FBBC05] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">Market Leader</span>}
            </div>
            
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 leading-tight">{listing.title || listing.name}</h1>
            
            <div className="flex items-center gap-4 text-xs text-slate-500 mb-8 pb-6 border-b border-gray-50">
              <span className="flex items-center gap-1.5"><MapPin size={16} className="text-primary" /> {listing.origin}</span>
              <span className="flex items-center gap-1.5"><Scale size={16} className="text-primary" /> {listing.caratWeight || listing.weight} Carats</span>
            </div>

            <div className="flex items-baseline justify-between mb-8">
              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Asking Price</p>
                 <span className="text-4xl md:text-5xl font-black text-accent tracking-tighter">{formatCurrency(listing.price, listing.currency)}</span>
              </div>
              {listing.negotiable && <span className="text-[10px] font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10 uppercase tracking-tighter">Accepting Offers</span>}
            </div>

            {/* Vendor Profile Section - More Prominent (Desktop Only) */}
            <Link to={`/vendors/${listing.vendorId}`} className="hidden md:flex mb-8 p-6 bg-slate-900 rounded-[2rem] items-center gap-6 group cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all relative overflow-hidden text-center md:text-left">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-transparent opacity-50"></div>
               <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border-2 border-white/20 overflow-hidden shadow-2xl relative z-10 shrink-0">
                  {dealerAvatar && <LoadingImage src={dealerAvatar} className="w-full h-full object-cover" alt={dealerName || 'Vendor'} referrerPolicy="no-referrer" />}
               </div>
               <div className="flex-1 relative z-10 min-w-0">
                  <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mb-1">Exclusive Partner</p>
                  {dealerName && <h4 className="font-black text-white text-lg md:text-xl leading-tight mb-1 truncate">{dealerName}</h4>}
                  {(dealerRating || dealerReviews) && (
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                     <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest whitespace-nowrap">{[dealerRating, dealerReviews].filter(Boolean).join(' • ')}</span>
                  </div>
                  )}
                  {dealerLocation && (
                  <div className="flex items-center justify-center md:justify-start gap-2">
                     {vendor?.verified && <span className="text-[10px] font-black text-white bg-accent px-2 py-0.5 rounded uppercase tracking-tighter shrink-0">Verified</span>}
                     <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter truncate">{dealerLocation}</span>
                  </div>
                  )}
               </div>
               <div className="hidden md:block relative z-10 text-white opacity-40 group-hover:opacity-100 transition-opacity pr-2">
                  <ChevronRight size={24} />
               </div>
            </Link>

            <div className="grid grid-cols-1 gap-4 mb-8">
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => navigate(`/listings/${listing.id}/edit`)}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all flex items-center justify-center gap-3 text-lg"
                >
                  <Pencil size={22} />
                  Edit Listing
                </button>
              ) : (
                <button 
                  onClick={handleSendInquiry}
                  disabled={inquiryLoading}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-70"
                >
                  {inquiryLoading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <MessageCircle size={24} />
                  )}
                  {inquiryLoading ? 'Initiating Chat...' : 'Send Inquiry'}
                </button>
              )}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => toggleSave(listing.id)}
                  className={cn(
                    "py-4 rounded-2xl font-bold border transition-all flex items-center justify-center gap-2",
                    isSaved ? "bg-red-50 border-red-100 text-red-600" : "bg-white border-gray-100 text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
                  {isSaved ? "Saved" : "Save Gem"}
                </button>
                <button 
                  onClick={handleShare}
                  className="py-4 bg-white text-gray-900 rounded-2xl font-bold border border-gray-100 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 size={20} />
                  Share
                </button>
              </div>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 gap-y-4 text-sm border-t border-gray-50 pt-6">
              <SpecItem icon={Sparkles} label="Clarity" value={listing.clarity} />
              <SpecItem icon={Award} label="Cut" value={listing.cut} />
              <SpecItem icon={Info} label="Treatment" value={listing.treatment} />
              <SpecItem icon={Ruler} label="Shape" value={listing.shape} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SpecItem = ({ icon: Icon, label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
      <Icon size={12} /> {label}
    </span>
    <span className="font-semibold text-gray-900">{value}</span>
  </div>
);
