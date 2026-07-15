/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { Info } from 'lucide-react';
import { onAuthStateChanged, signOut, auth } from './firebase';
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
import ArtistsPage, { ArtistItem, mapArtistProfileToItem } from './components/ArtistsPage';
import ArtistDetailPage from './components/ArtistDetailPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import UserDashboardPage from './components/UserDashboardPage';
import HelpPage from './components/HelpPage';
import RefundPoliciesPage from './components/RefundPoliciesPage';
import TermsOfUsePage from './components/TermsOfUsePage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import AffiliatePage from './components/AffiliatePage';
import TicketSafetyPage from './components/TicketSafetyPage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import OrganizersPage from './components/OrganizersPage';
import OrganizerDetailPage from './components/OrganizerDetailPage';
import { categories, faqs } from './data';
import { EventItem } from './types';
import { getPublishedEvents, getAllArtists } from './services/backendService';

type AuthUser = { email: string; name: string; profileImage?: string } | null;

// ---------------------------------------------------------------------------
// Small shared building blocks
// ---------------------------------------------------------------------------

/** Scroll to the top of the document whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Keep the browser-tab title in sync with the current route (SEO + UX). */
const PAGE_TITLES: Array<{ match: (path: string) => boolean; title: string }> = [
  { match: (p) => p === '/', title: 'Jazbaticket — Book Live Events, Concerts & Artists' },
  { match: (p) => p === '/events', title: 'All Events — Jazbaticket' },
  { match: (p) => p.startsWith('/events/'), title: 'Event Details — Jazbaticket' },
  { match: (p) => p === '/artists', title: 'Book an Artist — Jazbaticket' },
  { match: (p) => p.startsWith('/artists/'), title: 'Artist Profile — Jazbaticket' },
  { match: (p) => p === '/checkout', title: 'Secure Checkout — Jazbaticket' },
  { match: (p) => p === '/dashboard', title: 'My Account — Jazbaticket' },
  { match: (p) => p === '/help', title: 'Help Centre — Jazbaticket' },
  { match: (p) => p === '/about', title: 'About Us — Jazbaticket' },
  { match: (p) => p === '/contact', title: 'Contact — Jazbaticket' },
  { match: (p) => p === '/refund-policies', title: 'Refund Policy — Jazbaticket' },
  { match: (p) => p === '/terms-of-use', title: 'Terms of Use — Jazbaticket' },
  { match: (p) => p === '/affiliates', title: 'Affiliate Programme — Jazbaticket' },
  { match: (p) => p === '/ticket-safety', title: 'Ticket Safety — Jazbaticket' },
  { match: (p) => p === '/privacy', title: 'Privacy Policy — Jazbaticket' },
  { match: (p) => p === '/organizers', title: 'Event Organisers — Jazbaticket' },
  { match: (p) => p.startsWith('/organizers/'), title: 'Organiser Profile — Jazbaticket' },
  { match: (p) => p === '/login', title: 'Sign In — Jazbaticket' },
  { match: (p) => p === '/signup', title: 'Sign Up — Jazbaticket' },
];

function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const entry = PAGE_TITLES.find((t) => t.match(pathname));
    document.title = entry ? entry.title : 'Page Not Found — Jazbaticket';
  }, [pathname]);
  return null;
}

function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-white">
      <div className="flex items-center gap-3 text-black">
        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold tracking-wide">Loading…</span>
      </div>
    </div>
  );
}

function NotFoundView() {
  const navigate = useNavigate();
  return (
    <div className="jz-page min-h-[70vh] bg-white flex items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <div className="font-display font-bold text-6xl sm:text-7xl leading-none text-black">404</div>
        <h1 className="font-display font-bold text-2xl mt-4">This page took an early exit.</h1>
        <p className="text-sm text-[#666] mt-3 leading-relaxed">
          The link may be broken or the show has ended. Let's get you back to the good stuff.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="bg-[#ffed00] text-black font-bold text-sm px-6 py-3.5 cursor-pointer"
          >
            Back to home
          </button>
          <button
            onClick={() => navigate('/events')}
            className="bg-black text-white font-bold text-sm px-6 py-3.5 cursor-pointer hover:bg-neutral-800 transition-colors"
          >
            Browse events
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route views — each turns URL / router state into the props the pages expect
// ---------------------------------------------------------------------------

function HomeView({ events }: { events: EventItem[] }) {
  const navigate = useNavigate();

  const topEvents = useMemo(() => events.filter((e) => e.type === 'top'), [events]);
  const nearByEvents = useMemo(() => events.filter((e) => e.type === 'near-by'), [events]);

  const goDetail = (evt: EventItem) => navigate(`/events/${evt.id}`);
  const goCheckout = (evt: EventItem) =>
    navigate('/checkout', { state: { event: evt, quantity: 1, tier: 'general' } });

  return (
    <>
      <HeroSection
        onSearch={() => {}}
        onSelectDateFilter={() => {}}
        onBookArtist={() => navigate('/artists')}
        onSearchSubmit={({ query, venue, ticketClass, dateOffset }) => {
          const p = new URLSearchParams();
          if (query) p.set('q', query);
          if (venue) p.set('venue', venue);
          if (ticketClass) p.set('class', ticketClass);
          if (dateOffset !== null && dateOffset !== undefined) p.set('date', String(dateOffset));
          const qs = p.toString();
          navigate(qs ? `/events?${qs}` : '/events');
        }}
      />

      <CategoryCircles
        categories={categories}
        selectedCategory="all"
        onSelectCategory={(id) => navigate(`/events?category=${id}`)}
      />

      {/* TOP EVENTS */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 md:px-8" id="top-events">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#666]">Trending now</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-black tracking-tight leading-[0.95] mt-2">Top events</h2>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="text-sm font-bold text-black underline cursor-pointer shrink-0"
          >
            View all
          </button>
        </div>

        {topEvents.length === 0 ? (
          <div className="p-12 text-center bg-neutral-50 rounded-3xl max-w-lg mx-auto">
            <Info className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
            <h4 className="font-extrabold text-[#E34718] text-lg">No events yet</h4>
            <p className="text-xs text-neutral-500 font-bold mt-1">Check back soon — new shows go on sale every day.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topEvents.map((evt) => (
              <EventCard key={evt.id} event={evt} onBook={goCheckout} onViewDetail={goDetail} />
            ))}
          </div>
        )}
      </section>

      <EventsForYou events={events} onBook={goCheckout} onViewDetail={goDetail} />

      {/* NEAR BY */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 md:px-8" id="near-by">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#666]">Close to home</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-black tracking-tight leading-[0.95] mt-2">Events near you</h2>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="text-sm font-bold text-black underline cursor-pointer shrink-0"
          >
            View all
          </button>
        </div>

        {nearByEvents.length === 0 ? (
          <div className="p-12 text-center bg-neutral-50 rounded-3xl max-w-lg mx-auto">
            <Info className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
            <h4 className="font-extrabold text-[#E34718] text-lg">No Local Shows Available</h4>
            <p className="text-xs text-neutral-500 font-bold mt-1">There are no city events matching your filter variables currently.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {nearByEvents.map((evt) => (
              <EventCard key={evt.id} event={evt} onBook={goCheckout} onViewDetail={goDetail} />
            ))}
          </div>
        )}
      </section>

      <UpcomingRows
        events={events}
        onBook={goCheckout}
        onViewAll={() => navigate('/events')}
        onViewDetail={goDetail}
      />

      <FaqAccordion faqs={faqs} />
    </>
  );
}

function ExplorerView({ events }: { events: EventItem[] }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dateParam = params.get('date');

  return (
    <EventsExplorerPage
      events={events}
      categories={categories}
      initialCategory={params.get('category') || 'all'}
      initialSearchTerm={params.get('q') || ''}
      initialVenue={params.get('venue') || ''}
      initialTicketClass={params.get('class') || ''}
      initialDateOffset={dateParam !== null ? Number(dateParam) : null}
      onBook={(evt) => navigate('/checkout', { state: { event: evt, quantity: 1, tier: 'general' } })}
      onViewDetail={(evt) => navigate(`/events/${evt.id}`)}
      onBackToHome={() => navigate('/')}
    />
  );
}

function EventDetailView({ events, eventsLoaded }: { events: EventItem[]; eventsLoaded: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = events.find((e) => e.id === id);

  useEffect(() => {
    if (event) document.title = `${event.title} — Tickets | Jazbaticket`;
  }, [event]);

  if (!eventsLoaded) return <PageLoading />;
  if (!event) return <NotFoundView />;

  return (
    <EventDetailPage
      event={event}
      allEvents={events}
      onBack={() => navigate('/events')}
      onBook={(evt, quantity, tier) => navigate('/checkout', { state: { event: evt, quantity, tier } })}
      onSelectRelatedEvent={(evt) => navigate(`/events/${evt.id}`)}
      onRequireLogin={() => navigate('/login')}
    />
  );
}

function CheckoutView() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { event?: EventItem; quantity?: number; tier?: 'general' | 'vip' | 'elite' } | null;

  if (!state?.event) return <Navigate to="/events" replace />;

  return (
    <CheckoutPage
      event={state.event}
      initialQuantity={state.quantity || 1}
      initialTier={state.tier || 'general'}
      onBack={() => navigate(-1)}
      onGoToDashboard={() => navigate('/dashboard')}
    />
  );
}

function ArtistsView({ events }: { events: EventItem[] }) {
  const navigate = useNavigate();
  return (
    <ArtistsPage
      onBackToHome={() => navigate('/')}
      onViewShowDetail={(showTitle) => {
        const matched = events.find((e) => e.title.toLowerCase().includes(showTitle.toLowerCase()));
        navigate(matched ? `/events/${matched.id}` : `/events?q=${encodeURIComponent(showTitle)}`);
      }}
      onSelectArtist={(artist) => navigate(`/artists/${artist.id}`, { state: { artist } })}
      onRequireLogin={() => navigate('/login')}
    />
  );
}

function ArtistDetailView({ events }: { events: EventItem[] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const passed = (location.state as { artist?: ArtistItem } | null)?.artist;

  const [artist, setArtist] = useState<ArtistItem | null>(passed ?? null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (passed && passed.id === id) {
      setArtist(passed);
      return;
    }
    let cancelled = false;
    getAllArtists().then((profiles) => {
      if (cancelled) return;
      const found = profiles.map(mapArtistProfileToItem).find((a) => a.id === id) || null;
      setArtist(found);
      setNotFound(!found);
    });
    return () => {
      cancelled = true;
    };
  }, [id, passed]);

  useEffect(() => {
    if (artist) document.title = `${artist.name} — Book This Artist | Jazbaticket`;
  }, [artist]);

  if (notFound) return <NotFoundView />;
  if (!artist) return <PageLoading />;

  return (
    <ArtistDetailPage
      artist={artist}
      allEvents={events}
      onBack={() => navigate('/artists')}
      onViewShowDetail={(showTitle) => {
        const matched = events.find((e) => e.title.toLowerCase().includes(showTitle.toLowerCase()));
        navigate(matched ? `/events/${matched.id}` : `/events?q=${encodeURIComponent(showTitle)}`);
      }}
      onBookEvent={(evt) => navigate('/checkout', { state: { event: evt, quantity: 1, tier: 'general' } })}
      onRequireLogin={() => navigate('/login')}
    />
  );
}

function DashboardView({
  events,
  currentUser,
  onLogout,
}: {
  events: EventItem[];
  currentUser: AuthUser;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  return (
    <UserDashboardPage
      currentUser={currentUser}
      allEvents={events}
      onLogout={onLogout}
      onBackToHome={() => navigate('/')}
      onViewShowDetail={(evt) => navigate(`/events/${evt.id}`)}
      onExploreEvents={() => navigate('/events')}
      initialTab={searchParams.get('tab') || undefined}
    />
  );
}

function LoginView() {
  const navigate = useNavigate();
  return (
    <LoginPage
      initialMode="login"
      onBack={() => navigate('/')}
      onSuccess={() => navigate('/')}
      onSwitchToSignup={() => navigate('/signup')}
    />
  );
}

function SignupView() {
  const navigate = useNavigate();
  return (
    <SignupPage
      onBack={() => navigate('/')}
      onSuccess={() => navigate('/')}
      onSwitchToLogin={() => navigate('/login')}
    />
  );
}

// ---------------------------------------------------------------------------
// Shell — holds global state (events + auth) and the chrome (nav + footer)
// ---------------------------------------------------------------------------

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser>(null);

  // Load published events once
  useEffect(() => {
    getPublishedEvents()
      .then((list) => setEvents(list))
      .finally(() => setEventsLoaded(true));
  }, []);

  // Track Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          email: user.email || '',
          name: user.displayName || user.email?.split('@')[0] || 'Concert Fan',
          profileImage: user.photoURL || '',
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Navbar / Footer section links → routes (or anchor-scroll on home)
  const handleSection = (id: string) => {
    if (id === 'explorer') return navigate('/events');
    if (id === 'artists') return navigate('/artists');
    if (id === 'help') return navigate('/help');
    if (id === 'about') return navigate('/about');
    if (id === 'contact') return navigate('/contact');
    if (id === 'affiliates') return navigate('/affiliates');
    if (id === 'ticket-safety') return navigate('/ticket-safety');
    if (id === 'privacy') return navigate('/privacy');
    if (id === 'organizers') return navigate('/organizers');
    if (id === 'top') {
      if (location.pathname !== '/') navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const scrollToEl = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(scrollToEl, 150);
    } else {
      scrollToEl();
    }
  };

  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background font-sans text-on-background overflow-x-clip" id="jazbaticket-root">
      <Navbar
        onScrollToSection={handleSection}
        onOpenAuth={(type) => navigate(`/${type}`)}
        currentUser={currentUser}
        onGoToDashboard={(tab?: string) => navigate(tab ? `/dashboard?tab=${tab}` : '/dashboard')}
        onLogout={handleLogout}
        isHome={isHome}
      />

      <Routes>
        <Route path="/" element={<HomeView events={events} />} />
        <Route path="/events" element={<ExplorerView events={events} />} />
        <Route path="/events/:id" element={<EventDetailView events={events} eventsLoaded={eventsLoaded} />} />
        <Route path="/checkout" element={<CheckoutView />} />
        <Route path="/artists" element={<ArtistsView events={events} />} />
        <Route path="/artists/:id" element={<ArtistDetailView events={events} />} />
        <Route path="/organizers" element={<OrganizersPage />} />
        <Route path="/organizers/:id" element={<OrganizerDetailPage allEvents={events} onRequireLogin={() => navigate('/login')} />} />
        <Route path="/dashboard" element={<DashboardView events={events} currentUser={currentUser} onLogout={handleLogout} />} />
        <Route path="/help" element={<HelpPage onBackToHome={() => navigate('/')} onExploreEvents={() => navigate('/events')} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/refund-policies" element={<RefundPoliciesPage onBackToHome={() => navigate('/')} />} />
        <Route path="/terms-of-use" element={<TermsOfUsePage onBackToHome={() => navigate('/')} />} />
        <Route path="/affiliates" element={<AffiliatePage />} />
        <Route path="/ticket-safety" element={<TicketSafetyPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/signup" element={<SignupView />} />
        <Route path="*" element={<NotFoundView />} />
      </Routes>

      <Footer
        onScrollToSection={handleSection}
        onSubscribe={(email) => console.log(`Subscribed email: ${email}`)}
        onViewRefundPolicies={() => navigate('/refund-policies')}
        onViewTermsOfUse={() => navigate('/terms-of-use')}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <PageTitle />
      <AppShell />
    </BrowserRouter>
  );
}
