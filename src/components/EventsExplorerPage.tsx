import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Heart,
  X,
  Calendar,
  Clock,
  MapPin,
  Check,
  ArrowRight,
} from 'lucide-react';
import { EventItem, CategoryItem, isPastEvent } from '../types';
import { useLocalCurrency } from '../currency';

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

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const SORT_LABELS = {
  sooner: 'Latest added',
  'price-low': 'Price: low to high',
  'price-high': 'Price: high to low',
  title: 'Name: A–Z',
} as const;

const PRICE_TIERS = [
  { id: 'all', label: 'Any price' },
  { id: 'under-50', label: 'Under $50' },
  { id: '50-100', label: '$50–$100' },
  { id: 'over-100', label: '$100+' },
] as const;

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
  initialDateOffset = null,
}: EventsExplorerPageProps) {
  const { format } = useLocalCurrency();

  // Search
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  // Filters
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

  // Likes (persisted locally)
  const [likedEventIds, setLikedEventIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jazba_liked_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);

  // Sort, view, pagination
  const [sortOption, setSortOption] = useState<keyof typeof SORT_LABELS>('sooner');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Upcoming vs. past split — an event moves to "Past" the day after it happens
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>('upcoming');
  const upcomingCount = useMemo(() => events.filter((e) => !isPastEvent(e)).length, [events]);
  const pastCount = events.length - upcomingCount;
  const [visibleCount, setVisibleCount] = useState<number>(9);

  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = likedEventIds.includes(id)
      ? likedEventIds.filter((item) => item !== id)
      : [...likedEventIds, id];
    setLikedEventIds(updated);
    try {
      localStorage.setItem('jazba_liked_events', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not persist likes to localStorage:', err);
    }
  };

  // Unique cities from event locations
  const availableCities = useMemo(() => {
    const list = new Set<string>();
    events.forEach((e) => {
      if (e.location.toLowerCase().includes('london')) list.add('London');
      else if (e.location.toLowerCase().includes('hamilton')) list.add('Hamilton');
      else {
        const parts = e.location.split('–');
        if (parts.length > 1) list.add(parts[1].trim());
        else list.add('London');
      }
    });
    return ['all', ...Array.from(list)];
  }, [events]);

  // Live counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    categories.forEach((cat) => {
      counts[cat.id] = events.filter((e) => e.category === cat.id).length;
    });
    return counts;
  }, [events, categories]);

  // Filtering + sorting
  const filteredEvents = useMemo(() => {
    let result = events.filter((e) => (timeFilter === 'past') === isPastEvent(e));

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((e) =>
        e.title.toLowerCase().includes(term) ||
        e.location.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term)
      );
    }
    if (selectedCategory !== 'all') result = result.filter((e) => e.category === selectedCategory);
    if (selectedCity !== 'all') result = result.filter((e) => e.location.toLowerCase().includes(selectedCity.toLowerCase()));
    if (priceTier === 'under-50') result = result.filter((e) => e.price < 50);
    else if (priceTier === '50-100') result = result.filter((e) => e.price >= 50 && e.price <= 100);
    else if (priceTier === 'over-100') result = result.filter((e) => e.price > 100);
    if (showOnlyFeatured) result = result.filter((e) => e.featured || e.type === 'top');
    if (showOnlyLiked) result = result.filter((e) => likedEventIds.includes(e.id));

    if (dateOffset !== null) {
      if (dateOffset === 0) result = result.filter((evt) => evt.date.includes('18'));
      else if (dateOffset === 1) result = result.filter((evt) => evt.date.includes('19'));
      else if (dateOffset === 3) result = result.filter((evt) => evt.date.includes('20') || evt.date.includes('21'));
    }

    if (sortOption === 'sooner') result.sort((a, b) => b.id.localeCompare(a.id));
    else if (sortOption === 'price-low') result.sort((a, b) => a.price - b.price);
    else if (sortOption === 'price-high') result.sort((a, b) => b.price - a.price);
    else if (sortOption === 'title') result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [events, timeFilter, searchTerm, selectedCategory, selectedCity, priceTier, showOnlyFeatured, showOnlyLiked, likedEventIds, sortOption, dateOffset]);

  const displayedEvents = useMemo(() => filteredEvents.slice(0, visibleCount), [filteredEvents, visibleCount]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedCity('all');
    setPriceTier('all');
    setDateOffset(null);
    setShowOnlyFeatured(false);
    setShowOnlyLiked(false);
    setSortOption('sooner');
    setVisibleCount(9);
  };

  const resetPage = () => setVisibleCount(9);

  const likeButton = (evt: EventItem, dark = false) => {
    const isLiked = likedEventIds.includes(evt.id);
    return (
      <button
        onClick={(e) => handleToggleLike(evt.id, e)}
        className={`w-10 h-10 flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
          dark
            ? 'bg-white/90 hover:bg-white'
            : 'bg-white border border-[#e4e4e4] hover:border-black'
        }`}
        title={isLiked ? 'Remove from saved' : 'Save event'}
      >
        <Heart className={`w-4 h-4 ${isLiked ? 'fill-black text-black' : 'text-black'}`} />
      </button>
    );
  };

  // Shared filter body (desktop rail + mobile drawer)
  const filterBody = (
    <>
      {/* Saved */}
      <div>
        <span className={`${overline} text-[#666] border-b border-black pb-3 block`}>Saved</span>
        <button
          onClick={() => { setShowOnlyLiked(!showOnlyLiked); resetPage(); }}
          className={`w-full flex items-center justify-between py-3.5 text-sm cursor-pointer text-left transition-colors border-b border-[#f2f2f2] ${
            showOnlyLiked ? 'font-bold text-black' : 'text-[#666] hover:text-black'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Heart className={`w-4 h-4 ${showOnlyLiked ? 'fill-black' : ''}`} />
            Saved events only ({likedEventIds.length})
          </span>
          {showOnlyLiked && <Check className="w-4 h-4" />}
        </button>
      </div>

      {/* Categories */}
      <div>
        <span className={`${overline} text-[#666] border-b border-black pb-3 block`}>Category</span>
        <div className="border-b border-[#f2f2f2]">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); resetPage(); }}
                className={`w-full flex items-center justify-between py-3.5 border-b border-[#f2f2f2] last:border-b-0 text-sm cursor-pointer text-left transition-colors ${
                  isActive ? 'font-bold text-black' : 'text-[#666] hover:text-black'
                }`}
              >
                <span className="truncate pr-2">{cat.name}</span>
                <span className={`text-xs shrink-0 ${isActive ? 'font-bold' : 'text-[#8a8a8a]'}`}>
                  {categoryCounts[cat.id] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cities */}
      <div>
        <span className={`${overline} text-[#666] border-b border-black pb-3 block`}>City</span>
        <div className="border-b border-[#f2f2f2]">
          {availableCities.map((city) => {
            const isActive = selectedCity === city;
            return (
              <button
                key={city}
                onClick={() => { setSelectedCity(city); resetPage(); }}
                className={`w-full flex items-center justify-between py-3.5 border-b border-[#f2f2f2] last:border-b-0 text-sm cursor-pointer text-left transition-colors ${
                  isActive ? 'font-bold text-black' : 'text-[#666] hover:text-black'
                }`}
              >
                <span>{city === 'all' ? 'All cities' : city}</span>
                {isActive && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price */}
      <div>
        <span className={`${overline} text-[#666] border-b border-black pb-3 block`}>Price</span>
        <div className="border-b border-[#f2f2f2]">
          {PRICE_TIERS.map((tier) => {
            const active = priceTier === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => { setPriceTier(tier.id); resetPage(); }}
                className={`w-full flex items-center justify-between py-3.5 border-b border-[#f2f2f2] last:border-b-0 text-sm cursor-pointer text-left transition-colors ${
                  active ? 'font-bold text-black' : 'text-[#666] hover:text-black'
                }`}
              >
                <span>{tier.label}</span>
                {active && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={showOnlyFeatured}
          onChange={(e) => { setShowOnlyFeatured(e.target.checked); resetPage(); }}
          className="w-4 h-4"
        />
        <span className="text-sm font-bold">Featured events only</span>
      </label>

      <button
        onClick={handleClearFilters}
        className="w-full py-3 bg-white text-black border border-black text-sm font-bold cursor-pointer hover:bg-[#f7f7f7] transition-colors"
      >
        Reset filters
      </button>
    </>
  );

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="events-explorer-page">

      {/* ── HERO — black storytelling band ────────────────────── */}
      <section className="bg-black text-white relative overflow-hidden" id="explorer-hero">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
            alt="Live concert crowd"
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-20 sm:py-28 relative z-10">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide text-white/60 bg-white/5 backdrop-blur-md px-3.5 py-1.5">
            <span onClick={onBackToHome} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">Events</span>
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-[56px] leading-[0.95] tracking-tight mt-5 max-w-3xl">
            Every night out,<br />
            <span className="text-[#ffed00]">one place to book it.</span>
          </h1>

          <p className="text-white/70 text-base sm:text-lg mt-6 max-w-2xl leading-relaxed">
            Concerts, theatre, comedy, sport and festivals — real tickets at real prices, with refund protection on every order.
          </p>
        </div>
      </section>

      {/* ── TOOLBAR — search, sort, view ──────────────────────── */}
      <div className="border-b border-[#f2f2f2] sticky top-[60px] bg-white z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a8a]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
              placeholder="Search events, venues, cities…"
              className="w-full bg-white pl-7 pr-8 py-2.5 text-sm text-black placeholder-[#8a8a8a]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#8a8a8a] hover:text-black cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Sort */}
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[#8a8a8a] font-bold hidden sm:inline">Sort</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as keyof typeof SORT_LABELS)}
                className="bg-white text-sm font-bold text-black py-2.5 pr-2 cursor-pointer"
              >
                {(Object.keys(SORT_LABELS) as Array<keyof typeof SORT_LABELS>).map((key) => (
                  <option key={key} value={key}>{SORT_LABELS[key]}</option>
                ))}
              </select>
            </label>

            {/* View switch */}
            <div className="flex border border-[#e4e4e4]">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-10 h-10 flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-[#8a8a8a] hover:text-black'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-10 h-10 flex items-center justify-center cursor-pointer transition-colors ${
                  viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-[#8a8a8a] hover:text-black'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile filter opener */}
            <button
              onClick={() => setIsSidebarOpenMobile(true)}
              className="lg:hidden h-10 px-4 bg-black text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── BODY — filter rail + results ──────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* FILTER RAIL (desktop) */}
          <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-32 space-y-8">
            {filterBody}
          </aside>

          {/* RESULTS */}
          <main className="lg:col-span-9">
            {/* Upcoming / Past switch */}
            <div className="flex border border-black w-fit mb-6">
              {([
                { id: 'upcoming', label: `Upcoming (${upcomingCount})` },
                { id: 'past', label: `Past events (${pastCount})` },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeFilter(t.id)}
                  className={`px-5 py-2.5 text-sm font-bold cursor-pointer transition-colors ${
                    timeFilter === t.id ? 'bg-black text-[#ffed00]' : 'bg-white text-black hover:bg-[#f7f7f7]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6">
              <span className={`${overline} text-[#666]`}>
                {filteredEvents.length} {timeFilter === 'past' ? 'past ' : ''}event{filteredEvents.length !== 1 ? 's' : ''} found
              </span>
              <span className="text-sm text-[#8a8a8a]">
                Showing {displayedEvents.length} of {filteredEvents.length}
              </span>
            </div>

            {/* Empty state */}
            {filteredEvents.length === 0 && (
              <div className="border border-[#e4e4e4] py-20 text-center">
                <h4 className="font-display font-bold text-2xl leading-[0.95]">Nothing matches those filters</h4>
                <p className="text-sm text-[#666] mt-3 max-w-sm mx-auto">
                  Try a different search or widen the price range — or reset everything and browse the full listing.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-6 bg-black text-white px-6 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                >
                  Reset filters
                </button>
              </div>
            )}

            {/* GRID VIEW — photography-first tiles */}
            {viewMode === 'grid' && filteredEvents.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {displayedEvents.map((evt) => (
                    <motion.div
                      key={evt.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => onViewDetail(evt)}
                      className="group cursor-pointer border border-[#e4e4e4] hover:border-black transition-colors flex flex-col"
                    >
                      {/* Full-bleed photo */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-[#f7f7f7]">
                        <img
                          src={evt.image}
                          alt={evt.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 right-3">{likeButton(evt, true)}</div>
                        {(evt.featured || evt.type === 'top') && (
                          <span className={`${overline} absolute bottom-3 left-3 bg-[#ffed00] text-black px-2.5 py-1`}>
                            Featured
                          </span>
                        )}
                      </div>

                      {/* Copy stacked beneath */}
                      <div className="p-5 flex-1 flex flex-col">
                        <span className={`${overline} text-[#8a8a8a]`}>
                          {evt.category} · {evt.fullDate || evt.date}
                        </span>
                        <h3 className="font-display font-bold text-xl leading-[0.95] mt-2 line-clamp-2 group-hover:underline">
                          {evt.title}
                        </h3>

                        <div className="space-y-1.5 mt-3 text-sm text-[#666]">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" /> {evt.time}
                          </span>
                          <span className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 shrink-0" /> {evt.location}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#f2f2f2] mt-4 pt-4">
                          <div>
                            <span className={`${overline} text-[#8a8a8a] block`}>From</span>
                            <span className="font-display font-bold text-lg">{format(evt.price)}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onBook(evt); }}
                            className="bg-black text-white px-5 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                          >
                            Buy tickets
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* LIST VIEW — catalogue rows */}
            {viewMode === 'list' && filteredEvents.length > 0 && (
              <div className="border-t border-[#f2f2f2]">
                <AnimatePresence mode="popLayout">
                  {displayedEvents.map((evt) => (
                    <motion.div
                      key={evt.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => onViewDetail(evt)}
                      className="group flex flex-col sm:flex-row sm:items-center gap-5 py-6 border-b border-[#f2f2f2] cursor-pointer"
                    >
                      <div className="w-full sm:w-44 h-32 overflow-hidden shrink-0 bg-[#f7f7f7] relative">
                        <img
                          src={evt.image}
                          alt={evt.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {(evt.featured || evt.type === 'top') && (
                          <span className={`${overline} absolute bottom-2 left-2 bg-[#ffed00] text-black px-2 py-0.5`}>
                            Featured
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className={`${overline} text-[#8a8a8a]`}>
                          {evt.category} · {evt.fullDate || evt.date} · {evt.time}
                        </span>
                        <h3 className="font-display font-bold text-xl leading-[0.95] mt-1.5 truncate group-hover:underline">
                          {evt.title}
                        </h3>
                        <span className="flex items-center gap-1.5 text-sm text-[#666] mt-2 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0" /> {evt.location}
                        </span>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                        <div className="text-left sm:text-right">
                          <span className={`${overline} text-[#8a8a8a] block`}>From</span>
                          <span className="font-display font-bold text-2xl leading-none">{format(evt.price)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {likeButton(evt)}
                          <button
                            onClick={(e) => { e.stopPropagation(); onBook(evt); }}
                            className="bg-black text-white px-5 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                          >
                            Buy tickets
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Load more */}
            {filteredEvents.length > visibleCount && (
              <div className="text-center mt-12">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="bg-white text-black border border-black px-8 py-4 text-sm font-bold cursor-pointer hover:bg-[#f7f7f7] transition-colors inline-flex items-center gap-2"
                >
                  Show more events <ArrowRight className="w-4 h-4 rotate-90" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ──────────────────────────────── */}
      <AnimatePresence>
        {isSidebarOpenMobile && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpenMobile(false)}
              className="absolute inset-0 bg-black/50"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-full max-w-sm bg-white h-full overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between px-6 h-[60px] border-b border-black shrink-0">
                <span className="font-display font-bold text-lg">Filters</span>
                <button
                  onClick={() => setIsSidebarOpenMobile(false)}
                  className="w-10 h-10 border border-[#e4e4e4] flex items-center justify-center hover:border-black transition-colors cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-8 flex-1">
                {filterBody}
              </div>

              <div className="p-6 border-t border-[#f2f2f2] shrink-0">
                <button
                  onClick={() => setIsSidebarOpenMobile(false)}
                  className="w-full bg-[#ffed00] text-black py-4 text-sm font-bold cursor-pointer hover:bg-[#e6d200] transition-colors"
                >
                  Show {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
