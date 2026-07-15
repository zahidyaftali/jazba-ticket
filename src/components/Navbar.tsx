import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Menu, X, ChevronRight, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import mainLogo from '../../assets/images/Main Logo.png';

interface NavbarProps {
  onScrollToSection: (id: string) => void;
  onOpenAuth: (type: 'signup' | 'login') => void;
  currentUser: { email: string; name: string; profileImage?: string } | null;
  onGoToDashboard: (tab?: string) => void;
  onLogout?: () => void;
  isHome: boolean;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const NAV_LINKS = [
  { id: 'explorer', label: 'Events' },
  { id: 'artists', label: 'Artists' },
  { id: 'organizers', label: 'Organisers' },
  { id: 'help', label: 'Help' },
  { id: 'about', label: 'About' },
];

export default function Navbar({ onScrollToSection, onOpenAuth, currentUser, onGoToDashboard, onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close the profile dropdown on outside click or Escape
  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profileOpen]);

  const goDashboardTab = (tab?: string) => {
    setProfileOpen(false);
    onGoToDashboard(tab);
  };

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
          {/* White-wordmark logo turned solid black for the light header */}
          <img src={mainLogo} alt="Jazbaticket" className="h-12 w-auto object-contain brightness-0" />
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
            <div className="relative" ref={profileRef} id="nav-profile-menu">
              {/* Avatar trigger */}
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="w-10 h-10 bg-[#ffed00] border border-black flex items-center justify-center cursor-pointer overflow-hidden hover:opacity-85 transition-opacity"
                id="btn-nav-profile"
                aria-label="Account menu"
                aria-expanded={profileOpen}
              >
                {currentUser.profileImage ? (
                  <img
                    src={currentUser.profileImage}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-sm font-bold text-black select-none">{initialsOf(currentUser.name)}</span>
                )}
              </button>

              {/* Dropdown panel */}
              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-64 bg-white border border-black z-50" id="nav-profile-dropdown">
                  {/* Identity header */}
                  <div className="flex items-center gap-3 p-4 border-b border-[#f2f2f2]">
                    <span className="w-10 h-10 bg-[#ffed00] flex items-center justify-center overflow-hidden shrink-0">
                      {currentUser.profileImage ? (
                        <img
                          src={currentUser.profileImage}
                          alt={currentUser.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-sm font-bold text-black select-none">{initialsOf(currentUser.name)}</span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{currentUser.name}</div>
                      <div className="text-xs text-[#8a8a8a] truncate">{currentUser.email}</div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <button
                    onClick={() => goDashboardTab()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-black hover:bg-[#f7f7f7] cursor-pointer transition-colors text-left"
                    id="btn-profile-dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#666]" /> My account
                  </button>
                  <button
                    onClick={() => goDashboardTab('passes')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-black hover:bg-[#f7f7f7] cursor-pointer transition-colors text-left"
                    id="btn-profile-tickets"
                  >
                    <Ticket className="w-4 h-4 text-[#666]" /> My tickets
                  </button>
                  <button
                    onClick={() => goDashboardTab('settings')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-black hover:bg-[#f7f7f7] cursor-pointer transition-colors text-left"
                    id="btn-profile-settings"
                  >
                    <Settings className="w-4 h-4 text-[#666]" /> Settings
                  </button>

                  {onLogout && (
                    <button
                      onClick={() => { setProfileOpen(false); onLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-black hover:bg-[#f7f7f7] cursor-pointer transition-colors text-left border-t border-[#f2f2f2]"
                      id="btn-nav-logout"
                    >
                      <LogOut className="w-4 h-4 text-[#666]" /> Sign out
                    </button>
                  )}
                </div>
              )}
            </div>
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
