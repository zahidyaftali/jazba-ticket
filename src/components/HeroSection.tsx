import React, { useMemo, useState } from 'react';
import { Search, ArrowRight, MapPin, ShieldCheck, Smartphone, BadgePoundSterling } from 'lucide-react';
import { EventItem, isPastEvent } from '../types';
import { eventCities } from '../eventDates';
import { GlowField, TicketShape } from './Decor';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onSelectDateFilter: (daysOffset: number | null) => void;
  onSearchSubmit: (filters: {
    query: string;
    venue: string;
    ticketClass: string;
    dateOffset: number | null;
    city?: string;
  }) => void;
  onBookArtist?: () => void;
  /** Live events — the city list and quick links come from these. */
  events?: EventItem[];
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const DATE_WINDOWS = [
  { offset: null, label: 'Any time' },
  { offset: 0, label: 'Today' },
  { offset: 1, label: 'Tomorrow' },
  { offset: 3, label: 'Weekend' },
] as const;

export default function HeroSection({ onSearch, onSelectDateFilter, onSearchSubmit, onBookArtist, events = [] }: HeroSectionProps) {
  const [searchVal, setSearchVal] = useState('');
  const [cityVal, setCityVal] = useState('');
  const [activeDateOffset, setActiveDateOffset] = useState<number | null>(null);

  // Cities with shows coming up, busiest first.
  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    events.filter((e) => !isPastEvent(e)).forEach((e) => eventCities(e).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
  }, [events]);

  const submit = (query = searchVal, city = cityVal) =>
    onSearchSubmit({ query, venue: '', ticketClass: '', dateOffset: activeDateOffset, city });

  return (
    <section className="relative bg-black text-white overflow-hidden" id="hero-section">
      {/* Photo, darkened, with slow warm glows over it */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
          alt=""
          className="w-full h-full object-cover opacity-30"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35" />
      </div>
      <GlowField tone="dark" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-14 pb-16 sm:py-24 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

        {/* LEFT — headline */}
        <div className="lg:col-span-7">
          <span className={`${overline} text-[#ffed00] jz-rise inline-flex items-center gap-2`}>
            <TicketShape className="w-6 h-4 text-[#ffed00]" /> Live events in the UK, Pakistan &amp; beyond
          </span>

          <h1 className="font-display font-bold text-[40px] sm:text-5xl md:text-[60px] leading-[0.95] tracking-tight mt-5 max-w-2xl jz-rise" style={{ animationDelay: '120ms' }}>
            Your next great night out, <span className="text-[#ffed00]">booked in a minute.</span>
          </h1>

          <p className="text-white/70 text-base sm:text-lg mt-6 max-w-xl leading-relaxed jz-rise" style={{ animationDelay: '240ms' }}>
            Concerts, qawwali nights, comedy and festivals. Pay securely, get your e-ticket straight away, and walk in with the QR code on your phone.
          </p>

          <div className="flex flex-wrap gap-3 mt-9 jz-rise" style={{ animationDelay: '360ms' }}>
            <button
              onClick={() => document.getElementById('top-events')?.scrollIntoView({ behavior: 'smooth' })}
              className="jz-cta bg-[#ffed00] text-black font-bold text-sm px-7 py-4 cursor-pointer hover:bg-[#e6d200] transition-colors flex items-center gap-2"
            >
              Browse events <ArrowRight className="w-4 h-4 jz-cta-arrow" />
            </button>
            <button
              onClick={() => onBookArtist?.()}
              className="bg-white/5 text-white border border-white/60 font-bold text-sm px-7 py-4 cursor-pointer hover:bg-white/10 hover:border-white transition-colors"
            >
              Book an artist
            </button>
          </div>

          {/* What buyers care about, said plainly */}
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mt-10 text-sm text-white/75 jz-rise" style={{ animationDelay: '480ms' }}>
            <li className="flex items-center gap-2.5"><BadgePoundSterling className="w-4 h-4 text-[#ffed00] shrink-0" /> No hidden fees</li>
            <li className="flex items-center gap-2.5"><ShieldCheck className="w-4 h-4 text-[#ffed00] shrink-0" /> Secure card payment</li>
            <li className="flex items-center gap-2.5"><Smartphone className="w-4 h-4 text-[#ffed00] shrink-0" /> Tickets on your phone</li>
          </ul>
        </div>

        {/* RIGHT — ticket finder on frosted glass */}
        <div className="lg:col-span-5 w-full max-w-md lg:ml-auto jz-rise" style={{ animationDelay: '300ms' }}>
          <form
            className="jz-glass-dark p-6 sm:p-7"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <span className={`${overline} text-white/55`}>Find tickets</span>
            <h3 className="font-display font-bold text-xl mt-2">What are you in the mood for?</h3>

            <div className="mt-6 space-y-5">
              <div>
                <label className={`${overline} text-white/55 block mb-2`} htmlFor="finder-query">Artist, event or venue</label>
                <div className="relative">
                  <input
                    type="text"
                    id="finder-query"
                    value={searchVal}
                    onChange={(e) => {
                      setSearchVal(e.target.value);
                      onSearch(e.target.value);
                    }}
                    placeholder="e.g. Asim Azhar"
                    className="w-full bg-transparent text-white placeholder-white/40 pr-8 py-2.5 text-base sm:text-sm"
                    enterKeyHint="search"
                  />
                  <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                </div>
              </div>

              <div>
                <label className={`${overline} text-white/55 block mb-2`} htmlFor="finder-city">Where</label>
                <div className="relative">
                  <select
                    id="finder-city"
                    value={cityVal}
                    onChange={(e) => setCityVal(e.target.value)}
                    className="w-full bg-transparent text-base sm:text-sm py-2.5 pr-8 cursor-pointer appearance-none"
                    style={{ color: cityVal ? '#fff' : 'rgba(255,255,255,0.45)' }}
                  >
                    <option value="" className="bg-[#111111] text-white">Any city</option>
                    {cities.map((c) => (
                      <option key={c} value={c} className="bg-[#111111] text-white">{c}</option>
                    ))}
                  </select>
                  <MapPin className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>
              </div>

              <div>
                <span className={`${overline} text-white/55 block mb-2`}>When</span>
                <div className="grid grid-cols-4 gap-px bg-white/15 border border-white/15">
                  {DATE_WINDOWS.map((w) => (
                    <button
                      key={w.label}
                      type="button"
                      onClick={() => {
                        setActiveDateOffset(w.offset);
                        onSelectDateFilter(w.offset);
                      }}
                      aria-pressed={activeDateOffset === w.offset}
                      className={`py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                        activeDateOffset === w.offset ? 'bg-[#ffed00] text-black' : 'bg-black/40 text-white/75 hover:text-white'
                      }`}
                      id={w.offset === null ? 'finder-timeline-btn' : undefined}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="jz-cta w-full bg-[#ffed00] text-black font-bold text-sm py-4 cursor-pointer hover:bg-[#e6d200] transition-colors flex items-center justify-center gap-2"
                id="hero-submit-search-btn"
              >
                <Search className="w-4 h-4 jz-cta-icon" /> Search events
              </button>

              {cities.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-white/15 pt-4 text-xs">
                  <span className="text-white/45 font-bold">Shows in:</span>
                  {cities.slice(0, 4).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => submit('', city)}
                      className="text-white/75 hover:text-[#ffed00] font-bold cursor-pointer transition-colors underline underline-offset-4 decoration-white/30"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
