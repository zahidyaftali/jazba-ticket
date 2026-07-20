import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { shareOrCopy } from '../share';
import { sendFormEmail } from '../services/formEmailService';
import {
  Check,
  X,
  Share2,
  Globe,
  MapPin,
  Star,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'about'>('upcoming');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState('');
  const [copied, setCopied] = useState(false);

  // Load real follow state & follower count for this artist
  useEffect(() => {
    let cancelled = false;
    getFollowerCount('artist', artist.id).then((count) => {
      if (!cancelled) setFollowerCount(count);
    });
    const user = auth.currentUser;
    if (user) {
      isFollowingTarget(user.uid, 'artist', artist.id).then((following) => {
        if (!cancelled) setIsFollowing(following);
      });
    } else {
      setIsFollowing(false);
    }
    return () => { cancelled = true; };
  }, [artist]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setActiveTab('upcoming');
  }, [artist]);

  const handleToggleFollow = async () => {
    const user = auth.currentUser;
    if (!user) {
      onRequireLogin();
      return;
    }
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowTarget(user.uid, 'artist', artist.id);
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await followTarget(user.uid, 'artist', artist.id);
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Error updating follow state', err);
    } finally {
      setFollowBusy(false);
    }
  };

  // Upcoming events in this artist's category — no unrelated fillers
  const upcomingEvents = useMemo(
    () => allEvents.filter((evt) => evt.category === artist.category).slice(0, 3),
    [artist, allEvents],
  );

  // Past shows exactly as entered in the admin (title / date / venue)
  const pastShows = artist.pastShows || [];

  // Hero stats — admin-managed; a stat is hidden when it hasn't been set
  const stats = useMemo(() => {
    const list: { label: string; value: string | number }[] = [{ label: 'Followers', value: followerCount }];
    if (artist.experienceYears > 0) list.push({ label: 'On stage', value: `${artist.experienceYears} yrs` });
    if (artist.eventsHosted > 0) list.push({ label: 'Events hosted', value: artist.eventsHosted });
    if (artist.totalAudience) list.push({ label: 'Total audience', value: artist.totalAudience });
    return list;
  }, [artist, followerCount]);

  const handleShare = async () => {
    try {
      const result = await shareOrCopy({
        title: artist.name,
        text: `${artist.name} — book this artist on Jazba Tickets.`,
      });
      if (result === 'copied') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to share', err);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage || isSending) return;
    setIsSending(true);
    setSendError('');
    const result = await sendFormEmail({
      formName: 'artist-booking',
      name: contactName,
      email: contactEmail,
      message: contactMessage,
      artistName: artist.name,
    });
    setIsSending(false);
    if (!result.ok) {
      setSendError(result.error || 'Could not send your enquiry. Please try again.');
      return;
    }
    setSendSuccess(true);
    setContactMessage('');
    setTimeout(() => {
      setSendSuccess(false);
      setShowContactModal(false);
    }, 2000);
  };

  const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

  return (
    <div className="jz-page bg-white min-h-screen text-black" id={`artist-detail-${artist.id}`}>

      {/* ── HERO — black storytelling band ────────────────────── */}
      <section className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-14 sm:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">

            {/* Identity block */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-7">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shrink-0 border border-white/20">
                <img
                  src={artist.avatar}
                  alt={artist.name}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <span className={`${overline} text-[#ffed00]`}>{artist.subCategory}</span>
                <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-[56px] leading-[0.95] tracking-tight mt-2">
                  {artist.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 text-sm text-white/70">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {artist.location}
                  </span>
                  {artist.socials?.web && (
                    <a
                      href={artist.socials.web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      {artist.socials.web.replace('https://', '')}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleToggleFollow}
                disabled={followBusy}
                className={`h-12 px-7 text-sm font-bold cursor-pointer transition-colors disabled:opacity-60 flex items-center gap-2 ${
                  isFollowing
                    ? 'bg-black text-white border border-white hover:bg-white/10'
                    : 'bg-[#ffed00] text-black hover:bg-[#e6d200]'
                }`}
                id="artist-detail-follow"
              >
                {isFollowing ? (<><Check className="w-4 h-4 stroke-[3]" /> Following</>) : 'Follow'}
              </button>
              <button
                onClick={() => setShowContactModal(true)}
                className="h-12 px-7 bg-black text-white border border-white text-sm font-bold cursor-pointer hover:bg-white/10 transition-colors"
                id="artist-detail-contact"
              >
                Contact
              </button>
              <button
                onClick={handleShare}
                className="h-12 w-12 bg-black text-white border border-white flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors relative"
                title="Copy profile link"
                id="artist-detail-share"
              >
                {copied && (
                  <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold py-1 px-3 whitespace-nowrap">
                    Link copied
                  </span>
                )}
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats row — only admin-set stats appear */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 border-t border-white/15 mt-12 pt-8">
            {stats.map((s) => (
              <div key={s.label} className="pr-4 sm:px-10 sm:first:pl-0 sm:border-r sm:border-white/15 sm:last:border-r-0">
                <div className={`${overline} text-white/50`}>{s.label}</div>
                <div className="font-display font-bold text-2xl sm:text-3xl mt-2">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TABS — white catalogue band (Past shows only when added) ── */}
      <div className="border-b border-[#f2f2f2] bg-white sticky top-[60px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex">
          {([
            { id: 'upcoming', label: 'Upcoming shows' },
            ...(pastShows.length > 0 ? [{ id: 'past', label: 'Past shows' }] : []),
            { id: 'about', label: 'About & booking' },
          ] as { id: 'upcoming' | 'past' | 'about'; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 sm:px-7 py-4 text-sm font-bold transition-colors relative cursor-pointer ${
                activeTab === tab.id ? 'text-black' : 'text-[#8a8a8a] hover:text-black'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="artistTabLine" className="absolute bottom-0 left-0 right-0 h-[3px] bg-black" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-14 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {/* UPCOMING */}
            {activeTab === 'upcoming' && (
              <div>
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <h2 className="font-display font-bold text-3xl leading-[0.95]">Upcoming shows</h2>
                    <p className="text-[#666] text-sm mt-2">Live dates featuring {artist.name}. Tickets go fast.</p>
                  </div>
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
                  <div className="border border-[#f2f2f2] py-16 text-center">
                    <p className="font-bold text-black">No live dates announced yet.</p>
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="mt-4 text-sm font-bold underline cursor-pointer"
                    >
                      Enquire about a private booking
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PAST */}
            {activeTab === 'past' && (
              <div>
                <div className="mb-8">
                  <h2 className="font-display font-bold text-3xl leading-[0.95]">Past shows</h2>
                  <p className="text-[#666] text-sm mt-2">A track record of sold-out rooms and standing ovations.</p>
                </div>

                <div className="border-t border-[#f2f2f2]">
                  {pastShows.length > 0 ? pastShows.map((show, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-6 border-b border-[#f2f2f2]"
                    >
                      <div className="flex items-center gap-6">
                        <span className="text-sm text-[#666] w-32 shrink-0">{show.date}</span>
                        <div>
                          <h4 className="font-display font-bold text-lg leading-tight">{show.title}</h4>
                          <span className="flex items-center gap-1.5 text-sm text-[#666] mt-1">
                            <MapPin className="w-3.5 h-3.5" /> {show.venue}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#8a8a8a] border border-[#e4e4e4] px-3 py-1.5 w-fit">
                        Completed
                      </span>
                    </div>
                  )) : (
                    <p className="py-10 text-sm text-[#666]">Show history will appear here.</p>
                  )}
                </div>
              </div>
            )}

            {/* ABOUT & BOOKING */}
            {activeTab === 'about' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Biography */}
                <div className="lg:col-span-7">
                  <h2 className="font-display font-bold text-3xl leading-[0.95]">About {artist.name}</h2>
                  {artist.bio && (
                    <p className="text-[#222] text-base leading-relaxed mt-6 whitespace-pre-line">
                      {artist.bio}
                    </p>
                  )}

                  {/* Fact rows — only facts that were set in the admin */}
                  <div className="border-t border-[#f2f2f2] mt-10">
                    {[
                      { label: 'Fee per event', value: 'POR' },
                      ...(artist.experienceYears > 0 ? [{ label: 'Experience', value: `${artist.experienceYears} years on stage` }] : []),
                      ...(artist.location ? [{ label: 'Based in', value: artist.location }] : []),
                      ...(artist.subCategory ? [{ label: 'Category', value: artist.subCategory }] : []),
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-5 border-b border-[#f2f2f2]">
                        <span className={`${overline} text-[#666]`}>{row.label}</span>
                        <span className="font-display font-bold text-lg">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booking rail */}
                <div className="lg:col-span-5 space-y-px">

                  {/* Rating tile — only when a rating was set in the admin */}
                  <div className="border border-black p-7">
                    {artist.rating > 0 && (
                      <>
                        <span className={`${overline} text-[#666]`}>Audience rating</span>
                        <div className="flex items-center gap-3 mt-3">
                          <Star className="w-6 h-6 fill-black text-black" />
                          <span className="font-display font-bold text-4xl leading-none">{artist.rating.toFixed(1)}</span>
                          {artist.totalReviews > 0 && (
                            <span className="text-sm text-[#666]">({artist.totalReviews} reviews)</span>
                          )}
                        </div>
                      </>
                    )}
                    <div className={`flex items-start gap-3 ${artist.rating > 0 ? 'border-t border-[#f2f2f2] mt-6 pt-5' : ''}`}>
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <p className="text-sm text-[#222]">
                        <strong className="font-bold">Verified performer.</strong> Identity checked, fee agreed upfront, payment held in escrow until the show is done.
                      </p>
                    </div>
                  </div>

                  {/* Booking CTA tile — the one yellow moment */}
                  <div className="bg-[#ffed00] text-black p-7 mt-6">
                    <span className={`${overline} text-black/60`}>Book this artist</span>
                    <h3 className="font-display font-bold text-2xl leading-[0.95] mt-2">
                      One flat fee. One great night.
                    </h3>
                    <p className="text-sm text-black/70 mt-3">
                      Price on request — venue, date, set and fee agreed directly with our booking team.
                    </p>
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="mt-5 bg-black text-white text-sm font-bold px-6 py-3.5 cursor-pointer hover:bg-neutral-800 transition-colors flex items-center gap-2"
                    >
                      Request availability <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Streams — only links that were added; hidden when none */}
                  {(artist.socials?.spotify || artist.socials?.youtube) && (
                    <div className="border border-[#e4e4e4] mt-6">
                      <div className={`${overline} text-[#666] px-6 pt-5 pb-3`}>Listen & watch</div>
                      {artist.socials?.spotify && (
                        <a
                          href={artist.socials.spotify}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between px-6 py-4 border-t border-[#f2f2f2] hover:bg-[#f7f7f7] transition-colors"
                        >
                          <span className="text-sm font-bold">Spotify</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      )}
                      {artist.socials?.youtube && (
                        <a
                          href={artist.socials.youtube}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between px-6 py-4 border-t border-[#f2f2f2] hover:bg-[#f7f7f7] transition-colors"
                        >
                          <span className="text-sm font-bold">YouTube</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── CONTACT MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" id="contact-overlay">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="bg-white max-w-md w-full p-8 relative border border-black"
              id="contact-artist-modal"
            >
              <button
                onClick={() => setShowContactModal(false)}
                className="absolute top-5 right-5 w-9 h-9 border border-[#e4e4e4] flex items-center justify-center hover:border-black transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <span className={`${overline} text-[#666]`}>Booking enquiry</span>
              <h3 className="font-display font-bold text-2xl leading-[0.95] mt-2">
                Contact {artist.name}
              </h3>
              <p className="text-sm text-[#666] mt-3">
                Tell us your date, venue and audience size — we'll confirm availability and a fixed per-event fee within 2 hours.
              </p>

              {sendSuccess ? (
                <div className="mt-8 flex items-start gap-3" id="contact-success-notice">
                  <div className="w-10 h-10 bg-[#ffed00] flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-black stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">Enquiry sent</h4>
                    <p className="text-sm text-[#666] mt-1">
                      Our booking team will reply to your email with a quote and available dates.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="mt-6 space-y-5">
                  <div>
                    <label className={`${overline} text-[#666] block mb-2`}>Your name</label>
                    <input
                      type="text" required value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Liam Hall"
                      className="w-full bg-[#f7f7f7] px-3 py-3 text-sm text-black placeholder-[#8a8a8a]"
                    />
                  </div>
                  <div>
                    <label className={`${overline} text-[#666] block mb-2`}>Email address</label>
                    <input
                      type="email" required value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#f7f7f7] px-3 py-3 text-sm text-black placeholder-[#8a8a8a]"
                    />
                  </div>
                  <div>
                    <label className={`${overline} text-[#666] block mb-2`}>Event details</label>
                    <textarea
                      required rows={4} value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Date, venue, city and audience size…"
                      className="w-full bg-[#f7f7f7] px-3 py-3 text-sm text-black placeholder-[#8a8a8a] resize-none"
                    />
                  </div>
                  {sendError && (
                    <div className="flex items-start gap-2 bg-[#f7f7f7] border-l-2 border-[#be6464] text-[#be6464] text-xs font-bold p-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{sendError}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full bg-[#ffed00] text-black font-bold text-sm py-4 cursor-pointer hover:bg-[#e6d200] transition-colors disabled:opacity-60"
                    id="submit-contact-form"
                  >
                    {isSending ? 'Sending…' : 'Send enquiry'}
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
