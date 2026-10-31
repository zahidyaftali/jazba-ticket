import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  ShoppingBag,
  CreditCard,
  Contact,
  CalendarDays,
  MicVocal,
  Building2,
  Users,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  Plus,
  RefreshCw,
  ExternalLink,
  LogOut,
  ChevronDown,
  CircleCheck,
  CircleX,
} from "lucide-react";
import brandMark from "../../../assets/images/Favicon.png";
import { useAdmin } from "./AdminContext";
import { Avatar, overline } from "./ui";

interface NavChild {
  label: string;
  to: string;
}
interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  to: string;
  count?: number;
  children?: NavChild[];
}
interface NavGroup {
  heading?: string;
  items: NavItem[];
}

const SIDEBAR_KEY = "jz_admin_sidebar_collapsed";

export function readCollapsedPref(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}
export function writeCollapsedPref(v: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
  } catch {
    /* storage unavailable — preference just isn't remembered */
  }
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  tickets: "Tickets",
  orders: "Orders",
  payments: "Payments",
  clients: "Clients",
  events: "Events",
  artists: "Artists",
  organizers: "Organisers",
  users: "Users",
  settings: "Account settings",
};
const SUB_TITLES: Record<string, string> = {
  new: "Add new",
  edit: "Edit",
  upcoming: "Upcoming",
  "check-in": "Check-in",
  "tickets/new": "Issue ticket",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data, route, navigate, reload, refreshing, loading, admin, onLogout, toasts, dismissToast, clients, cardPayments } =
    useAdmin();
  const [collapsed, setCollapsed] = useState(readCollapsedPref);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Account settings can change the preference — keep in sync.
  useEffect(() => {
    const onPref = () => setCollapsed(readCollapsedPref());
    window.addEventListener("jz-admin-sidebar", onPref);
    return () => window.removeEventListener("jz-admin-sidebar", onPref);
  }, []);

  useEffect(() => setMobileOpen(false), [route]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeCollapsedPref(next);
    window.dispatchEvent(new Event("jz-admin-sidebar"));
  };

  const upcomingTicketsCount = data.bookings.length;
  const nav: NavGroup[] = [
    { items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/admin" }] },
    {
      heading: "Ticketing",
      items: [
        {
          id: "tickets",
          label: "Tickets",
          icon: Ticket,
          to: "/admin/tickets",
          count: upcomingTicketsCount,
          children: [
            { label: "All tickets", to: "/admin/tickets" },
            { label: "Upcoming", to: "/admin/tickets/upcoming" },
            { label: "Issue ticket", to: "/admin/tickets/new" },
            { label: "Check-in", to: "/admin/tickets/check-in" },
          ],
        },
        { id: "orders", label: "Orders", icon: ShoppingBag, to: "/admin/orders", count: data.bookings.length },
        { id: "payments", label: "Payments", icon: CreditCard, to: "/admin/payments", count: data.payments.length + cardPayments.length },
        { id: "clients", label: "Clients", icon: Contact, to: "/admin/clients", count: clients.filter((c) => c.orders.length).length },
      ],
    },
    {
      heading: "Catalogue",
      items: [
        {
          id: "events",
          label: "Events",
          icon: CalendarDays,
          to: "/admin/events",
          count: data.events.length + data.wpEvents.length,
          children: [
            { label: "All events", to: "/admin/events" },
            { label: "Add new", to: "/admin/events/new" },
          ],
        },
        {
          id: "artists",
          label: "Artists",
          icon: MicVocal,
          to: "/admin/artists",
          count: data.artists.length,
          children: [
            { label: "All artists", to: "/admin/artists" },
            { label: "Add new", to: "/admin/artists/new" },
          ],
        },
        {
          id: "organizers",
          label: "Organisers",
          icon: Building2,
          to: "/admin/organizers",
          count: data.organizers.length,
          children: [
            { label: "All organisers", to: "/admin/organizers" },
            { label: "Add new", to: "/admin/organizers/new" },
          ],
        },
      ],
    },
    { heading: "People", items: [{ id: "users", label: "Users", icon: Users, to: "/admin/users", count: data.users.length }] },
    { heading: "Account", items: [{ id: "settings", label: "Account settings", icon: Settings, to: "/admin/settings" }] },
  ];

  const currentPath = `/admin${route.section === "dashboard" ? "" : `/${route.section}`}${route.sub ? `/${route.sub}` : ""}`;
  const isChildActive = (to: string) => currentPath === to;

  const go = (e: React.MouseEvent, to: string) => {
    // Let ctrl/cmd-click open a new tab like a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    navigate(to);
  };

  const renderNav = (isCollapsed: boolean) => (
    <nav className={`flex-1 py-3 ${isCollapsed ? "overflow-visible" : "overflow-y-auto"}`}>
      {nav.map((group, gi) => (
        <div key={gi} className={gi > 0 ? "mt-4" : ""}>
          {group.heading &&
            (isCollapsed ? (
              <div className="mx-4 mb-2 h-px bg-white/10" />
            ) : (
              <span className={`${overline} text-white/35 block px-5 mb-1.5`}>{group.heading}</span>
            ))}
          {group.items.map((item) => {
            const active = route.section === item.id;
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative group/nav">
                <a
                  href={item.to}
                  onClick={(e) => go(e, item.to)}
                  className={`flex items-center gap-3 h-10 text-[13px] font-bold transition-colors ${
                    isCollapsed ? "justify-center mx-3" : "px-5"
                  } ${
                    active
                      ? "bg-[#ffed00] text-black"
                      : "text-white/70 hover:text-white hover:bg-white/[0.07]"
                  }`}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {typeof item.count === "number" && item.count > 0 && (
                        <span
                          className={`text-[10px] leading-none px-1.5 py-1 ${
                            active ? "bg-black text-[#ffed00]" : "bg-white/10 text-white/70"
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                </a>

                {/* Expanded: the active section shows its sub-pages inline */}
                {!isCollapsed && active && item.children && (
                  <div className="bg-white/[0.04] py-1.5">
                    {item.children.map((c) => (
                      <a
                        key={c.to}
                        href={c.to}
                        onClick={(e) => go(e, c.to)}
                        className={`flex items-center gap-2 pl-[52px] pr-5 py-2 text-[12px] font-bold transition-colors ${
                          isChildActive(c.to) ? "text-white" : "text-white/55 hover:text-white"
                        }`}
                      >
                        {isChildActive(c.to) && <span className="w-1.5 h-1.5 bg-[#ffed00] -ml-3.5" />}
                        {c.label}
                      </a>
                    ))}
                  </div>
                )}

                {/* Collapsed: hover flyout with the label and sub-pages */}
                {isCollapsed && (
                  <div className="hidden group-hover/nav:block absolute left-full top-0 z-50 pl-1">
                    <div className="bg-black border border-white/15 min-w-[190px] py-1.5">
                      <a
                        href={item.to}
                        onClick={(e) => go(e, item.to)}
                        className="block px-4 py-2 text-[13px] font-bold text-white hover:text-[#ffed00]"
                      >
                        {item.label}
                        {typeof item.count === "number" && item.count > 0 && (
                          <span className="ml-2 text-[10px] text-white/50">{item.count}</span>
                        )}
                      </a>
                      {item.children?.map((c) => (
                        <a
                          key={c.to}
                          href={c.to}
                          onClick={(e) => go(e, c.to)}
                          className={`block px-4 py-1.5 text-[12px] font-bold ${
                            isChildActive(c.to) ? "text-[#ffed00]" : "text-white/60 hover:text-white"
                          }`}
                        >
                          {c.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const brand = (isCollapsed: boolean) => (
    <a
      href="/admin"
      onClick={(e) => go(e, "/admin")}
      className={`flex items-center gap-3 h-16 border-b border-white/10 shrink-0 ${isCollapsed ? "justify-center" : "px-5"}`}
    >
      <img src={brandMark} alt="Jazba Tickets" className="w-8 h-8 object-contain shrink-0" />
      {!isCollapsed && (
        <span className="min-w-0">
          <span className="font-display font-bold text-sm block leading-none text-white">Jazba Tickets</span>
          <span className={`${overline} text-[#ffed00] block mt-1.5 text-[9px]`}>Admin portal</span>
        </span>
      )}
    </a>
  );

  const sectionTitle = PAGE_TITLES[route.section] || "Dashboard";
  const subTitle = route.sub ? SUB_TITLES[`${route.section}/${route.sub}`] || SUB_TITLES[route.sub] || "" : "";

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex text-black" id="admin-portal-root">
      {/* ── Desktop sidebar ───────────────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col bg-black text-white sticky top-0 h-screen shrink-0 z-40 transition-[width] duration-200 ${
          collapsed ? "w-[72px]" : "w-[248px]"
        }`}
      >
        {brand(collapsed)}
        {renderNav(collapsed)}
        <div className="border-t border-white/10 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 h-10 text-[12px] font-bold text-white/55 hover:text-white ${collapsed ? "justify-center" : "px-5"}`}
            title="View site"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            {!collapsed && "View site"}
          </a>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`w-full flex items-center gap-3 h-11 text-[12px] font-bold text-white/55 hover:text-white cursor-pointer ${
              collapsed ? "justify-center" : "px-5"
            }`}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            {!collapsed && "Collapse menu"}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/50 jz-admin-fade" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[264px] max-w-[85vw] h-full bg-black text-white flex flex-col jz-admin-slide-left">
            <div className="flex items-center justify-between pr-3">
              {brand(false)}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNav(false)}
          </aside>
        </div>
      )}

      {/* ── Main column ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-[#e4e4e4] h-16 flex items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center border border-[#e4e4e4] hover:border-black cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden lg:flex w-9 h-9 items-center justify-center text-[#666] hover:text-black hover:bg-[#f2f2f2] cursor-pointer"
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>

          <div className="min-w-0 flex items-center gap-2 text-sm">
            <span className="hidden sm:inline text-[#8a8a8a] font-bold">Admin</span>
            <span className="hidden sm:inline text-[#c4c4c4]">/</span>
            {subTitle ? (
              <>
                <a
                  href={`/admin/${route.section}`}
                  onClick={(e) => go(e, `/admin/${route.section}`)}
                  className="text-[#8a8a8a] font-bold hover:text-black truncate"
                >
                  {sectionTitle}
                </a>
                <span className="text-[#c4c4c4]">/</span>
                <span className="font-bold text-black truncate">{subTitle}</span>
              </>
            ) : (
              <span className="font-bold text-black truncate">{sectionTitle}</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => reload()}
              disabled={refreshing || loading}
              className="w-9 h-9 flex items-center justify-center text-[#333] hover:bg-[#f2f2f2] cursor-pointer disabled:cursor-default"
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing || loading ? "animate-spin" : ""}`} />
            </button>
            <NewMenu />
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 h-9 px-3 text-xs font-bold text-[#333] hover:bg-[#f2f2f2]"
            >
              View site <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <AccountMenu admin={admin} onLogout={onLogout} onSettings={() => navigate("/admin/settings")} />
          </div>
        </header>

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</main>
      </div>

      {/* ── Toasts ────────────────────────────────────────────────── */}
      <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 text-sm font-bold jz-admin-fade ${
              t.kind === "error" ? "bg-white text-[#7a2f2f] border border-[#be6464]" : "bg-black text-white"
            }`}
          >
            {t.kind === "error" ? (
              <CircleX className="w-4 h-4 shrink-0 mt-0.5 text-[#be6464]" />
            ) : (
              <CircleCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#ffed00]" />
            )}
            <span className="flex-1 leading-snug">{t.msg}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="opacity-60 hover:opacity-100 cursor-pointer shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Close a dropdown when clicking anywhere outside it. */
function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function NewMenu() {
  const { navigate } = useAdmin();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const items = [
    { label: "Ticket", sub: "Issue to a client", to: "/admin/tickets/new" },
    { label: "Event", sub: "Create a site event", to: "/admin/events/new" },
    { label: "Artist", sub: "Add to the roster", to: "/admin/artists/new" },
    { label: "Organiser", sub: "Add a profile", to: "/admin/organizers/new" },
  ];
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-9 px-3 bg-[#ffed00] hover:bg-[#e6d200] text-black text-xs font-bold cursor-pointer"
        aria-expanded={open}
      >
        <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New</span>
        <ChevronDown className="w-3.5 h-3.5 hidden sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-black z-50 py-1 jz-admin-fade">
          {items.map((it) => (
            <button
              key={it.to}
              type="button"
              onClick={() => {
                setOpen(false);
                navigate(it.to);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-[#f7f7f7] cursor-pointer"
            >
              <span className="block text-sm font-bold text-black">{it.label}</span>
              <span className="block text-[11px] text-[#8a8a8a]">{it.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountMenu({
  admin,
  onLogout,
  onSettings,
}: {
  admin: { name: string; email: string; photo: string };
  onLogout: () => void;
  onSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 pl-1 pr-2 hover:bg-[#f2f2f2] cursor-pointer"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar src={admin.photo} name={admin.name} size={28} />
        <span className="hidden md:block text-xs font-bold max-w-[120px] truncate">{admin.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#666] hidden md:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-black z-50 jz-admin-fade">
          <div className="px-4 py-3 border-b border-[#efefef] flex items-center gap-3">
            <Avatar src={admin.photo} name={admin.name} size={36} />
            <div className="min-w-0">
              <span className="block text-sm font-bold truncate">{admin.name}</span>
              <span className="block text-[11px] text-[#8a8a8a] truncate">{admin.email}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSettings();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold hover:bg-[#f7f7f7] cursor-pointer"
          >
            <Settings className="w-4 h-4" /> Account settings
          </button>
          <a href="/" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold hover:bg-[#f7f7f7]">
            <ExternalLink className="w-4 h-4" /> Back to the website
          </a>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold hover:bg-[#f7f7f7] border-t border-[#efefef] cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
