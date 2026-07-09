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
  status: 'draft' as 'draft' | 'published' | 'cancelled' | 'completed'
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
  recentShows: '',
  socialWebsite: '',
  socialInstagram: '',
  socialSpotify: '',
  socialYoutube: ''
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
      status: evt.status || 'draft'
    });
    setIsEventFormOpen(true);
  };

  const handleSubmitEventForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!eventForm.title || !eventForm.venue) {
      setErrorMessage('Event title and venue are required.');
      return;
    }
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, { ...eventForm, image: eventForm.bannerImage });
        flashSuccess('Event updated successfully.');
      } else {
        await createEvent({
          ...eventForm,
          image: eventForm.bannerImage,
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
      recentShows: (artist.recentShows || []).join(', '),
      socialWebsite: artist.socialLinks?.website || '',
      socialInstagram: artist.socialLinks?.instagram || '',
      socialSpotify: artist.socialLinks?.spotify || '',
      socialYoutube: artist.socialLinks?.youtube || ''
    });
    setGenreInput('');
    setIsArtistFormOpen(true);
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
      recentShows: artistForm.recentShows.split(',').map(s => s.trim()).filter(Boolean),
      socialLinks: {
        website: artistForm.socialWebsite,
        instagram: artistForm.socialInstagram,
        spotify: artistForm.socialSpotify,
        youtube: artistForm.socialYoutube
      }
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

          {/* 3b. Organisers tab */}
          {activeSubTab === 'organizers' && (
            <div className="bg-white   rounded-2xl overflow-hidden shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold text-sentence tracking-wider  ">
                    <tr>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Contact Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Website</th>
                      <th className="py-3 px-4">Linked User</th>
                    </tr>
                  </thead>
                  <tbody className="  font-semibold text-neutral-800">
                    {organizers.map((org) => (
                      <tr key={org.id || org.userId} className="hover:bg-neutral-50/40">
                        <td className="py-3.5 px-4 font-bold text-neutral-900">{org.companyName || '—'}</td>
                        <td className="py-3.5 px-4">{org.email || '—'}</td>
                        <td className="py-3.5 px-4">{org.phone || '—'}</td>
                        <td className="py-3.5 px-4">{org.website || '—'}</td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-500">{(org.userId || '').substring(0, 8)}...</td>
                      </tr>
                    ))}
                    {organizers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-neutral-400 font-bold">No organiser profiles yet. Organisers appear here after they complete their profile in the Organizer Hub.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                        <label className="text-neutral-500 text-sentence tracking-wider block">Ticket Price (USD)</label>
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

                    <div className="space-y-1.5">
                      <label className="text-neutral-500 text-sentence tracking-wider block">Recent Shows (comma separated)</label>
                      <input
                        type="text"
                        className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                        value={artistForm.recentShows}
                        onChange={(e) => setArtistForm({ ...artistForm, recentShows: e.target.value })}
                        placeholder="e.g. The Phantom of the Opera, Les Misérables Symphony"
                      />
                    </div>

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
