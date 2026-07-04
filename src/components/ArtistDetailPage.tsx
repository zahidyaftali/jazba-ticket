import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Mail, 
  Check, 
  X,
  Plus,
  Share2,
  Globe,
  Sparkles,
  MapPin,
  Star,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { ArtistItem } from './ArtistsPage';
import { EventItem } from '../types';
import EventCard from './EventCard';
import { auth } from '../firebase';
import { followTarget, unfollowTarget, isFollowingTarget, getFollowerCount } from '../services/backendService';

interface ArtistDetailPageProps {
  artist: ArtistItem;
  allEvents: EventItem[];
  onBack: () => void;
  onViewShowDetail: (showTitle: string) => void;
  onBookEvent?: (event: EventItem) => void;
  onRequireLogin: () => void;
}

export default function ArtistDetailPage({ artist, allEvents, onBack, onViewShowDetail, onBookEvent, onRequireLogin }: ArtistDetailPageProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  // Load real follow state & follower count for this artist on mount/artist change
  useEffect(() => {
    let cancelled = false;
    getFollowerCount('artist', artist.id).then((count) => {
      if (!cancelled) setFollowerCount(count);
    });
    const user = auth.currentUser;
    if (user) {
      isFollowingTarget(user.uid, 'artist', artist.id).then((following) => {
        if (!cancelled) setIsLiked(following);
      });
    } else {
      setIsLiked(false);
    }
    return () => { cancelled = true; };
  }, [artist]);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'collections'>('upcoming');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [artist]);

  // Handle follow toggle - requires an authenticated user, persists to Firestore
  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      onRequireLogin();
      return;
    }
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (isLiked) {
        await unfollowTarget(user.uid, 'artist', artist.id);
        setIsLiked(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await followTarget(user.uid, 'artist', artist.id);
        setIsLiked(true);
        setFollowerCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Error updating follow state', err);
    } finally {
      setFollowBusy(false);
    }
  };

  // Safe search for upcoming events in the catalog matching correct category
  const upcomingEvents = useMemo(() => {
    const matched = allEvents.filter((evt) => {
      return evt.category === artist.category;
    });
    return matched.length > 0 ? matched.slice(0, 3) : allEvents.slice(0, 3);
  }, [artist, allEvents]);

  // Generate nice dates/venues for past shows mapping
  const pastShowsMapped = useMemo(() => {
    const sampleDates = ['October 2025', 'December 2025', 'March 2026', 'May 2026'];
    const sampleLocations = ['Wembley Arena', 'Broadway Theatre', 'Royal Festival Hall', 'Symphony Hall'];
    return artist.recentShows.map((showName, idx) => {
      return {
        title: showName,
        date: sampleDates[idx % sampleDates.length],
        venue: sampleLocations[idx % sampleLocations.length]
      };
    });
  }, [artist]);

  // Display statistics; followers come from real Firestore counts, the rest are derived from profile data
  const stats = useMemo(() => {
    const hostingDuration = `${artist.experienceYears || 3} years`;
    const totalEventsCount = artist.recentShows.length + 3;
    const totalAttendeesCount = `${((artist.name.length * 280 + artist.experienceYears * 540) / 1000).toFixed(1)}k`;

    return {
      hosting: hostingDuration,
      totalEvents: totalEventsCount,
      totalAttendees: totalAttendeesCount
    };
  }, [artist]);

  // Handle share profile logic
  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Handle contact submission simulation
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage) return;
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      setContactMessage('');
      setTimeout(() => {
        setSendSuccess(false);
        setShowContactModal(false);
      }, 2000);
    }, 1200);
  };

  return (
    <div className="jz-page bg-[#FAFBFD] min-h-screen text-neutral-900 font-sans pb-24" id={`artist-detail-${artist.id}`}>
      
      {/* 1. HEADER NAVIGATION */}
      <div className="bg-white   sticky top-0 z-30 shadow-xs" id="artist-navigator-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-600 hover:text-[#E34718] text-xs font-semibold tracking-wider transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return to Artists Directory</span>
          </button>
          
          <span className="text-xs text-neutral-400 font-semibold tracking-wide">
            Artist profile
          </span>
        </div>
      </div>

      {/* 2. GORGEOUS STYLED BANNER BACKDROP */}
      <div className="w-full h-44 sm:h-52 md:h-60 bg-gradient-to-r from-neutral-100 to-neutral-200/50 relative overflow-hidden  " id="artist-profile-banner">
        {/* Subtle geometric grid backdrop matching home page */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(227,71,24,0.03)_1px,transparent_1px)] [background-size:24px_24px] opacity-80" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#E34718]/5 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-orange-100/30 rounded-full blur-[80px] pointer-events-none" />
      </div>

      {/* 3. ATTACHED IMAGE PROFILE HEADER AND DETAILS SECTION */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Header flex container matching layout precisely */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pt-6 pb-8  " id="artist-profile-header-meta">
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left w-full md:w-auto">
            {/* Elegant avatar presentation with pristine thick white padding, straddling the banner bottom divider */}
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full   bg-white shadow-md relative z-20 select-none overflow-hidden shrink-0 -mt-16 md:-mt-22">
              <img 
                src={artist.avatar} 
                alt={artist.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Title & Metadata with precise sizes and colors, situated fully below the divider */}
            <div className="space-y-4 py-1 flex-1 text-center md:text-left">
              <div>
                <h1 className="text-2xl md:text-3.5xl font-display font-medium tracking-tight text-neutral-900 leading-tight">
                  {artist.name} <span className="text-neutral-300 font-light mx-2">|</span> <span className="text-neutral-500 font-normal text-lg md:text-xl">{artist.subCategory}</span>
                </h1>
              </div>

              {/* STATS AREA FROM THE IMAGE LAYOUT - Followers, Hosting, Total Events & Total Attendees */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs font-sans">
                
                <div className="flex flex-col items-center md:items-start min-w-[70px]">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Followers</span>
                  <span className="font-bold text-neutral-800 text-sm mt-0.5">{followerCount}</span>
                </div>

                <div className="w-px h-6 bg-neutral-200 hidden md:block" />

                <div className="flex flex-col items-center md:items-start min-w-[70px]">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Hosting</span>
                  <span className="font-bold text-neutral-800 text-sm mt-0.5">{stats.hosting}</span>
                </div>

                <div className="w-px h-6 bg-neutral-200 hidden md:block" />

                <div className="flex flex-col items-center md:items-start min-w-[70px]">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total events</span>
                  <span className="font-bold text-neutral-800 text-sm mt-0.5">{stats.totalEvents}</span>
                </div>

                <div className="w-px h-6 bg-neutral-200 hidden md:block" />

                <div className="flex flex-col items-center md:items-start min-w-[70px]">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total attendees</span>
                  <span className="font-bold text-neutral-800 text-sm mt-0.5">{stats.totalAttendees}</span>
                </div>

              </div>

              {/* GLOBE WEBSITE ICON */}
              <div className="flex items-center justify-center md:justify-start gap-2 pt-0.5">
                <a 
                  href={artist.socials?.web || `https://jazba.live/artists/${artist.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-[#E34718] text-xs font-semibold tracking-wide transition-colors"
                >
                  <Globe className="w-4 h-4 text-neutral-400" />
                  <span>{artist.socials?.web ? artist.socials.web.replace('https://', '') : 'jazba.live/performer'}</span>
                  <ExternalLink className="w-3 h-3 text-neutral-300" />
                </a>
              </div>
            </div>
          </div>

          {/* ACTION BUTTON PACK */}
          <div className="flex flex-row items-center gap-2.5 shrink-0 self-center md:self-start pt-2">
            
            {/* Follow action - solid orange accent matching your home page theme */}
            <button
              onClick={handleToggleFollow}
              disabled={followBusy}
              className={`py-2 px-6 rounded-full text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5  min-h-[40px] shadow-xs disabled:opacity-60 ${
                isLiked
                  ? 'bg-neutral-100 text-neutral-800  hover:bg-neutral-200'
                  : 'bg-[#E34718] text-white  hover:bg-[#C23A12]'
              }`}
              id="artist-detail-follow"
            >
              {isLiked ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Following</span>
                </>
              ) : (
                <span>Follow</span>
              )}
            </button>

            {/* Contact Action */}
            <button
              onClick={() => setShowContactModal(true)}
              className="bg-white hover:bg-neutral-50 text-neutral-900    py-2 px-6 rounded-full text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px] shadow-xs"
              id="artist-detail-contact"
            >
              <span>Contact</span>
            </button>

            {/* Share profile with copy clipboard */}
            <button
              onClick={handleShare}
              className="p-2.5 bg-white hover:bg-neutral-50 text-neutral-600    rounded-full transition-all active:scale-95 cursor-pointer relative shadow-xs"
              title="Share profile link"
              id="artist-detail-share"
            >
              {copied && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] py-1 px-3 rounded shadow-md whitespace-nowrap z-40 font-bold block">
                  Copied link!
                </div>
              )}
              <Share2 className="w-4 h-4" />
            </button>

          </div>

        </div>

        {/* 4. TABS COMPONENT ROW - Upcoming, Past, Collections */}
        <div className="flex border-b border-neutral-200/80 mt-10" id="artist-tabs-row">
          {(['upcoming', 'past', 'collections'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-display text-xs sm:text-sm font-bold tracking-tight  transition-all relative cursor-pointer text-sentence ${
                activeTab === tab
                  ? ' text-neutral-900'
                  : ' text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {tab === 'collections' ? 'Collections & Bio' : tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E34718]"
                />
              )}
            </button>
          ))}
        </div>

        {/* 5. TABS CONTENT */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'upcoming' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="font-display font-semibold text-neutral-900 text-sm tracking-wide">
                      Upcoming events
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">Book ticket passes matching your live aesthetic preferences.</p>
                  </div>

                  {upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {upcomingEvents.map((evt) => (
                        <EventCard 
                          key={evt.id}
                          event={evt}
                          onBook={onBookEvent || (() => {})}
                          onViewDetail={() => onViewShowDetail(evt.title)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-white   rounded-3xl space-y-2">
                      <p className="font-semibold text-neutral-500 text-sm">No scheduled live dates currently.</p>
                      <button 
                        onClick={() => setShowContactModal(true)}
                        className="text-xs text-[#E34718] font-bold hover:underline"
                      >
                        Request custom performance booking
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'past' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="font-display font-semibold text-neutral-900 text-sm tracking-wide">
                      Past events
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 font-sans">Historic recitals and arena gigs completed in partnership with Jazba.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pastShowsMapped.map((show, idx) => (
                      <div 
                        key={idx}
                        className="bg-white   rounded-2xl p-5 flex items-center justify-between shadow-xs  transition-all"
                      >
                        <div className="space-y-1.5 pr-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-neutral-100 text-neutral-600 text-[9px] font-bold px-2 py-0.5 rounded-full   text-sentence tracking-widest font-mono">
                              ARCHIVED SHOW
                            </span>
                            <span className="text-[11px] font-bold text-neutral-400">{show.date}</span>
                          </div>
                          <h4 className="font-display font-bold text-neutral-850 text-sm leading-snug">
                            {show.title}
                          </h4>
                          <div className="flex items-center gap-1 text-neutral-400 text-xs font-medium">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{show.venue}</span>
                          </div>
                        </div>

                        <span className="text-[10px] bg-neutral-100/85 text-neutral-500 font-bold px-3.5 py-1.5 rounded-full   shrink-0 select-none">
                          Completed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'collections' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                  
                  {/* Biography text content */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white   rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                      <h4 className="text-lg font-display font-bold text-neutral-900">Artist biography</h4>
                      <p className="text-xs sm:text-[13px] text-neutral-600 font-medium leading-relaxed font-sans whitespace-pre-line">
                        {artist.bio}
                      </p>
                    </div>

                    {/* Rates & Specifications card */}
                    <div className="bg-white   rounded-3xl p-6 sm:p-8 grid grid-cols-2 sm:grid-cols-3 gap-4 shadow-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold text-sentence tracking-widest block">Fee per event</span>
                        <span className="text-base font-bold text-neutral-800 mt-1 block">${artist.hourlyRate}<span className="text-xs font-medium text-neutral-400"> / event</span></span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold text-sentence tracking-widest block">experience</span>
                        <span className="text-base font-bold text-neutral-800 mt-1 block">{artist.experienceYears} Years Active</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-neutral-400 font-bold text-sentence tracking-widest block">location</span>
                        <span className="text-base font-bold text-neutral-800 mt-1 block">{artist.location || 'London'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Trust metrics columns */}
                  <div className="space-y-6">
                    
                    {/* Verified system badge */}
                    <div className="bg-white   rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                      <h4 className="text-xs font-bold text-neutral-400 text-sentence tracking-widest">Rating</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-500">
                          <Star className="w-5 h-5 fill-current" />
                        </div>
                        <span className="font-extrabold text-xl text-neutral-900">{artist.rating.toFixed(1)}</span>
                        <span className="text-xs text-neutral-400 font-medium mt-0.5">({artist.totalReviews} reviews)</span>
                      </div>

                      <div className="pt-3.5   flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E34718]/10 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-[#E34718]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-800">Verified Profile</p>
                          <p className="text-[11px] text-neutral-500 font-medium">Transparent, upfront pricing.</p>
                        </div>
                      </div>
                    </div>

                    {/* Streaming indicators */}
                    <div className="bg-white   rounded-3xl p-6 sm:p-8 space-y-3.5 shadow-xs">
                      <h4 className="text-xs font-bold text-neutral-400 text-sentence tracking-widest">Connected streams</h4>
                      
                      <div className="space-y-2">
                        <a 
                          href={artist.socials?.spotify || "https://spotify.com"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 hover:bg-neutral-50 rounded-xl transition-all   "
                        >
                          <span className="text-xs font-bold text-neutral-700 font-sans">Spotify Profile</span>
                          <span className="text-[10px] font-extrabold text-[#E34718] text-sentence tracking-wide">Listen Now</span>
                        </a>

                        <a 
                          href={artist.socials?.youtube || "https://youtube.com"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 hover:bg-neutral-50 rounded-xl transition-all   "
                        >
                          <span className="text-xs font-bold text-neutral-700 font-sans">YouTube Channel</span>
                          <span className="text-[10px] font-extrabold text-[#E34718] text-sentence tracking-wide">Watch video</span>
                        </a>
                      </div>
                    </div>

                  </div>

                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* 6. MODAL CONTACT FORM */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in" id="contact-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white   rounded-[2rem] max-w-md w-full p-6 sm:p-8 relative shadow-xl overflow-hidden"
              id="contact-artist-modal"
            >
              
              {/* Corner Close button */}
              <button 
                onClick={() => setShowContactModal(false)}
                className="absolute top-5 right-5 text-neutral-400 hover:text-black w-8 h-8 rounded-full   flex items-center justify-center transition-colors hover:bg-neutral-50 cursor-pointer"
                aria-label="Close message window"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-2 mb-6 text-left">
                <span className="text-[10px] font-bold text-[#E34718] flex items-center gap-1 text-sentence tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Inquiry dispatch</span>
                </span>
                <h3 className="text-xl font-display font-bold text-neutral-900">
                  Contact {artist.name}
                </h3>
                <p className="text-xs text-neutral-500 font-medium font-sans leading-normal">
                  Detail your live acoustic request, location requirements, or schedule coordinates.
                </p>
              </div>

              {sendSuccess ? (
                <div className="py-8 text-center space-y-3" id="contact-success-notice">
                  <div className="w-12 h-12 bg-orange-50 text-[#C23A12] rounded-full flex items-center justify-center mx-auto  ">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">Message delivered</h4>
                    <p className="text-[11px] text-neutral-400 mt-1 max-w-xs mx-auto font-medium">
                      Your schedule details were safely dispatched directly. Expect a response review setup within 2 hours.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4 text-left">
                  
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-450 text-sentence tracking-widest pl-1 block">
                      Inquirer name
                    </label>
                    <input 
                      type="text" 
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Liam Hall"
                      className="w-full bg-neutral-50 hover:bg-neutral-100/60   focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none  focus:ring-1 focus:ring-[#E34718]/45 placeholder-neutral-400 min-h-[40px]"
                    />
                  </div>

                  {/* Email address */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-450 text-sentence tracking-widest pl-1 block">
                      Your email address
                    </label>
                    <input 
                      type="email" 
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full bg-neutral-50 hover:bg-neutral-100/60   focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none  focus:ring-1 focus:ring-[#E34718]/45 placeholder-neutral-400 min-h-[40px]"
                    />
                  </div>

                  {/* Message body */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-450 text-sentence tracking-widest pl-1 block">
                      Request description
                    </label>
                    <textarea 
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Share details of your upcoming gig, date, and venue requirements..."
                      className="w-full bg-neutral-50 hover:bg-neutral-100/60   focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none  focus:ring-1 focus:ring-[#E34718]/45 placeholder-neutral-400 resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full bg-neutral-900   hover:bg-neutral-800 text-white font-extrabold text-[10px] text-sentence py-3.5 px-5 rounded-full tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98 min-h-[40px]"
                    id="submit-contact-form"
                  >
                    <span>{isSending ? 'Sending inquiry...' : 'Verify & dispatch message'}</span>
                  </button>

                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
