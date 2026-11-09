import React, { useEffect, useState } from 'react';
import { ServerCrash } from 'lucide-react';
import { SERVER_DOWN_MESSAGE, subscribeServerStatus } from '../../lib/api';

export function useServerDown() {
  const [down, setDown] = useState(false);

  useEffect(() => subscribeServerStatus(setDown), []);

  return down;
}

export function ServerDown() {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background px-6" role="alert">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white px-8 py-10 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <ServerCrash size={30} strokeWidth={1.75} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">GemBook</p>
        <h1 className="mt-3 text-2xl font-black text-slate-900">Server is down</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{SERVER_DOWN_MESSAGE}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
