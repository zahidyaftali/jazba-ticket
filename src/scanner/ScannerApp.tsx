import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Download,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Minus,
  Plus,
  SearchX,
  Share,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { accountEmail, auth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from '../firebase';
import { getEvents, getUserProfile, isUserBootstrappedAdmin, type Booking, type TicketPass } from '../services/backendService';
import { getWordPressEvents } from '../services/wordpressEventsService';
import { getEventTimestamp, ticketSeat, tierDisplayName, type EventItem } from '../types';
import { money } from '../components/admin/ui';
import brandMark from '../../assets/images/Favicon.png';
import { QrCamera } from './QrCamera';
import { CheckInConflict, checkInPasses, checkInWithoutPasses, cleanCode, lookupCode, watchEventCheckIns, type EventCheckIns, type OrderLookup } from './checkIn';
import { feedback, isSoundOn, setSoundOn, unlockAudio, useInstallPrompt, useScannerKeyboard, type Feedback } from './feedback';

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';
const SAFE_TOP = { paddingTop: 'env(safe-area-inset-top)' } as const;
const SAFE_BOTTOM = { paddingBottom: 'max(14px, env(safe-area-inset-bottom))' } as const;

function load(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}
function save(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // fine: the choice just isn't remembered
  }
}

// ── App: sign-in gate ─────────────────────────────────────────────────────

type Stage = 'checking' | 'signed-out' | 'denied' | 'ready';

export default function ScannerApp() {
  const [stage, setStage] = useState<Stage>('checking');
  const [user, setUser] = useState<User | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) {
          setUser(null);
          setStage((s) => (s === 'denied' ? 'denied' : 'signed-out'));
          return;
        }
        try {
          const profile = await getUserProfile(u.uid);
          if (isUserBootstrappedAdmin(accountEmail(u)) || profile?.role === 'admin') {
            setUser(u);
            setStage('ready');
            return;
          }
        } catch (err) {
          console.error('Scanner role check failed:', err);
        }
        await signOut(auth);
        setStage('denied');
      }),
    [],
  );

  // Phones only allow sound after the first tap.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  if (stage === 'checking') {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-[#ffed00] animate-spin" />
      </div>
    );
  }
  if (stage !== 'ready' || !user) return <SignIn denied={stage === 'denied'} />;
  return <Scanner user={user} />;
}

function SignIn({ denied }: { denied: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      const code = err?.code || '';
      setError(
        code === 'auth/network-request-failed'
          ? 'No internet connection. Connect and try again.'
          : code === 'auth/too-many-requests'
            ? 'Too many attempts. Wait a minute and try again.'
            : 'Wrong email or password.',
      );
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col" style={SAFE_TOP}>
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-sm w-full mx-auto">
        <img src={brandMark} alt="" className="w-14 h-14 object-contain" />
        <h1 className="font-display font-extrabold text-3xl leading-none mt-6">Jazba Scan</h1>
        <p className="text-white/60 text-sm mt-2">Ticket check-in at the door. Sign in with your Jazba Tickets admin account.</p>

        {(denied || error) && (
          <div className="mt-6 bg-[#2a1212] border-l-4 border-[#ef4444] px-3 py-3 text-sm font-bold flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#ef4444]" />
            <span>{error || 'That account is not an admin, so it can’t check tickets in.'}</span>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className={`${overline} text-white/50 flex items-center gap-1.5 mb-2`}>
              <Mail className="w-3.5 h-3.5" /> Email
            </span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#161616] border border-white/15 px-3 py-3.5 text-base text-white outline-none focus:border-[#ffed00]"
            />
          </label>
          <label className="block">
            <span className={`${overline} text-white/50 flex items-center gap-1.5 mb-2`}>
              <Lock className="w-3.5 h-3.5" /> Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#161616] border border-white/15 px-3 py-3.5 text-base text-white outline-none focus:border-[#ffed00]"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-[#ffed00] text-black font-bold py-4 text-base cursor-pointer disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
          </button>
        </form>
      </div>
      <div className="px-6 max-w-sm w-full mx-auto" style={SAFE_BOTTOM}>
        <InstallTip />
      </div>
    </div>
  );
}

/** "Install this app" — Chrome's own prompt, or how to do it on an iPhone. */
function InstallTip() {
  const { installed, canPrompt, install, ios } = useInstallPrompt();
  const [hidden, setHidden] = useState(() => load('jazba-scan-install-tip') === 'hidden');
  if (installed || hidden) return null;
  const close = () => {
    save('jazba-scan-install-tip', 'hidden');
    setHidden(true);
  };
  return (
    <div className="bg-[#141414] border border-white/10 p-4 flex items-start gap-3 text-sm">
      <Download className="w-5 h-5 text-[#ffed00] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-bold">Install Jazba Scan on this phone</p>
        {canPrompt ? (
          <button type="button" onClick={install} className="mt-3 bg-[#ffed00] text-black font-bold px-4 py-2.5 cursor-pointer">
            Install app
          </button>
        ) : ios ? (
          <p className="text-white/60 mt-1 leading-relaxed">
            In Safari, tap <Share className="w-4 h-4 inline -mt-1" /> Share, then <b className="text-white">Add to Home Screen</b>.
          </p>
        ) : (
          <p className="text-white/60 mt-1 leading-relaxed">
            Open the browser menu (⋮) and tap <b className="text-white">Install app</b> or <b className="text-white">Add to Home screen</b>.
          </p>
        )}
      </div>
      <button type="button" onClick={close} aria-label="Hide" className="text-white/40 cursor-pointer p-1 -m-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── What a scan found ─────────────────────────────────────────────────────

type Verdict = 'valid' | 'partial' | 'unpaid' | 'used' | 'cancelled' | 'wrong-event' | 'not-found' | 'error';
const CAN_ADMIT: Verdict[] = ['valid', 'partial', 'unpaid'];

interface ScanView {
  code: string;
  verdict: Verdict;
  /** Why it can't be admitted, or what to watch out for. */
  reason: string;
  booking: Booking | null;
  passes: TicketPass[];
  /** Passes not used yet. */
  open: TicketPass[];
  /** The order has no passes saved; checking in creates them. */
  noPasses: boolean;
  holder: { name: string; email: string; phone: string };
  event: { title: string; when: string; venue: string };
  tier: string;
  /** People per ticket: 4 on a "Group of 4" ticket, else 1. */
  perTicket: number;
  seat: string;
  payment: string;
}

const realName = (n?: string) => (n && n.trim() && n.trim() !== 'Guest' ? n.trim() : '');

function eventWhen(e: EventItem | undefined, b: Booking | null): string {
  const date = e ? (e.fullDate && e.fullDate !== e.date ? e.fullDate : [e.date, e.year].filter(Boolean).join(' ')) : b?.eventDate || '';
  const time = e?.time || b?.eventTime || '';
  return [date, time].filter(Boolean).join(' · ');
}

function eventVenue(e: (EventItem & Record<string, any>) | undefined, b: Booking | null): string {
  if (e) return e.venue ? [e.venue, e.city].filter(Boolean).join(', ') : e.location || '';
  return b?.eventVenue || '';
}

const METHOD: Record<string, string> = {
  stripe: 'card, online',
  cash: 'cash',
  'bank-transfer': 'bank transfer',
  'card-in-person': 'card, in person',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
};

function paymentLabel(b: Booking): string {
  if (b.paymentMethod === 'complimentary') return 'Complimentary';
  if (b.paymentStatus !== 'paid') return b.paymentStatus === 'failed' ? 'Payment failed' : 'Not paid yet';
  const amount = b.currency && b.currency !== 'USD' && typeof b.amountLocal === 'number' ? money(b.amountLocal, b.currency) : '';
  const method = METHOD[b.paymentMethod || ''] || b.paymentMethod || '';
  return ['Paid', amount, method ? `by ${method}` : ''].filter(Boolean).join(' ');
}

/** "today at 7:42 PM (5 min ago)" */
function whenLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const day = d.toDateString() === new Date().toDateString() ? 'today' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : mins < 12 * 60 ? `${Math.floor(mins / 60)} h ago` : '';
  return `${day} at ${time}${ago ? ` (${ago})` : ''}`;
}

/** `scanningFor`: the event chosen on the scanner, or '' for any event. */
async function buildView(code: string, found: OrderLookup | null, events: Map<string, EventItem>, scanningFor: string): Promise<ScanView> {
  const empty: ScanView = {
    code,
    verdict: 'not-found',
    reason: `No Jazba ticket matches “${code}”. Do not admit.`,
    booking: null,
    passes: [],
    open: [],
    noPasses: false,
    holder: { name: '', email: '', phone: '' },
    event: { title: '', when: '', venue: '' },
    tier: '',
    perTicket: 1,
    seat: '',
    payment: '',
  };
  if (!found) return empty;

  const b = found.booking;
  const passes = found.passes;
  const eventId = b?.eventId || passes[0]?.eventId || '';
  const e = events.get(eventId);

  let name = realName(b?.billingName);
  let email = b?.billingEmail || '';
  let phone = b?.billingPhone || '';
  const uid = b?.userId || passes[0]?.userId || '';
  if ((!name || !email) && uid) {
    const u = await getUserProfile(uid).catch(() => null);
    name = name || realName(u?.name);
    email = email || u?.email || '';
    phone = phone || u?.phone || '';
  }

  const tier = b ? b.tierName || tierDisplayName(b.tier || b.ticketType || 'general', e) : 'Admission pass';
  const group = tier.match(/group\s+of\s+(\d{1,3})/i);
  const open = passes.filter((p) => p.status === 'active');
  const used = passes.filter((p) => p.status === 'scanned').sort((x, y) => (y.scannedAt || '').localeCompare(x.scannedAt || ''));
  const noPasses = !!b && passes.length === 0;
  const title = e?.title || b?.eventTitle || 'Unknown event';

  let verdict: Verdict = 'valid';
  let reason = '';
  if (b?.bookingStatus === 'cancelled' || (passes.length > 0 && passes.every((p) => p.status === 'cancelled'))) {
    verdict = 'cancelled';
    reason = 'This order was cancelled. Do not admit.';
  } else if (b?.paymentStatus === 'failed') {
    verdict = 'cancelled';
    reason = 'The payment for this order failed. Do not admit.';
  } else if (scanningFor && eventId !== scanningFor) {
    verdict = 'wrong-event';
    const when = eventWhen(e, b);
    reason = `This ticket is for ${title}${when ? ` (${when})` : ''}, not this event.`;
  } else if (!noPasses && open.length === 0) {
    verdict = 'used';
    const last = used[0];
    reason = last?.scannedAt ? `Checked in ${whenLabel(last.scannedAt)}${last.scannedBy ? ` by ${last.scannedBy}` : ''}.` : 'This ticket has already been used.';
  } else if (b && b.paymentStatus !== 'paid' && b.paymentMethod !== 'complimentary') {
    verdict = 'unpaid';
    reason = 'Payment isn’t confirmed for this order. Only admit once it’s paid.';
  } else if (used.length > 0) {
    verdict = 'partial';
    reason = `${used.length} of ${passes.length} already checked in. ${open.length} still to come in.`;
  } else {
    reason = 'Not used yet.';
  }

  return {
    code,
    verdict,
    reason,
    booking: b,
    passes,
    open,
    noPasses,
    holder: { name: name || (email ? email.split('@')[0] : 'Guest'), email, phone },
    event: { title, when: eventWhen(e, b), venue: eventVenue(e as any, b) },
    tier,
    perTicket: group ? Math.max(1, Number(group[1])) : 1,
    seat: b ? ticketSeat(b) : '',
    payment: b ? paymentLabel(b) : '',
  };
}

function errorView(code: string, err?: unknown): ScanView {
  const denied = (err as { code?: string } | undefined)?.code === 'permission-denied';
  return {
    code,
    verdict: 'error',
    reason: denied
      ? 'This account isn’t allowed to check tickets. Sign out, then sign in with an admin account.'
      : navigator.onLine
        ? 'Couldn’t check this ticket. Scan it again in a moment.'
        : 'No internet connection. The scanner needs internet to check tickets.',
    booking: null,
    passes: [],
    open: [],
    noPasses: false,
    holder: { name: '', email: '', phone: '' },
    event: { title: '', when: '', venue: '' },
    tier: '',
    perTicket: 1,
    seat: '',
    payment: '',
  };
}

const TONE: Record<Verdict, { title: string; band: string; icon: React.ComponentType<{ className?: string }>; sound: Feedback | null }> = {
  valid: { title: 'Valid ticket', band: 'bg-[#15803d] text-white', icon: CircleCheck, sound: 'beep' },
  partial: { title: 'Valid ticket', band: 'bg-[#15803d] text-white', icon: CircleCheck, sound: 'warn' },
  unpaid: { title: 'Not paid', band: 'bg-[#f59e0b] text-black', icon: AlertTriangle, sound: 'warn' },
  used: { title: 'Already used', band: 'bg-[#dc2626] text-white', icon: CircleX, sound: 'bad' },
  cancelled: { title: 'Cancelled', band: 'bg-[#dc2626] text-white', icon: Ban, sound: 'bad' },
  'wrong-event': { title: 'Wrong event', band: 'bg-[#dc2626] text-white', icon: CalendarDays, sound: 'bad' },
  'not-found': { title: 'Not found', band: 'bg-[#dc2626] text-white', icon: SearchX, sound: 'bad' },
  error: { title: 'Couldn’t check', band: 'bg-[#3f3f46] text-white', icon: WifiOff, sound: 'bad' },
};

interface RecentScan {
  key: string;
  at: number;
  code: string;
  name: string;
  verdict: Verdict | 'admitted';
  detail: string;
}

// ── Scanner ───────────────────────────────────────────────────────────────

function Scanner({ user }: { user: User }) {
  const staff = accountEmail(user) || user.uid;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState(() => load('jazba-scan-event'));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stats, setStats] = useState<EventCheckIns | null>(null);
  const [looking, setLooking] = useState('');
  const [view, setView] = useState<ScanView | null>(null);
  const [admitCount, setAdmitCount] = useState(1);
  const [confirmUnpaid, setConfirmUnpaid] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [admitError, setAdmitError] = useState('');
  const [admitted, setAdmitted] = useState<{ name: string; people: number; tier: string } | null>(null);
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const [phoneCount, setPhoneCount] = useState(0);
  const [manual, setManual] = useState('');
  const [sound, setSound] = useState(isSoundOn);

  /** True from a scan until its result is closed: one ticket at a time. */
  const busy = useRef(false);
  const lastScan = useRef({ code: '', at: 0 });

  useEffect(() => {
    let off = false;
    Promise.all([getWordPressEvents(), getEvents().catch(() => [] as EventItem[])]).then(([wp, site]) => {
      if (off) return;
      const m = new Map<string, EventItem>();
      for (const e of [...wp, ...site]) if (e?.id && !m.has(e.id)) m.set(e.id, e);
      setEvents([...m.values()]);
    });
    return () => {
      off = true;
    };
  }, []);

  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const selected = eventId ? eventMap.get(eventId) || null : null;

  useEffect(() => {
    setStats(null);
    if (!eventId) return;
    return watchEventCheckIns(eventId, setStats, () => setStats(null));
  }, [eventId]);

  // The camera calls back with whatever it sees; read the latest state here.
  const latest = useRef({ eventMap, eventId });
  latest.current = { eventMap, eventId };

  const pushRecent = (r: Omit<RecentScan, 'key' | 'at'>) =>
    setRecent((list) => [{ ...r, key: `${Date.now()}-${Math.random()}`, at: Date.now() }, ...list].slice(0, 25));

  const showView = (v: ScanView) => {
    setView(v);
    setAdmitCount(v.noPasses ? Math.max(1, Number(v.booking?.quantity) || 1) : Math.max(1, v.open.length));
    setConfirmUnpaid(false);
    setAdmitError('');
    const sound = TONE[v.verdict].sound;
    if (sound) feedback(sound);
    if (!CAN_ADMIT.includes(v.verdict)) {
      pushRecent({ code: v.code, name: v.holder.name, verdict: v.verdict, detail: TONE[v.verdict].title });
    }
  };

  const handleCode = useCallback(async (raw: string, typed = false) => {
    const code = cleanCode(raw);
    if (!code || busy.current) return;
    // Right after a result closes, the same QR is usually still in view.
    if (!typed && code === lastScan.current.code && Date.now() - lastScan.current.at < 4000) return;
    busy.current = true;
    lastScan.current = { code, at: Date.now() };
    setLooking(code);
    let v: ScanView;
    try {
      const found = await lookupCode(code);
      v = await buildView(code, found, latest.current.eventMap, latest.current.eventId);
    } catch (err) {
      console.error('Ticket lookup failed:', err);
      v = errorView(code, err);
    }
    setLooking('');
    showView(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A handheld scanner only reads when its trigger is pulled, so a repeat is deliberate.
  const handleTriggered = useCallback((code: string) => handleCode(code, true), [handleCode]);
  useScannerKeyboard(handleTriggered, !view && !admitted && !pickerOpen);

  const closeView = () => {
    setView(null);
    busy.current = false;
    lastScan.current.at = Date.now();
  };

  const closeAdmitted = useCallback(() => {
    setAdmitted(null);
    busy.current = false;
    lastScan.current.at = Date.now();
  }, []);

  useEffect(() => {
    if (!admitted) return;
    const t = setTimeout(closeAdmitted, 2800);
    return () => clearTimeout(t);
  }, [admitted, closeAdmitted]);

  const maxAdmit = view ? (view.noPasses ? Math.max(1, Number(view.booking?.quantity) || 1) : view.open.length) : 0;

  const admit = async () => {
    if (!view || admitting || !CAN_ADMIT.includes(view.verdict)) return;
    if (view.verdict === 'unpaid' && !confirmUnpaid) {
      setConfirmUnpaid(true);
      return;
    }
    const n = Math.max(1, Math.min(admitCount, maxAdmit));
    setAdmitting(true);
    setAdmitError('');
    try {
      if (view.noPasses && view.booking) await checkInWithoutPasses(view.booking, n, staff);
      else await checkInPasses(view.open.slice(0, n).map((p) => p.id!), staff);
      const people = n * view.perTicket;
      feedback('ok');
      setPhoneCount((c) => c + people);
      pushRecent({
        code: view.code,
        name: view.holder.name,
        verdict: 'admitted',
        detail: `${people} ${people === 1 ? 'person' : 'people'} in · ${view.tier}`,
      });
      setView(null);
      setAdmitted({ name: view.holder.name, people, tier: view.tier });
    } catch (err) {
      if (err instanceof CheckInConflict) {
        // Someone checked it in meanwhile: show the ticket as it is now.
        const fresh = await lookupCode(view.code)
          .then((found) => buildView(view.code, found, eventMap, eventId))
          .catch(() => null);
        if (fresh) showView({ ...fresh, reason: fresh.verdict === 'used' ? fresh.reason : `${err.message} ${fresh.reason}` });
        else {
          feedback('bad');
          setAdmitError(err.message);
        }
      } else {
        console.error('Check-in failed:', err);
        feedback('bad');
        setAdmitError(
          navigator.onLine ? 'The check-in wasn’t saved. Tap the button to try again.' : 'No internet connection. Connect, then tap the button again.',
        );
      }
    } finally {
      setAdmitting(false);
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return;
    (document.activeElement as HTMLElement | null)?.blur();
    setManual('');
    handleCode(code, true);
  };

  const chooseEvent = (id: string) => {
    setEventId(id);
    save('jazba-scan-event', id);
    setPickerOpen(false);
  };

  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };

  const logOut = () => {
    if (window.confirm('Sign out of Jazba Scan?')) signOut(auth);
  };

  const pct = stats && stats.total ? Math.round((stats.inside / stats.total) * 100) : 0;

  return (
    <div className="min-h-[100dvh] bg-black text-white" style={SAFE_TOP}>
      <div className="max-w-md mx-auto pb-10">
        <header className="flex items-center gap-3 px-4 py-3">
          <img src={brandMark} alt="" className="w-8 h-8 object-contain" />
          <div className="flex-1 min-w-0">
            <p className="font-display font-extrabold leading-none">Jazba Scan</p>
            <p className="text-[11px] text-white/50 truncate mt-1">{staff}</p>
          </div>
          <button type="button" onClick={toggleSound} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} className="w-10 h-10 flex items-center justify-center text-white/70 cursor-pointer">
            {sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button type="button" onClick={logOut} aria-label="Sign out" className="w-10 h-10 flex items-center justify-center text-white/70 cursor-pointer">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mx-4 mb-3 w-[calc(100%-2rem)] flex items-center gap-3 bg-[#141414] border border-white/10 px-3 py-3 text-left cursor-pointer"
        >
          <CalendarDays className="w-5 h-5 text-[#ffed00] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`${overline} text-white/45`}>Checking tickets for</p>
            <p className="font-bold truncate mt-0.5">{selected ? selected.title : eventId ? 'Loading event…' : 'All events'}</p>
            {selected && <p className="text-xs text-white/55 truncate">{[eventWhen(selected, null), eventVenue(selected as any, null)].filter(Boolean).join(' · ')}</p>}
          </div>
          <ChevronDown className="w-5 h-5 text-white/50 shrink-0" />
        </button>

        {eventId && (
          <div className="mx-4 mb-3">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-white/70">
                {stats ? (
                  <>
                    <b className="text-white text-sm">{stats.inside}</b> of {stats.total} tickets checked in
                  </>
                ) : (
                  'Counting tickets…'
                )}
              </span>
              <span className="text-white/45">This phone: {phoneCount}</span>
            </div>
            <div className="h-1.5 bg-white/10 mt-2">
              <div className="h-full bg-[#ffed00] transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="px-4">
          <QrCamera paused={!!view || !!looking || !!admitted || pickerOpen} onCode={handleCode} />
        </div>
        <p className="text-center text-sm text-white/60 mt-3 px-6">Point the camera at the QR code on the ticket.</p>

        <form onSubmit={submitManual} className="mx-4 mt-4 flex">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Or type the order number"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="flex-1 min-w-0 bg-[#161616] border border-white/15 border-r-0 px-3 py-3 text-base text-white placeholder-white/35 outline-none focus:border-[#ffed00]"
          />
          <button type="submit" className="bg-[#ffed00] text-black font-bold px-5 cursor-pointer">
            Check
          </button>
        </form>

        <div className="mx-4 mt-4">
          <InstallTip />
        </div>

        {recent.length > 0 && (
          <section className="mx-4 mt-6">
            <p className={`${overline} text-white/45 mb-2`}>Scanned on this phone</p>
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {recent.map((r) => {
                const ok = r.verdict === 'admitted';
                return (
                  <li key={r.key} className="flex items-center gap-3 py-3">
                    <span className={`w-8 h-8 shrink-0 flex items-center justify-center ${ok ? 'bg-[#15803d]' : 'bg-[#dc2626]'}`}>
                      {ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{r.name || r.code}</p>
                      <p className="text-xs text-white/55 truncate">
                        {r.detail} · {r.code}
                      </p>
                    </div>
                    <span className="text-[11px] text-white/40 shrink-0">
                      {new Date(r.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {looking && (
        <div className="fixed inset-0 z-30 bg-black/75 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-9 h-9 text-[#ffed00] animate-spin" />
          <p className="font-bold">Checking {looking}…</p>
        </div>
      )}

      {view && (
        <ResultSheet
          view={view}
          admitCount={admitCount}
          maxAdmit={maxAdmit}
          setAdmitCount={setAdmitCount}
          confirmUnpaid={confirmUnpaid}
          admitting={admitting}
          admitError={admitError}
          onAdmit={admit}
          onClose={closeView}
        />
      )}

      {admitted && <AdmittedScreen {...admitted} onClose={closeAdmitted} />}

      {pickerOpen && <EventPicker events={events} selectedId={eventId} onChoose={chooseEvent} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

// ── Checked in ────────────────────────────────────────────────────────────

/** Full-screen green confirmation; closes itself after a moment. */
function AdmittedScreen({ name, people, tier, onClose }: { name: string; people: number; tier: string; onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#15803d] text-white flex flex-col items-center justify-center text-center px-8 cursor-pointer"
    >
      <CircleCheck className="w-24 h-24" strokeWidth={1.75} />
      <p className="font-display font-extrabold text-4xl mt-5">Checked in</p>
      <p className="text-2xl font-bold mt-4">{name}</p>
      <p className="mt-2 text-white/85">
        {people} {people === 1 ? 'person' : 'people'} · {tier}
      </p>
      <p className="mt-12 text-sm text-white/70">Tap to scan the next ticket</p>
      <span className="scan-countdown absolute left-0 bottom-0 h-2 bg-white/60" />
    </button>
  );
}

// ── Result sheet ──────────────────────────────────────────────────────────

function ResultSheet({
  view,
  admitCount,
  maxAdmit,
  setAdmitCount,
  confirmUnpaid,
  admitting,
  admitError,
  onAdmit,
  onClose,
}: {
  view: ScanView;
  admitCount: number;
  maxAdmit: number;
  setAdmitCount: (n: number) => void;
  confirmUnpaid: boolean;
  admitting: boolean;
  admitError: string;
  onAdmit: () => void;
  onClose: () => void;
}) {
  const tone = TONE[view.verdict];
  const Icon = tone.icon;
  const b = view.booking;
  const canAdmit = CAN_ADMIT.includes(view.verdict);
  const n = Math.max(1, Math.min(admitCount, maxAdmit));
  const people = n * view.perTicket;
  const totalTickets = view.noPasses ? Math.max(1, Number(b?.quantity) || 1) : view.passes.length;

  return (
    <div className="fixed inset-0 z-40 bg-white text-black flex flex-col">
      <div className={`${tone.band} px-5 pb-5`} style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
        <div className="max-w-md mx-auto flex items-start gap-3">
          <Icon className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <p className="font-display font-extrabold text-[28px] uppercase leading-none">{tone.title}</p>
            <p className="text-sm font-medium mt-2 leading-snug opacity-95">{view.reason}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-5 py-5">
          {view.verdict === 'not-found' || view.verdict === 'error' ? (
            <div className="text-sm text-[#555] leading-relaxed">
              <p>
                Code read: <b className="text-black break-all">{view.code}</b>
              </p>
              <p className="mt-3">
                {view.verdict === 'not-found'
                  ? 'Ask the guest for the email with their ticket and check the order number, or type it in by hand.'
                  : view.reason.startsWith('No internet')
                    ? 'Connect to Wi-Fi or mobile data, then scan again.'
                    : 'If this keeps happening, sign out and sign in again.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={`${overline} text-[#8a8a8a]`}>Ticket holder</p>
                  <p className="font-display font-extrabold text-2xl leading-tight mt-1 break-words">{view.holder.name}</p>
                  {(view.holder.email || view.holder.phone) && (
                    <p className="text-sm text-[#666] mt-1 break-all">{[view.holder.email, view.holder.phone].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                <div className="bg-black text-white px-3 py-2 text-center shrink-0">
                  <p className={`${overline} text-white/60`}>Admits</p>
                  <p className="font-display font-extrabold text-3xl leading-none text-[#ffed00] mt-1">
                    {canAdmit ? people : totalTickets * view.perTicket}
                  </p>
                </div>
              </div>

              <dl className="mt-5 border-t-2 border-black divide-y divide-[#eee]">
                <Row label="Package" value={`${view.tier} × ${totalTickets}`} strong />
                {view.perTicket > 1 && <Row label="People" value={`${view.perTicket} per ticket`} />}
                {view.seat && <Row label="Seat" value={view.seat} strong />}
                <Row label="Event" value={view.event.title} strong />
                {view.event.when && <Row label="Date" value={view.event.when} />}
                {view.event.venue && <Row label="Venue" value={view.event.venue} />}
                <Row label="Order" value={b?.orderId || b?.bookingNumber || b?.id || view.code} />
                {view.payment && <Row label="Payment" value={view.payment} />}
                {b?.note && <Row label="Note" value={b.note} />}
              </dl>

              {view.passes.length > 0 && (
                <div className="mt-5">
                  <p className={`${overline} text-[#8a8a8a] mb-2`}>Tickets on this order</p>
                  <ul className="border border-[#e4e4e4] divide-y divide-[#eee]">
                    {view.passes.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                        <span className="font-bold flex-1 min-w-0 truncate">{p.ticketNumber}</span>
                        {p.status === 'scanned' ? (
                          <span className="text-xs text-[#b91c1c] font-bold text-right">In {whenLabel(p.scannedAt)}</span>
                        ) : p.status === 'cancelled' ? (
                          <span className="text-xs text-[#b91c1c] font-bold">Cancelled</span>
                        ) : (
                          <span className="text-xs text-[#15803d] font-bold">Not used</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="border-t border-[#e4e4e4] bg-white px-5 pt-3" style={SAFE_BOTTOM}>
        <div className="max-w-md mx-auto">
          {canAdmit && maxAdmit > 1 && (
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-bold leading-tight">
                How many tickets now?
                <span className="block text-xs text-[#666] font-medium">{maxAdmit} not used yet</span>
              </p>
              <div className="flex items-center">
                <button type="button" aria-label="One fewer" onClick={() => setAdmitCount(Math.max(1, n - 1))} disabled={n <= 1} className="w-12 h-12 border-2 border-black flex items-center justify-center cursor-pointer disabled:opacity-30">
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-12 text-center font-display font-extrabold text-2xl">{n}</span>
                <button type="button" aria-label="One more" onClick={() => setAdmitCount(Math.min(maxAdmit, n + 1))} disabled={n >= maxAdmit} className="w-12 h-12 border-2 border-black flex items-center justify-center cursor-pointer disabled:opacity-30">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          {admitError && <p className="text-sm font-bold text-[#b91c1c] mb-3">{admitError}</p>}
          {canAdmit && (
            <button
              type="button"
              onClick={onAdmit}
              disabled={admitting}
              className={`w-full flex items-center justify-center gap-2 font-extrabold text-lg py-4 cursor-pointer disabled:opacity-60 ${confirmUnpaid ? 'bg-[#f59e0b] text-black' : 'bg-[#ffed00] text-black'}`}
            >
              {admitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" strokeWidth={3} />}
              {confirmUnpaid ? 'Tap again to admit without payment' : `Check in · admit ${people} ${people === 1 ? 'person' : 'people'}`}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`w-full font-bold py-3.5 mt-2 cursor-pointer ${canAdmit ? 'text-black' : 'bg-black text-white text-lg py-4'}`}
          >
            {canAdmit ? 'Cancel' : 'Scan next ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex gap-4 py-2.5 text-sm">
      <dt className="w-20 shrink-0 text-[#8a8a8a]">{label}</dt>
      <dd className={`flex-1 min-w-0 break-words ${strong ? 'font-bold' : ''}`}>{value}</dd>
    </div>
  );
}

// ── Event picker ──────────────────────────────────────────────────────────

function EventPicker({
  events,
  selectedId,
  onChoose,
  onClose,
}: {
  events: EventItem[];
  selectedId: string;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const { upcoming, past } = useMemo(() => {
    // Shows from the last two days still count as "now" (late finishes, time zones).
    const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const dated = events.map((e) => ({ e, ts: getEventTimestamp(e) }));
    return {
      upcoming: dated.filter((d) => d.ts === null || d.ts >= cutoff).sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity)),
      past: dated
        .filter((d) => d.ts !== null && d.ts < cutoff)
        .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
        .slice(0, 12),
    };
  }, [events]);

  const option = (id: string, title: string, sub: string) => (
    <button
      key={id || 'all'}
      type="button"
      onClick={() => onChoose(id)}
      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left cursor-pointer ${selectedId === id ? 'bg-[#ffed00]' : 'hover:bg-[#f7f7f7]'}`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate">{title}</p>
        {sub && <p className="text-xs text-[#555] truncate mt-0.5">{sub}</p>}
      </div>
      {selectedId === id && <Check className="w-5 h-5 shrink-0" strokeWidth={3} />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white text-black w-full max-w-md max-h-[85dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4e4e4]">
          <p className="font-display font-extrabold text-lg">Which event is this?</p>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 -m-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto" style={SAFE_BOTTOM}>
          {option('', 'All events', 'Accept tickets for any event')}
          {events.length === 0 && (
            <p className="px-5 py-4 text-sm text-[#666] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading events…
            </p>
          )}
          {upcoming.length > 0 && <p className={`${overline} text-[#8a8a8a] px-5 pt-4 pb-1`}>Upcoming</p>}
          {upcoming.map(({ e }) => option(e.id, e.title, [eventWhen(e, null), eventVenue(e as any, null)].filter(Boolean).join(' · ')))}
          {past.length > 0 && <p className={`${overline} text-[#8a8a8a] px-5 pt-4 pb-1`}>Past</p>}
          {past.map(({ e }) => option(e.id, e.title, [eventWhen(e, null), eventVenue(e as any, null)].filter(Boolean).join(' · ')))}
        </div>
      </div>
    </div>
  );
}
