import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Calendar, MapPin, Clock, Ticket, Check, Star,
  Share2, ShieldCheck, Heart, Plus, Minus, ChevronDown, ChevronUp, Image as ImageIcon, X, ArrowRight,
} from 'lucide-react';
import { EventItem, TicketTier, getAvailableTiers, isPastEvent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { getOrganizerProfile, followTarget, unfollowTarget, isFollowingTarget, getFollowerCount, OrganizerProfile } from '../services/backendService';
import { shareOrCopy } from '../share';
import { useLocalCurrency } from '../currency';

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
  const { format } = useLocalCurrency();
  const eventEnded = isPastEvent(event);

  // Booking rail
  const [ticketTier, setTicketTier] = useState<TicketTier>('general');
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
    setTicketTier(getAvailableTiers(event)[0]?.tier || 'general');
    setPromoApplied(false);
    setPromoCode('');
    setPromoError('');
    setOpenFaqId(null);
  }, [event]);

  // Pricing — admin-set package prices; only offered packages are shown
  const availableTiers = getAvailableTiers(event);
  const tierPricing: Record<TicketTier, number> = {
    general: availableTiers.find((t) => t.tier === 'general')?.price ?? event.price,
    vip: availableTiers.find((t) => t.tier === 'vip')?.price ?? 0,
    elite: availableTiers.find((t) => t.tier === 'elite')?.price ?? 0,
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

  const handleShare = async () => {
    const result = await shareOrCopy({
      title: event.title,
      text: `${event.title} — ${event.date}, ${event.location}. Tickets on Jazba Tickets.`,
    });
    if (result === 'copied') {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  // ---- Page content: everything below is admin-managed on the event
  // document. A section only renders when its content has been added. ----
  const description = event.description?.trim() || '';
  const highlights = event.highlights?.length ? event.highlights : [];
  const artistsList = event.lineup?.length ? event.lineup : [];
  const agendaSchedule = (event.agenda || []).map((item, idx) => ({ ...item, id: idx }));
  const venueTransport = event.venueInfo?.transport?.length ? event.venueInfo.transport : [];
  const venueParking = event.venueInfo?.parking?.length ? event.venueInfo.parking : [];
  const mapUrl = event.venueInfo?.mapUrl?.trim() || '';
  const galleryImages = event.gallery?.length ? event.gallery : [];
  const faqList = (event.faqs || []).map((f, idx) => ({ ...f, id: idx }));

  // Live Google Map: accepts a Google Maps embed URL, a share/place URL, or a
  // plain venue address. Share URLs are reduced to a clean place query (or
  // coordinates) before embedding — feeding a raw URL into the search embed is
  // what triggers Google's "Some custom on-map content could not be displayed".
  const mapEmbedSrc = (() => {
    if (!mapUrl) return '';
    if (mapUrl.includes('google.com/maps/embed')) return mapUrl;
    let query = mapUrl;
    if (/^https?:\/\//i.test(mapUrl)) {
      const placeMatch = mapUrl.match(/\/maps\/place\/([^/@?]+)/);
      const coordMatch = mapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      let qParam = '';
      try { qParam = new URL(mapUrl).searchParams.get('q') || ''; } catch { /* not a parseable URL */ }
      query =
        qParam ||
        (placeMatch ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')) : '') ||
        (coordMatch ? `${coordMatch[1]},${coordMatch[2]}` : '') ||
        event.location;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&ie=UTF8&output=embed`;
  })();

  const hasVenueSection = !!mapEmbedSrc || venueTransport.length > 0 || venueParking.length > 0;

  // Organizer card: live organiser profile first, then admin-entered
  // details on the event itself; hidden when neither exists.
  const organizerDetails = organizerProfile || event.organizerName?.trim()
    ? {
        name: organizerProfile?.companyName || event.organizerName || '',
        bio: organizerProfile?.description || event.organizerBio || '',
        imageUrl: organizerProfile?.logoUrl || event.organizerImage || '',
      }
    : null;

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
          {artistsList.length > 0 && (
            <p className="text-white/70 text-base sm:text-lg mt-5 max-w-2xl leading-relaxed">
              One night, one stage — featuring {artistsList.slice(0, 3).map((a) => a.name).join(', ')}.
            </p>
          )}

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

            {/* About — only when a description or highlights were added */}
            {(description || highlights.length > 0) && (
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">About this event</h2>
              {description && (
                <div className="text-base text-[#222] leading-relaxed mt-6 space-y-4">
                  {description.split('\n').filter(Boolean).map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              )}

              {highlights.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 border-t border-[#f2f2f2] mt-8">
                  {highlights.map((h) => (
                    <div key={h} className="flex items-center gap-3 py-4 border-b border-[#f2f2f2] text-sm">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}

            {/* Schedule — only when a running order was added */}
            {agendaSchedule.length > 0 && (
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
            )}

            {/* Lineup — only when performers were added */}
            {artistsList.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">On stage</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#f2f2f2] border border-[#f2f2f2] mt-8">
                {artistsList.map((artist, idx) => (
                  <div key={idx} className="bg-white p-6 text-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden mx-auto bg-[#f2f2f2] flex items-center justify-center">
                      {artist.avatar ? (
                        <img
                          src={artist.avatar}
                          alt={artist.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-lg">{artist.name.charAt(0)}</span>
                      )}
                    </div>
                    <h4 className="font-display font-bold text-base mt-4">{artist.name}</h4>
                    <span className={`${overline} text-[#8a8a8a] block mt-1`}>{artist.role}</span>
                    <p className="text-sm text-[#666] leading-relaxed mt-3">{artist.bio}</p>
                  </div>
                ))}
              </div>
            </section>
            )}

            {/* Venue — only when a map, transport or parking info was added */}
            {hasVenueSection && (
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">Getting there</h2>

              {/* Live Google Map */}
              {mapEmbedSrc && (
                <div className="relative h-72 overflow-hidden mt-8 border border-[#e4e4e4] bg-[#f7f7f7]">
                  <iframe
                    src={mapEmbedSrc}
                    title={`Map — ${event.location}`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              {(venueTransport.length > 0 || venueParking.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#f2f2f2] border border-[#f2f2f2] mt-6">
                  {venueTransport.length > 0 && (
                    <div className="bg-white p-6">
                      <span className={`${overline} text-[#666]`}>By public transport</span>
                      <ul className="text-sm text-[#222] leading-relaxed mt-3 space-y-2">
                        {venueTransport.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {venueParking.length > 0 && (
                    <div className="bg-white p-6">
                      <span className={`${overline} text-[#666]`}>By car</span>
                      <ul className="text-sm text-[#222] leading-relaxed mt-3 space-y-2">
                        {venueParking.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
            )}

            {/* Organizer — only when an organiser profile or admin details exist */}
            {organizerDetails && (
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">Presented by</h2>

              <div className="border border-[#e4e4e4] p-6 sm:p-8 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-[#f2f2f2] flex items-center justify-center">
                      {organizerDetails.imageUrl ? (
                        <img
                          src={organizerDetails.imageUrl}
                          alt={organizerDetails.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-lg">{organizerDetails.name.charAt(0)}</span>
                      )}
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

                  {organizerTargetId && (
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
                  )}
                </div>

                {organizerDetails.bio && (
                  <p className="text-sm text-[#666] leading-relaxed border-t border-[#f2f2f2] mt-6 pt-5">
                    {organizerDetails.bio}
                  </p>
                )}
              </div>
            </section>
            )}

            {/* Gallery — only when past-show images were added */}
            {galleryImages.length > 0 && (
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
            )}

            {/* FAQs — only when questions were added */}
            {faqList.length > 0 && (
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
            )}

          </div>

          {/* RIGHT — sticky booking rail (or "event ended" notice) */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 lg:self-start">
            {eventEnded ? (
            <div className="border border-black p-8">
              <span className={`${overline} bg-black text-white px-3 py-1.5 inline-block`}>Past event</span>
              <h3 className="font-display font-bold text-2xl leading-[0.95] mt-4">This event has ended</h3>
              <p className="text-sm text-[#666] leading-relaxed mt-3">
                {event.title} took place on {event.fullDate || `${event.date} ${event.year || ''}`.trim()} at {event.location}. Tickets are no longer on sale.
              </p>
              <button
                onClick={onBack}
                className="mt-6 w-full bg-[#ffed00] text-black py-4 font-bold text-sm cursor-pointer hover:bg-[#e6d200] transition-colors"
              >
                Browse upcoming events
              </button>
            </div>
            ) : (
            <div className="border border-black">

              <div className="px-6 py-5 border-b border-[#f2f2f2]">
                <span className={`${overline} text-[#666]`}>Tickets</span>
              </div>

              {/* Tier rows — only the packages this event offers */}
              <div className="px-6 border-b border-[#f2f2f2]">
                {availableTiers.map(({ tier }) => (
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
                      <span className="font-display font-bold text-base block">{format(tierPricing[tier])}</span>
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
                    <span>{format(getSubtotal())}</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-[#666]">
                      <span>Discount (18%)</span>
                      <span>−{format(getDiscount())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#666]">
                    <span>Service fee (5%)</span>
                    <span>{format(getBookingServiceFee())}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-black mt-4 pt-4">
                    <span className="font-display font-bold text-lg">Total</span>
                    <span className="font-display font-bold text-2xl">{format(getTotalPrice())}</span>
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
            )}
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
                      From {format(evt.price)} <ArrowRight className="w-4 h-4" />
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
