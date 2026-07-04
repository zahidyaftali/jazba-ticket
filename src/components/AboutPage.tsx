import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Shield, Users, Globe, Sparkles } from 'lucide-react';

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

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="jz-page bg-white min-h-screen text-black" id="about-page-root">
      {/* HERO — dark storytelling band (shared pattern) */}
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

      {/* STATS — yellow accent band */}
      <section className="bg-[#ffed00] text-black px-4 sm:px-6 md:px-8 py-14">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-display font-bold text-3xl sm:text-4xl leading-none">{s.value}</div>
              <div className="text-xs font-medium text-black/70 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* VALUES — white catalogue band */}
      <section className="px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] max-w-xl">
            What we stand for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e4e4e4] mt-12 border border-[#e4e4e4]">
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

      {/* CTA — black band */}
      <section className="bg-black text-white px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <Sparkles className="w-6 h-6 text-[#ffed00]" />
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-5 max-w-md">
              Ready when you are.
            </h2>
            <p className="text-white/70 text-sm mt-4 max-w-md">
              Browse tonight's shows or book the artist for your own event.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/events')}
              className="bg-[#ffed00] text-black font-bold text-sm px-6 py-3.5 flex items-center gap-2 cursor-pointer"
            >
              <Ticket className="w-4 h-4" /> Find events
            </button>
            <button
              onClick={() => navigate('/artists')}
              className="bg-black text-white border border-white font-bold text-sm px-6 py-3.5 cursor-pointer hover:bg-white/10 transition-colors"
            >
              Book an artist
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
