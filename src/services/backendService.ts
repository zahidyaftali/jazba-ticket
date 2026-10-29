import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  addDoc,
  getCountFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, accountEmail } from '../firebase';
import { EventItem } from '../types';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'organizer' | 'artist' | 'user';
  profileImage?: string;
  createdAt: string;
  status: 'active' | 'suspended';
  city?: string;
}

export interface OrganizerProfile {
  id?: string;
  userId: string;
  companyName: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  email: string;
  phone?: string;
  // Admin-managed page content — each hides its section when unset
  location?: string;
  specialties?: string[];
  featured?: boolean;
}

export interface ArtistProfile {
  id?: string;
  userId: string;
  stageName: string;
  bio?: string;
  profileImage?: string;
  coverImage?: string;
  genres?: string[];
  socialLinks?: Record<string, string>;
  category?: 'music' | 'theater' | 'sports' | 'conference' | 'exhibition';
  subCategory?: string;
  rating?: number;
  totalReviews?: number;
  hourlyRate?: number;
  location?: string;
  availableNow?: boolean;
  featured?: boolean;
  experienceYears?: number;
  recentShows?: string[];
  // Admin-managed structured show history for the artist profile page
  pastShows?: { title: string; date: string; venue: string }[];
  // Admin-managed hero stats — a stat is hidden on the page when unset
  eventsHosted?: number;
  totalAudience?: string; // free text, e.g. "12.4k"
}

export interface Booking {
  id?: string;
  bookingNumber: string;
  eventId: string;
  userId: string;
  ticketType: string;
  quantity: number;
  amount: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  bookingStatus: 'active' | 'cancelled' | 'completed';
  qrCode: string;
  createdAt: string;
  eventTitle?: string;
  eventImage?: string;
  eventDate?: string;

  // ---- Written by the Stripe checkout and/or the admin "Issue ticket" form.
  // All optional: older bookings may have none of them.
  orderId?: string;
  tier?: string;
  tierName?: string;
  seat?: string;
  barCode?: string;
  pricePaid?: number;
  bookingDate?: string;
  paymentMethod?: string;
  paymentRegion?: string;
  stripeTransactionId?: string;
  promoApplied?: boolean;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  /** Currency the price was agreed in (amount is always stored in USD). */
  currency?: string;
  /** The total in `currency`, e.g. 6000 for PKR 6,000. */
  amountLocal?: number;
  eventVenue?: string;
  eventTime?: string;
  /** 'admin' when issued from the admin portal; unset for online checkout. */
  source?: string;
  issuedBy?: string;
  note?: string;
  emailedAt?: string;
  emailedTo?: string;
}

export interface TicketPass {
  id?: string;
  ticketNumber: string;
  bookingId: string;
  userId: string;
  eventId: string;
  qrCode: string;
  status: 'active' | 'cancelled' | 'scanned';
  /** When the pass was checked in at the door. */
  scannedAt?: string;
}

export interface PaymentDetails {
  id?: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  provider: 'stripe' | 'easypaisa' | 'jazzcash' | 'paypal';
  transactionId: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export interface SystemNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalOrganizers: number;
  totalArtists: number;
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
}

// Global bootstrapped admin helper
export const BOOTSTRAP_ADMIN_EMAIL = 'zahidyaftali999@gmail.com';

export function isUserBootstrappedAdmin(email: string | null): boolean {
  return email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
}

/**
 * ----------------------------------------------------
 * USER PROFILE FUNCTIONS
 * ----------------------------------------------------
 */

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function createUserProfile(uid: string, profile: Partial<UserProfile>): Promise<UserProfile> {
  const path = `users/${uid}`;
  // A profile is only ever created by its own signed-in user, so the auth
  // account is the source of truth for the email and photo when the caller
  // didn't pass them (Google/Facebook sign-ins used to save a blank email).
  const self = auth.currentUser?.uid === uid ? auth.currentUser : null;
  const email = profile.email || accountEmail(self);
  const isBootAdmin = isUserBootstrappedAdmin(email || null);
  const userProfile: UserProfile = {
    uid,
    name: profile.name || 'Anonymous User',
    email,
    phone: profile.phone || '',
    role: isBootAdmin ? 'admin' : (profile.role as any || 'user'),
    profileImage: profile.profileImage || self?.photoURL || '',
    createdAt: profile.createdAt || new Date().toISOString(),
    status: profile.status || 'active',
    city: profile.city || 'London',
  };

  try {
    await setDoc(doc(db, 'users', uid), userProfile);
    return userProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateUserProfile(uid: string, update: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      ...update,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/** Fill in a signed-in user's blank email / photo from their auth account.
 *  Profiles created by Google/Facebook sign-in used to be saved without an
 *  email, so this repairs them the next time the member visits. */
export async function syncAccountProfile(user: {
  uid: string;
  email: string | null;
  photoURL: string | null;
  providerData?: { email: string | null }[];
}): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return;
    const data = snap.data() as UserProfile;
    const update: Partial<UserProfile> = {};
    const email = accountEmail(user);
    if (!data.email && email) update.email = email;
    if (!data.profileImage && user.photoURL && user.photoURL.length <= 512) update.profileImage = user.photoURL;
    if (Object.keys(update).length) await updateUserProfile(user.uid, update);
  } catch (err) {
    // Never block sign-in over a cosmetic profile repair.
    console.warn('syncAccountProfile skipped:', err);
  }
}

/**
 * ----------------------------------------------------
 * ORGANIZER PROFILE FUNCTIONS
 * ----------------------------------------------------
 */

export async function getOrganizerProfile(userId: string): Promise<OrganizerProfile | null> {
  const path = `organizers`;
  try {
    const q = query(collection(db, 'organizers'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      return { id: snap.docs[0].id, ...docData } as OrganizerProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
}

export async function createOrganizerProfile(profile: OrganizerProfile): Promise<OrganizerProfile> {
  const path = `organizers`;
  try {
    const docRef = doc(collection(db, 'organizers'));
    const cleanProfile = { ...profile, id: docRef.id };
    await setDoc(docRef, cleanProfile);
    return cleanProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateOrganizerProfile(id: string, update: Partial<OrganizerProfile>): Promise<void> {
  const path = `organizers/${id}`;
  try {
    await updateDoc(doc(db, 'organizers', id), update);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function getOrganizerById(id: string): Promise<OrganizerProfile | null> {
  const path = `organizers/${id}`;
  try {
    const snap = await getDoc(doc(db, 'organizers', id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as OrganizerProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function deleteOrganizerProfile(id: string): Promise<void> {
  const path = `organizers/${id}`;
  try {
    await deleteDoc(doc(db, 'organizers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * ----------------------------------------------------
 * ARTIST PROFILE FUNCTIONS
 * ----------------------------------------------------
 */

export async function getArtistProfile(userId: string): Promise<ArtistProfile | null> {
  const path = `artists`;
  try {
    const q = query(collection(db, 'artists'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      return { id: snap.docs[0].id, ...docData } as ArtistProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
}

export async function createArtistProfile(profile: ArtistProfile): Promise<ArtistProfile> {
  const path = `artists`;
  try {
    const docRef = doc(collection(db, 'artists'));
    const cleanProfile = { ...profile, id: docRef.id };
    await setDoc(docRef, cleanProfile);
    return cleanProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateArtistProfile(id: string, update: Partial<ArtistProfile>): Promise<void> {
  const path = `artists/${id}`;
  try {
    await updateDoc(doc(db, 'artists', id), update);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteArtistProfile(id: string): Promise<void> {
  const path = `artists/${id}`;
  try {
    await deleteDoc(doc(db, 'artists', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * ----------------------------------------------------
 * FOLLOW / SOCIAL GRAPH FUNCTIONS
 * ----------------------------------------------------
 */

export type FollowTargetType = 'artist' | 'organizer';

export interface FollowRecord {
  followerId: string;
  targetType: FollowTargetType;
  targetId: string;
  createdAt: string;
}

// Deterministic doc id keeps a user's follow of a given target a single document,
// so re-following after an unfollow can't create duplicate rows that inflate counts.
function followDocId(followerId: string, targetType: FollowTargetType, targetId: string): string {
  return `${followerId}_${targetType}_${targetId}`;
}

export async function followTarget(followerId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
  const id = followDocId(followerId, targetType, targetId);
  const path = `follows/${id}`;
  try {
    const record: FollowRecord = {
      followerId,
      targetType,
      targetId,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'follows', id), record);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function unfollowTarget(followerId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
  const id = followDocId(followerId, targetType, targetId);
  const path = `follows/${id}`;
  try {
    await deleteDoc(doc(db, 'follows', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function isFollowingTarget(followerId: string, targetType: FollowTargetType, targetId: string): Promise<boolean> {
  const id = followDocId(followerId, targetType, targetId);
  const path = `follows/${id}`;
  try {
    const snap = await getDoc(doc(db, 'follows', id));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return false;
  }
}

export async function getFollowerCount(targetType: FollowTargetType, targetId: string): Promise<number> {
  const path = `follows`;
  try {
    const q = query(collection(db, 'follows'), where('targetType', '==', targetType), where('targetId', '==', targetId));
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return 0;
  }
}

// Returns the set of targetIds a given user already follows for a target type,
// so a listing page can resolve "following" state for many items in one query.
export async function getFollowingIds(followerId: string, targetType: FollowTargetType): Promise<Set<string>> {
  const path = `follows`;
  try {
    const q = query(collection(db, 'follows'), where('followerId', '==', followerId), where('targetType', '==', targetType));
    const snap = await getDocs(q);
    const ids = new Set<string>();
    snap.forEach((d) => ids.add((d.data() as FollowRecord).targetId));
    return ids;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return new Set();
  }
}

/**
 * ----------------------------------------------------
 * BOOKING & SEATING FUNCTIONS
 * ----------------------------------------------------
 */

export async function getBookings(userId?: string): Promise<Booking[]> {
  const path = `bookings`;
  try {
    let q = query(collection(db, 'bookings'));
    if (userId) {
      q = query(collection(db, 'bookings'), where('userId', '==', userId));
    }
    const snap = await getDocs(q);
    const bookingsList: Booking[] = [];
    snap.forEach((d) => {
      bookingsList.push({ id: d.id, ...d.data() } as Booking);
    });
    return bookingsList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createBooking(booking: Booking): Promise<Booking> {
  const path = `bookings`;
  try {
    // Honour a caller-supplied id (e.g. the Stripe order id) so a repeat call
    // for the same order — a refreshed checkout-success page — targets the
    // same document instead of creating a duplicate booking. Firestore rules
    // only allow admins to update an existing booking, so a genuine repeat
    // write is safely rejected rather than silently duplicated.
    const docRef = booking.id ? doc(db, 'bookings', booking.id) : doc(collection(db, 'bookings'));
    const cleanBooking = { ...booking, id: docRef.id };
    await setDoc(docRef, cleanBooking);

    // Create a dynamic notification upon booking registration
    await createNotification({
      userId: booking.userId,
      title: 'Booking Confirmed!',
      message: `Your booking ${booking.bookingNumber} for event has processed successfully. View your scan-ready passes under Digital Passes.`,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Generate specific ticketing entries depending on quantity
    for (let i = 0; i < booking.quantity; i++) {
      await createTicket({
        ticketNumber: `${booking.bookingNumber}-T${i+1}`,
        bookingId: docRef.id,
        userId: booking.userId,
        eventId: booking.eventId,
        qrCode: `TICKET-${booking.bookingNumber}-${i+1}-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'active'
      });
    }

    // Trigger platform analytics update safely
    await updateAnalyticsAfterSale(booking.quantity, booking.amount);

    return cleanBooking;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * ----------------------------------------------------
 * TICKET MANAGES FUNCTIONS
 * ----------------------------------------------------
 */

export async function createTicket(ticket: TicketPass): Promise<TicketPass> {
  const path = `tickets`;
  try {
    const docRef = doc(collection(db, 'tickets'));
    const cleanTicket = { ...ticket, id: docRef.id };
    await setDoc(docRef, cleanTicket);
    return cleanTicket;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function getTickets(userId?: string): Promise<TicketPass[]> {
  const path = `tickets`;
  try {
    let q = query(collection(db, 'tickets'));
    if (userId) {
      q = query(collection(db, 'tickets'), where('userId', '==', userId));
    }
    const snap = await getDocs(q);
    const list: TicketPass[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as TicketPass);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateTicketStatus(id: string, status: 'active' | 'cancelled' | 'scanned'): Promise<void> {
  const path = `tickets/${id}`;
  try {
    await updateDoc(doc(db, 'tickets', id), {
      status,
      ...(status === 'scanned' ? { scannedAt: new Date().toISOString() } : {}),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function updateBookingStatus(
  id: string,
  update: { paymentStatus?: Booking['paymentStatus']; bookingStatus?: Booking['bookingStatus'] },
): Promise<void> {
  const path = `bookings/${id}`;
  try {
    await updateDoc(doc(db, 'bookings', id), update as Record<string, string>);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/** Admin: change any of a booking's fields (e.g. record when its ticket was emailed). */
export async function updateBookingDetails(id: string, update: Partial<Booking>): Promise<void> {
  const path = `bookings/${id}`;
  try {
    await updateDoc(doc(db, 'bookings', id), update as Record<string, any>);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export interface ManualTicketInput {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventImage: string;
  tier: string;
  tierName: string;
  quantity: number;
  /** Order total in USD (0 for complimentary tickets). */
  amountUsd: number;
  currency: string;
  amountLocal: number;
  paymentMethod: string;
  paymentStatus: Booking['paymentStatus'];
  seat: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  /** The registered account this client matches, or '' for a guest. */
  clientUid: string;
  note: string;
}

/** Admin: issue tickets directly from the portal (box office, guest list,
 *  bank transfers…). Writes the booking plus one admission pass per ticket,
 *  exactly like an online order, and returns the saved booking. */
export async function issueManualTicket(input: ManualTicketInput): Promise<Booking> {
  const orderId = `JZ-${Math.floor(100000 + Math.random() * 900000)}`;
  const barCode = `8${Math.floor(10000000000 + Math.random() * 90000000000)}`;
  const now = new Date();
  const booking: Booking = {
    id: orderId,
    bookingNumber: orderId,
    orderId,
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    eventDate: input.eventDate,
    eventTime: input.eventTime,
    eventVenue: input.eventVenue,
    eventImage: input.eventImage,
    userId: input.clientUid,
    ticketType: input.tier,
    tier: input.tier,
    tierName: input.tierName,
    quantity: input.quantity,
    amount: input.amountUsd,
    pricePaid: input.amountUsd,
    currency: input.currency,
    amountLocal: input.amountLocal,
    paymentStatus: input.paymentStatus,
    bookingStatus: 'active',
    paymentMethod: input.paymentMethod,
    qrCode: barCode,
    barCode,
    seat: input.seat,
    createdAt: now.toISOString(),
    bookingDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    billingName: input.clientName,
    billingEmail: input.clientEmail,
    billingPhone: input.clientPhone,
    promoApplied: false,
    source: 'admin',
    issuedBy: auth.currentUser?.email || '',
    note: input.note,
  };

  const path = `bookings/${orderId}`;
  try {
    await setDoc(doc(db, 'bookings', orderId), booking);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }

  for (let i = 0; i < input.quantity; i++) {
    await createTicket({
      ticketNumber: `${orderId}-T${i + 1}`,
      bookingId: orderId,
      userId: input.clientUid,
      eventId: input.eventId,
      qrCode: `TICKET-${orderId}-${i + 1}-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'active',
    });
  }

  // A registered client also sees it in their account's notifications.
  if (input.clientUid) {
    try {
      await createNotification({
        userId: input.clientUid,
        title: 'Tickets issued to you',
        message: `${input.quantity} × ${input.tierName} for ${input.eventTitle} (order ${orderId}). Find them under My tickets.`,
        read: false,
        createdAt: now.toISOString(),
      });
    } catch (err) {
      console.warn('Ticket notification skipped:', err);
    }
  }

  if (input.paymentStatus === 'paid') await updateAnalyticsAfterSale(input.quantity, input.amountUsd);
  return booking;
}

/**
 * ----------------------------------------------------
 * PAYMENT TRANSACTION LEDGER FUNCTIONS
 * ----------------------------------------------------
 */

export async function createPayment(payment: PaymentDetails): Promise<PaymentDetails> {
  const path = `payments`;
  try {
    const docRef = doc(collection(db, 'payments'));
    const cleanPayment = { ...payment, id: docRef.id };
    await setDoc(docRef, cleanPayment);
    return cleanPayment;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function getAllPayments(): Promise<PaymentDetails[]> {
  const path = `payments`;
  try {
    const snap = await getDocs(collection(db, 'payments'));
    const list: PaymentDetails[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as PaymentDetails);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * ----------------------------------------------------
 * NOTIFICATION BULLETINS FUNCTIONS
 * ----------------------------------------------------
 */

export async function createNotification(notification: SystemNotification): Promise<SystemNotification> {
  const path = `notifications`;
  try {
    const docRef = doc(collection(db, 'notifications'));
    const cleanNotification = { ...notification, id: docRef.id };
    await setDoc(docRef, cleanNotification);
    return cleanNotification;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function getNotifications(userId: string): Promise<SystemNotification[]> {
  const path = `notifications`;
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const res: SystemNotification[] = [];
    snap.forEach((d) => {
      res.push({ id: d.id, ...d.data() } as SystemNotification);
    });
    return res;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * ----------------------------------------------------
 * EVENT MANAGEMENT FUNCTIONS (ORGANIZERS & ADMINS)
 * ----------------------------------------------------
 */

// Fills in display fields (location, time, image, etc.) that the public-facing
// pages expect from EventItem, derived from the raw venue/city/startTime/bannerImage
// fields that the admin event form actually collects.
function normalizeEvent(raw: any): EventItem & Record<string, any> {
  const location = raw.location || [raw.venue, raw.city].filter(Boolean).join(', ') || 'Venue TBA';
  const time = raw.time || (raw.startTime && raw.endTime ? `${raw.startTime} to ${raw.endTime}` : (raw.startTime || 'Time TBA'));
  return {
    ...raw,
    location,
    time,
    image: raw.image || raw.bannerImage || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=crop',
    price: typeof raw.price === 'number' ? raw.price : 0,
    type: raw.type || 'upcoming',
    date: raw.date || 'TBA',
    fullDate: raw.fullDate || raw.date,
  };
}

export async function getEvents(): Promise<EventItem[]> {
  const path = `events`;
  try {
    const snap = await getDocs(collection(db, 'events'));
    const list: EventItem[] = [];
    snap.forEach((d) => {
      list.push(normalizeEvent({ id: d.id, ...d.data() }));
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Public-facing pages should only ever show events the organizer/admin marked published.
export async function getPublishedEvents(): Promise<EventItem[]> {
  const all = await getEvents();
  return all.filter((e: any) => e.status === 'published');
}

export async function createEvent(event: any): Promise<any> {
  const path = `events`;
  try {
    const docRef = doc(collection(db, 'events'));
    const cleanEvent = { ...event, id: docRef.id };
    await setDoc(docRef, cleanEvent);
    
    // Safely refresh analytics counters
    await updateAnalyticsCounter('totalEvents', 1);

    return cleanEvent;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateEvent(id: string, update: any): Promise<void> {
  const path = `events/${id}`;
  try {
    await updateDoc(doc(db, 'events', id), update);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const path = `events/${id}`;
  try {
    await deleteDoc(doc(db, 'events', id));
    await updateAnalyticsCounter('totalEvents', -1);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * ----------------------------------------------------
 * ADMIN MANAGEMENT PANEL FUNCTIONS
 * ----------------------------------------------------
 */

export async function getAllUsers(): Promise<UserProfile[]> {
  const path = `users`;
  try {
    const snap = await getDocs(collection(db, 'users'));
    const list: UserProfile[] = [];
    snap.forEach((d) => {
      list.push(d.data() as UserProfile);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateUserRoleAndStatus(uid: string, role: string, status: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), { role, status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/** Admin: save a member's email (recovered from their sign-in account). */
export async function adminSetUserEmail(uid: string, email: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), { email });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteUserAccount(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'users', uid));
    await updateAnalyticsCounter('totalUsers', -1);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function getAllOrganizers(): Promise<OrganizerProfile[]> {
  const path = `organizers`;
  try {
    const snap = await getDocs(collection(db, 'organizers'));
    const list: OrganizerProfile[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as OrganizerProfile);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAllArtists(): Promise<ArtistProfile[]> {
  const path = `artists`;
  try {
    const snap = await getDocs(collection(db, 'artists'));
    const list: ArtistProfile[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as ArtistProfile);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * ----------------------------------------------------
 * PLATFORM ANALYTICS AGGREGATIONS
 * ----------------------------------------------------
 */

// Live analytics — always computed from the real collections, never from the
// old seeded `analytics/overall` counter doc (which held demo numbers).
export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const path = `analytics (live counts)`;
  try {
    const [usersSnap, organizersSnap, artistsSnap, eventsSnap, bookingsSnap, ticketsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'organizers')),
      getDocs(collection(db, 'artists')),
      getDocs(collection(db, 'events')),
      getDocs(collection(db, 'bookings')),
      getDocs(collection(db, 'tickets')),
    ]);

    let totalRevenue = 0;
    let totalTicketsSold = 0;
    bookingsSnap.forEach((d) => {
      const b = d.data() as any;
      if (b.paymentStatus === 'paid') {
        totalRevenue += Number(b.amount ?? b.pricePaid) || 0;
        totalTicketsSold += Number(b.quantity) || 1;
      }
    });
    if (totalTicketsSold === 0) totalTicketsSold = ticketsSnap.size;

    return {
      totalUsers: usersSnap.size,
      totalOrganizers: organizersSnap.size,
      totalArtists: artistsSnap.size,
      totalEvents: eventsSnap.size,
      totalTicketsSold,
      totalRevenue,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return { totalUsers: 0, totalOrganizers: 0, totalArtists: 0, totalEvents: 0, totalTicketsSold: 0, totalRevenue: 0 };
  }
}

/** Admin cleanup: delete every document in one of the demo-data collections. */
export async function purgeCollection(
  name: 'events' | 'artists' | 'bookings' | 'payments' | 'tickets'
): Promise<number> {
  const path = name;
  try {
    const snap = await getDocs(collection(db, name));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, name, d.id));
    }
    return snap.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function updateAnalyticsCounter(field: keyof PlatformAnalytics, incrementValue: number): Promise<void> {
  const path = `analytics/overall`;
  try {
    const docRef = doc(db, 'analytics', 'overall');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const current = snap.data() as PlatformAnalytics;
      const updatedValue = (current[field] || 0) + incrementValue;
      await updateDoc(docRef, { [field]: updatedValue });
    }
  } catch (error) {
    console.error("Failed to update analytics counter field:", field, error);
  }
}

export async function updateAnalyticsAfterSale(quantitySold: number, revenue: number): Promise<void> {
  const path = `analytics/overall`;
  try {
    const docRef = doc(db, 'analytics', 'overall');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const current = snap.data() as PlatformAnalytics;
      await updateDoc(docRef, {
        totalTicketsSold: (current.totalTicketsSold || 0) + quantitySold,
        totalRevenue: (current.totalRevenue || 0) + revenue
      });
    }
  } catch (error) {
    console.error("Failed to update analytics after sale:", error);
  }
}
