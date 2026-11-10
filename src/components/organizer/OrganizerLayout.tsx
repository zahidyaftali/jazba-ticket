import React, { useState } from "react";
import {
  BellRing,
  Building2,
  CalendarDays,
  Contact,
  Eye,
  Images,
  ScanLine,
  Tag,
  TicketPlus,
  CircleCheck,
  CircleX,
  ExternalLink,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  ShoppingBag,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import brandMark from "../../../assets/images/Favicon.png";
import { Avatar, overline } from "../admin/ui";
import { useOrg } from "./OrganizerContext";
import { stopActing } from "./acting";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  events: "Events",
  orders: "Orders & attendees",
  customers: "Customers",
  issue: "Issue tickets",
  codes: "Discount codes",
  waitlist: "Waitlist",
  "door-staff": "Door staff & scanning",
  media: "Media",
  payouts: "Payouts",
  profile: "Organiser profile",
  account: "Account",
};

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const { route, navigate, org, me, user, onLogout, toasts, dismissToast, reload, reportLoading, eventsLoading, events, actingAsAdmin, report } = useOrg();
  const waiting = (report?.waitlist || []).filter((w) => w.status !== "notified").length;
  const [mobileOpen, setMobileOpen] = useState(false);

  const inReview = events.filter((e) => e.status === "pending").length;
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/organizer" },
    {
      id: "events",
      label: "Events",
      icon: CalendarDays,
      to: "/organizer/events",
      count: events.length,
      children: [
        { label: "All events", to: "/organizer/events" },
        { label: "Create event", to: "/organizer/events/new" },
      ],
    },
    { id: "orders", label: "Orders & attendees", icon: ShoppingBag, to: "/organizer/orders" },
    { id: "customers", label: "Customers", icon: Contact, to: "/organizer/customers" },
    { id: "issue", label: "Issue tickets", icon: TicketPlus, to: "/organizer/issue" },
    { id: "codes", label: "Discount codes", icon: Tag, to: "/organizer/codes" },
    { id: "waitlist", label: "Waitlist", icon: BellRing, to: "/organizer/waitlist", count: waiting },
    { id: "door-staff", label: "Door staff & scanning", icon: ScanLine, to: "/organizer/door-staff" },
    { id: "media", label: "Media", icon: Images, to: "/organizer/media" },
    { id: "payouts", label: "Payouts", icon: Wallet, to: "/organizer/payouts" },
    { id: "profile", label: "Organiser profile", icon: Building2, to: "/organizer/profile" },
    { id: "account", label: "Account", icon: UserCog, to: "/organizer/account" },
  ];

  const go = (e: React.MouseEvent, to: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    setMobileOpen(false);
    navigate(to);
  };
  const currentPath = `/organizer${route.section === "dashboard" ? "" : `/${route.section}`}${route.sub ? `/${route.sub}` : ""}`;

  const sidebar = (
    <>
      <a href="/organizer" onClick={(e) => go(e, "/organizer")} className="flex items-center gap-3 h-16 border-b border-white/10 shrink-0 px-5">
        <img src={brandMark} alt="Jazba Tickets" className="w-8 h-8 object-contain shrink-0" />
        <span className="min-w-0">
          <span className="font-display font-bold text-sm block leading-none text-white">Jazba Tickets</span>
          <span className={`${overline} text-[#ffed00] block mt-1.5 text-[9px]`}>Organiser portal</span>
        </span>
      </a>
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
        <Avatar src={org.logoUrl} name={org.companyName || "?"} size={36} square />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-white truncate">{org.companyName}</p>
          <p className="text-[11px] text-white/50 truncate">{inReview ? `${inReview} event${inReview === 1 ? "" : "s"} in review` : "Approved organiser"}</p>
        </div>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {nav.map((item) => {
          const active = route.section === item.id;
          const Icon = item.icon;
          return (
            <div key={item.id}>
              <a
                href={item.to}
                onClick={(e) => go(e, item.to)}
                className={`flex items-center gap-3 h-10 px-5 text-[13px] font-bold transition-colors ${
                  active ? "bg-[#ffed00] text-black" : "text-white/70 hover:text-white hover:bg-white/[0.07]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {typeof item.count === "number" && item.count > 0 && (
                  <span className={`text-[10px] leading-none px-1.5 py-1 ${active ? "bg-black text-[#ffed00]" : "bg-white/10 text-white/70"}`}>{item.count}</span>
                )}
              </a>
              {active && item.children && (
                <div className="bg-white/[0.04] py-1.5">
                  {item.children.map((c) => (
                    <a
                      key={c.to}
                      href={c.to}
                      onClick={(e) => go(e, c.to)}
                      className={`flex items-center gap-2 pl-[52px] pr-5 py-2 text-[12px] font-bold transition-colors ${
                        currentPath === c.to ? "text-white" : "text-white/55 hover:text-white"
                      }`}
                    >
                      {currentPath === c.to && <span className="w-1.5 h-1.5 bg-[#ffed00] -ml-3.5" />}
                      {c.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 shrink-0 py-1">
        <a
          href={`/organizers/${encodeURIComponent(org.id || user.uid)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 h-10 px-5 text-[12px] font-bold text-white/55 hover:text-white"
        >
          <ExternalLink className="w-4 h-4 shrink-0" /> Your public page
        </a>
        <a href="mailto:info@jazbatickets.com" className="flex items-center gap-3 h-10 px-5 text-[12px] font-bold text-white/55 hover:text-white">
          <LifeBuoy className="w-4 h-4 shrink-0" /> Help: info@jazbatickets.com
        </a>
        <button type="button" onClick={onLogout} className="w-full flex items-center gap-3 h-10 px-5 text-[12px] font-bold text-white/55 hover:text-white cursor-pointer">
          <LogOut className="w-4 h-4 shrink-0" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex text-black">
      <aside className="hidden lg:flex flex-col bg-black text-white sticky top-0 h-screen shrink-0 z-40 w-[248px]">{sidebar}</aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/50 jz-admin-fade" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[264px] max-w-[85vw] h-full bg-black text-white flex flex-col jz-admin-slide-left">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3.5 w-9 h-9 flex items-center justify-center text-white/70 hover:text-white cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {actingAsAdmin && (
          <div className="bg-[#ffed00] text-black px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 shrink-0" /> You’re in {org.companyName}’s portal as an admin. Changes you make are saved to their account.
            </span>
            <button
              type="button"
              onClick={() => {
                stopActing();
                window.location.href = `/admin/organizers/view/${encodeURIComponent(org.id || "")}`;
              }}
              className="bg-black text-[#ffed00] px-3 py-1.5 cursor-pointer hover:bg-neutral-800"
            >
              Back to admin
            </button>
          </div>
        )}
        <header className="sticky top-0 z-30 bg-white border-b border-[#e4e4e4] h-16 flex items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center border border-[#e4e4e4] hover:border-black cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex items-center gap-2 text-sm">
            <span className="hidden sm:inline text-[#8a8a8a] font-bold">Organiser</span>
            <span className="hidden sm:inline text-[#c4c4c4]">/</span>
            <span className="font-bold text-black truncate">{TITLES[route.section] || "Dashboard"}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => reload()}
              disabled={reportLoading || eventsLoading}
              className="w-9 h-9 flex items-center justify-center text-[#333] hover:bg-[#f2f2f2] cursor-pointer disabled:cursor-default"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${reportLoading || eventsLoading ? "animate-spin" : ""}`} />
            </button>
            <a
              href="/organizer/events/new"
              onClick={(e) => go(e, "/organizer/events/new")}
              className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-4 bg-[#ffed00] hover:bg-[#e6d200] text-black text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Create event</span>
            </a>
            <a
              href="/organizer/account"
              onClick={(e) => go(e, "/organizer/account")}
              className="hidden sm:flex items-center gap-2 h-9 pl-1 pr-2 hover:bg-[#f2f2f2]"
              title="Account"
            >
              <Avatar src={me?.profileImage || user.photoURL || ""} name={me?.name || user.displayName || user.email || "?"} size={28} />
              <span className="text-xs font-bold max-w-[140px] truncate">{me?.name || user.displayName || user.email}</span>
            </a>
          </div>
        </header>
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</main>
      </div>

      <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 text-sm font-bold jz-admin-fade ${
              t.kind === "error" ? "bg-white text-[#7a2f2f] border border-[#be6464]" : "bg-black text-white"
            }`}
          >
            {t.kind === "error" ? <CircleX className="w-4 h-4 shrink-0 mt-0.5 text-[#be6464]" /> : <CircleCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#ffed00]" />}
            <span className="flex-1 leading-snug">{t.msg}</span>
            <button type="button" onClick={() => dismissToast(t.id)} className="opacity-60 hover:opacity-100 cursor-pointer shrink-0" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
