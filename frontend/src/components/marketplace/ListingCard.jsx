import React, { useState } from 'react';
import { BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight, Heart, MapPin, Pencil, Phone, RotateCcw, Scale, Star, MessageCircle, Share2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, cn } from '../../lib/utils';
import { resolveAvatar, resolveGem } from '../../constants/sampleImages';
import { useAuth } from '../../contexts/AuthContext';
import { useActivity } from '../../contexts/ActivityContext';
import { startConversation } from '../../lib/chat';
import { LoadingImage } from '../ui/LoadingImage';

function SellerBadge({ listing, dealerName, dealerAvatar, dealerLocation, dealerPhone, size = 'md' }) {
  const isCompact = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <Link
      to={`/vendors/${listing.vendorId}`}
      className={cn(
        'flex items-center group/vendor min-w-0',
        isLarge ? 'gap-3 md:gap-5' : isCompact ? 'gap-3' : 'gap-2.5 md:gap-3.5'
      )}
    >
      <div
        className={cn(
          'rounded-full bg-white border border-slate-200 overflow-hidden shadow-sm shrink-0 transition-transform group-hover/vendor:scale-105 flex items-center justify-center font-black text-slate-400 uppercase',
          isCompact && 'w-8 h-8 text-[10px]',
          size === 'md' && 'w-12 h-12 md:w-16 md:h-16 md:rounded-2xl text-xs md:text-sm',
          isLarge && 'w-24 h-24 md:w-32 md:h-32 md:rounded-3xl text-lg md:text-xl'
        )}
      >
        {dealerAvatar ? (
          <LoadingImage
            src={dealerAvatar}
            className="w-full h-full object-cover"
            alt={dealerName || 'Seller'}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{(dealerName || '?').slice(0, 1)}</span>
        )}
      </div>
      <div className="flex flex-col min-w-0 leading-tight">
        {listing.vendor?.verified && (
          <span className={cn(
            'font-black text-primary uppercase tracking-widest mb-0.5',
            isCompact && 'text-[8px] md:text-[10px]',
            size === 'md' && 'text-[9px] md:text-[11px]',
            isLarge && 'text-[11px] md:text-sm'
          )}>
            Verified Dealer
          </span>
        )}
        <span className={cn(
          'font-bold text-slate-900 group-hover/vendor:text-primary transition-colors truncate',
          isCompact && 'text-xs',
          size === 'md' && 'text-sm md:text-base',
          isLarge && 'text-base md:text-xl'
        )}>
          {dealerName || 'Member'}
        </span>
        {dealerPhone && (
          <div className={cn('flex items-center', isLarge ? 'gap-1.5 mt-1' : 'gap-1 mt-0.5')}>
            <Phone size={isCompact ? 8 : isLarge ? 14 : 12} className="text-slate-400 shrink-0" />
            <span className={cn(
              'font-medium text-slate-600 truncate',
              isCompact && 'text-[8px] md:text-[10px]',
              size === 'md' && 'text-[10px] md:text-xs',
              isLarge && 'text-xs md:text-sm'
            )}>{dealerPhone}</span>
          </div>
        )}
        {dealerLocation && (
          <div className={cn('flex items-center', isLarge ? 'gap-1.5 mt-1' : 'gap-1 mt-0.5')}>
            <MapPin size={isCompact ? 8 : isLarge ? 14 : 12} className="text-slate-400 shrink-0" />
            <span className={cn(
              'font-medium text-slate-500 truncate',
              isCompact && 'text-[8px] md:text-[10px]',
              size === 'md' && 'text-[10px] md:text-xs',
              isLarge && 'text-xs md:text-sm'
            )}>{dealerLocation}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export const ListingCard = ({ listing, variant = 'grid', ownerMode = false, statusBusy = false, onMarkSold, onMarkAvailable }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { saves, toggleSave } = useActivity();
  const saved = saves.includes(listing.id);
  const isSold = listing.status === 'SOLD';
  const isList = variant === 'list';
  const dealerName = listing.vendor?.displayName || listing.vendor?.companyName || '';
  const dealerLocation = listing.vendor?.location || listing.origin || '';
  const dealerPhone = listing.vendor?.phone || '';
  const dealerAvatar = resolveAvatar(listing.vendor?.photoURL || listing.vendor?.logo);
  const images = (listing.images || []).map((img) => resolveGem(img)).filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultipleImages = images.length > 1;
  const title = listing.title || `${listing.variety} ${listing.type}`;

  const handleEdit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(`/listings/${listing.id}/edit`);
  };

  const handleMarkSold = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onMarkSold?.(listing);
  };

  const handleMarkAvailable = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onMarkAvailable?.(listing);
  };

  const ownerActions = ownerMode ? (
    <div className="flex items-center gap-2 w-full">
      <button
        type="button"
        onClick={handleEdit}
        className="inline-flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition-colors"
      >
        <Pencil size={13} />
        Edit
      </button>
      {isSold ? (
        <button
          type="button"
          onClick={handleMarkAvailable}
          disabled={statusBusy}
          className="inline-flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/15 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={13} />
          Mark available
        </button>
      ) : (
        <button
          type="button"
          onClick={handleMarkSold}
          disabled={statusBusy}
          className="inline-flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={13} />
          Mark as sold
        </button>
      )}
    </div>
  ) : null;

  const goToImage = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex(index);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await toggleSave(listing.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleShare = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const url = `${window.location.origin}/listings/${listing.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
    await navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleMessage = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!userProfile) {
      navigate('/login');
      return;
    }
    const vendorUserId = listing.vendor?.userId || listing.vendorId;
    if (!vendorUserId) {
      navigate(`/listings/${listing.id}`);
      return;
    }
    try {
      await startConversation(userProfile, {
        uid: vendorUserId,
        displayName: dealerName || listing.vendor?.companyName || 'Member',
        photoURL: listing.vendor?.photoURL || listing.vendor?.logo || dealerAvatar,
      });
      navigate('/messages');
    } catch (error) {
      console.error(error);
      navigate(`/listings/${listing.id}`);
    }
  };

  const callHref = dealerPhone
    ? `tel:${dealerPhone.replace(/[^\d+]/g, '')}`
    : '';

  const callAction = callHref ? (
    <a
      href={callHref}
      aria-label={`Call ${dealerName || 'seller'}`}
      onClick={(event) => event.stopPropagation()}
      className="md:hidden text-slate-400 hover:text-primary transition-colors"
    >
      <Phone size={18} />
    </a>
  ) : null;

  if (isList) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl hover:border-slate-300 transition-all duration-500">
        <div className="flex flex-col sm:flex-row">
          <div className="relative sm:w-48 md:w-56 lg:w-64 shrink-0 aspect-[4/3] sm:aspect-auto sm:min-h-[11rem] overflow-hidden bg-slate-100">
            <Link to={`/listings/${listing.id}`} className="block h-full min-h-[11rem]">
              {images[0] ? (
                <LoadingImage
                  src={images[activeIndex] || images[0]}
                  alt={title}
                  className={cn(
                    'w-full h-full object-cover group-hover:scale-105 transition-transform duration-700',
                    isSold && 'grayscale-[0.5] opacity-80'
                  )}
                />
              ) : null}
            </Link>

            {isSold && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                <span className="rotate-[-12deg] px-4 py-1 border-2 border-white text-white font-black text-lg uppercase tracking-widest">
                  Sold
                </span>
              </div>
            )}

            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              {listing.featured && !isSold && (
                <span className="bg-amber-400 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase shadow-lg tracking-widest">
                  Premium
                </span>
              )}
              {(listing.certification !== 'None' || listing.certificate?.verified) && (
                <span className="bg-primary text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase shadow-lg flex items-center gap-1 tracking-widest">
                  <BadgeCheck size={10} /> Certified
                </span>
              )}
            </div>

            {hasMultipleImages && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`View image ${i + 1}`}
                    onClick={(e) => goToImage(e, i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === activeIndex ? 'w-3.5 bg-white shadow-sm' : 'w-1.5 bg-white/60 hover:bg-white/80'
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 p-4 md:p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <SellerBadge
                listing={listing}
                dealerName={dealerName}
                dealerAvatar={dealerAvatar}
                dealerLocation={dealerLocation}
                dealerPhone={dealerPhone}
                size="sm"
              />
              {!isSold && (
                <button
                  type="button"
                  onClick={handleSave}
                  className={cn(
                    'p-2 rounded-xl bg-slate-50 hover:bg-white border border-slate-100 transition-all shrink-0',
                    saved ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
                  )}
                >
                  <Heart size={16} className={saved ? 'fill-red-500' : undefined} />
                </button>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 flex-1">
              <div className="min-w-0 flex-1">
                <Link to={`/listings/${listing.id}`}>
                  <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-base md:text-lg leading-tight truncate">
                    {title}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                    <Scale size={12} />
                    <span>{listing.caratWeight || listing.weight} ct</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                    <MapPin size={12} />
                    <span>{listing.origin}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                {!isSold ? (
                  <>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Asking Price</p>
                    <p className="text-lg md:text-xl font-black text-accent tracking-tighter">
                      {formatCurrency(listing.price, listing.currency)}
                    </p>
                  </>
                ) : (
                  <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 uppercase tracking-tighter">
                    Sold
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-50 mt-auto">
              {ownerActions || (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-amber-400">
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">4.9 (24)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {callAction}
                    <button type="button" onClick={handleMessage} className="text-slate-400 hover:text-primary transition-colors">
                      <MessageCircle size={18} />
                    </button>
                    <button type="button" onClick={handleShare} className="text-slate-400 hover:text-primary transition-colors">
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl hover:border-slate-300 transition-all duration-500',
      variant === 'feed' ? 'mb-6' : ''
    )}>
      <div className="p-4 flex items-center justify-between bg-slate-50/50">
        <SellerBadge
          listing={listing}
          dealerName={dealerName}
          dealerAvatar={dealerAvatar}
          dealerLocation={dealerLocation}
          dealerPhone={dealerPhone}
          size={variant === 'feed' ? 'lg' : 'md'}
        />
      </div>

      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {images.map((src, i) => (
            <Link
              key={i}
              to={`/listings/${listing.id}`}
              className="block min-w-full h-full shrink-0"
            >
              <LoadingImage
                src={src}
                alt={`${title} — image ${i + 1}`}
                className={cn(
                  'w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000',
                  isSold && 'grayscale-[0.5] opacity-80'
                )}
              />
            </Link>
          ))}
        </div>

        {hasMultipleImages && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => goToImage(e, (activeIndex - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-md text-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => goToImage(e, (activeIndex + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-md text-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`View image ${i + 1}`}
                  onClick={(e) => goToImage(e, i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === activeIndex ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/60 hover:bg-white/80'
                  )}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute inset-0 pointer-events-none">
          {isSold && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
              <div className="rotate-[-12deg] px-8 py-2 border-4 border-white text-white font-black text-3xl uppercase tracking-[0.2em] shadow-2xl">
                Sold
              </div>
            </div>
          )}
        </div>

        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          {listing.featured && !isSold && (
            <span className="bg-amber-400 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase shadow-lg tracking-widest">Premium</span>
          )}
          {(listing.certification !== 'None' || listing.certificate?.verified) && (
            <span className="bg-primary text-white text-[9px] font-black px-3 py-1 rounded-full uppercase shadow-lg flex items-center gap-1.5 tracking-widest">
              <BadgeCheck size={10} /> Certified
            </span>
          )}
        </div>

        {!isSold && (
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              'absolute bottom-4 right-4 z-10 p-3 bg-white/90 backdrop-blur-md rounded-2xl transition-all shadow-xl active:scale-90',
              saved ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
            )}
          >
            <Heart size={20} className={saved ? 'fill-red-500' : undefined} />
          </button>
        )}
      </div>

      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1 pr-2">
            <Link to={`/listings/${listing.id}`}>
              <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-base md:text-lg leading-tight truncate">
                {title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 md:gap-3 mt-1.5 flex-wrap">
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[8px] md:text-[10px] font-bold text-slate-500">
                <Scale size={10} className="md:w-3 md:h-3" />
                <span>{listing.caratWeight || listing.weight} ct</span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[8px] md:text-[10px] font-bold text-slate-500">
                <MapPin size={10} className="md:w-3 md:h-3" />
                <span>{listing.origin}</span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            {!isSold ? (
              <>
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Asking Price</p>
                <p className="text-base md:text-xl font-black text-accent tracking-tighter">{formatCurrency(listing.price, listing.currency)}</p>
              </>
            ) : (
              <span className="text-[8px] md:text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 uppercase tracking-tighter">Sold</span>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-50">
          {ownerActions || (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="flex text-amber-400">
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">4.9 (24)</span>
              </div>
              <div className="flex items-center gap-3">
                {callAction}
                <button type="button" onClick={handleMessage} className="text-slate-400 hover:text-primary transition-colors">
                  <MessageCircle size={18} />
                </button>
                <button type="button" onClick={handleShare} className="text-slate-400 hover:text-primary transition-colors">
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
