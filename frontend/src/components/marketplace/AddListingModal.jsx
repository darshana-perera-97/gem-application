import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AddListingForm } from './AddListingForm';

export function AddListingModal({ open, listingId = null, onClose, onSuccess }) {
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-listing-title"
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur">
          <div>
            <p id="add-listing-title" className="text-sm font-black text-slate-900 tracking-tight">
              {listingId ? 'Edit gem listing' : 'List a new gem'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">One detail at a time — then publish to your collection.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 sm:p-6">
          <AddListingForm
            listingId={listingId}
            compact
            onCancel={onClose}
            onSuccess={(saved) => {
              onSuccess?.(saved);
              onClose?.();
            }}
          />
        </div>
      </div>
    </div>
  );
}
