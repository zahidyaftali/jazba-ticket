import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, PhoneCall, MapPin } from 'lucide-react';

const SECTIONS: Array<{ id: string; title: string; body: React.ReactNode }> = [
  {
    id: '6.1',
    title: 'What We Collect',
    body: (
      <ul className="list-disc pl-5 space-y-2.5">
        <li><strong className="font-bold">Account & contact details:</strong> name, email, phone number, billing address.</li>
        <li><strong className="font-bold">Transaction data:</strong> tickets purchased, artist booking enquiries, payment confirmation (full card details are handled by our payment providers, Stripe and PayPal — we don't store them).</li>
        <li><strong className="font-bold">Event/organiser data:</strong> business details, bank details for payouts, event content, if you list events.</li>
        <li><strong className="font-bold">Technical data:</strong> IP address, device/browser type, usage data via cookies.</li>
        <li><strong className="font-bold">Marketing preferences:</strong> whether you've opted in to hear about future events and artists.</li>
      </ul>
    ),
  },
  {
    id: '6.2',
    title: 'How We Use Your Data',
    body: (
      <p>
        To process purchases and booking enquiries and deliver your tickets/confirmations; to send essential updates about an event you've booked (cancellations, postponements, venue changes); to send marketing you've opted into (unsubscribe any time); to prevent fraud and ticket touting; and to meet our legal and accounting obligations.
      </p>
    ),
  },
  {
    id: '6.3',
    title: 'Who We Share It With',
    body: (
      <p>
        Event organisers (name and ticket details only, for entry management); artists/artist management, where you've submitted a booking enquiry; our payment providers, Stripe and PayPal; and service providers supporting the Platform, under data processing agreements. <strong className="font-bold">We do not sell your personal data.</strong>
      </p>
    ),
  },
  {
    id: '6.4',
    title: 'Your Rights',
    body: (
      <p>
        Under UK GDPR you can access, correct, delete, or restrict use of your personal data, and object to marketing. Contact <a href="mailto:info@jazbaentertainment.net" className="font-bold underline underline-offset-2">info@jazbaentertainment.net</a> to exercise these rights, or complain to the ICO (<a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">ico.org.uk</a>) if unsatisfied with how we've handled a request.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="privacy-policy-page">

      {/* ── HERO — dark band ──────────────────────────────────── */}
      <section className="relative bg-[#121212] min-h-[360px] px-4 sm:px-6 md:px-8 overflow-hidden z-10 flex items-center py-20">
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
            <span className="text-white">Privacy policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight leading-[0.95] max-w-3xl text-white">
            Privacy <span className="text-[#ffed00]">Policy</span>
          </h1>
          <p className="text-neutral-300 font-normal text-sm sm:text-base max-w-2xl leading-relaxed">
            Jazba Entertainment Ltd ("Jazbaticket", "we", "us") is the data controller for personal data collected through Jazbatickets. We handle your data in line with UK GDPR and the Data Protection Act 2018.
          </p>
          <span className="inline-block text-[11px] font-bold text-white/50">Last updated: 9 July 2026</span>
        </div>
      </section>

      {/* ── SECTIONS — white catalogue ────────────────────────── */}
      <section className="px-4 sm:px-6 md:px-8 pt-14">
        <div className="max-w-4xl mx-auto">
          {SECTIONS.map((s) => (
            <div key={s.id} className="py-8 border-b border-[#f2f2f2] last:border-b-0">
              <h2 className="font-display font-bold text-xl leading-tight flex items-baseline gap-3">
                <span className="text-[#8a8a8a] font-bold text-sm shrink-0">{s.id}</span>
                {s.title}
              </h2>
              <div className="text-sm text-[#444] leading-relaxed mt-4">{s.body}</div>
            </div>
          ))}

          {/* 6.5 Contact */}
          <div className="bg-black text-white p-6 sm:p-8 mt-12">
            <h3 className="font-display font-bold text-xl flex items-baseline gap-3">
              <span className="text-white/50 font-bold text-sm shrink-0">6.5</span>
              Contact Us
            </h3>
            <div className="mt-5 space-y-2.5 text-sm font-bold">
              <span className="flex items-start gap-2"><MapPin className="w-4 h-4 text-[#ffed00] shrink-0 mt-0.5" /> Jazba Entertainment Ltd, 339 Dudley Road, Birmingham B18 4HB, United Kingdom</span>
              <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#ffed00]" /> info@jazbaentertainment.net</span>
              <span className="flex items-center gap-2"><PhoneCall className="w-4 h-4 text-[#ffed00]" /> 0333 5777 014</span>
            </div>
            <button
              onClick={() => navigate('/terms-of-use')}
              className="mt-6 text-sm font-bold text-white hover:text-[#ffed00] transition-colors cursor-pointer underline underline-offset-2"
            >
              Read our Terms of Use →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
