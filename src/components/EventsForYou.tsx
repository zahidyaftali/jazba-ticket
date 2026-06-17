import React, { useState, useEffect } from 'react';
import { Hourglass } from 'lucide-react';
import { EventItem } from '../types';

interface EventsForYouProps {
  events: EventItem[];
  onBook: (event: EventItem) => void;
  onViewDetail?: (event: EventItem) => void;
}

export default function EventsForYou({ events, onBook, onViewDetail }: EventsForYouProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'weekend'>('today');
  
  // Real-time ticking state for the 3 for-you cards
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
          
          if (s > 0) {
            s -= 1;
          } else {
            s = 59;
            if (m > 0) {
              m -= 1;
            } else {
              m = 59;
              if (h > 0) {
                h -= 1;
              } else {
                h = 23; // reset
              }
            }
          }
          next[key] = { h, m, s };
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatWithZero = (val: number) => {
    return val < 10 ? `0${val}` : `${val}`;
  };

  // We have 3 events inside events array belonging specifically to 'for-you'
  const displayEvents = events.filter(e => e.type === 'for-you');

  return (
    <section 
      className="bg-[#C5E85C] border-b border-black/5 py-18 px-4 sm:px-6 md:px-8 relative overflow-hidden"
      id="for-you"
    >
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:12px_12px]"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* HEADER SECTION */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 tracking-tight">
            Curated For You
          </h2>

          {/* TAB BUTTONS CAPSULE */}
          <div className="inline-flex items-center gap-1.5 mt-5 p-1 bg-black/5 rounded-full text-xs font-semibold">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-5 py-2 rounded-full cursor-pointer transition-all duration-300 ${
                activeTab === 'today'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-800 hover:text-black hover:bg-black/5'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setActiveTab('tomorrow')}
              className={`px-5 py-2 rounded-full cursor-pointer transition-all duration-300 ${
                activeTab === 'tomorrow'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-800 hover:text-black hover:bg-black/5'
              }`}
            >
              Tomorrow
            </button>
            <button
              onClick={() => setActiveTab('weekend')}
              className={`px-5 py-2 rounded-full cursor-pointer transition-all duration-300 ${
                activeTab === 'weekend'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-800 hover:text-black hover:bg-black/5'
              }`}
            >
              This Weekend
            </button>
          </div>
        </div>

        {/* EVENTS FOR YOU CARDS LIST */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
          {displayEvents.map((item, index) => {
            const timeData = timers[item.id] || { h: 7, m: 48, s: 39 };
            
            // Adjust details corresponding to activeTab selection slightly to show simulation responsiveness!
            let customizedDate = item.date;
            if (activeTab === 'tomorrow') {
              customizedDate = 'Tomorrow';
            } else if (activeTab === 'weekend') {
              customizedDate = 'This Saturday';
            }

            return (
              <div 
                key={item.id}
                onClick={() => onViewDetail?.(item)}
                className="bg-white border border-neutral-200 hover:border-neutral-300 rounded-2xl p-4.5 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                {/* Image panel */}
                <div>
                  <div className="relative h-44 rounded-xl overflow-hidden border border-neutral-100">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 right-3 bg-neutral-900/90 backdrop-blur-sm text-white px-3 py-1.5 text-[10px] font-bold rounded-full shadow-sm">
                      {customizedDate}
                    </div>
                  </div>

                  {/* Title and details */}
                  <div className="mt-4">
                    <div className="flex items-center gap-1">
                      <span className="font-display font-bold text-[10px] text-[#C23A12] bg-orange-50/50 border border-orange-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">{item.category}</span>
                    </div>

                    <h3 className="font-display font-bold text-base text-neutral-850 mt-2 hover:text-[#E34718] transition-colors">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-neutral-500 text-xs font-medium leading-relaxed">
                      Experience an unforgettable night featuring standard class acts, beautiful scenography, and premium acoustics setups!
                    </p>
                  </div>
                </div>

                {/* THE PRIZE COUNTDOWN COMPONENT BLOCK (MATCHING THE IMAGE) */}
                <div className="mt-5 pt-4.5 border-t border-dashed border-neutral-200">
                  <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-neutral-400 font-bold">
                      <span>Live offer timer:</span>
                      <Hourglass className="w-3.5 h-3.5 text-[#E34718]" />
                    </div>

                    {/* DIGITS DISPLAY CARD */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white border border-neutral-200/60 rounded-lg p-1.5">
                        <span className="block font-display font-black text-lg text-neutral-800">{formatWithZero(timeData.h)}</span>
                        <span className="text-[9px] font-semibold uppercase text-neutral-400">Hours</span>
                      </div>
                      <div className="bg-white border border-neutral-200/60 rounded-lg p-1.5">
                        <span className="block font-display font-black text-lg text-neutral-800">{formatWithZero(timeData.m)}</span>
                        <span className="text-[9px] font-semibold uppercase text-neutral-400">Mins</span>
                      </div>
                      <div className="bg-white border border-neutral-200/60 rounded-lg p-1.5">
                        <span className="block font-display font-black text-lg text-red-500">{formatWithZero(timeData.s)}</span>
                        <span className="text-[9px] font-semibold uppercase text-neutral-400">Secs</span>
                      </div>
                    </div>
                  </div>

                  {/* Checkout/Book Action */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onBook(item); }}
                    className="mt-4.5 w-full bg-neutral-900 hover:bg-neutral-800 text-[#C5E85C] py-3 rounded-full font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    Claim Special Pass (${item.price})
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
