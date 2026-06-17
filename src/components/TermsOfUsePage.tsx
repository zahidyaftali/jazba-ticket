import React from 'react';
import { motion } from 'motion/react';
import { 
  Scale, 
  HelpCircle, 
  ShieldAlert, 
  BookOpen, 
  Bell, 
  Terminal, 
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

interface TermsOfUsePageProps {
  onBackToHome: () => void;
}

export default function TermsOfUsePage({ onBackToHome }: TermsOfUsePageProps) {
  return (
    <div className="bg-neutral-50 min-h-screen pb-24" id="terms-of-use-page">
      
      {/* 1. GORGEOUS HERO SECTION - SAME AS EVENT PAGE */}
      <section 
        className="relative bg-[#121212] min-h-[420px] h-[60vh] px-4 sm:px-6 md:px-8 overflow-visible z-10 flex items-center"
        id="terms-hero"
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
          <div className="absolute inset-0 bg-[radial-gradient(rgba(252,210,64,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
        </div>

        {/* Hero Content Wrapper */}
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
          {/* Subtle Path Breadcrumb */}
          <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-wider text-neutral-400 bg-neutral-950 border border-neutral-800 backdrop-blur-md px-3.5 py-1.5 rounded-full">
            <button onClick={onBackToHome} className="hover:text-white hover:underline cursor-pointer transition-colors text-neutral-400">Home</button>
            <span>/</span>
            <span className="text-white">Terms of Use</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight leading-[1.1] max-w-3xl text-white">
            Platform <span className="text-[#E34718] drop-shadow-[0_2px_10px_rgba(227,71,24,0.15)]">Terms of Use</span>
          </h1>

          <p className="text-neutral-300 font-medium text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed">
            Legal protocols and bind-on-purchase agreements governing digital transaction security, user booking access, system registration guidelines, and absolute platform compliance.
          </p>
        </div>
      </section>

      {/* 2. MAIN LAYOUT CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-12">
        
        {/* Back Button and Overview Row */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-600 hover:text-black hover:underline cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home Page
          </button>
          
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-white border border-neutral-200 rounded-full px-4 py-1.5 shadow-3xs">
            Last updated: June 15, 2026
          </span>
        </div>

        {/* content split grid: Sidebar Directory vs Content panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT DIRECTORY / HELPFUL TIDBITS (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Summary Card */}
            <div className="bg-white border-2 border-neutral-200/90 rounded-3xl p-6.5 shadow-xs">
              <h3 className="font-display font-extrabold text-[#E34718] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#E34718]" />
                Compliance Core
              </h3>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed mb-4">
                Using Jazba Ticket implies unconditional acceptance of these conditions. We demand active compliance with purchase limits, ticket transfer regulations, and behavioral ethics during live attendance.
              </p>
              
              <hr className="border-neutral-105 my-4" />
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-xs font-bold text-neutral-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Fair booking limits enforced</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs font-bold text-neutral-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Verified ticket transfer codes</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs font-bold text-neutral-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Zero-tolerance bot abuse rules</span>
                </li>
              </ul>
            </div>

            {/* Platform Integrity Advisory */}
            <div className="bg-neutral-900 text-white rounded-3xl p-6.5 shadow-md relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:12px_12px] pointer-events-none"></div>
              <h4 className="font-display font-black text-white text-base mb-2">Platform Integrity Notice</h4>
              <p className="text-neutral-400 text-xs font-medium leading-relaxed mb-4">
                We monitor transaction queries rigorously. Accounts engaging in ticket scalping, fraudulent back-billing, or using programmatic bots to hoard bookings see instant lifetime suspensions.
              </p>
              <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-[10px] font-mono text-neutral-400 leading-normal">
                SYSTEM_PORT_IP_MONITORING: ON<br />
                AUTHENTICATED_PASS_KEYS: RE-VALIDATING
              </div>
            </div>

          </div>

          {/* RIGHT POLICIES CONTENT (8 cols) */}
          <div className="lg:col-span-8 bg-white border-2 border-neutral-200/90 rounded-3xl p-6.5 sm:p-8 md:p-10 shadow-xs space-y-10">
            
            {/* Sec 1 */}
            <section className="space-y-3.5" id="agreement">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E34718]/10 text-[#E34718] flex items-center justify-center font-bold text-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-display font-extrabold text-neutral-900 uppercase tracking-tight">1. Core Agreement</h2>
              </div>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                These generic Terms of Use govern your access as a user, ticket buyer, artist, or event organizer on the Jazba Ticket platform. By registering an account profile and finalizing ticket bookings, you bind yourself to comply with our overall community rules.
              </p>
            </section>

            <hr className="border-neutral-150" />

            {/* Sec 2 */}
            <section className="space-y-3.5" id="purchase-limits">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E34718]/10 text-[#E34718] flex items-center justify-center font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-display font-extrabold text-neutral-900 uppercase tracking-tight">2. Ticket Purchase and Scalping Limits</h2>
              </div>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                To guarantee equal and fair ticket access for live events, users are limited to a maximum number of passes per single billing order (typically <strong>10 passes</strong> per customer, unless designated otherwise of gold classes).
              </p>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                Secondary reselling of ticket holdings for commercial inflation or utilizing automated script bots is formally prohibited. Tickets spotted in violation of premium markup trading rules are voided immediately without financial refund.
              </p>
            </section>

            <hr className="border-neutral-150" />

            {/* Sec 3 */}
            <section className="space-y-3.5" id="conduct">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E34718]/10 text-[#E34718] flex items-center justify-center font-bold text-xs">
                  <Terminal className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-display font-extrabold text-neutral-900 uppercase tracking-tight">3. User Conduct and Content Policies</h2>
              </div>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                Any reviews, feedback posts, event descriptions, artist names, logos, or catalog assets uploaded onto our service must adhere to standard safety directives. You represent that you own necessary intellectual titles for images you supply.
              </p>
            </section>

            <hr className="border-neutral-150" />

            {/* Sec 4 */}
            <section className="space-y-3.5" id="limitations">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E34718]/10 text-[#E34718] flex items-center justify-center font-bold text-xs">
                  <Bell className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-display font-extrabold text-neutral-900 uppercase tracking-tight">4. Limitations of General Liability</h2>
              </div>
              <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                Jazba Ticket operates strictly as a transactional ticketing self-service platform connecting clients with artist shows and independent experience organizers. We hold zero liability for performance delays, staging defects, or venue safety issues. Any disputes regarding performance quality must be taken directly to the named Event Organizer.
              </p>
            </section>

          </div>

        </div>

      </div>

    </div>
  );
}
