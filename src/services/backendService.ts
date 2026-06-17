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
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
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
}

export interface TicketPass {
  id?: string;
  ticketNumber: string;
  bookingId: string;
  userId: string;
  eventId: string;
  qrCode: string;
  status: 'active' | 'cancelled' | 'scanned';
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
  const isBootAdmin = isUserBootstrappedAdmin(profile.email || null);
  const userProfile: UserProfile = {
    uid,
    name: profile.name || 'Anonymous User',
    email: profile.email || '',
    phone: profile.phone || '',
    role: isBootAdmin ? 'admin' : (profile.role as any || 'user'),
    profileImage: profile.profileImage || '',
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
    const docRef = doc(collection(db, 'bookings'));
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
    await updateDoc(doc(db, 'tickets', id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
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

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const path = `analytics/overall`;
  try {
    const docRef = doc(db, 'analytics', 'overall');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PlatformAnalytics;
    } else {
      const defaultAnalytics: PlatformAnalytics = {
        totalUsers: 154,
        totalOrganizers: 12,
        totalArtists: 28,
        totalEvents: 6,
        totalTicketsSold: 284,
        totalRevenue: 24850
      };
      await setDoc(docRef, defaultAnalytics);
      return defaultAnalytics;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return {
      totalUsers: 154,
      totalOrganizers: 12,
      totalArtists: 28,
      totalEvents: 6,
      totalTicketsSold: 284,
      totalRevenue: 24850
    };
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
