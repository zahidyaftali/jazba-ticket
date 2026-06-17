import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, MapPin, Clock, Ticket, Check, Star, 
  Share2, ShieldCheck, Heart, Plus, Minus, ThumbsUp, ChevronDown, ChevronUp, Image as ImageIcon
} from 'lucide-react';
import { EventItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { getOrganizerProfile, followTarget, unfollowTarget, isFollowingTarget, getFollowerCount, OrganizerProfile } from '../services/backendService';

interface EventDetailPageProps {
  event: EventItem;
  allEvents: EventItem[];
  onBack: () => void;
  onBook: (event: EventItem, quantity: number, tier: 'general' | 'vip' | 'elite') => void;
  onSelectRelatedEvent: (event: EventItem) => void;
  onRequireLogin: () => void;
}

export default function EventDetailPage({
  event,
  allEvents,
  onBack,
  onBook,
  onSelectRelatedEvent,
  onRequireLogin
}: EventDetailPageProps) {
  // --- States ---
  const [isLiked, setIsLiked] = useState(false);
  
  // Ticket booking states
  const [ticketTier, setTicketTier] = useState<'general' | 'vip' | 'elite'>('general');
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  
  // Agenda interactive state
  const [selectedAgendaId, setSelectedAgendaId] = useState<number | null>(0);
  
  // Organizer state - real profile, follow status, and follower count loaded from Firestore
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [isFollowingOrganizer, setIsFollowingOrganizer] = useState(false);
  const [organizerRating] = useState(4.9);
  const [organizerFollowers, setOrganizerFollowers] = useState(0);
  const [organizerFollowBusy, setOrganizerFollowBusy] = useState(false);

  const organizerUserId = (event as any).organizerId as string | undefined;
  const organizerTargetId = organizerProfile?.id || organizerUserId || '';

  useEffect(() => {
    let cancelled = false;
    if (!organizerUserId) {
      setOrganizerProfile(null);
      return;
    }
    getOrganizerProfile(organizerUserId).then((profile) => {
      if (!cancelled) setOrganizerProfile(profile);
    });
    return () => { cancelled = true; };
  }, [organizerUserId]);

  useEffect(() => {
    let cancelled = false;
    if (!organizerTargetId) {
      setOrganizerFollowers(0);
      setIsFollowingOrganizer(false);
      return;
    }
    getFollowerCount('organizer', organizerTargetId).then((count) => {
      if (!cancelled) setOrganizerFollowers(count);
    });
    const user = auth.currentUser;
    if (user) {
      isFollowingTarget(user.uid, 'organizer', organizerTargetId).then((following) => {
        if (!cancelled) setIsFollowingOrganizer(following);
      });
    } else {
      setIsFollowingOrganizer(false);
    }
    return () => { cancelled = true; };
  }, [organizerTargetId]);

  const handleToggleFollowOrganizer = async () => {
    const user = auth.currentUser;
    if (!user) {
      onRequireLogin();
      return;
    }
    if (!organizerTargetId || organizerFollowBusy) return;
    setOrganizerFollowBusy(true);
    try {
      if (isFollowingOrganizer) {
        await unfollowTarget(user.uid, 'organizer', organizerTargetId);
        setIsFollowingOrganizer(false);
        setOrganizerFollowers(prev => Math.max(0, prev - 1));
      } else {
        await followTarget(user.uid, 'organizer', organizerTargetId);
        setIsFollowingOrganizer(true);
        setOrganizerFollowers(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error updating organizer follow state', err);
    } finally {
      setOrganizerFollowBusy(false);
    }
  };
  
  // Gallery zoom state
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  
  // FAQs collapse state
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  // Scroll to top when event changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Reset state for new event
    setQuantity(1);
    setTicketTier('general');
    setPromoApplied(false);
    setPromoCode('');
    setPromoError('');
    setOpenFaqId(null);
  }, [event]);

  // Pricing constants based on tier
  const tierPricing = {
    general: event.price,
    vip: Math.round(event.price * 1.7),
    elite: Math.round(event.price * 2.5),
  };

  const getSubtotal = () => tierPricing[ticketTier] * quantity;
  const getDiscount = () => {
    if (!promoApplied) return 0;
    // JAZBA18 gives 18% off
    return Math.round(getSubtotal() * 0.18);
  };
  const getBookingServiceFee = () => Math.round(getSubtotal() * 0.05); // 5% fee
  const getTotalPrice = () => getSubtotal() - getDiscount() + getBookingServiceFee();

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'JAZBA18' || promoCode.trim().toUpperCase() === 'EVENT18') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid coupon code. Try using JAZBA18');
      setPromoApplied(false);
    }
  };

  // Simulated content generation matching each actual event
  const isOpera = event.title.toLowerCase().includes('phantom') || event.title.toLowerCase().includes('opera');
  const artistName = isOpera ? 'The Royal Philharmonic Ensemble' : 'Curated Live Sensation';
  
  const artistsList = [
    {
      name: isOpera ? 'Dame Sarah Connolly' : 'Marcus Vance',
      role: isOpera ? 'Lead Soprano' : 'Lead Vocalist / Producer',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      bio: 'Award-winning performer with over 15 years in grand productions across Europe and London.'
    },
    {
      name: isOpera ? 'Sir Thomas Hampson' : 'DJ Alok Rivers',
      role: isOpera ? 'Baritone Soloist' : 'Guest Turntable Artist',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Eminent international musician known for spectacular presence and masterful deliveries.'
    },
    {
      name: isOpera ? 'Dr. Elizabeth Ward' : 'Chloe Winters',
      role: isOpera ? 'Symphonic Conductor' : 'Synthesizer & Rhythmist',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      bio: 'A visionary orchestrator whose precise, heartfelt tempos elevate classical works to high levels.'
    }
  ];

  const agendaSchedule = [
    {
      id: 0,
      time: '05:30 PM',
      title: 'Priority Entry & VIP Lounge Open',
      desc: 'Exclusive gates accept Premium & Elite pass-holders. Complimentary mocktails served upon arrival.'
    },
    {
      id: 1,
      time: '06:30 PM',
      title: 'General Gate Openings',
      desc: 'All ticket holder tiers allowed access. Beautiful merchandise stalls and ambient art exhibition boards are open.'
    },
    {
      id: 2,
      time: '07:30 PM',
      title: 'Theatrical Act I / Opening Performance',
      desc: 'Orchestras strike up. Immersive visual systems take effect, setting a grand atmosphere.'
    },
    {
      id: 3,
      time: '08:45 PM',
      title: 'Mid-Stage Intermission',
      desc: 'A scenic 20-minute pause. Refreshments, social network circles, and visual terrace viewings available.'
    },
    {
      id: 4,
      time: '09:05 PM',
      title: 'Grand Act II & Final Encore',
      desc: 'The climax of the production. High-intensity lighting, legendary choruses, and surprise solo stage tracks.'
    },
    {
      id: 5,
      time: '10:30 PM',
      title: 'Post-Concert Meet & Greet',
      desc: 'Specifically for Elite Passholders. Direct photos with lead artists, signed posters, and complementary gift hampers.'
    }
  ];

  const organizerDetails = {
    name: organizerProfile?.companyName || 'Jazba Premiere Productions',
    bio: organizerProfile?.description || 'Pioneers of high-production theatrical experiences, live music tours, and monumental concerts across the United Kingdom and Canada since 2012.',
    imageUrl: organizerProfile?.logoUrl || 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=100&auto=format&fit=crop&q=80'
  };

  const galleryImages = [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1481162854517-d9e353af153d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80'
  ];

  const eventReviews = [
    {
      id: 1,
      name: 'Eleanor Sterling',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      rating: 5,
      date: 'May 24, 2026',
      text: 'An absolutely spellbinding production. The sound clarity in the venue was perfect, and booking via Jazba was incredibly swift. Best ticket service I have encountered!'
    },
    {
      id: 2,
      name: 'Robert Vance',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
      rating: 4,
      date: 'May 18, 2026',
      text: 'Remarkable stage designs and lighting sets. We bought VIP passes, which had premium food options. The security staff directed parking quite nicely.'
    },
    {
      id: 3,
      name: 'Amara Patel',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      rating: 5,
      date: 'April 30, 2026',
      text: 'Unforgettable night. The performance was breathtaking, and the ticketing details rendered beautifully on my phone. Elite tier is 100% worth it for the post-show autograph circle.'
    }
  ];

  const faqList = [
    {
      id: 1,
      question: 'Where is the exact performance stage situated inside the venue?',
      answer: 'Performances occur inside the grand main theater arena or primary sound stage. Premium and Elite seating cards highlight section names. Staff at entryway arches will guide you directly to your reserved seat rows.'
    },
    {
      id: 2,
      question: 'What items are restricted near the venue gates?',
      answer: 'For general safety, professional long-lens cameras, metal containers, outside commercial catering, and sharp/hazardous structures are restricted. Checked cloakroom vaults are accessible near the ticket scanning pavilion.'
    },
    {
      id: 3,
      question: 'Am I allowed to adjust my booked ticket tier later?',
      answer: 'Upgrades to VIP or Elite tiers can be managed directly at our Box Office counter on the evening of the show, subject to live seating density and ticket availability. Original pass QR codes will be invalidated upon tier re-issue.'
    },
    {
      id: 4,
      question: 'How does parking reservation work?',
      answer: 'Elite tickets include complimentary priority parking inside Parking Structure Alpha. VIP and General Ticket holder slots can be reserved on-site for a nominal fee. Public transit links are exceptionally frequent and stop directly outside.'
    }
  ];

  // Pick related events from the same category or general events list
  const relatedEvents = allEvents
    .filter(evt => evt.id !== event.id)
    .slice(0, 3);

  return (
    <div className="bg-neutral-50/50 min-h-screen pb-20 pt-8" id="event-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* BREADCRUMBS & NAVIGATION ROUTE */}
        <div className="mb-8 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-bold text-sentence tracking-wider transition-all shadow-md active:scale-95 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Shows</span>
          </button>
        </div>

        {/* MAIN GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT CONTENT COLUMN: PLAIN PREMIUM BLOCKS WITH SIMPLE GRAY BORDERS */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. HERO BANNER COVER & QUICK METADATA */}
            <div className="relative rounded-2xl overflow-hidden   bg-black shadow-xs">
              <div className="h-[280px] sm:h-[420px] w-full overflow-hidden relative">
                <img 
                  src={event.image} 
                  alt={event.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-90"
                />
                {/* Visual rich gradient overlay to text anchor */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/60 to-transparent"></div>
              </div>

              {/* FLOATING ACTION BUTTONS */}
              <div className="absolute top-4 right-4 flex items-center gap-2.5 z-10">
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className="w-10 h-10 rounded-full bg-white/95 hover:bg-white flex items-center justify-center   shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Save Event"
                >
                  <Heart className={`w-4.5 h-4.5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-neutral-700'}`} />
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Event page link copied to clipboard!');
                  }}
                  className="w-10 h-10 rounded-full bg-white/95 hover:bg-white flex items-center justify-center   shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Share Event"
                >
                  <Share2 className="w-4.5 h-4.5 text-neutral-700" />
                </button>
              </div>

              {/* OVERLAY DETAILS */}
              <div className="absolute bottom-0 text-white p-6 sm:p-10 w-full text-left">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="bg-neutral-950/80 text-[#E34718] text-[10px] text-sentence font-black tracking-widest px-3 py-1.5 rounded-full  ">
                    {event.category.toUpperCase()}
                  </span>
                  <span className="bg-white/10 text-white backdrop-blur-md text-[10px] font-bold px-3 py-1.5 rounded-full  ">
                    ★ Premium Verified
                  </span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-medium text-white tracking-tight leading-none">
                  {event.title}
                </h1>

                <p className="text-xs sm:text-sm text-neutral-300 font-medium mt-3.5 max-w-2xl line-clamp-2">
                  Featuring specialized productions by {artistName} held in gorgeous environments, structured to capture the imagination of attendees.
                </p>
              </div>
            </div>

            {/* 2. EVENT INFORMATION SECTION (MINIMAL GRID) */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs">
              <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest   pb-3 mb-6 text-left">
                Essential Spotlights
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                {/* DATE DETAILS */}
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-[#E34718]/10 rounded-xl text-neutral-800 flex items-center justify-center shrink-0  ">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-neutral-400 text-sentence tracking-widest block leading-none">Date</span>
                    <span className="text-sm font-bold text-neutral-950 mt-1.5 block truncate whitespace-nowrap">
                      {event.fullDate || `${event.date}, ${event.year || '2026'}`}
                    </span>
                  </div>
                </div>

                {/* TIMING DETAILS */}
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-[#E34718]/10 rounded-xl text-neutral-800 flex items-center justify-center shrink-0  ">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-neutral-400 text-sentence tracking-widest block leading-none">Time</span>
                    <span className="text-sm font-bold text-neutral-950 mt-1.5 block font-mono truncate whitespace-nowrap">
                      {event.time}
                    </span>
                  </div>
                </div>

                {/* LOCATION ROOM VENUE */}
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-neutral-100 rounded-xl text-neutral-800 flex items-center justify-center shrink-0  ">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-neutral-400 text-sentence tracking-widest block leading-none">Location</span>
                    <span className="text-sm font-bold text-neutral-950 mt-1.5 block truncate whitespace-nowrap">
                      {event.location}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. EVENT DESCRIPTION */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
              <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest   pb-3 mb-6">
                Event Description
              </h3>
              
              <div className="prose prose-neutral text-sm sm:text-base text-neutral-600 leading-relaxed font-normal space-y-4">
                <p>
                  Join us for an unforgettable night at <strong className="text-neutral-900 font-bold">{event.title}</strong>. Expect outstanding performances, immersive staging, and great sound in a venue built to bring the show to life.
                </p>
                <p>
                  Whether you're a longtime fan of live entertainment or attending your first show, you're in for a night to remember.
                </p>
                
                {/* PERFORMANCE HIGHLIGHT BULLETS */}
                <div className="pt-6   mt-6">
                  <h4 className="text-neutral-850 font-bold text-xs text-sentence tracking-widest mb-4">Performance Highlights</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm text-neutral-600 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#E34718]/10 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#E34718]" />
                      </div>
                      <span>Two complete 45-minute acts</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#E34718]/10 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#E34718]" />
                      </div>
                      <span>Full symphonic visual display patterns</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#E34718]/10 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#E34718]" />
                      </div>
                      <span>Complimentary physical souvenir booklet</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#E34718]/10 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#E34718]" />
                      </div>
                      <span>VIP bar and snack access</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. EVENT AGENDA / Schedule (CLEAN MINIMAL CARD EXPANSION) */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3   pb-3">
                <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest">
                  Event Agenda / Schedule
                </h3>
                <span className="text-[10px] text-neutral-400 font-bold text-sentence tracking-wider bg-neutral-100 px-2.5 py-1 rounded-full">
                  Local Stage Time (BST)
                </span>
              </div>

              {/* INTERACTIVE TIMELINE BLOCKS */}
              <div className="space-y-3">
                {agendaSchedule.map((item) => {
                  const isSelected = selectedAgendaId === item.id;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedAgendaId(isSelected ? null : item.id)}
                      className={`group p-4 rounded-xl  transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'bg-[#E34718]/5 ' 
                          : 'bg-white  '
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Clock indicator */}
                          <span className="font-mono text-xs font-bold text-neutral-500 bg-neutral-100 group-hover:bg-neutral-200 px-2.5 py-1 rounded-md shrink-0">
                            {item.time}
                          </span>
                          
                          <div className="min-w-0 pt-0.5">
                            <h4 className="font-bold text-xs sm:text-sm text-neutral-800 truncate group-hover:text-black transition-colors">
                              {item.title}
                            </h4>
                          </div>
                        </div>

                        <div className="shrink-0 pt-1.5">
                          {isSelected ? (
                            <ChevronUp className="w-4 h-4 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* CONDITIONAL DETAILED EXPOSURE */}
                      <AnimatePresence initial={false}>
                        {isSelected && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="text-xs text-neutral-500 mt-3.5 pt-3.5   leading-relaxed">
                              {item.desc}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. FEATURED LIVE PERFORMERS */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
              <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest   pb-3 mb-6">
                Featured Live Performers
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {artistsList.map((artist, idx) => (
                  <div 
                    key={idx}
                    className="flex flex-col items-center text-center p-5 rounded-xl   bg-neutral-50/20"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden   shadow-inner relative mb-3">
                      <img 
                        src={artist.avatar} 
                        alt={artist.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <h4 className="font-bold text-xs sm:text-sm text-neutral-900 leading-snug font-display">
                      {artist.name}
                    </h4>
                    <span className="text-[9px] text-neutral-400 font-extrabold text-sentence tracking-widest block mt-1">
                      {artist.role}
                    </span>
                    
                    <p className="text-[11px] text-neutral-500 font-medium leading-relaxed mt-3.5 pt-3.5  ">
                      {artist.bio}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. VENUE & DIRECTIONS */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
              <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest   pb-3 mb-6">
                Venue &amp; Logistics Guides
              </h3>

              <div className="space-y-6">
                {/* MAP SIMULATOR VISUAL CONTAINER */}
                <div className="relative h-60 rounded-xl overflow-hidden   bg-neutral-100 shadow-inner">
                  <div className="absolute inset-0 bg-[#E2E8F0] overflow-hidden flex flex-col justify-end p-4">
                    {/* Modern stylized roads map back-draw */}
                    <div className="absolute inset-0 opacity-[0.25] pointer-events-none">
                      <div className="absolute w-full h-[6px] bg-white top-1/3 left-0 shadow-xs"></div>
                      <div className="absolute w-full h-[6px] bg-white top-2/3 left-0 shadow-xs"></div>
                      <div className="absolute w-[6px] h-full bg-white left-1/4 top-0 shadow-xs"></div>
                      <div className="absolute w-[6px] h-full bg-white left-3/4 top-0 shadow-xs"></div>
                      <div className="absolute w-24 h-24 rounded-full   left-[20%] top-[35%] opacity-50"></div>
                    </div>

                    {/* SEATING POSITION / PIN MARKER */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                      <div className="bg-neutral-900 text-white rounded-lg px-4 py-2 text-xs font-bold shadow-xl   flex items-center gap-2 z-10 whitespace-nowrap">
                        <MapPin className="w-3.5 h-3.5 text-[#E34718]" />
                        <span>{event.location}</span>
                      </div>
                      <div className="w-6 h-6 bg-[#E34718]/30 rounded-full   mt-1 flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#E34718] rounded-full"></div>
                      </div>
                    </div>

                    <div className="z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-xl   max-w-xs text-left shadow-lg">
                      <h4 className="font-bold text-xs text-neutral-950 leading-tight">London Symphonic Center Arch</h4>
                      <p className="text-[10px] text-neutral-500 leading-snug mt-1">382 Festival Row Corridor, Westminster, EC2N</p>
                    </div>
                  </div>
                </div>

                {/* DIRECTIONS & STAGE PLOTS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50/50   rounded-xl">
                    <h4 className="font-bold text-xs text-neutral-800 text-sentence tracking-widest mb-2   pb-1.5">Transport Guides</h4>
                    <p className="text-[11px] text-neutral-500 leading-relaxed font-semibold space-y-1.5">
                      <span className="block">• <strong>Underground:</strong> Westminster Station (Jubilee / District lines) - 4 min walk</span>
                      <span className="block">• <strong>Bus Depot:</strong> Platform 9 lines 24 &amp; 88 stop directly at the theater gates</span>
                      <span className="block">• <strong>Parking:</strong> Structural Deck G slots can be booked seamlessly in booking checkout</span>
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50/50   rounded-xl">
                    <h4 className="font-bold text-xs text-neutral-800 text-sentence tracking-widest mb-2   pb-1.5">Stage Layout Specs</h4>
                    <p className="text-[11px] text-neutral-500 leading-relaxed font-semibold space-y-1.5">
                      <span className="block">• Center Core Ring acoustics optimize vocal output near central aisles</span>
                      <span className="block">• Projections require distance: Rows D+ represent prime viewing fields</span>
                      <span className="block">• VIP Lounge access elevator corridor directly behind main Zone AA</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. ORGANIZER PROFILE */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
              <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest   pb-3 mb-6">
                Organizer Profile
              </h3>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-14 h-14 rounded-xl overflow-hidden   shrink-0">
                  <img 
                    src={organizerDetails.imageUrl} 
                    alt={organizerDetails.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-neutral-900 flex items-center justify-center sm:justify-start gap-1.5 leading-tight">
                        {organizerDetails.name}
                        <span className="inline-flex bg-[#E34718]/20 text-[#C23A12] p-0.5 rounded-full" title="Verified Organizer">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      </h4>
                      <p className="text-[10px] text-neutral-400 font-bold text-sentence tracking-wider mt-1">
                        Active member since 2012 • London Region
                      </p>
                    </div>

                    <button
                      onClick={handleToggleFollowOrganizer}
                      disabled={organizerFollowBusy}
                      className={`px-5 py-2 rounded-full text-xs font-bold text-sentence tracking-wider transition-all cursor-pointer disabled:opacity-60 ${
                        isFollowingOrganizer
                          ? 'bg-neutral-100   text-neutral-600 hover:bg-neutral-250 animate-fadeIn'
                          : 'bg-neutral-950 text-white hover:bg-neutral-800'
                      }`}
                    >
                      {isFollowingOrganizer ? 'Following' : 'Follow Organizer'}
                    </button>
                  </div>

                  {/* STATS STRIP */}
                  <div className="flex items-center justify-center sm:justify-start gap-6 mt-4 pt-4  ">
                    <div>
                      <span className="font-mono font-bold text-neutral-800 text-sm block leading-none">
                        {organizerFollowers.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-bold text-sentence tracking-wider block mt-1 leading-none">
                        Followers
                      </span>
                    </div>
                    <div>
                      <span className="font-mono font-bold text-neutral-800 text-sm flex items-center justify-center sm:justify-start gap-1 leading-none">
                        <Star className="w-3.5 h-3.5 fill-[#E34718] text-[#E34718]" />
                        {organizerRating}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-bold text-sentence tracking-wider block mt-1 leading-none">
                        Aggregate Rating
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500 font-bold mt-4 leading-relaxed">
                    {organizerDetails.bio}
                  </p>
                </div>
              </div>
            </div>

            {/* 8. GALLERY PICTURES (ZOOM EXPANSIONS) */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
              <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest   pb-3 mb-6">
                Photo Gallery
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryImages.map((img, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setZoomImage(img)}
                    className="group relative h-24 sm:h-32 rounded-xl overflow-hidden cursor-zoom-in   bg-neutral-100"
                  >
                    <img 
                      src={img} 
                      alt={`Gallery item ${idx}`} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-neutral-950/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center shadow-xs">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 9. FAQs */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
              <div className="mb-6   pb-3">
                <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest">
                  Frequently Asked Questions
                </h3>
                <p className="text-xs text-neutral-500 font-medium mt-1">Immediate stage concerns and gate instructions answered.</p>
              </div>

              {/* ZERO BOX-SHADOWS ACCORDION WRAPPER (DIVIDE LINES ONLY) */}
              <div className="    ">
                {faqList.map((item) => {
                  const isOpen = openFaqId === item.id;
                  
                  return (
                    <div 
                      key={item.id} 
                      className="py-1"
                    >
                      <button 
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                        className="w-full flex items-center justify-between py-4 px-1 bg-white text-left font-bold text-xs sm:text-sm text-neutral-800 hover:text-black focus:outline-none transition-colors cursor-pointer"
                      >
                        <span className="pr-4 leading-tight font-display font-medium text-neutral-950">{item.question}</span>
                        <div className="shrink-0 w-7 h-7 rounded-full   flex items-center justify-center bg-neutral-50 text-neutral-660">
                          {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <div className="pb-4 px-1 bg-white text-neutral-500 font-medium text-xs sm:text-[13px] leading-relaxed">
                              <p>{item.answer}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 10. REVIEWS & TESTIMONIALS */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
              <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest   pb-3 mb-6">
                Reviews &amp; Testimonials
              </h3>

              {/* STARS OVERALL RATING CHALET */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center   pb-6 mb-6">
                <div className="sm:col-span-4 text-center pb-4 sm:pb-0  ">
                  <span className="text-3xl sm:text-4xl font-display font-medium text-neutral-900 leading-none">4.8</span>
                  <div className="flex items-center justify-center gap-1 mt-2.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-[#E34718] text-[#E34718]" />
                    ))}
                  </div>
                  <span className="text-[9px] text-neutral-400 font-bold block mt-2 text-sentence tracking-wide">
                    Based on 148 global reviews
                  </span>
                </div>

                <div className="sm:col-span-8 space-y-2 max-w-sm mx-auto sm:mx-0 w-full">
                  {[
                    { stars: 5, pct: '88%' },
                    { stars: 4, pct: '9%' },
                    { stars: 3, pct: '2%' },
                    { stars: 2, pct: '1%' },
                    { stars: 1, pct: '0%' }
                  ].map((bar, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-[11px] text-neutral-500 font-bold">
                      <span className="w-8 text-right shrink-0">{bar.stars} ★</span>
                      <div className="flex-1 bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#E34718] h-full rounded-full" style={{ width: bar.pct }}></div>
                      </div>
                      <span className="w-8 text-left shrink-0">{bar.pct}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TESTIMONIAL BUBBLES */}
              <div className="space-y-4">
                {eventReviews.map((rev) => (
                  <div key={rev.id} className="p-5 bg-neutral-50/20   rounded-xl flex flex-col sm:flex-row gap-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0   relative mb-2 sm:mb-0">
                      <img src={rev.avatar} alt={rev.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2.5 flex-wrap">
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-neutral-850 flex items-center gap-1.5 leading-tight">
                            {rev.name}
                            <span className="bg-orange-50 text-[9px] text-[#C23A12] px-2 py-0.5   rounded-full font-bold text-sentence tracking-wider shrink-0">
                              Verified Booking
                            </span>
                          </h4>
                          <span className="text-[10px] text-neutral-400 font-bold block mt-1">{rev.date}</span>
                        </div>

                        {/* STARS DISPLAY */}
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-[#E34718] text-[#E34718]" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-neutral-555 font-medium leading-relaxed mt-3">
                        "{rev.text}"
                      </p>

                      <div className="flex items-center gap-3 mt-4 text-[10px] text-neutral-400 font-black tracking-widest text-sentence">
                        <button className="flex items-center gap-1 hover:text-neutral-600 bg-white   px-3 py-1 rounded-md transition-colors cursor-pointer">
                          <ThumbsUp className="w-3 h-3 text-[#C23A12]" /> <span>Helpful • 8</span>
                        </button>
                        <span>|</span>
                        <span className="cursor-pointer hover:underline">Report Abuse</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: STICKY LOCK RESERVATIONS FORM CARD */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start h-fit space-y-6 z-10 text-left">
            
            {/* TICKET RES BLOCK WITH ITEM RECEIPTS */}
            <div className="bg-white   rounded-2xl p-6 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-[#E34718]"></div>
              


              {/* TIER CHANGER */}
              <div className="space-y-2.5 mb-6">
                <span className="block text-[10px] font-bold text-neutral-400 text-sentence tracking-widest mb-1.5 leading-none">Choose Ticket Tier</span>
                
                {/* General Seating */}
                <button 
                  onClick={() => setTicketTier('general')}
                  className={`w-full text-left p-4 rounded-xl  transition-all flex items-center justify-between cursor-pointer ${
                    ticketTier === 'general' 
                      ? ' bg-[#E34718]/5 ring-1 ring-[#E34718]/50' 
                      : ' bg-white '
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-xs sm:text-sm text-neutral-850 block">General Entry</span>
                    <p className="text-[10px] text-neutral-400 font-medium mt-0.5 leading-tight">Standard entry gate, open zone.</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-mono font-bold text-sm sm:text-base text-neutral-900 block">${tierPricing.general}</span>
                    <span className="text-[9px] text-[#C23A12] font-bold block mt-0.5 text-sentence tracking-wider">Avail.</span>
                  </div>
                </button>

                {/* VIP Seating */}
                <button 
                  onClick={() => setTicketTier('vip')}
                  className={`w-full text-left p-4 rounded-xl  transition-all flex items-center justify-between cursor-pointer ${
                    ticketTier === 'vip' 
                      ? ' bg-[#E34718]/5 ring-1 ring-[#E34718]/50' 
                      : ' bg-white '
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-xs sm:text-sm text-neutral-850 flex items-center gap-1.5">
                      VIP Premium
                      <span className="bg-[#E34718]/10 text-[#C23A12] px-1.5 py-0.5 rounded-md font-bold text-sentence tracking-wider shrink-0">Club</span>
                    </span>
                    <p className="text-[10px] text-neutral-405 font-medium mt-0.5 leading-tight">Fast track lane, custom bar perks.</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-mono font-bold text-sm sm:text-base text-neutral-900 block">${tierPricing.vip}</span>
                    <span className="text-[9px] text-[#C23A12] font-bold block mt-0.5 text-sentence tracking-wider">Popular</span>
                  </div>
                </button>

                {/* Elite Pass */}
                <button 
                  onClick={() => setTicketTier('elite')}
                  className={`w-full text-left p-4 rounded-xl  transition-all flex items-center justify-between cursor-pointer ${
                    ticketTier === 'elite' 
                      ? ' bg-[#E34718]/5 ring-1 ring-[#E34718]/50' 
                      : ' bg-white '
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-xs sm:text-sm text-neutral-850 flex items-center gap-1.5">
                      Elite Backstage
                      <span className="bg-sky-100 text-[8px] text-sky-800 px-1.5 py-0.5 rounded-md font-bold text-sentence tracking-wider shrink-0">Max</span>
                    </span>
                    <p className="text-[10px] text-neutral-400 font-medium mt-0.5 leading-tight">Meet-n-greet, VIP lounge, front row sights.</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-mono font-bold text-sm sm:text-base text-neutral-900 block">${tierPricing.elite}</span>
                    <span className="text-[9px] text-red-500 font-bold block mt-0.5 text-sentence tracking-wider">5 Left</span>
                  </div>
                </button>
              </div>

              {/* QUANTITY CONTROLLER */}
              <div className="flex items-center justify-between mb-5 bg-neutral-50 p-4 rounded-xl  ">
                <div>
                  <span className="font-bold text-xs sm:text-sm text-neutral-800 block">Total Attendees</span>
                  <p className="text-[10px] text-neutral-450 font-medium mt-0.5">Maximum 10 reservations</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(prev => prev - 1)}
                    className="w-10 h-10   rounded-lg flex items-center justify-center bg-white hover:bg-neutral-50 disabled:opacity-30 transition-all cursor-pointer text-neutral-800 font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-sm sm:text-base text-neutral-950">{quantity}</span>
                  <button 
                    disabled={quantity >= 10}
                    onClick={() => setQuantity(prev => prev + 1)}
                    className="w-10 h-10   rounded-lg flex items-center justify-center bg-white hover:bg-neutral-50 disabled:opacity-30 transition-all cursor-pointer text-neutral-800 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* COUPON DISPATCH code inputs */}
              <form onSubmit={handleApplyPromo} className="mb-5">
                <label className="block text-[10px] font-bold text-neutral-400 text-sentence tracking-widest mb-1.5 leading-none">Coupon Apply</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={promoApplied}
                    placeholder="Enter Coupon (e.g. JAZBA18)"
                    className="text-sentence flex-1 bg-white   rounded-xl px-3 text-xs font-bold focus:outline-none  text-neutral-800 placeholder-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-400 min-h-[44px]"
                  />
                  <button
                    type="submit"
                    disabled={promoApplied || !promoCode}
                    className="bg-neutral-950 hover:bg-neutral-800 text-white disabled:opacity-30 disabled:hover:bg-neutral-950 text-xs font-bold px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    {promoApplied ? 'Applied' : 'Apply'}
                  </button>
                </div>
                {promoApplied && (
                  <p className="text-[11px] text-[#C23A12] font-semibold mt-2 flex items-center gap-1 animate-fadeIn">
                    <Check className="w-3.5 h-3.5 text-[#E34718]" /> Exclusive 18% Promo Applied!
                  </p>
                )}
                {promoError && (
                  <p className="text-[11px] text-red-505 font-semibold mt-2">
                    {promoError}
                  </p>
                )}
              </form>

              {/* ITEMIZED REVIEWS AND RECEIPT TOTALS */}
              <div className="space-y-2   pt-4 mb-5 text-[11px] text-neutral-500 font-bold">
                <div className="flex justify-between items-center">
                  <span>Subtotal ({quantity} x {ticketTier.toUpperCase()})</span>
                  <span className="font-mono text-neutral-800">${getSubtotal()}</span>
                </div>
                
                {promoApplied && (
                  <div className="flex justify-between items-center text-[#C23A12] animate-fadeIn">
                    <span>Discount Included (18%)</span>
                    <span className="font-mono">-${getDiscount()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Booking &amp; Service Fee (5%)</span>
                  <span className="font-mono text-neutral-800">${getBookingServiceFee()}</span>
                </div>

                <div className="flex justify-between items-center pt-3    text-xs sm:text-sm font-black text-neutral-800">
                  <span className="text-neutral-900 leading-none">Aggregate Total Price</span>
                  <span className="font-mono text-neutral-950 text-sm sm:text-base leading-none">${getTotalPrice()}</span>
                </div>
              </div>

              {/* REDIRECT RESERVATION TARGETS */}
              <button 
                onClick={() => onBook(event, quantity, ticketTier)}
                className="w-full text-center bg-[#E34718] hover:bg-[#C23A12] text-white py-3.5 rounded-xl font-bold text-sentence tracking-wider text-xs active:scale-97 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                id="btn-confirm-reserve"
              >
                <Ticket className="w-4 h-4 text-white" />
                Reserve Space Instantly
              </button>

              <p className="text-[9px] text-neutral-450 text-center font-semibold mt-4 leading-normal">
                🛡️ Fully refundable up to 24 hours prior to general doors opening.
              </p>
            </div>

            {/* TRUST BLOCK WITH CHECKBOX AND DETAILS */}
            <div className="bg-neutral-950 text-white rounded-2xl p-5   text-xs font-bold leading-relaxed space-y-3 shadow-xs">
              <span className="text-[#E34718] text-sentence tracking-widest text-[9px] font-black block   pb-1 mt-0.5">
                🛡️ Guaranteed Security
              </span>
              <p className="text-neutral-300 font-semibold leading-relaxed">
                JazbaTicket uses secure sockets and verified payment tunnels to prevent spoof attacks or double reservation attempts.
              </p>
              <div className="flex items-center gap-2 text-[#E34718] mt-1 pt-1 font-mono text-[10px]">
                <ShieldCheck className="w-4 h-4" /> 256-Bit SSL Secured Network
              </div>
            </div>

          </div>

        </div>

        {/* 12. RELATED EVENTS */}
        <div className="mt-16   pt-16 text-left">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div>
              <h3 className="text-xl sm:text-2xl font-display font-semibold text-neutral-900 tracking-tight">
                Recommended Shows &amp; Experiences
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 font-semibold mt-1">Other spectacular high-production events you might appreciate nearby.</p>
            </div>
            
            <button 
              onClick={onBack}
              className="text-[#C23A12] font-black tracking-widest text-xs hover:underline text-sentence self-start sm:self-auto shrink-0 cursor-pointer"
            >
              Browse Broad Catalog →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedEvents.map((evt) => {
              const [day, month] = evt.date.split(' ');
              return (
                <div 
                  key={evt.id}
                  onClick={() => onSelectRelatedEvent(evt)}
                  className="group bg-white    rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative">
                    <div className="h-44 overflow-hidden relative">
                      <img 
                        src={evt.image} 
                        alt={evt.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent"></div>
                    </div>

                    <div className="absolute top-3.5 left-3.5 bg-[#E34718] text-white w-10.5 h-11.5 rounded-xl flex flex-col items-center justify-center font-black leading-none shrink-0 text-center  ">
                      <span className="text-[14px] font-black">{day || '18'}</span>
                      <span className="text-[8px] text-sentence font-semibold tracking-wide mt-0.5">{month || 'Feb'}</span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-3.5">
                    <div>
                      <span className="text-[9px] bg-neutral-100 text-[#C23A12] font-bold px-2.5 py-1 rounded-full text-sentence tracking-wider mb-2.5 inline-block">
                        {evt.category}
                      </span>
                      <h4 className="font-display font-bold text-xs sm:text-sm text-neutral-850 tracking-tight leading-snug group-hover:text-[#E34718] transition-colors line-clamp-1">
                        {evt.title}
                      </h4>
                      
                      <div className="mt-2 text-[11px] text-neutral-500 font-medium pt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{evt.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3.5   flex items-center justify-between">
                      <span className="font-mono text-xs sm:text-sm font-bold text-neutral-900">${evt.price}</span>
                      <span className="text-[10px] text-[#C23A12] font-bold tracking-widest text-sentence flex items-center gap-1">
                        Reserve Space ↗
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* DETAILED INTERACTIVE SHOT MODAL VIEW */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="max-w-4xl max-h-[85vh] relative text-center">
              <img 
                src={zoomImage} 
                alt="Event photo"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] rounded-2xl   object-contain shadow-2xl mx-auto"
              />
              <span className="text-xs text-neutral-400 mt-3.5 font-bold tracking-wide block">
                Click anywhere outside the picture boundaries to exit close-up preview
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
