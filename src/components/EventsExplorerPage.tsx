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
  Ticket,
} from 'lucide-react';
import { EventItem, CategoryItem, isPastEvent, eventFromPrice } from '../types';
import { SaleTag } from './SaleBadge';
import { Region, currencySymbolFor, localAmount, useLocalCurrency } from '../currency';
import { useSavedEvents } from '../savedEvents';
import {
  DATE_FILTERS, DateFilterId, dateFilterFromOffset, dateWindow, eventCities, eventInWindow, eventSortTime,
} from '../eventDates';
import { GlowField } from './Decor';
import { categoryLabel } from '../data';

interface EventsExplorerPageProps {
  events: EventItem[];
  categories: CategoryItem[];
  onBook: (event: EventItem) => void;
  onViewDetail: (event: EventItem) => void;
  onBackToHome: () => void;
  initialCategory?: string;
  initialSearchTerm?: string;
  initialCity?: string;
  initialVenue?: string;
  initialTicketClass?: string;
  initialDateOffset?: number | null;
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const SORT_LABELS = {
  date: 'Date: soonest first',
  'price-low': 'Price: low to high',
  'price-high': 'Price: high to low',
  title: 'Name: A–Z',
} as const;

type PriceTier = 'all' | 'low' | 'mid' | 'high';

// Price bands in the buyer's own currency, on each event's lowest ticket price.
const PRICE_BANDS: Record<Region, [number, number]> = {
  UK: [25, 75],
  US: [30, 100],
  PK: [5000, 15000],
};

function priceTiers(region: Region): Array<{ id: PriceTier; label: string }> {
  const [a, b] = PRICE_BANDS[region];
  const sym = currencySymbolFor(region);
  const n = (v: number) => `${sym}${v.toLocaleString()}`;
  return [
    { id: 'all', label: 'Any price' },
    { id: 'low', label: `Under ${n(a)}` },
    { id: 'mid', label: `${n(a)}–${n(b)}` },
    { id: 'high', label: `${n(b)}+` },
  ];
}

export default function EventsExplorerPage({
  events,
  categories,
  onBook,
  onViewDetail,
  onBackToHome,
  initialCategory = 'all',
  initialSearchTerm = '',
  initialCity = '',
  initialVenue = '',
  initialTicketClass = '',
  initialDateOffset = null,
}: EventsExplorerPageProps) {
  const { formatFrom, region } = useLocalCurrency();

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
  const [selectedCity, setSelectedCity] = useState<string>(initialCity || 'all');
  const [priceTier, setPriceTier] = useState<PriceTier>(() => {
    if (initialTicketClass === 'vip') return 'high';
    if (initialTicketClass === 'gold') return 'mid';
    if (initialTicketClass === 'standard' || initialTicketClass === 'early') return 'low';
    return 'all';
  });
  const [dateFilter, setDateFilter] = useState<DateFilterId | null>(() => dateFilterFromOffset(initialDateOffset));
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Saved events — the same list as the hearts everywhere else
  const { savedIds: likedEventIds, toggleSaved } = useSavedEvents();
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);

  // Sort, view, pagination
  const [sortOption, setSortOption] = useState<keyof typeof SORT_LABELS>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Upcoming vs. past split — an event moves to "Past" the day after it happens
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>('upcoming');
  const upcomingCount = useMemo(() => events.filter((e) => !isPastEvent(e)).length, [events]);
  const pastCount = events.length - upcomingCount;
  const [visibleCount, setVisibleCount] = useState<number>(9);

  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaved(id);
  };

  // Events in the chosen tab (upcoming or past) — counts and cities follow it.
  const tabEvents = useMemo(
    () => events.filter((e) => (timeFilter === 'past') === isPastEvent(e)),
    [events, timeFilter],
  );

  // Cities from the real event locations, busiest first
  const availableCities = useMemo(() => {
    const counts = new Map<string, number>();
    tabEvents.forEach((e) => eventCities(e).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1)));
    const list = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([city]) => city);
    if (selectedCity !== 'all' && !list.includes(selectedCity)) list.unshift(selectedCity);
    return ['all', ...list];
  }, [tabEvents, selectedCity]);

  // Live counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tabEvents.length };
    categories.forEach((cat) => {
      if (cat.id !== 'all') counts[cat.id] = tabEvents.filter((e) => e.category === cat.id).length;
    });
    return counts;
  }, [tabEvents, categories]);

  const tiers = useMemo(() => priceTiers(region), [region]);

  // Filtering + sorting
  const filteredEvents = useMemo(() => {
    let result = tabEvents.slice();

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((e) =>
        [
          e.title, e.location, e.category, e.organizerName,
          ...(e.lineup || []).map((a) => a.name),
          ...(e.shows || []).map((sh) => sh.name),
        ].some((field) => (field || '').toLowerCase().includes(term))
      );
    }
    if (selectedCategory !== 'all') result = result.filter((e) => e.category === selectedCategory);
    if (selectedCity !== 'all') result = result.filter((e) => eventCities(e).includes(selectedCity));
    if (priceTier !== 'all') {
      const [a, b] = PRICE_BANDS[region];
      result = result.filter((e) => {
        const from = eventFromPrice(e);
        if (!(from > 0)) return false; // price not announced yet
        const local = localAmount(from, region);
        return priceTier === 'low' ? local < a : priceTier === 'mid' ? local >= a && local <= b : local > b;
      });
    }
    if (showOnlyFeatured) result = result.filter((e) => e.featured || e.type === 'top');
    if (showOnlyLiked) result = result.filter((e) => likedEventIds.includes(e.id));
    if (dateFilter && timeFilter === 'upcoming') {
      const win = dateWindow(dateFilter);
      result = result.filter((e) => eventInWindow(e, win));
    }

    // Price sorts put "price TBA" last.
    const price = (e: EventItem) => eventFromPrice(e) || Number.MAX_SAFE_INTEGER;
    if (sortOption === 'date') {
      // Upcoming: soonest first. Past: most recent first.
      result.sort((a, b) => (timeFilter === 'past' ? -1 : 1) * (eventSortTime(a) - eventSortTime(b)));
    } else if (sortOption === 'price-low') result.sort((a, b) => price(a) - price(b));
    else if (sortOption === 'price-high') result.sort((a, b) => (eventFromPrice(b) || 0) - (eventFromPrice(a) || 0));
    else if (sortOption === 'title') result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [tabEvents, timeFilter, searchTerm, selectedCategory, selectedCity, priceTier, region, showOnlyFeatured, showOnlyLiked, likedEventIds, sortOption, dateFilter]);

  const displayedEvents = useMemo(() => filteredEvents.slice(0, visibleCount), [filteredEvents, visibleCount]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedCity('all');
    setPriceTier('all');
    setDateFilter(null);
    setShowOnlyFeatured(false);
    setShowOnlyLiked(false);
    setSortOption('date');
    setVisibleCount(9);
  };

  // Chips for the filters in use, each with its own remove button
  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (searchTerm.trim()) activeChips.push({ key: 'q', label: `"${searchTerm.trim()}"`, clear: () => setSearchTerm('') });
  if (dateFilter && timeFilter === 'upcoming') activeChips.push({ key: 'date', label: DATE_FILTERS.find((d) => d.id === dateFilter)?.label || '', clear: () => setDateFilter(null) });
  if (selectedCategory !== 'all') activeChips.push({ key: 'cat', label: categories.find((c) => c.id === selectedCategory)?.name || selectedCategory, clear: () => setSelectedCategory('all') });
  if (selectedCity !== 'all') activeChips.push({ key: 'city', label: selectedCity, clear: () => setSelectedCity('all') });
  if (priceTier !== 'all') activeChips.push({ key: 'price', label: tiers.find((t) => t.id === priceTier)?.label || '', clear: () => setPriceTier('all') });
  if (showOnlyLiked) activeChips.push({ key: 'saved', label: 'Saved', clear: () => setShowOnlyLiked(false) });
  if (showOnlyFeatured) activeChips.push({ key: 'featured', label: 'Featured', clear: () => setShowOnlyFeatured(false) });

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

      {/* When */}
      {timeFilter === 'upcoming' && (
      <div>
        <span className={`${overline} text-[#666] border-b border-black pb-3 block`}>When</span>
        <div className="border-b border-[#f2f2f2]">
          {[{ id: null, label: 'Any date' } as const, ...DATE_FILTERS].map((d) => {
            const active = dateFilter === d.id;
            return (
              <button
                key={d.id || 'any'}
                onClick={() => { setDateFilter(d.id); resetPage(); }}
                className={`w-full flex items-center justify-between py-3.5 border-b border-[#f2f2f2] last:border-b-0 text-sm cursor-pointer text-left transition-colors ${
                  active ? 'font-bold text-black' : 'text-[#666] hover:text-black'
                }`}
              >
                <span>{d.label}</span>
                {active && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>
      )}

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
          {tiers.map((tier) => {
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

      {/* ── HEADER — short and light, so the shows start sooner ── */}
      <section className="relative overflow-hidden bg-[#fbfbf7] border-b border-[#f2f2f2]" id="explorer-hero">
        <GlowField tone="light" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-9 sm:pt-12 sm:pb-12 jz-above">
          <nav className="flex items-center gap-2 text-xs font-bold text-[#8a8a8a]" aria-label="Breadcrumb">
            <span onClick={onBackToHome} className="hover:text-black cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-black">Events</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4">
            <div className="max-w-2xl jz-rise">
              <h1 className="font-display font-bold text-4xl sm:text-5xl leading-[0.95] tracking-tight">What’s on</h1>
              <p className="text-[#555] text-base mt-3 leading-relaxed">
                {upcomingCount > 0
                  ? `${upcomingCount} upcoming ${upcomingCount === 1 ? 'show' : 'shows'} across the UK, Pakistan and beyond. Search by artist, city or date.`
                  : 'New shows are added every week. Have a look at past events, or check back soon.'}
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#444] jz-rise" style={{ animationDelay: '150ms' }}>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> No booking fees</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Secure card payment</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> E-tickets straight away</li>
            </ul>
          </div>
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
              placeholder="Search events, artists, venues, cities…"
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

            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 -mt-2 mb-6">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => { chip.clear(); resetPage(); }}
                    className="inline-flex items-center gap-1.5 bg-black text-white text-xs font-bold px-3 py-2 cursor-pointer hover:bg-neutral-800 transition-colors"
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    {chip.label} <X className="w-3.5 h-3.5" />
                  </button>
                ))}
                {activeChips.length > 1 && (
                  <button onClick={handleClearFilters} className="text-xs font-bold underline cursor-pointer px-1">
                    Clear all
                  </button>
                )}
              </div>
            )}

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
                          {categoryLabel(evt.category)} · {evt.fullDate || evt.date}
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
                            <span className={`${overline} text-[#8a8a8a] block`}>From <SaleTag eventId={evt.id} className="ml-1" /></span>
                            <span className="font-display font-bold text-lg">{formatFrom(eventFromPrice(evt))}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); timeFilter === 'past' ? onViewDetail(evt) : onBook(evt); }}
                            className={`${timeFilter === 'past' ? '' : 'jz-cta'} bg-black text-white px-5 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors flex items-center gap-2`}
                          >
                            {timeFilter !== 'past' && <Ticket className="w-4 h-4 text-[#ffed00] jz-cta-icon" />}
                            {timeFilter === 'past' ? 'View event' : 'Get tickets'}
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
                          {categoryLabel(evt.category)} · {evt.fullDate || evt.date} · {evt.time}
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
                          <span className={`${overline} text-[#8a8a8a] block`}>From <SaleTag eventId={evt.id} className="ml-1" /></span>
                          <span className="font-display font-bold text-2xl leading-none">{formatFrom(eventFromPrice(evt))}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {likeButton(evt)}
                          <button
                            onClick={(e) => { e.stopPropagation(); timeFilter === 'past' ? onViewDetail(evt) : onBook(evt); }}
                            className={`${timeFilter === 'past' ? '' : 'jz-cta'} bg-black text-white px-5 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors flex items-center gap-2`}
                          >
                            {timeFilter !== 'past' && <Ticket className="w-4 h-4 text-[#ffed00] jz-cta-icon" />}
                            {timeFilter === 'past' ? 'View event' : 'Get tickets'}
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
