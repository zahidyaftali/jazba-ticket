import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAllArtists, ArtistProfile } from '../services/backendService';
import { 
  Search, 
  MapPin, 
  Star, 
  Heart, 
  X, 
  DollarSign, 
  Calendar, 
  Award, 
  Clock, 
  SlidersHorizontal, 
  CheckCircle2, 
  User, 
  Sliders, 
  Sparkles, 
  LayoutGrid, 
  List, 
  Send, 
  Check, 
  Play, 
  Volume2, 
  Briefcase 
} from 'lucide-react';

// Interfaces for Artist Data
export interface ArtistItem {
  id: string;
  name: string;
  avatar: string;
  category: 'music' | 'theater' | 'sports' | 'conference' | 'exhibition';
  subCategory: string; // e.g. "Classical Soprano", "Electronic Synth", "Freestyle Pro"
  bio: string;
  rating: number;
  totalReviews: number;
  hourlyRate: number;
  location: string;
  availableNow: boolean;
  featured: boolean;
  experienceYears: number;
  recentShows: string[];
  socials: { spotify?: string; youtube?: string; web?: string };
}

interface ArtistsPageProps {
  onBackToHome: () => void;
  onViewShowDetail: (showTitle: string) => void;
  onSelectArtist: (artist: ArtistItem) => void;
}

// Maps a Firestore artist profile (managed via the Admin Hub) onto the richer
// display shape this marketplace page renders.
function mapArtistProfileToItem(p: ArtistProfile): ArtistItem {
  return {
    id: p.id || p.userId,
    name: p.stageName,
    avatar: p.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    category: p.category || 'music',
    subCategory: p.subCategory || p.genres?.[0] || 'Performer',
    bio: p.bio || '',
    rating: p.rating ?? 4.8,
    totalReviews: p.totalReviews ?? 0,
    hourlyRate: p.hourlyRate ?? 0,
    location: p.location || 'United Kingdom',
    availableNow: p.availableNow ?? true,
    featured: p.featured ?? false,
    experienceYears: p.experienceYears ?? 0,
    recentShows: p.recentShows || [],
    socials: {
      spotify: p.socialLinks?.spotify,
      youtube: p.socialLinks?.youtube,
      web: p.socialLinks?.website
    }
  };
}

export default function ArtistsPage({ onBackToHome, onViewShowDetail, onSelectArtist }: ArtistsPageProps) {
  // Live artist roster, loaded from Firestore (managed via the Admin Hub)
  const [artists, setArtists] = useState<ArtistItem[]>([]);

  useEffect(() => {
    getAllArtists().then((profiles) => setArtists(profiles.map(mapArtistProfileToItem)));
  }, []);

  // Filters & layout variables
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [hourlyRateTier, setHourlyRateTier] = useState<'all' | 'under-150' | '150-250' | 'over-250'>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Favorites list saved locally
  const [likedArtistIds, setLikedArtistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jazba_liked_artists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showOnlyLiked, setShowOnlyLiked] = useState(false);

  // Selected artist for the detailed modal drawer
  const [activeArtistDetail, setActiveArtistDetail] = useState<ArtistItem | null>(null);

  // Inquiry Booking form variables
  const [isInquirySubmitted, setIsInquirySubmitted] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryFormData, setInquiryFormData] = useState({
    date: '2026-07-15',
    hours: '3',
    venueType: 'Concert Hall',
    location: 'London Office Studio',
    notes: ''
  });

  // Toggle favorite
  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (likedArtistIds.includes(id)) {
      updated = likedArtistIds.filter(item => item !== id);
    } else {
      updated = [...likedArtistIds, id];
    }
    setLikedArtistIds(updated);
    try {
      localStorage.setItem('jazba_liked_artists', JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
  };

  // Run filtering logic
  const filteredArtists = useMemo(() => {
    return artists.filter(artist => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = artist.name.toLowerCase().includes(query);
        const matchesSub = artist.subCategory.toLowerCase().includes(query);
        const matchesBio = artist.bio.toLowerCase().includes(query);
        if (!matchesName && !matchesSub && !matchesBio) return false;
      }

      // 2. Category
      if (selectedCategory !== 'all' && artist.category !== selectedCategory) {
        return false;
      }

      // 3. Location
      if (selectedLocation !== 'all') {
        if (!artist.location.toLowerCase().includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // 4. Rate Tier
      if (hourlyRateTier === 'under-150' && artist.hourlyRate >= 150) return false;
      if (hourlyRateTier === '150-250' && (artist.hourlyRate < 150 || artist.hourlyRate > 250)) return false;
      if (hourlyRateTier === 'over-250' && artist.hourlyRate <= 250) return false;

      // 5. Availability Status
      if (onlyAvailable && !artist.availableNow) return false;

      // 6. Featured
      if (onlyFeatured && !artist.featured) return false;

      // 7. Liked bookmarks
      if (showOnlyLiked && !likedArtistIds.includes(artist.id)) return false;

      return true;
    });
  }, [artists, searchQuery, selectedCategory, selectedLocation, hourlyRateTier, onlyAvailable, onlyFeatured, showOnlyLiked, likedArtistIds]);

  // Handle inquiry booking action
  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryLoading(true);
    setTimeout(() => {
      setInquiryLoading(false);
      setIsInquirySubmitted(true);
    }, 1200);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLocation('all');
    setHourlyRateTier('all');
    setOnlyAvailable(false);
    setOnlyFeatured(false);
    setShowOnlyLiked(false);
  };

  const categoriesConfig = [
    { id: 'all', name: 'All Superstars' },
    { id: 'music', name: 'Music & Instrumentalists' },
    { id: 'theater', name: 'Theater Act & Vocals' },
    { id: 'sports', name: 'Athletes & Performers' },
    { id: 'conference', name: 'Speakers & Hosts' },
    { id: 'exhibition', name: 'Exhibition Creators' }
  ];

  return (
    <div className="bg-neutral-50 min-h-screen pb-24" id="artists-marketplace-root">
      
      {/* 1. GORGEOUS HERO SECTION - FULL WIDTH (60vh left-aligned, matching the Home Page style) */}
      <section 
        className="relative bg-[#121212] min-h-[420px] h-[60vh] px-4 sm:px-6 md:px-8 border-b border-neutral-900 overflow-visible z-10 flex items-center"
        id="artists-hero"
      >
        {/* DARK MUSIC EVENT BACKGROUND PHOTO WITH GRADIENT OVERLAY */}
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
            alt="Dark music festival event crowd"
            className="w-full h-full object-cover opacity-25 scale-102"
            referrerPolicy="no-referrer"
          />
          {/* Dark overlay gradient starting from bottom to top */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/45" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(252,210,64,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
        </div>

        {/* Left aligned text / No form / No action buttons */}
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
          {/* Path Breadcrumb */}
          <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-wider text-neutral-400 bg-neutral-905 border border-neutral-800 backdrop-blur-md px-3.5 py-1.5 rounded-full">
            <span onClick={onBackToHome} className="hover:text-white hover:underline cursor-pointer transition-colors text-neutral-450">Home</span>
            <span>/</span>
            <span className="text-white">Performers Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight leading-[1.1] max-w-3xl text-white">
            Book Creative <span className="text-[#E34718] drop-shadow-[0_2px_10px_rgba(227,71,24,0.15)]">Industry Masters</span>
          </h1>

          <p className="text-neutral-300 font-medium text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed">
            Connect directly with critically acclaimed operatic singers, instrumental quartets, high-affinity keynote presenters, and athletic street performers of supreme status.
          </p>
        </div>
      </section>

      {/* 2. MAIN CORE CONTENT WRAPPER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-10">

        {/* TOP STATUS LINE / PATHWAY NAVIGATION Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-800">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E34718] inline-block"></span>
            <span>Artists Marketplace Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToHome}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all active:scale-97 cursor-pointer"
            >
              ← Back to Shows
            </button>
            <button
              onClick={handleResetFilters}
              className="bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all active:scale-97 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* BOLD SEARCH BAR & QUICK OPTION TILES */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 mb-8 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for vocalists, instrumentalists, sand designers, strings, keynoters..."
              className="w-full bg-neutral-50 border border-neutral-200 hover:border-neutral-300 focus:border-neutral-400 rounded-2xl pl-11 pr-5 py-3 text-sm font-semibold text-neutral-850 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* VIEW MODE CONTROLLER & TOTAL SAVED TOGGLE */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            
            <button
              onClick={() => {
                setShowOnlyLiked(!showOnlyLiked);
              }}
              className={`flex items-center gap-2.5 px-4.5 py-3 rounded-2xl border transition-all text-xs font-extrabold ${
                showOnlyLiked 
                  ? 'border-neutral-900 bg-red-50 text-neutral-900 shadow-sm' 
                  : 'border-neutral-200/90 hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${showOnlyLiked ? 'text-red-500 fill-red-500' : 'text-neutral-400'}`} />
              <span>Bookmarks: {likedArtistIds.length}</span>
            </button>

            {/* GRID VS LIST SELECTOR */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-1.5 flex items-center">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-400 hover:text-neutral-600'}`}
                title="Grid representation view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-400 hover:text-neutral-600'}`}
                title="Detailed list representation"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CORE GRID: LEFT SIDEBAR FILTERS vs RIGHT GRID LISTINGS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SEARCH SIDEBAR WITH INTUITIVE FILTERS */}
          <aside className="space-y-6">
            
            {/* 1. SELECTION DESK categories */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#C23A12] mb-4.5 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#E34718]" />
                <span>Creative Realm</span>
              </h3>
              <div className="space-y-1.5">
                {categoriesConfig.map(cat => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left group ${
                        isActive 
                          ? 'bg-[#E34718] text-white shadow-xs' 
                          : 'hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {isActive && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. REGION FILTER & HOURLY RATE */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-5">
              
              {/* Location Select */}
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2 block">Region City</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none"
                >
                  <option value="all">All Locations (UK wide)</option>
                  <option value="London">London, UK</option>
                  <option value="Hamilton">Hamilton, UK</option>
                  <option value="Bristol">Bristol, UK</option>
                </select>
              </div>

              {/* Price Tier Select */}
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2.5 block">Booking Rate Tier</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['all', 'under-150', '150-250', 'over-250'] as const).map(tier => {
                    const label = tier === 'all' ? 'All' :
                                  tier === 'under-150' ? '< $150/hr' :
                                  tier === '150-250' ? '$150-$250' : '> $250/hr';
                    const active = hourlyRateTier === tier;
                    return (
                      <button
                        key={tier}
                        onClick={() => setHourlyRateTier(tier)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-black uppercase border-1.5 text-center transition-all ${
                          active 
                            ? 'border-neutral-900 bg-neutral-900 text-white' 
                            : 'border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle checklist checkmarks */}
              <div className="border-t border-neutral-100 pt-4.5 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                    className="rounded border-neutral-300 text-[#E34718] focus:ring-[#E34718] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-neutral-600 group-hover:text-black transition-colors">
                    Instantly Bookable (Available)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={onlyFeatured}
                    onChange={(e) => setOnlyFeatured(e.target.checked)}
                    className="rounded border-neutral-300 text-[#E34718] focus:ring-[#E34718] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-neutral-600 group-hover:text-black transition-colors">
                    Featured/Hot Talents
                  </span>
                </label>
              </div>

            </div>

            {/* DYNAMIC METRIC CALLOUT BOX */}
            <div className="bg-[#E34718]/5 border border-dashed border-[#E34718]/30 rounded-2xl p-5.5 text-center">
              <Sparkles className="w-5 h-5 text-[#C23A12] mx-auto mb-2" />
              <h4 className="text-xs font-black uppercase text-neutral-800">Agency Booking Guarantees</h4>
              <p className="text-[11px] text-neutral-500 font-semibold mt-1.5 leading-relaxed">
                We handle fully escrowed contract processing, premium insurance compliance, and substitution backups so your private show goes pristine!
              </p>
            </div>

          </aside>

          {/* MAIN RESULTS CONTAINER (RIGHT SIDE) */}
          <main className="lg:col-span-3">
            
            <div className="flex items-center justify-between mb-5.5 text-xs font-bold text-neutral-450 uppercase tracking-widest">
              <span>Verified Superstars Localized: {filteredArtists.length}</span>
              <span>Updated live 11:05 am UTC</span>
            </div>

            {/* ARTIST CHANNELS LIST OR GRID VIEWPORT */}
            {filteredArtists.length === 0 ? (
              <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-12 text-center max-w-xl mx-auto my-6">
                <Award className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h4 className="text-lg font-bold text-neutral-800 font-display">No Creators Match Parameters</h4>
                <p className="text-xs text-neutral-400 font-medium max-w-xs mx-auto mt-1 leading-normal">
                  No performer profile is configured under these exact combinations. Clear filters to reload full platform roster.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-5 bg-[#E34718] hover:bg-[#C23A12] text-white px-5 py-2.5 rounded-full text-xs font-black transition-transform active:scale-95 shadow-xs"
                >
                  Reset &amp; Reload Marketplace
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArtists.map(artist => {
                  const isLiked = likedArtistIds.includes(artist.id);
                  return (
                    <motion.div
                      key={artist.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => onSelectArtist(artist)}
                      className="bg-white border border-neutral-200 hover:border-neutral-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group relative"
                    >
                      {/* Header Avatar card segment */}
                      <div className="relative h-48 bg-neutral-100 overflow-hidden shrink-0">
                        <img 
                          src={artist.avatar} 
                          alt={artist.name} 
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                      </div>

                      {/* Profile Details Area */}
                      <div className="p-5 flex-1 flex flex-col justify-between text-left">
                        <div className="space-y-1.5">
                          <h3 className="font-display font-black text-lg text-neutral-900 tracking-tight leading-snug group-hover:text-[#E34718] transition-colors">
                            {artist.name}
                          </h3>

                          <p className="text-xs text-neutral-500 font-medium line-clamp-3 leading-relaxed">
                            {artist.bio}
                          </p>
                        </div>

                        {/* Elegant prominently styled Follow action button */}
                        <div className="mt-4.5 pt-3.5 border-t border-neutral-100">
                          <button
                            onClick={(e) => {
                              handleToggleLike(artist.id, e);
                              onSelectArtist(artist);
                            }}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-97 cursor-pointer flex items-center justify-center gap-1.5 ${
                              isLiked
                                ? 'bg-orange-50 text-[#C23A12] border border-orange-200/50'
                                : 'bg-[#E34718] text-white hover:bg-[#C23A12] shadow-3xs'
                            }`}
                          >
                            <span>{isLiked ? '✓ Following' : 'Follow'}</span>
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </div>
            ) : (
              // Horizontal List formulation matches Explorer design
              <div className="space-y-4">
                {filteredArtists.map(artist => {
                  const isLiked = likedArtistIds.includes(artist.id);
                  return (
                    <motion.div
                      key={artist.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-neutral-200 hover:border-neutral-300 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 hover:shadow-xs cursor-pointer justify-between group"
                      onClick={() => onSelectArtist(artist)}
                    >
                      <div className="w-full sm:w-40 h-32 rounded-2xl overflow-hidden shrink-0 relative bg-neutral-50 border border-neutral-100">
                        <img 
                          src={artist.avatar} 
                          alt={artist.name} 
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Info Center pane */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center py-1 text-left">
                        <h3 className="font-display font-black text-lg text-neutral-900 tracking-tight leading-snug group-hover:text-[#E34718] transition-colors">
                          {artist.name}
                        </h3>

                        <p className="text-xs text-neutral-500 font-medium mt-2 line-clamp-2 leading-relaxed">
                          {artist.bio}
                        </p>
                      </div>

                      {/* Right-most follow button area */}
                      <div className="flex items-center justify-end shrink-0 py-1">
                        <button
                          onClick={(e) => {
                            handleToggleLike(artist.id, e);
                            onSelectArtist(artist);
                          }}
                          className={`w-36 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-97 cursor-pointer flex items-center justify-center gap-1.5 ${
                            isLiked
                              ? 'bg-orange-50 text-[#C23A12] border border-orange-200/50'
                              : 'bg-[#E34718] text-white hover:bg-[#C23A12] shadow-3xs'
                          }`}
                        >
                          <span>{isLiked ? '✓ Following' : 'Follow'}</span>
                        </button>
                      </div>

                    </motion.div>
                  );
                })}
              </div>
            )}

          </main>
        </div>

      </div>

      {/* FULL-SCREEN ARTIST DETAILED PORTFOLIO DRAWER */}
      <AnimatePresence>
        {activeArtistDetail && (
          <div className="fixed inset-0 z-50 flex justify-end">
            
            {/* Backdrop element */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setActiveArtistDetail(null);
                setIsInquirySubmitted(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Showcase Drawer container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35 }}
              className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-6 flex flex-col justify-between"
            >
              {/* Profile Card Header */}
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200/60 mb-6">
                  <div className="flex items-center gap-2 text-xs font-black text-neutral-400 uppercase tracking-widest">
                    <span>Artist Portals</span>
                    <span>/</span>
                    <span className="text-[#E34718]">{activeArtistDetail.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveArtistDetail(null);
                      setIsInquirySubmitted(false);
                    }}
                    className="w-9 h-9 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 text-neutral-500 transition-colors"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Hero profile visual details */}
                <div className="flex items-start gap-4 mb-6">
                  <img 
                    src={activeArtistDetail.avatar} 
                    alt={activeArtistDetail.name} 
                    className="w-18 h-18 rounded-2xl object-cover border border-neutral-200 shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-[10px] bg-[#E34718]/10 text-neutral-800 px-3 py-1 rounded font-black uppercase tracking-wider">
                      {activeArtistDetail.subCategory}
                    </span>
                    <h2 className="font-display font-black text-xl text-neutral-900 mt-2">{activeArtistDetail.name}</h2>
                    <p className="text-xs text-neutral-400 font-bold flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 inline" /> 
                      {activeArtistDetail.location} • {activeArtistDetail.experienceYears} Years Active
                    </p>
                  </div>
                </div>

                {/* Artist stats dashboard overview */}
                <div className="grid grid-cols-3 gap-3 bg-neutral-50 border border-neutral-200/90 rounded-2xl p-4.5 mb-6 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase block">Rating Score</span>
                    <span className="text-base font-black text-neutral-900 flex items-center justify-center gap-1 mt-1">
                      ⭐ {activeArtistDetail.rating}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase block">Hourly Estimation</span>
                    <span className="text-base font-black text-neutral-900 block mt-1">
                      ${activeArtistDetail.hourlyRate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase block">Recent Gigs</span>
                    <span className="text-xs font-black text-[#E34718] block mt-1.5 uppercase">
                      {activeArtistDetail.recentShows.length} Concerts
                    </span>
                  </div>
                </div>

                {/* Full Biography story */}
                <div className="mb-6">
                  <h4 className="text-xs font-black tracking-widest uppercase text-neutral-400 mb-2">Detailed Portfolio Profile</h4>
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed bg-neutral-50/50 p-4 rounded-xl border border-neutral-100">
                    {activeArtistDetail.bio}
                  </p>
                </div>

                {/* Recent platform events listing */}
                <div className="mb-6 space-y-2">
                  <h4 className="text-xs font-black tracking-widest uppercase text-neutral-400">Featured Platform Works</h4>
                  <div className="space-y-2">
                    {activeArtistDetail.recentShows.map((show, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          onViewShowDetail(show);
                          setActiveArtistDetail(null);
                        }}
                        className="p-3.5 bg-white border border-neutral-200 rounded-xl flex items-center justify-between hover:border-neutral-300 hover:bg-neutral-50 cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <Play className="w-3.5 h-3.5 text-[#E34718] fill-[#E34718]" />
                          <span className="text-xs font-bold text-neutral-850 group-hover:underline">{show}</span>
                        </div>
                        <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-black uppercase">
                          Featured Booking
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Inline proposal Inquiry Hire form */}
                <div className="border-t border-neutral-200/60 pt-5 mt-4">
                  <h3 className="text-sm font-black text-[#E34718] flex items-center gap-1.5 lowercase uppercase mb-4 tracking-wider">
                    <Send className="w-4.5 h-4.5 text-[#E34718]" />
                    <span>Inquire Interactive Booking Contract</span>
                  </h3>

                  <AnimatePresence mode="wait">
                    {!isInquirySubmitted ? (
                      <motion.form 
                        key="form"
                        onSubmit={handleInquirySubmit}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-450 uppercase mb-1.5 block">Project Date</label>
                            <input 
                              type="date" 
                              required
                              value={inquiryFormData.date}
                              onChange={(e) => setInquiryFormData(prev => ({ ...prev, date: e.target.value }))}
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-450 uppercase mb-1.5 block">Estimated Hours</label>
                            <input 
                              type="number" 
                              required
                              min="1"
                              max="24"
                              value={inquiryFormData.hours}
                              onChange={(e) => setInquiryFormData(prev => ({ ...prev, hours: e.target.value }))}
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-neutral-450 uppercase mb-1.5 block">Event Venue Type</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Auditorium Hall, Back Garden, Hotel"
                            value={inquiryFormData.venueType}
                            onChange={(e) => setInquiryFormData(prev => ({ ...prev, venueType: e.target.value }))}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold placeholder-neutral-400 text-neutral-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-neutral-450 uppercase mb-1.5 block">Venue Location Specifics</label>
                          <input 
                            type="text" 
                            placeholder="e.g. London Westminster Suite"
                            value={inquiryFormData.location}
                            onChange={(e) => setInquiryFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold placeholder-neutral-400 text-neutral-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-neutral-450 uppercase mb-1.5 block">Special Custom Demands &amp; Songs (Optional)</label>
                          <textarea 
                            rows={2}
                            placeholder="Specify special timing loops or song lists..."
                            value={inquiryFormData.notes}
                            onChange={(e) => setInquiryFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold placeholder-neutral-400 text-neutral-800"
                          />
                        </div>

                        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex justify-between items-center text-xs">
                          <span className="font-bold text-neutral-500">Estimate Guarantee:</span>
                          <span className="font-black text-neutral-950">
                            ${(activeArtistDetail.hourlyRate * Number(inquiryFormData.hours || 1)).toLocaleString()} USD Max
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={inquiryLoading}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-600 text-white hover:text-[#C5E85C] font-black text-xs py-3 rounded-full uppercase tracking-wider shadow-md transition-all active:scale-95"
                        >
                          {inquiryLoading ? 'Verifying Agency Slots...' : 'Submit Booking Inquiry'}
                        </button>
                      </motion.form>
                    ) : (
                      <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center my-2 shadow-xs"
                      >
                        <CheckCircle2 className="w-10 h-10 text-[#E34718] mx-auto mb-2.5" />
                        <h4 className="text-sm font-black text-neutral-900 uppercase">Inquiry Filed Successfully!</h4>
                        <p className="text-[11px] text-neutral-600 font-semibold mt-1.5 leading-relaxed">
                          Your contract draft booking request for <strong>{activeArtistDetail.name}</strong> on {inquiryFormData.date} has been registered securely.
                        </p>
                        <div className="mt-3.5 bg-white border border-orange-100 rounded-lg p-2 font-mono text-xs font-black text-[#E34718] inline-block uppercase tracking-wider">
                          #JT-AGENCY-{Math.floor(Math.random() * 89999 + 10000)}
                        </div>
                        <p className="text-[10px] text-neutral-400 font-bold mt-2.5">
                          Our agency account manager will dispatch premium pricing proposal schedules within 2 hours!
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* Drawer Sticky bottom */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 font-bold">
                <span>Verified Creative Partner ID: {activeArtistDetail.id}</span>
                <span>Secure Escrow Protection</span>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
