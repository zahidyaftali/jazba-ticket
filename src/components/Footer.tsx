import React, { useState } from 'react';
import { Ticket, Send, MessageSquareCode, Sparkles } from 'lucide-react';

interface FooterProps {
  onScrollToSection: (id: string) => void;
  onSubscribe: (email: string) => void;
  onViewRefundPolicies?: () => void;
  onViewTermsOfUse?: () => void;
}

export default function Footer({ onScrollToSection, onSubscribe, onViewRefundPolicies, onViewTermsOfUse }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onSubscribe(email);
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="bg-neutral-50   relative overflow-hidden" id="footer">
      {/* --- 1. THE NEWSLETTER BANNER CAPSULE (TOP PART OF FOOTER) --- */}
      <div className="max-w-7xl mx-auto px-4 pt-14 pb-8 sm:px-6 md:px-8">
        <div className="bg-gradient-to-br from-[#E34718] to-[#C23A12] text-white rounded-[24px] p-6 sm:p-10 md:p-12 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
          
          {/* Backplate Dots */}
          <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:12px_12px] pointer-events-none"></div>

          {/* Left Text details */}
          <div className="relative z-10 max-w-md text-center md:text-left">
            <h3 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight leading-none mb-4">
              Get your first ticket
            </h3>
            <p className="text-white/80 font-medium text-sm sm:text-base">
              Stay in the loop with early bird tickets and secret artists.
            </p>

            {/* Simulated interactive feedback */}
            {subscribed && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-1.5 rounded-full   font-bold text-xs animate-bounce" id="newsletter-success">
                <Sparkles className="w-3.5 h-3.5 text-orange-200" />
                Welcome aboard! Subscribed.
              </div>
            )}

            {/* THE FORM INPUT PILL */}
            {!subscribed && (
              <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row items-center bg-white/95 backdrop-blur-sm rounded-full p-1 w-full gap-2 shadow-sm  ">
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email..."
                  required
                  className="w-full bg-transparent text-neutral-800 placeholder-neutral-400 font-medium text-xs sm:text-sm px-4 focus:outline-none py-2"
                  id="newsletter-email-input"
                />
                <button 
                  type="submit"
                  className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all shrink-0 cursor-pointer"
                  id="newsletter-btn-subscribe"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>

          {/* Right Ticket Grapic Indicators */}
          <div className="relative z-10 w-44 h-24 sm:w-56 sm:h-32 flex items-center justify-center shrink-0">
            {/* Elegant stack of vectors */}
            <div className="absolute w-28 h-16 bg-rose-500   rounded-xl shadow-md rotate-[-12deg] flex items-center justify-center">
              <span className="text-[10px] font-black tracking-widest text-white select-none">★ ENTRY ★</span>
            </div>
            <div className="absolute w-28 h-16 bg-[#E34718]   rounded-xl shadow-md rotate-[15deg] flex items-center justify-center">
              <span className="text-[10px] font-black tracking-widest text-white select-none">★ PASS ★</span>
            </div>
            <div className="absolute bottom-1 right-2 bg-neutral-950 text-white px-2 py-0.5 rounded text-[8px] font-mono leading-none   font-bold">
              Verified
            </div>
          </div>

        </div>

        {/* --- 2. MAIN FOOTER LINKS LISTS --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12  ">
          
          {/* Logo column and bio text */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onScrollToSection('top-events')}>
              <div className="w-8 h-8 rounded-full bg-[#E34718] flex items-center justify-center shadow-sm">
                <Ticket className="w-4 h-4 text-white rotate-[15deg]" />
              </div>
              <span className="font-display font-extrabold text-xl tracking-tight text-neutral-900">
                Jazba<span className="text-[#E34718]">ticket</span>
              </span>
            </div>
            <p className="text-neutral-400 text-xs font-medium leading-relaxed max-w-sm">
              Find and book tickets for concerts, theatre, and live shows across London and Hamilton.
            </p>
          </div>

          {/* Links structure (3 columns now) */}
          <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
            
            {/* Columns list */}
            <div>
              <h4 className="font-display font-bold text-xs tracking-wider text-neutral-700 mb-3">Categories</h4>
              <ul className="space-y-2 text-xs font-medium text-neutral-400">
                <li><button onClick={() => onScrollToSection('top-events')} className="hover:text-neutral-900 transition-colors cursor-pointer text-left">Top events</button></li>
                <li><button onClick={() => onScrollToSection('for-you')} className="hover:text-neutral-900 transition-colors cursor-pointer text-left">Festival</button></li>
                <li><button onClick={() => onScrollToSection('upcoming')} className="hover:text-neutral-900 transition-colors cursor-pointer text-left">Upcoming event</button></li>
                <li><button onClick={() => onScrollToSection('discover')} className="hover:text-neutral-900 transition-colors cursor-pointer text-left">See all</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-xs tracking-wider text-neutral-700 mb-3">Support</h4>
              <ul className="space-y-2 text-[11px] font-medium text-neutral-400">
                <li><button onClick={() => onScrollToSection('help')} className="hover:text-neutral-900 transition-colors text-left cursor-pointer">Help Center</button></li>
                <li><button onClick={() => onScrollToSection('help')} className="hover:text-neutral-900 transition-colors text-left cursor-pointer">Ticket Safety</button></li>
                <li><button onClick={onViewRefundPolicies || (() => onScrollToSection('help'))} className="hover:text-neutral-900 transition-colors text-left cursor-pointer">Refund Policies</button></li>
                <li><button onClick={onViewTermsOfUse || (() => onScrollToSection('help'))} className="hover:text-neutral-900 transition-colors text-left cursor-pointer">Terms of Use</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-xs tracking-wider text-neutral-700 mb-3">Partners</h4>
              <ul className="space-y-2 text-xs font-medium text-neutral-400">
                <li><a href="#" className="hover:text-neutral-900 transition-colors">Affiliate program</a></li>
              </ul>
            </div>

          </div>

          {/* Do you have any questions section? */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <h4 className="font-display font-bold text-xs tracking-wider text-neutral-700">Questions?</h4>
            <span className="text-xs font-medium text-neutral-400">Reach out at any time of the day:</span>
            
            <button 
              onClick={() => onScrollToSection('help')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-neutral-900 text-xs text-[#E34718] font-bold rounded-full shadow-sm hover:bg-neutral-800 transition-all cursor-pointer"
            >
              <MessageSquareCode className="w-3.5 h-3.5" />
              Get Help
            </button>
          </div>

        </div>

        {/* --- 3. BOTTOM FOOTER COPYRIGHT & SOCIAL RIGHTS --- */}
        <div className="pt-6 pb-2 text-center text-[11px] font-medium text-neutral-400">
          <p>© 2026 Jazba Ticket. All Rights Reserved. | Privacy Policy | <button onClick={onViewTermsOfUse || (() => onScrollToSection('help'))} className="hover:text-neutral-900 underline cursor-pointer transition-colors">Terms &amp; Conditions</button></p>
        </div>

      </div>
    </footer>
  );
}
