import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shareOrCopy } from '../share';
import {
  ArrowLeft, Check, Share2, Globe, MapPin, Mail, PhoneCall, Building2, Loader2,
} from 'lucide-react';
import { EventItem } from '../types';
import EventCard from './EventCard';
import { auth } from '../firebase';
import {
  getOrganizerById,
  followTarget,
  unfollowTarget,
  isFollowingTarget,
  getFollowerCount,
  OrganizerProfile,
} from '../services/backendService';

interface OrganizerDetailPageProps {
  allEvents: EventItem[];
  onRequireLogin: () => void;
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

export default function OrganizerDetailPage({ allEvents, onRequireLogin }: OrganizerDetailPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!id) return;
    setLoading(true);
    getOrganizerById(id)
      .then((org) => setOrganizer(org))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    getFollowerCount('organizer', id).then((count) => {
      if (!cancelled) setFollowerCount(count);
    });
    const user = auth.currentUser;
    if (user) {
      isFollowingTarget(user.uid, 'organizer', id).then((following) => {
        if (!cancelled) setIsFollowing(following);
      });
    } else {
      setIsFollowing(false);
    }
    return () => { cancelled = true; };
  }, [id]);

  const handleToggleFollow = async () => {
    const user = auth.currentUser;
    if (!user) {
      onRequireLogin();
      return;
    }
    if (!id || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowTarget(user.uid, 'organizer', id);
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await followTarget(user.uid, 'organizer', id);
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Error updating follow state', err);
    } finally {
      setFollowBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      const result = await shareOrCopy({
        title: document.title,
        text: 'Event organiser on Jazbaticket.',
      });
      if (result === 'copied') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to share', err);
    }
  };

  // Events this organiser is behind — matched by creator id or by the
  // organiser name entered on the event in the admin.
  const organizerEvents = useMemo(() => {
    if (!organizer) return [];
    return allEvents.filter((evt: any) =>
      (organizer.userId && evt.organizerId === organizer.userId) ||
      (organizer.companyName && (evt.organizerName || '').toLowerCase() === organizer.companyName.toLowerCase()),
    );
  }, [organizer, allEvents]);

  if (loading) {
    return (
      <div className="jz-page bg-white min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-black" />
      </div>
    );
  }

  if (!organizer) {
    return (
      <div className="jz-page bg-white min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <Building2 className="w-8 h-8" />
        <h1 className="font-display font-bold text-2xl mt-4">Organiser not found</h1>
        <p className="text-sm text-[#666] mt-2">This profile may have been removed.</p>
        <button
          onClick={() => navigate('/organizers')}
          className="mt-6 bg-black text-white text-sm font-bold px-6 py-3.5 cursor-pointer hover:bg-neutral-800 transition-colors"
        >
          Browse all organisers
        </button>
      </div>
    );
  }

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id={`organizer-detail-${organizer.id}`}>

      {/* ── HERO — black band with optional banner ─────────────── */}
      <section className="bg-black text-white relative overflow-hidden">
        {organizer.bannerUrl && (
          <div className="absolute inset-0">
            <img
              src={organizer.bannerUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-14 sm:py-20 relative z-10">
          <button
            onClick={() => navigate('/organizers')}
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> All organisers
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mt-10">
            {/* Identity */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-7">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shrink-0 border border-white/20 bg-[#111] flex items-center justify-center">
                {organizer.logoUrl ? (
                  <img src={organizer.logoUrl} alt={organizer.companyName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-10 h-10 text-[#ffed00]" />
                )}
              </div>
              <div>
                <span className={`${overline} text-[#ffed00]`}>Event organiser</span>
                <h1 className="font-display font-bold text-4xl sm:text-5xl leading-[0.95] tracking-tight mt-2">
                  {organizer.companyName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 text-sm text-white/70">
                  {organizer.location && (
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {organizer.location}</span>
                  )}
                  {organizer.website && (
                    <a
                      href={organizer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      <Globe className="w-4 h-4" /> {organizer.website.replace(/^https?:\/\//, '')}
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
              >
                {isFollowing ? (<><Check className="w-4 h-4 stroke-[3]" /> Following</>) : 'Follow'}
              </button>
              {organizer.email && (
                <a
                  href={`mailto:${organizer.email}`}
                  className="h-12 px-7 bg-black text-white border border-white text-sm font-bold cursor-pointer hover:bg-white/10 transition-colors flex items-center"
                >
                  Contact
                </a>
              )}
              <button
                onClick={handleShare}
                className="h-12 w-12 bg-black text-white border border-white flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors relative"
                title="Copy profile link"
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

          {/* Stats — live numbers only */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 border-t border-white/15 mt-12 pt-8">
            <div className="pr-4 sm:px-10 sm:first:pl-0 sm:border-r sm:border-white/15">
              <div className={`${overline} text-white/50`}>Followers</div>
              <div className="font-display font-bold text-2xl sm:text-3xl mt-2">{followerCount}</div>
            </div>
            <div className="pr-4 sm:px-10 sm:border-r sm:border-white/15 sm:last:border-r-0">
              <div className={`${overline} text-white/50`}>Live events</div>
              <div className="font-display font-bold text-2xl sm:text-3xl mt-2">{organizerEvents.length}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* LEFT — about + events */}
          <div className="lg:col-span-8 space-y-14">

            {/* About — only when a description was added */}
            {organizer.description && (
              <section>
                <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">
                  About {organizer.companyName}
                </h2>
                <p className="text-base text-[#222] leading-relaxed mt-6 whitespace-pre-line">
                  {organizer.description}
                </p>
              </section>
            )}

            {/* Specialties — only when added */}
            {(organizer.specialties?.length || 0) > 0 && (
              <section>
                <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">What they do</h2>
                <div className="flex flex-wrap gap-px bg-[#e4e4e4] border border-[#e4e4e4] mt-8 w-fit">
                  {organizer.specialties!.map((s) => (
                    <span key={s} className="bg-white px-5 py-3 text-sm font-bold">{s}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Events */}
            <section>
              <h2 className="font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4">
                Events by {organizer.companyName}
              </h2>
              {organizerEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                  {organizerEvents.map((evt) => (
                    <EventCard
                      key={evt.id}
                      event={evt}
                      onBook={(e) => navigate('/checkout', { state: { event: e, quantity: 1, tier: 'general' } })}
                      onViewDetail={(e) => navigate(`/events/${e.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-[#f2f2f2] py-16 text-center mt-8">
                  <p className="font-bold">No live events right now.</p>
                  <p className="text-sm text-[#666] mt-2">Follow {organizer.companyName} to hear about their next show first.</p>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT — contact rail */}
          <div className="lg:col-span-4 lg:sticky lg:top-20 lg:self-start space-y-6">

            {/* Contact tile — only rows that exist */}
            {(organizer.email || organizer.phone || organizer.website) && (
              <div className="border border-black">
                <div className="px-6 py-5 border-b border-[#f2f2f2]">
                  <span className={`${overline} text-[#666]`}>Get in touch</span>
                </div>
                {organizer.email && (
                  <a href={`mailto:${organizer.email}`} className="flex items-center gap-3 px-6 py-4 border-b border-[#f2f2f2] hover:bg-[#f7f7f7] transition-colors">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-bold truncate">{organizer.email}</span>
                  </a>
                )}
                {organizer.phone && (
                  <a href={`tel:${organizer.phone}`} className="flex items-center gap-3 px-6 py-4 border-b border-[#f2f2f2] hover:bg-[#f7f7f7] transition-colors">
                    <PhoneCall className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-bold">{organizer.phone}</span>
                  </a>
                )}
                {organizer.website && (
                  <a href={organizer.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-4 hover:bg-[#f7f7f7] transition-colors">
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-bold truncate">{organizer.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            )}

            {/* List-your-event tile — the one yellow moment */}
            <div className="bg-[#ffed00] text-black p-7">
              <span className={`${overline} text-black/60`}>Are you an organiser?</span>
              <h3 className="font-display font-bold text-2xl leading-[0.95] mt-2">
                Put your event on Jazbatickets.
              </h3>
              <p className="text-sm text-black/70 mt-3">
                List your show, sell tickets securely and get your own organiser profile — free to start.
              </p>
              <button
                onClick={() => navigate('/contact')}
                className="mt-5 bg-black text-white text-sm font-bold px-6 py-3.5 cursor-pointer hover:bg-neutral-800 transition-colors"
              >
                Talk to us
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
