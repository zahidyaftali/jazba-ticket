import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { getAllArtists, ArtistProfile, followTarget, unfollowTarget, getFollowingIds } from '../services/backendService';
import { auth } from '../firebase';
import { useLocalCurrency } from '../currency';
import {
  Search,
  MapPin,
  Heart,
  X,
  Check,
  LayoutGrid,
  List,
  ArrowRight,
} from 'lucide-react';

// Interfaces for Artist Data
export interface ArtistItem {
  id: string;
  name: string;
  avatar: string;
  category: 'music' | 'theater' | 'sports' | 'conference' | 'exhibition';
  subCategory: string;
  bio: string;
  rating: number;
  totalReviews: number;
  hourlyRate: number; // flat fee per event
  location: string;
  availableNow: boolean;
  featured: boolean;
  experienceYears: number;
  recentShows: string[];
  pastShows: { title: string; date: string; venue: string }[];
  eventsHosted: number;
  totalAudience: string;
  socials: { spotify?: string; youtube?: string; web?: string };
}

interface ArtistsPageProps {
  onBackToHome: () => void;
  onViewShowDetail: (showTitle: string) => void;
  onSelectArtist: (artist: ArtistItem) => void;
  onRequireLogin: () => void;
}

// Maps a Firestore artist profile (managed via the Admin Hub) onto the
// display shape this marketplace page renders.
export function mapArtistProfileToItem(p: ArtistProfile): ArtistItem {
  return {
    id: p.id || p.userId,
    name: p.stageName,
    avatar: p.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    category: p.category || 'music',
    subCategory: p.subCategory || p.genres?.[0] || 'Performer',
    bio: p.bio || '',
    rating: p.rating ?? 0,
    totalReviews: p.totalReviews ?? 0,
    hourlyRate: p.hourlyRate ?? 0,
    location: p.location || 'United Kingdom',
    availableNow: p.availableNow ?? true,
    featured: p.featured ?? false,
    experienceYears: p.experienceYears ?? 0,
    recentShows: p.recentShows || [],
    pastShows: p.pastShows || [],
    eventsHosted: p.eventsHosted ?? 0,
    totalAudience: p.totalAudience || '',
    socials: {
      spotify: p.socialLinks?.spotify,
      youtube: p.socialLinks?.youtube,
      web: p.socialLinks?.website,
    },
  };
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const CATEGORIES = [
  { id: 'all', name: 'All artists' },
  { id: 'music', name: 'Musicians & bands' },
  { id: 'theater', name: 'Theatre & vocal' },
  { id: 'sports', name: 'Sports performers' },
  { id: 'conference', name: 'Speakers & hosts' },
  { id: 'exhibition', name: 'Exhibition artists' },
];

const FEE_TIERS = [
  { id: 'all', label: 'Any budget' },
  { id: 'under-150', label: 'Under $150' },
  { id: '150-250', label: '$150–$250' },
  { id: 'over-250', label: '$250+' },
] as const;

export default function ArtistsPage({ onBackToHome, onViewShowDetail, onSelectArtist, onRequireLogin }: ArtistsPageProps) {
  const { format } = useLocalCurrency();
  // Live artist roster from Firestore
  const [artists, setArtists] = useState<ArtistItem[]>([]);

  useEffect(() => {
    getAllArtists().then((profiles) => setArtists(profiles.map(mapArtistProfileToItem)));
  }, []);

  // Filters & layout
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [feeTier, setFeeTier] = useState<'all' | 'under-150' | '150-250' | 'over-250'>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);

  // Artists this user follows (Firestore)
  const [likedArtistIds, setLikedArtistIds] = useState<string[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLikedArtistIds([]);
      return;
    }
    getFollowingIds(user.uid, 'artist').then((ids) => setLikedArtistIds(Array.from(ids)));
  }, []);

  // Follow toggle — requires auth, persists to Firestore
  const handleToggleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      onRequireLogin();
      return;
    }
    const alreadyLiked = likedArtistIds.includes(id);
    try {
      if (alreadyLiked) {
        await unfollowTarget(user.uid, 'artist', id);
        setLikedArtistIds((prev) => prev.filter((item) => item !== id));
      } else {
        await followTarget(user.uid, 'artist', id);
        setLikedArtistIds((prev) => [...prev, id]);
      }
    } catch (err) {
      console.error('Error updating follow state', err);
    }
  };

  // Filtering
  const filteredArtists = useMemo(() => {
    return artists.filter((artist) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !artist.name.toLowerCase().includes(q) &&
          !artist.subCategory.toLowerCase().includes(q) &&
          !artist.bio.toLowerCase().includes(q)
        ) return false;
      }
      if (selectedCategory !== 'all' && artist.category !== selectedCategory) return false;
      if (selectedLocation !== 'all' && !artist.location.toLowerCase().includes(selectedLocation.toLowerCase())) return false;
      if (feeTier === 'under-150' && artist.hourlyRate >= 150) return false;
      if (feeTier === '150-250' && (artist.hourlyRate < 150 || artist.hourlyRate > 250)) return false;
      if (feeTier === 'over-250' && artist.hourlyRate <= 250) return false;
      if (onlyAvailable && !artist.availableNow) return false;
      if (onlyFeatured && !artist.featured) return false;
      if (showOnlyLiked && !likedArtistIds.includes(artist.id)) return false;
      return true;
    });
  }, [artists, searchQuery, selectedCategory, selectedLocation, feeTier, onlyAvailable, onlyFeatured, showOnlyLiked, likedArtistIds]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLocation('all');
    setFeeTier('all');
    setOnlyAvailable(false);
    setOnlyFeatured(false);
    setShowOnlyLiked(false);
  };

  const followButton = (artist: ArtistItem, fullWidth = false) => {
    const isLiked = likedArtistIds.includes(artist.id);
    return (
      <button
        onClick={(e) => handleToggleLike(artist.id, e)}
        className={`${fullWidth ? 'w-full' : 'px-6'} py-3 text-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 ${
          isLiked
            ? 'bg-white text-black border border-black hover:bg-[#f7f7f7]'
            : 'bg-black text-white hover:bg-neutral-800'
        }`}
      >
        {isLiked ? (<><Check className="w-4 h-4" /> Following</>) : 'Follow'}
      </button>
    );
  };

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="artists-marketplace-root">

      {/* ── HERO — black storytelling band ────────────────────── */}
      <section className="bg-black text-white relative overflow-hidden" id="artists-hero">
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
            <span className="text-white">Artists</span>
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-[56px] leading-[0.95] tracking-tight mt-5 max-w-3xl">
            Book the artist.<br />
            <span className="text-[#ffed00]">Own the night.</span>
          </h1>

          <p className="text-white/70 text-base sm:text-lg mt-6 max-w-2xl leading-relaxed">
            Verified musicians, bands, DJs, comedians and speakers — one flat fee per event, contracts and payment handled by us.
          </p>
        </div>
      </section>

      {/* ── TOOLBAR — search + view switch ────────────────────── */}
      <div className="border-b border-[#f2f2f2] sticky top-[60px] bg-white z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a8a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artists, bands, DJs, speakers…"
              className="w-full bg-white pl-7 pr-8 py-2.5 text-sm text-black placeholder-[#8a8a8a]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#8a8a8a] hover:text-black cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowOnlyLiked(!showOnlyLiked)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold cursor-pointer transition-colors border ${
                showOnlyLiked
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-[#e4e4e4] hover:border-black'
              }`}
            >
              <Heart className={`w-4 h-4 ${showOnlyLiked ? 'fill-[#ffed00] text-[#ffed00]' : ''}`} />
              Following ({likedArtistIds.length})
            </button>

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
          </div>
        </div>
      </div>

      {/* ── BODY — filter rail + results ──────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* FILTER RAIL */}
          <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-8">

            {/* Category */}
            <div>
              <span className={`${overline} text-[#666] border-b border-black pb-3 block`}>Category</span>
              <div className="border-b border-[#f2f2f2]">
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between py-3.5 border-b border-[#f2f2f2] last:border-b-0 text-sm cursor-pointer text-left transition-colors ${
                        isActive ? 'font-bold text-black' : 'text-[#666] hover:text-black'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {isActive && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div>
              <span className={`${overline} text-[#666] border-b border-black pb-3 block`}>Location</span>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-white px-0 py-3 text-sm text-black cursor-pointer"
              >
                <option value="all">Anywhere</option>
                <option value="London">London, UK</option>
                <option value="Hamilton">Hamilton, UK</option>
                <option value="Bristol">Bristol, UK</option>
              </select>
            </div>

            {/* Fee per event */}
            <div>
              <span className={`${overline} text-[#666] border-b border-black pb-3 block`}>Fee per event</span>
              <div className="border-b border-[#f2f2f2]">
                {FEE_TIERS.map((tier) => {
                  const active = feeTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setFeeTier(tier.id)}
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

            {/* Toggles */}
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-bold">Available now</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyFeatured}
                  onChange={(e) => setOnlyFeatured(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-bold">Featured only</span>
              </label>
            </div>

            <button
              onClick={handleResetFilters}
              className="w-full py-3 bg-white text-black border border-black text-sm font-bold cursor-pointer hover:bg-[#f7f7f7] transition-colors"
            >
              Reset filters
            </button>

            {/* Promise tile — the page's yellow moment */}
            <div className="bg-[#ffed00] text-black p-6">
              <span className={`${overline} text-black/60`}>How it works</span>
              <h4 className="font-display font-bold text-lg leading-[0.95] mt-2">One flat fee per event</h4>
              <p className="text-sm text-black/70 mt-2 leading-relaxed">
                No hourly meters. We hold payment in escrow and release it after the show — fair for you, fair for the artist.
              </p>
            </div>
          </aside>

          {/* RESULTS */}
          <main className="lg:col-span-9">
            <div className={`${overline} text-[#666] mb-6`}>
              {filteredArtists.length} artist{filteredArtists.length !== 1 ? 's' : ''} found
            </div>

            {filteredArtists.length === 0 ? (
              <div className="border border-[#e4e4e4] py-20 text-center">
                <h4 className="font-display font-bold text-2xl leading-[0.95]">No artists match those filters</h4>
                <p className="text-sm text-[#666] mt-3 max-w-sm mx-auto">
                  Try widening your budget or switching category — or reset everything and browse the full roster.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-6 bg-black text-white px-6 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                >
                  Reset filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredArtists.map((artist) => (
                  <motion.div
                    key={artist.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => onSelectArtist(artist)}
                    className="group cursor-pointer border border-[#e4e4e4] hover:border-black transition-colors flex flex-col"
                  >
                    {/* Photography-first tile */}
                    <div className="relative h-52 bg-[#f7f7f7] overflow-hidden shrink-0">
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {artist.featured && (
                        <span className={`${overline} absolute bottom-3 left-3 bg-[#ffed00] text-black px-2.5 py-1`}>
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Copy stacked beneath */}
                    <div className="p-5 flex-1 flex flex-col">
                      <span className={`${overline} text-[#8a8a8a]`}>{artist.subCategory}</span>
                      <h3 className="font-display font-bold text-xl leading-[0.95] mt-1.5 group-hover:underline">
                        {artist.name}
                      </h3>
                      <span className="flex items-center gap-1.5 text-sm text-[#666] mt-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {artist.location}
                      </span>

                      <div className="flex items-center justify-between border-t border-[#f2f2f2] mt-4 pt-4">
                        <div>
                          <span className={`${overline} text-[#8a8a8a] block`}>From</span>
                          <span className="font-display font-bold text-lg">{format(artist.hourlyRate)}<span className="text-xs font-normal text-[#8a8a8a]"> / event</span></span>
                        </div>
                        {followButton(artist)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="border-t border-[#f2f2f2]">
                {filteredArtists.map((artist) => (
                  <motion.div
                    key={artist.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => onSelectArtist(artist)}
                    className="group flex flex-col sm:flex-row sm:items-center gap-5 py-6 border-b border-[#f2f2f2] cursor-pointer"
                  >
                    <div className="w-full sm:w-36 h-28 overflow-hidden shrink-0 bg-[#f7f7f7]">
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={`${overline} text-[#8a8a8a]`}>{artist.subCategory}</span>
                      <h3 className="font-display font-bold text-xl leading-[0.95] mt-1 group-hover:underline">
                        {artist.name}
                      </h3>
                      <p className="text-sm text-[#666] mt-2 line-clamp-2 leading-relaxed max-w-xl">
                        {artist.bio}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                      <span className="font-display font-bold text-lg">
                        {format(artist.hourlyRate)}<span className="text-xs font-normal text-[#8a8a8a]"> / event</span>
                      </span>
                      {followButton(artist)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Bottom CTA band */}
            <div className="bg-black text-white p-8 sm:p-10 mt-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h3 className="font-display font-bold text-2xl sm:text-3xl leading-[0.95]">
                  Are you a performer?
                </h3>
                <p className="text-white/70 text-sm mt-3 max-w-md">
                  Join the roster, set your own per-event fee, and get booked by organisers across the UK.
                </p>
              </div>
              <button
                onClick={onRequireLogin}
                className="shrink-0 bg-[#ffed00] text-black px-7 py-4 text-sm font-bold cursor-pointer hover:bg-[#e6d200] transition-colors flex items-center gap-2"
              >
                Apply as an artist <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
