import React from 'react';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { EventItem } from '../types';
import { useLocalCurrency } from '../currency';

interface UpcomingRowsProps {
  events: EventItem[];
  onBook: (event: EventItem) => void;
  onViewAll: () => void;
  onViewDetail?: (event: EventItem) => void;
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

export default function UpcomingRows({ events, onBook, onViewAll, onViewDetail }: UpcomingRowsProps) {
  const displayEvents = events.filter((e) => e.type === 'upcoming');
  const { format } = useLocalCurrency();

  return (
    <section className="bg-[#f7f7f7] py-20 px-4 sm:px-6 md:px-8" id="upcoming">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className={`${overline} text-[#666]`}>On sale soon</span>
            <h2 className="font-display font-bold text-3xl md:text-4xl leading-[0.95] tracking-tight mt-2">
              Upcoming shows
            </h2>
          </div>
          <button
            onClick={onViewAll}
            className="text-sm font-bold underline cursor-pointer shrink-0"
          >
            View all
          </button>
        </div>

        {/* Rows */}
        <div className="bg-white border border-[#e4e4e4]">
          {displayEvents.map((item) => {
            const [day, month] = item.date.split(' ');
            return (
              <div
                key={item.id}
                onClick={() => onViewDetail?.(item)}
                className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8 px-6 py-6 border-b border-[#f2f2f2] last:border-b-0 cursor-pointer group hover:bg-[#f7f7f7]/60 transition-colors"
                id={`upcoming-row-${item.id}`}
              >
                {/* Date block — clear gap before the divider column */}
                <div className="flex items-baseline gap-3 shrink-0 md:w-36">
                  <span className="font-display font-bold text-4xl leading-none">
                    {day || '18'}
                  </span>
                  <span className="leading-tight">
                    <span className={`${overline} text-[#8a8a8a] block`}>{month || 'Feb'}</span>
                    <span className="text-sm font-bold">{item.year || '2026'}</span>
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 md:border-l md:border-[#f2f2f2] md:pl-8">
                  <h3 className="font-display font-bold text-lg sm:text-xl leading-[0.95] truncate group-hover:underline">
                    {item.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 mt-2.5 text-sm text-[#666]">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {item.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" /> {item.time}
                    </span>
                  </div>
                </div>

                {/* Price + action */}
                <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                  <div className="text-left md:text-right">
                    <span className={`${overline} text-[#8a8a8a] block`}>From</span>
                    <span className="font-display font-bold text-xl leading-none">{format(item.price)}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onBook(item); }}
                    className="bg-black text-white px-5 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors flex items-center gap-2"
                  >
                    Buy tickets <ArrowRight className="w-4 h-4" />
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
