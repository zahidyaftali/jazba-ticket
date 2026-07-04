import React, { useState, useEffect } from 'react';
import { Hourglass, ArrowRight } from 'lucide-react';
import { EventItem } from '../types';

interface EventsForYouProps {
  events: EventItem[];
  onBook: (event: EventItem) => void;
  onViewDetail?: (event: EventItem) => void;
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

export default function EventsForYou({ events, onBook, onViewDetail }: EventsForYouProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'weekend'>('today');

  // Live countdown state for the featured offers
  const [timers, setTimers] = useState<{ [key: string]: { h: number; m: number; s: number } }>({
    'for-you-1': { h: 7, m: 48, s: 39 },
    'for-you-2': { h: 7, m: 49, s: 39 },
    'for-you-3': { h: 11, m: 15, s: 20 },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          let { h, m, s } = next[key];
          if (s > 0) s -= 1;
          else {
            s = 59;
            if (m > 0) m -= 1;
            else {
              m = 59;
              h = h > 0 ? h - 1 : 23;
            }
          }
          next[key] = { h, m, s };
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (val: number) => (val < 10 ? `0${val}` : `${val}`);

  const displayEvents = events.filter((e) => e.type === 'for-you');

  const TABS = [
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'weekend', label: 'This weekend' },
  ] as const;

  return (
    // The home page's single yellow accent band
    <section className="bg-[#ffed00] text-black py-20 px-4 sm:px-6 md:px-8" id="for-you">
      <div className="max-w-7xl mx-auto">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <span className={`${overline} text-black/60`}>Limited-time prices</span>
            <h2 className="font-display font-bold text-3xl md:text-4xl leading-[0.95] tracking-tight mt-2">
              Tonight's best offers
            </h2>
          </div>

          {/* Day switch */}
          <div className="flex border border-black shrink-0 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-bold cursor-pointer transition-colors ${
                  activeTab === tab.id ? 'bg-black text-[#ffed00]' : 'bg-transparent text-black hover:bg-black/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Offer cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayEvents.map((item) => {
            const timeData = timers[item.id] || { h: 7, m: 48, s: 39 };

            let customizedDate = item.date;
            if (activeTab === 'tomorrow') customizedDate = 'Tomorrow';
            else if (activeTab === 'weekend') customizedDate = 'This Saturday';

            return (
              <div
                key={item.id}
                onClick={() => onViewDetail?.(item)}
                className="bg-white border border-black cursor-pointer group flex flex-col"
              >
                {/* Full-bleed photo */}
                <div className="relative h-44 overflow-hidden bg-[#f7f7f7]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <span className={`${overline} absolute bottom-3 left-3 bg-black text-white px-2.5 py-1`}>
                    {customizedDate}
                  </span>
                </div>

                {/* Copy */}
                <div className="p-5 flex-1 flex flex-col">
                  <span className={`${overline} text-[#8a8a8a]`}>{item.category}</span>
                  <h3 className="font-display font-bold text-xl leading-[0.95] mt-1.5 group-hover:underline">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#666] leading-relaxed mt-2">
                    A full live production with premium sound — at a price that won't last the night.
                  </p>

                  {/* Countdown */}
                  <div className="flex items-center justify-between border-t border-[#f2f2f2] mt-5 pt-4">
                    <span className={`${overline} text-[#8a8a8a] flex items-center gap-1.5`}>
                      <Hourglass className="w-3.5 h-3.5" /> Offer ends in
                    </span>
                    <span className="font-display font-bold text-lg tabular-nums">
                      {pad(timeData.h)}:{pad(timeData.m)}:{pad(timeData.s)}
                    </span>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); onBook(item); }}
                    className="mt-4 w-full bg-black text-white py-3.5 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                  >
                    Buy from ${item.price} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
