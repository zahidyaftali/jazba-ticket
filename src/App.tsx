/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Sparkles, Filter, Info, X, Check, Star, LogIn, Heart } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import CategoryCircles from './components/CategoryCircles';
import EventCard from './components/EventCard';
import EventsForYou from './components/EventsForYou';
import UpcomingRows from './components/UpcomingRows';
import FaqAccordion from './components/FaqAccordion';
import Footer from './components/Footer';
import CheckoutPage from './components/CheckoutPage';
import EventDetailPage from './components/EventDetailPage';
import EventsExplorerPage from './components/EventsExplorerPage';
import ArtistsPage, { ArtistItem } from './components/ArtistsPage';
import ArtistDetailPage from './components/ArtistDetailPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import UserDashboardPage from './components/UserDashboardPage';
import HelpPage from './components/HelpPage';
import RefundPoliciesPage from './components/RefundPoliciesPage';
import TermsOfUsePage from './components/TermsOfUsePage';
import { categories, faqs } from './data';
import { EventItem } from './types';
import { getPublishedEvents } from './services/backendService';

export default function App() {
  // Global App States
  const [events, setEvents] = useState<EventItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDateOffset, setSelectedDateOffset] = useState<number | null>(null);
  const [selectedVenueFilter, setSelectedVenueFilter] = useState('');
  const [selectedTicketClassFilter, setSelectedTicketClassFilter] = useState('');
  
  // Selected Event for Checkouts
  const [selectedBookingEvent, setSelectedBookingEvent] = useState<EventItem | null>(null);
  const [bookingQuantity, setBookingQuantity] = useState<number>(1);
  const [bookingTier, setBookingTier] = useState<'general' | 'vip' | 'elite'>('general');
  
  // Selected Event for view details (12-section single event page)
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<EventItem | null>(null);

  // Selected Artist for view details (standalone single artist page)
  const [selectedArtistForDetail, setSelectedArtistForDetail] = useState<ArtistItem | null>(null);

  // App Navigation: 'home' land, 'explorer' search directory, 'artists' marketplace, 'login', 'signup', 'dashboard', 'help', 'refund-policies', 'terms-of-use'
  const [currentView, setCurrentView] = useState<'home' | 'explorer' | 'artists' | 'login' | 'signup' | 'dashboard' | 'help' | 'refund-policies' | 'terms-of-use'>('home');
  const [loginInitialMode, setLoginInitialMode] = useState<'login' | 'signup'>('login');

  // Authentication State
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [authModal, setAuthModal] = useState<'signup' | 'login' | null>(null);
  const [authFormEmail, setAuthFormEmail] = useState('');
  const [authFormName, setAuthFormName] = useState('');
  const [authFormPassword, setAuthFormPassword] = useState('');
  const [bookingSuccessToast, setBookingSuccessToast] = useState(false);

  // Load live published events from Firestore
  useEffect(() => {
    getPublishedEvents().then(setEvents);
  }, []);

  // Listen to Firebase authentication states
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          email: user.email || '',
          name: user.displayName || user.email?.split('@')[0] || 'Concert Fan'
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Filter events based on active queries
  const processedEvents = useMemo(() => {
    return events.filter((evt) => {
      // 1. Category Filter
      const matchCategory = selectedCategory === 'all' || evt.category === selectedCategory;

      // 2. Search Query (matches title, location, category)
      const matchesSearch = searchQuery === '' || 
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.category.toLowerCase().includes(searchQuery.toLowerCase());

      // 3. Date / Offset simulation
      let matchDate = true;
      if (selectedDateOffset !== null) {
        if (selectedDateOffset === 0) {
          matchDate = evt.date.includes('18');
        } else if (selectedDateOffset === 1) {
          matchDate = evt.date.includes('19');
        } else if (selectedDateOffset === 3) {
          matchDate = evt.date.includes('20') || evt.date.includes('21');
        }
      }

      return matchCategory && matchesSearch && matchDate;
    });
  }, [searchQuery, selectedCategory, selectedDateOffset]);

  // Group events by location/category for display groups (unfiltered listings on the home page)
  const topEvents = useMemo(() => {
    return events.filter((e) => e.type === 'top');
  }, [events]);

  const nearByEvents = useMemo(() => {
    return events.filter((e) => e.type === 'near-by');
  }, [events]);

  // Handlers
  const handleScrollToSection = (id: string) => {
    setSelectedEventForDetail(null);
    setSelectedArtistForDetail(null);
    if (id === 'explorer') {
      setCurrentView('explorer');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (id === 'artists') {
      setCurrentView('artists');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (id === 'help') {
      setCurrentView('help');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentView('home');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (id === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleOpenAuth = (type: 'signup' | 'login') => {
    setLoginInitialMode(type);
    setCurrentView(type);
    setSelectedEventForDetail(null);
    setSelectedArtistForDetail(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authFormEmail) return;

    if (authModal === 'signup') {
      setCurrentUser({
        email: authFormEmail,
        name: authFormName || 'Adventure Explorer'
      });
    } else {
      setCurrentUser({
        email: authFormEmail,
        name: authFormEmail.split('@')[0] || 'Guest User'
      });
    }
    setAuthModal(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setCurrentView('home');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleBookEvent = (event: EventItem) => {
    setSelectedBookingEvent(event);
  };

  const handleSubscriptionToast = (email: string) => {
    // handled inside footer, but lets trigger console log nicely
    console.log(`Subscribed email: ${email}`);
  };

  if (currentView === 'login') {
    return (
      <LoginPage 
        initialMode={loginInitialMode}
        onBack={() => {
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onSuccess={(user) => {
          setCurrentUser(user);
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onSwitchToSignup={() => {
          setCurrentView('signup');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />
    );
  }

  if (currentView === 'signup') {
    return (
      <SignupPage 
        onBack={() => {
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onSuccess={(user) => {
          setCurrentUser(user);
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onSwitchToLogin={() => {
          setCurrentView('login');
          setLoginInitialMode('login');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-on-background overflow-x-clip" id="jazbaticket-root">
      
      {/* 3. STICKY NAVIGATION BAR */}
      <Navbar 
        onScrollToSection={handleScrollToSection} 
        onOpenAuth={handleOpenAuth} 
        currentUser={currentUser}
        onGoToDashboard={() => {
          setCurrentView('dashboard');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onLogout={handleLogout}
        isHome={currentView === 'home' && !selectedEventForDetail && !selectedArtistForDetail}
      />

      {selectedBookingEvent ? (
        <CheckoutPage 
          event={selectedBookingEvent}
          initialQuantity={selectedEventForDetail ? bookingQuantity : 1}
          initialTier={selectedEventForDetail ? bookingTier : 'general'}
          onBack={() => {
            setSelectedBookingEvent(null);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onGoToDashboard={() => {
            setSelectedBookingEvent(null);
            setSelectedEventForDetail(null);
            setSelectedArtistForDetail(null);
            setCurrentView('dashboard');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      ) : selectedEventForDetail ? (
        <EventDetailPage
          event={selectedEventForDetail}
          allEvents={events}
          onBack={() => {
            setSelectedEventForDetail(null);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onBook={(evt, qty, tier) => {
            setBookingQuantity(qty);
            setBookingTier(tier);
            setSelectedBookingEvent(evt);
          }}
          onSelectRelatedEvent={(evt) => {
            setSelectedEventForDetail(evt);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      ) : selectedArtistForDetail ? (
        <ArtistDetailPage
          artist={selectedArtistForDetail}
          allEvents={events}
          onBack={() => {
            setSelectedArtistForDetail(null);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onViewShowDetail={(showTitle) => {
            const matched = events.find(e => e.title.toLowerCase().includes(showTitle.toLowerCase()));
            if (matched) {
              setSelectedEventForDetail(matched);
              setSelectedArtistForDetail(null);
            } else {
              setCurrentView('explorer');
              setSelectedArtistForDetail(null);
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onBookEvent={(evt) => {
            setSelectedBookingEvent(evt);
          }}
        />
      ) : currentView === 'dashboard' ? (
        <UserDashboardPage
          currentUser={currentUser}
          allEvents={events}
          onLogout={() => {
            handleLogout();
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onBackToHome={() => {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onViewShowDetail={(evt) => {
            setSelectedEventForDetail(evt);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onExploreEvents={() => {
            setCurrentView('explorer');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      ) : currentView === 'explorer' ? (
        <EventsExplorerPage 
          events={events}
          categories={categories}
          initialCategory={selectedCategory}
          initialSearchTerm={searchQuery}
          initialVenue={selectedVenueFilter}
          initialTicketClass={selectedTicketClassFilter}
          initialDateOffset={selectedDateOffset}
          onBook={(evt) => {
            setSelectedBookingEvent(evt);
          }}
          onViewDetail={(evt) => {
            setSelectedEventForDetail(evt);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onBackToHome={() => {
            setCurrentView('home');
            setSelectedCategory('all');
            setSearchQuery('');
            setSelectedDateOffset(null);
            setSelectedVenueFilter('');
            setSelectedTicketClassFilter('');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      ) : currentView === 'artists' ? (
        <ArtistsPage 
          onBackToHome={() => {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onViewShowDetail={(showTitle) => {
            const matched = events.find(e => e.title.toLowerCase().includes(showTitle.toLowerCase()));
            if (matched) {
              setSelectedEventForDetail(matched);
            } else {
              // Find another event in category or just direct explorer
              setCurrentView('explorer');
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onSelectArtist={(artist) => {
            setSelectedArtistForDetail(artist);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      ) : currentView === 'help' ? (
        <HelpPage 
          onBackToHome={() => {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onExploreEvents={() => {
            setCurrentView('explorer');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      ) : currentView === 'refund-policies' ? (
        <RefundPoliciesPage 
          onBackToHome={() => {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      ) : currentView === 'terms-of-use' ? (
        <TermsOfUsePage 
          onBackToHome={() => {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      ) : (
        <>
          {/* 4. HERO SECTION */}
          <HeroSection 
            onSearch={(query) => setSearchQuery(query)}
            onSelectDateFilter={(offset) => setSelectedDateOffset(offset)}
            onSearchSubmit={({ query, venue, ticketClass, dateOffset }) => {
              setSearchQuery(query);
              setSelectedVenueFilter(venue);
              setSelectedTicketClassFilter(ticketClass);
              setSelectedDateOffset(dateOffset);
              setCurrentView('explorer');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />

          {/* 5. VISUAL CATEGORIES GRID */}
          <CategoryCircles 
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => {
              setSelectedCategory(id);
              setCurrentView('explorer');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />

          {/* 6. TOP EVENTS SECTION */}
          <section 
            className="max-w-7xl mx-auto px-4 py-16 sm:px-6 md:px-8 border-b border-neutral-200/50"
            id="top-events"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-display font-bold text-black tracking-tight">Top events</h2>
                <p className="text-[17px] text-neutral-500 mt-2 font-normal">Handpicked premiere experiences taking London and Hamilton by storm.</p>
              </div>
              <button 
                onClick={() => {
                  setCurrentView('explorer');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-black hover:underline cursor-pointer group shrink-0"
              >
                View All Events ↗
              </button>
            </div>

            {/* Dynamic Warning if empty results */}
            {topEvents.length === 0 ? (
              <div className="p-12 text-center bg-neutral-50 rounded-3xl border border-dashed border-neutral-200 max-w-lg mx-auto">
                <Info className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                <h4 className="font-extrabold text-[#E34718] text-lg">No Matching Events Found</h4>
                <p className="text-xs text-neutral-500 font-bold mt-1">Try relaxing your search terms or choosing "All Categories" from the discover grid above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {topEvents.map((evt) => (
                  <EventCard 
                    key={evt.id} 
                    event={evt} 
                    onBook={handleBookEvent} 
                    onViewDetail={setSelectedEventForDetail}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 7. EVENTS FOR YOU CHALET (CHARTREUSE COLOR SECTION) */}
          <EventsForYou 
            events={events} 
            onBook={handleBookEvent} 
            onViewDetail={setSelectedEventForDetail}
          />

          {/* 8. EVENTS NEAR BY YOUR CITY */}
          <section 
            className="max-w-7xl mx-auto px-4 py-16 sm:px-6 md:px-8 border-b border-neutral-200/50"
            id="near-by"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-display font-bold text-black tracking-tight">Events Near By Your City</h2>
                <p className="text-[17px] text-neutral-500 mt-2 font-normal">Spontaneous local concerts, exhibitions, and sports championships near you.</p>
              </div>
              <button 
                onClick={() => {
                  setCurrentView('explorer');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-black hover:underline cursor-pointer group shrink-0"
              >
                View All Events ↗
              </button>
            </div>

            {nearByEvents.length === 0 ? (
              <div className="p-12 text-center bg-neutral-50 rounded-3xl border border-dashed border-neutral-200 max-w-lg mx-auto">
                <Info className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                <h4 className="font-extrabold text-[#E34718] text-lg">No Local Shows Available</h4>
                <p className="text-xs text-neutral-500 font-bold mt-1">There are no city events matching your filter variables currently.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {nearByEvents.map((evt) => (
                  <EventCard 
                    key={evt.id} 
                    event={evt} 
                    onBook={handleBookEvent} 
                    onViewDetail={setSelectedEventForDetail}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 9. UPCOMING EVENTS ROWS LIST */}
          <UpcomingRows 
            events={events} 
            onBook={handleBookEvent} 
            onViewAll={() => {
              setCurrentView('explorer');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onViewDetail={setSelectedEventForDetail}
          />

          {/* 10. FAQ ACCORDION SECTION */}
          <FaqAccordion faqs={faqs} />
        </>
      )}

      {/* 11. FOOTER AND NEWSLETTER WRAPPER */}
      <Footer 
        onScrollToSection={handleScrollToSection}
        onSubscribe={handleSubscriptionToast}
        onViewRefundPolicies={() => {
          setSelectedEventForDetail(null);
          setSelectedArtistForDetail(null);
          setCurrentView('refund-policies');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        onViewTermsOfUse={() => {
          setSelectedEventForDetail(null);
          setSelectedArtistForDetail(null);
          setCurrentView('terms-of-use');
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />



      {/* 13. AUTH MODAL */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-neutral-200/90 rounded-[28px] p-6 w-full max-w-md shadow-xl relative">
            <button 
              onClick={() => setAuthModal(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-neutral-200/50 flex items-center justify-center text-neutral-500 hover:text-black hover:bg-neutral-50"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#E34718] rounded-full flex items-center justify-center border-2 border-[#C23A12]/30 shadow-xs mb-3">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-800">
                {authModal === 'signup' ? 'Create Your Account' : 'Welcome Back'}
              </h3>
              <p className="text-xs text-neutral-400 font-medium mt-1">
                {authModal === 'signup' 
                  ? 'Sign up to manage digital entry passes' 
                  : 'Enter email to retrieve transaction historical receipts'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authModal === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={authFormName}
                    onChange={(e) => setAuthFormName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-white border-2 border-neutral-200/80 rounded-xl p-3 text-sm font-semibold focus:ring-1 focus:ring-[#E34718] focus:outline-none text-neutral-800 placeholder-neutral-300"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Email address</label>
                <input 
                  type="email" 
                  value={authFormEmail}
                  onChange={(e) => setAuthFormEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white border-2 border-neutral-200/80 rounded-xl p-3 text-sm font-semibold focus:ring-1 focus:ring-[#E34718] focus:outline-none text-neutral-800 placeholder-neutral-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Password</label>
                <input 
                  type="password" 
                  value={authFormPassword}
                  onChange={(e) => setAuthFormPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border-2 border-neutral-200/80 rounded-xl p-3 text-sm font-semibold focus:ring-1 focus:ring-[#E34718] focus:outline-none text-neutral-800 placeholder-neutral-300"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#E34718] hover:bg-[#C23A12] text-white py-3 rounded-xl font-bold text-sm uppercase transition-all shadow-sm cursor-pointer"
              >
                {authModal === 'signup' ? 'Register Account' : 'Sign In Now'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
