import React from 'react';
import { ShieldCheck, Mail, PhoneCall, AlertTriangle, Clock, Zap } from 'lucide-react';

interface RefundPoliciesPageProps {
  onBackToHome: () => void;
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const GUARANTEE = [
  {
    icon: ShieldCheck,
    title: '100% refund',
    body: 'If an event is cancelled by the organiser, the full ticket price goes back to your original payment method.',
  },
  {
    icon: Clock,
    title: '24-hour grace period',
    body: 'Cancel or amend free of charge within 24 hours of booking, provided the event is still at least 72 hours away.',
  },
  {
    icon: Zap,
    title: 'Automatic processing',
    body: 'If the fault is on our side (e.g. a platform error), your refund is processed automatically — no need to ask.',
  },
];

const SECTIONS: Array<{ id: string; title: string; body: React.ReactNode }> = [
  {
    id: '3.2',
    title: 'Refund Eligibility Window',
    body: (
      <>
        <p>
          You can cancel for a refund up to <strong className="font-bold">7 days before the event</strong>, subject to the 24-hour grace period. Bookings made within 7 days of the event are final sale and cannot be cancelled by the buyer, except where the event itself is cancelled or postponed.
        </p>
        <div className="bg-[#f7f7f7] border border-[#e4e4e4] p-5 mt-4">
          <span className="font-bold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Late purchases — no grace period
          </span>
          <p className="mt-2">
            If you buy a ticket less than 24 hours before the event's scheduled start time (including on the day of the event itself), the standard 24-hour grace period does not apply, and your purchase is final sale immediately on payment. This is because the grace period exists to let you change your mind before the event window opens — it cannot logically apply to a purchase made after, or shortly before, doors open.
          </p>
        </div>
      </>
    ),
  },
  {
    id: '3.3',
    title: 'Cancelled or Postponed Events',
    body: (
      <ul className="list-disc pl-5 space-y-3">
        <li>
          <strong className="font-bold">Outright cancellation:</strong> You'll receive a full refund of the ticket price automatically, back to your original payment method — no need to contact us. The card processing fee is not refundable, as this is charged by our payment provider rather than Jazbaticket.
        </li>
        <li>
          <strong className="font-bold">Postponed/rescheduled events:</strong> Your ticket stays valid for the new date. If you can't make the new date, you can request a full refund within 14 days of the reschedule being announced.
        </li>
      </ul>
    ),
  },
  {
    id: '3.4',
    title: 'Cancellation Admin Fee',
    body: (
      <p>
        If you cancel voluntarily outside the 24-hour grace period (but before the 7-day cutoff), a <strong className="font-bold">10% admin fee</strong> applies to the order total. This keeps genuinely available tickets in circulation rather than held against last-minute cancellations.
      </p>
    ),
  },
  {
    id: '3.5',
    title: 'Artist Booking Deposits',
    body: (
      <p>
        Deposits paid to secure an artist booking are non-refundable once confirmed, except where the artist cancels the engagement — in which case the deposit is refunded in full. Full terms are set out in your individual Booking Agreement.
      </p>
    ),
  },
  {
    id: '3.6',
    title: 'How Refunds Are Processed',
    body: (
      <p>
        Approved refunds are sent to your card provider immediately on our side; depending on your bank, this typically appears on your statement within <strong className="font-bold">5–10 business days</strong>.
      </p>
    ),
  },
  {
    id: '3.7',
    title: 'Contact Us About a Refund',
    body: (
      <p>
        <a href="mailto:support@jazbaentertainment.net" className="font-bold underline underline-offset-2">support@jazbaentertainment.net</a> | 0333 5777 014, quoting your order reference.
      </p>
    ),
  },
  {
    id: '3.8',
    title: 'Accessibility & Venue Suitability',
    body: (
      <>
        <p>
          Jazbaticket does not own, manage, or operate any venue. If you have accessibility requirements — including step-free access, seating needs, or any disability-related access requirement — please contact the venue or <a href="mailto:support@jazbaentertainment.net" className="font-bold underline underline-offset-2">support@jazbaentertainment.net</a> before purchasing, so we can confirm what's available. We're glad to help you check this in advance.
        </p>
        <p className="mt-3">
          Buying a ticket without raising an accessibility question beforehand, and then finding the venue unsuitable on the day, is not in itself grounds for a refund under this policy — the responsibility to check sits with the ticket holder before purchase, in the same way as checking a venue's location, timing, or age restrictions. This does not affect any separate rights you may have under the Equality Act 2010, and we will always do what we reasonably can to help if you contact us with an access concern, whenever you raise it.
        </p>
      </>
    ),
  },
  {
    id: '3.9',
    title: 'Formal Complaints Before Legal Action',
    body: (
      <>
        <p>
          If you're unhappy with an order and believe you're entitled to a refund outside this policy, please put your concern in writing to <a href="mailto:support@jazbaentertainment.net" className="font-bold underline underline-offset-2">support@jazbaentertainment.net</a> in the first instance, including your order reference. We aim to respond within 5 working days.
        </p>
        <p className="mt-3">
          A phone call alone does not constitute a formal complaint and won't be treated as a request we're bound to act on — if a member of our team discusses your concern by phone, please follow it up in writing so it's properly logged and considered. We ask that you give us the opportunity to respond in writing before pursuing a claim through the courts or elsewhere; where a dispute proceeds directly to legal action without this step having been taken, we will draw this to the court's attention.
        </p>
      </>
    ),
  },
];

export default function RefundPoliciesPage({ onBackToHome }: RefundPoliciesPageProps) {
  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="refund-policies-page">

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
            <span onClick={onBackToHome} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">Refund policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight leading-[0.95] max-w-3xl text-white">
            Refund <span className="text-[#ffed00]">Policy</span>
          </h1>
          <p className="text-neutral-300 font-normal text-sm sm:text-base max-w-2xl leading-relaxed">
            Clear, straightforward rules for cancellations, postponed shows, and getting your money back.
          </p>
          <span className="inline-block text-[11px] font-bold text-white/50">Last updated: 9 July 2026</span>
        </div>
      </section>

      {/* ── GUARANTEE — yellow tile band ──────────────────────── */}
      <section className="bg-[#ffed00] text-black px-4 sm:px-6 md:px-8 py-14">
        <div className="max-w-4xl mx-auto">
          <span className={`${overline} text-black/60`}>3.1 — Our guarantee</span>
          <h2 className="font-display font-bold text-2xl sm:text-3xl leading-[0.95] mt-3">
            Three things you can always count on.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-black/15 border border-black/15 mt-8">
            {GUARANTEE.map((g) => (
              <div key={g.title} className="bg-[#ffed00] p-6">
                <span className="w-10 h-10 bg-black flex items-center justify-center">
                  <g.icon className="w-5 h-5 text-[#ffed00]" />
                </span>
                <h3 className="font-display font-bold text-lg mt-4">{g.title}</h3>
                <p className="text-sm text-black/70 leading-relaxed mt-2">{g.body}</p>
              </div>
            ))}
          </div>
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

          {/* Contact strip */}
          <div className="bg-black text-white p-6 sm:p-8 mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h3 className="font-display font-bold text-xl">Question about a refund?</h3>
              <p className="text-white/60 text-sm mt-1">Quote your order reference and we'll look into it.</p>
            </div>
            <div className="flex flex-col gap-2 text-sm font-bold">
              <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#ffed00]" /> support@jazbaentertainment.net</span>
              <span className="flex items-center gap-2"><PhoneCall className="w-4 h-4 text-[#ffed00]" /> 0333 5777 014</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
