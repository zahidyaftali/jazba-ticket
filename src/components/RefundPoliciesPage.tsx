import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  HelpCircle, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  ArrowLeft,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface RefundPoliciesPageProps {
  onBackToHome: () => void;
}

export default function RefundPoliciesPage({ onBackToHome }: RefundPoliciesPageProps) {
  return (
    <div className="bg-neutral-50 min-h-screen pb-24" id="refund-policies-page">
      
      {/* 1. GORGEOUS HERO SECTION - SAME AS EVENT PAGE */}
      <section 
        className="relative bg-[#121212] min-h-[420px] h-[60vh] px-4 sm:px-6 md:px-8 overflow-visible z-10 flex items-center"
        id="refund-hero"
      >
        {/* DARK MUSIC EVENT BACKGROUND PHOTO WITH GRADIENT OVERLAY */}
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
            alt="Dark music festival event crowd and stage strobe spotlights"
            className="w-full h-full object-cover opacity-25 scale-102"
            referrerPolicy="no-referrer"
          />
          {/* Dark overlay gradient starting from bottom to top */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/45" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(227,71,24,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
        </div>

        {/* Hero Content Wrapper */}
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
          {/* Subtle Path Breadcrumb */}
          <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-wider text-neutral-400 bg-neutral-905   backdrop-blur-md px-3.5 py-1.5 rounded-full">
            <button onClick={onBackToHome} className="hover:text-white hover:underline cursor-pointer transition-colors text-neutral-400">Home</button>
            <span>/</span>
            <span className="text-white">Refund Policies</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight leading-[1.1] max-w-3xl text-white">
            Our Ticket <span className="text-[#E34718] drop-shadow-[0_2px_10px_rgba(227,71,24,0.15)]">Refund Policies</span>
          </h1>

          <p className="text-neutral-300 font-medium text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed">
            Clear, straightforward rules for cancellations, postponed shows, and getting your money back.
          </p>
        </div>
      </section>

      {/* 2. MAIN LAYOUT CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-12">
        
        {/* Back Button and Overview Row */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-black text-sentence tracking-wider text-neutral-600 hover:text-black hover:underline cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home Page
          </button>
          
          <span className="text-[10px] font-bold text-neutral-400 text-sentence tracking-widest bg-white   rounded-full px-4 py-1.5 shadow-3xs">
            Last updated: June 15, 2026
          </span>
        </div>

        {/* content split grid: Sidebar Directory vs Content panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT DIRECTORY / HELPFUL TIDBITS (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Summary Card */}
            <div className="bg-white   rounded-3xl p-6.5 shadow-xs">
              <h3 className="font-display font-extrabold text-[#E34718] text-sm text-sentence tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#E34718]" />
                Guaranteed Protection
              </h3>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed mb-4">
                We stand behind every ticket sold on Jazba Ticket. Here's what you can always count on.
              </p>
              
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-xs font-bold text-neutral-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>100% Refund for Cancelled Shows</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs font-bold text-neutral-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>24 Hour Modification Grace Period</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs font-bold text-neutral-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Automatic Processing on Platform Fault</span>
                </li>
              </ul>
            </div>

            {/* Need Help Column Block */}
            <div className="bg-neutral-900 text-white rounded-3xl p-6.5 shadow-md relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:12px_12px] pointer-events-none"></div>
              <h4 className="font-display font-black text-white text-base mb-2">Have a question about a refund?</h4>
              <p className="text-neutral-400 text-xs font-medium leading-relaxed mb-4">
                Email our support team and we'll look into your order and refund status directly.
              </p>
              <a
                href="mailto:support@jazbaticket.com"
                className="inline-flex w-full items-center justify-center p-3 text-center bg-[#E34718] hover:bg-[#C23A12] text-xs font-black text-sentence tracking-wider text-white rounded-xl shadow-xs transition-colors"
              >
                Contact Support
              </a>
            </div>

          </div>

          {/* RIGHT POLICIES CONTENT (8 cols) */}
          <div className="lg:col-span-8 bg-white   rounded-3xl p-6.5 sm:p-8 md:p-10 shadow-xs space-y-10">
            
            {/* Sec 1 */}
            <section className="space-y-3.5" id="eligibility">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E34718]/10 text-[#E34718] flex items-center justify-center font-bold text-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-display font-extrabold text-neutral-900 text-sentence tracking-tight">1. Refund Eligibility Periods</h2>
              </div>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                You can cancel for a refund up to <strong>7 days before</strong> the event. Bookings made within 7 days of the event are final sale and can't be cancelled by the buyer.
              </p>
              <div className="bg-neutral-50 rounded-2xl p-4.5  ">
                <h4 className="text-[11px] font-black text-sentence tracking-wider text-neutral-800 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E34718]" />
                  24-hour grace period
                </h4>
                <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                  Changed your mind right after booking? You can modify or cancel for free within 24 hours of checkout, as long as the event is still at least 72 hours away.
                </p>
              </div>
            </section>


            {/* Sec 2 */}
            <section className="space-y-3.5" id="cancellation">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E34718]/10 text-[#E34718] flex items-center justify-center font-bold text-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-display font-extrabold text-neutral-900 text-sentence tracking-tight">2. Postponed or Cancelled Events</h2>
              </div>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                If the organizer cancels, moves, or indefinitely postpones a show, you're entitled to a <strong>full refund of the ticket price</strong>. The card processing fee isn't refundable, since that's charged by the payment provider, not us.
              </p>
              <ul className="space-y-2.5 text-xs text-neutral-600 font-semibold list-disc pl-5">
                <li><strong>Rescheduled Dates:</strong> Your ticket stays valid for the new date. Can't make it? You can request a full refund within 14 days of the reschedule being announced.</li>
                <li><strong>Outright Cancellations:</strong> If a show is cancelled outright, your refund is processed automatically — no need to contact us. It goes back to your original payment method.</li>
              </ul>
            </section>


            {/* Sec 3 */}
            <section className="space-y-3.5" id="fees">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E34718]/10 text-[#E34718] flex items-center justify-center font-bold text-xs">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-display font-extrabold text-neutral-900 text-sentence tracking-tight">3. Cancellation Admin Fees</h2>
              </div>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                If you cancel voluntarily outside the 24-hour grace period, a <strong>10% cancellation fee</strong> applies to the order total. This keeps tickets available for people who genuinely plan to attend, rather than being held and cancelled last-minute.
              </p>
            </section>


            {/* Sec 4 */}
            <section className="space-y-3.5" id="timeline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E34718]/10 text-[#E34718] flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-display font-extrabold text-neutral-900 text-sentence tracking-tight">4. Payout and Processor Timelines</h2>
              </div>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                Once a refund is approved, we send it to your card provider right away. Depending on your bank, it typically shows up on your statement within <strong>5 to 10 business days</strong>.
              </p>
            </section>

          </div>

        </div>

      </div>

    </div>
  );
}
