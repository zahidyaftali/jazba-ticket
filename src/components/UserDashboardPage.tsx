import React, { useState, useEffect } from 'react';
import { 
  User, Ticket, Calendar, MapPin, Clock, CreditCard, Settings, 
  ShieldCheck, LogOut, Heart, Compass, Gift, ChevronRight, Sparkles, 
  CheckCircle, Printer, Download, Bell, Info, Laptop, Mail, Phone,
  FileCheck, Star, ArrowRight, Share2, Eye
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
  type: 'upcoming'
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

export default function UserDashboardPage({
  currentUser,
  allEvents,
  onLogout,
  onBackToHome,
  onViewShowDetail,
  onExploreEvents
}: UserDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'passes' | 'watchlist' | 'billing' | 'settings' | 'admin' | 'organizer' | 'artist'>('overview');
  const [userRole, setUserRole] = useState<'admin' | 'organizer' | 'artist' | 'user'>('user');
  const [userStatus, setUserStatus] = useState<'active' | 'suspended'>('active');
  
  // Profile settings state initialized with current user props
  const [profileName, setProfileName] = useState(currentUser?.name || 'Explorer User');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || 'user@example.com');
  const [profilePhone, setProfilePhone] = useState('+44 20 7946 0958');
  const [profileCity, setProfileCity] = useState('London');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Preference alerts switches
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [artistUpdates, setArtistUpdates] = useState(true);
  const [walletIntegration, setWalletIntegration] = useState(true);

  // Password reset input form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Watchlist simulation loaded from related events
  const [watchlist, setWatchlist] = useState<EventItem[]>([]);
  
  // Bookings list
  const [userBookings, setUserBookings] = useState<PersonalBooking[]>([]);

  // Initialize interactive states
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Surface a few live upcoming events as the watchlist suggestions
    setWatchlist(allEvents.slice(0, 3));

    // Guests with no signed-in session simply see no bookings yet
    const fallbackBookings: PersonalBooking[] = [];

    const loadUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setUserBookings(fallbackBookings);
        return;
      }

      // 1. Fetch profile from Firestore users/{userId}
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
          // If no doc exists yet, initialize it
          const isBootAdmin = isUserBootstrappedAdmin(user.email);
          const defaultRole = isBootAdmin ? 'admin' : 'user';
          const payload = {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || user.email?.split('@')[0] || 'Member',
            phone: '',
            role: defaultRole,
            profileImage: user.photoURL || '',
            createdAt: new Date().toISOString(),
            status: 'active',
            city: 'London',
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, payload);
          setUserRole(defaultRole);
          setUserStatus('active');
        }
      } catch (err) {
        console.error("Failed to load user document:", err);
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      // 2. Fetch bookings from Firestore bookings collection where userId == user.uid
      try {
        const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', user.uid));
        const bookingsSnap = await getDocs(bookingsQuery);
        
        const loadedBookings: PersonalBooking[] = [];
        bookingsSnap.forEach((bookingDoc) => {
          const item = bookingDoc.data();
          const correspondingEvent = allEvents.find(e => e.id === item.eventId) || allEvents[0] || PLACEHOLDER_EVENT;
          
          loadedBookings.push({
            id: bookingDoc.id,
            event: correspondingEvent,
            quantity: item.quantity || 1,
            tier: item.tier || 'general',
            bookingDate: item.bookingDate || 'Just now',
            orderId: item.orderId || `JXB-FIRE-${bookingDoc.id.substring(0, 4).toUpperCase()}`,
            seat: item.seat || 'Row F-12',
            barCode: item.barCode || '937284918231',
            pricePaid: item.pricePaid || correspondingEvent.price
          });
        });

        if (loadedBookings.length > 0) {
          setUserBookings(loadedBookings);
        } else {
          // Check localStorage as transient fallback
          let formattedLocal: PersonalBooking[] = [];
          try {
            const stored = localStorage.getItem('jazbaticket_bookings');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                formattedLocal = parsed.map((item: any, index: number) => {
                  const correspondingEvent = allEvents.find(e => e.id === item.eventId) || allEvents[0] || PLACEHOLDER_EVENT;
                  return {
                    id: `bk-local-${index}`,
                    event: correspondingEvent,
                    quantity: item.quantity || 1,
                    tier: item.tier || 'general',
                    bookingDate: item.bookingDate || 'Just now',
                    orderId: item.orderId || `JXB-LOCAL-${index}`,
                    seat: item.seat || `Row ${String.fromCharCode(65 + index)}-8`,
                    barCode: item.barCode || Math.floor(100000000000 + Math.random() * 900000000000).toString(),
                    pricePaid: item.pricePaid || correspondingEvent.price
                  };
                });
              }
            }
          } catch (e) {
            console.error("Local storage lookup error: ", e);
          }
          setUserBookings([...formattedLocal, ...fallbackBookings]);
        }
      } catch (err: any) {
        console.error("Failed to load user bookings:", err);
        handleFirestoreError(err, OperationType.LIST, 'bookings');
        setUserBookings(fallbackBookings);
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
      setSaveError('No authenticated user session found.');
      return;
    }

    setSaveError('');
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: profileEmail,
        name: profileName,
        phone: profilePhone,
        city: profileCity,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error("Save profile error:", err);
      setSaveError(err.message || 'Failed to update backstage database record.');
      setSaveSuccess(false);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError('Current Password is required.');
      setPasswordSuccess(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must contain at least 6 characters.');
      setPasswordSuccess(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Confirm Password does not match your new password.');
      setPasswordSuccess(false);
      return;
    }

    setPasswordError('');
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      setPasswordSuccess(false);
    }, 4000);
  };

  const handleRemoveFromWatchlist = (eventId: string) => {
    setWatchlist(prev => prev.filter(item => item.id !== eventId));
  };

  if (userStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-left">
        <div className="bg-[#121212] border-2 border-red-500/30 rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-lg text-center space-y-6 text-white text-sm">
          <div className="w-16 h-16 bg-red-950/40 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto text-red-500 shadow-3xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display font-medium text-2xl text-[#E34718] uppercase">Access Restricted</h2>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Account status: Suspended</p>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
            We regret to inform you that your registration status on Jazba Ticket Platform has been suspended due to system policy audits or administrative directives. Please contact platform administrators.
          </p>
          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 text-xs font-bold text-neutral-400 text-left space-y-2.5">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Reference UID</span>
              <span className="font-mono text-white/80">{auth.currentUser?.uid}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Administrative Contact</span>
              <span className="text-white/80">support@jazbaticket.com</span>
            </div>
          </div>
          <div className="pt-2">
            <button 
              onClick={onLogout}
              className="w-full py-3 bg-[#E34718] hover:bg-[#C23A12] text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md active:scale-97 cursor-pointer transition-transform"
            >
              Sign Out of Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Stats logic
  const totalPassesCount = userBookings.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmountSpent = userBookings.reduce((sum, item) => sum + item.pricePaid, 0);

  return (
    <div className="bg-neutral-50/50 min-h-screen pb-20" id="user-dashboard-wrapper">
      
      {/* 0. GORGEOUS STYLISH HERO SECTION - FULL WIDTH (60vh left-aligned, matching the Home Page style) */}
      <section 
        className="relative bg-[#121212] min-h-[420px] h-[60vh] px-4 sm:px-6 md:px-8 border-b border-neutral-900 overflow-visible z-10 flex items-center mb-10"
        id="dashboard-hero"
      >
        {/* DARK MUSIC EVENT BACKGROUND PHOTO WITH GRADIENT OVERLAY */}
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
            alt="Dark music festival event crowd and scene strobe spotlights"
            className="w-full h-full object-cover opacity-25 scale-102"
            referrerPolicy="no-referrer"
          />
          {/* Dark overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/45" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(252,210,64,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
        </div>

        {/* Left aligned text / No forms / No action buttons */}
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
          {/* Path Breadcrumb */}
          <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-wider text-neutral-400 bg-neutral-905 border border-neutral-800 backdrop-blur-md px-3.5 py-1.5 rounded-full">
            <span onClick={onBackToHome} className="hover:text-white hover:underline cursor-pointer transition-colors text-neutral-450">Home</span>
            <span>/</span>
            <span className="text-white">Customer Account Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight leading-[1.1] max-w-3xl text-white">
            Manage Your <span className="text-[#E34718] drop-shadow-[0_2px_10px_rgba(227,71,24,0.15)]">Secure Passes &amp; Profile</span>
          </h1>

          <p className="text-neutral-300 font-medium text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed">
            Verify barcode-active entry ticket credentials, edit secure connection settings, browse saved wishlist items, and review instant invoice records.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TOP STATUS LINE / PATHWAY NAVIGATION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="text-left">
            <h1 className="text-3xl font-display font-medium text-neutral-900 tracking-tight flex items-center gap-2">
              User Account Portal
              <span className="text-[10px] uppercase font-bold tracking-wider bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full border border-neutral-200">
                Verified Account
              </span>
            </h1>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              Verify scanning-ready entrance passes, saved watchlists, and secure transaction invoices.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToHome}
              className="py-2.5 px-5 bg-white border border-neutral-250 hover:bg-neutral-50 text-neutral-800 text-xs font-bold uppercase tracking-wider rounded-full transition-all active:scale-97 cursor-pointer"
            >
              Back to Marketplace
            </button>
            <button
              onClick={onLogout}
              className="py-2.5 px-5 bg-neutral-900 border border-transparent hover:bg-neutral-800 text-white hover:text-red-300 text-xs font-bold uppercase tracking-wider rounded-full transition-all active:scale-97 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* 1. HERO PROFILE OVERVIEW CARD */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-2xs text-left">
          {/* Accent decoration overlay */}
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#E34718]/8 via-[#E34718]/4 to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            {/* Elegant luxury circular profile avatar badge with initials */}
            <div className="w-20 h-20 bg-neutral-950 text-white rounded-2xl flex flex-col items-center justify-center border-2 border-neutral-800 shadow-md uppercase relative shrink-0">
              <span className="font-display font-black text-2xl tracking-tighter">
                {profileName.substring(0, 2)}
              </span>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#E34718] border-2 border-white flex items-center justify-center text-white" title="Verified Customer">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="font-display font-medium text-xl sm:text-2xl text-neutral-900">{profileName}</h2>
                <span className="inline-flex bg-neutral-100 text-neutral-800 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-neutral-250">
                  Premium Member
                </span>
              </div>
              
              <p className="text-xs text-neutral-500 font-semibold mt-1">
                Personalized account • {profileEmail} • Registered from {profileCity}
              </p>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-[11px] text-neutral-450 font-bold">
                <div className="flex items-center gap-1.5 bg-neutral-55 bg-neutral-100 p-2 rounded-lg">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
                  <span>Account Limit: 10 active ticket passes maximum</span>
                </div>
                <span>•</span>
                <span>Active Region: Europe (GMT)</span>
              </div>
            </div>

            {/* Quick loyalty points badge */}
            <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl max-w-xs w-full sm:w-auto text-center shrink-0">
              <div className="flex items-center gap-1 text-[#C23A12] justify-center mb-0.5">
                <Gift className="w-4 h-4 shrink-0 fill-[#E34718]/10 text-[#C23A12]" />
                <span className="font-mono font-black text-base text-neutral-900">1,280 pts</span>
              </div>
              <span className="text-[9px] text-neutral-400 font-black uppercase tracking-wider block">Fidelity Reward Points</span>
            </div>
          </div>
        </div>

        {/* 2. STATS QUAD GRIDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-2xs text-left">
            <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest block leading-none mb-2">My Total Checked-out Passes</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono font-black text-2xl text-neutral-950">{totalPassesCount}</span>
              <span className="text-[10px] text-neutral-400 font-medium">Entrance Voucher{totalPassesCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="w-full bg-neutral-100 h-1 rounded-full overflow-hidden mt-3.5">
              <div className="bg-[#E34718] h-full" style={{ width: `${Math.min(totalPassesCount * 10, 100)}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-2xs text-left">
            <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest block leading-none mb-2">Saved Shows on Watchlist</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono font-black text-2xl text-neutral-950">{watchlist.length}</span>
              <span className="text-[10px] text-neutral-400 font-medium">Shows verified</span>
            </div>
            <div className="w-full bg-neutral-100 h-1 rounded-full overflow-hidden mt-3.5">
              <div className="bg-[#E34718] h-full" style={{ width: `${Math.min(watchlist.length * 20, 100)}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-2xs text-left">
            <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest block leading-none mb-2">Verified Amount Deposited</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-sm font-semibold text-neutral-500">$</span>
              <span className="font-mono font-black text-2xl text-neutral-950">{totalAmountSpent}</span>
              <span className="text-[10px] text-neutral-400 font-medium ml-1">USD equivalent</span>
            </div>
            <div className="w-full bg-neutral-100 h-1 rounded-full overflow-hidden mt-3.5">
              <div className="bg-neutral-800 h-full w-2/3"></div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-2xs text-left">
            <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest block leading-none mb-2">Average Satisfaction Metric</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-mono font-black text-2xl text-neutral-950">4.95</span>
              <span className="text-[#E34718] font-mono text-sm">★★★★★</span>
            </div>
            <div className="w-full bg-neutral-100 h-1 rounded-full overflow-hidden mt-3.5">
              <div className="bg-[#E34718] h-full w-[95%]"></div>
            </div>
          </div>

        </div>

        {/* 3. MAIN CONTENTS DIVISION WITH SIDEBAR TAB TOGGLES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* TAB SIDEBAR: VISUALLY DISCIPLINED PREMIUM COLUMN */}
          <div className="col-span-1 lg:col-span-3 space-y-3">
            
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs text-left">
              <span className="text-[10px] font-black tracking-widest uppercase text-neutral-400 block px-3.5 pb-2 border-b border-neutral-100 mb-3">
                Navigation Directory
              </span>
              
              <nav className="space-y-1">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'overview' 
                      ? 'bg-[#E34718] text-white border-transparent shadow-xs' 
                      : 'bg-white text-neutral-600 hover:bg-neutral-50 hover:text-black border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 shrink-0" />
                    <span>Overview &amp; Alerts</span>
                  </div>
                  <ChevronRight className="w-4.5 h-4.5 opacity-60" />
                </button>

                <button 
                  onClick={() => setActiveTab('passes')}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'passes' 
                      ? 'bg-[#E34718] text-white border-transparent shadow-xs' 
                      : 'bg-white text-neutral-600 hover:bg-neutral-50 hover:text-black border border-transparent'
                  }`}
                  id="tab-btn-passes"
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="w-4 h-4 shrink-0" />
                    <span>My Digital Passes</span>
                  </div>
                  <span className="bg-neutral-900 text-white text-[9px] font-mono font-black px-2 py-0.5 rounded-full">
                    {userBookings.length}
                  </span>
                </button>

                <button 
                  onClick={() => setActiveTab('watchlist')}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'watchlist' 
                      ? 'bg-[#E34718] text-white border-transparent shadow-xs' 
                      : 'bg-white text-neutral-600 hover:bg-neutral-50 hover:text-black border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 shrink-0" />
                    <span>Saved Watchlist</span>
                  </div>
                  <span className="bg-neutral-100 text-neutral-500 border border-neutral-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                    {watchlist.length}
                  </span>
                </button>

                <button 
                  onClick={() => setActiveTab('billing')}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'billing' 
                      ? 'bg-[#E34718] text-white border-transparent shadow-xs' 
                      : 'bg-white text-neutral-600 hover:bg-neutral-50 hover:text-black border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span>Invoices &amp; Billing</span>
                  </div>
                  <ChevronRight className="w-4.5 h-4.5 opacity-60" />
                </button>

                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'settings' 
                      ? 'bg-[#E34718] text-white border-transparent shadow-xs' 
                      : 'bg-white text-neutral-600 hover:bg-neutral-50 hover:text-black border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 shrink-0" />
                    <span>Security Settings</span>
                  </div>
                  <ChevronRight className="w-4.5 h-4.5 opacity-60" />
                </button>

                {userRole === 'admin' && (
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'admin' 
                        ? 'bg-neutral-900 text-white border-transparent shadow-xs' 
                        : 'bg-red-50 text-red-750 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Admin Portal</span>
                    </div>
                    <ChevronRight className="w-4.5 h-4.5 opacity-60" />
                  </button>
                )}

                {userRole === 'organizer' && (
                  <button 
                    onClick={() => setActiveTab('organizer')}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'organizer' 
                        ? 'bg-neutral-800 text-white border-transparent shadow-xs' 
                        : 'bg-orange-50 text-orange-750 hover:bg-orange-100 border border-orange-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Organizer Shows</span>
                    </div>
                    <ChevronRight className="w-4.5 h-4.5 opacity-60" />
                  </button>
                )}

                {userRole === 'artist' && (
                  <button 
                    onClick={() => setActiveTab('artist')}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'artist' 
                        ? 'bg-neutral-800 text-white border-transparent shadow-xs' 
                        : 'bg-indigo-50 text-indigo-750 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 shrink-0 text-indigo-700" />
                      <span>Artist Portfolio</span>
                    </div>
                    <ChevronRight className="w-4.5 h-4.5 opacity-60" />
                  </button>
                )}
              </nav>
            </div>

            {/* Loyalty and support block */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-2xs text-left">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2 leading-none">Need assistance?</span>
              <p className="text-[11px] text-neutral-505 leading-relaxed font-semibold">
                Our support team resolves checkout queries 24/7. Get in touch via <strong className="text-black">support@jazbaticket.com</strong> or call Westminster center.
              </p>
              <div className="pt-3.5 border-t border-neutral-100 mt-4">
                <span className="inline-flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider text-neutral-600 bg-neutral-100 rounded-full px-2.5 py-1 border border-neutral-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                  Support Assistant Online
                </span>
              </div>
            </div>

          </div>

          {/* MAIN TAB WRAPPER CONTENT AREA */}
          <div className="col-span-1 lg:col-span-9">

            <AnimatePresence mode="wait">
              
              {/* TAB 1: OVERVIEW HUB */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* NEXT PASS EVENT SUMMARY HIGHLIGHT BILLBOARD */}
                  {userBookings.length > 0 ? (
                    <div className="bg-neutral-900 border border-neutral-800 text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden text-left shadow-lg">
                      {/* background map styling */}
                      <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none"></div>
                             <div className="flex items-center justify-between flex-wrap gap-3 mb-5 border-b border-white/10 pb-4 relative z-10">
                        <div className="flex items-center gap-2">
                           <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E34718]"></span>
                           <span className="text-[10px] font-black text-[#E34718] uppercase tracking-widest">
                            Your Next Live Event Coming Up!
                          </span>
                        </div>
                        <span className="text-[10px] bg-white/10 border border-white/15 text-neutral-300 font-mono font-bold px-2.5 py-1 rounded-full">
                          Digital Gate Open
                        </span>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10">
                        <div className="flex gap-4 min-w-0">
                          <img 
                            src={userBookings[0].event.image} 
                            alt={userBookings[0].event.title}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] text-[#E34718] font-bold uppercase tracking-wider block">
                              {userBookings[0].event.category.toUpperCase()} SHOW
                            </span>
                            <h3 className="font-display font-medium text-lg sm:text-2xl text-white truncate mt-0.5 uppercase">
                              {userBookings[0].event.title}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 mt-2.5 text-[11px] sm:text-xs text-neutral-400 font-semibold">
                              <span className="flex items-center gap-1 shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-[#E34718]" />
                                <span>{userBookings[0].event.fullDate || `${userBookings[0].event.date}, 2026`}</span>
                              </span>
                              <span className="flex items-center gap-1 shrink-0">
                                <Clock className="w-3.5 h-3.5 text-[#E34718]" />
                                <span className="font-mono">{userBookings[0].event.time}</span>
                              </span>
                              <span className="flex items-center gap-1 shrink-0">
                                <MapPin className="w-3.5 h-3.5 text-[#E34718]" />
                                <span className="truncate max-w-[160px] sm:max-w-xs">{userBookings[0].event.location}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Direct Access button */}
                        <button
                          onClick={() => {
                            setActiveTab('passes');
                            const element = document.getElementById('tab-btn-passes');
                            if (element) element.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full md:w-auto bg-[#E34718] hover:bg-[#C23A12] text-white px-6 py-3 rounded-full text-xs font-black tracking-wider uppercase transition-all shadow-md active:scale-97 cursor-pointer shrink-0 text-center"
                        >
                          View Pass QR Code
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 text-center text-left shadow-2xs">
                      <div className="w-10 h-10 bg-[#E34718]/15 text-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-[#E34718]/30">
                        <Compass className="w-5 h-5 shrink-0" />
                      </div>
                      <h3 className="font-display font-medium text-base text-neutral-900">No Active Ticket Passes Found</h3>
                      <p className="text-xs text-neutral-550 max-w-sm mx-auto mt-1">
                        You have not reserved any live events during this session. Browse premium shows in hamilton and Westminster.
                      </p>
                      <button
                        onClick={onExploreEvents}
                        className="mt-4 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all active:scale-95 cursor-pointer"
                      >
                        Explore Shows Directory
                      </button>
                    </div>
                  )}

                  {/* ACCOUNT LOG & ALERTS */}
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 text-left shadow-2xs">
                    <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-3 mb-4">
                      Security Notifications &amp; System Alerts
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-start gap-4 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-orange-50 text-[#C23A12] flex items-center justify-center shrink-0 border border-orange-200/50">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-black text-neutral-800 uppercase block">Account Identity Secured</span>
                            <span className="text-[9px] text-neutral-400 font-mono">Today at 11:35</span>
                          </div>
                          <p className="text-xs text-neutral-500 font-semibold mt-1">
                            Your billing profile has been linked successfully. No fraudulent or outside API integrations were discovered.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-[#E34718]/15 text-neutral-805 flex items-center justify-center shrink-0 border border-[#E34718]/30">
                          <Sparkles className="w-4 h-4 text-[#C23A12]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-black text-neutral-800 uppercase block">Fidelity Voucher Unlocked</span>
                            <span className="text-[9px] text-neutral-400 font-mono">Yesterday</span>
                          </div>
                          <p className="text-xs text-neutral-500 font-semibold mt-1">
                            Claim 18% Off on all events today with the absolute promotional coupon code: <strong className="font-mono text-black">JAZBA18</strong>. Apply this code during Checkout to enjoy this massive discount!
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-110">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-black text-neutral-800 uppercase block">Fidelity Points Credited</span>
                            <span className="text-[9px] text-neutral-400 font-mono">May 24, 2026</span>
                          </div>
                          <p className="text-xs text-neutral-500 font-semibold mt-1">
                            Received <strong>+350 pts</strong> for registering physical ticket reservations for "The Phantom of the Opera".
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RECOMMENDED SHOW DIRECTORY ROW */}
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 text-left shadow-2xs">
                    <div className="flex items-center justify-between mb-5 border-b border-neutral-100 pb-3">
                      <div>
                        <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                          Highly Recommended Showcase Performances
                        </h3>
                        <p className="text-xs text-neutral-450 mt-0.5">Based on your category selections</p>
                      </div>
                      
                      <button 
                        onClick={onExploreEvents}
                        className="text-xs font-black text-neutral-900 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        Explore All ↗
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {allEvents.slice(0, 4).map((evt) => (
                        <div 
                          key={evt.id}
                          className="flex items-center gap-3.5 p-3.5 border border-neutral-200 hover:border-neutral-350 rounded-xl bg-neutral-50/20 transition-all group"
                        >
                          <img 
                            src={evt.image} 
                            alt={evt.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] text-neutral-400 font-black tracking-widest uppercase block mb-0.5">
                              {evt.category}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-neutral-900 group-hover:text-black block truncate">
                              {evt.title}
                            </h4>
                            <span className="text-[11px] text-neutral-550 block font-mono mt-1">
                              ${evt.price} Tickets • {evt.date}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => onViewShowDetail(evt)}
                            className="w-8 h-8 rounded-full border border-neutral-200/80 bg-white hover:bg-neutral-50 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform cursor-pointer"
                            title="View Details"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-neutral-700" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </motion.div>
              )}

              {/* TAB 2: MY EXPANDED PASSES / TICKETS */}
              {activeTab === 'passes' && (
                <motion.div
                  key="passes"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 text-left shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4 mb-6">
                      <div>
                        <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                          Scan-Ready Entrance Vouchers
                        </h3>
                        <p className="text-xs text-neutral-500 font-medium mt-1">Please display QR codes on entry arches. Printed copies are also accepted.</p>
                      </div>

                      <span className="bg-neutral-100 text-neutral-600 border border-neutral-200 px-3 py-1 text-xs font-bold rounded-full block w-fit shrink-0">
                        {userBookings.length} Gate passes active
                      </span>
                    </div>

                    {userBookings.length > 0 ? (
                      <div className="space-y-8">
                        {userBookings.map((pass, pIdx) => (
                          <div 
                            key={pass.id}
                            className="bg-neutral-55 border border-neutral-250 rounded-2xl overflow-hidden shadow-xs relative"
                          >
                            <div className="absolute top-0 bg-[#E34718] h-1.5 inset-x-0"></div>

                            {/* Ticket Inner Grid wrapper */}
                            <div className="grid grid-cols-1 md:grid-cols-12">
                              
                              {/* Left main info corridor */}
                              <div className="md:col-span-8 p-6 border-b md:border-b-0 md:border-r border-dashed border-neutral-250 text-left space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-neutral-100">
                                  <div className="flex items-center gap-2">
                                    <span className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center text-white text-xs font-black">
                                      {pIdx + 1}
                                    </span>
                                    <span className="text-[10px] uppercase font-black text-neutral-400 tracking-widest">
                                      Order Ref: {pass.orderId}
                                    </span>
                                  </div>
                                  <span className="bg-[#E34718]/10 border border-[#E34718]/30 text-[#C23A12] text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                                    {pass.tier.toUpperCase()} LEVEL PASS
                                  </span>
                                </div>

                                <div className="flex gap-4">
                                  <img 
                                    src={pass.event.image} 
                                    alt={pass.event.title}
                                    referrerPolicy="no-referrer"
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-neutral-200 shadow-3xs shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <h4 className="font-display font-medium text-base text-neutral-950 uppercase leading-none truncate">
                                      {pass.event.title}
                                    </h4>
                                    <span className="text-[10px] text-neutral-400 font-bold uppercase block mt-1.5 tracking-wider">
                                      Category: {pass.event.category}
                                    </span>
                                  </div>
                                </div>

                                {/* Logistics strip parameters */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-100 text-[11px] text-neutral-505 font-bold">
                                  <div>
                                    <span className="block text-[8px] uppercase tracking-wider text-neutral-400 leading-none">Time Slot</span>
                                    <span className="text-neutral-900 block font-mono mt-1.5">{pass.event.time}</span>
                                  </div>

                                  <div>
                                    <span className="block text-[8px] uppercase tracking-wider text-neutral-400 leading-none">Aisle Assignment</span>
                                    <span className="text-neutral-900 block mt-1.5">{pass.seat}</span>
                                  </div>

                                  <div>
                                    <span className="block text-[8px] uppercase tracking-wider text-neutral-400 leading-none">Venue Location</span>
                                    <span className="text-neutral-900 block mt-1.5 truncate" title={pass.event.location}>
                                      {pass.event.location}
                                    </span>
                                  </div>
                                </div>

                                {/* Actions row */}
                                <div className="flex flex-wrap items-center gap-2 pt-4">
                                  <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-full transition-all active:scale-97 cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-[#E34718]" />
                                    <span>Print Pass PDF</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(JSON.stringify(pass));
                                      alert("Entrance pass configurations copied to clipboard!");
                                    }}
                                    className="flex items-center gap-1.5 bg-white border border-neutral-250 hover:bg-neutral-50 text-neutral-880 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-full transition-all active:scale-97 cursor-pointer"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>Share Pass</span>
                                  </button>
                                </div>
                              </div>

                              {/* Right barcode scan-ready section */}
                              <div className="md:col-span-4 bg-neutral-100/50 p-6 flex flex-col items-center justify-center text-center">
                                {/* Simulated QR core */}
                                <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm relative">
                                  <div className="w-24 h-24 bg-neutral-904 grid grid-cols-6 gap-px border-2 border-neutral-900 p-1 bg-white">
                                    {/* Matrix mockup */}
                                    {Array.from({ length: 36 }).map((_, i) => {
                                      const filled = (i % 3 === 0) || (i % 5 === 1) || (i < 6) || (i > 30) || (i % 6 === 0);
                                      return (
                                        <div 
                                          key={i} 
                                          className={`w-full h-full rounded-xs ${filled ? 'bg-neutral-950' : 'bg-transparent'}`}
                                        ></div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-neutral-500 mt-3 block">
                                  CODE: #{pass.barCode.substring(0, 4)}-{pass.barCode.substring(4, 8)}
                                </span>
                                <span className="text-[9px] text-[#C23A12] font-black uppercase tracking-wider mt-1.5 block px-2.5 py-0.5 bg-[#E34718]/10 rounded-full border border-[#E34718]/20">
                                  ✓ QR Valid
                                </span>
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <Compass className="w-11 h-11 text-neutral-300 mx-auto mb-3" />
                        <h4 className="font-bold text-neutral-800">No Passes Registered Yet</h4>
                        <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">Please select premium events to checkout scanning tickets.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: WATCHLIST */}
              {activeTab === 'watchlist' && (
                <motion.div
                  key="watchlist"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 text-left shadow-2xs">
                    <div className="border-b border-neutral-100 pb-4 mb-6">
                      <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                        Saved Watchlist &amp; Interested Shows
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Book directly or remove from tracking once satisfied.</p>
                    </div>

                    {watchlist.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {watchlist.map((show) => (
                          <div 
                            key={show.id}
                            className="p-4 bg-white border border-neutral-200 hover:border-neutral-350 rounded-2xl flex items-center gap-4 transition-all group relative"
                          >
                            <img 
                              src={show.image} 
                              alt={show.title}
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 rounded-xl object-cover border border-neutral-200 shrink-0"
                            />
                            
                            <div className="min-w-0 flex-1 text-left">
                              <span className="text-[9px] text-[#C23A12] font-black uppercase tracking-widest block bg-orange-50 px-2 py-0.5 rounded-full w-fit">
                                {show.category}
                              </span>
                              
                              <h4 className="font-bold text-xs sm:text-sm text-neutral-900 mt-1.5 truncate group-hover:text-black">
                                {show.title}
                              </h4>
                              
                              <span className="text-[11px] text-neutral-450 block font-mono mt-1">
                                ${show.price} Ticket • {show.date}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button
                                onClick={() => onViewShowDetail(show)}
                                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer"
                              >
                                Book
                              </button>
                              <button
                                onClick={() => handleRemoveFromWatchlist(show.id)}
                                className="px-3.5 py-1.5 bg-neutral-50 hover:bg-red-50 text-neutral-400 hover:text-red-500 border border-neutral-200 hover:border-red-200 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                        <Heart className="w-9 h-9 text-neutral-300 mx-auto mb-2" />
                        <h4 className="font-bold text-neutral-700">Watchlist Empty</h4>
                        <p className="text-xs text-neutral-450 mt-1">You do not have any saved shows currently. Save shows by clicking the heart button in detailed event profiles.</p>
                        <button
                          onClick={onExploreEvents}
                          className="mt-4 px-4 py-2 bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer"
                        >
                          Discover Live Events
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: BILLING / PURCHASE INVOICES */}
              {activeTab === 'billing' && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 text-left shadow-2xs">
                    <div className="border-b border-neutral-100 pb-4 mb-6">
                      <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                        Itemized Transaction Receipts &amp; Billings
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Tax compliant digital receipts. Original printings are kept strictly secure.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-200/60 text-[9px] uppercase font-black text-neutral-400 tracking-wider">
                            <th className="py-3 px-4 font-extrabold">Invoice Ref ID</th>
                            <th className="py-3 px-4 font-extrabold">Event description</th>
                            <th className="py-3 px-4 font-extrabold text-center">Qty</th>
                            <th className="py-3 px-4 font-extrabold text-right">Deposited Amount</th>
                            <th className="py-3 px-4 font-extrabold text-center">Status</th>
                            <th className="py-3 px-4 font-extrabold text-right">Date Issued</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 text-xs text-neutral-600 font-bold">
                          {userBookings.map((bk) => (
                            <tr key={bk.id} className="hover:bg-neutral-50/50">
                              <td className="py-4 px-4 font-mono text-neutral-900">{bk.orderId}</td>
                              <td className="py-4 px-4">
                                <div className="font-semibold text-neutral-900 truncate max-w-[200px]">{bk.event.title}</div>
                                <div className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">{bk.tier} tier pass</div>
                              </td>
                              <td className="py-4 px-4 text-center font-mono">{bk.quantity}x</td>
                              <td className="py-4 px-4 text-right font-mono text-neutral-900">${bk.pricePaid}.00</td>
                              <td className="py-4 px-4 text-center">
                                <span className="inline-flex items-center gap-1 bg-orange-50 text-[#C23A12] text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-orange-200/50">
                                  <span className="w-1 h-1 rounded-full bg-[#E34718]"></span>
                                  Success
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right font-semibold text-neutral-500">{bk.bookingDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 mt-6 text-left">
                      <strong className="text-xs text-neutral-800 uppercase tracking-wider block mb-1">Tax-Compliance Notes</strong>
                      <p className="text-[11px] text-neutral-500 leading-relaxed font-semibold">
                        Jazba Premiere Productions invoices include standard VAT tax elements (calculated at 20% standard rate across selected cities in Westminster/United Kingdom/Hamilton). To request enterprise corporate accounts, please submit registration info.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: ACCOUNT & SECURITY SETTINGS */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 text-left shadow-2xs">
                    <div className="border-b border-neutral-100 pb-4 mb-6">
                      <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                        Personal Account Settings
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Manage public profile variables, active notifications, and city regions.</p>
                    </div>

                    <form onSubmit={handleProfileSave} className="space-y-5">
                      
                      {saveSuccess && (
                        <div className="bg-orange-50 text-[#C23A12] p-4 border border-orange-200/50 rounded-xl text-xs font-extrabold flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 shrink-0" />
                          <span>Profile details saved successfully!</span>
                        </div>
                      )}

                      {saveError && (
                        <div className="bg-red-50 text-red-700 p-4 border border-red-100 rounded-xl text-xs font-extrabold flex items-center gap-2 animate-shake">
                          <Info className="w-5 h-5 shrink-0" />
                          <span>{saveError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-black uppercase text-neutral-400 mb-1">Full Name</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                              <User className="w-4 h-4" />
                            </span>
                            <input 
                              type="text" 
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              placeholder="Name"
                              className="w-full bg-white border border-neutral-250 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#E34718] text-neutral-850"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black uppercase text-neutral-400 mb-1">Email representation</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                              <Mail className="w-4 h-4" />
                            </span>
                            <input 
                              type="email" 
                              value={profileEmail}
                              onChange={(e) => setProfileEmail(e.target.value)}
                              placeholder="Email address"
                              className="w-full bg-white border border-neutral-250 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#E34718] text-neutral-850"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black uppercase text-neutral-400 mb-1">Phone Number</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                              <Phone className="w-4 h-4" />
                            </span>
                            <input 
                              type="tel" 
                              value={profilePhone}
                              onChange={(e) => setProfilePhone(e.target.value)}
                              placeholder="Phone"
                              className="w-full bg-white border border-neutral-250 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#E34718] text-neutral-850"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black uppercase text-neutral-400 mb-1">Active City Region</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                              <MapPin className="w-4 h-4" />
                            </span>
                            <input 
                              type="text" 
                              value={profileCity}
                              onChange={(e) => setProfileCity(e.target.value)}
                              placeholder="City"
                              className="w-full bg-white border border-neutral-250 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#E34718] text-neutral-850"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Pref notification switches block */}
                      <div className="pt-4 border-t border-neutral-100">
                        <strong className="text-xs text-neutral-800 uppercase tracking-wider block mb-3.5">Notification Preferences</strong>
                        
                        <div className="space-y-3.5 text-xs font-semibold text-neutral-700">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={emailAlerts}
                              onChange={() => setEmailAlerts(!emailAlerts)}
                              className="w-4 h-4 rounded border-neutral-300 text-[#E34718] focus:ring-0"
                            />
                            <div>
                              <span>Email Order confirmations &amp; PDF Receipts</span>
                              <span className="block text-[10px] text-neutral-400 font-medium leading-tight">Send a digital coupon receipt instantly upon ticket processing.</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={smsAlerts}
                              onChange={() => setSmsAlerts(!smsAlerts)}
                              className="w-4 h-4 rounded border-neutral-300 text-[#E34718] focus:ring-0"
                            />
                            <div>
                              <span>SMS Boarding notifications</span>
                              <span className="block text-[10px] text-neutral-400 font-medium leading-tight">Notify active mobile phone numbers as soon as gates open (BST).</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={artistUpdates}
                              onChange={() => setArtistUpdates(!artistUpdates)}
                              className="w-4 h-4 rounded border-neutral-300 text-[#E34718] focus:ring-0"
                            />
                            <div>
                              <span>Artist Tours &amp; Grand opera announcements</span>
                              <span className="block text-[10px] text-neutral-400 font-medium leading-tight">Receive notifications about Sir Thomas Hampson and other lead actors in London.</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={walletIntegration}
                              onChange={() => setWalletIntegration(!walletIntegration)}
                              className="w-4 h-4 rounded border-neutral-300 text-[#E34718] focus:ring-0"
                            />
                            <div>
                              <span>Add to Apple Wallet link generation</span>
                              <span className="block text-[10px] text-neutral-400 font-medium leading-tight">Include pass checkout links inside active dashboard panels.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-full transition-all active:scale-97 cursor-pointer"
                      >
                        Keep Changes Details
                      </button>
                    </form>
                  </div>

                  {/* SECURITY PASSWORD BLOCK */}
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 text-left shadow-2xs">
                    <div className="border-b border-neutral-100 pb-4 mb-6">
                      <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                        Security Encryption Password Reset
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Keep credentials original and protected behind 256-bit hash encryption layers.</p>
                    </div>

                    <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                      
                      {passwordSuccess && (
                        <div className="bg-orange-50 text-[#C23A12] p-4 border border-orange-200/50 rounded-xl text-xs font-extrabold flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 shrink-0" />
                          <span>Password modified successfully! Accounts are synchronized.</span>
                        </div>
                      )}

                      {passwordError && (
                        <div className="bg-red-50 text-red-700 p-4 border border-red-100 rounded-xl text-xs font-extrabold flex items-center gap-2">
                          <Info className="w-5 h-5 shrink-0" />
                          <span>{passwordError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-black uppercase text-neutral-400 mb-1">Current Password</label>
                          <input 
                            type="password" 
                            placeholder="Password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#E34718] text-neutral-850 placeholder-neutral-300"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-black uppercase text-neutral-400 mb-1">New Password</label>
                          <input 
                            type="password" 
                            placeholder="Min. 6 values"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#E34718] text-neutral-850 placeholder-neutral-300"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-black uppercase text-neutral-400 mb-1">Confirm New Password</label>
                          <input 
                            type="password" 
                            placeholder="Match values exact"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#E34718] text-neutral-850 placeholder-neutral-300"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-full transition-all active:scale-97 cursor-pointer"
                      >
                        Reset Credentials
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

              {activeTab === 'admin' && userRole === 'admin' && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <AdminHub />
                </motion.div>
              )}

              {activeTab === 'organizer' && userRole === 'organizer' && (
                <motion.div
                  key="organizer"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <OrganizerHub />
                </motion.div>
              )}

              {activeTab === 'artist' && userRole === 'artist' && (
                <motion.div
                  key="artist"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArtistHub />
                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>

      </div>
    </div>
  );
}
