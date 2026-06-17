import React, { useState } from 'react';
import { Search, Calendar, Sparkles, MapPin, Ticket as TicketIcon } from 'lucide-react';
import { motion } from 'motion/react';

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

export default function HeroSection({ onSearch, onSelectDateFilter, onSearchSubmit }: HeroSectionProps) {
  const [searchVal, setSearchVal] = useState('');
  const [venueVal, setVenueVal] = useState('');
  const [classVal, setClassVal] = useState('');
  const [activeDateOffset, setActiveDateOffset] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch(e.target.value);
  };

  const selectDate = (offset: number | null) => {
    setActiveDateOffset(offset);
    onSelectDateFilter(offset);
    setShowDatePicker(false);
  };

  const handleSearchSubmit = () => {
    onSearchSubmit({
      query: searchVal,
      venue: venueVal,
      ticketClass: classVal,
      dateOffset: activeDateOffset
    });
  };

  return (
    <section 
      className="relative bg-[#121212] min-h-[700px] h-[100vh] px-4 sm:px-6 md:px-8 border-b border-neutral-900 overflow-visible z-10 flex items-center justify-center"
      id="hero-section"
    >
      {/* DARK MUSIC EVENT BACKGROUND PHOTO WITH GRADIENT OVERLAY */}
      <div className="absolute inset-0 z-0 select-none overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
          alt="Dark music festival event crowd and stage strobe spotlights"
          className="w-full h-full object-cover opacity-35 scale-102"
          referrerPolicy="no-referrer"
        />
        {/* Dark overlay gradient starting from bottom (solid dark transition) to top */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/40" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(252,210,64,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
      </div>

      {/* FLOATING ARTISTIC DRAWINGS (REDEFINED FOR GLASSY THEME) */}
      
      {/* 1. Glass Ticket Illustration (Left-bottom side) */}
      <motion.div 
        animate={{ y: [0, -8, 0], rotate: [-12, -9, -12] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="hidden lg:absolute left-12 bottom-12 w-52 h-26 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center p-3 select-none z-10"
      >
        <div className="border border-dashed border-white/10 w-full h-full rounded-xl flex items-center justify-center relative bg-white/5">
          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#121212] rounded-full border border-white/10"></div>
          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#121212] rounded-full border border-white/10"></div>
          <span className="font-display font-black text-xs tracking-widest text-[#E34718]">PASS TICKET</span>
        </div>
      </motion.div>

      {/* 2. Sleek Tag Label (Left-top side) */}
      <motion.div 
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="hidden md:absolute left-24 top-24 bg-neutral-900/90 border border-neutral-800 backdrop-blur-md px-4 py-2 rounded-full shadow-lg rotate-[-6deg] flex items-center gap-2 z-10"
      >
        <span className="text-[#E34718] text-[10px] font-black tracking-widest bg-[#E34718]/10 px-2 py-0.5 rounded-full">LIVE ACT</span>
        <span className="font-semibold text-xs text-neutral-200">Exclusive VIP Access</span>
      </motion.div>

      {/* 3. Sleek Floating Handheld ticket pass layout (Right side) */}
      <motion.div 
        animate={{ y: [0, -10, 0], rotate: [4, 1, 4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="hidden lg:absolute right-16 bottom-12 w-48 h-48 flex flex-col items-center justify-end z-10"
      >
        <div className="relative w-full h-38 backdrop-blur-md bg-[#E34718]/10 border border-[#E34718]/30 rounded-2xl shadow-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <TicketIcon className="w-7 h-7 text-[#E34718]" />
            <span className="text-[10px] font-mono text-neutral-300 bg-black/40 px-1.5 py-0.5 rounded">#4930-VIP</span>
          </div>
          <div className="space-y-1.5">
            <div className="w-14 h-1.5 bg-[#E34718] rounded-full"></div>
            <div className="w-24 h-1.5 bg-neutral-700 rounded-full"></div>
          </div>
          <div className="absolute -left-3.5 bottom-8 w-6 h-6 bg-[#121212] rounded-full border border-[#E34718]/25"></div>
        </div>
        <div className="absolute -bottom-2 right-6 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-full px-3.5 py-1.5 font-bold text-[11px] shadow-lg">
          Live Stage ♫
        </div>
      </motion.div>

      {/* HERO CONTENT LEFT ALIGNED WITH GLASS SEARCH FORM GRID */}
      <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center justify-between">
        
        {/* LEFT COLUMN: LEFT-ALIGNED HERO TEXT && BUTTONS */}
        <div className="lg:col-span-7 text-left space-y-6 flex flex-col items-start">
          {/* SMALL FLOATING BADGE */}
          <div className="inline-flex items-center gap-1.5 bg-neutral-900/80 backdrop-blur-md border border-neutral-800 text-neutral-200 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-widest uppercase transition-colors shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#E34718] fill-[#E34718]" />
            Matchmaker Tour Live
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight leading-[1.1] max-w-2xl text-white">
            Your Ultimate Event Destination to <span className="text-[#E34718] drop-shadow-[0_2px_10px_rgba(227,71,24,0.15)]">Find, Book &amp; Enjoy!</span>
          </h1>

          <p className="text-neutral-300/90 font-medium text-sm sm:text-base md:text-lg max-w-xl leading-relaxed">
            Explore thousands of handpicked events, from premium stage concerts to high-end executive venues. Secure your authentic passes seamlessly.
          </p>

          {/* TWO CTAs/BUTTONS */}
          <div className="flex flex-wrap gap-4 pt-2">
            <button 
              onClick={() => {
                const el = document.getElementById('discover');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-[#E34718] hover:bg-[#C23A12] text-white font-semibold text-sm px-6 py-3.5 rounded-full transition-all active:scale-95 shadow-lg shadow-[#E34718]/15 flex items-center gap-2 cursor-pointer border border-[#E34718]/10"
            >
              <span>Explore Live Concerts</span>
              <TicketIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('artists');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-neutral-900/80 hover:bg-neutral-900 text-white border border-neutral-800 backdrop-blur-sm font-semibold text-sm px-6 py-3.5 rounded-full transition-all active:scale-95 shadow-lg cursor-pointer"
            >
              Browse Musicians
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: TRANSPARENT GLASS EVENT SEARCH FORM */}
        <div className="lg:col-span-5 w-full max-w-sm mx-auto lg:ml-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E34718]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#E34718]/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#E34718]" />
                <span>Instant Ticket Finder</span>
              </h3>
            </div>

            <div className="space-y-3">
              {/* Search query field */}
              <div className="relative">
                <input 
                  type="text"
                  id="finder-query"
                  value={searchVal}
                  onChange={handleSearchChange}
                  placeholder="Artist, band, event or city..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white font-medium placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#E34718]/50 transition-all font-sans"
                />
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>

              {/* Venue Type Dropdown */}
              <div className="relative">
                <select 
                  className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#E34718]/50 transition-all appearance-none cursor-pointer ${venueVal ? 'text-[#E34718] font-semibold' : 'text-neutral-300'}`}
                  value={venueVal}
                  onChange={(e) => setVenueVal(e.target.value)}
                >
                  <option value="" className="bg-neutral-900 text-neutral-400">Select Venue / Experience...</option>
                  <option value="stadium" className="bg-neutral-900 text-neutral-200">Stadium Arena</option>
                  <option value="theater" className="bg-neutral-900 text-neutral-200">Opera &amp; Theatre</option>
                  <option value="club" className="bg-neutral-900 text-neutral-200">Live Concert Club</option>
                  <option value="festival" className="bg-neutral-900 text-neutral-200">Outdoor Festival Stage</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-400 text-xs">▼</div>
              </div>

              {/* Ticket Class Dropdown */}
              <div className="relative">
                <select 
                  className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#E34718]/50 transition-all appearance-none cursor-pointer ${classVal ? 'text-[#E34718] font-semibold' : 'text-neutral-300'}`}
                  value={classVal}
                  onChange={(e) => setClassVal(e.target.value)}
                >
                  <option value="" className="bg-neutral-900 text-neutral-400">Select Ticket Class...</option>
                  <option value="vip" className="bg-neutral-900 text-neutral-200">VIP Elite / Backstage</option>
                  <option value="gold" className="bg-neutral-900 text-neutral-200">Golden Circle Pass</option>
                  <option value="standard" className="bg-neutral-900 text-neutral-200">Standard Entry Tier</option>
                  <option value="early" className="bg-neutral-900 text-neutral-200">Early Bird Discount</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-400 text-xs">▼</div>
              </div>

              {/* Date Filter selector */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm text-left font-medium focus:outline-none focus:ring-1 focus:ring-[#E34718]/50 transition-all flex items-center justify-between ${activeDateOffset !== null ? 'text-[#E34718] font-bold' : 'text-neutral-300'}`}
                  id="finder-timeline-btn"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#E34718]" />
                    <span>
                      {activeDateOffset === null && "Choose event window..."}
                      {activeDateOffset === 0 && "Today only"}
                      {activeDateOffset === 1 && "Tomorrow"}
                      {activeDateOffset === 3 && "This Weekend"}
                    </span>
                  </span>
                  <span className="text-[10px] bg-white/10 text-neutral-300 group-hover:bg-[#E34718] px-2 py-0.5 rounded uppercase font-bold">
                    {activeDateOffset !== null ? 'Change' : 'Select'}
                  </span>
                </button>

                {/* DATE FILTERS POPUP */}
                {showDatePicker && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-2.5 text-left z-20 space-y-1">
                    <ul className="space-y-0.5">
                      <li>
                        <button 
                          onClick={() => selectDate(null)}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/5 text-neutral-300 flex items-center justify-between"
                        >
                          <span>Anytime / All listings</span>
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => selectDate(0)}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/5 text-neutral-300 flex items-center justify-between"
                        >
                          <span>Today only</span>
                          <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full font-bold">LIVE</span>
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => selectDate(1)}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/5 text-neutral-300"
                        >
                          Tomorrow
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => selectDate(3)}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/5 text-neutral-300"
                        >
                          This Weekend
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Functional Search Submit Button */}
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full mt-2 bg-[#E34718] hover:bg-[#C23A12] text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all active:scale-97 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#E34718]/10 outline-none select-none"
                id="hero-submit-search-btn"
              >
                <Search className="w-3.5 h-3.5 text-white stroke-[3]" />
                <span>Search Events</span>
              </button>
            </div>

            {/* POPULAR TAG QUICK LINKS */}
            <div className="pt-3 border-t border-white/5 flex flex-wrap gap-1.5 text-xs font-medium items-center text-neutral-400">
              <span className="text-[11px] mr-1">Quick tags:</span>
              <button 
                onClick={() => { setSearchVal('Opera'); onSearch('Opera'); }} 
                className="bg-white/5 text-[#E34718] px-2 py-1 rounded-md hover:bg-white/10 transition-all font-semibold"
              >
                Opera limit
              </button>
              <button 
                onClick={() => { setSearchVal('Music'); onSearch('Music'); }} 
                className="bg-white/5 text-[#E34718] px-2 py-1 rounded-md hover:bg-white/10 transition-all font-semibold"
              >
                Coldplay
              </button>
              <button 
                onClick={() => { setSearchVal('London'); onSearch('London'); }} 
                className="bg-white/5 text-[#E34718] px-2 py-1 rounded-md hover:bg-white/10 transition-all font-semibold"
              >
                London
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER CURVE PATTERN */}
      <div className="absolute bottom-0 left-0 right-0 h-10 select-none pointer-events-none opacity-50 z-10">
        <div className="w-full h-full bg-[linear-gradient(180deg,transparent_20%,#121212_100%)]"></div>
      </div>
    </section>
  );
}
