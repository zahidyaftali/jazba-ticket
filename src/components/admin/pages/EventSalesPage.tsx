import React, { useMemo, useState } from "react";
import { BarChart3, ChevronRight, Download, Send, Ticket, Users, ScanLine, Wallet } from "lucide-react";
import type { Booking } from "../../../services/backendService";
import { peoplePerPass, tierDisplayName } from "../../../types";
import { useAdmin, tierKey, type EventInfo } from "../AdminContext";
import {
  DataTable,
  EmptyRow,
  FilterTabs,
  PageHeader,
  Pagination,
  SearchInput,
  StatTile,
  Toolbar,
  btnOutline,
  btnPrimary,
  convertMoney,
  downloadCsv,
  money,
  tdCls,
  thCls,
  usePaged,
} from "../ui";

// Tickets → By event: how many tickets each event has, split by package
// (VIP, Standard, group packages…). Read-only — it only counts what's there.

interface PackageStats {
  id: string;
  name: string;
  /** People one ticket admits (4 on a group-of-4 package). */
  groupSize: number;
  orders: number;
  /** Tickets on active orders (cancelled orders don't count). */
  tickets: number;
  /** People those tickets admit. */
  people: number;
  checkedIn: number;
  paid: number;
  complimentary: number;
  unpaid: number;
  online: number;
  portal: number;
  cancelled: number;
  /** Paid money by currency, e.g. { PKR: 120000, USD: 25 }. */
  revenue: Record<string, number>;
}

interface EventStats {
  id: string;
  info: EventInfo;
  packages: PackageStats[];
  total: PackageStats;
}

const emptyStats = (id: string, name: string, groupSize = 1): PackageStats => ({
  id,
  name,
  groupSize,
  orders: 0,
  tickets: 0,
  people: 0,
  checkedIn: 0,
  paid: 0,
  complimentary: 0,
  unpaid: 0,
  online: 0,
  portal: 0,
  cancelled: 0,
  revenue: {},
});

/** What the order paid, in the currency it was agreed in. */
function paidAmount(b: Booking): { currency: string; amount: number } {
  if (b.currency && b.currency !== "USD" && typeof b.amountLocal === "number") return { currency: b.currency, amount: b.amountLocal };
  return { currency: "USD", amount: Number(b.amount ?? b.pricePaid) || 0 };
}

function addInto(into: PackageStats, from: PackageStats) {
  into.orders += from.orders;
  into.tickets += from.tickets;
  into.people += from.people;
  into.checkedIn += from.checkedIn;
  into.paid += from.paid;
  into.complimentary += from.complimentary;
  into.unpaid += from.unpaid;
  into.online += from.online;
  into.portal += from.portal;
  into.cancelled += from.cancelled;
  for (const [c, v] of Object.entries(from.revenue)) into.revenue[c] = (into.revenue[c] || 0) + v;
}

/** Money paid in several currencies, added up in one (the portal's choice). */
function revenueIn(r: Record<string, number>, currency: string): number {
  return Object.entries(r).reduce((sum, [c, v]) => sum + convertMoney(v, c, currency), 0);
}

/** "£2,316.40", or "—" when nothing is paid yet. */
function revenueLabel(r: Record<string, number>, currency: string): string {
  const total = revenueIn(r, currency);
  return total > 0 ? money(total, currency) : "—";
}

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

export function EventSalesPage() {
  const { data, route, navigate, allEvents, eventById, eventInfo, tierName, passesFor, peopleOnPass, currency } = useAdmin();
  const selectedId = route.query.get("event") || "";

  const stats = useMemo(() => {
    const byEvent = new Map<string, Map<string, PackageStats>>();
    const bookingFor = new Map<string, Booking>();

    const pkgFor = (b: Booking) => {
      const event = eventById(b.eventId);
      let pkgs = byEvent.get(b.eventId);
      if (!pkgs) byEvent.set(b.eventId, (pkgs = new Map()));
      const id = tierKey(b);
      let p = pkgs.get(id);
      if (!p) pkgs.set(id, (p = emptyStats(id, tierName(b), peoplePerPass(b, event))));
      return p;
    };

    for (const b of data.bookings) {
      if (!bookingFor.has(b.eventId)) bookingFor.set(b.eventId, b);
      const p = pkgFor(b);
      const qty = Math.max(1, Number(b.quantity) || 1);
      if (b.bookingStatus === "cancelled") {
        p.cancelled += qty;
        continue;
      }
      p.orders += 1;
      p.tickets += qty;
      // People from the passes at the door when the order has them,
      // else from the package (a group ticket admits several).
      const passes = passesFor(b.id || "").filter((t) => t.status !== "cancelled");
      if (passes.length) {
        for (const t of passes) {
          const c = peopleOnPass(t);
          p.people += c.total;
          p.checkedIn += c.inside;
        }
      } else {
        p.people += qty * p.groupSize;
      }
      if (b.paymentMethod === "complimentary") p.complimentary += qty;
      else if (b.paymentStatus === "paid") {
        p.paid += qty;
        const { currency, amount } = paidAmount(b);
        p.revenue[currency] = (p.revenue[currency] || 0) + amount;
      } else p.unpaid += qty;
      if (b.source === "admin") p.portal += qty;
      else p.online += qty;
    }

    const list: EventStats[] = [];
    const ids = new Set(byEvent.keys());
    // Upcoming events that sell here show too, even before the first sale.
    for (const e of allEvents) if (e.ticketOptions?.length && eventInfo(e.id).upcoming) ids.add(e.id);

    for (const id of ids) {
      const event = eventById(id);
      const sold = byEvent.get(id) || new Map<string, PackageStats>();
      // The event's own packages first, in its order — unsold ones show as 0.
      const packages: PackageStats[] = [];
      for (const o of event?.ticketOptions || []) {
        const p = sold.get(o.id) || emptyStats(o.id, tierDisplayName(o.id, event), Math.max(1, Number(o.groupSize) || 1));
        p.name = o.name || p.name;
        packages.push(p);
        sold.delete(o.id);
      }
      packages.push(...[...sold.values()].sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name)));
      const total = emptyStats("total", "Total");
      for (const p of packages) addInto(total, p);
      list.push({ id, info: eventInfo(id, bookingFor.get(id)), packages, total });
    }

    // Soonest upcoming first, then the most recent past events.
    return list.sort((a, b) => {
      if (a.info.upcoming !== b.info.upcoming) return a.info.upcoming ? -1 : 1;
      const ta = a.info.timestamp ?? (a.info.upcoming ? Infinity : -Infinity);
      const tb = b.info.timestamp ?? (b.info.upcoming ? Infinity : -Infinity);
      return a.info.upcoming ? ta - tb : tb - ta;
    });
  }, [data.bookings, allEvents, eventById, eventInfo, tierName, passesFor, peopleOnPass]);

  const selected = selectedId ? stats.find((s) => s.id === selectedId) : undefined;

  const exportCsv = (events: EventStats[]) => {
    const rows: (string | number)[][] = [
      ["Event", "Event date", "Package", "Orders", "Tickets", "People", "Checked in", "Paid", "Complimentary", "Unpaid", "Online", "Issued in portal", "Cancelled", `Revenue (${currency})`],
    ];
    for (const ev of events) {
      for (const p of [...ev.packages, ev.total]) {
        rows.push([ev.info.title, ev.info.date, p.name, p.orders, p.tickets, p.people, p.checkedIn, p.paid, p.complimentary, p.unpaid, p.online, p.portal, p.cancelled, Math.round(revenueIn(p.revenue, currency) * 100) / 100]);
      }
    }
    const name = events.length === 1 ? `jazba-${events[0].info.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-packages` : "jazba-tickets-by-event";
    downloadCsv(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  if (selectedId) {
    return selected ? (
      <EventDetail ev={selected} onExport={() => exportCsv([selected])} />
    ) : (
      <div>
        <PageHeader title="Event not found" back={{ label: "All events", onClick: () => navigate("/admin/tickets/by-event") }} />
        <div className="bg-white border border-[#e4e4e4] p-10 text-center text-sm text-[#666]">This event has no tickets, or it no longer exists.</div>
      </div>
    );
  }
  return <EventList stats={stats} onExport={exportCsv} />;
}

// ── All events ─────────────────────────────────────────────────────────────

function EventList({ stats, onExport }: { stats: EventStats[]; onExport: (events: EventStats[]) => void }) {
  const { navigate, currency } = useAdmin();
  const upcomingCount = stats.filter((s) => s.info.upcoming).length;
  const [tab, setTab] = useState<"upcoming" | "past" | "all">(upcomingCount ? "upcoming" : "all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = stats.filter((s) => {
    if (tab === "upcoming" && !s.info.upcoming) return false;
    if (tab === "past" && s.info.upcoming) return false;
    return !q || [s.info.title, s.info.venue, s.info.date].some((v) => (v || "").toLowerCase().includes(q));
  });
  const paged = usePaged(filtered, [tab, q]);
  const open = (id: string) => navigate(`/admin/tickets/by-event?event=${encodeURIComponent(id)}`);

  return (
    <div>
      <PageHeader
        title="Tickets by event"
        sub="How many tickets each event has, split by package — VIP, Standard, group packages and the rest. Click an event for the full breakdown."
        actions={
          <button type="button" className={btnOutline} onClick={() => onExport(filtered)}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />
      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs
          tabs={[
            { id: "upcoming" as const, label: "Upcoming", count: upcomingCount },
            { id: "past" as const, label: "Past", count: stats.length - upcomingCount },
            { id: "all" as const, label: "All", count: stats.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search event or venue…" />
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>Event</th>
              <th className={`${thCls} text-right`}>Tickets</th>
              <th className={`${thCls} text-right`}>People</th>
              <th className={`${thCls} text-right`}>Checked in</th>
              <th className={thCls}>By package</th>
              <th className={thCls}>Revenue</th>
              <th className={thCls}></th>
            </>
          }
        >
          {paged.items.map((ev) => (
            <tr key={ev.id} className="hover:bg-[#fafafa] cursor-pointer" onClick={() => open(ev.id)}>
              <td className={tdCls}>
                <p className="font-bold truncate max-w-[280px]">{ev.info.title}</p>
                <p className="text-[11px] text-[#8a8a8a]">{[ev.info.date || "Date TBA", ev.info.venue].filter(Boolean).join(" · ")}</p>
              </td>
              <td className={`${tdCls} text-right font-bold text-base whitespace-nowrap`}>{ev.total.tickets.toLocaleString()}</td>
              <td className={`${tdCls} text-right whitespace-nowrap`}>{ev.total.people.toLocaleString()}</td>
              <td className={`${tdCls} text-right whitespace-nowrap`}>
                {ev.total.checkedIn.toLocaleString()}
                <span className="text-[#8a8a8a]">/{ev.total.people.toLocaleString()}</span>
              </td>
              <td className={tdCls}>
                <div className="flex flex-wrap gap-1 min-w-[200px] max-w-[420px]">
                  {ev.packages.map((p) => (
                    <span
                      key={p.id}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] leading-none whitespace-nowrap ${
                        p.tickets ? "bg-[#f2f2f2] text-black" : "bg-white border border-[#efefef] text-[#9a9a9a]"
                      }`}
                    >
                      {p.name} <b className="font-bold">{p.tickets}</b>
                    </span>
                  ))}
                  {ev.packages.length === 0 && <span className="text-[11px] text-[#8a8a8a]">No packages</span>}
                </div>
              </td>
              <td className={`${tdCls} font-bold whitespace-nowrap`}>{revenueLabel(ev.total.revenue, currency)}</td>
              <td className={`${tdCls} text-right`}>
                <ChevronRight className="w-4 h-4 text-[#8a8a8a] inline" />
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <EmptyRow
              colSpan={7}
              title={stats.length ? "No events match" : "No tickets yet"}
              sub={stats.length ? "Try another tab or search." : "Events show here once they have tickets."}
            />
          )}
        </DataTable>
        <Pagination paged={paged} total={stats.length} noun="events" />
      </div>
    </div>
  );
}

// ── One event ──────────────────────────────────────────────────────────────

function EventDetail({ ev, onExport }: { ev: EventStats; onExport: () => void }) {
  const { navigate, currency } = useAdmin();
  const t = ev.total;
  const hasGroups = ev.packages.some((p) => p.groupSize > 1 || p.people !== p.tickets);
  const ordersFor = (pkg?: string) =>
    navigate(`/admin/tickets?event=${encodeURIComponent(ev.id)}${pkg ? `&package=${encodeURIComponent(pkg)}` : ""}`);

  return (
    <div>
      <PageHeader
        back={{ label: "All events", onClick: () => navigate("/admin/tickets/by-event") }}
        title={ev.info.title}
        sub={[ev.info.date || "Date TBA", ev.info.time, ev.info.venue].filter(Boolean).join(" · ")}
        actions={
          <>
            <button type="button" className={btnOutline} onClick={onExport}>
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button type="button" className={btnOutline} onClick={() => ordersFor()}>
              <Ticket className="w-4 h-4" /> See all orders
            </button>
            <button type="button" className={btnPrimary} onClick={() => navigate(`/admin/tickets/new?event=${encodeURIComponent(ev.id)}`)}>
              <Send className="w-4 h-4" /> Issue ticket
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile dark label="Tickets" value={t.tickets.toLocaleString()} sub={plural(t.orders, "order")} icon={Ticket} />
        <StatTile label="People" value={t.people.toLocaleString()} sub={hasGroups ? "Group tickets admit several" : "One per ticket"} icon={Users} />
        <StatTile
          label="Checked in"
          value={
            <>
              {t.checkedIn.toLocaleString()}
              <span className="text-base text-[#8a8a8a]">/{t.people.toLocaleString()}</span>
            </>
          }
          sub={`${Math.max(0, t.people - t.checkedIn).toLocaleString()} still to come`}
          icon={ScanLine}
        />
        <StatTile label="Revenue" value={<span className="text-[22px]">{revenueLabel(t.revenue, currency)}</span>} sub={`${plural(t.paid, "paid ticket")}`} icon={Wallet} />
      </div>

      <div className="bg-white border border-[#e4e4e4]">
        <div className="px-4 py-3 border-b border-[#efefef] flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          <span className="text-sm font-bold">Tickets by package</span>
        </div>
        <DataTable
          head={
            <>
              <th className={thCls}>Package</th>
              <th className={`${thCls} text-right`}>Tickets</th>
              <th className={thCls}>Share</th>
              <th className={`${thCls} text-right`}>People</th>
              <th className={`${thCls} text-right`}>Checked in</th>
              <th className={`${thCls} text-right`}>Paid</th>
              <th className={`${thCls} text-right`}>Free</th>
              <th className={`${thCls} text-right`}>Unpaid</th>
              <th className={`${thCls} text-right`}>Orders</th>
              <th className={thCls}>Revenue</th>
              <th className={thCls}></th>
            </>
          }
        >
          {ev.packages.map((p) => {
            const share = t.tickets ? Math.round((p.tickets / t.tickets) * 100) : 0;
            return (
              <tr key={p.id} className="hover:bg-[#fafafa]">
                <td className={tdCls}>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-[11px] text-[#8a8a8a]">
                    {p.groupSize > 1 ? `Admits ${p.groupSize} per ticket` : "1 person per ticket"}
                    {p.portal > 0 && ` · ${p.portal} issued in portal`}
                  </p>
                </td>
                <td className={`${tdCls} text-right font-bold text-base`}>{p.tickets.toLocaleString()}</td>
                <td className={tdCls}>
                  <div className="flex items-center gap-2 min-w-[110px]">
                    <div className="flex-1 h-2 bg-[#f2f2f2]">
                      <div className="h-2 bg-black" style={{ width: `${share}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-[#555] w-8 text-right">{share}%</span>
                  </div>
                </td>
                <td className={`${tdCls} text-right`}>{p.people.toLocaleString()}</td>
                <td className={`${tdCls} text-right whitespace-nowrap`}>
                  {p.checkedIn.toLocaleString()}
                  <span className="text-[#8a8a8a]">/{p.people.toLocaleString()}</span>
                </td>
                <td className={`${tdCls} text-right`}>{p.paid.toLocaleString()}</td>
                <td className={`${tdCls} text-right`}>{p.complimentary.toLocaleString()}</td>
                <td className={`${tdCls} text-right ${p.unpaid ? "font-bold text-[#7a4f0e]" : ""}`}>{p.unpaid.toLocaleString()}</td>
                <td className={`${tdCls} text-right`}>{p.orders.toLocaleString()}</td>
                <td className={`${tdCls} font-bold whitespace-nowrap`}>{revenueLabel(p.revenue, currency)}</td>
                <td className={`${tdCls} text-right whitespace-nowrap`}>
                  {p.orders > 0 && (
                    <button type="button" onClick={() => ordersFor(p.id)} className="text-[11px] font-bold underline cursor-pointer">
                      See orders
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {ev.packages.length === 0 && <EmptyRow colSpan={11} title="No packages yet" />}
          {ev.packages.length > 0 && (
            <tr className="bg-[#fafafa] font-bold border-t-2 border-black">
              <td className={tdCls}>Total</td>
              <td className={`${tdCls} text-right text-base`}>{t.tickets.toLocaleString()}</td>
              <td className={tdCls}></td>
              <td className={`${tdCls} text-right`}>{t.people.toLocaleString()}</td>
              <td className={`${tdCls} text-right whitespace-nowrap`}>
                {t.checkedIn.toLocaleString()}/{t.people.toLocaleString()}
              </td>
              <td className={`${tdCls} text-right`}>{t.paid.toLocaleString()}</td>
              <td className={`${tdCls} text-right`}>{t.complimentary.toLocaleString()}</td>
              <td className={`${tdCls} text-right`}>{t.unpaid.toLocaleString()}</td>
              <td className={`${tdCls} text-right`}>{t.orders.toLocaleString()}</td>
              <td className={`${tdCls} whitespace-nowrap`}>{revenueLabel(t.revenue, currency)}</td>
              <td className={tdCls}></td>
            </tr>
          )}
        </DataTable>
        <div className="px-4 py-3 border-t border-[#efefef] text-[11px] text-[#666] space-y-1">
          <p>
            <b className="text-black">{plural(t.online, "ticket")}</b> bought online · <b className="text-black">{plural(t.portal, "ticket")}</b> issued in
            the portal.
            {t.cancelled > 0 && ` ${plural(t.cancelled, "ticket")} on cancelled orders ${t.cancelled === 1 ? "is" : "are"} not counted.`}
          </p>
          <p>
            Free = complimentary tickets. Unpaid = orders still marked pending or failed. Revenue counts paid orders only, shown in {currency} at
            the checkout&rsquo;s rates ($1 = £0.78 = PKR 280).
          </p>
        </div>
      </div>
    </div>
  );
}
