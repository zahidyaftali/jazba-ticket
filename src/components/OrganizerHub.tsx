import React, { useState, useEffect } from 'react';
import { 
  Calendar, Ticket, DollarSign, PlusCircle, AlertCircle, Trash2, 
  Edit3, CheckCircle, ChevronRight, Users, Play, FileText, ArrowLeft
} from 'lucide-react';
import { 
  getEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  getBookings,
  getAllUsers,
  UserProfile,
  Booking
} from '../services/backendService';
import { auth } from '../firebase';

export default function OrganizerHub() {
  const [events, setEvents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Editing / Creating form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    venue: '',
    city: '',
    country: 'United Kingdom',
    date: '18 Feb',
    startTime: '19:00',
    endTime: '22:00',
    bannerImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=crop',
    capacity: 500,
    status: 'draft' as 'draft' | 'published' | 'cancelled' | 'completed'
  });

  // Selected event specs for sales detail check
  const [selectedEventIdForSales, setSelectedEventIdForSales] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const [allEvents, allBookings, allUsers] = await Promise.all([
        getEvents(),
        getBookings(),
        getAllUsers()
      ]);

      // Filter events created by this organizer - or for demo/prototyping we can associate with organizerId
      // Standard: filter by organizerId == user.uid
      const organizerEvents = allEvents.filter((evt: any) => evt.organizerId === user.uid);
      setEvents(organizerEvents);
      setBookings(allBookings);
      setUsers(allUsers);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch organizer performance metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateForm = () => {
    setEditingEventId(null);
    setEventForm({
      title: '',
      description: '',
      venue: '',
      city: 'London',
      country: 'United Kingdom',
      date: '20 Jul',
      startTime: '19:30',
      endTime: '22:30',
      bannerImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=crop',
      capacity: 1000,
      status: 'draft'
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (evt: any) => {
    setEditingEventId(evt.id);
    setEventForm({
      title: evt.title,
      description: evt.description || '',
      venue: evt.venue,
      city: evt.city || 'London',
      country: evt.country || 'United Kingdom',
      date: evt.date,
      startTime: evt.startTime || '19:30',
      endTime: evt.endTime || '22:30',
      bannerImage: evt.bannerImage || evt.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=crop',
      capacity: evt.capacity || 1000,
      status: evt.status || 'draft'
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const user = auth.currentUser;
    if (!user) return;

    if (!eventForm.title || !eventForm.venue) {
      setErrorMessage('Show title and performance venue location are required.');
      return;
    }

    try {
      if (editingEventId) {
        await updateEvent(editingEventId, {
          ...eventForm,
          image: eventForm.bannerImage // backwards compatibility support
        });
        setSuccessMessage('Show properties adjusted and updated successfully.');
      } else {
        await createEvent({
          ...eventForm,
          organizerId: user.uid,
          price: 85, // Default/standard price tag
          type: 'upcoming',
          image: eventForm.bannerImage // backwards compatibility support
        });
        setSuccessMessage('Show created successfully in Backstage registry.');
      }
      setIsFormOpen(false);
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Failed to save show specifications in database.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Delete this event? All links to admissions passes will reside in archive logs.')) {
      return;
    }
    try {
      await deleteEvent(id);
      setSuccessMessage('Event show deleted.');
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Purging transaction failed.');
    }
  };

  const handlePublishEvent = async (id: string) => {
    try {
      await updateEvent(id, { status: 'published' });
      setSuccessMessage('Show is immediately live to marketplace viewers!');
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Publishing failed.');
    }
  };

  // Get specific booking sales aggregates for a selected event
  const getEventBookings = (eventId: string) => bookings.filter(b => b.eventId === eventId);
  const getEventTicketSalesQuantity = (eventId: string) => getEventBookings(eventId).reduce((s, b) => s + b.quantity, 0);
  const getEventRevenue = (eventId: string) => getEventBookings(eventId).reduce((s, b) => s + b.amount, 0);

  const activeSalesEvent = events.find(e => e.id === selectedEventIdForSales);
  const activeEventBookings = selectedEventIdForSales ? getEventBookings(selectedEventIdForSales) : [];

  return (
    <div className="space-y-6 text-left" id="organizer-hub-root">
      
      {/* Header status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
        <div>
          <h2 className="font-display font-medium text-2xl text-neutral-900 flex items-center gap-2">
            Organizer Backstage Showcase Control
            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full uppercase border border-red-200">
              Verified Event Agent
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Create premium live concerts, publish tickets, adjust starting logistics, and view customer attendee reports.
          </p>
        </div>

        {!isFormOpen && !selectedEventIdForSales && (
          <button 
            onClick={handleOpenCreateForm}
            className="flex items-center gap-1.5 py-2.5 px-5 bg-[#E34718] hover:bg-[#C23A12] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md cursor-pointer transition-transform active:scale-97"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Showcase Concert</span>
          </button>
        )}
      </div>

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs py-3 px-4 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-250 text-red-800 text-xs py-3 px-4 rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-red-650 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs text-neutral-450 uppercase tracking-widest font-bold">Synchronizing Organizer Documents...</p>
        </div>
      ) : (
        <div className="transition-all duration-300">
          
          {/* SHOW CONCERT EDIT / CREATE VIEW */}
          {isFormOpen && (
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-3xs text-left max-w-2xl">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3.5 mb-6">
                <button onClick={() => setIsFormOpen(false)} className="text-neutral-500 hover:text-black hover:underline cursor-pointer">
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                </button>
                <h3 className="font-display font-medium text-lg text-neutral-900 uppercase ml-2">
                  {editingEventId ? 'Edit Concert parameters' : 'Propose New Live Musical Concert'}
                </h3>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-bold text-neutral-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-neutral-500 uppercase tracking-wider block">Concert Title</label>
                    <input 
                      type="text"
                      className="w-full bg-neutral-50 border border-neutral-250 p-2.5 rounded-lg outline-none focus:border-[#E34718]"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      placeholder="e.g. Symphony of the Opera"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-500 uppercase tracking-wider block">Performance Venue Name</label>
                    <input 
                      type="text"
                      className="w-full bg-neutral-50 border border-neutral-250 p-2.5 rounded-lg outline-none focus:border-[#E34718]"
                      value={eventForm.venue}
                      onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                      placeholder="e.g. Royal Albert Hall"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-500 uppercase tracking-wider block">Cover Landscape Banner Image URL</label>
                  <input 
                    type="text"
                    className="w-full bg-neutral-50 border border-neutral-250 p-2.5 rounded-lg outline-none focus:border-[#E34718] font-mono"
                    value={eventForm.bannerImage}
                    onChange={(e) => setEventForm({ ...eventForm, bannerImage: e.target.value })}
                    placeholder="Provide image link from Unsplash, etc."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-neutral-500 uppercase tracking-wider block">City Region</label>
                    <input 
                      type="text"
                      className="w-full bg-neutral-50 border border-neutral-250 p-2.5 rounded-lg outline-none focus:border-[#E34718]"
                      value={eventForm.city}
                      onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })}
                      placeholder="e.g. London"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-500 uppercase tracking-wider block">Starting Date</label>
                    <input 
                      type="text"
                      className="w-full bg-neutral-50 border border-neutral-250 p-2.5 rounded-lg outline-none focus:border-[#E34718]"
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      placeholder="e.g. 18 Jul"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-500 uppercase tracking-wider block">Max Capacity (Seats)</label>
                    <input 
                      type="number"
                      className="w-full bg-neutral-50 border border-neutral-250 p-2.5 rounded-lg outline-none focus:border-[#E34718]"
                      value={eventForm.capacity}
                      onChange={(e) => setEventForm({ ...eventForm, capacity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-500 uppercase tracking-wider block">Detailed Show Agenda / Description</label>
                  <textarea 
                    className="w-full bg-neutral-50 border border-neutral-250 p-2.5 rounded-lg outline-none focus:border-[#E34718] h-24"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Details about program lists, special musical guests..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-neutral-500 uppercase tracking-wider block">Start Time</label>
                    <input 
                      type="text"
                      className="w-full bg-neutral-50 border border-neutral-250 p-2.5 rounded-lg outline-none focus:border-[#E34718]"
                      value={eventForm.startTime}
                      onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-500 uppercase tracking-wider block">Platform Visibility State</label>
                    <select 
                      value={eventForm.status}
                      onChange={(e: any) => setEventForm({ ...eventForm, status: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-250 p-2.5 rounded-lg outline-none focus:border-[#E34718] text-xs font-bold uppercase"
                    >
                      <option value="draft">Draft (Visible only to organizers)</option>
                      <option value="published">Published (Live to Marketplace)</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)}
                    className="py-2.5 px-4 bg-white border border-neutral-250 hover:bg-neutral-55 text-neutral-800 text-xs font-bold uppercase tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                  <button 
                    type="submit" 
                    className="py-2.5 px-5 bg-neutral-900 border border-transparent hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer shadow-md"
                  >
                    Save Specifications
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW EVENT ATTENDEE SALES REPORT DETAILS */}
          {selectedEventIdForSales && activeSalesEvent && (
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-3xs text-left text-neutral-800 font-semibold space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
                <button 
                  onClick={() => setSelectedEventIdForSales(null)}
                  className="text-neutral-500 hover:text-black font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 hover:underline cursor-pointer bg-neutral-50 border border-neutral-200 px-3.5 py-1.5 rounded-full"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Show Catalog</span>
                </button>
                <span className="bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                  Accounting Ledgers Live
                </span>
              </div>

              {/* Showcase event short profile banner */}
              <div className="flex gap-4 items-center border-b border-neutral-100 pb-4">
                <img 
                  src={activeSalesEvent.bannerImage || activeSalesEvent.image} 
                  alt={activeSalesEvent.title}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-neutral-200"
                />
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-450">Attendee Report for</span>
                  <h3 className="font-display font-medium text-lg sm:text-xl text-neutral-900 uppercase leading-none">{activeSalesEvent.title}</h3>
                  <p className="text-[11px] text-neutral-450 mt-1">{activeSalesEvent.venue} venue slot • Starting {activeSalesEvent.date}</p>
                </div>
              </div>

              {/* Show Stats */}
              <div className="grid grid-cols-3 gap-4 text-left">
                <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Quantity Passes Sold</span>
                  <span className="font-mono font-black text-xl text-neutral-900">{getEventTicketSalesQuantity(activeSalesEvent.id)} passes</span>
                </div>
                <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl bg-orange-50/10">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Gross Revenue Generated</span>
                  <span className="font-mono font-black text-xl text-[#E34718]">${getEventRevenue(activeSalesEvent.id)}</span>
                </div>
                <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Remaining seats capacity</span>
                  <span className="font-mono font-black text-xl text-neutral-800">{activeSalesEvent.capacity - getEventTicketSalesQuantity(activeSalesEvent.id)} / {activeSalesEvent.capacity}</span>
                </div>
              </div>

              {/* Attendees List */}
              <div className="space-y-3.5">
                <h4 className="text-xs uppercase font-black tracking-widest text-[#E34718] border-b border-neutral-100 pb-2">Verified Ticket Holders list</h4>
                <div className="overflow-hidden border border-neutral-200 rounded-xl">
                  <table className="w-full text-left text-xs bg-white">
                    <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider border-b border-neutral-200 font-bold">
                      <tr>
                        <th className="py-2.5 px-4">Pass Holder Name</th>
                        <th className="py-2.5 px-4">Contact email</th>
                        <th className="py-2.5 px-4">Quantity Checked</th>
                        <th className="py-2.5 px-4 font-mono">Invoice Order No.</th>
                        <th className="py-2.5 px-4 text-right">Cleared Ledger Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-800">
                      {activeEventBookings.map((b) => {
                        const passUser = users.find(u => u.uid === b.userId);
                        return (
                          <tr key={b.id} className="hover:bg-neutral-50/40">
                            <td className="py-3 px-4 font-bold text-neutral-900">{passUser?.name || 'Gate Customer'}</td>
                            <td className="py-3 px-4 font-mono">{passUser?.email || 'N/A'}</td>
                            <td className="py-3 px-3.5 ml-2">{b.quantity} Tickets</td>
                            <td className="py-3 px-4 font-mono">{b.bookingNumber}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-[#E34718]">${b.amount}</td>
                          </tr>
                        );
                      })}
                      {activeEventBookings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-neutral-400 font-bold">No tickets have been reserved yet for this showcase live concert.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MAIN ORGANIZED SHOWS CATALOG LISTING */}
          {!isFormOpen && !selectedEventIdForSales && (
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-12 text-center shadow-3xs">
                  <Calendar className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                  <h3 className="font-display font-medium text-base text-neutral-900">No Showcase shows created yet by your team</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                    Begin publishing tickets for arena musical events, musicals, and special artist concert segments now.
                  </p>
                  <button 
                    onClick={handleOpenCreateForm}
                    className="mt-4 py-2.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all active:scale-95"
                  >
                    Propose First Showcase Concert
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map((evt) => {
                    const ticketSales = getEventTicketSalesQuantity(evt.id);
                    const revenue = getEventRevenue(evt.id);
                    
                    return (
                      <div 
                        key={evt.id} 
                        className="bg-white border border-neutral-200 hover:border-neutral-300 rounded-2xl p-5 shadow-3xs flex flex-col justify-between group transition-all text-left"
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                              evt.status === 'published' 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                            }`}>
                              {evt.status || 'draft'}
                            </span>
                            
                            <div className="flex gap-1.5 opacity-90">
                              <button 
                                onClick={() => handleOpenEditForm(evt)}
                                className="p-1 px-2.5 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-[10px] text-neutral-700 font-bold uppercase rounded-lg flex items-center gap-0.5 cursor-pointer shadow-3xs"
                                title="Edit specs"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteEvent(evt.id)}
                                className="p-1 px-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-650 rounded-lg flex items-center justify-center cursor-pointer shadow-3xs"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <img 
                              src={evt.bannerImage || evt.image} 
                              alt={evt.title}
                              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-neutral-205"
                            />
                            <div className="min-w-0">
                              <h4 className="font-display font-medium text-base text-neutral-900 group-hover:text-black block truncate uppercase leading-none">
                                {evt.title}
                              </h4>
                              <p className="text-[10px] text-neutral-450 mt-1.5 font-bold">{evt.venue} · Seating: {evt.capacity} Max</p>
                            </div>
                          </div>

                          {/* Stats report summary lines */}
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 font-bold">
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-neutral-400">Reserved passes</span>
                              <span className="text-neutral-900 font-mono mt-0.5 block">{ticketSales} tickets sold</span>
                            </div>
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-neutral-400">Total gross receipts</span>
                              <span className="text-[#E34718] font-mono mt-0.5 block">${revenue} gross USD</span>
                            </div>
                          </div>
                        </div>

                        {/* Action parameters footer */}
                        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-dashed border-neutral-100">
                          {evt.status === 'draft' && (
                            <button 
                              onClick={() => handlePublishEvent(evt.id)}
                              className="flex-1 py-2 px-3 bg-[#E34718] hover:bg-[#C23A12] text-white text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-transform active:scale-97"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Publish Tickets Live</span>
                            </button>
                          )}
                          
                          <button 
                            onClick={() => setSelectedEventIdForSales(evt.id)}
                            className="flex-1 py-1.5 px-3 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-[#09090b] text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Attendee Report ({ticketSales})</span>
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
