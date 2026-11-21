import React, { useEffect } from 'react';
import { Copy, MessageCircle, Share2, X } from 'lucide-react';
import { buildShareBody, copyText, nativeShare, whatsappShareUrl } from '../../lib/shareItem';

/**
 * Modal with Copy link · WhatsApp · More (native share / clipboard fallback).
 */
export function ShareSheet({ open, onClose, title, url, message }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const body = buildShareBody({ title, url, message });

  const handleCopy = async () => {
    try {
      await copyText(url);
      onClose?.();
      window.alert('Link copied to clipboard!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsApp = () => {
    window.open(whatsappShareUrl(body), '_blank', 'noopener,noreferrer');
    onClose?.();
  };

  const handleMore = async () => {
    try {
      const shared = await nativeShare({ title, text: message || title, url });
      if (shared) {
        onClose?.();
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        onClose?.();
        return;
      }
      console.log('Native share unavailable:', err);
    }
    try {
      await copyText(url);
      onClose?.();
      window.alert('Link copied to clipboard!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Share"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close share sheet"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md mx-0 sm:mx-4 bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900">Share</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pb-5 space-y-1">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 transition-colors text-left"
          >
            <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Copy size={18} />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900">Copy link</span>
              <span className="block text-[11px] text-slate-500">Copy item URL to clipboard</span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 transition-colors text-left"
          >
            <span className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] shrink-0">
              <MessageCircle size={18} />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900">WhatsApp</span>
              <span className="block text-[11px] text-slate-500">Share via WhatsApp</span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleMore}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 transition-colors text-left"
          >
            <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Share2 size={18} />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900">More…</span>
              <span className="block text-[11px] text-slate-500">
                Messages, Telegram, Mail, and more
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
