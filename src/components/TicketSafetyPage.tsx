import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, QrCode, RefreshCw, AlertTriangle, IdCard } from 'lucide-react';

const SECTIONS: Array<{ id: string; icon: React.ElementType; title: string; body: React.ReactNode }> = [
  {
    id: '5.1',
    icon: ShieldCheck,
    title: 'Buy Direct, Buy Safe',
    body: (
      <p>
        Every ticket sold through Jazbatickets is issued and tracked on our platform, with a unique QR/barcode generated at the point of sale. This means it can't be duplicated or resold without our system flagging it — unlike tickets bought through unofficial resale sites, social media marketplaces, or unknown third parties.
      </p>
    ),
  },
  {
    id: '5.2',
    icon: QrCode,
    title: 'Spotting a Genuine Jazbatickets Ticket',
    body: (
      <ul className="list-disc pl-5 space-y-2.5">
        <li>You'll always receive your ticket by email from an @jazbaentertainment.net address, and it's also available in My Passes in your account.</li>
        <li>Genuine tickets carry a unique QR code tied to your order — this is scanned once at entry.</li>
        <li>We will never ask you to pay for a ticket outside of the Jazbatickets checkout.</li>
      </ul>
    ),
  },
  {
    id: '5.3',
    icon: RefreshCw,
    title: 'Reselling Tickets',
    body: (
      <p>
        If you can no longer attend an event, please use our Refund Policy or transfer options rather than reselling on third-party sites — tickets resold above face value, or through unofficial channels, are not guaranteed and may be refused entry. Where an event allows it, official ticket transfer is available through My Passes.
      </p>
    ),
  },
  {
    id: '5.4',
    icon: AlertTriangle,
    title: 'Report a Concern',
    body: (
      <p>
        If you've been offered a Jazbatickets-branded ticket outside our platform, or suspect a scam, contact us immediately at <a href="mailto:support@jazbaentertainment.net" className="font-bold underline underline-offset-2">support@jazbaentertainment.net</a>.
      </p>
    ),
  },
  {
    id: '5.5',
    icon: IdCard,
    title: 'Entry Requirements',
    body: (
      <p>
        Some events carry age restrictions or require photo ID matching the name on the ticket. Always check the specific event page before you travel.
      </p>
    ),
  },
];

export default function TicketSafetyPage() {
  const navigate = useNavigate();

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="ticket-safety-page">

      {/* ── HERO — dark band ──────────────────────────────────── */}
      <section className="relative bg-[#121212] min-h-[360px] px-4 sm:px-6 md:px-8 overflow-hidden z-10 flex items-center py-20">
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1600&auto=crop&fit=crop"
            alt="Concert stage lights"
            className="w-full h-full object-cover opacity-25"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/45" />
        </div>
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide text-neutral-400 bg-white/5 backdrop-blur-md px-3.5 py-1.5">
            <span onClick={() => navigate('/')} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">Ticket safety</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight leading-[0.95] max-w-3xl text-white">
            Every ticket you buy is <span className="text-[#ffed00]">real.</span>
          </h1>
          <p className="text-neutral-300 font-normal text-sm sm:text-base max-w-2xl leading-relaxed">
            Jazbatickets exists to make sure every ticket you buy is real. Here's how we protect you.
          </p>
          <span className="inline-block text-[11px] font-bold text-white/50">Last updated: 9 July 2026</span>
        </div>
      </section>

      {/* ── SECTIONS — white catalogue ────────────────────────── */}
      <section className="px-4 sm:px-6 md:px-8 pt-14">
        <div className="max-w-4xl mx-auto">
          {SECTIONS.map((s) => (
            <div key={s.id} className="py-8 border-b border-[#f2f2f2] last:border-b-0">
              <h2 className="font-display font-bold text-xl leading-tight flex items-center gap-3">
                <span className="w-9 h-9 bg-[#ffed00] flex items-center justify-center shrink-0">
                  <s.icon className="w-4.5 h-4.5 text-black" />
                </span>
                <span className="flex items-baseline gap-3">
                  <span className="text-[#8a8a8a] font-bold text-sm shrink-0">{s.id}</span>
                  {s.title}
                </span>
              </h2>
              <div className="text-sm text-[#444] leading-relaxed mt-4">{s.body}</div>
            </div>
          ))}

          {/* Contact strip */}
          <div className="bg-black text-white p-6 sm:p-8 mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h3 className="font-display font-bold text-xl">Seen something suspicious?</h3>
              <p className="text-white/60 text-sm mt-1">Report it and we'll investigate straight away.</p>
            </div>
            <a
              href="mailto:support@jazbaentertainment.net"
              className="bg-[#ffed00] text-black font-bold text-sm px-6 py-3.5 flex items-center gap-2 hover:bg-[#e6d200] transition-colors w-fit"
            >
              <Mail className="w-4 h-4" /> support@jazbaentertainment.net
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
