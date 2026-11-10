import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, QrCode, Search } from 'lucide-react';
import { Reveal, SectionHead, SoftBand, StepCard } from './Decor';

const STEPS = [
  {
    icon: Search,
    title: 'Pick your event',
    body: 'Search by artist, city or date. Every price you see is the price you pay — no booking fee added at the end.',
  },
  {
    icon: CreditCard,
    title: 'Pay in a minute',
    body: 'Choose your tickets and pay by card on Stripe’s secure page, in pounds, dollars or rupees.',
  },
  {
    icon: QrCode,
    title: 'Show your QR at the door',
    body: 'Your e-ticket arrives by email and stays in your account. Show it on your phone or print it — either works.',
  },
];

/** Three plain steps for first-time buyers, on a soft glass band. */
export default function HowItWorks() {
  return (
    <SoftBand labelledBy="how-it-works-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-14 sm:py-20">
        <SectionHead
          id="how-it-works-title"
          eyebrow="New here?"
          title="Booking takes three steps"
          action={
            <Link to="/help" className="text-sm font-bold underline underline-offset-4">
              Questions? Visit the help centre
            </Link>
          }
        />

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.title}>
              <StepCard icon={step.icon} n={i + 1} title={step.title} delay={i * 160}>
                {step.body}
              </StepCard>
            </React.Fragment>
          ))}
        </ol>

        <Reveal delay={200} className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-black/10 pt-6">
          <p className="text-sm text-[#444]">
            <span className="font-bold text-black">Running an event?</span> Sell tickets, scan at the door and see every sale live.
          </p>
          <Link
            to="/for-organizers"
            className="jz-cta inline-flex items-center gap-2 bg-black text-white text-sm font-bold px-5 py-3 hover:bg-neutral-800 transition-colors w-fit"
          >
            Sell tickets with Jazba <ArrowRight className="w-4 h-4 jz-cta-arrow" />
          </Link>
        </Reveal>
      </div>
    </SoftBand>
  );
}
