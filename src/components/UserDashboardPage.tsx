import React, { useState, useEffect } from 'react';
import {
  User, Ticket, Calendar, MapPin, Clock, CreditCard, Settings,
  ShieldCheck, LogOut, Heart, Compass, Sparkles,
  CheckCircle, Printer, Bell, Info, Mail, Phone, ArrowRight, Share2,
} from 'lucide-react';
import { EventItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { isUserBootstrappedAdmin } from '../services/backendService';
import AdminHub from './AdminHub';
import OrganizerHub from './OrganizerHub';
import ArtistHub from './ArtistHub';

const PLACEHOLDER_EVENT: EventItem = {
  id: 'unknown',
  title: 'Event details unavailable',
  image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=crop',
  category: 'music',
  date: 'TBA',
  location: 'TBA',
  time: 'TBA',
  price: 0,
  type: 'upcoming',
};

interface UserDashboardPageProps {
  currentUser: { email: string; name: string } | null;
  allEvents: EventItem[];
  onLogout: () => void;
  onBackToHome: () => void;
  onViewShowDetail: (event: EventItem) => void;
  onExploreEvents: () => void;
}

interface PersonalBooking {
  id: string;
  event: EventItem;
  quantity: number;
  tier: 'general' | 'vip' | 'elite';
  bookingDate: string;
  orderId: string;
  seat: string;
  barCode: string;
  pricePaid: number;
}

type TabId = 'overview' | 'passes' | 'watchlist' | 'billing' | 'settings' | 'admin' | 'organizer' | 'artist';

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

export default function UserDashboardPage({
  currentUser,
  allEvents,
  onLogout,
  onBackToHome,
  onViewShowDetail,
  onExploreEvents,
}: UserDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [userRole, setUserRole] = useState<'admin' | 'organizer' | 'artist' | 'user'>('user');
  const [userStatus, setUserStatus] = useState<'active' | 'suspended'>('active');

  // Profile settings
  const [profileName, setProfileName] = useState(currentUser?.name || 'Guest');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCity, setProfileCity] = useState('London');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Notification preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [artistUpdates, setArtistUpdates] = useState(true);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [watchlist, setWatchlist] = useState<EventItem[]>([]);
  const [userBookings, setUserBookings] = useState<PersonalBooking[]>([]);

  // ── DATA LOADING (unchanged behaviour) ─────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setWatchlist(allEvents.slice(0, 3));

    const loadUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setUserBookings([]);
        return;
      }

      // 1. Profile from users/{uid}
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const udata = userDocSnap.data();
          if (udata.name) setProfileName(udata.name);
          if (udata.email) setProfileEmail(udata.email);
          if (udata.phone) setProfilePhone(udata.phone);
          if (udata.city) setProfileCity(udata.city);
          if (udata.role) setUserRole(udata.role);
          if (udata.status) setUserStatus(udata.status);
        } else {
          const isBootAdmin = isUserBootstrappedAdmin(user.email);
          const defaultRole = isBootAdmin ? 'admin' : 'user';
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || user.email?.split('@')[0] || 'Member',
            phone: '',
            role: defaultRole,
            profileImage: user.photoURL || '',
            createdAt: new Date().toISOString(),
            status: 'active',
            city: 'London',
            updatedAt: new Date().toISOString(),
          });
          setUserRole(defaultRole);
          setUserStatus('active');
        }
      } catch (err) {
        console.error('Failed to load user document:', err);
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      // 2. Bookings where userId == uid, with localStorage fallback
      try {
        const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', user.uid));
        const bookingsSnap = await getDocs(bookingsQuery);

        const loaded: PersonalBooking[] = [];
        bookingsSnap.forEach((bookingDoc) => {
          const item = bookingDoc.data();
          const evt = allEvents.find((e) => e.id === item.eventId) || allEvents[0] || PLACEHOLDER_EVENT;
          loaded.push({
            id: bookingDoc.id,
            event: evt,
            quantity: item.quantity || 1,
            tier: item.tier || 'general',
            bookingDate: item.bookingDate || 'Just now',
            orderId: item.orderId || `JXB-${bookingDoc.id.substring(0, 4).toUpperCase()}`,
            seat: item.seat || 'F-12',
            barCode: item.barCode || '937284918231',
            pricePaid: item.pricePaid || evt.price,
          });
        });

        if (loaded.length > 0) {
          setUserBookings(loaded);
        } else {
          let formattedLocal: PersonalBooking[] = [];
          try {
            const stored = localStorage.getItem('jazbaticket_bookings');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                formattedLocal = parsed.map((item: any, index: number) => {
                  const evt = allEvents.find((e) => e.id === item.eventId) || allEvents[0] || PLACEHOLDER_EVENT;
                  return {
                    id: `bk-local-${index}`,
                    event: evt,
                    quantity: item.quantity || 1,
                    tier: item.tier || 'general',
                    bookingDate: item.bookingDate || 'Just now',
                    orderId: item.orderId || `JXB-LOCAL-${index}`,
                    seat: item.seat || `${String.fromCharCode(65 + index)}-8`,
                    barCode: item.barCode || Math.floor(100000000000 + Math.random() * 900000000000).toString(),
                    pricePaid: item.pricePaid || evt.price,
                  };
                });
              }
            }
          } catch (e) {
            console.error('Local storage lookup error:', e);
          }
          setUserBookings(formattedLocal);
        }
      } catch (err: any) {
        console.error('Failed to load user bookings:', err);
        handleFirestoreError(err, OperationType.LIST, 'bookings');
        setUserBookings([]);
      }
    };

    loadUserData();
  }, [currentUser, allEvents]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !profileEmail) {
      setSaveError('Please enter a valid name and email address.');
      setSaveSuccess(false);
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setSaveError('You need to be signed in to update your profile.');
      return;
    }
    setSaveError('');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: profileEmail,
        name: profileName,
        phone: profilePhone,
        city: profileCity,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Save profile error:', err);
      setSaveError(err.message || 'Could not save your changes. Please try again.');
      setSaveSuccess(false);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      setPasswordSuccess(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Your new password needs at least 6 characters.');
      setPasswordSuccess(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The passwords don\'t match.');
      setPasswordSuccess(false);
      return;
    }
    setPasswordError('');
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  const handleRemoveFromWatchlist = (eventId: string) => {
    setWatchlist((prev) => prev.filter((item) => item.id !== eventId));
  };

  // ── SUSPENDED ACCOUNT ──────────────────────────────────────────
  if (userStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-[#111111] border border-white/15 p-10 max-w-md w-full text-white">
          <ShieldCheck className="w-10 h-10 text-[#ffed00]" />
          <h2 className="font-display font-bold text-3xl leading-[0.95] mt-6">Account suspended</h2>
          <p className="text-sm text-white/70 mt-4 leading-relaxed">
            Your account has been suspended. If you think this is a mistake, contact our support team and we'll look into it right away.
          </p>
          <div className="border-t border-white/15 mt-6 pt-5 space-y-3 text-sm">
            <div>
              <span className={`${overline} text-white/50 block`}>Account ID</span>
              <span className="text-white/90 break-all">{auth.currentUser?.uid}</span>
            </div>
            <div>
              <span className={`${overline} text-white/50 block`}>Support</span>
              <span className="text-white/90">support@jazbaticket.com</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-8 py-4 bg-[#ffed00] text-black text-sm font-bold cursor-pointer hover:bg-[#e6d200] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const totalPassesCount = userBookings.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmountSpent = userBookings.reduce((sum, item) => sum + item.pricePaid, 0);
  const nextBooking = userBookings[0];

  const navItems: { id: TabId; label: string; icon: React.ElementType; count?: number; show: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: User, show: true },
    { id: 'passes', label: 'My tickets', icon: Ticket, count: userBookings.length, show: true },
    { id: 'watchlist', label: 'Watchlist', icon: Heart, count: watchlist.length, show: true },
    { id: 'billing', label: 'Orders & billing', icon: CreditCard, show: true },
    { id: 'settings', label: 'Account settings', icon: Settings, show: true },
    { id: 'admin', label: 'Admin console', icon: ShieldCheck, show: userRole === 'admin' },
    { id: 'organizer', label: 'Organiser hub', icon: Calendar, show: userRole === 'organizer' },
    { id: 'artist', label: 'Artist hub', icon: Sparkles, show: userRole === 'artist' },
  ];

  const sectionHead = (title: string, sub: string) => (
    <div className="border-b border-black pb-4 mb-8">
      <h2 className="font-display font-bold text-2xl leading-[0.95]">{title}</h2>
      <p className="text-sm text-[#666] mt-2">{sub}</p>
    </div>
  );

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="user-dashboard-wrapper">

      {/* ── HEADER — black band ───────────────────────────────── */}
      <section className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#ffed00] text-black flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-2xl uppercase">
                  {profileName.substring(0, 2)}
                </span>
              </div>
              <div>
                <span className={`${overline} text-[#ffed00]`}>My account</span>
                <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl leading-[0.95] mt-2">
                  {profileName}
                </h1>
                <p className="text-white/60 text-sm mt-3">{profileEmail} · {profileCity}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onBackToHome}
                className="h-12 px-6 bg-black text-white border border-white text-sm font-bold cursor-pointer hover:bg-white/10 transition-colors"
              >
                Browse events
              </button>
              <button
                onClick={onLogout}
                className="h-12 px-6 bg-white text-black text-sm font-bold cursor-pointer hover:bg-white/90 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>

          {/* Stats row — breathing room so values never touch the dividers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 border-t border-white/15 mt-10 pt-8">
            {[
              { label: 'Tickets held', value: totalPassesCount },
              { label: 'Watchlist', value: watchlist.length },
              { label: 'Total spent', value: `$${totalAmountSpent}` },
              { label: 'Member status', value: 'Active' },
            ].map((s) => (
              <div key={s.label} className="pr-4 sm:px-10 sm:first:pl-0 sm:border-r sm:border-white/15 sm:last:border-r-0">
                <div className={`${overline} text-white/50`}>{s.label}</div>
                <div className="font-display font-bold text-2xl sm:text-3xl mt-2">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BODY — sidebar + content ──────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* SIDEBAR NAV */}
          <aside className="lg:col-span-3 lg:sticky lg:top-20">
            <nav className="border border-[#e4e4e4]">
              {navItems.filter((n) => n.show).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 border-b border-[#f2f2f2] last:border-b-0 text-sm font-bold cursor-pointer transition-colors text-left ${
                    activeTab === item.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#f7f7f7]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </span>
                  {typeof item.count === 'number' ? (
                    <span className={`text-xs font-bold px-2 py-0.5 ${activeTab === item.id ? 'bg-[#ffed00] text-black' : 'bg-[#f2f2f2] text-black'}`}>
                      {item.count}
                    </span>
                  ) : (
                    <ArrowRight className="w-4 h-4 opacity-40" />
                  )}
                </button>
              ))}
            </nav>

            <div className="border border-[#e4e4e4] mt-6 p-5">
              <span className={`${overline} text-[#666]`}>Need help?</span>
              <p className="text-sm text-[#222] mt-2 leading-relaxed">
                Our support team answers within 2 hours, every day. <strong className="font-bold">support@jazbaticket.com</strong>
              </p>
            </div>
          </aside>

          {/* CONTENT */}
          <main className="lg:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >

                {/* ── OVERVIEW ─────────────────────────────────── */}
                {activeTab === 'overview' && (
                  <div className="space-y-12">

                    {/* Next event / empty state */}
                    {nextBooking ? (
                      <div className="bg-black text-white p-8">
                        <span className={`${overline} text-[#ffed00]`}>Your next event</span>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-5">
                          <div className="flex gap-5 min-w-0">
                            <img
                              src={nextBooking.event.image}
                              alt={nextBooking.event.title}
                              referrerPolicy="no-referrer"
                              className="w-20 h-20 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-2xl leading-[0.95] truncate">
                                {nextBooking.event.title}
                              </h3>
                              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-white/70">
                                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{nextBooking.event.fullDate || `${nextBooking.event.date}, 2026`}</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{nextBooking.event.time}</span>
                                <span className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5" />{nextBooking.event.location}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTab('passes')}
                            className="shrink-0 bg-[#ffed00] text-black px-6 py-3.5 text-sm font-bold cursor-pointer hover:bg-[#e6d200] transition-colors"
                          >
                            Show my ticket
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-[#e4e4e4] p-10 text-center">
                        <Compass className="w-8 h-8 mx-auto" />
                        <h3 className="font-display font-bold text-2xl leading-[0.95] mt-4">No tickets yet</h3>
                        <p className="text-sm text-[#666] mt-2 max-w-sm mx-auto">
                          When you book a show, your tickets will live here — ready to scan at the door.
                        </p>
                        <button
                          onClick={onExploreEvents}
                          className="mt-6 bg-black text-white px-6 py-3.5 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                          Find your first event
                        </button>
                      </div>
                    )}

                    {/* Activity */}
                    <div>
                      {sectionHead('Latest activity', 'Account updates and offers, newest first.')}
                      <div className="border-t border-[#f2f2f2]">
                        {[
                          { icon: ShieldCheck, title: 'Account verified', body: 'Your account is set up and ready to book.', time: 'Today' },
                          { icon: Sparkles, title: '18% off your next order', body: 'Use code JAZBA18 at checkout on any event.', time: 'Yesterday' },
                          { icon: Bell, title: 'Price alerts on', body: 'We\'ll email you when watchlist shows drop in price.', time: 'This week' },
                        ].map((n) => (
                          <div key={n.title} className="flex items-start gap-4 py-5 border-b border-[#f2f2f2]">
                            <div className="w-10 h-10 bg-[#f7f7f7] flex items-center justify-center shrink-0">
                              <n.icon className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="font-bold text-sm">{n.title}</span>
                                <span className="text-xs text-[#8a8a8a] shrink-0">{n.time}</span>
                              </div>
                              <p className="text-sm text-[#666] mt-1">{n.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommended */}
                    <div>
                      <div className="flex items-end justify-between border-b border-black pb-4 mb-8">
                        <div>
                          <h2 className="font-display font-bold text-2xl leading-[0.95]">Picked for you</h2>
                          <p className="text-sm text-[#666] mt-2">Based on what you've booked and saved.</p>
                        </div>
                        <button onClick={onExploreEvents} className="text-sm font-bold underline cursor-pointer shrink-0">
                          See all
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#f2f2f2] border border-[#f2f2f2]">
                        {allEvents.slice(0, 4).map((evt) => (
                          <div key={evt.id} className="bg-white p-5 flex items-center gap-4">
                            <img
                              src={evt.image}
                              alt={evt.title}
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <span className={`${overline} text-[#8a8a8a]`}>{evt.category}</span>
                              <h4 className="font-bold text-sm truncate mt-1">{evt.title}</h4>
                              <span className="text-sm text-[#666] mt-0.5 block">From ${evt.price} · {evt.date}</span>
                            </div>
                            <button
                              onClick={() => onViewShowDetail(evt)}
                              className="w-10 h-10 border border-black flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#f7f7f7] transition-colors"
                              title="View event"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TICKETS ──────────────────────────────────── */}
                {activeTab === 'passes' && (
                  <div>
                    {sectionHead('My tickets', 'Show the barcode at the entrance — on screen or printed.')}

                    {userBookings.length > 0 ? (
                      <div className="space-y-8">
                        {userBookings.map((pass) => (
                          <div key={pass.id} className="border border-black">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f2f2f2] flex-wrap gap-2">
                              <span className={`${overline} text-[#666]`}>Order {pass.orderId}</span>
                              <span className={`${overline} bg-[#ffed00] text-black px-3 py-1.5`}>
                                {pass.tier === 'elite' ? 'Elite' : pass.tier === 'vip' ? 'VIP' : 'General admission'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12">
                              <div className="md:col-span-8 p-6">
                                <div className="flex gap-4">
                                  <img
                                    src={pass.event.image}
                                    alt={pass.event.title}
                                    referrerPolicy="no-referrer"
                                    className="w-16 h-16 object-cover shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <h4 className="font-display font-bold text-xl leading-[0.95] truncate">{pass.event.title}</h4>
                                    <span className={`${overline} text-[#8a8a8a] mt-1.5 block`}>{pass.event.category}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-[#f2f2f2] mt-6 pt-5 text-sm">
                                  <div>
                                    <span className={`${overline} text-[#8a8a8a] block`}>Time</span>
                                    <span className="font-bold mt-1 block">{pass.event.time}</span>
                                  </div>
                                  <div>
                                    <span className={`${overline} text-[#8a8a8a] block`}>Seats</span>
                                    <span className="font-bold mt-1 block">Row {pass.seat} · {pass.quantity}×</span>
                                  </div>
                                  <div>
                                    <span className={`${overline} text-[#8a8a8a] block`}>Venue</span>
                                    <span className="font-bold mt-1 block truncate" title={pass.event.location}>{pass.event.location}</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-3 mt-6">
                                  <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                                  >
                                    <Printer className="w-4 h-4" /> Print
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(JSON.stringify(pass));
                                      alert('Ticket details copied to clipboard.');
                                    }}
                                    className="flex items-center gap-2 bg-white text-black border border-black px-5 py-2.5 text-sm font-bold cursor-pointer hover:bg-[#f7f7f7] transition-colors"
                                  >
                                    <Share2 className="w-4 h-4" /> Share
                                  </button>
                                </div>
                              </div>

                              {/* QR panel */}
                              <div className="md:col-span-4 bg-[#f7f7f7] p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-[#f2f2f2]">
                                <div className="bg-white p-3 border border-[#e4e4e4]">
                                  <div className="w-24 h-24 grid grid-cols-6 gap-px p-1">
                                    {Array.from({ length: 36 }).map((_, i) => {
                                      const filled = (i % 3 === 0) || (i % 5 === 1) || (i < 6) || (i > 30) || (i % 6 === 0);
                                      return <span key={i} className={`w-full h-full ${filled ? 'bg-black' : 'bg-transparent'}`} />;
                                    })}
                                  </div>
                                </div>
                                <span className="font-bold text-xs tracking-[0.2em] mt-4">
                                  #{pass.barCode.substring(0, 4)}-{pass.barCode.substring(4, 8)}
                                </span>
                                <span className={`${overline} text-[#666] mt-2 flex items-center gap-1`}>
                                  <CheckCircle className="w-3.5 h-3.5" /> Valid for entry
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-[#e4e4e4] py-16 text-center">
                        <Compass className="w-8 h-8 mx-auto" />
                        <h4 className="font-display font-bold text-xl mt-4">No tickets yet</h4>
                        <p className="text-sm text-[#666] mt-2">Book an event and your tickets will appear here.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── WATCHLIST ────────────────────────────────── */}
                {activeTab === 'watchlist' && (
                  <div>
                    {sectionHead('Watchlist', 'Shows you\'re keeping an eye on. Book before they sell out.')}

                    {watchlist.length > 0 ? (
                      <div className="border-t border-[#f2f2f2]">
                        {watchlist.map((show) => (
                          <div key={show.id} className="flex items-center gap-5 py-5 border-b border-[#f2f2f2]">
                            <img
                              src={show.image}
                              alt={show.title}
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <span className={`${overline} text-[#8a8a8a]`}>{show.category}</span>
                              <h4 className="font-bold text-base truncate mt-0.5">{show.title}</h4>
                              <span className="text-sm text-[#666]">From ${show.price} · {show.date}</span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => onViewShowDetail(show)}
                                className="bg-black text-white px-4 py-2 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                              >
                                Book
                              </button>
                              <button
                                onClick={() => handleRemoveFromWatchlist(show.id)}
                                className="bg-white text-black border border-[#e4e4e4] px-4 py-2 text-sm font-bold cursor-pointer hover:border-black transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-[#e4e4e4] py-16 text-center">
                        <Heart className="w-8 h-8 mx-auto" />
                        <h4 className="font-display font-bold text-xl mt-4">Nothing saved yet</h4>
                        <p className="text-sm text-[#666] mt-2 max-w-sm mx-auto">
                          Tap the heart on any event to track it here.
                        </p>
                        <button
                          onClick={onExploreEvents}
                          className="mt-6 bg-black text-white px-6 py-3 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                          Browse events
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── BILLING ──────────────────────────────────── */}
                {activeTab === 'billing' && (
                  <div>
                    {sectionHead('Orders & billing', 'Every order with its receipt — UK bookings include 20% VAT.')}

                    <div className="overflow-x-auto border border-[#e4e4e4]">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-black">
                            <th className={`${overline} text-[#666] py-4 px-5`}>Order</th>
                            <th className={`${overline} text-[#666] py-4 px-5`}>Event</th>
                            <th className={`${overline} text-[#666] py-4 px-5 text-center`}>Qty</th>
                            <th className={`${overline} text-[#666] py-4 px-5 text-right`}>Amount</th>
                            <th className={`${overline} text-[#666] py-4 px-5 text-center`}>Status</th>
                            <th className={`${overline} text-[#666] py-4 px-5 text-right`}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userBookings.length > 0 ? userBookings.map((bk) => (
                            <tr key={bk.id} className="border-b border-[#f2f2f2] last:border-b-0 hover:bg-[#f7f7f7] transition-colors">
                              <td className="py-4 px-5 font-bold">{bk.orderId}</td>
                              <td className="py-4 px-5">
                                <span className="font-bold block truncate max-w-[200px]">{bk.event.title}</span>
                                <span className="text-xs text-[#8a8a8a] capitalize">{bk.tier} ticket</span>
                              </td>
                              <td className="py-4 px-5 text-center">{bk.quantity}</td>
                              <td className="py-4 px-5 text-right font-bold">${bk.pricePaid}.00</td>
                              <td className="py-4 px-5 text-center">
                                <span className="inline-block text-xs font-bold border border-[#e4e4e4] px-2.5 py-1">Paid</span>
                              </td>
                              <td className="py-4 px-5 text-right text-[#666]">{bk.bookingDate}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={6} className="py-10 px-5 text-center text-[#666]">
                                No orders yet — your receipts will appear here after your first booking.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-[#f7f7f7] p-5 mt-6">
                      <span className={`${overline} text-[#666]`}>Billing notes</span>
                      <p className="text-sm text-[#222] mt-2 leading-relaxed">
                        Need a VAT invoice or a business account? Email <strong className="font-bold">support@jazbaticket.com</strong> with your order number.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── SETTINGS ─────────────────────────────────── */}
                {activeTab === 'settings' && (
                  <div className="space-y-14">

                    {/* Profile */}
                    <div>
                      {sectionHead('Profile', 'Your name, contact details and home city.')}

                      <form onSubmit={handleProfileSave}>
                        {saveSuccess && (
                          <div className="flex items-center gap-2 bg-[#f7f7f7] border border-[#e4e4e4] p-4 text-sm font-bold mb-6">
                            <CheckCircle className="w-4 h-4 shrink-0" /> Profile saved.
                          </div>
                        )}
                        {saveError && (
                          <div className="flex items-center gap-2 border border-[#be6464] text-[#be6464] p-4 text-sm font-bold mb-6">
                            <Info className="w-4 h-4 shrink-0" /> {saveError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                          {[
                            { label: 'Full name', icon: User, value: profileName, set: setProfileName, type: 'text', ph: 'Your name' },
                            { label: 'Email address', icon: Mail, value: profileEmail, set: setProfileEmail, type: 'email', ph: 'you@example.com' },
                            { label: 'Phone', icon: Phone, value: profilePhone, set: setProfilePhone, type: 'tel', ph: '+44 …' },
                            { label: 'City', icon: MapPin, value: profileCity, set: setProfileCity, type: 'text', ph: 'London' },
                          ].map((f) => (
                            <div key={f.label}>
                              <label className={`${overline} text-[#666] block mb-2`}>{f.label}</label>
                              <div className="flex items-center gap-3">
                                <f.icon className="w-4 h-4 text-[#8a8a8a] shrink-0" />
                                <input
                                  type={f.type}
                                  value={f.value}
                                  onChange={(e) => f.set(e.target.value)}
                                  placeholder={f.ph}
                                  className="w-full bg-white px-0 py-2.5 text-base text-black placeholder-[#8a8a8a]"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Notifications */}
                        <div className="border-t border-[#f2f2f2] mt-10 pt-8">
                          <h3 className="font-display font-bold text-lg">Notifications</h3>
                          <div className="mt-5 space-y-5">
                            {[
                              { label: 'Order confirmations & receipts', note: 'Email your tickets and receipt after every booking.', checked: emailAlerts, set: setEmailAlerts },
                              { label: 'SMS event reminders', note: 'A text when doors open on show day.', checked: smsAlerts, set: setSmsAlerts },
                              { label: 'Artist announcements', note: 'New tour dates from artists you follow.', checked: artistUpdates, set: setArtistUpdates },
                            ].map((p) => (
                              <label key={p.label} className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={p.checked}
                                  onChange={() => p.set(!p.checked)}
                                  className="w-4 h-4 mt-0.5"
                                />
                                <span>
                                  <span className="font-bold text-sm block">{p.label}</span>
                                  <span className="text-sm text-[#666]">{p.note}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="mt-8 bg-[#ffed00] text-black px-8 py-3.5 text-sm font-bold cursor-pointer hover:bg-[#e6d200] transition-colors"
                        >
                          Save changes
                        </button>
                      </form>
                    </div>

                    {/* Password */}
                    <div>
                      {sectionHead('Password', 'Use a strong, unique password to keep your account secure.')}

                      <form onSubmit={handlePasswordResetSubmit}>
                        {passwordSuccess && (
                          <div className="flex items-center gap-2 bg-[#f7f7f7] border border-[#e4e4e4] p-4 text-sm font-bold mb-6">
                            <CheckCircle className="w-4 h-4 shrink-0" /> Password changed.
                          </div>
                        )}
                        {passwordError && (
                          <div className="flex items-center gap-2 border border-[#be6464] text-[#be6464] p-4 text-sm font-bold mb-6">
                            <Info className="w-4 h-4 shrink-0" /> {passwordError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6">
                          <div>
                            <label className={`${overline} text-[#666] block mb-2`}>Current password</label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-white px-0 py-2.5 text-base text-black placeholder-[#8a8a8a]"
                            />
                          </div>
                          <div>
                            <label className={`${overline} text-[#666] block mb-2`}>New password</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Min. 6 characters"
                              className="w-full bg-white px-0 py-2.5 text-base text-black placeholder-[#8a8a8a]"
                            />
                          </div>
                          <div>
                            <label className={`${overline} text-[#666] block mb-2`}>Confirm new password</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repeat new password"
                              className="w-full bg-white px-0 py-2.5 text-base text-black placeholder-[#8a8a8a]"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="mt-8 bg-black text-white px-8 py-3.5 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                          Update password
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* ── ROLE HUBS ────────────────────────────────── */}
                {activeTab === 'admin' && userRole === 'admin' && <AdminHub />}
                {activeTab === 'organizer' && userRole === 'organizer' && <OrganizerHub />}
                {activeTab === 'artist' && userRole === 'artist' && <ArtistHub />}

              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
