import React from 'react';
import { Gem } from 'lucide-react';

export function ScreenLoader() {
  return (
    <div className="screen-loader" role="status" aria-live="polite" aria-label="Loading page">
      <div className="screen-loader__glow" />
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-20 w-20">
          <span className="screen-loader__ring" />
          <span className="screen-loader__ring screen-loader__ring--inner" />
          <span className="absolute inset-0 flex items-center justify-center">
            <Gem className="screen-loader__gem text-primary" size={28} strokeWidth={1.75} />
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.42em] text-slate-500">Loading</p>
          <span className="screen-loader__bar" />
        </div>
      </div>
    </div>
  );
}
