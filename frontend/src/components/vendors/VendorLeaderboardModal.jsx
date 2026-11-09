import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Gem, Loader2, Star, Trophy, X } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { formatCurrency, cn } from '../../lib/utils';
import { resolveAvatar } from '../../constants/sampleImages';
import { LoadingImage } from '../ui/LoadingImage';

function money(value, currency = 'USD') {
  const amount = Number(value || 0);
  if (!amount) return formatCurrency(0, currency);
  if (currency === 'USD' && amount >= 1000) {
    return `$${Math.round(amount).toLocaleString('en-US')}`;
  }
  return formatCurrency(amount, currency);
}

function rankStyle(rank) {
  if (rank === 1) return 'bg-amber-400 text-white';
  if (rank === 2) return 'bg-slate-400 text-white';
  if (rank === 3) return 'bg-amber-700 text-white';
  return 'bg-slate-100 text-slate-600';
}

export function VendorLeaderboardModal({ open, onClose }) {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet('/api/vendors/leaderboard?limit=20')
      .then((data) => {
        if (cancelled) return;
        setDealers(Array.isArray(data?.dealers) ? data.dealers : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Could not load leaderboard');
        setDealers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-leaderboard-title"
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-hidden bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur">
          <div>
            <p id="vendor-leaderboard-title" className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Trophy size={16} className="text-primary" />
              Dealer Leaderboard
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Ranked by rating, gems listed, carat total, sold value, and active inventory value.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="Close leaderboard"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/80">
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200">
              <Star size={10} className="text-amber-400" /> Rating
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200">
              <Gem size={10} className="text-primary" /> Gems
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200">
              Carats
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200">
              Sold
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200">
              Listed value
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-3">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="animate-spin" size={22} />
              <p className="text-xs font-bold uppercase tracking-widest">Loading ranks</p>
            </div>
          )}

          {!loading && error && (
            <p className="py-10 text-center text-sm font-medium text-red-600">{error}</p>
          )}

          {!loading && !error && dealers.length === 0 && (
            <div className="py-16 text-center space-y-2">
              <Award className="mx-auto text-slate-300" size={28} />
              <p className="text-sm font-bold text-slate-500">No dealers to rank yet</p>
            </div>
          )}

          {!loading && !error && dealers.map((dealer) => {
            const name = dealer.companyName || dealer.displayName || 'Dealer';
            const href = `/vendors/${encodeURIComponent(dealer.id || dealer.userId)}`;
            return (
              <Link
                key={dealer.id || dealer.userId || dealer.rank}
                to={href}
                onClick={onClose}
                className="block rounded-2xl border border-slate-100 bg-white hover:border-primary/30 hover:shadow-md transition-all p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                    rankStyle(dealer.rank)
                  )}>
                    {dealer.rank}
                  </div>
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                    <LoadingImage
                      src={resolveAvatar(dealer.logo || dealer.photoURL)}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                          {dealer.location || 'Sri Lanka'}
                          {dealer.verified ? ' · Verified' : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="inline-flex items-center gap-1 text-xs font-black text-slate-900">
                          <Star size={12} className="text-amber-400" fill="currentColor" />
                          {Number(dealer.rating || 0).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {Number(dealer.reviewCount || 0)}{' '}
                          {Number(dealer.reviewCount || 0) === 1 ? 'review' : 'reviews'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Stat label="Gems" value={String(dealer.gemCount || 0)} />
                      <Stat label="Carats" value={`${Number(dealer.gemAmount || 0).toLocaleString('en-US')} ct`} />
                      <Stat label="Sold" value={money(dealer.soldAmount, 'USD')} hint={`${dealer.soldCount || 0} gems`} />
                      <Stat label="Listed" value={money(dealer.listedValue, 'USD')} hint={`${dealer.activeCount || 0} active`} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-xs font-black text-slate-900 mt-0.5 truncate">{value}</p>
      {hint ? <p className="text-[9px] font-bold text-slate-400 mt-0.5">{hint}</p> : null}
    </div>
  );
}
