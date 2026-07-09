import React, { useState } from 'react';
import { Ticket, ArrowRight, Check } from 'lucide-react';

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

  const linkClass = 'text-white/60 hover:text-white transition-colors text-left cursor-pointer';

  return (
    <footer className="bg-black text-white" id="footer">
      {/* NEWSLETTER BAND */}
      <div className="border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-md">
            <h3 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95]">
              Get your first ticket
            </h3>
            <p className="text-white/60 text-sm mt-3">
              Early access to on-sales, presale codes and lineup news — straight to your inbox.
            </p>
          </div>

          <div className="w-full max-w-md">
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm font-bold text-[#ffed00]">
                <Check className="w-4 h-4" /> You're on the list.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-stretch gap-0">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 bg-black text-white placeholder-white/40 text-sm px-4 py-3 border border-white"
                  id="newsletter-email-input"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-[#ffed00] text-black px-6 py-3 text-sm font-bold cursor-pointer ml-4 flex items-center gap-2"
                  id="newsletter-btn-subscribe"
                >
                  Subscribe <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* LINKS GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onScrollToSection('top')}>
              <div className="w-8 h-8 bg-[#ffed00] flex items-center justify-center">
                <Ticket className="w-4 h-4 text-black" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-white">Jazbatickets</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs mt-4">
              Book tickets to concerts, theatre, comedy and sport — and the artists to headline your own event.
            </p>
          </div>

          {/* Explore */}
          <div className="md:col-span-2">
            <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 mb-4">Explore</h4>
            <ul className="space-y-3 text-sm">
              <li><button onClick={() => onScrollToSection('explorer')} className={linkClass}>All events</button></li>
              <li><button onClick={() => onScrollToSection('artists')} className={linkClass}>Book an artist</button></li>
              <li><button onClick={() => onScrollToSection('top-events')} className={linkClass}>Top events</button></li>
              <li><button onClick={() => onScrollToSection('upcoming')} className={linkClass}>Upcoming shows</button></li>
            </ul>
          </div>

          {/* Support */}
          <div className="md:col-span-2">
            <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 mb-4">Support</h4>
            <ul className="space-y-3 text-sm">
              <li><button onClick={() => onScrollToSection('help')} className={linkClass}>Help centre</button></li>
              <li><button onClick={onViewRefundPolicies || (() => onScrollToSection('help'))} className={linkClass}>Refund policy</button></li>
              <li><button onClick={onViewTermsOfUse || (() => onScrollToSection('help'))} className={linkClass}>Terms of use</button></li>
              <li><button onClick={() => onScrollToSection('ticket-safety')} className={linkClass}>Ticket safety</button></li>
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-2">
            <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><button onClick={() => onScrollToSection('about')} className={linkClass}>About us</button></li>
              <li><button onClick={() => onScrollToSection('contact')} className={linkClass}>Contact</button></li>
              <li><button onClick={() => onScrollToSection('affiliates')} className={linkClass}>Affiliate programme</button></li>
            </ul>
          </div>

          {/* Contact CTA */}
          <div className="md:col-span-2">
            <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 mb-4">Questions?</h4>
            <button
              onClick={() => onScrollToSection('contact')}
              className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 text-sm font-bold cursor-pointer hover:bg-white/90 transition-colors"
            >
              Get in touch
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <p>© 2026 Jazbatickets · Jazba Entertainment Ltd. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <button onClick={onViewTermsOfUse || (() => onScrollToSection('help'))} className="hover:text-white transition-colors cursor-pointer">Terms</button>
            <button onClick={() => onScrollToSection('privacy')} className="hover:text-white transition-colors cursor-pointer">Privacy</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
