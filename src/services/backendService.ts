// Data service for the custom /api backend (Neon Postgres + Express on Vercel).
// Function names, parameters, and return shapes are kept identical to the old
// Firestore implementation so no page component needed to change.
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './apiClient';
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
  // Admin-managed structured show history for the artist profile page
  pastShows?: { title: string; date: string; venue: string }[];
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

export const BOOTSTRAP_ADMIN_EMAIL = 'zahidyaftali999@gmail.com';

export function isUserBootstrappedAdmin(email: string | null): boolean {
  return !!email && email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
}

/**
 * ----------------------------------------------------
 * USER PROFILE FUNCTIONS
 * ----------------------------------------------------
 */

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const { user } = await apiGet(`/api/users/${uid}`);
    return user as UserProfile;
  } catch {
    return null;
  }
}

export async function createUserProfile(uid: string, profile: Partial<UserProfile>): Promise<UserProfile> {
  const { user } = await apiPut(`/api/users/${uid}`, profile);
  return user as UserProfile;
}

export async function updateUserProfile(uid: string, update: Partial<UserProfile>): Promise<void> {
  await apiPut(`/api/users/${uid}`, update);
}

/**
 * ----------------------------------------------------
 * ORGANIZER PROFILE FUNCTIONS
 * ----------------------------------------------------
 */

export async function getOrganizerProfile(userId: string): Promise<OrganizerProfile | null> {
  try {
    const { organizer } = await apiGet(`/api/organizers/by-user/${userId}`);
    return (organizer as OrganizerProfile) || null;
  } catch {
    return null;
  }
}

export async function createOrganizerProfile(profile: OrganizerProfile): Promise<OrganizerProfile> {
  const { organizer } = await apiPost('/api/organizers', profile);
  return organizer as OrganizerProfile;
}

export async function updateOrganizerProfile(id: string, update: Partial<OrganizerProfile>): Promise<void> {
  await apiPatch(`/api/organizers/${id}`, update);
}

/**
 * ----------------------------------------------------
 * ARTIST PROFILE FUNCTIONS
 * ----------------------------------------------------
 */

export async function getArtistProfile(userId: string): Promise<ArtistProfile | null> {
  try {
    const { artist } = await apiGet(`/api/artists/by-user/${userId}`);
    return (artist as ArtistProfile) || null;
  } catch {
    return null;
  }
}

export async function createArtistProfile(profile: ArtistProfile): Promise<ArtistProfile> {
  const { artist } = await apiPost('/api/artists', profile);
  return artist as ArtistProfile;
}

export async function updateArtistProfile(id: string, update: Partial<ArtistProfile>): Promise<void> {
  await apiPatch(`/api/artists/${id}`, update);
}

export async function deleteArtistProfile(id: string): Promise<void> {
  await apiDelete(`/api/artists/${id}`);
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

export async function followTarget(_followerId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
  await apiPost('/api/follows', { targetType, targetId });
}

export async function unfollowTarget(_followerId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
  await apiDelete(`/api/follows/${targetType}/${targetId}`);
}

export async function isFollowingTarget(_followerId: string, targetType: FollowTargetType, targetId: string): Promise<boolean> {
  try {
    const { following } = await apiGet(`/api/follows/status?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`);
    return !!following;
  } catch {
    return false;
  }
}

export async function getFollowerCount(targetType: FollowTargetType, targetId: string): Promise<number> {
  try {
    const { count } = await apiGet(`/api/follows/count?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getFollowingIds(_followerId: string, targetType: FollowTargetType): Promise<Set<string>> {
  try {
    const { ids } = await apiGet(`/api/follows/mine?targetType=${encodeURIComponent(targetType)}`);
    return new Set<string>(ids || []);
  } catch {
    return new Set<string>();
  }
}

/**
 * ----------------------------------------------------
 * BOOKING FUNCTIONS
 * ----------------------------------------------------
 */

export async function getBookings(_userId?: string): Promise<Booking[]> {
  // The server scopes results by token: admins get all bookings, users get their own.
  try {
    const { bookings } = await apiGet('/api/bookings');
    return bookings as Booking[];
  } catch {
    return [];
  }
}

export async function createBooking(booking: Booking): Promise<Booking> {
  const { booking: created } = await apiPost('/api/bookings', booking);
  return created as Booking;
}

export async function updateBookingStatus(
  id: string,
  update: { paymentStatus?: Booking['paymentStatus']; bookingStatus?: Booking['bookingStatus'] },
): Promise<void> {
  await apiPatch(`/api/bookings/${id}`, update);
}

/**
 * ----------------------------------------------------
 * TICKET FUNCTIONS
 * ----------------------------------------------------
 */

export async function createTicket(ticket: TicketPass): Promise<TicketPass> {
  const { ticket: created } = await apiPost('/api/tickets', ticket);
  return created as TicketPass;
}

export async function getTickets(_userId?: string): Promise<TicketPass[]> {
  try {
    const { tickets } = await apiGet('/api/tickets');
    return tickets as TicketPass[];
  } catch {
    return [];
  }
}

export async function updateTicketStatus(id: string, status: 'active' | 'cancelled' | 'scanned'): Promise<void> {
  await apiPatch(`/api/tickets/${id}/status`, { status });
}

/**
 * ----------------------------------------------------
 * PAYMENT FUNCTIONS
 * ----------------------------------------------------
 */

export async function createPayment(payment: PaymentDetails): Promise<PaymentDetails> {
  const { payment: created } = await apiPost('/api/payments', payment);
  return created as PaymentDetails;
}

export async function getAllPayments(): Promise<PaymentDetails[]> {
  try {
    const { payments } = await apiGet('/api/payments');
    return payments as PaymentDetails[];
  } catch {
    return [];
  }
}

/** Creates a real Stripe PaymentIntent server-side and returns its client secret. */
export async function createStripePaymentIntent(amount: number, currency: string): Promise<string> {
  const { clientSecret } = await apiPost('/api/payments/create-intent', { amount, currency });
  return clientSecret as string;
}

/**
 * ----------------------------------------------------
 * NOTIFICATION FUNCTIONS
 * ----------------------------------------------------
 */

export async function createNotification(notification: SystemNotification): Promise<SystemNotification> {
  const { notification: created } = await apiPost('/api/notifications', notification);
  return created as SystemNotification;
}

export async function getNotifications(_userId: string): Promise<SystemNotification[]> {
  try {
    const { notifications } = await apiGet('/api/notifications');
    return notifications as SystemNotification[];
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch(`/api/notifications/${id}/read`);
}

/**
 * ----------------------------------------------------
 * EVENT FUNCTIONS
 * ----------------------------------------------------
 */

export async function getEvents(): Promise<EventItem[]> {
  try {
    const { events } = await apiGet('/api/events');
    return events as EventItem[];
  } catch {
    return [];
  }
}

// Public-facing pages should only ever show events the organizer/admin marked published.
export async function getPublishedEvents(): Promise<EventItem[]> {
  const events = await getEvents();
  return events.filter((e: any) => e.status === 'published');
}

export async function createEvent(event: any): Promise<any> {
  const { event: created } = await apiPost('/api/events', event);
  return created;
}

export async function updateEvent(id: string, update: any): Promise<void> {
  await apiPatch(`/api/events/${id}`, update);
}

export async function deleteEvent(id: string): Promise<void> {
  await apiDelete(`/api/events/${id}`);
}

/**
 * ----------------------------------------------------
 * ADMIN FUNCTIONS
 * ----------------------------------------------------
 */

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const { users } = await apiGet('/api/users');
    return users as UserProfile[];
  } catch {
    return [];
  }
}

export async function updateUserRoleAndStatus(uid: string, role: string, status: string): Promise<void> {
  await apiPatch(`/api/users/${uid}/role-status`, { role, status });
}

export async function deleteUserAccount(uid: string): Promise<void> {
  await apiDelete(`/api/users/${uid}`);
}

export async function getAllOrganizers(): Promise<OrganizerProfile[]> {
  try {
    const { organizers } = await apiGet('/api/organizers');
    return organizers as OrganizerProfile[];
  } catch {
    return [];
  }
}

export async function getAllArtists(): Promise<ArtistProfile[]> {
  try {
    const { artists } = await apiGet('/api/artists');
    return artists as ArtistProfile[];
  } catch {
    return [];
  }
}

/**
 * ----------------------------------------------------
 * ANALYTICS FUNCTIONS
 * ----------------------------------------------------
 */

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  try {
    const { analytics } = await apiGet('/api/analytics');
    return analytics as PlatformAnalytics;
  } catch {
    return { totalUsers: 0, totalOrganizers: 0, totalArtists: 0, totalEvents: 0, totalTicketsSold: 0, totalRevenue: 0 };
  }
}

// Analytics are now computed live from the database on the server,
// so the old Firestore counter writes are intentionally no-ops.
export async function updateAnalyticsCounter(_field: keyof PlatformAnalytics, _incrementValue: number): Promise<void> {
  return;
}

export async function updateAnalyticsAfterSale(_quantitySold: number, _revenue: number): Promise<void> {
  return;
}
