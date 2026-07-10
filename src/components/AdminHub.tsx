import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, Ticket, DollarSign, ShieldAlert, Trash2,
  UserMinus, UserCheck, RefreshCw, Search, CheckCircle, XCircle,
  PlusCircle, Edit3, ArrowLeft, Music, Loader2
} from 'lucide-react';
import {
  getAllUsers,
  getBookings,
  getPlatformAnalytics,
  updateUserRoleAndStatus,
  deleteUserAccount,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllArtists,
  createArtistProfile,
  updateArtistProfile,
  deleteArtistProfile,
  getAllOrganizers,
  createOrganizerProfile,
  updateOrganizerProfile,
  deleteOrganizerProfile,
  getAllPayments,
  getTickets,
  updateTicketStatus,
  updateBookingStatus,
  UserProfile,
  Booking,
  PlatformAnalytics,
  ArtistProfile,
  OrganizerProfile,
  PaymentDetails,
  TicketPass
} from '../services/backendService';
import { categories } from '../data';
import { AgendaEntry, LineupEntry, EventFaq } from '../types';
import { auth } from '../firebase';
import { motion } from 'motion/react';

const BLANK_EVENT_FORM = {
  title: '',
  description: '',
  category: 'music',
  venue: '',
  city: 'London',
  country: 'United Kingdom',
  date: '20 Jul',
  startTime: '19:30',
  endTime: '22:30',
  bannerImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=crop',
  capacity: 1000,
  price: 85,
  type: 'upcoming' as 'top' | 'for-you' | 'near-by' | 'upcoming',
  status: 'draft' as 'draft' | 'published' | 'cancelled' | 'completed',

  // ---- Event page content (each hides its section when left empty) ----
  priceVip: '',
  priceElite: '',
  highlightsText: '',
  agenda: [] as AgendaEntry[],
  lineup: [] as LineupEntry[],
  organizerName: '',
  organizerBio: '',
  organizerImage: '',
  mapUrl: '',
  transportText: '',
  parkingText: '',
  galleryText: '',
  faqs: [] as EventFaq[],
};

const parseLines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean);

const BLANK_ORGANIZER_FORM = {
  companyName: '',
  email: '',
  phone: '',
  logoUrl: '',
  bannerUrl: '',
  description: '',
  website: '',
  location: '',
  specialtiesText: '',
  featured: false,
};

const BLANK_ARTIST_FORM = {
  stageName: '',
  bio: '',
  category: 'music' as ArtistProfile['category'],
  subCategory: '',
  profileImage: '',
  coverImage: '',
  genres: [] as string[],
  hourlyRate: 150,
  location: 'London, UK',
  experienceYears: 5,
  availableNow: true,
  featured: false,
  socialWebsite: '',
  socialInstagram: '',
  socialSpotify: '',
  socialYoutube: '',

  // ---- Artist page content (each hides its section when left empty) ----
  rating: '',
  totalReviews: '',
  eventsHosted: '',
  totalAudience: '',
  pastShows: [] as { title: string; date: string; venue: string }[],
};

export default function AdminHub() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [tickets, setTickets] = useState<TicketPass[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'users' | 'bookings' | 'events' | 'artists' | 'organizers' | 'payments' | 'tickets'>('analytics');

  // Event create/edit form state
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState(BLANK_EVENT_FORM);

  // Artist create/edit form state
  const [isArtistFormOpen, setIsArtistFormOpen] = useState(false);
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null);
  const [artistForm, setArtistForm] = useState(BLANK_ARTIST_FORM);
  const [genreInput, setGenreInput] = useState('');

  // Organizer create/edit form state
  const [isOrganizerFormOpen, setIsOrganizerFormOpen] = useState(false);
  const [editingOrganizerId, setEditingOrganizerId] = useState<string | null>(null);
  const [organizerForm, setOrganizerForm] = useState(BLANK_ORGANIZER_FORM);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [allUsers, allBookings, allEvents, allArtists, allOrganizers, allPayments, allTickets, stats] = await Promise.all([
        getAllUsers(),
        getBookings(),
        getEvents(),
        getAllArtists(),
        getAllOrganizers(),
        getAllPayments(),
        getTickets(),
        getPlatformAnalytics()
      ]);
      setUsers(allUsers);
      setBookings(allBookings);
      setEvents(allEvents);
      setArtists(allArtists);
      setOrganizers(allOrganizers);
      setPayments(allPayments);
      setTickets(allTickets);
      setAnalytics(stats);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const flashSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // --- Event handlers ---
  const handleOpenCreateEvent = () => {
    setEditingEventId(null);
    setEventForm(BLANK_EVENT_FORM);
    setIsEventFormOpen(true);
  };

  const handleOpenEditEvent = (evt: any) => {
    setEditingEventId(evt.id);
    setEventForm({
      title: evt.title || '',
      description: evt.description || '',
      category: evt.category || 'music',
      venue: evt.venue || '',
      city: evt.city || 'London',
      country: evt.country || 'United Kingdom',
      date: evt.date || '20 Jul',
      startTime: evt.startTime || '19:30',
      endTime: evt.endTime || '22:30',
      bannerImage: evt.bannerImage || evt.image || BLANK_EVENT_FORM.bannerImage,
      capacity: evt.capacity || 1000,
      price: evt.price || 0,
      type: evt.type || 'upcoming',
      status: evt.status || 'draft',

      priceVip: evt.tierPrices?.vip ? String(evt.tierPrices.vip) : '',
      priceElite: evt.tierPrices?.elite ? String(evt.tierPrices.elite) : '',
      highlightsText: (evt.highlights || []).join('\n'),
      agenda: evt.agenda || [],
      lineup: evt.lineup || [],
      organizerName: evt.organizerName || '',
      organizerBio: evt.organizerBio || '',
      organizerImage: evt.organizerImage || '',
      mapUrl: evt.venueInfo?.mapUrl || '',
      transportText: (evt.venueInfo?.transport || []).join('\n'),
      parkingText: (evt.venueInfo?.parking || []).join('\n'),
      galleryText: (evt.gallery || []).join('\n'),
      faqs: evt.faqs || [],
    });
    setIsEventFormOpen(true);
  };

  // ---- Dynamic list editors (running order / performers / FAQs) ----
  const addListRow = (key: 'agenda' | 'lineup' | 'faqs') => {
    const blank = key === 'agenda'
      ? { time: '', title: '', desc: '' }
      : key === 'lineup'
        ? { name: '', role: '', avatar: '', bio: '' }
        : { question: '', answer: '' };
    setEventForm((f) => ({ ...f, [key]: [...(f[key] as any[]), blank] }) as typeof f);
  };

  const updateListRow = (key: 'agenda' | 'lineup' | 'faqs', idx: number, field: string, value: string) => {
    setEventForm((f) => ({
      ...f,
      [key]: (f[key] as any[]).map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }) as typeof f);
  };

  const removeListRow = (key: 'agenda' | 'lineup' | 'faqs', idx: number) => {
    setEventForm((f) => ({ ...f, [key]: (f[key] as any[]).filter((_, i) => i !== idx) }) as typeof f);
  };

  const handleSubmitEventForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!eventForm.title || !eventForm.venue) {
      setErrorMessage('Event title and venue are required.');
      return;
    }

    // Assemble the event page content — empty fields save as empty
    // arrays/strings so their sections stay hidden on the event page.
    const vip = Number(eventForm.priceVip);
    const elite = Number(eventForm.priceElite);
    const { priceVip: _pv, priceElite: _pe, highlightsText: _h, transportText: _t, parkingText: _p, galleryText: _g, mapUrl: _m, ...baseForm } = eventForm;
    const payload = {
      ...baseForm,
      image: eventForm.bannerImage,
      highlights: parseLines(eventForm.highlightsText),
      gallery: parseLines(eventForm.galleryText),
      venueInfo: {
        mapUrl: eventForm.mapUrl.trim(),
        transport: parseLines(eventForm.transportText),
        parking: parseLines(eventForm.parkingText),
      },
      organizerName: eventForm.organizerName.trim(),
      organizerBio: eventForm.organizerBio.trim(),
      organizerImage: eventForm.organizerImage.trim(),
      agenda: eventForm.agenda.filter((a) => a.time.trim() || a.title.trim()),
      lineup: eventForm.lineup.filter((l) => l.name.trim()),
      faqs: eventForm.faqs.filter((f) => f.question.trim()),
      tierPrices: {
        general: Number(eventForm.price) || 0,
        ...(vip > 0 ? { vip } : {}),
        ...(elite > 0 ? { elite } : {}),
      },
    };

    try {
      if (editingEventId) {
        await updateEvent(editingEventId, payload);
        flashSuccess('Event updated successfully.');
      } else {
        await createEvent({
          ...payload,
          organizerId: auth.currentUser?.uid || 'admin'
        });
        flashSuccess('Event created successfully.');
      }
      setIsEventFormOpen(false);
      loadData();
    } catch (err) {
      setErrorMessage('Failed to save event.');
    }
  };

  const handleRoleChange = async (uid: string, newRole: any, currentStatus: string) => {
    try {
      await updateUserRoleAndStatus(uid, newRole, currentStatus);
      setSuccessMessage('User role updated successfully.');
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Failed to update user. Please try again.');
    }
  };

  const handleToggleSuspension = async (uid: string, currentRole: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await updateUserRoleAndStatus(uid, currentRole, nextStatus);
      setSuccessMessage(`User status changed to ${nextStatus}.`);
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Failed to change user status.');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('Delete this user account? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteUserAccount(uid);
      setSuccessMessage('User profile deleted.');
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Failed to delete user profile.');
    }
  };

  const handleDeleteEventItem = async (eventId: string) => {
    if (!window.confirm('Delete this event? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteEvent(eventId);
      setSuccessMessage('Event deleted.');
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Failed to delete event listing.');
    }
  };

  // --- Booking / ticket management handlers ---
  const handleBookingStatusChange = async (id: string, update: { paymentStatus?: any; bookingStatus?: any }) => {
    try {
      await updateBookingStatus(id, update);
      flashSuccess('Booking updated.');
      loadData();
    } catch (err) {
      setErrorMessage('Failed to update booking.');
    }
  };

  const handleTicketStatusChange = async (id: string, status: 'active' | 'cancelled' | 'scanned') => {
    try {
      await updateTicketStatus(id, status);
      flashSuccess(`Ticket marked ${status}.`);
      loadData();
    } catch (err) {
      setErrorMessage('Failed to update ticket status.');
    }
  };

  // --- Artist handlers ---
  const handleOpenCreateArtist = () => {
    setEditingArtistId(null);
    setArtistForm(BLANK_ARTIST_FORM);
    setGenreInput('');
    setIsArtistFormOpen(true);
  };

  const handleOpenEditArtist = (artist: ArtistProfile) => {
    setEditingArtistId(artist.id || null);
    setArtistForm({
      stageName: artist.stageName || '',
      bio: artist.bio || '',
      category: artist.category || 'music',
      subCategory: artist.subCategory || '',
      profileImage: artist.profileImage || '',
      coverImage: artist.coverImage || '',
      genres: artist.genres || [],
      hourlyRate: artist.hourlyRate || 0,
      location: artist.location || 'London, UK',
      experienceYears: artist.experienceYears || 0,
      availableNow: artist.availableNow ?? true,
      featured: artist.featured ?? false,
      socialWebsite: artist.socialLinks?.website || '',
      socialInstagram: artist.socialLinks?.instagram || '',
      socialSpotify: artist.socialLinks?.spotify || '',
      socialYoutube: artist.socialLinks?.youtube || '',

      rating: artist.rating ? String(artist.rating) : '',
      totalReviews: artist.totalReviews ? String(artist.totalReviews) : '',
      eventsHosted: artist.eventsHosted ? String(artist.eventsHosted) : '',
      totalAudience: artist.totalAudience || '',
      pastShows: artist.pastShows || [],
    });
    setGenreInput('');
    setIsArtistFormOpen(true);
  };

  // --- Organizer handlers ---
  const handleOpenCreateOrganizer = () => {
    setEditingOrganizerId(null);
    setOrganizerForm(BLANK_ORGANIZER_FORM);
    setIsOrganizerFormOpen(true);
  };

  const handleOpenEditOrganizer = (org: OrganizerProfile) => {
    setEditingOrganizerId(org.id || null);
    setOrganizerForm({
      companyName: org.companyName || '',
      email: org.email || '',
      phone: org.phone || '',
      logoUrl: org.logoUrl || '',
      bannerUrl: org.bannerUrl || '',
      description: org.description || '',
      website: org.website || '',
      location: org.location || '',
      specialtiesText: (org.specialties || []).join(', '),
      featured: org.featured ?? false,
    });
    setIsOrganizerFormOpen(true);
  };

  const handleSubmitOrganizerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!organizerForm.companyName.trim()) {
      setErrorMessage('Organiser name is required.');
      return;
    }
    const payload = {
      companyName: organizerForm.companyName.trim(),
      email: organizerForm.email.trim(),
      phone: organizerForm.phone.trim(),
      logoUrl: organizerForm.logoUrl.trim(),
      bannerUrl: organizerForm.bannerUrl.trim(),
      description: organizerForm.description.trim(),
      website: organizerForm.website.trim(),
      location: organizerForm.location.trim(),
      specialties: organizerForm.specialtiesText.split(',').map((s) => s.trim()).filter(Boolean),
      featured: organizerForm.featured,
    };
    try {
      if (editingOrganizerId) {
        await updateOrganizerProfile(editingOrganizerId, payload);
        flashSuccess('Organiser profile updated successfully.');
      } else {
        await createOrganizerProfile({
          ...payload,
          userId: auth.currentUser?.uid || '',
        });
        flashSuccess('Organiser profile created successfully.');
      }
      setIsOrganizerFormOpen(false);
      loadData();
    } catch (err) {
      setErrorMessage('Failed to save organiser profile. Make sure updated Firestore rules have been deployed.');
    }
  };

  const handleDeleteOrganizer = async (orgId: string) => {
    if (!window.confirm('Delete this organiser? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteOrganizerProfile(orgId);
      flashSuccess('Organiser profile deleted.');
      loadData();
    } catch (err) {
      setErrorMessage('Failed to delete organiser profile.');
    }
  };

  // ---- Past shows list editor (artist form) ----
  const addPastShow = () => {
    setArtistForm((f) => ({ ...f, pastShows: [...f.pastShows, { title: '', date: '', venue: '' }] }));
  };
  const updatePastShow = (idx: number, field: 'title' | 'date' | 'venue', value: string) => {
    setArtistForm((f) => ({
      ...f,
      pastShows: f.pastShows.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }));
  };
  const removePastShow = (idx: number) => {
    setArtistForm((f) => ({ ...f, pastShows: f.pastShows.filter((_, i) => i !== idx) }));
  };

  const handleAddGenre = () => {
    if (!genreInput.trim()) return;
    if (!artistForm.genres.includes(genreInput.trim())) {
      setArtistForm({ ...artistForm, genres: [...artistForm.genres, genreInput.trim()] });
    }
    setGenreInput('');
  };

  const handleRemoveGenre = (g: string) => {
    setArtistForm({ ...artistForm, genres: artistForm.genres.filter(item => item !== g) });
  };

  const handleSubmitArtistForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!artistForm.stageName.trim()) {
      setErrorMessage('Stage name is required.');
      return;
    }

    const payload = {
      stageName: artistForm.stageName.trim(),
      bio: artistForm.bio,
      category: artistForm.category,
      subCategory: artistForm.subCategory,
      profileImage: artistForm.profileImage,
      coverImage: artistForm.coverImage,
      genres: artistForm.genres,
      hourlyRate: artistForm.hourlyRate,
      location: artistForm.location,
      experienceYears: artistForm.experienceYears,
      availableNow: artistForm.availableNow,
      featured: artistForm.featured,
      socialLinks: {
        website: artistForm.socialWebsite,
        instagram: artistForm.socialInstagram,
        spotify: artistForm.socialSpotify,
        youtube: artistForm.socialYoutube
      },
      // Artist page content — zeros/empties keep their sections hidden
      rating: Number(artistForm.rating) || 0,
      totalReviews: Number(artistForm.totalReviews) || 0,
      eventsHosted: Number(artistForm.eventsHosted) || 0,
      totalAudience: artistForm.totalAudience.trim(),
      pastShows: artistForm.pastShows.filter((s) => s.title.trim()),
    };

    try {
      if (editingArtistId) {
        await updateArtistProfile(editingArtistId, payload);
        flashSuccess('Artist profile updated successfully.');
      } else {
        await createArtistProfile({
          ...payload,
          userId: auth.currentUser?.uid || ''
        });
        flashSuccess('Artist profile created successfully.');
      }
      setIsArtistFormOpen(false);
      loadData();
    } catch (err) {
      setErrorMessage('Failed to save artist profile. Make sure updated Firestore rules have been deployed.');
    }
  };

  const handleDeleteArtist = async (artistId: string) => {
    if (!window.confirm('Delete this artist? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteArtistProfile(artistId);
      flashSuccess('Artist profile removed.');
      loadData();
    } catch (err) {
      setErrorMessage('Failed to delete artist profile.');
    }
  };

  const filteredUsers = users.filter(usr =>
    usr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    usr.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    usr.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left" id="admin-hub-root">
      
      {/* Tab Header Status */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-black pb-5">
        <div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase bg-[#ffed00] text-black px-3 py-1.5 inline-block">
            Administrator
          </span>
          <h2 className="font-display font-bold text-3xl leading-[0.95] text-black mt-3">
            Admin console
          </h2>
          <p className="text-sm text-[#666] mt-2">
            Everything on the platform — events, artists, orders, users and revenue — managed from one place.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 py-2.5 px-5 bg-white border border-black hover:bg-[#f7f7f7] text-black text-sm font-bold cursor-pointer transition-colors shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh data</span>
        </button>
      </div>

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="bg-emerald-50   text-emerald-800 text-xs py-3 px-4 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50   text-red-800 text-xs py-3 px-4 rounded-xl flex items-center gap-2 font-medium">
          <ShieldAlert className="w-4 h-4 text-red-650 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sub tabs navigation */}
      <div className="flex items-center border-b border-[#f2f2f2] flex-wrap overflow-x-auto">
        {([
          { id: 'analytics', label: 'Analytics' },
          { id: 'users', label: `Users (${users.length})` },
          { id: 'bookings', label: `Orders (${bookings.length})` },
          { id: 'events', label: `Events (${events.length})` },
          { id: 'artists', label: `Artists (${artists.length})` },
          { id: 'organizers', label: `Organisers (${organizers.length})` },
          { id: 'payments', label: `Payments (${payments.length})` },
          { id: 'tickets', label: `Tickets (${tickets.length})` },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-5 py-3.5 text-sm font-bold transition-colors cursor-pointer relative whitespace-nowrap ${
              activeSubTab === tab.id ? 'text-black' : 'text-[#8a8a8a] hover:text-black'
            }`}
          >
            {tab.label}
            {activeSubTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-black" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-[#E34718] animate-spin mx-auto mb-3" />
          <p className="text-xs text-neutral-450 text-sentence tracking-widest font-bold">Loading dashboard data...</p>
        </div>
      ) : (
        <div className="transition-all duration-300">
          
          {/* 1. Platform analytics tab */}
          {activeSubTab === 'analytics' && analytics && (
            <div className="space-y-6">
              
              {/* Analytics grid cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#e4e4e4] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#666]">Registered users</span>
                    <Users className="w-5 h-5 text-black" />
                  </div>
                  <span className="font-display font-bold text-3xl text-black leading-none">{analytics.totalUsers || users.length}</span>
                  <div className="text-xs text-[#8a8a8a] mt-2">Across all roles</div>
                </div>

                <div className="bg-white border border-[#e4e4e4] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#666]">Events listed</span>
                    <Calendar className="w-5 h-5 text-black" />
                  </div>
                  <span className="font-display font-bold text-3xl text-black leading-none">{analytics.totalEvents || events.length}</span>
                  <div className="text-xs text-[#8a8a8a] mt-2">Published &amp; drafts</div>
                </div>

                <div className="bg-white border border-[#e4e4e4] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#666]">Tickets sold</span>
                    <Ticket className="w-5 h-5 text-black" />
                  </div>
                  <span className="font-display font-bold text-3xl text-black leading-none">{analytics.totalTicketsSold}</span>
                  <div className="text-xs text-[#8a8a8a] mt-2">Issued &amp; verified</div>
                </div>

                <div className="bg-black text-white p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/60">Total revenue</span>
                    <DollarSign className="w-5 h-5 text-[#ffed00]" />
                  </div>
                  <span className="font-display font-bold text-3xl text-white leading-none">${analytics.totalRevenue}</span>
                  <div className="text-xs text-[#ffed00] mt-2 font-bold">USD equivalent</div>
                </div>
              </div>

              {/* Extra analytic numbers charts simulation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white   p-6 rounded-2xl shadow-3xs text-left">
                  <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#666] border-b border-[#f2f2f2] pb-3 mb-4">Users by role</h3>
                  <div className="space-y-3.5">
                    {[
                      { role: 'Administrators', count: users.filter(u => u.role === 'admin').length, color: 'bg-black' },
                      { role: 'Organisers', count: users.filter(u => u.role === 'organizer').length, color: 'bg-[#333333]' },
                      { role: 'Artists', count: users.filter(u => u.role === 'artist').length, color: 'bg-[#666666]' },
                      { role: 'Customers', count: users.filter(u => u.role === 'user').length, color: 'bg-[#ffed00]' }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-neutral-700">
                          <span>{item.role}</span>
                          <span className="font-mono">{item.count} users ({Math.round(users.length ? (item.count / users.length) * 100 : 0)}%)</span>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                          <div className={`${item.color} h-full`} style={{ width: `${users.length ? (item.count / users.length) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white   p-6 rounded-2xl shadow-3xs text-left">
                  <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#666] border-b border-[#f2f2f2] pb-3 mb-4">Sales at a glance</h3>
                  <div className="space-y-4 text-xs font-bold">
                    <div className="flex justify-between py-2  ">
                      <span className="text-neutral-500">Average Order Value:</span>
                      <span className="font-mono text-neutral-900">${bookings.length ? Math.round(analytics.totalRevenue / bookings.length) : 0} per order</span>
                    </div>
                    <div className="flex justify-between py-2  ">
                      <span className="text-neutral-500">Paid Bookings:</span>
                      <span className="font-mono text-green-700">{bookings.filter(b => b.paymentStatus === 'paid').length}</span>
                    </div>
                    <div className="flex justify-between py-2  ">
                      <span className="text-neutral-500">Pending Bookings:</span>
                      <span className="font-mono text-amber-600">{bookings.filter(b => b.paymentStatus === 'pending').length}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-neutral-500">Fraud Alerts:</span>
                      <span className="font-mono text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-full  ">0 Alerts</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2. User management tab */}
          {activeSubTab === 'users' && (
            <div className="space-y-4">
              
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white    focus:ring-1 focus:ring-[#E34718]/35 text-xs font-semibold py-3 pl-11 pr-4 rounded-xl shadow-3xs outline-none focus:ring-1 focus:ring-[#E34718]/50"
                />
              </div>

              {/* Users table */}
              <div className="bg-white   rounded-2xl overflow-hidden shadow-3xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold text-sentence tracking-wider  ">
                      <tr>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="  font-semibold text-neutral-800">
                      {filteredUsers.map((usr) => (
                        <tr key={usr.uid} className="hover:bg-neutral-50/40">
                          <td className="py-3.5 px-4 min-w-[160px]">
                            <div className="font-bold text-neutral-900">{usr.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{usr.uid.substring(0, 8)}...</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">{usr.email}</td>
                          <td className="py-3.5 px-4">
                            <select 
                              value={usr.role}
                              onChange={(e) => handleRoleChange(usr.uid, e.target.value, usr.status)}
                              className="bg-neutral-50   text-neutral-800 font-bold px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E34718] text-sentence text-[10px]"
                            >
                              <option value="user">User</option>
                              <option value="organizer">Organizer</option>
                              <option value="artist">Artist</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-1 text-[9px] font-black text-sentence rounded-full  ${
                              usr.status === 'suspended' 
                                ? 'bg-red-50  text-red-650' 
                                : 'bg-green-50  text-green-700'
                            }`}>
                              {usr.status || 'active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => handleToggleSuspension(usr.uid, usr.role, usr.status || 'active')}
                                className={`p-1.5 rounded-lg  flex items-center justify-center cursor-pointer hover:shadow-2xs ${
                                  usr.status === 'suspended' 
                                    ? 'bg-green-50  hover:bg-green-100 text-green-700' 
                                    : 'bg-amber-50  hover:bg-amber-100 text-amber-700'
                                }`}
                                title={usr.status === 'suspended' ? 'Activate account' : 'Suspend account'}
                              >
                                {usr.status === 'suspended' ? <UserCheck className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(usr.uid)}
                                className="p-1.5 bg-red-50   hover:bg-red-100  text-red-600 rounded-lg flex items-center justify-center cursor-pointer hover:shadow-2xs"
                                title="Delete User account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-neutral-400 font-bold">No users found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* 3. Bookings ledger tab */}
          {activeSubTab === 'bookings' && (
            <div className="bg-white   rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold text-sentence tracking-wider  ">
                    <tr>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="  font-semibold text-neutral-800">
                    {bookings.map((bk: any) => (
                      <tr key={bk.id} className="hover:bg-neutral-50/40">
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">{bk.bookingNumber || bk.orderId || bk.id}</td>
                        <td className="py-3.5 px-4">Event: {bk.eventId}</td>
                        <td className="py-3.5 px-4 font-mono">User: {(bk.userId || '').substring(0, 8)}...</td>
                        <td className="py-3.5 px-4 text-sentence font-bold text-neutral-700">
                          {bk.paymentMethod || '—'}
                          {bk.paymentRegion && <span className="text-[9px] text-neutral-400 block normal-case font-semibold">{bk.paymentRegion} region</span>}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-500">{bk.stripeTransactionId || '—'}</td>
                        <td className="py-3.5 px-4 font-mono text-neutral-900 font-bold">${bk.amount ?? bk.pricePaid ?? 0}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black text-sentence rounded-full  ${
                            bk.paymentStatus === 'paid'
                              ? 'bg-emerald-50  text-emerald-700'
                              : 'bg-amber-50  text-amber-600'
                          }`}>
                            {bk.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={bk.paymentStatus || 'pending'}
                              onChange={(e) => handleBookingStatusChange(bk.id!, { paymentStatus: e.target.value })}
                              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-[10px] font-bold cursor-pointer"
                            >
                              <option value="pending">Payment: pending</option>
                              <option value="paid">Payment: paid</option>
                              <option value="failed">Payment: failed</option>
                            </select>
                            <select
                              value={bk.bookingStatus || 'active'}
                              onChange={(e) => handleBookingStatusChange(bk.id!, { bookingStatus: e.target.value })}
                              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-[10px] font-bold cursor-pointer"
                            >
                              <option value="active">Active</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-neutral-400 font-bold">No bookings found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3b. Organisers tab — full create/edit/delete management */}
          {activeSubTab === 'organizers' && (
            <div className="space-y-4">
              {!isOrganizerFormOpen && (
                <div className="flex justify-end">
                  <button
                    onClick={handleOpenCreateOrganizer}
                    className="flex items-center gap-1.5 py-2.5 px-5 bg-[#E34718] hover:bg-[#C23A12] text-white text-xs font-bold text-sentence tracking-wider rounded-full shadow-md cursor-pointer transition-transform active:scale-97"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Organiser</span>
                  </button>
                </div>
              )}

              {isOrganizerFormOpen ? (
                <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-3xs text-left max-w-2xl">
                  <div className="flex items-center gap-2   pb-3.5 mb-6">
                    <button onClick={() => setIsOrganizerFormOpen(false)} className="text-neutral-500 hover:text-black hover:underline cursor-pointer">
                      <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                    </button>
                    <h3 className="font-display font-medium text-lg text-neutral-900 text-sentence ml-2">
                      {editingOrganizerId ? 'Edit Organiser' : 'Add New Organiser'}
                    </h3>
                  </div>

                  <form onSubmit={handleSubmitOrganizerForm} className="space-y-4 text-xs font-bold text-neutral-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Organiser / Company Name</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={organizerForm.companyName}
                          onChange={(e) => setOrganizerForm({ ...organizerForm, companyName: e.target.value })}
                          placeholder="e.g. Jazba Entertainment"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Location</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={organizerForm.location}
                          onChange={(e) => setOrganizerForm({ ...organizerForm, location: e.target.value })}
                          placeholder="e.g. Birmingham, UK"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Contact Email</label>
                        <input
                          type="email"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={organizerForm.email}
                          onChange={(e) => setOrganizerForm({ ...organizerForm, email: e.target.value })}
                          placeholder="bookings@company.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Phone</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={organizerForm.phone}
                          onChange={(e) => setOrganizerForm({ ...organizerForm, phone: e.target.value })}
                          placeholder="0333 5777 014"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Logo Image URL</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                          value={organizerForm.logoUrl}
                          onChange={(e) => setOrganizerForm({ ...organizerForm, logoUrl: e.target.value })}
                          placeholder="https://…"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Banner Image URL</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                          value={organizerForm.bannerUrl}
                          onChange={(e) => setOrganizerForm({ ...organizerForm, bannerUrl: e.target.value })}
                          placeholder="https://…"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-neutral-500 text-sentence tracking-wider block">Description / About</label>
                      <textarea
                        className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  h-24"
                        value={organizerForm.description}
                        onChange={(e) => setOrganizerForm({ ...organizerForm, description: e.target.value })}
                        placeholder="Who they are and the kind of events they run. Leave empty to hide the About section."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Website</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                          value={organizerForm.website}
                          onChange={(e) => setOrganizerForm({ ...organizerForm, website: e.target.value })}
                          placeholder="https://company.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Specialties (comma separated)</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={organizerForm.specialtiesText}
                          onChange={(e) => setOrganizerForm({ ...organizerForm, specialtiesText: e.target.value })}
                          placeholder="e.g. Live music, Festivals, Theatre"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={organizerForm.featured}
                          onChange={(e) => setOrganizerForm({ ...organizerForm, featured: e.target.checked })}
                        />
                        <span className="text-neutral-600">Featured organiser</span>
                      </label>
                    </div>

                    <div className="pt-4   flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsOrganizerFormOpen(false)}
                        className="py-2.5 px-4 bg-white   hover:bg-neutral-55 text-neutral-800 text-xs font-bold text-sentence tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="py-2.5 px-5 bg-neutral-900   hover:bg-neutral-800 text-white text-xs font-bold text-sentence tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer shadow-md"
                      >
                        Save Organiser
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white   rounded-2xl overflow-hidden shadow-3xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 text-neutral-500 font-bold text-sentence tracking-wider  ">
                        <tr>
                          <th className="py-3 px-4">Company</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Contact Email</th>
                          <th className="py-3 px-4">Featured</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="  font-semibold text-neutral-800">
                        {organizers.map((org) => (
                          <tr key={org.id || org.userId} className="hover:bg-neutral-50/40">
                            <td className="py-3.5 px-4 font-bold text-neutral-900">{org.companyName || '—'}</td>
                            <td className="py-3.5 px-4">{org.location || '—'}</td>
                            <td className="py-3.5 px-4">{org.email || '—'}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black text-sentence rounded-full ${
                                org.featured ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'
                              }`}>
                                {org.featured ? 'Featured' : '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditOrganizer(org)}
                                  className="p-1.5 bg-neutral-50   hover:bg-neutral-100 text-neutral-700 rounded-lg inline-flex items-center justify-center cursor-pointer hover:shadow-2xs"
                                  title="Edit organiser"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOrganizer(org.id!)}
                                  className="p-1.5 bg-red-50   hover:bg-red-100 text-red-650 rounded-lg inline-flex items-center justify-center cursor-pointer hover:shadow-2xs"
                                  title="Delete organiser"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {organizers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-neutral-400 font-bold">No organiser profiles yet. Click "Add Organiser" to create the first one.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3c. Payments tab */}
          {activeSubTab === 'payments' && (
            <div className="bg-white   rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold text-sentence tracking-wider  ">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Booking</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Provider</th>
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="  font-semibold text-neutral-800">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-50/40">
                        <td className="py-3.5 px-4 text-neutral-500">{(p.createdAt || '').substring(0, 10)}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">{p.bookingId || '—'}</td>
                        <td className="py-3.5 px-4 font-mono">{(p.userId || '').substring(0, 8)}...</td>
                        <td className="py-3.5 px-4 text-sentence font-bold">{p.provider}</td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-500">{p.transactionId || '—'}</td>
                        <td className="py-3.5 px-4 font-mono text-neutral-900 font-bold">{p.currency} {p.amount}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black text-sentence rounded-full ${
                            p.status === 'success'
                              ? 'bg-emerald-50 text-emerald-700'
                              : p.status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-600'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-neutral-400 font-bold">No payments recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3d. Tickets tab (issue tracking + gate scanning) */}
          {activeSubTab === 'tickets' && (
            <div className="bg-white   rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold text-sentence tracking-wider  ">
                    <tr>
                      <th className="py-3 px-4">Ticket No.</th>
                      <th className="py-3 px-4">Booking</th>
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Holder</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="  font-semibold text-neutral-800">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50/40">
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">{t.ticketNumber}</td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-500">{t.bookingId || '—'}</td>
                        <td className="py-3.5 px-4">{t.eventId || '—'}</td>
                        <td className="py-3.5 px-4 font-mono">{(t.userId || '').substring(0, 8)}...</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black text-sentence rounded-full ${
                            t.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.status === 'scanned'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-red-50 text-red-700'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={t.status}
                            onChange={(e) => handleTicketStatusChange(t.id!, e.target.value as any)}
                            className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-[10px] font-bold cursor-pointer"
                          >
                            <option value="active">Active</option>
                            <option value="scanned">Scanned (entered)</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-neutral-400 font-bold">No tickets issued yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Event list control tab */}
          {activeSubTab === 'events' && (
            <div className="space-y-4">
              {!isEventFormOpen && (
                <div className="flex justify-end">
                  <button
                    onClick={handleOpenCreateEvent}
                    className="flex items-center gap-1.5 py-2.5 px-5 bg-[#E34718] hover:bg-[#C23A12] text-white text-xs font-bold text-sentence tracking-wider rounded-full shadow-md cursor-pointer transition-transform active:scale-97"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Event</span>
                  </button>
                </div>
              )}

              {isEventFormOpen ? (
                <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-3xs text-left max-w-2xl">
                  <div className="flex items-center gap-2   pb-3.5 mb-6">
                    <button onClick={() => setIsEventFormOpen(false)} className="text-neutral-500 hover:text-black hover:underline cursor-pointer">
                      <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                    </button>
                    <h3 className="font-display font-medium text-lg text-neutral-900 text-sentence ml-2">
                      {editingEventId ? 'Edit Event' : 'Create New Event'}
                    </h3>
                  </div>

                  <form onSubmit={handleSubmitEventForm} className="space-y-4 text-xs font-bold text-neutral-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Event Title</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.title}
                          onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                          placeholder="e.g. Symphony of the Opera"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Venue Name</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.venue}
                          onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                          placeholder="e.g. Royal Albert Hall"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-neutral-500 text-sentence tracking-wider block">Cover Banner Image URL</label>
                      <input
                        type="text"
                        className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                        value={eventForm.bannerImage}
                        onChange={(e) => setEventForm({ ...eventForm, bannerImage: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">City</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.city}
                          onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Date</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.date}
                          onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                          placeholder="e.g. 18 Jul"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Capacity (Seats)</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.capacity}
                          onChange={(e) => setEventForm({ ...eventForm, capacity: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Category</label>
                        <select
                          value={eventForm.category}
                          onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  text-sentence"
                        >
                          {categories.filter(c => c.id !== 'all').map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">General Price (USD)</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.price}
                          onChange={(e) => setEventForm({ ...eventForm, price: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Homepage Section</label>
                        <select
                          value={eventForm.type}
                          onChange={(e: any) => setEventForm({ ...eventForm, type: e.target.value })}
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  text-sentence"
                        >
                          <option value="top">Top Events</option>
                          <option value="for-you">Curated For You</option>
                          <option value="near-by">Near By Your City</option>
                          <option value="upcoming">Upcoming Shows</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-neutral-500 text-sentence tracking-wider block">Description</label>
                      <textarea
                        className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  h-24"
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Start Time</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.startTime}
                          onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Publication Status</label>
                        <select
                          value={eventForm.status}
                          onChange={(e: any) => setEventForm({ ...eventForm, status: e.target.value })}
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  text-sentence"
                        >
                          <option value="draft">Draft (hidden from public)</option>
                          <option value="published">Published (live on site)</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* ══════════ EVENT PAGE CONTENT ══════════
                        Every block below is optional — anything left empty
                        simply doesn't appear on the public event page. */}

                    {/* Ticket packages */}
                    <div className="pt-5 border-t border-neutral-100">
                      <h4 className="font-display font-bold text-sm text-neutral-900">Ticket packages</h4>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">General uses the price above. Leave VIP / Elite empty to hide that package on the event page and checkout.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">VIP Price (USD) — optional</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.priceVip}
                          onChange={(e) => setEventForm({ ...eventForm, priceVip: e.target.value })}
                          placeholder="Leave empty to hide VIP"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Elite Price (USD) — optional</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.priceElite}
                          onChange={(e) => setEventForm({ ...eventForm, priceElite: e.target.value })}
                          placeholder="Leave empty to hide Elite"
                        />
                      </div>
                    </div>

                    {/* Highlights */}
                    <div className="pt-5 border-t border-neutral-100">
                      <h4 className="font-display font-bold text-sm text-neutral-900">Event highlights</h4>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">Shown as ticks under the description — one per line. Leave empty to hide.</p>
                    </div>
                    <textarea
                      className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  h-20"
                      value={eventForm.highlightsText}
                      onChange={(e) => setEventForm({ ...eventForm, highlightsText: e.target.value })}
                      placeholder={'Two full 45-minute acts\nFull stage and light production'}
                    />

                    {/* Running order */}
                    <div className="pt-5 border-t border-neutral-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-display font-bold text-sm text-neutral-900">Running order</h4>
                        <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">The schedule accordion. No entries = section hidden.</p>
                      </div>
                      <button type="button" onClick={() => addListRow('agenda')} className="flex items-center gap-1 py-1.5 px-3 bg-neutral-900 text-white text-[10px] font-bold rounded-full cursor-pointer hover:bg-neutral-800">
                        <PlusCircle className="w-3.5 h-3.5" /> Add entry
                      </button>
                    </div>
                    {eventForm.agenda.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-neutral-50/60 p-2.5 rounded-lg">
                        <input
                          type="text"
                          className="col-span-3 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                          value={row.time}
                          onChange={(e) => updateListRow('agenda', idx, 'time', e.target.value)}
                          placeholder="7:30 PM"
                        />
                        <input
                          type="text"
                          className="col-span-4 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                          value={row.title}
                          onChange={(e) => updateListRow('agenda', idx, 'title', e.target.value)}
                          placeholder="Act one"
                        />
                        <input
                          type="text"
                          className="col-span-4 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                          value={row.desc}
                          onChange={(e) => updateListRow('agenda', idx, 'desc', e.target.value)}
                          placeholder="What happens in this slot"
                        />
                        <button type="button" onClick={() => removeListRow('agenda', idx)} className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer flex items-center justify-center" title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Performers */}
                    <div className="pt-5 border-t border-neutral-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-display font-bold text-sm text-neutral-900">Performers (on stage)</h4>
                        <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">The lineup cards. No performers = section hidden.</p>
                      </div>
                      <button type="button" onClick={() => addListRow('lineup')} className="flex items-center gap-1 py-1.5 px-3 bg-neutral-900 text-white text-[10px] font-bold rounded-full cursor-pointer hover:bg-neutral-800">
                        <PlusCircle className="w-3.5 h-3.5" /> Add performer
                      </button>
                    </div>
                    {eventForm.lineup.map((row, idx) => (
                      <div key={idx} className="space-y-2 bg-neutral-50/60 p-2.5 rounded-lg">
                        <div className="grid grid-cols-12 gap-2">
                          <input
                            type="text"
                            className="col-span-4 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                            value={row.name}
                            onChange={(e) => updateListRow('lineup', idx, 'name', e.target.value)}
                            placeholder="Performer name"
                          />
                          <input
                            type="text"
                            className="col-span-3 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                            value={row.role}
                            onChange={(e) => updateListRow('lineup', idx, 'role', e.target.value)}
                            placeholder="Role (e.g. Lead vocalist)"
                          />
                          <input
                            type="text"
                            className="col-span-4 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 font-mono"
                            value={row.avatar}
                            onChange={(e) => updateListRow('lineup', idx, 'avatar', e.target.value)}
                            placeholder="Photo URL (optional)"
                          />
                          <button type="button" onClick={() => removeListRow('lineup', idx)} className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer flex items-center justify-center" title="Remove">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          className="w-full bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                          value={row.bio}
                          onChange={(e) => updateListRow('lineup', idx, 'bio', e.target.value)}
                          placeholder="Short bio line"
                        />
                      </div>
                    ))}

                    {/* Organizer */}
                    <div className="pt-5 border-t border-neutral-100">
                      <h4 className="font-display font-bold text-sm text-neutral-900">Event organiser (presented by)</h4>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">Leave the name empty to hide the "Presented by" card.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Organiser Name</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={eventForm.organizerName}
                          onChange={(e) => setEventForm({ ...eventForm, organizerName: e.target.value })}
                          placeholder="e.g. Jazba Entertainment"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Organiser Logo / Image URL</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                          value={eventForm.organizerImage}
                          onChange={(e) => setEventForm({ ...eventForm, organizerImage: e.target.value })}
                          placeholder="https://…"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-neutral-500 text-sentence tracking-wider block">Organiser Bio</label>
                      <textarea
                        className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  h-16"
                        value={eventForm.organizerBio}
                        onChange={(e) => setEventForm({ ...eventForm, organizerBio: e.target.value })}
                        placeholder="A line or two about the organiser"
                      />
                    </div>

                    {/* Getting there */}
                    <div className="pt-5 border-t border-neutral-100">
                      <h4 className="font-display font-bold text-sm text-neutral-900">Getting there (live map & directions)</h4>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">Paste a Google Maps embed URL or just type the venue address — the live map renders automatically. All empty = section hidden.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-neutral-500 text-sentence tracking-wider block">Google Maps URL or Venue Address</label>
                      <input
                        type="text"
                        className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                        value={eventForm.mapUrl}
                        onChange={(e) => setEventForm({ ...eventForm, mapUrl: e.target.value })}
                        placeholder="e.g. Utilita Arena Birmingham  —  or  https://www.google.com/maps/embed?pb=…"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">By Public Transport (one line each)</label>
                        <textarea
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  h-20"
                          value={eventForm.transportText}
                          onChange={(e) => setEventForm({ ...eventForm, transportText: e.target.value })}
                          placeholder={'Underground: Westminster — 4-minute walk\nBus: Routes 24 & 88 stop at the gates'}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">By Car (one line each)</label>
                        <textarea
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  h-20"
                          value={eventForm.parkingText}
                          onChange={(e) => setEventForm({ ...eventForm, parkingText: e.target.value })}
                          placeholder={'Parking: On-site Deck G — pre-book\nDrop-off: Lay-by at the main entrance'}
                        />
                      </div>
                    </div>

                    {/* Gallery */}
                    <div className="pt-5 border-t border-neutral-100">
                      <h4 className="font-display font-bold text-sm text-neutral-900">From past shows (photo gallery)</h4>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">One image URL per line. Leave empty to hide the gallery.</p>
                    </div>
                    <textarea
                      className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  h-20 font-mono"
                      value={eventForm.galleryText}
                      onChange={(e) => setEventForm({ ...eventForm, galleryText: e.target.value })}
                      placeholder={'https://…/photo-1.jpg\nhttps://…/photo-2.jpg'}
                    />

                    {/* FAQs */}
                    <div className="pt-5 border-t border-neutral-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-display font-bold text-sm text-neutral-900">FAQs (good to know)</h4>
                        <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">No questions = section hidden.</p>
                      </div>
                      <button type="button" onClick={() => addListRow('faqs')} className="flex items-center gap-1 py-1.5 px-3 bg-neutral-900 text-white text-[10px] font-bold rounded-full cursor-pointer hover:bg-neutral-800">
                        <PlusCircle className="w-3.5 h-3.5" /> Add FAQ
                      </button>
                    </div>
                    {eventForm.faqs.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-neutral-50/60 p-2.5 rounded-lg">
                        <input
                          type="text"
                          className="col-span-5 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                          value={row.question}
                          onChange={(e) => updateListRow('faqs', idx, 'question', e.target.value)}
                          placeholder="Question"
                        />
                        <input
                          type="text"
                          className="col-span-6 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                          value={row.answer}
                          onChange={(e) => updateListRow('faqs', idx, 'answer', e.target.value)}
                          placeholder="Answer"
                        />
                        <button type="button" onClick={() => removeListRow('faqs', idx)} className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer flex items-center justify-center" title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="pt-4   flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEventFormOpen(false)}
                        className="py-2.5 px-4 bg-white   hover:bg-neutral-55 text-neutral-800 text-xs font-bold text-sentence tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="py-2.5 px-5 bg-neutral-900   hover:bg-neutral-800 text-white text-xs font-bold text-sentence tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer shadow-md"
                      >
                        Save Event
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white   rounded-2xl overflow-hidden shadow-3xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 text-neutral-500 font-bold text-sentence tracking-wider  ">
                        <tr>
                          <th className="py-3 px-4">Event Title</th>
                          <th className="py-3 px-4">Venue &amp; City</th>
                          <th className="py-3 px-4">Performance Date</th>
                          <th className="py-3 px-4">Publication status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="  font-semibold text-neutral-800">
                        {events.map((evt) => (
                          <tr key={evt.id} className="hover:bg-neutral-50/40">
                            <td className="py-3.5 px-4 font-bold text-neutral-900 text-sentence">{evt.title}</td>
                            <td className="py-3.5 px-4 text-neutral-550 font-bold">{evt.venue}, {evt.city}</td>
                            <td className="py-3.5 px-4 font-mono">{evt.date}</td>
                            <td className="py-3.5 px-4.5">
                              <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black text-sentence rounded-full  ${
                                evt.status === 'published'
                                  ? 'bg-green-50  text-green-700'
                                  : 'bg-neutral-100  text-neutral-600'
                              }`}>
                                {evt.status || 'draft'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditEvent(evt)}
                                  className="p-1.5 bg-neutral-50   hover:bg-neutral-100 text-neutral-700 rounded-lg inline-flex items-center justify-center cursor-pointer hover:shadow-2xs"
                                  title="Edit event"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEventItem(evt.id)}
                                  className="p-1.5 bg-red-50   hover:bg-red-100 text-red-650 rounded-lg inline-flex items-center justify-center cursor-pointer hover:shadow-2xs"
                                  title="Delete event"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {events.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-neutral-400 font-bold">No events found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Artist management tab */}
          {activeSubTab === 'artists' && (
            <div className="space-y-4">
              {!isArtistFormOpen && (
                <div className="flex justify-end">
                  <button
                    onClick={handleOpenCreateArtist}
                    className="flex items-center gap-1.5 py-2.5 px-5 bg-[#E34718] hover:bg-[#C23A12] text-white text-xs font-bold text-sentence tracking-wider rounded-full shadow-md cursor-pointer transition-transform active:scale-97"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Artist</span>
                  </button>
                </div>
              )}

              {isArtistFormOpen ? (
                <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-3xs text-left max-w-2xl">
                  <div className="flex items-center gap-2   pb-3.5 mb-6">
                    <button onClick={() => setIsArtistFormOpen(false)} className="text-neutral-500 hover:text-black hover:underline cursor-pointer">
                      <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                    </button>
                    <h3 className="font-display font-medium text-lg text-neutral-900 text-sentence ml-2">
                      {editingArtistId ? 'Edit Artist' : 'Add New Artist'}
                    </h3>
                  </div>

                  <form onSubmit={handleSubmitArtistForm} className="space-y-4 text-xs font-bold text-neutral-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Stage Name</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={artistForm.stageName}
                          onChange={(e) => setArtistForm({ ...artistForm, stageName: e.target.value })}
                          placeholder="e.g. DJ Sparkle"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Sub-category / Title</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={artistForm.subCategory}
                          onChange={(e) => setArtistForm({ ...artistForm, subCategory: e.target.value })}
                          placeholder="e.g. Soprano Vocalist & Opera Lead"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Profile Image URL</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                          value={artistForm.profileImage}
                          onChange={(e) => setArtistForm({ ...artistForm, profileImage: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Cover Banner Image URL</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                          value={artistForm.coverImage}
                          onChange={(e) => setArtistForm({ ...artistForm, coverImage: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Category</label>
                        <select
                          value={artistForm.category}
                          onChange={(e: any) => setArtistForm({ ...artistForm, category: e.target.value })}
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  text-sentence"
                        >
                          <option value="music">Music</option>
                          <option value="theater">Theater</option>
                          <option value="sports">Sports</option>
                          <option value="conference">Conference</option>
                          <option value="exhibition">Exhibition</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Fee per event (USD)</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={artistForm.hourlyRate}
                          onChange={(e) => setArtistForm({ ...artistForm, hourlyRate: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Years of Experience</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={artistForm.experienceYears}
                          onChange={(e) => setArtistForm({ ...artistForm, experienceYears: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-neutral-500 text-sentence tracking-wider block">Location</label>
                      <input
                        type="text"
                        className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                        value={artistForm.location}
                        onChange={(e) => setArtistForm({ ...artistForm, location: e.target.value })}
                        placeholder="e.g. London, UK"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-neutral-500 text-sentence tracking-wider block">Genres / Tags</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={genreInput}
                          onChange={(e) => setGenreInput(e.target.value)}
                          placeholder="e.g. Opera, Vocalist"
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGenre(); } }}
                        />
                        <button
                          type="button"
                          onClick={handleAddGenre}
                          className="py-2.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg cursor-pointer font-bold text-sentence transition-transform active:scale-97 text-[11px]"
                        >
                          Add
                        </button>
                      </div>
                      {artistForm.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {artistForm.genres.map((g) => (
                            <span key={g} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50   text-indigo-700 text-[10px] font-black text-sentence rounded-full">
                              <span>{g}</span>
                              <button type="button" onClick={() => handleRemoveGenre(g)} className="text-indigo-900 font-extrabold hover:text-red-650 shrink-0">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-neutral-500 text-sentence tracking-wider block">Biography</label>
                      <textarea
                        className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  h-24"
                        value={artistForm.bio}
                        onChange={(e) => setArtistForm({ ...artistForm, bio: e.target.value })}
                      />
                    </div>

                    {/* Profile stats */}
                    <div className="pt-5 border-t border-neutral-100">
                      <h4 className="font-display font-bold text-sm text-neutral-900">Profile stats & rating</h4>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">Shown on the artist page hero and rating tile. Leave empty to hide each one.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Rating (0–5)</label>
                        <input
                          type="number" step="0.1" min="0" max="5"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={artistForm.rating}
                          onChange={(e) => setArtistForm({ ...artistForm, rating: e.target.value })}
                          placeholder="e.g. 4.8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Review Count</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={artistForm.totalReviews}
                          onChange={(e) => setArtistForm({ ...artistForm, totalReviews: e.target.value })}
                          placeholder="e.g. 120"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Events Hosted</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={artistForm.eventsHosted}
                          onChange={(e) => setArtistForm({ ...artistForm, eventsHosted: e.target.value })}
                          placeholder="e.g. 42"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Total Audience</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                          value={artistForm.totalAudience}
                          onChange={(e) => setArtistForm({ ...artistForm, totalAudience: e.target.value })}
                          placeholder="e.g. 12.4k"
                        />
                      </div>
                    </div>

                    {/* Past shows */}
                    <div className="pt-5 border-t border-neutral-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-display font-bold text-sm text-neutral-900">Past shows</h4>
                        <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">The "Past shows" tab on the artist page. No entries = tab hidden.</p>
                      </div>
                      <button type="button" onClick={addPastShow} className="flex items-center gap-1 py-1.5 px-3 bg-neutral-900 text-white text-[10px] font-bold rounded-full cursor-pointer hover:bg-neutral-800">
                        <PlusCircle className="w-3.5 h-3.5" /> Add show
                      </button>
                    </div>
                    {artistForm.pastShows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-neutral-50/60 p-2.5 rounded-lg">
                        <input
                          type="text"
                          className="col-span-5 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                          value={row.title}
                          onChange={(e) => updatePastShow(idx, 'title', e.target.value)}
                          placeholder="Show title"
                        />
                        <input
                          type="text"
                          className="col-span-3 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                          value={row.date}
                          onChange={(e) => updatePastShow(idx, 'date', e.target.value)}
                          placeholder="e.g. May 2026"
                        />
                        <input
                          type="text"
                          className="col-span-3 bg-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50"
                          value={row.venue}
                          onChange={(e) => updatePastShow(idx, 'venue', e.target.value)}
                          placeholder="Venue"
                        />
                        <button type="button" onClick={() => removePastShow(idx)} className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer flex items-center justify-center" title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Website</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 font-mono"
                          value={artistForm.socialWebsite}
                          onChange={(e) => setArtistForm({ ...artistForm, socialWebsite: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Instagram</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 font-mono"
                          value={artistForm.socialInstagram}
                          onChange={(e) => setArtistForm({ ...artistForm, socialInstagram: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">Spotify</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 font-mono"
                          value={artistForm.socialSpotify}
                          onChange={(e) => setArtistForm({ ...artistForm, socialSpotify: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-neutral-500 text-sentence tracking-wider block">YouTube</label>
                        <input
                          type="text"
                          className="w-full bg-neutral-50   p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 font-mono"
                          value={artistForm.socialYoutube}
                          onChange={(e) => setArtistForm({ ...artistForm, socialYoutube: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={artistForm.availableNow}
                          onChange={(e) => setArtistForm({ ...artistForm, availableNow: e.target.checked })}
                        />
                        <span className="text-neutral-600">Instantly Bookable</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={artistForm.featured}
                          onChange={(e) => setArtistForm({ ...artistForm, featured: e.target.checked })}
                        />
                        <span className="text-neutral-600">Featured / Hot Talent</span>
                      </label>
                    </div>

                    <div className="pt-4   flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsArtistFormOpen(false)}
                        className="py-2.5 px-4 bg-white   hover:bg-neutral-55 text-neutral-800 text-xs font-bold text-sentence tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="py-2.5 px-5 bg-neutral-900   hover:bg-neutral-800 text-white text-xs font-bold text-sentence tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer shadow-md"
                      >
                        Save Artist
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white   rounded-2xl overflow-hidden shadow-3xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 text-neutral-500 font-bold text-sentence tracking-wider  ">
                        <tr>
                          <th className="py-3 px-4">Stage Name</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Rate</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="  font-semibold text-neutral-800">
                        {artists.map((artist) => (
                          <tr key={artist.id} className="hover:bg-neutral-50/40">
                            <td className="py-3.5 px-4 flex items-center gap-2.5">
                              <Music className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="font-bold text-neutral-900">{artist.stageName}</span>
                            </td>
                            <td className="py-3.5 px-4 text-sentence text-neutral-550">{artist.category || 'music'}</td>
                            <td className="py-3.5 px-4 text-neutral-550 font-bold">{artist.location || '—'}</td>
                            <td className="py-3.5 px-4 font-mono">${artist.hourlyRate || 0}/event</td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditArtist(artist)}
                                  className="p-1.5 bg-neutral-50   hover:bg-neutral-100 text-neutral-700 rounded-lg inline-flex items-center justify-center cursor-pointer hover:shadow-2xs"
                                  title="Edit artist"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => artist.id && handleDeleteArtist(artist.id)}
                                  className="p-1.5 bg-red-50   hover:bg-red-100 text-red-650 rounded-lg inline-flex items-center justify-center cursor-pointer hover:shadow-2xs"
                                  title="Delete artist"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {artists.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-neutral-400 font-bold">No artist profiles created yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
