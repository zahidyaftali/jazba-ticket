import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  CalendarPlus,
  Check,
  CreditCard,
  Heart,
  Mail,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Ticket,
  UserPlus,
} from 'lucide-react';
import FaqAccordion from './FaqAccordion';

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const STEPS = [
  { step: '01', icon: UserPlus, title: 'Create your account', body: 'Sign up free and tell us about you and the events you run. It takes about five minutes.' },
  { step: '02', icon: BadgeCheck, title: 'Get approved', body: 'Our team checks every organiser — usually within one or two working days — and emails you when you’re in.' },
  { step: '03', icon: CalendarPlus, title: 'Add your event', body: 'Upload your poster, set ticket prices and capacity, and submit it. We review it and put it on sale.' },
  { step: '04', icon: BarChart3, title: 'Sell & track', body: 'Share your event link, watch sales and attendees in real time, and get paid after the show.' },
];

const FEATURES = [
  { icon: CreditCard, title: 'Secure checkout', body: 'Buyers pay by card through Stripe or by Easypaisa. Card details never touch your hands — or ours.' },
  { icon: QrCode, title: 'Instant e-tickets', body: 'Every buyer gets their ticket by email straight away, with a QR code and a printable PDF.' },
  { icon: ScanLine, title: 'Door check-in', body: 'Tickets are scanned at the door with the Jazba Scan app, and each one works only once.' },
  { icon: BarChart3, title: 'Live sales dashboard', body: 'See revenue, tickets sold, every order and your attendee list — export it any time.' },
  { icon: Heart, title: 'Your own page & followers', body: 'A public organiser page with your logo, story and events. Fans can follow you.' },
  { icon: Smartphone, title: 'Works on your phone', body: 'Create events, check sales and download attendee lists from any device.' },
];

const INCLUDED = [
  'Your organiser page on jazbatickets.com',
  'Unlimited events once you’re approved',
  'General, VIP and Elite ticket types',
  'Prices in PKR, GBP or USD — buyers see their own currency',
  'Attendee list with names and emails, exportable to CSV',
  'Support from the Jazba team by email',
];

const FAQS = [
  { q: 'Who can become an organiser?', a: 'Promoters, venues, artists, community groups and charities that run live events — concerts, qawwali nights, comedy, theatre, festivals and more. We approve every organiser to keep tickets on Jazba trustworthy.' },
  { q: 'How long does approval take?', a: 'Usually one or two working days. You’ll get an email as soon as your account is approved, and again when each event goes on sale.' },
  { q: 'Who collects the money?', a: 'Jazba Tickets collects all ticket payments securely (Stripe for cards, Easypaisa for mobile payments). After your event, we settle your earnings with you directly, as agreed when you’re approved.' },
  { q: 'Can I edit my event after it goes live?', a: 'Yes — changes to details, images and prices go live straight away. You can also take an event off sale at any time.' },
  { q: 'Do I need a separate account to buy tickets?', a: 'No. The same Jazba account works for buying tickets and running events.' },
];

export default function ForOrganizersPage() {
  const navigate = useNavigate();

  return (
    <div className="jz-page bg-white min-h-screen text-black" id="for-organizers-root">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-[#121212] min-h-[480px] px-4 sm:px-6 md:px-8 py-20 overflow-hidden z-10 flex items-center">
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1600&auto=crop&fit=crop"
            alt="Crowd at a live concert"
            className="w-full h-full object-cover opacity-25"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/45" />
        </div>
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-5">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide text-neutral-400 bg-white/5 backdrop-blur-md px-3.5 py-1.5">
            <span onClick={() => navigate('/')} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">For organisers</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold tracking-tight leading-[0.95] max-w-3xl text-white">
            Sell tickets to your events <span className="text-[#ffed00]">with Jazba.</span>
          </h1>
          <p className="text-neutral-300 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
            Create your event, sell tickets with secure checkout, check people in at the door and follow every sale live — from one organiser dashboard.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="/organizer/signup" className="inline-flex items-center gap-2 bg-[#ffed00] text-black font-bold text-sm px-6 py-3.5 hover:bg-[#e6d200] transition-colors">
              Get started — it’s free <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/organizer/login" className="inline-flex items-center gap-2 border border-white/40 text-white font-bold text-sm px-6 py-3.5 hover:border-white transition-colors">
              Organiser log in
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="bg-[#ffed00] text-black px-4 sm:px-6 md:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <span className={`${overline} text-black/60`}>How it works</span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-3 max-w-xl">From sign-up to sold out in four steps.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/15 border border-black/15 mt-10">
            {STEPS.map((s) => (
              <div key={s.step} className="bg-[#ffed00] p-7">
                <span className="font-display font-bold text-lg">{s.step}</span>
                <s.icon className="w-6 h-6 mt-4" />
                <h3 className="font-display font-bold text-lg mt-4">{s.title}</h3>
                <p className="text-sm text-black/70 leading-relaxed mt-2">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <span className={`${overline} text-[#666]`}>Everything you need</span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-3 max-w-2xl">Built for the people who put on the show.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#e4e4e4] border border-[#e4e4e4] mt-10">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white p-7">
                <span className="w-10 h-10 bg-black flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-[#ffed00]" />
                </span>
                <h3 className="font-display font-bold text-lg mt-5">{f.title}</h3>
                <p className="text-sm text-[#444] leading-relaxed mt-2">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAYMENTS & INCLUDED ──────────────────────────────── */}
      <section className="bg-[#121212] text-white px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <ShieldCheck className="w-7 h-7 text-[#ffed00]" />
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-5">Payments handled for you.</h2>
            <p className="text-neutral-300 leading-relaxed mt-5 max-w-md">
              Every ticket is paid to Jazba Tickets through secure checkout, so buyers trust it and you never chase payments. After your event, we settle your earnings with you directly.
            </p>
          </div>
          <div className="lg:col-span-7 border-t border-white/10">
            {INCLUDED.map((w) => (
              <div key={w} className="flex items-center gap-4 py-4 border-b border-white/10">
                <span className="w-8 h-8 bg-[#ffed00] flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-black" />
                </span>
                <span className="text-base font-medium">{w}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <div className="py-6">
        <FaqAccordion faqs={FAQS.map((f, i) => ({ id: `faq-${i + 1}`, question: f.q, answer: f.a }))} />
      </div>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-[#ffed00] text-black px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <Ticket className="w-6 h-6 text-black" />
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-5 max-w-md">Ready to put your event on sale?</h2>
            <p className="text-black/70 text-sm mt-4 max-w-md">Create your organiser account today — it’s free to join.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/organizer/signup" className="bg-black text-white font-bold text-sm px-6 py-3.5 flex items-center gap-2 hover:bg-neutral-800 transition-colors">
              Create organiser account <ArrowRight className="w-4 h-4" />
            </a>
            <a href="mailto:info@jazbatickets.com" className="bg-transparent text-black border border-black font-bold text-sm px-6 py-3.5 hover:bg-black/5 transition-colors flex items-center gap-2">
              <Mail className="w-4 h-4" /> Talk to us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
