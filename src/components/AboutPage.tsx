import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Music2,
  Disc3,
  Clapperboard,
  Megaphone,
  Sparkles,
  ArrowRight,
  Check,
  MapPin,
} from 'lucide-react';

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const STATS = [
  { value: '2005', label: 'Established in Birmingham, UK' },
  { value: '20+', label: 'Years in music & film production' },
  { value: '2', label: 'Recording studios — Birmingham & Lahore' },
  { value: '3', label: 'Production bases — Birmingham, Lahore, Islamabad' },
];

const SERVICES = [
  {
    icon: Music2,
    title: 'Live events & festivals',
    body: 'We produce and promote live music events and festivals — and Jazbatickets is where you find and book tickets to them, securely and simply.',
  },
  {
    icon: Disc3,
    title: 'Artist management, publishing & distribution',
    body: 'We manage artists, publish their music and distribute it worldwide — which is why, uniquely, you can book the artists behind our events directly for your own.',
  },
  {
    icon: Clapperboard,
    title: 'Studios & film production',
    body: 'Recording studios in Birmingham and Lahore, plus film production equipment available for hire in Islamabad.',
  },
  {
    icon: Megaphone,
    title: 'Design & marketing',
    body: 'Graphics and web design, and social media marketing and management — all built around music.',
  },
];

const HOW_IT_WORKS = [
  {
    audience: 'For fans',
    steps: [
      { step: '01', title: 'Find your night', body: 'Search by artist, venue, city or date — every listing is verified before it goes on sale.' },
      { step: '02', title: 'Pay your way', body: 'Checkout detects your location and shows local prices and payment methods automatically.' },
      { step: '03', title: 'Walk straight in', body: 'Your barcode lands in your inbox and dashboard instantly. Show it at the door — printed or on your phone.' },
    ],
  },
  {
    audience: 'For artists',
    steps: [
      { step: '01', title: 'Join the roster', body: 'Apply with your profile, past shows and streaming links. We verify every performer personally.' },
      { step: '02', title: 'Set one flat fee', body: 'You decide what a night of your work costs — per event, never per hour. No hidden deductions.' },
      { step: '03', title: 'Play, then get paid', body: 'We hold the booking fee in escrow and release it straight after the show. On time, every time.' },
    ],
  },
  {
    audience: 'For organisers',
    steps: [
      { step: '01', title: 'List your event', body: 'Create your show in minutes — venue, dates, ticket tiers and pricing, all from one dashboard.' },
      { step: '02', title: 'Sell everywhere', body: 'Your event appears across the platform with secure checkout in your buyers\' local currency.' },
      { step: '03', title: 'Track in real time', body: 'Live sales, scans at the gate, and revenue reports — with payouts on a schedule you can plan around.' },
    ],
  },
];

const GUARANTEES = [
  'Full refund if an event is cancelled — including all fees',
  'Free cancellation within 24 hours of booking (event 72+ hours away)',
  'Cancel up to 7 days before the event for a refund minus a 10% admin fee',
  'Every barcode verified live at the venue gate',
  'Card details never stored on our servers',
  'UK-based support — Mon–Fri, 9am–5:30pm on 0333 5777 014',
];

const CITIES = ['Birmingham', 'London', 'Manchester', 'Leeds', 'Bristol', 'Glasgow', 'Lahore', 'Islamabad', 'Karachi'];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="jz-page bg-white min-h-screen text-black" id="about-page-root">

      {/* ── HERO — dark storytelling band ─────────────────────── */}
      <section className="relative bg-[#121212] min-h-[420px] h-[60vh] px-4 sm:px-6 md:px-8 overflow-hidden z-10 flex items-center">
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
            alt="Live concert crowd"
            className="w-full h-full object-cover opacity-25"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/45" />
        </div>
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide text-neutral-400 bg-white/5 backdrop-blur-md px-3.5 py-1.5">
            <span onClick={() => navigate('/')} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">About</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight leading-[0.95] max-w-3xl text-white">
            We put live experiences <span className="text-[#ffed00]">within reach.</span>
          </h1>
          <p className="text-neutral-300 font-normal text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
            Jazbatickets is the ticketing and artist booking platform from Jazba Entertainment Ltd — a music and video/film production company based in Birmingham, UK, established in 2005. A straightforward way to find and book tickets to great live events, and — uniquely — to book the artists behind them directly for your own event.
          </p>
        </div>
      </section>

      {/* ── STATS — yellow accent band ────────────────────────── */}
      <section className="bg-[#ffed00] text-black px-4 sm:px-6 md:px-8 py-14">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-display font-bold text-3xl sm:text-4xl leading-none">{s.value}</div>
              <div className="text-sm font-medium text-black/70 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OUR STORY — white catalogue band ──────────────────── */}
      <section className="px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <span className={`${overline} text-[#666]`}>Our story</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-3">
              Two decades of music, from studio to stage.
            </h2>
          </div>
          <div className="lg:col-span-7 text-base text-[#222] leading-relaxed space-y-5">
            <p>
              Jazbatickets is the ticketing and artist booking platform from <strong className="font-bold">Jazba Entertainment Ltd</strong> — a music and video/film production company based in Birmingham, UK, established in 2005.
            </p>
            <p>
              We work across live music events and festivals, artist management, music publishing, and music distribution, with recording studios in Birmingham and Lahore, and film production equipment available for hire in Islamabad. Alongside our production and management work, we also provide graphics and web design, and social media marketing and management — all built around music.
            </p>
            <p>
              Jazbatickets brings that experience together in one place: a straightforward way to find and book tickets to great live events, and — uniquely — <strong className="font-bold">to book the artists behind them directly for your own event.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── VALUES — hairline tile grid ───────────────────────── */}
      <section className="px-4 sm:px-6 md:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <span className={`${overline} text-[#666]`}>What we do</span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] max-w-xl mt-3">
            Everything we do is built around music.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#e4e4e4] mt-10 border border-[#e4e4e4]">
            {SERVICES.map((v) => (
              <div key={v.title} className="bg-white p-8">
                <v.icon className="w-6 h-6 text-black" />
                <h3 className="font-display font-bold text-lg mt-5">{v.title}</h3>
                <p className="text-sm text-[#666] leading-relaxed mt-3">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — black storytelling band ────────────── */}
      <section className="bg-black text-white px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <span className={`${overline} text-[#ffed00]`}>How it works</span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] max-w-xl mt-3">
            One platform, three ways in.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-12">
            {HOW_IT_WORKS.map((group) => (
              <div key={group.audience}>
                <h3 className="font-display font-bold text-xl border-b border-white/15 pb-4">
                  {group.audience}
                </h3>
                <div>
                  {group.steps.map((s) => (
                    <div key={s.step} className="flex gap-5 py-5 border-b border-white/15 last:border-b-0">
                      <span className="font-display font-bold text-lg text-[#ffed00] shrink-0">{s.step}</span>
                      <div>
                        <h4 className="font-bold text-base">{s.title}</h4>
                        <p className="text-sm text-white/60 leading-relaxed mt-1.5">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUARANTEES — white catalogue band ─────────────────── */}
      <section className="px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <span className={`${overline} text-[#666]`}>The Jazbatickets guarantee</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-3">
              In writing, not in spirit.
            </h2>
            <p className="text-base text-[#222] leading-relaxed mt-5 max-w-md">
              Every order on the platform is covered by the same six commitments — printed on your receipt, honoured at the gate.
            </p>
          </div>
          <div className="lg:col-span-7 border-t border-[#f2f2f2]">
            {GUARANTEES.map((g) => (
              <div key={g} className="flex items-center gap-4 py-5 border-b border-[#f2f2f2]">
                <span className="w-8 h-8 bg-[#f7f7f7] border border-[#e4e4e4] flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </span>
                <span className="text-base font-medium">{g}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITIES — soft band ────────────────────────────────── */}
      <section className="bg-[#f7f7f7] px-4 sm:px-6 md:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className={`${overline} text-[#666]`}>Where we operate</span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl leading-[0.95] mt-3 max-w-lg">
            From Birmingham to Lahore — wherever live music happens.
          </h2>
          <div className="flex flex-wrap gap-px bg-[#e4e4e4] border border-[#e4e4e4] mt-8 w-fit">
            {CITIES.map((city) => (
              <span key={city} className="bg-white px-5 py-3 text-sm font-bold">
                {city}
              </span>
            ))}
            <button
              onClick={() => navigate('/events')}
              className="bg-black text-white px-5 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
            >
              See what's on →
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA — black closing band ──────────────────────────── */}
      <section className="bg-black text-white px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <Sparkles className="w-6 h-6 text-[#ffed00]" />
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-5 max-w-md">
              Ready when you are.
            </h2>
            <p className="text-white/70 text-sm mt-4 max-w-md">
              Browse tonight's shows, book the artist for your own event, or get in touch at support@jazbaentertainment.net or 0333 5777 014 — Mon–Fri, 9am–5:30pm UK time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/events')}
              className="bg-[#ffed00] text-black font-bold text-sm px-6 py-3.5 flex items-center gap-2 cursor-pointer hover:bg-[#e6d200] transition-colors"
            >
              <Ticket className="w-4 h-4" /> Find events
            </button>
            <button
              onClick={() => navigate('/artists')}
              className="bg-black text-white border border-white font-bold text-sm px-6 py-3.5 cursor-pointer hover:bg-white/10 transition-colors"
            >
              Book an artist
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="bg-black text-white border border-white font-bold text-sm px-6 py-3.5 cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              Contact us <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
