import React, { useState, useEffect } from 'react';
import { Ticket, Menu, X, ChevronRight } from 'lucide-react';

interface NavbarProps {
  onScrollToSection: (id: string) => void;
  onOpenAuth: (type: 'signup' | 'login') => void;
  currentUser: { email: string; name: string } | null;
  onGoToDashboard: () => void;
  onLogout?: () => void;
  isHome: boolean;
}

const NAV_LINKS = [
  { id: 'explorer', label: 'Events' },
  { id: 'artists', label: 'Artists' },
  { id: 'help', label: 'Help' },
  { id: 'about', label: 'About' },
];

export default function Navbar({ onScrollToSection, onOpenAuth, currentUser, onGoToDashboard, onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const go = (id: string) => {
    onScrollToSection(id);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#f2f2f2]" id="main-navigation-header">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-[60px] flex items-center justify-between gap-6">

        {/* LOGO — flat yellow mark + wordmark */}
        <button
          onClick={() => go('top')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
          id="nav-logo"
        >
          <span className="w-9 h-9 bg-[#ffed00] flex items-center justify-center">
            <Ticket className="w-4.5 h-4.5 text-black" />
          </span>
          <span className="font-display font-bold text-xl tracking-tight text-black">
            Jazbaticket
          </span>
        </button>

        {/* CENTER NAV (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => go(link.id)}
              className="px-4 h-[60px] text-sm font-bold text-[#666] hover:text-black cursor-pointer transition-colors relative group"
              id={`btn-nav-${link.id}`}
            >
              {link.label}
              <span className="absolute bottom-0 left-4 right-4 h-[3px] bg-black scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </button>
          ))}
        </div>

        {/* RIGHT — account (desktop) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {currentUser ? (
            <>
              <span className="text-sm text-[#666]" id="nav-user-greeting">
                Hi, <span className="font-bold text-black">{currentUser.name.split(' ')[0]}</span>
              </span>
              <button
                onClick={onGoToDashboard}
                className="h-10 px-5 bg-black text-white text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors flex items-center gap-2"
                id="btn-nav-dashboard"
              >
                My account
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffed00]" />
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-sm font-bold text-[#666] hover:text-black cursor-pointer transition-colors"
                  id="btn-nav-logout"
                >
                  Sign out
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => onOpenAuth('login')}
                className="h-10 px-5 bg-white text-black border border-black text-sm font-bold cursor-pointer hover:bg-[#f7f7f7] transition-colors"
                id="btn-login"
              >
                Sign in
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="h-10 px-5 bg-[#ffed00] text-black text-sm font-bold cursor-pointer hover:bg-[#e6d200] transition-colors"
                id="btn-signup"
              >
                Sign up
              </button>
            </>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden w-10 h-10 border border-black flex items-center justify-center cursor-pointer"
          aria-label="Menu"
          id="btn-mobile-menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* MOBILE DRAWER */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-black max-h-[calc(100vh-60px)] overflow-y-auto" id="mobile-navbar-drawer">
          <div className="border-t border-[#f2f2f2]">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => go(link.id)}
                className="w-full flex items-center justify-between px-6 py-4 border-b border-[#f2f2f2] text-base font-bold text-black cursor-pointer hover:bg-[#f7f7f7] transition-colors text-left"
              >
                {link.label}
                <ChevronRight className="w-4 h-4 text-[#8a8a8a]" />
              </button>
            ))}
          </div>

          <div className="p-6">
            {currentUser ? (
              <div className="space-y-3" id="mobile-nav-user-controls">
                <div className="flex items-center justify-between text-sm pb-3 border-b border-[#f2f2f2]" id="mobile-nav-profile-info">
                  <span className="text-[#8a8a8a] font-bold uppercase tracking-[0.15em] text-[10px]">Account</span>
                  <span className="font-bold">{currentUser.name}</span>
                </div>
                <button
                  onClick={() => { onGoToDashboard(); setIsOpen(false); }}
                  className="w-full h-12 bg-black text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
                >
                  My account
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffed00]" />
                </button>
                {onLogout && (
                  <button
                    onClick={() => { onLogout(); setIsOpen(false); }}
                    className="w-full h-12 bg-white text-black border border-black text-sm font-bold cursor-pointer hover:bg-[#f7f7f7] transition-colors"
                  >
                    Sign out
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { onOpenAuth('login'); setIsOpen(false); }}
                  className="h-12 bg-white text-black border border-black text-sm font-bold cursor-pointer hover:bg-[#f7f7f7] transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => { onOpenAuth('signup'); setIsOpen(false); }}
                  className="h-12 bg-[#ffed00] text-black text-sm font-bold cursor-pointer hover:bg-[#e6d200] transition-colors"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
