import React, { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onSelectDateFilter: (daysOffset: number | null) => void;
  onSearchSubmit: (filters: {
    query: string;
    venue: string;
    ticketClass: string;
    dateOffset: number | null;
  }) => void;
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const DATE_WINDOWS = [
  { offset: null, label: 'Anytime' },
  { offset: 0, label: 'Today' },
  { offset: 1, label: 'Tomorrow' },
  { offset: 3, label: 'Weekend' },
] as const;

export default function HeroSection({ onSearch, onSelectDateFilter, onSearchSubmit }: HeroSectionProps) {
  const [searchVal, setSearchVal] = useState('');
  const [venueVal, setVenueVal] = useState('');
  const [classVal, setClassVal] = useState('');
  const [activeDateOffset, setActiveDateOffset] = useState<number | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch(e.target.value);
  };

  const selectDate = (offset: number | null) => {
    setActiveDateOffset(offset);
    onSelectDateFilter(offset);
  };

  const handleSearchSubmit = () => {
    onSearchSubmit({
      query: searchVal,
      venue: venueVal,
      ticketClass: classVal,
      dateOffset: activeDateOffset,
    });
  };

  return (
    <section className="relative bg-black text-white overflow-hidden" id="hero-section">
      {/* Full-bleed photo, darkened for contrast */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
          alt="Live concert crowd and stage lights"
          className="w-full h-full object-cover opacity-35"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-20 sm:py-28 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        {/* LEFT — headline */}
        <div className="lg:col-span-7">
          <span className={`${overline} text-[#ffed00]`}>10,000+ live events on sale</span>

          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-[56px] leading-[0.95] tracking-tight mt-4 max-w-2xl">
            Live music, theatre &amp; sport — booked in seconds.
          </h1>

          <p className="text-white/70 text-base sm:text-lg mt-6 max-w-xl leading-relaxed">
            Real tickets to the shows you love, and the artists to headline your own. Secure checkout, instant digital passes, refund protection on every order.
          </p>

          <div className="flex flex-wrap gap-3 mt-10">
            <button
              onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#ffed00] text-black font-bold text-sm px-7 py-4 cursor-pointer hover:bg-[#e6d200] transition-colors flex items-center gap-2"
            >
              Find events <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => document.getElementById('artists')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-black text-white border border-white font-bold text-sm px-7 py-4 cursor-pointer hover:bg-white/10 transition-colors"
            >
              Book an artist
            </button>
          </div>
        </div>

        {/* RIGHT — ticket finder panel (surface-deep inset) */}
        <div className="lg:col-span-5 w-full max-w-md lg:ml-auto">
          <div className="bg-[#111111] border border-white/15 p-7">
            <span className={`${overline} text-white/50`}>Ticket finder</span>
            <h3 className="font-display font-bold text-xl mt-2">Find your next night out</h3>

            <div className="mt-6 space-y-5">
              {/* Search */}
              <div>
                <label className={`${overline} text-white/50 block mb-2`} htmlFor="finder-query">What</label>
                <div className="relative">
                  <input
                    type="text"
                    id="finder-query"
                    value={searchVal}
                    onChange={handleSearchChange}
                    placeholder="Artist, event or city"
                    className="w-full bg-transparent text-white placeholder-white/40 pr-8 py-2.5 text-sm"
                  />
                  <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className={`${overline} text-white/50 block mb-2`}>Venue type</label>
                <select
                  value={venueVal}
                  onChange={(e) => setVenueVal(e.target.value)}
                  className="w-full bg-[#111111] text-sm py-2.5 cursor-pointer"
                  style={{ color: venueVal ? '#fff' : 'rgba(255,255,255,0.4)' }}
                >
                  <option value="" className="bg-[#111111] text-white/60">Any venue</option>
                  <option value="stadium" className="bg-[#111111] text-white">Stadium & arena</option>
                  <option value="theater" className="bg-[#111111] text-white">Opera & theatre</option>
                  <option value="club" className="bg-[#111111] text-white">Live club</option>
                  <option value="festival" className="bg-[#111111] text-white">Outdoor festival</option>
                </select>
              </div>

              {/* Ticket class */}
              <div>
                <label className={`${overline} text-white/50 block mb-2`}>Ticket type</label>
                <select
                  value={classVal}
                  onChange={(e) => setClassVal(e.target.value)}
                  className="w-full bg-[#111111] text-sm py-2.5 cursor-pointer"
                  style={{ color: classVal ? '#fff' : 'rgba(255,255,255,0.4)' }}
                >
                  <option value="" className="bg-[#111111] text-white/60">Any ticket</option>
                  <option value="vip" className="bg-[#111111] text-white">VIP & backstage</option>
                  <option value="gold" className="bg-[#111111] text-white">Golden circle</option>
                  <option value="standard" className="bg-[#111111] text-white">Standard entry</option>
                  <option value="early" className="bg-[#111111] text-white">Early bird</option>
                </select>
              </div>

              {/* Date window chips */}
              <div>
                <label className={`${overline} text-white/50 block mb-2`}>When</label>
                <div className="grid grid-cols-4 gap-px bg-white/15 border border-white/15">
                  {DATE_WINDOWS.map((w) => (
                    <button
                      key={w.label}
                      onClick={() => selectDate(w.offset)}
                      className={`py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                        activeDateOffset === w.offset
                          ? 'bg-[#ffed00] text-black'
                          : 'bg-[#111111] text-white/70 hover:text-white'
                      }`}
                      id={w.offset === null ? 'finder-timeline-btn' : undefined}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full bg-white text-black font-bold text-sm py-4 cursor-pointer hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                id="hero-submit-search-btn"
              >
                <Search className="w-4 h-4" /> Search events
              </button>

              {/* Quick tags */}
              <div className="flex flex-wrap items-center gap-2 border-t border-white/15 pt-4 text-xs">
                <span className="text-white/40 font-bold">Popular:</span>
                {['Opera', 'Coldplay', 'London'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setSearchVal(tag); onSearch(tag); }}
                    className="text-white/70 hover:text-[#ffed00] font-bold cursor-pointer transition-colors underline underline-offset-4 decoration-white/30"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
