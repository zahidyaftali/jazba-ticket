import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  Heart, 
  X, 
  Info, 
  Calendar, 
  Clock, 
  MapPin, 
  Tag, 
  DollarSign, 
  ChevronDown, 
  Sparkles,
  Ticket,
  Map,
  Layers,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react';
import { EventItem, CategoryItem } from '../types';

interface EventsExplorerPageProps {
  events: EventItem[];
  categories: CategoryItem[];
  onBook: (event: EventItem) => void;
  onViewDetail: (event: EventItem) => void;
  onBackToHome: () => void;
  initialCategory?: string;
  initialSearchTerm?: string;
  initialVenue?: string;
  initialTicketClass?: string;
  initialDateOffset?: number | null;
}

export default function EventsExplorerPage({
  events,
  categories,
  onBook,
  onViewDetail,
  onBackToHome,
  initialCategory = 'all',
  initialSearchTerm = '',
  initialVenue = '',
  initialTicketClass = '',
  initialDateOffset = null
}: EventsExplorerPageProps) {
  // Search state
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  
  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (initialCategory !== 'all') return initialCategory;
    if (initialVenue === 'theater') return 'theater';
    if (initialVenue === 'festival') return 'festivals';
    if (initialVenue === 'stadium') return 'sports';
    if (initialVenue === 'club') return 'music';
    return 'all';
  });
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [priceTier, setPriceTier] = useState<'all' | 'under-50' | '50-100' | 'over-100'>(() => {
    if (initialTicketClass === 'vip') return 'over-100';
    if (initialTicketClass === 'gold') return '50-100';
    if (initialTicketClass === 'standard' || initialTicketClass === 'early') return 'under-50';
    return 'all';
  });
  const [dateOffset, setDateOffset] = useState<number | null>(initialDateOffset);
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  
  // Favorites / Liked state saved in state
  const [likedEventIds, setLikedEventIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jazba_liked_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showOnlyLiked, setShowOnlyLiked] = useState(false);

  // Sorting state
  const [sortOption, setSortOption] = useState<'sooner' | 'price-low' | 'price-high' | 'title'>('sooner');

  // View state: grid vs list
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination / Load more counter
  const [visibleCount, setVisibleCount] = useState<number>(8);

  // Helper: toggle like
  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (likedEventIds.includes(id)) {
      updated = likedEventIds.filter(item => item !== id);
    } else {
      updated = [...likedEventIds, id];
    }
    setLikedEventIds(updated);
    try {
      localStorage.setItem('jazba_liked_events', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not persist likes to localStorage:', err);
    }
  };

  // Extract unique cities realistically from event locations
  const availableCities = useMemo(() => {
    const list = new Set<string>();
    events.forEach(e => {
      if (e.location.toLowerCase().includes('london')) list.add('London');
      else if (e.location.toLowerCase().includes('hamilton')) list.add('Hamilton');
      else {
        // Fallback or generic location split
        const parts = e.location.split('–');
        if (parts.length > 1) {
          list.add(parts[1].trim());
        } else {
          list.add('London'); // Standard London default
        }
      }
    });
    return ['all', ...Array.from(list)];
  }, [events]);

  // Compute dynamic counts per category in real-time
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    categories.forEach(cat => {
      counts[cat.id] = events.filter(e => e.category === cat.id).length;
    });
    return counts;
  }, [events, categories]);

  // Main filter calculation logic
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // 1. Search Query
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(term) ||
        e.location.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term)
      );
    }

    // 2. Category
    if (selectedCategory !== 'all') {
      result = result.filter(e => e.category === selectedCategory);
    }

    // 3. City
    if (selectedCity !== 'all') {
      result = result.filter(e => e.location.toLowerCase().includes(selectedCity.toLowerCase()));
    }

    // 4. Price Tiers
    if (priceTier === 'under-50') {
      result = result.filter(e => e.price < 50);
    } else if (priceTier === '50-100') {
      result = result.filter(e => e.price >= 50 && e.price <= 100);
    } else if (priceTier === 'over-100') {
      result = result.filter(e => e.price > 100);
    }

    // 5. Featured only checkbox
    if (showOnlyFeatured) {
      result = result.filter(e => e.featured || e.type === 'top');
    }

    // 6. Liked list only
    if (showOnlyLiked) {
      result = result.filter(e => likedEventIds.includes(e.id));
    }

    // 7. Date Offset calculation
    if (dateOffset !== null) {
      if (dateOffset === 0) {
        result = result.filter(evt => evt.date.includes('18'));
      } else if (dateOffset === 1) {
        result = result.filter(evt => evt.date.includes('19'));
      } else if (dateOffset === 3) {
        result = result.filter(evt => evt.date.includes('20') || evt.date.includes('21'));
      }
    }

    // 8. Sort outcome
    if (sortOption === 'sooner') {
      // Simulating times or ids
      result.sort((a, b) => b.id.localeCompare(a.id));
    } else if (sortOption === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [events, searchTerm, selectedCategory, selectedCity, priceTier, showOnlyFeatured, showOnlyLiked, likedEventIds, sortOption, dateOffset]);

  const displayedEvents = useMemo(() => {
    return filteredEvents.slice(0, visibleCount);
  }, [filteredEvents, visibleCount]);

  // Reset all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedCity('all');
    setPriceTier('all');
    setDateOffset(null);
    setShowOnlyFeatured(false);
    setShowOnlyLiked(false);
    setSortOption('sooner');
    setVisibleCount(8);
  };  return (
    <div className="bg-neutral-50 min-h-screen pb-20" id="events-explorer-page">
      
      {/* 1. GORGEOUS HERO SECTION - FULL WIDTH (60vh left-aligned, matching the Home Page style) */}
      <section 
        className="relative bg-[#121212] min-h-[420px] h-[60vh] px-4 sm:px-6 md:px-8   overflow-visible z-10 flex items-center"
        id="explorer-hero"
      >
        {/* DARK MUSIC EVENT BACKGROUND PHOTO WITH GRADIENT OVERLAY */}
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
            alt="Dark music festival event crowd and stage strobe spotlights"
            className="w-full h-full object-cover opacity-25 scale-102"
            referrerPolicy="no-referrer"
          />
          {/* Dark overlay gradient starting from bottom to top */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/45" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(252,210,64,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
        </div>

        {/* Hero Content Wrapper */}
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
          {/* Subtle Path Breadcrumb */}
          <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-wider text-neutral-400 bg-neutral-905   backdrop-blur-md px-3.5 py-1.5 rounded-full">
            <span onClick={onBackToHome} className="hover:text-white hover:underline cursor-pointer transition-colors text-neutral-400">Home</span>
            <span>/</span>
            <span className="text-white">All Events</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight leading-[1.1] max-w-3xl text-white">
            Find Your Next <span className="text-[#E34718] drop-shadow-[0_2px_10px_rgba(227,71,24,0.15)]">Live Experience</span>
          </h1>

          <p className="text-neutral-300 font-medium text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed">
            Browse concerts, theatre, festivals, and more — and book your tickets in just a few clicks.
          </p>
        </div>
      </section>

      {/* 2. CATALOG WRAPPER CONTENT (Contained layout matching the filters & sidebars grid structure) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-10">
        
        {/* CONTROL AND SORT BAR SUMMARY OVERVIEW PANEL */}
        <div className="bg-white   rounded-2xl p-4.5 mb-8 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-grow">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-800 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E34718] inline-block"></span>
              <span>Filter Events</span>
            </div>

            {/* Integrated Sleek Search Bar */}
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setVisibleCount(8);
                }}
                placeholder="Search by title, venue, genre..."
                className="w-full pl-9.5 pr-8 py-2 bg-neutral-50 hover:bg-neutral-100/50   rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E34718] text-neutral-800 transition-all placeholder-neutral-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <button
              onClick={onBackToHome}
              className="bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-black tracking-wider text-sentence px-4 py-2.5 rounded-full transition-all active:scale-97 cursor-pointer"
            >
              ← Back to Home
            </button>
            <button
              onClick={handleClearFilters}
              className="bg-white hover:bg-neutral-50   text-neutral-800 text-[10px] font-black tracking-wider text-sentence px-4 py-2.5 rounded-full transition-all active:scale-97 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: SORTING, SYSTEM VIEWS */}
        <div className="flex flex-wrap items-center justify-end gap-3 pb-4" id="explorer-controls-bar">
          
          {/* SORT SELECT DROPDOWN */}
            <div className="relative group/sort">
              <label className="sr-only">Sort Events</label>
              <div className="flex items-center gap-2 bg-neutral-50 hover:bg-neutral-100   rounded-2xl px-3.5 py-3 text-xs font-bold text-neutral-700 cursor-pointer">
                <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
                <span>Sort: {
                  sortOption === 'sooner' ? 'Latest Added' :
                  sortOption === 'price-low' ? 'Price: Low to High' :
                  sortOption === 'price-high' ? 'Price: High to Low' : 'Name: A-Z'
                }</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 transition-transform group-hover/sort:rotate-180" />
              </div>

              {/* FLOATING DROPDOWN LIST */}
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white   rounded-2xl shadow-xl p-2 z-30 opacity-0 pointer-events-none group-hover/sort:opacity-100 group-hover/sort:pointer-events-auto transition-all duration-200">
                <button
                  onClick={() => setSortOption('sooner')}
                  className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${sortOption === 'sooner' ? 'bg-[#E34718]/10 text-[#C23A12]' : 'hover:bg-neutral-50 text-neutral-600'}`}
                >
                  Latest Added
                </button>
                <button
                  onClick={() => setSortOption('price-low')}
                  className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${sortOption === 'price-low' ? 'bg-[#E34718]/10 text-[#C23A12]' : 'hover:bg-neutral-50 text-neutral-600'}`}
                >
                  Price: Low to High
                </button>
                <button
                  onClick={() => setSortOption('price-high')}
                  className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${sortOption === 'price-high' ? 'bg-[#E34718]/10 text-[#C23A12]' : 'hover:bg-neutral-50 text-neutral-600'}`}
                >
                  Price: High to Low
                </button>
                <button
                  onClick={() => setSortOption('title')}
                  className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${sortOption === 'title' ? 'bg-[#E34718]/10 text-[#C23A12]' : 'hover:bg-neutral-50 text-neutral-600'}`}
                >
                  Name: A-Z
                </button>
              </div>
            </div>

            {/* TOGGLE VIEWMODE: GRID OR LIST */}
            <div className="bg-neutral-50   rounded-2xl p-1 flex items-center">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-400 hover:text-neutral-600'}`}
                title="Grid layout view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-400 hover:text-neutral-600'}`}
                title="Horizontal list view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* MOBILE ONLY SIDEBAR OPENER */}
            <button
              onClick={() => setIsSidebarOpenMobile(true)}
              className="lg:hidden bg-neutral-900   hover:bg-neutral-800 text-[#C5E85C] px-4.5 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

        {/* CORE GRID LAYOUT: FILTER SIDEBAR ON LEFT & RESULT CARDS ON RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* 1. FILTER SIDEBAR (DESKTOP) */}
          <aside className="hidden lg:block space-y-7 sticky top-24">
            
            {/* LIKED / WISHLIST MINI-SECTION PANEL */}
            <div className="bg-white   rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-black text-sentence tracking-widest text-[#C23A12] mb-4.5 flex items-center justify-between">
                <span>Personal Collection</span>
                <span className="bg-[#E34718]/10 text-[#C23A12] px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono">
                  {likedEventIds.length} Saved
                </span>
              </h3>
              <button
                onClick={() => {
                  setShowOnlyLiked(!showOnlyLiked);
                  setVisibleCount(8);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl  transition-all ${
                  showOnlyLiked 
                    ? ' bg-red-50/40 text-neutral-900' 
                    : '  hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Heart className={`w-4 h-4 transition-transform ${showOnlyLiked ? 'text-red-500 fill-red-500 scale-110' : 'text-neutral-400'}`} />
                  <span className="text-xs font-bold">Only Liked Shows</span>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${showOnlyLiked ? 'bg-red-500 animate-pulse' : 'bg-transparent'}`}></div>
              </button>
            </div>

            {/* SECTOR 1: CATEGORIES FILTER PILLS */}
            <div className="bg-white   rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-black text-sentence tracking-widest text-neutral-400 mb-4 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Categories</span>
              </h3>
              
              <div className="space-y-1.5">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  const count = categoryCounts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setVisibleCount(8);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left group ${
                        isActive 
                          ? 'bg-[#E34718] text-white shadow-xs' 
                          : 'hover:bg-neutral-50 text-neutral-700 hover:text-black'
                      }`}
                    >
                      <span className="truncate pr-1.5">{cat.name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold transition-all ${
                        isActive 
                          ? 'bg-neutral-900/10 text-white' 
                          : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200/80 group-hover:text-neutral-800'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTOR 2: CITIES / VENUES REGION */}
            <div className="bg-white   rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-black text-sentence tracking-widest text-neutral-400 mb-4 flex items-center gap-1.5">
                <Map className="w-3.5 h-3.5" />
                <span>Cities &amp; Venues</span>
              </h3>

              <div className="space-y-1.5">
                {availableCities.map((city) => {
                  const isActive = selectedCity === city;
                  return (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setVisibleCount(8);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-sentence tracking-wide text-left ${
                        isActive 
                          ? 'bg-neutral-900 text-white shadow-xs' 
                          : 'hover:bg-neutral-50 text-neutral-700 hover:text-black'
                      }`}
                    >
                      <span>{city === 'all' ? 'All Locations' : city}</span>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#E34718]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTOR 3: PRICE TIERS */}
            <div className="bg-white   rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-black text-sentence tracking-widest text-neutral-400 mb-4 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Price Tiers</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setPriceTier('all'); setVisibleCount(8); }}
                  className={`py-2 rounded-xl text-xs font-bold text-sentence transition-all  text-center select-none ${
                    priceTier === 'all' 
                      ? ' bg-neutral-950 text-white' 
                      : '  text-neutral-700 bg-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => { setPriceTier('under-50'); setVisibleCount(8); }}
                  className={`py-2 rounded-xl text-xs font-bold text-sentence transition-all  text-center select-none ${
                    priceTier === 'under-50' 
                      ? ' bg-neutral-950 text-white' 
                      : '  text-neutral-700 bg-white'
                  }`}
                >
                  &lt; $50
                </button>
                <button
                  onClick={() => { setPriceTier('50-100'); setVisibleCount(8); }}
                  className={`py-2 rounded-xl text-xs font-bold text-sentence transition-all  text-center select-none ${
                    priceTier === '50-100' 
                      ? ' bg-neutral-950 text-white' 
                      : '  text-neutral-700 bg-white'
                  }`}
                >
                  $50 - $100
                </button>
                <button
                  onClick={() => { setPriceTier('over-100'); setVisibleCount(8); }}
                  className={`py-2 rounded-xl text-xs font-bold text-sentence transition-all  text-center select-none ${
                    priceTier === 'over-100' 
                      ? ' bg-neutral-950 text-white' 
                      : '  text-neutral-700 bg-white'
                  }`}
                >
                  &gt; $100
                </button>
              </div>
            </div>

            {/* SECTOR 4: SPECIAL OPTIONS */}
            <div className="bg-white   rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-black text-sentence tracking-widest text-neutral-400 mb-3.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Availability Filters</span>
              </h3>

              <label className="flex items-center gap-2.5 cursor-pointer group py-1.5">
                <input 
                  type="checkbox" 
                  checked={showOnlyFeatured}
                  onChange={(e) => {
                    setShowOnlyFeatured(e.target.checked);
                    setVisibleCount(8);
                  }}
                  className="rounded  text-[#E34718] focus:ring-[#E34718] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-neutral-700 group-hover:text-black transition-colors">
                  Only Featured / Top Shows
                </span>
              </label>
            </div>
            
          </aside>

          {/* 2. RESULTS PART (RIGHT CARD LISTINGS GRID) */}
          <main className="lg:col-span-3">
            
            {/* RESULTS STATISTICS ROW */}
            <div className="flex items-center justify-between mb-6 text-sm font-bold text-[#111c2d]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E34718] animate-pulse"></span>
                <span>Found <strong className="text-neutral-900">{filteredEvents.length}</strong> premium events</span>
              </span>
              <span>Showing {displayedEvents.length} of {filteredEvents.length}</span>
            </div>

            {/* IF EMPTY RESULTS */}
            {filteredEvents.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white    rounded-[32px] p-12 text-center max-w-xl mx-auto my-6 shadow-xs"
              >
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                  <Info className="w-8 h-8" />
                </div>
                <h4 className="font-display font-bold text-xl text-neutral-800 tracking-tight">
                  No Events Found
                </h4>
                <p className="text-xs text-neutral-500 font-medium max-w-sm mx-auto mt-2 leading-relaxed">
                  We couldn't find any events matching your search. Try adjusting your filters or clearing your search term.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-6 bg-[#E34718] hover:bg-[#C23A12] text-white font-black text-xs px-5 py-3 rounded-full transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  Clear All Filters &amp; Reload
                </button>
              </motion.div>
            )}

            {/* RESULT COMPOSITION: GRID FORM */}
            {viewMode === 'grid' && filteredEvents.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {displayedEvents.map((evt) => {
                    const isLiked = likedEventIds.includes(evt.id);
                    return (
                      <motion.div
                        key={evt.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => onViewDetail(evt)}
                        className="group bg-white    rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                      >
                        {/* Image area */}
                        <div className="relative aspect-4/3 overflow-hidden bg-neutral-50">
                          <img 
                            src={evt.image} 
                            alt={evt.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Favorite Top Right Trigger */}
                          <button
                            onClick={(e) => handleToggleLike(evt.id, e)}
                            className="absolute top-3 right-3 w-8.5 h-8.5 rounded-full bg-white/95 hover:bg-white backdrop-blur-xs flex items-center justify-center shadow-sm text-neutral-500 hover:text-red-500 cursor-pointer transition-all active:scale-90"
                          >
                            <Heart className={`w-4 h-4 transition-transform ${isLiked ? 'text-red-500 fill-red-500' : 'text-neutral-500'}`} />
                          </button>

                          {/* Top Left Badge Category */}
                          <span className="absolute top-3 left-3 bg-neutral-900/90 text-white px-3 py-1 text-[10px] font-extrabold text-sentence tracking-widest rounded-full shadow-sm">
                            {evt.category}
                          </span>
                        </div>

                        {/* Title details description content */}
                        <div className="p-5.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-black text-sentence tracking-wider">
                              <Calendar className="w-3 h-3 text-[#E34718]" />
                              <span>{evt.fullDate || evt.date}</span>
                            </div>

                            <h3 className="font-display font-bold text-base text-neutral-850 mt-1.5 group-hover:text-[#E34718] transition-colors leading-tight line-clamp-2">
                              {evt.title}
                            </h3>

                            <div className="mt-3.5 space-y-1.5">
                              <div className="flex items-center gap-2 text-neutral-550 text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                <span className="truncate">{evt.time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-neutral-550 text-[#C23A12] text-xs font-semibold">
                                <MapPin className="w-3.5 h-3.5 text-[#C23A12] shrink-0" />
                                <span className="truncate">{evt.location}</span>
                              </div>
                            </div>
                          </div>

                          {/* CARD PRICE AND PRIMARY ACTION BUTTON */}
                          <div className="mt-6 pt-4   flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-neutral-400 text-sentence tracking-wider block leading-none">Standard Pass</span>
                              <span className="font-display font-black text-neutral-900 text-lg mt-0.5 block">${evt.price}</span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onBook(evt);
                              }}
                              className="bg-neutral-900 hover:bg-neutral-800 text-white hover:text-[#C5E85C] px-4 py-2.5 rounded-full text-xs font-black tracking-wide transition-all duration-150 active:scale-95 shadow-sm cursor-pointer flex items-center gap-1.5"
                            >
                              <span>Claim Pass</span>
                            </button>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* RESULT COMPOSITION: HORIZONTAL LIST FORM */}
            {viewMode === 'list' && filteredEvents.length > 0 && (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {displayedEvents.map((evt) => {
                    const isLiked = likedEventIds.includes(evt.id);
                    return (
                      <motion.div
                        key={evt.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => onViewDetail(evt)}
                        className="bg-white    rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer justify-between group"
                      >
                        {/* List view image segment */}
                        <div className="w-full sm:w-44 h-32 bg-neutral-100 rounded-2xl overflow-hidden shrink-0 relative">
                          <img 
                            src={evt.image} 
                            alt={evt.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute top-2.5 left-2.5 bg-neutral-900/95 text-white px-2.5 py-0.5 text-[9px] font-black text-sentence tracking-widest rounded-full">
                            {evt.category}
                          </span>
                        </div>

                        {/* Middle detailed segment */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex items-center gap-2.5 text-neutral-400 text-[10px] font-extrabold text-sentence tracking-wide">
                              <span className="flex items-center gap-1 text-[#E34718]">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{evt.fullDate || evt.date}</span>
                              </span>
                              <span>•</span>
                              <span>{evt.time}</span>
                            </div>

                            <h3 className="font-display font-bold text-base sm:text-lg text-neutral-850 mt-2 leading-snug group-hover:text-[#E34718] transition-colors truncate">
                              {evt.title}
                            </h3>

                            <p className="mt-1 text-xs text-neutral-500 font-medium truncate flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{evt.location}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            <span className="text-[10px] text-sentence font-black px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-md">
                              Guaranteed Admission
                            </span>
                            <span className="text-[10px] text-sentence font-black px-2.5 py-1 bg-orange-50 text-[#C23A12] rounded-md">
                              Instant Receipt
                            </span>
                          </div>
                        </div>

                        {/* Right side pricing checkout segment */}
                        <div className="  sm:pl-6 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-3 shrink-0 py-1">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-bold text-neutral-400 text-sentence tracking-wider block leading-none">Pass Price</span>
                            <span className="font-display font-black text-2xl text-neutral-900 mt-1 block">${evt.price}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleToggleLike(evt.id, e)}
                              className="w-9 h-9    hover:bg-neutral-50 rounded-full flex items-center justify-center text-neutral-500 hover:text-red-500 cursor-pointer active:scale-95"
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-red-500' : 'text-neutral-500'}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onBook(evt);
                              }}
                              className="bg-neutral-900 hover:bg-neutral-800 text-white hover:text-[#C5E85C] px-5 py-2.5 rounded-full text-xs font-black tracking-wide text-sentence transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              Get Ticket
                            </button>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* PAGINATION / LOAD MORE */}
            {filteredEvents.length > visibleCount && (
              <div className="text-center mt-10">
                <button
                  onClick={() => setVisibleCount(prev => prev + 6)}
                  className="bg-white hover:bg-neutral-50   text-neutral-900 text-xs font-black text-sentence tracking-wider px-7 py-3.5 rounded-full shadow-xs hover:shadow-sm active:scale-95 cursor-pointer transition-all inline-flex items-center gap-2"
                >
                  <span>Load More Events</span>
                  <span>↓</span>
                </button>
              </div>
            )}

          </main>
        </div>

      </div>

      {/* MOBILE FILTER DRAWER OVERLAY */}
      <AnimatePresence>
        {isSidebarOpenMobile && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpenMobile(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            {/* Drawer Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4   mb-6 font-display font-bold">
                  <h2 className="font-display font-extrabold text-[#C23A12] flex items-center gap-1.5 text-sentence text-sm tracking-widest">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters &amp; Tags
                  </h2>
                  <button
                    onClick={() => setIsSidebarOpenMobile(false)}
                    className="w-8 h-8 rounded-full   flex items-center justify-center hover:bg-neutral-50 text-neutral-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-6">

                  {/* LIKED TOGGLE */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-sentence tracking-widest text-[#C23A12] block">Saved Collection</span>
                    <button
                      onClick={() => {
                        setShowOnlyLiked(!showOnlyLiked);
                        setVisibleCount(8);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl  transition-all ${
                        showOnlyLiked 
                          ? ' bg-red-50/40 text-neutral-900' 
                          : ' text-neutral-700 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Heart className={`w-4 h-4 ${showOnlyLiked ? 'text-red-500 fill-red-500' : 'text-neutral-400'}`} />
                        <span className="text-xs font-bold">Only Liked Shows ({likedEventIds.length})</span>
                      </div>
                    </button>
                  </div>

                  {/* CATEGORIES */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-sentence tracking-widest text-[#111c2d] block">Categories</span>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((cat) => {
                        const isActive = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setVisibleCount(8);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              isActive 
                                ? 'bg-[#E34718] text-white' 
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CITIES */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-sentence tracking-widest text-neutral-400 block">Cities</span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableCities.map((city) => {
                        const isActive = selectedCity === city;
                        return (
                          <button
                            key={city}
                            onClick={() => {
                              setSelectedCity(city);
                              setVisibleCount(8);
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold text-sentence transition-all ${
                              isActive 
                                ? 'bg-neutral-900 text-white' 
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                          >
                            {city === 'all' ? 'All Locations' : city}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PRICE TIER */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-sentence tracking-widest text-neutral-400 block">Price Filters</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setPriceTier('all'); setVisibleCount(8); }}
                        className={`py-2 rounded-xl text-xs font-bold text-sentence  ${
                          priceTier === 'all' ? ' bg-neutral-950 text-white' : ' text-neutral-600 bg-white'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => { setPriceTier('under-50'); setVisibleCount(8); }}
                        className={`py-2 rounded-xl text-xs font-bold text-sentence  ${
                          priceTier === 'under-50' ? ' bg-neutral-950 text-white' : ' text-neutral-600 bg-white'
                        }`}
                      >
                        &lt; $50
                      </button>
                      <button
                        onClick={() => { setPriceTier('50-100'); setVisibleCount(8); }}
                        className={`py-2 rounded-xl text-xs font-bold text-sentence  ${
                          priceTier === '50-100' ? ' bg-neutral-950 text-white' : ' text-neutral-600 bg-white'
                        }`}
                      >
                        $50 - $100
                      </button>
                      <button
                        onClick={() => { setPriceTier('over-100'); setVisibleCount(8); }}
                        className={`py-2 rounded-xl text-xs font-bold text-sentence  ${
                          priceTier === 'over-100' ? ' bg-neutral-950 text-white' : ' text-neutral-600 bg-white'
                        }`}
                      >
                        &gt; $100
                      </button>
                    </div>
                  </div>

                  {/* AVAILABILITY */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-black text-sentence tracking-widest text-[#111c2d] block">Availability</span>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showOnlyFeatured}
                        onChange={(e) => {
                          setShowOnlyFeatured(e.target.checked);
                          setVisibleCount(8);
                        }}
                        className="rounded  text-[#E34718] focus:ring-[#E34718]"
                      />
                      <span className="text-xs font-bold text-neutral-700">
                        Top Featured Shows Only
                      </span>
                    </label>
                  </div>

                </div>
              </div>

              {/* DRAWERS FOOTER */}
              <div className="pt-6   space-y-2">
                <button
                  onClick={() => setIsSidebarOpenMobile(false)}
                  className="w-full bg-[#E34718] hover:bg-[#C23A12] text-white font-black text-xs py-3 rounded-full text-sentence transition-all shadow-xs"
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => {
                    handleClearFilters();
                    setIsSidebarOpenMobile(false);
                  }}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-full text-sentence transition-all"
                >
                  Clear All
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
