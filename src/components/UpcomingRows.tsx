import React from 'react';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { EventItem } from '../types';

interface UpcomingRowsProps {
  events: EventItem[];
  onBook: (event: EventItem) => void;
  onViewAll: () => void;
  onViewDetail?: (event: EventItem) => void;
}

export default function UpcomingRows({ events, onBook, onViewAll, onViewDetail }: UpcomingRowsProps) {
  // Grab events that belong to 'upcoming'
  const displayEvents = events.filter((e) => e.type === 'upcoming');

  return (
    <section 
      className="bg-[#F8F6F0] border-b border-black/5 py-18 px-4 sm:px-6 md:px-8"
      id="upcoming"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* SECTION HEADER */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-display font-bold text-neutral-900 tracking-tight">
              Upcoming Shows
            </h2>
            <p className="text-[17px] text-neutral-500 mt-2 font-normal">
              Don't miss these upcoming high-demand ticket releases.
            </p>
          </div>
          <button 
            onClick={onViewAll}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-neutral-800 hover:text-black hover:underline cursor-pointer group"
          >
            View All
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#E34718]" />
          </button>
        </div>

        {/* LIST OF ROWS */}
        <div className="space-y-4">
          {displayEvents.map((item, index) => {
            const isFirst = index === 0;

            return (
              <div 
                key={item.id}
                onClick={() => onViewDetail?.(item)}
                className="bg-white border-2 border-neutral-200/60 hover:border-neutral-300/80 rounded-2xl p-4.5 sm:p-5.5 md:p-6 shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 cursor-pointer group/row"
                id={`upcoming-row-${item.id}`}
              >
                {/* DATE SEGMENT (LEFT) */}
                <div className="flex items-center gap-4.5 border-b md:border-b-0 md:border-r border-neutral-100 pb-3 md:pb-0 md:pr-8 shrink-0 min-w-[140px]">
                  <span className="text-3xl sm:text-4xl font-display font-black text-[#E34718] tracking-tight">
                    {item.date}
                  </span>
                  <div className="leading-tight">
                    <span className="block text-[10px] uppercase font-black tracking-widest text-neutral-400">February</span>
                    <span className="text-xs sm:text-sm font-bold text-neutral-500">{item.year || '2025'}</span>
                  </div>
                </div>

                {/* INFO DETAILS SEGMENT (MIDDLE) */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base sm:text-lg text-neutral-800 tracking-tight group-hover/row:text-[#E34718] cursor-pointer transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  
                  {/* METADATA WRAPPERS */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 mt-2.5 text-neutral-500 font-medium text-xs sm:text-[13px]">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{item.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{item.time}</span>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTON SEGMENT (RIGHT) */}
                <div className="shrink-0 flex items-center justify-between md:justify-end gap-5 pt-2.5 md:pt-0 border-t md:border-t-0 border-neutral-50">
                  <div className="md:hidden">
                    <span className="text-[9px] text-neutral-400 font-semibold uppercase block">Ticket Price</span>
                    <span className="font-display font-black text-neutral-900 text-base">${item.price}</span>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); onBook(item); }}
                    className={`px-5.5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      isFirst
                        ? 'bg-neutral-900 hover:bg-neutral-800 text-[#E34718] shadow-sm'
                        : 'bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 shadow-sm'
                    }`}
                  >
                    Buy Tickets
                    <ArrowRight className="w-3 h-3 text-[#E34718]" />
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
