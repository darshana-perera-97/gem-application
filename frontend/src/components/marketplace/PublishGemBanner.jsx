import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Phone, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveAvatar, resolveGem } from '../../constants/sampleImages';
import { LoadingImage } from '../ui/LoadingImage';
import { cn, formatCurrency } from '../../lib/utils';
import { useAddListing } from '../../contexts/AddListingContext';

const ROTATE_MS = 20000;
const SLIDE_MS = 900;

function collectGemSlides(listings = []) {
  const slides = [];
  const seen = new Set();

  listings.forEach((listing) => {
    if (!listing?.id || seen.has(listing.id)) return;
    const images = Array.isArray(listing.images) ? listing.images : [];
    const image = resolveGem(images.find(Boolean) || '');
    if (!image) return;
    seen.add(listing.id);

    const ownerName = listing.vendor?.displayName || listing.vendor?.companyName || 'Seller';
    slides.push({
      id: listing.id,
      image,
      title: listing.title || `${listing.variety || ''} ${listing.type || ''}`.trim() || 'Marketplace gem',
      price: listing.price != null ? formatCurrency(listing.price, listing.currency) : null,
      ownerName,
      ownerPhone: listing.vendor?.phone || '',
      ownerAvatar: resolveAvatar(listing.vendor?.photoURL || listing.vendor?.logo),
    });
  });

  return slides;
}

export const PublishGemBanner = ({ listings = [], className }) => {
  const { openAddListing } = useAddListing();
  const slides = useMemo(() => collectGemSlides(listings), [listings]);
  const trackSlides = useMemo(
    () => (slides.length > 1 ? [...slides, slides[0]] : slides),
    [slides]
  );
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const resetting = useRef(false);
  const hasSlides = slides.length > 0;
  const logicalIndex = slides.length ? index % slides.length : 0;
  const active = hasSlides ? slides[logicalIndex] : null;

  useEffect(() => {
    setIndex(0);
    setAnimate(true);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return undefined;
    const timer = window.setInterval(() => {
      setAnimate(true);
      setIndex((current) => current + 1);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  const handleTransitionEnd = () => {
    if (slides.length < 2 || resetting.current) return;
    if (index < slides.length) return;
    resetting.current = true;
    setAnimate(false);
    setIndex(0);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resetting.current = false;
        setAnimate(true);
      });
    });
  };

  const go = (event, delta) => {
    event.preventDefault();
    event.stopPropagation();
    if (slides.length < 2) return;
    setAnimate(true);
    if (delta < 0) {
      if (index === 0) {
        resetting.current = true;
        setAnimate(false);
        setIndex(slides.length);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            resetting.current = false;
            setAnimate(true);
            setIndex(slides.length - 1);
          });
        });
        return;
      }
      setIndex((current) => current - 1);
      return;
    }
    setIndex((current) => current + 1);
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => openAddListing()}
        className={cn(
          'relative block w-full text-left bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:border-primary/30 hover:shadow-md active:scale-[0.99] transition-all group',
          className
        )}
      >
        <div className="flex flex-col md:flex-row min-h-[140px] md:h-48">
          <div className="w-full md:w-1/3 bg-slate-900 relative h-28 md:h-auto overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-secondary/30 to-slate-900" />
            <div className="h-full flex items-center justify-center relative">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
              <div className="absolute flex flex-col items-center text-white text-center gap-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/15 border border-white/30 flex items-center justify-center group-hover:bg-primary/40 transition-colors">
                  <Plus size={22} className="text-white" />
                </div>
                <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest opacity-80">
                  Your Spotlight
                </span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-2/3 p-4 md:p-6 flex flex-col justify-center gap-3">
            <div className="min-w-0">
              <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight">Publish Your Gem</h2>
              <p className="text-[10px] md:text-sm text-slate-500">
                List a stone and join the gems featured across the marketplace.
              </p>
            </div>
            <span className="w-full md:w-auto md:self-start inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 md:py-2.5 rounded-2xl font-black text-sm shadow-lg shadow-primary/25 group-hover:bg-primary/90 transition-colors">
              <Plus size={18} />
              Publish Gem
            </span>
          </div>
        </div>
      </button>
    );
  }

  const trackStyle = {
    width: `${trackSlides.length * 100}%`,
    transform: `translateX(-${index * (100 / trackSlides.length)}%)`,
    transition: animate ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
  };

  return (
    <div
      className={cn(
        'relative block w-full bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:border-primary/30 hover:shadow-md transition-all group',
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="flex flex-col md:flex-row min-h-[140px] md:h-48">
        <div className="w-full md:w-1/3 bg-slate-900 relative h-28 md:h-auto overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-secondary/30 to-slate-900" />
          <div
            className="absolute inset-0 flex will-change-transform"
            style={trackStyle}
            onTransitionEnd={handleTransitionEnd}
          >
            {trackSlides.map((slide, slideIndex) => (
              <div
                key={`${slide.id}-${slideIndex}`}
                className="relative h-full shrink-0 overflow-hidden"
                style={{ width: `${100 / trackSlides.length}%` }}
              >
                <LoadingImage
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-70 scale-[1.03]"
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none overflow-hidden">
            <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest opacity-80">
              Marketplace
            </span>
            <div className="relative h-4 md:h-5 mt-0.5">
              {slides.map((slide, slideIndex) => (
                <p
                  key={slide.id}
                  className={cn(
                    'absolute inset-x-0 text-[10px] md:text-xs font-bold line-clamp-1 transition-all duration-700 ease-out',
                    slideIndex === logicalIndex
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-1.5 pointer-events-none'
                  )}
                >
                  {slide.title}
                </p>
              ))}
            </div>
          </div>
          {slides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous gem"
                onClick={(event) => go(event, -1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                aria-label="Next gem"
                onClick={(event) => go(event, 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronRight size={14} />
              </button>
              <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                {slides.slice(0, 8).map((slide, slideIndex) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Show gem ${slideIndex + 1}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setAnimate(true);
                      setIndex(slideIndex);
                    }}
                    className={cn(
                      'h-1 rounded-full transition-all duration-500 ease-out',
                      slideIndex === logicalIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-full md:w-2/3 relative p-4 md:p-6 overflow-hidden">
          <div className="relative h-full min-h-[7.5rem] md:min-h-0">
            {slides.map((slide, slideIndex) => {
              const isActive = slideIndex === logicalIndex;
              return (
                <div
                  key={slide.id}
                  aria-hidden={!isActive}
                  className={cn(
                    'flex flex-col justify-center gap-3 transition-opacity duration-500 ease-out',
                    isActive
                      ? 'relative opacity-100'
                      : 'absolute inset-0 opacity-0 pointer-events-none'
                  )}
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight line-clamp-1">
                        {slide.title}
                      </h2>
                      <div className="mt-2 flex flex-col gap-0.5 min-w-0">
                        <p className="text-xs md:text-sm font-bold text-slate-800 truncate">{slide.ownerName}</p>
                        {slide.ownerPhone && (
                          <p className="inline-flex items-center gap-1 text-[10px] md:text-xs font-medium text-slate-500 truncate">
                            <Phone size={12} className="shrink-0 text-slate-400" />
                            {slide.ownerPhone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 w-[4.125rem] h-[4.125rem] md:w-[5.25rem] md:h-[5.25rem] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                      <LoadingImage
                        src={slide.ownerAvatar}
                        alt={slide.ownerName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {slide.price ? (
                      <div className="min-w-0">
                        <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Asking Price
                        </p>
                        <p className="text-lg md:text-2xl font-black text-accent tracking-tighter truncate">
                          {slide.price}
                        </p>
                      </div>
                    ) : (
                      <span />
                    )}
                    <Link
                      to={`/listings/${slide.id}`}
                      tabIndex={isActive ? 0 : -1}
                      className="shrink-0 inline-flex items-center justify-center bg-primary text-white px-4 md:px-6 py-2.5 rounded-full font-black text-[10px] md:text-sm hover:scale-105 transition-all shadow-lg shadow-primary/20"
                    >
                      View Gem
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
