import React, { useState, useEffect } from 'react';
import { Ticket, Menu, X } from 'lucide-react';

interface NavbarProps {
  onScrollToSection: (id: string) => void;
  onOpenAuth: (type: 'signup' | 'login') => void;
  currentUser: { email: string; name: string } | null;
  onGoToDashboard: () => void;
  onLogout?: () => void;
  isHome: boolean;
}

export default function Navbar({ onScrollToSection, onOpenAuth, currentUser, onGoToDashboard, onLogout, isHome }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    // Initialize state
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // CONTAINER STYLING: Transparent overlay on home-top, elegant blurred white otherwise
  const navContainerClass = `
    ${isHome ? (isScrolled ? 'fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-neutral-200/50 shadow-xs' : 'fixed top-0 left-0 right-0 bg-transparent border-b border-white/5') : 'sticky top-0 bg-white border-b border-neutral-200 shadow-xs'}
    z-50 px-4 py-3.5 sm:px-6 md:px-8 transition-all duration-300 w-full
  `;

  // LOGO TEXT: White on raw transparent hero, charcoal-dark otherwise
  const logoTextClass = `font-display font-black text-2xl tracking-tight transition-colors duration-300 ${
    isHome && !isScrolled ? 'text-white' : 'text-neutral-900'
  }`;

  // TICKET ICON WRAPPER BORDER Color
  const logoIconClass = `w-9 h-9 rounded-full bg-[#E34718] flex items-center justify-center border shadow-sm transition-transform duration-300 group-hover:scale-110 ${
    isHome && !isScrolled ? 'border-[#E34718]/20' : 'border-neutral-200'
  }`;

  // TEXTS AND LINKS Color Theme inside Navbar
  const navLinkClass = `font-semibold transition-colors cursor-pointer text-sm tracking-wide ${
    isHome && !isScrolled 
      ? 'text-white/85 hover:text-[#E34718]' 
      : 'text-neutral-700 hover:text-[#C23A12] hover:text-opacity-100 font-semibold'
  }`;

  const greetingClass = `text-[13px] font-semibold tracking-wide transition-colors duration-300 ${
    isHome && !isScrolled ? 'text-white/80' : 'text-neutral-650'
  }`;

  const logoutLinkClass = `text-[11px] font-black uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
    isHome && !isScrolled 
      ? 'text-white/65 hover:text-[#E34718] hover:underline' 
      : 'text-neutral-450 hover:text-red-500 hover:underline'
  }`;

  const signupBtnClass = `font-semibold text-sm transition-colors cursor-pointer ${
    isHome && !isScrolled ? 'text-white/85 hover:text-[#E34718]' : 'text-neutral-600 hover:text-black'
  }`;

  // Mobile drawer trigger bubble action buttons
  const mobileToggleClass = `md:hidden w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-all focus:outline-none ${
    isHome && !isScrolled 
      ? 'bg-white/10 border border-white/10 text-white hover:bg-white/20' 
      : 'bg-white border border-neutral-200 text-black hover:bg-neutral-50'
  }`;

  // Mobile drawer panel styling
  const drawerClass = `md:hidden absolute top-full left-0 right-0 p-5 shadow-2xl flex flex-col gap-3.5 z-40 border-t transition-all duration-300 ${
    isHome && !isScrolled 
      ? 'bg-neutral-950/98 backdrop-blur-md border-white/10 text-neutral-100' 
      : 'bg-white border-neutral-200 text-neutral-950'
  }`;

  const drawerLinkClass = `font-bold text-left py-2 border-b transition-colors cursor-pointer text-sm ${
    isHome && !isScrolled 
      ? 'text-white/90 hover:text-[#E34718] border-white/5' 
      : 'text-neutral-900 hover:text-[#E34718] border-neutral-100'
  }`;

  return (
    <nav className={navContainerClass.trim()} id="main-navigation-header">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* LOGO */}
        <div 
          onClick={() => onScrollToSection('top')} 
          className="flex items-center gap-2.5 cursor-pointer group"
          id="nav-logo"
        >
          <div className={logoIconClass}>
            <Ticket className="w-4.5 h-4.5 text-black rotate-[15deg] group-hover:rotate-0 transition-transform duration-300" />
          </div>
          <span className={logoTextClass}>
            Jazba<span className={isHome && !isScrolled ? 'text-[#E34718] font-black' : 'text-neutral-900 font-extrabold'}>ticket</span>
          </span>
        </div>

        {/* DESKTOP MENU & AUTH */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => onScrollToSection('explorer')} 
              className={navLinkClass}
              id="btn-nav-explorer"
            >
              Events
            </button>
            <button 
              onClick={() => onScrollToSection('artists')} 
              className={navLinkClass}
              id="btn-nav-artists"
            >
              Artist
            </button>
            <button 
              onClick={() => onScrollToSection('help')} 
              className={navLinkClass}
              id="link-nav-help"
            >
              Help
            </button>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-4" id="nav-user-controls">
              <span className={greetingClass} id="nav-user-greeting">
                Hi, <span className="font-bold">{currentUser.name.split(' ')[0]}</span>
              </span>
              <button 
                onClick={onGoToDashboard}
                className="bg-neutral-900 hover:bg-neutral-800 px-5.5 py-2.5 rounded-full font-bold text-xs tracking-wider text-white transition-all duration-200 shadow-xs hover:shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5 border border-transparent"
                id="btn-nav-dashboard"
              >
                <span>My Dashboard</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#E34718] inline-block"></span>
              </button>
              {onLogout && (
                <button 
                  onClick={onLogout}
                  className={logoutLinkClass}
                  id="btn-nav-logout"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onOpenAuth('signup')}
                className={signupBtnClass}
                id="btn-signup"
              >
                Signup
              </button>
              <button 
                onClick={() => onOpenAuth('login')}
                className="bg-neutral-900 hover:bg-neutral-800 px-5.5 py-2 rounded-full font-bold text-xs tracking-wider text-white transition-all duration-200 shadow-xs hover:shadow-sm active:scale-95 cursor-pointer border border-transparent"
                id="btn-login"
              >
                Login
              </button>
            </div>
          )}
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={mobileToggleClass}
          id="btn-mobile-menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {isOpen && (
        <div className={drawerClass} id="mobile-navbar-drawer">
          <button 
            onClick={() => { onScrollToSection('explorer'); setIsOpen(false); }} 
            className={drawerLinkClass}
          >
            Events
          </button>
          <button 
            onClick={() => { onScrollToSection('artists'); setIsOpen(false); }} 
            className={drawerLinkClass}
          >
            Artist
          </button>
          <button 
            onClick={() => { onScrollToSection('help'); setIsOpen(false); }} 
            className={drawerLinkClass}
          >
            Help &amp; Contact
          </button>
           {currentUser ? (
            <div className="flex flex-col gap-3.5 pt-1.5" id="mobile-nav-user-controls">
              <div className={`text-xs font-bold text-left px-1 flex items-center justify-between border-b border-dashed pb-2 ${
                isHome && !isScrolled ? 'border-white/10 text-white/90' : 'border-neutral-200 text-neutral-850'
              }`} id="mobile-nav-profile-info">
                <span className="opacity-60 uppercase text-[10px] tracking-wider">Account</span>
                <span>{currentUser.name}</span>
              </div>
              <button 
                onClick={() => { onGoToDashboard(); setIsOpen(false); }}
                className="w-full bg-neutral-900 text-white py-3 rounded-full font-bold text-center border border-transparent shadow-sm flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <span>My Dashboard</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#E34718] inline-block"></span>
              </button>
              {onLogout && (
                <button 
                  onClick={() => { onLogout(); setIsOpen(false); }}
                  className="w-full bg-red-500/10 hover:bg-red-500/15 text-red-650 py-3 rounded-full font-black text-center border border-red-500/20 shadow-3xs cursor-pointer text-xs mt-1"
                >
                  SIGN OUT
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => { onOpenAuth('signup'); setIsOpen(false); }}
                className="flex-1 bg-[#E34718] text-white py-2.5 rounded-full font-bold text-center border border-[#E34718]/10 shadow-sm text-xs transition-all hover:bg-[#C23A12] cursor-pointer"
              >
                Signup
              </button>
              <button 
                onClick={() => { onOpenAuth('login'); setIsOpen(false); }}
                className={`flex-1 py-2.5 rounded-full font-bold text-center border text-xs transition-all cursor-pointer ${
                  isHome && !isScrolled
                    ? 'bg-white/10 text-white border-white/20 hover:bg-white/10'
                    : 'bg-neutral-900 text-white border-transparent hover:bg-neutral-800'
                }`}
              >
                Login
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
