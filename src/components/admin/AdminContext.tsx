import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  getAllUsers,
  getBookings,
  getEvents,
  getAllArtists,
  getAllOrganizers,
  getAllPayments,
  getTickets,
  UserProfile,
  Booking,
  ArtistProfile,
  OrganizerProfile,
  PaymentDetails,
  TicketPass,
} from "../../services/backendService";
import { getWordPressEvents } from "../../services/wordpressEventsService";
import { EventItem, getEventTimestamp, isPastEvent, tierDisplayName, withEventSlugs } from "../../types";
import { auth, accountEmail } from "../../firebase";
import type { TicketPrintData } from "../TicketPrintSheet";
import { money } from "./ui";

// ── Types ──────────────────────────────────────────────────────────────────

export type AdminEvent = EventItem & { [key: string]: any; source: "site" | "wordpress" };

export interface AdminRoute {
  /** First path segment after /admin, e.g. "tickets" (default "dashboard"). */
  section: string;
  /** Second segment, e.g. "new", "upcoming", "edit". */
  sub: string;
  /** Third segment, e.g. the id after /edit/. */
  id: string;
  query: URLSearchParams;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  uid: string;
  registered: boolean;
  photo?: string;
}

/** Everything known about one event, from the event itself or (when the
 *  event was deleted) from the details copied onto the booking. */
export interface EventInfo {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  image: string;
  category: string;
  /** null when the date is unknown. */
  timestamp: number | null;
  upcoming: boolean;
  event?: AdminEvent;
}

/** A person who holds (or could hold) tickets: a registered member and/or
 *  someone who bought or was issued a ticket as a guest. */
export interface Client {
  key: string;
  name: string;
  email: string;
  phone: string;
  uid: string;
  registered: boolean;
  photo?: string;
  role?: string;
  orders: Booking[];
  tickets: number;
  spentUsd: number;
  lastOrderAt: string;
}

export interface AdminData {
  users: UserProfile[];
  bookings: Booking[];
  events: AdminEvent[];
  wpEvents: AdminEvent[];
  artists: ArtistProfile[];
  organizers: OrganizerProfile[];
  payments: PaymentDetails[];
  tickets: TicketPass[];
}

interface Toast {
  id: number;
  kind: "success" | "error";
  msg: string;
}

interface AdminCtx {
  data: AdminData;
  loading: boolean;
  refreshing: boolean;
  wpLoading: boolean;
  reload: () => Promise<void>;

  route: AdminRoute;
  navigate: (to: string) => void;

  /** Site + WordPress events, with readable slugs. */
  allEvents: AdminEvent[];
  eventById: (id: string) => AdminEvent | undefined;
  eventInfo: (eventId: string, booking?: Booking) => EventInfo;
  userById: (uid: string) => UserProfile | undefined;
  /** A member's email: their profile's, else the one on their orders. */
  userEmail: (u: UserProfile) => { email: string; fromOrders: boolean };
  customerFor: (b: Booking) => Customer;
  bookingById: (id: string) => Booking | undefined;
  passesFor: (bookingId: string) => TicketPass[];
  tierName: (b: Booking) => string;
  amountLabel: (b: Booking) => string;
  clients: Client[];
  analytics: { totalRevenue: number; totalTicketsSold: number; paidOrders: number };

  admin: { uid: string; name: string; email: string; photo: string };
  onLogout: () => void;

  notify: (msg: string) => void;
  fail: (msg: string) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;

  openBooking: (id: string) => void;
  closeBooking: () => void;
  openBookingId: string | null;

  printTicket: (data: TicketPrintData) => void;
  printData: TicketPrintData | null;
  ticketDataFor: (b: Booking) => TicketPrintData;
}

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

// ── Routing (/admin/<section>/<sub>/<id>) ─────────────────────────────────

function parseRoute(): AdminRoute {
  const parts = window.location.pathname
    .replace(/^\/admin\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  return {
    section: parts[0] || "dashboard",
    sub: parts[1] || "",
    id: parts[2] || "",
    query: new URLSearchParams(window.location.search),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const EMPTY: AdminData = {
  users: [],
  bookings: [],
  events: [],
  wpEvents: [],
  artists: [],
  organizers: [],
  payments: [],
  tickets: [],
};

export function eventDateLabel(e?: EventItem): string {
  if (!e) return "";
  if (e.fullDate && e.fullDate !== e.date) return e.fullDate;
  return [e.date, e.year].filter(Boolean).join(" ") || "Date TBA";
}

export function eventVenueLabel(e?: EventItem & Record<string, any>): string {
  if (!e) return "";
  return e.venue ? [e.venue, e.city].filter(Boolean).join(", ") : e.location || "";
}

/** Stripe saves "Guest" when the buyer gave no name — treat that as blank. */
const realName = (n?: string) => (n && n.trim() && n.trim() !== "Guest" ? n.trim() : "");

// ── Provider ───────────────────────────────────────────────────────────────

export function AdminProvider({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const [data, setData] = useState<AdminData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wpLoading, setWpLoading] = useState(true);
  const [route, setRoute] = useState<AdminRoute>(parseRoute);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [printData, setPrintData] = useState<TicketPrintData | null>(null);
  const firstLoad = useRef(true);
  const toastSeq = useRef(0);

  // ---- toasts
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const pushToast = useCallback(
    (kind: Toast["kind"], msg: string) => {
      const id = ++toastSeq.current;
      setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
      setTimeout(() => dismissToast(id), kind === "error" ? 9000 : 4000);
    },
    [dismissToast],
  );
  const notify = useCallback((msg: string) => pushToast("success", msg), [pushToast]);
  const fail = useCallback((msg: string) => pushToast("error", msg), [pushToast]);

  // ---- data
  const loadWordPress = useCallback(async () => {
    setWpLoading(true);
    const wp = await getWordPressEvents();
    setData((d) => ({ ...d, wpEvents: wp.map((e) => ({ ...e, source: "wordpress" as const })) }));
    setWpLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (firstLoad.current) setLoading(true);
    else setRefreshing(true);
    try {
      const [users, bookings, events, artists, organizers, payments, tickets] = await Promise.all([
        getAllUsers(),
        getBookings(),
        getEvents(),
        getAllArtists(),
        getAllOrganizers(),
        getAllPayments(),
        getTickets(),
      ]);
      setData((d) => ({
        ...d,
        users,
        bookings,
        events: events.map((e) => ({ ...(e as any), source: "site" as const })),
        artists,
        organizers,
        payments,
        tickets,
      }));
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to load dashboard data. Please try again.");
    } finally {
      firstLoad.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [pushToast]);

  useEffect(() => {
    reload();
    loadWordPress();
  }, [reload, loadWordPress]);

  // ---- routing
  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname + window.location.search) {
      window.history.pushState({}, "", to);
    }
    setRoute(parseRoute());
    window.scrollTo({ top: 0 });
  }, []);

  // ---- printing: mount the print sheet, print, unmount
  const printTicket = useCallback((d: TicketPrintData) => {
    setPrintData(d);
    setTimeout(() => window.print(), 80);
  }, []);
  useEffect(() => {
    const done = () => setPrintData(null);
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  // ---- lookups
  const allEvents = useMemo(
    () => withEventSlugs([...data.wpEvents, ...data.events]) as AdminEvent[],
    [data.wpEvents, data.events],
  );
  const eventMap = useMemo(() => new Map(allEvents.map((e) => [e.id, e])), [allEvents]);
  const userMap = useMemo(() => new Map(data.users.map((u) => [u.uid, u])), [data.users]);
  const bookingMap = useMemo(() => new Map(data.bookings.map((b) => [b.id || "", b])), [data.bookings]);
  const passMap = useMemo(() => {
    const m = new Map<string, TicketPass[]>();
    for (const t of data.tickets) {
      const list = m.get(t.bookingId) || [];
      list.push(t);
      m.set(t.bookingId, list);
    }
    for (const list of m.values()) list.sort((a, b) => a.ticketNumber.localeCompare(b.ticketNumber, undefined, { numeric: true }));
    return m;
  }, [data.tickets]);

  // The email on a member's orders — used when their profile has none.
  const orderEmailByUid = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of data.bookings) {
      if (b.userId && b.billingEmail && !m.has(b.userId)) m.set(b.userId, b.billingEmail);
    }
    return m;
  }, [data.bookings]);

  const eventById = useCallback((id: string) => eventMap.get(id), [eventMap]);
  const userById = useCallback((uid: string) => userMap.get(uid), [userMap]);
  const bookingById = useCallback((id: string) => bookingMap.get(id), [bookingMap]);
  const passesFor = useCallback((id: string) => passMap.get(id) || [], [passMap]);

  const userEmail = useCallback(
    (u: UserProfile) => {
      if (u.email) return { email: u.email, fromOrders: false };
      const fromOrders = orderEmailByUid.get(u.uid) || "";
      return { email: fromOrders, fromOrders: !!fromOrders };
    },
    [orderEmailByUid],
  );

  const customerFor = useCallback(
    (b: Booking): Customer => {
      const u = b.userId ? userMap.get(b.userId) : undefined;
      const email = b.billingEmail || u?.email || (b.userId ? orderEmailByUid.get(b.userId) : "") || "";
      const name = realName(b.billingName) || realName(u?.name) || (email ? email.split("@")[0] : "") || "Unknown customer";
      return {
        name,
        email,
        phone: b.billingPhone || u?.phone || "",
        uid: b.userId || "",
        registered: !!u,
        photo: u?.profileImage,
      };
    },
    [userMap, orderEmailByUid],
  );

  const eventInfo = useCallback(
    (eventId: string, b?: Booking): EventInfo => {
      const e = eventMap.get(eventId);
      if (e) {
        const ts = getEventTimestamp(e);
        return {
          id: eventId,
          title: e.title,
          date: eventDateLabel(e),
          time: e.time || "",
          venue: eventVenueLabel(e),
          image: e.image || e.bannerImage || "",
          category: e.category || "",
          timestamp: ts,
          upcoming: !isPastEvent(e),
          event: e,
        };
      }
      return {
        id: eventId,
        title: b?.eventTitle || (eventId ? `Removed event (${eventId})` : "Unknown event"),
        date: b?.eventDate || "",
        time: b?.eventTime || "",
        venue: b?.eventVenue || "",
        image: b?.eventImage || "",
        category: "",
        timestamp: null,
        upcoming: false,
      };
    },
    [eventMap],
  );

  const tierName = useCallback(
    (b: Booking) => b.tierName || tierDisplayName(b.tier || b.ticketType || "general", eventMap.get(b.eventId)),
    [eventMap],
  );

  const amountLabel = useCallback((b: Booking) => {
    if (b.paymentMethod === "complimentary") return "Complimentary";
    if (b.currency && b.currency !== "USD" && typeof b.amountLocal === "number") return money(b.amountLocal, b.currency);
    return money(Number(b.amount ?? b.pricePaid) || 0);
  }, []);

  const ticketDataFor = useCallback(
    (b: Booking): TicketPrintData => {
      const info = eventInfo(b.eventId, b);
      const c = customerFor(b);
      const orderId = b.orderId || b.bookingNumber || b.id || "";
      return {
        eventTitle: info.title,
        category: info.category,
        date: info.date || "Date TBA",
        time: info.time,
        venue: info.venue,
        holderName: c.name,
        holderEmail: c.email,
        orderId,
        seat: b.seat,
        quantity: b.quantity || 1,
        tier: b.tier || b.ticketType || "general",
        tierName: tierName(b),
        code: orderId,
      };
    },
    [eventInfo, customerFor, tierName],
  );

  const clients = useMemo(() => {
    const map = new Map<string, Client>();
    const keyFor = (email: string, uid: string) => (email ? email.toLowerCase() : `uid:${uid}`);

    for (const u of data.users) {
      const { email } = userEmail(u);
      const key = keyFor(email, u.uid);
      map.set(key, {
        key,
        name: realName(u.name) || (email ? email.split("@")[0] : "Member"),
        email,
        phone: u.phone || "",
        uid: u.uid,
        registered: true,
        photo: u.profileImage,
        role: u.role,
        orders: [],
        tickets: 0,
        spentUsd: 0,
        lastOrderAt: "",
      });
    }
    // Members are also findable by uid, so their orders land on them.
    const byUid = new Map<string, Client>();
    for (const c of map.values()) if (c.uid) byUid.set(c.uid, c);

    for (const b of data.bookings) {
      const cust = customerFor(b);
      let client = (b.userId && byUid.get(b.userId)) || map.get(keyFor(cust.email, b.userId || b.id || ""));
      if (!client) {
        const key = keyFor(cust.email, b.userId || b.id || "");
        client = {
          key,
          name: cust.name,
          email: cust.email,
          phone: cust.phone,
          uid: "",
          registered: false,
          orders: [],
          tickets: 0,
          spentUsd: 0,
          lastOrderAt: "",
        };
        map.set(key, client);
      }
      client.orders.push(b);
      if (b.bookingStatus !== "cancelled") client.tickets += Number(b.quantity) || 1;
      if (b.paymentStatus === "paid") client.spentUsd += Number(b.amount ?? b.pricePaid) || 0;
      if (!client.phone && cust.phone) client.phone = cust.phone;
      if ((b.createdAt || "") > client.lastOrderAt) client.lastOrderAt = b.createdAt || "";
    }
    return [...map.values()].sort(
      (a, b) => (b.lastOrderAt || "").localeCompare(a.lastOrderAt || "") || a.name.localeCompare(b.name),
    );
  }, [data.users, data.bookings, userEmail, customerFor]);

  const analytics = useMemo(() => {
    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let paidOrders = 0;
    for (const b of data.bookings) {
      if (b.paymentStatus === "paid") {
        paidOrders++;
        totalRevenue += Number(b.amount ?? b.pricePaid) || 0;
        totalTicketsSold += Number(b.quantity) || 1;
      }
    }
    if (totalTicketsSold === 0) totalTicketsSold = data.tickets.length;
    return { totalRevenue, totalTicketsSold, paidOrders };
  }, [data.bookings, data.tickets]);

  const me = auth.currentUser;
  const myProfile = me ? userMap.get(me.uid) : undefined;
  const admin = {
    uid: me?.uid || "",
    name: realName(myProfile?.name) || me?.displayName || accountEmail(me).split("@")[0] || "Admin",
    email: accountEmail(me),
    photo: myProfile?.profileImage || me?.photoURL || "",
  };

  const value: AdminCtx = {
    data,
    loading,
    refreshing,
    wpLoading,
    reload,
    route,
    navigate,
    allEvents,
    eventById,
    eventInfo,
    userById,
    userEmail,
    customerFor,
    bookingById,
    passesFor,
    tierName,
    amountLabel,
    clients,
    analytics,
    admin,
    onLogout,
    notify,
    fail,
    toasts,
    dismissToast,
    openBooking: setOpenBookingId,
    closeBooking: () => setOpenBookingId(null),
    openBookingId,
    printTicket,
    printData,
    ticketDataFor,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** "Google" / "Facebook" when a member's photo shows how they signed up. */
export function signInMethod(u: UserProfile): "Google" | "Facebook" | null {
  const img = u.profileImage || "";
  if (/googleusercontent\.com/i.test(img)) return "Google";
  if (/fbcdn\.net|facebook\.com|fbsbx\.com/i.test(img)) return "Facebook";
  return null;
}

/** Bookings newest first. */
export function byNewest(a: Booking, b: Booking): number {
  return (b.createdAt || "").localeCompare(a.createdAt || "");
}
