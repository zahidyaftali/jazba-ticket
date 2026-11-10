import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "../../firebase";
import type { OrganizerProfile, UserProfile } from "../../services/backendService";
import { fetchOrganizerReport, getOrganizerEvents, type OrganizerReport } from "../../services/organizerService";
import { getOrganizerPrivate, type OrganizerPrivate } from "../../services/organizerToolsService";
import { setMediaOrganizer } from "../../services/adminMediaService";
import { MediaScopeContext, NotifyContext } from "../admin/notify";

export interface OrgRoute {
  /** First path segment after /organizer, e.g. "events" (default "dashboard"). */
  section: string;
  sub: string;
  id: string;
}

interface Toast {
  id: number;
  kind: "success" | "error";
  msg: string;
}

interface OrgCtx {
  user: User;
  /** The organiser's account id: owner of their events, codes and staff. */
  orgUid: string;
  /** An admin working inside this organiser's portal. */
  actingAsAdmin: boolean;
  /** Passed to server actions: the organiser's id when an admin acts for them, else ''. */
  toolOrgId: string;
  /** Private details: bank details, sale-email setting, fee (null while loading or none). */
  priv: OrganizerPrivate | null;
  setPriv: (p: OrganizerPrivate | null) => void;
  me: UserProfile | null;
  org: OrganizerProfile;
  setOrg: (o: OrganizerProfile) => void;
  setMe: (u: UserProfile) => void;
  events: any[];
  eventsLoading: boolean;
  report: OrganizerReport | null;
  reportError: string;
  reportLoading: boolean;
  reload: () => Promise<void>;
  route: OrgRoute;
  navigate: (to: string) => void;
  notify: (msg: string) => void;
  fail: (msg: string) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  currency: string;
  setCurrency: (c: string) => void;
  onLogout: () => void;
}

const Ctx = createContext<OrgCtx | null>(null);

export function useOrg(): OrgCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrg must be used inside <OrganizerProvider>");
  return ctx;
}

function parseRoute(): OrgRoute {
  const parts = window.location.pathname
    .replace(/^\/organizer\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  return { section: parts[0] || "dashboard", sub: parts[1] || "", id: parts[2] || "" };
}

const CURRENCY_KEY = "jz_org_currency";

export function OrganizerProvider({
  user,
  me: initialMe,
  org: initialOrg,
  onLogout,
  children,
  actingAsAdmin = false,
}: {
  user: User;
  me: UserProfile | null;
  org: OrganizerProfile;
  onLogout: () => void;
  children: React.ReactNode;
  actingAsAdmin?: boolean;
}) {
  const [me, setMe] = useState<UserProfile | null>(initialMe);
  const [org, setOrg] = useState<OrganizerProfile>(initialOrg);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [report, setReport] = useState<OrganizerReport | null>(null);
  const [reportError, setReportError] = useState("");
  const [reportLoading, setReportLoading] = useState(true);
  const [route, setRoute] = useState<OrgRoute>(parseRoute);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currency, setCurrencyState] = useState<string>(() => {
    try {
      return localStorage.getItem(CURRENCY_KEY) || "";
    } catch {
      return "";
    }
  });
  const toastSeq = useRef(0);
  const orgUid = org.userId || org.id || user.uid;
  const toolOrgId = actingAsAdmin ? orgUid : "";
  const [priv, setPriv] = useState<OrganizerPrivate | null>(null);

  // An admin inside this portal adds images to the organiser's own folder.
  // Set while rendering (not in an effect) so it's in place before any image
  // picker below loads the library.
  setMediaOrganizer(actingAsAdmin ? orgUid : "");

  useEffect(() => {
    let cancelled = false;
    getOrganizerPrivate(org.id || orgUid).then((p) => {
      if (!cancelled) setPriv(p);
    });
    return () => {
      cancelled = true;
    };
  }, [org.id, orgUid]);

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

  // Events and sales load side by side: the events (and the editor) never
  // wait for the sales report.
  const reload = useCallback(async () => {
    setEventsLoading(true);
    setReportLoading(true);
    const events = getOrganizerEvents(orgUid)
      .then(setEvents)
      .catch(() => fail("Couldn’t load your events. Please refresh the page."))
      .finally(() => setEventsLoading(false));
    const sales = fetchOrganizerReport(actingAsAdmin ? orgUid : undefined)
      .then((r) => {
        setReport(r);
        setReportError("");
      })
      .catch((err) => setReportError(err?.message || "Couldn’t load your sales."))
      .finally(() => setReportLoading(false));
    await Promise.all([events, sales]);
  }, [orgUid, actingAsAdmin, fail]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname + window.location.search) window.history.pushState({}, "", to);
    setRoute(parseRoute());
    window.scrollTo({ top: 0 });
  }, []);

  // Show money in the currency most of their buyers pay in, unless they chose one.
  const autoCurrency = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of report?.orders || []) counts.set(o.currency, (counts.get(o.currency) || 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return top && ["USD", "GBP", "PKR"].includes(top) ? top : "PKR";
  }, [report]);
  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      /* not remembered */
    }
  }, []);

  const value: OrgCtx = {
    user,
    orgUid,
    actingAsAdmin,
    toolOrgId,
    priv,
    setPriv,
    me,
    org,
    setOrg,
    setMe,
    events,
    eventsLoading,
    report,
    reportError,
    reportLoading,
    reload,
    route,
    navigate,
    notify,
    fail,
    toasts,
    dismissToast,
    currency: currency || autoCurrency,
    setCurrency,
    onLogout,
  };
  const notifier = useMemo(() => ({ notify, fail }), [notify, fail]);

  return (
    <Ctx.Provider value={value}>
      <NotifyContext.Provider value={notifier}>
        <MediaScopeContext.Provider value="organizer">{children}</MediaScopeContext.Provider>
      </NotifyContext.Provider>
    </Ctx.Provider>
  );
}
