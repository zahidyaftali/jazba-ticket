import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Shield,
  Users,
  Globe,
  Sparkles,
  ArrowRight,
  Check,
  MapPin,
} from 'lucide-react';

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const STATS = [
  { value: '10,000+', label: 'Live events on sale' },
  { value: '2.4M', label: 'Tickets delivered' },
  { value: '1,800+', label: 'Verified artists' },
  { value: '40+', label: 'Cities covered' },
];

const VALUES = [
  {
    icon: Shield,
    title: 'Every ticket is real',
    body: 'Barcodes are issued and validated by us at the gate. If an event is cancelled, refunds are automatic — no queues, no arguments.',
  },
  {
    icon: Users,
    title: 'Fair for artists',
    body: 'Performers set one flat fee per event, keep the majority, and get paid on time. We hold funds in escrow until the show is done.',
  },
  {
    icon: Globe,
    title: 'Built for organisers',
    body: 'List a show in minutes, price every tier, and watch sales in real time — from a single seat to a sold-out arena.',
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
  'Free cancellation up to 48 hours before any show',
  'Every barcode verified live at the venue gate',
  'Card details never stored on our servers',
  'Artist payments protected in escrow until the show is done',
  'Support that answers within 2 hours, every day of the week',
];

const CITIES = ['London', 'Hamilton', 'Bristol', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Karachi', 'Lahore', 'Islamabad', 'Toronto', 'New York'];

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
            Jazbaticket is a ticketing and artist-booking platform for concerts, theatre, comedy, sport and conferences. Fans find the shows they love; organisers and artists reach the audiences they deserve — on one honest, secure marketplace.
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
              It started with a fake ticket.
            </h2>
          </div>
          <div className="lg:col-span-7 text-base text-[#222] leading-relaxed space-y-5">
            <p>
              In 2019, one of our founders queued for two hours outside a sold-out show in London — only to be turned away at the gate with a ticket that scanned as a duplicate. The reseller had vanished. The night was gone. The money too.
            </p>
            <p>
              Jazbaticket was built so that never happens again. We issue every barcode ourselves, verify it live at the door, and put a refund guarantee behind every order. No grey market, no "sold as seen", no small print designed to lose you.
            </p>
            <p>
              Then we looked at the other side of the stage. Artists were being paid late, by the hour, with deductions they never agreed to. So we flipped it: <strong className="font-bold">one flat fee per event, agreed upfront, held in escrow, released after the show.</strong> Today more than 1,800 verified performers are booked through the platform — from wedding singers to arena headliners.
            </p>
            <p>
              We're a team of engineers, promoters and former touring musicians working across London, Hamilton and Lahore. What unites us is simple: the belief that a great night out should start long before the doors open.
            </p>
          </div>
        </div>
      </section>

      {/* ── VALUES — hairline tile grid ───────────────────────── */}
      <section className="px-4 sm:px-6 md:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <span className={`${overline} text-[#666]`}>What we stand for</span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] max-w-xl mt-3">
            Three promises we don't break.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e4e4e4] mt-10 border border-[#e4e4e4]">
            {VALUES.map((v) => (
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
            <span className={`${overline} text-[#666]`}>The Jazbaticket guarantee</span>
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
            From London basements to Lahore stadiums.
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
              Browse tonight's shows, book the artist for your own event, or get in touch — a real person replies within 2 hours.
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
