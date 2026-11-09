import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { apiGet } from '../lib/api';
import { useActivity } from '../contexts/ActivityContext';
import { cn } from '../lib/utils';
import { usePageReady } from '../contexts/PageLoadingContext';
import { Seo } from '../components/seo/Seo';
import { PAGE_SEO } from '../lib/seo';

export const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const { rsvps, toggleRsvp } = useActivity();
  const [contentReady, setContentReady] = useState(false);
  usePageReady(contentReady);

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/feed')
      .then((data) => {
        if (!cancelled) setEvents(data.events || []);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!cancelled) setContentReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!contentReady) {
    return <Seo title={PAGE_SEO.events.title} description={PAGE_SEO.events.description} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Seo title={PAGE_SEO.events.title} description={PAGE_SEO.events.description} />
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global Events</h1>
      <div className="space-y-4">
        {events.map((event) => {
          const going = rsvps.includes(event.id);
          return (
            <div key={event.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shrink-0">
                <Calendar size={16} className="text-primary" />
                <span className="text-[10px] font-black text-slate-700">{event.date}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{event.title}</p>
                <p className="text-xs uppercase tracking-wider text-slate-400">{event.type}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleRsvp(event.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider',
                  going ? 'bg-primary text-white' : 'bg-slate-900 text-white'
                )}
              >
                {going ? 'Going' : 'RSVP'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
