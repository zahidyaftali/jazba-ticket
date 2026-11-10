import React from 'react';
import { ArrowRight, MapPin, Ticket } from 'lucide-react';
import { EventItem, eventFromPrice } from '../types';
import { useLocalCurrency } from '../currency';
import { SaleTag } from './SaleBadge';
import { Reveal, TicketShape } from './Decor';
import { categoryLabel } from '../data';

interface EventsForYouProps {
  events: EventItem[];
  onBook: (event: EventItem) => void;
  onViewDetail?: (event: EventItem) => void;
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

/** Shows the Jazba team picked (events marked "for you" in the admin).
 *  Real dates and prices only — no made-up countdowns. */
export default function EventsForYou({ events, onBook, onViewDetail }: EventsForYouProps) {
  const { formatFrom } = useLocalCurrency();
  const picks = events.filter((e) => e.type === 'for-you').slice(0, 3);

  // Nothing picked right now — leave the band out rather than show it empty.
  if (picks.length === 0) return null;

  return (
    <section className="bg-[#ffed00] text-black py-16 sm:py-20 px-4 sm:px-6 md:px-8" id="for-you">
      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-10 max-w-2xl">
          <span className={`${overline} text-black/60 inline-flex items-center gap-2`}>
            <TicketShape className="w-6 h-4 text-black" /> Picked by our team
          </span>
          <h2 className="font-display font-bold text-3xl md:text-4xl leading-[0.95] tracking-tight mt-2">Shows we’d go to</h2>
          <p className="text-sm sm:text-base text-black/70 mt-3">A few events coming up that the Jazba team is excited about.</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {picks.map((item, i) => (
            <React.Fragment key={item.id}>
              <Reveal delay={i * 140}>
                <div onClick={() => onViewDetail?.(item)} className="bg-white border border-black cursor-pointer group flex flex-col h-full">
                  <div className="relative h-48 overflow-hidden bg-[#f7f7f7]">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <span className={`${overline} absolute bottom-3 left-3 bg-black text-white px-2.5 py-1`}>{item.fullDate || item.date}</span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className={`${overline} text-[#8a8a8a]`}>{categoryLabel(item.category)}</span>
                    <h3 className="font-display font-bold text-xl leading-[1.05] mt-1.5 group-hover:underline">{item.title}</h3>
                    <p className="text-sm text-[#666] mt-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{item.location}</span>
                    </p>
                    <div className="flex items-center justify-between border-t border-[#f2f2f2] mt-auto pt-4">
                      <span>
                        <span className={`${overline} text-[#8a8a8a] block`}>
                          From <SaleTag eventId={item.id} className="ml-1" />
                        </span>
                        <span className="font-display font-bold text-lg">{formatFrom(eventFromPrice(item))}</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBook(item);
                        }}
                        className="jz-cta bg-black text-white px-4 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors flex items-center gap-2"
                      >
                        <Ticket className="w-4 h-4 text-[#ffed00] jz-cta-icon" /> Get tickets <ArrowRight className="w-4 h-4 jz-cta-arrow" />
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
