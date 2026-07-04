import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Calendar, MapPin, Clock, Ticket, Check, Star,
  Share2, ShieldCheck, Heart, Plus, Minus, ThumbsUp, ChevronDown, ChevronUp, Image as ImageIcon, X, ArrowRight,
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

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

export default function EventDetailPage({
  event,
  allEvents,
  onBack,
  onBook,
  onSelectRelatedEvent,
  onRequireLogin,
}: EventDetailPageProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Booking rail
  const [ticketTier, setTicketTier] = useState<'general' | 'vip' | 'elite'>('general');
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Agenda accordion
  const [selectedAgendaId, setSelectedAgendaId] = useState<number | null>(0);

  // Organizer — real profile + follow state from Firestore
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
        setOrganizerFollowers((prev) => Math.max(0, prev - 1));
      } else {
        await followTarget(user.uid, 'organizer', organizerTargetId);
        setIsFollowingOrganizer(true);
        setOrganizerFollowers((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error updating organizer follow state', err);
    } finally {
      setOrganizerFollowBusy(false);
    }
  };

  // Gallery zoom + FAQ accordion
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setQuantity(1);
    setTicketTier('general');
    setPromoApplied(false);
    setPromoCode('');
    setPromoError('');
    setOpenFaqId(null);
  }, [event]);

  // Pricing
  const tierPricing = {
    general: event.price,
    vip: Math.round(event.price * 1.7),
    elite: Math.round(event.price * 2.5),
  };
  const getSubtotal = () => tierPricing[ticketTier] * quantity;
  const getDiscount = () => (promoApplied ? Math.round(getSubtotal() * 0.18) : 0);
  const getBookingServiceFee = () => Math.round(getSubtotal() * 0.05);
  const getTotalPrice = () => getSubtotal() - getDiscount() + getBookingServiceFee();

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoCode.trim().toUpperCase();
    if (clean === 'JAZBA18' || clean === 'EVENT18') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('That code isn\'t valid. Try JAZBA18 for 18% off.');
      setPromoApplied(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Editorial content keyed to the event
  const isOpera = event.title.toLowerCase().includes('phantom') || event.title.toLowerCase().includes('opera');
  const artistName = isOpera ? 'The Royal Philharmonic Ensemble' : 'a hand-picked live lineup';

  const artistsList = [
    {
      name: isOpera ? 'Dame Sarah Connolly' : 'Marcus Vance',
      role: isOpera ? 'Lead soprano' : 'Lead vocalist',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      bio: 'Fifteen years of headline performances across Europe\'s biggest stages.',
    },
    {
      name: isOpera ? 'Sir Thomas Hampson' : 'DJ Alok Rivers',
      role: isOpera ? 'Baritone soloist' : 'Guest DJ',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'An international name known for commanding stage presence.',
    },
    {
      name: isOpera ? 'Dr. Elizabeth Ward' : 'Chloe Winters',
      role: isOpera ? 'Conductor' : 'Synth & rhythm',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      bio: 'A precise, heartfelt orchestrator who lifts every performance.',
    },
  ];

  const agendaSchedule = [
    { id: 0, time: '5:30 PM', title: 'VIP & Elite doors open', desc: 'Early entry for VIP and Elite ticket holders, with a welcome drink in the lounge.' },
    { id: 1, time: '6:30 PM', title: 'General doors open', desc: 'Entry for all ticket types. Merchandise stands and the bar are open.' },
    { id: 2, time: '7:30 PM', title: 'Act one', desc: 'The show begins — full stage production, lighting and live sound.' },
    { id: 3, time: '8:45 PM', title: 'Intermission', desc: 'A 20-minute break. Refreshments available on every level.' },
    { id: 4, time: '9:05 PM', title: 'Act two & encore', desc: 'The second half builds to the night\'s finale and encore.' },
    { id: 5, time: '10:30 PM', title: 'Meet & greet', desc: 'Elite ticket holders meet the artists — photos, signings and a parting gift.' },
  ];

  const organizerDetails = {
    name: organizerProfile?.companyName || 'Jazba Premiere Productions',
    bio: organizerProfile?.description || 'Producers of large-scale live music, theatre and touring shows across the UK and Canada since 2012.',
    imageUrl: organizerProfile?.logoUrl || 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=100&auto=format&fit=crop&q=80',
  };

  const galleryImages = [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1481162854517-d9e353af153d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
  ];

  const eventReviews = [
    {
      id: 1,
      name: 'Eleanor Sterling',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      rating: 5,
      date: 'May 2026',
      text: 'Spellbinding from start to finish. The sound was perfect and booking took under a minute.',
    },
    {
      id: 2,
      name: 'Robert Vance',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
      rating: 4,
      date: 'May 2026',
      text: 'Brilliant staging and lighting. VIP was worth it — fast entry and great seats.',
    },
    {
      id: 3,
      name: 'Amara Patel',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      rating: 5,
      date: 'April 2026',
      text: 'Unforgettable night. Tickets worked flawlessly on my phone, and Elite gets you the meet-and-greet.',
    },
  ];

  const faqList = [
    { id: 1, question: 'Where inside the venue is the stage?', answer: 'The show takes place in the main hall. Your ticket shows your section, and staff at every entrance will point you straight to your seats.' },
    { id: 2, question: 'What can\'t I bring in?', answer: 'Professional cameras, outside food and drink, and any sharp or hazardous items. A free cloakroom is available next to the ticket scan.' },
    { id: 3, question: 'Can I upgrade my ticket later?', answer: 'Yes — upgrades to VIP or Elite are available at the box office on show night, subject to availability. Your original barcode is replaced on upgrade.' },
    { id: 4, question: 'Is there parking?', answer: 'Elite tickets include reserved parking. Everyone else can pre-book a space at checkout or use the frequent public transport links right outside.' },
  ];

  const relatedEvents = allEvents.filter((evt) => evt.id !== event.id).slice(0, 3);

  const tierMeta = {
    general: { name: 'General admission', note: 'Standard entry, open seating', tag: 'Available' },
    vip: { name: 'VIP', note: 'Fast-track entry and reserved seats', tag: 'Popular' },
    elite: { name: 'Elite', note: 'Front rows, lounge and artist meet', tag: 'Few left' },
  } as const;

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="event-detail-page">

      {/* ── TOP STRIP ─────────────────────────────────────────── */}
      <div className="border-b border-[#f2f2f2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-black hover:opacity-60 text-sm font-bold transition-opacity cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All events</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="w-10 h-10 border border-[#e4e4e4] hover:border-black flex items-center justify-center transition-colors cursor-pointer"
              title="Save event"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-black text-black' : 'text-black'}`} />
            </button>
            <button
              onClick={handleShare}
              className="w-10 h-10 border border-[#e4e4e4] hover:border-black flex items-center justify-center transition-colors cursor-pointer relative"
              title="Share event"
            >
              {shareCopied && (
                <span className="absolute -bottom-9 right-0 bg-black text-white text-[10px] font-bold py-1 px-3 whitespace-nowrap z-20">
                  Link copied
                </span>
              )}
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── HERO — black band, full-bleed photo ───────────────── */}
      <section className="bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={event.image}
            alt={event.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-20 sm:py-28 relative z-10">
          <span className={`${overline} bg-[#ffed00] text-black px-3 py-1.5 inline-block`}>
            {event.category}
          </span>
          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-[56px] leading-[0.95] tracking-tight mt-5 max-w-3xl">
            {event.title}
          </h1>
          <p className="text-white/70 text-base sm:text-lg mt-5 max-w-2xl leading-relaxed">
            One night, one stage — featuring {artistName}. Doors open early, the show starts on time.
          </p>

          <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 mt-10 pt-6 text-sm">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#ffed00]" />{event.fullDate || `${event.date}, ${event.year || '2026'}`}</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#ffed00]" />{event.time}</span>
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#ffed00]" />{event.location}</span>
          </div>
        </div>
      </section>

      {/* ── BODY — white catalogue + sticky rail ──────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* LEFT — content sections */}
          <div className="lg:col-span-7 space-y-16">

            {/* About */}
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">About this event</h2>
              <div className="text-base text-[#222] leading-relaxed mt-6 space-y-4">
                <p>
                  <strong className="font-bold">{event.title}</strong> brings a full-scale live production to {event.location} — immersive staging, precision sound and a lineup built for one unforgettable night.
                </p>
                <p>
                  Whether it's your hundredth show or your first, this is the kind of night you'll talk about for years.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 border-t border-[#f2f2f2] mt-8">
                {[
                  'Two full 45-minute acts',
                  'Full-scale stage and light production',
                  'Free souvenir programme',
                  'Bar and food on every level',
                ].map((h) => (
                  <div key={h} className="flex items-center gap-3 py-4 border-b border-[#f2f2f2] text-sm">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Schedule */}
            <section>
              <div className="flex items-end justify-between border-b border-black pb-4">
                <h2 className="font-display font-bold text-2xl leading-[0.95]">Running order</h2>
                <span className={`${overline} text-[#8a8a8a]`}>Local time</span>
              </div>

              <div className="border-b border-[#f2f2f2]">
                {agendaSchedule.map((item) => {
                  const isSelected = selectedAgendaId === item.id;
                  return (
                    <div key={item.id} className="border-b border-[#f2f2f2] last:border-b-0">
                      <button
                        onClick={() => setSelectedAgendaId(isSelected ? null : item.id)}
                        className="w-full flex items-center justify-between gap-4 py-5 cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-5 min-w-0">
                          <span className="font-bold text-sm w-20 shrink-0">{item.time}</span>
                          <h4 className="font-display font-bold text-base truncate group-hover:opacity-70 transition-opacity">
                            {item.title}
                          </h4>
                        </div>
                        {isSelected ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      </button>
                      <AnimatePresence initial={false}>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-[#666] leading-relaxed pb-5 pl-25 sm:pl-[100px]">
                              {item.desc}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Lineup */}
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">On stage</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#f2f2f2] border border-[#f2f2f2] mt-8">
                {artistsList.map((artist, idx) => (
                  <div key={idx} className="bg-white p-6 text-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden mx-auto">
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-display font-bold text-base mt-4">{artist.name}</h4>
                    <span className={`${overline} text-[#8a8a8a] block mt-1`}>{artist.role}</span>
                    <p className="text-sm text-[#666] leading-relaxed mt-3">{artist.bio}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Venue */}
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">Getting there</h2>

              {/* Stylised map tile */}
              <div className="relative h-56 bg-[#f7f7f7] overflow-hidden mt-8 border border-[#e4e4e4]">
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                  <div className="absolute w-full h-[4px] bg-white top-1/3 left-0" />
                  <div className="absolute w-full h-[4px] bg-white top-2/3 left-0" />
                  <div className="absolute w-[4px] h-full bg-white left-1/4 top-0" />
                  <div className="absolute w-[4px] h-full bg-white left-3/4 top-0" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="bg-black text-white px-4 py-2 text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                    <MapPin className="w-4 h-4 text-[#ffed00]" />
                    {event.location}
                  </div>
                  <div className="w-3 h-3 bg-black rotate-45 -mt-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#f2f2f2] border border-[#f2f2f2] mt-6">
                <div className="bg-white p-6">
                  <span className={`${overline} text-[#666]`}>By public transport</span>
                  <ul className="text-sm text-[#222] leading-relaxed mt-3 space-y-2">
                    <li><strong className="font-bold">Underground:</strong> Westminster (Jubilee / District) — 4-minute walk</li>
                    <li><strong className="font-bold">Bus:</strong> Routes 24 & 88 stop at the venue gates</li>
                  </ul>
                </div>
                <div className="bg-white p-6">
                  <span className={`${overline} text-[#666]`}>By car</span>
                  <ul className="text-sm text-[#222] leading-relaxed mt-3 space-y-2">
                    <li><strong className="font-bold">Parking:</strong> On-site Deck G — pre-book at checkout</li>
                    <li><strong className="font-bold">Drop-off:</strong> Signed lay-by directly outside the main entrance</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Organizer */}
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">Presented by</h2>

              <div className="border border-[#e4e4e4] p-6 sm:p-8 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
                      <img
                        src={organizerDetails.imageUrl}
                        alt={organizerDetails.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-lg flex items-center gap-2">
                        {organizerDetails.name}
                        <span className="bg-[#ffed00] p-0.5" title="Verified organiser">
                          <Check className="w-3.5 h-3.5 text-black" />
                        </span>
                      </h4>
                      <div className="flex items-center gap-5 mt-1.5 text-sm text-[#666]">
                        <span>{organizerFollowers.toLocaleString()} followers</span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-black text-black" /> {organizerRating}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleFollowOrganizer}
                    disabled={organizerFollowBusy}
                    className={`shrink-0 px-6 py-3 text-sm font-bold cursor-pointer transition-colors disabled:opacity-60 ${
                      isFollowingOrganizer
                        ? 'bg-white text-black border border-black hover:bg-[#f7f7f7]'
                        : 'bg-black text-white hover:bg-neutral-800'
                    }`}
                  >
                    {isFollowingOrganizer ? 'Following' : 'Follow'}
                  </button>
                </div>

                <p className="text-sm text-[#666] leading-relaxed border-t border-[#f2f2f2] mt-6 pt-5">
                  {organizerDetails.bio}
                </p>
              </div>
            </section>

            {/* Gallery */}
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">From past shows</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#f2f2f2] border border-[#f2f2f2] mt-8">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setZoomImage(img)}
                    className="group relative h-28 sm:h-36 overflow-hidden cursor-zoom-in bg-[#f7f7f7]"
                  >
                    <img
                      src={img}
                      alt={`Gallery ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">What people say</h2>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 items-center mt-8">
                <div className="sm:col-span-4 text-center sm:border-r border-[#f2f2f2] sm:pr-8">
                  <span className="font-display font-bold text-5xl leading-none">4.8</span>
                  <div className="flex items-center justify-center gap-1 mt-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-black text-black" />
                    ))}
                  </div>
                  <span className="text-sm text-[#666] block mt-2">148 reviews</span>
                </div>

                <div className="sm:col-span-8 space-y-2.5 w-full">
                  {[
                    { stars: 5, pct: 88 },
                    { stars: 4, pct: 9 },
                    { stars: 3, pct: 2 },
                    { stars: 2, pct: 1 },
                    { stars: 1, pct: 0 },
                  ].map((bar) => (
                    <div key={bar.stars} className="flex items-center gap-3 text-sm text-[#666]">
                      <span className="w-8 text-right shrink-0">{bar.stars}★</span>
                      <div className="flex-1 bg-[#f2f2f2] h-2">
                        <div className="bg-black h-full" style={{ width: `${bar.pct}%` }} />
                      </div>
                      <span className="w-10 shrink-0">{bar.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#f2f2f2] mt-8">
                {eventReviews.map((rev) => (
                  <div key={rev.id} className="py-6 border-b border-[#f2f2f2] flex gap-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                      <img src={rev.avatar} alt={rev.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h4 className="font-bold text-sm flex items-center gap-2">
                            {rev.name}
                            <span className={`${overline} border border-[#e4e4e4] px-2 py-0.5 text-[#666]`}>Verified</span>
                          </h4>
                          <span className="text-xs text-[#8a8a8a] mt-0.5 block">{rev.date}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-black text-black" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-[#222] leading-relaxed mt-3">"{rev.text}"</p>
                      <button className="flex items-center gap-1.5 text-xs font-bold text-[#666] hover:text-black mt-3 cursor-pointer transition-colors">
                        <ThumbsUp className="w-3.5 h-3.5" /> Helpful · 8
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQs */}
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">Good to know</h2>
              <div className="border-b border-[#f2f2f2] mt-4">
                {faqList.map((item) => {
                  const isOpen = openFaqId === item.id;
                  return (
                    <div key={item.id} className="border-b border-[#f2f2f2] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                        className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer group"
                      >
                        <span className="font-display font-bold text-base group-hover:opacity-70 transition-opacity">
                          {item.question}
                        </span>
                        <span className="w-8 h-8 border border-[#e4e4e4] flex items-center justify-center shrink-0">
                          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-[#666] leading-relaxed pb-5">{item.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>

          {/* RIGHT — sticky booking rail */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 lg:self-start">
            <div className="border border-black">

              <div className="px-6 py-5 border-b border-[#f2f2f2]">
                <span className={`${overline} text-[#666]`}>Tickets</span>
              </div>

              {/* Tier rows */}
              <div className="px-6 border-b border-[#f2f2f2]">
                {(['general', 'vip', 'elite'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setTicketTier(tier)}
                    className="w-full flex items-center justify-between py-4 border-b border-[#f2f2f2] last:border-b-0 cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          ticketTier === tier ? 'border-black bg-black' : 'border-[#c4c4c4] group-hover:border-black'
                        }`}
                      >
                        {ticketTier === tier && <span className="w-2 h-2 rounded-full bg-[#ffed00]" />}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-sm block">{tierMeta[tier].name}</span>
                        <span className="text-xs text-[#666] block">{tierMeta[tier].note}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <span className="font-display font-bold text-base block">${tierPricing[tier]}</span>
                      <span className={`${overline} text-[#8a8a8a]`}>{tierMeta[tier].tag}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Quantity */}
              <div className="px-6 py-5 border-b border-[#f2f2f2] flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm block">Tickets</span>
                  <span className="text-xs text-[#666]">Up to 10 per order</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((prev) => prev - 1)}
                    className="w-10 h-10 border border-black flex items-center justify-center cursor-pointer hover:bg-[#f7f7f7] disabled:opacity-30 disabled:hover:bg-white transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-display font-bold text-xl min-w-[24px] text-center">{quantity}</span>
                  <button
                    disabled={quantity >= 10}
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-10 h-10 border border-black flex items-center justify-center cursor-pointer hover:bg-[#f7f7f7] disabled:opacity-30 disabled:hover:bg-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Promo */}
              <form onSubmit={handleApplyPromo} className="px-6 py-5 border-b border-[#f2f2f2]">
                <label className={`${overline} text-[#666] block mb-2`}>Promo code</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={promoApplied}
                    placeholder="JAZBA18"
                    className="flex-1 bg-white px-0 py-2.5 text-sm text-black placeholder-[#8a8a8a] disabled:text-[#8a8a8a]"
                  />
                  <button
                    type="submit"
                    disabled={promoApplied || !promoCode}
                    className="bg-black text-white text-sm font-bold px-5 cursor-pointer hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                  >
                    {promoApplied ? 'Applied' : 'Apply'}
                  </button>
                </div>
                {promoApplied && (
                  <span className="flex items-center gap-1.5 text-sm font-bold mt-3">
                    <Check className="w-4 h-4" /> 18% discount applied
                  </span>
                )}
                {promoError && <span className="block text-sm text-[#be6464] mt-3">{promoError}</span>}
              </form>

              {/* Totals + CTA */}
              <div className="px-6 py-6">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-[#666]">
                    <span>Subtotal ({quantity} × {tierMeta[ticketTier].name})</span>
                    <span>${getSubtotal()}</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-[#666]">
                      <span>Discount (18%)</span>
                      <span>−${getDiscount()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#666]">
                    <span>Service fee (5%)</span>
                    <span>${getBookingServiceFee()}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-black mt-4 pt-4">
                    <span className="font-display font-bold text-lg">Total</span>
                    <span className="font-display font-bold text-2xl">${getTotalPrice()}</span>
                  </div>
                </div>

                <button
                  onClick={() => onBook(event, quantity, ticketTier)}
                  className="w-full bg-[#ffed00] text-black py-4 mt-6 font-bold text-sm cursor-pointer hover:bg-[#e6d200] transition-colors flex items-center justify-center gap-2"
                  id="btn-confirm-reserve"
                >
                  <Ticket className="w-4 h-4" /> Get tickets
                </button>

                <p className="text-xs text-[#8a8a8a] text-center mt-4 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Free refunds up to 24 hours before doors
                </p>
              </div>
            </div>

            {/* Trust tile — dark inversion */}
            <div className="bg-black text-white p-6 mt-6">
              <span className={`${overline} text-[#ffed00]`}>Buy with confidence</span>
              <p className="text-sm text-white/70 leading-relaxed mt-3">
                Every barcode is issued and verified by Jazbaticket. If an event is cancelled, your refund is automatic.
              </p>
              <span className="flex items-center gap-2 text-xs text-white/50 border-t border-white/15 mt-4 pt-4">
                <ShieldCheck className="w-4 h-4" /> 256-bit SSL encrypted checkout
              </span>
            </div>
          </div>
        </div>

        {/* ── RELATED EVENTS ─────────────────────────────────── */}
        <div className="border-t border-black mt-20 pt-14">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h3 className="font-display font-bold text-3xl leading-[0.95]">You might also like</h3>
              <p className="text-sm text-[#666] mt-2">More live shows near {event.location.split(',').pop()?.trim() || 'you'}.</p>
            </div>
            <button
              onClick={onBack}
              className="text-sm font-bold underline cursor-pointer shrink-0"
            >
              Browse all events
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedEvents.map((evt) => (
              <button
                key={evt.id}
                onClick={() => onSelectRelatedEvent(evt)}
                className="group text-left cursor-pointer"
              >
                <div className="h-48 overflow-hidden bg-[#f7f7f7]">
                  <img
                    src={evt.image}
                    alt={evt.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="pt-4">
                  <span className={`${overline} text-[#8a8a8a]`}>{evt.category} · {evt.date}</span>
                  <h4 className="font-display font-bold text-lg leading-tight mt-1.5 group-hover:underline">
                    {evt.title}
                  </h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-[#666] flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {evt.location}
                    </span>
                    <span className="font-bold text-sm flex items-center gap-1.5 shrink-0 pl-3">
                      From ${evt.price} <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── GALLERY ZOOM MODAL ────────────────────────────────── */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomImage(null)}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6 cursor-zoom-out"
          >
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-6 right-6 w-11 h-11 border border-white/40 text-white flex items-center justify-center hover:border-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomImage}
              alt="Gallery view"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
