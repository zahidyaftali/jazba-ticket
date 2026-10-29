import React, { useMemo, useState } from "react";
import {
  DollarSign,
  Ticket,
  ShoppingBag,
  CalendarDays,
  Users,
  Plus,
  ScanLine,
  Trash2,
  ArrowRight,
  Send,
} from "lucide-react";
import { purgeCollection } from "../../../services/backendService";
import { useAdmin, byNewest } from "../AdminContext";
import {
  Avatar,
  PAYMENT_STATUS,
  Panel,
  StatTile,
  StatusBadge,
  btnOutline,
  btnPrimary,
  compact,
  fmtDate,
  money,
  overline,
  timeAgo,
} from "../ui";

const DAY = 86_400_000;

export default function DashboardPage() {
  const { data, analytics, allEvents, eventInfo, customerFor, tierName, amountLabel, navigate, openBooking, admin, notify, fail, reload } =
    useAdmin();
  const [purging, setPurging] = useState(false);
  const { users, bookings, payments, tickets, artists } = data;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const upcomingEvents = useMemo(
    () =>
      allEvents
        .map((e) => ({ e, info: eventInfo(e.id) }))
        .filter(({ e, info }) => info.upcoming && (e.source === "wordpress" || e.status === "published"))
        .sort((a, b) => (a.info.timestamp ?? Infinity) - (b.info.timestamp ?? Infinity)),
    [allEvents, eventInfo],
  );

  const soldByEvent = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      if (b.bookingStatus === "cancelled") continue;
      m.set(b.eventId, (m.get(b.eventId) || 0) + (Number(b.quantity) || 1));
    }
    return m;
  }, [bookings]);

  const pendingCount = bookings.filter((b) => b.paymentStatus === "pending").length;
  const failedCount = bookings.filter((b) => b.paymentStatus === "failed").length;
  const monthAgo = Date.now() - 30 * DAY;
  const newUsers = users.filter((u) => new Date(u.createdAt).getTime() > monthAgo).length;
  const recent = [...bookings].sort(byNewest).slice(0, 6);

  const handlePurgeTransactions = async () => {
    if (
      !window.confirm(
        "Delete ALL orders, payments and tickets? This permanently removes them from the database and cannot be undone.",
      )
    )
      return;
    setPurging(true);
    try {
      let removed = 0;
      removed += await purgeCollection("bookings");
      removed += await purgeCollection("payments");
      removed += await purgeCollection("tickets");
      notify(`Deleted ${removed} record(s).`);
    } catch (err) {
      console.error("Purge failed:", err);
      fail("Failed to delete — make sure you are signed in as an admin.");
    } finally {
      setPurging(false);
      reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting + quick actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className={`${overline} text-[#8a8a8a]`}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-[28px] leading-[1.05] mt-1.5">
            {greeting}, {admin.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-[#666] mt-1.5">
            Everything on the platform — events, artists, orders, users and revenue — managed from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnOutline} onClick={() => navigate("/admin/tickets/check-in")}>
            <ScanLine className="w-4 h-4" /> Check-in
          </button>
          <button type="button" className={btnOutline} onClick={() => navigate("/admin/events/new")}>
            <Plus className="w-4 h-4" /> Create event
          </button>
          <button type="button" className={btnPrimary} onClick={() => navigate("/admin/tickets/new")}>
            <Send className="w-4 h-4" /> Issue ticket
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <div className="col-span-2 md:col-span-1 xl:col-span-2">
          <StatTile
            dark
            label="Total revenue"
            value={<span className="text-[40px] sm:text-[48px]">{money(analytics.totalRevenue)}</span>}
            sub={`USD equivalent · ${analytics.paidOrders} paid order${analytics.paidOrders === 1 ? "" : "s"}`}
            icon={DollarSign}
            onClick={() => navigate("/admin/orders")}
          />
        </div>
        <StatTile
          label="Tickets sold"
          value={compact(analytics.totalTicketsSold)}
          sub="Issued & verified"
          icon={Ticket}
          onClick={() => navigate("/admin/tickets")}
        />
        <StatTile
          label="Orders"
          value={compact(bookings.length)}
          sub={pendingCount ? `${pendingCount} awaiting payment` : "All settled"}
          icon={ShoppingBag}
          onClick={() => navigate("/admin/orders")}
        />
        <StatTile
          label="Upcoming events"
          value={compact(upcomingEvents.length)}
          sub={`${data.events.length + data.wpEvents.length} listed in total`}
          icon={CalendarDays}
          onClick={() => navigate("/admin/events")}
        />
        <StatTile
          label="Registered users"
          value={compact(users.length)}
          sub={newUsers ? `${newUsers} joined in the last 30 days` : "Across all roles"}
          icon={Users}
          onClick={() => navigate("/admin/users")}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2">
          <SalesChart />
        </div>

        {/* Upcoming events */}
        <Panel
          title="Upcoming events"
          sub="Next on the calendar, with tickets sold so far."
          action={
            <button
              type="button"
              onClick={() => navigate("/admin/tickets/upcoming")}
              className="text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer shrink-0"
            >
              Tickets <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
          bodyClassName=""
        >
          {upcomingEvents.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-[#8a8a8a] font-bold">No upcoming events.</p>
          ) : (
            <ul className="divide-y divide-[#f2f2f2]">
              {upcomingEvents.slice(0, 6).map(({ e, info }) => {
                const ts = info.timestamp ? new Date(info.timestamp) : null;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/tickets/upcoming?event=${encodeURIComponent(e.id)}`)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#fafafa] text-left cursor-pointer"
                    >
                      <div className="w-11 h-11 bg-black text-white flex flex-col items-center justify-center shrink-0">
                        <span className="text-[15px] font-bold leading-none">{ts ? ts.getDate() : "—"}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#ffed00] mt-0.5">
                          {ts ? ts.toLocaleDateString("en-GB", { month: "short" }) : "TBA"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold truncate">{e.title}</p>
                        <p className="text-[11px] text-[#8a8a8a] truncate">{info.venue || "Venue TBA"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold">{soldByEvent.get(e.id) || 0}</p>
                        <p className="text-[10px] text-[#8a8a8a]">sold</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Recent orders */}
      <Panel
        title="Recent orders"
        sub="The latest tickets bought online or issued in the portal."
        action={
          <button
            type="button"
            onClick={() => navigate("/admin/orders")}
            className="text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer shrink-0"
          >
            All orders <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
        bodyClassName=""
      >
        {recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-[#8a8a8a] font-bold">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-[#f2f2f2] text-[13px]">
                {recent.map((b) => {
                  const c = customerFor(b);
                  const info = eventInfo(b.eventId, b);
                  return (
                    <tr key={b.id} onClick={() => openBooking(b.id!)} className="hover:bg-[#fafafa] cursor-pointer">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <Avatar src={c.photo} name={c.name} size={32} />
                          <div className="min-w-0">
                            <p className="font-bold truncate">{c.name}</p>
                            <p className="text-[11px] text-[#8a8a8a] truncate">{c.email || "No email on file"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[200px]">
                        <p className="font-bold truncate max-w-[280px]">{info.title}</p>
                        <p className="text-[11px] text-[#8a8a8a]">
                          {b.quantity || 1} × {tierName(b)}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-bold whitespace-nowrap">{amountLabel(b)}</td>
                      <td className="py-3 px-4">
                        <StatusBadge map={PAYMENT_STATUS} value={b.paymentStatus} />
                      </td>
                      <td className="py-3 px-5 text-right text-[11px] text-[#8a8a8a] whitespace-nowrap">{timeAgo(b.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Users by role */}
        <Panel title="Users by role" sub="Everyone with an account on the site.">
          <div className="space-y-3.5">
            {[
              { role: "Administrators", count: users.filter((u) => u.role === "admin").length, color: "#000000" },
              { role: "Organisers", count: users.filter((u) => u.role === "organizer").length, color: "#333333" },
              { role: "Artists", count: users.filter((u) => u.role === "artist").length, color: "#666666" },
              { role: "Customers", count: users.filter((u) => u.role === "user").length, color: "#8a8a8a" },
            ].map((item) => {
              const pct = users.length ? (item.count / users.length) * 100 : 0;
              return (
                <div key={item.role} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-[#222]">
                    <span>{item.role}</span>
                    <span>
                      {item.count} users ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#f2f2f2] h-2">
                    <div className="h-full" style={{ width: `${pct}%`, background: item.color }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-[#8a8a8a] pt-1">
              {artists.length} artist profile{artists.length === 1 ? "" : "s"} · {data.organizers.length} organiser profile
              {data.organizers.length === 1 ? "" : "s"}
            </p>
          </div>
        </Panel>

        {/* Sales at a glance */}
        <Panel title="Sales at a glance" sub="Order health across every channel.">
          <dl className="divide-y divide-[#f2f2f2] text-sm">
            {[
              {
                k: "Average order value",
                v: `${money(analytics.paidOrders ? analytics.totalRevenue / analytics.paidOrders : 0)} per order`,
              },
              { k: "Paid bookings", v: bookings.filter((b) => b.paymentStatus === "paid").length },
              { k: "Pending bookings", v: pendingCount },
              { k: "Failed payments", v: failedCount },
              { k: "Issued in the portal", v: bookings.filter((b) => b.source === "admin").length },
              { k: "Passes checked in", v: `${tickets.filter((t) => t.status === "scanned").length} of ${tickets.length}` },
            ].map((row) => (
              <div key={row.k} className="flex justify-between py-2.5 first:pt-0 last:pb-0">
                <dt className="text-[#666]">{row.k}</dt>
                <dd className="font-bold text-black">{row.v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      {/* Demo-data cleanup — analytics above always reflect live counts */}
      {(bookings.length > 0 || payments.length > 0 || tickets.length > 0) && (
        <div className="bg-white border border-[#e4e4e4] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-sm text-black">Demo data cleanup</h3>
            <p className="text-xs text-[#8a8a8a] font-medium mt-1">
              Remove test orders, payments and tickets so revenue and sales figures only count real transactions.
            </p>
          </div>
          <button type="button" onClick={handlePurgeTransactions} disabled={purging} className={btnOutline}>
            <Trash2 className="w-4 h-4" />
            {purging
              ? "Deleting…"
              : `Clear orders, payments & tickets (${bookings.length + payments.length + tickets.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

/** Paid revenue per day over the last 30 days — single series, black columns. */
function SalesChart() {
  const { data } = useAdmin();
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = today.getTime() - 29 * DAY;
    const rows = Array.from({ length: 30 }, (_, i) => ({ t: start + i * DAY, revenue: 0, orders: 0, tickets: 0 }));
    for (const b of data.bookings) {
      if (b.paymentStatus !== "paid") continue;
      const t = new Date(b.createdAt).getTime();
      if (isNaN(t) || t < start) continue;
      const idx = Math.floor((t - start) / DAY);
      if (idx < 0 || idx >= 30) continue;
      rows[idx].revenue += Number(b.amount ?? b.pricePaid) || 0;
      rows[idx].orders += 1;
      rows[idx].tickets += Number(b.quantity) || 1;
    }
    return rows;
  }, [data.bookings]);

  const total = days.reduce((s, d) => s + d.revenue, 0);
  const totalTickets = days.reduce((s, d) => s + d.tickets, 0);
  const max = Math.max(...days.map((d) => d.revenue), 0);
  // Round the top of the scale up to a clean number.
  const niceMax = (() => {
    if (max <= 0) return 100;
    const mag = Math.pow(10, Math.floor(Math.log10(max)));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= max) || 10;
    return step * mag;
  })();
  const ticks = [niceMax, niceMax / 2, 0];
  const active = hover !== null ? days[hover] : null;
  const label = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <Panel
      title="Sales — last 30 days"
      sub={`${money(total)} from ${totalTickets} ticket${totalTickets === 1 ? "" : "s"} · paid orders, USD equivalent`}
      action={
        <div className="flex border border-[#e4e4e4] shrink-0">
          {(["Chart", "Table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAsTable(v === "Table")}
              className={`px-3 py-1.5 text-[11px] font-bold cursor-pointer ${
                (v === "Table") === asTable ? "bg-black text-white" : "text-[#666] hover:text-black"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      }
    >
      {asTable ? (
        <div className="max-h-[260px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left">
                <th className="py-2 text-[10px] font-bold tracking-[0.14em] uppercase text-[#666]">Day</th>
                <th className="py-2 text-[10px] font-bold tracking-[0.14em] uppercase text-[#666] text-right">Orders</th>
                <th className="py-2 text-[10px] font-bold tracking-[0.14em] uppercase text-[#666] text-right">Tickets</th>
                <th className="py-2 text-[10px] font-bold tracking-[0.14em] uppercase text-[#666] text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f2f2] tabular-nums">
              {[...days].reverse().map((d) => (
                <tr key={d.t} className={d.revenue ? "" : "text-[#9a9a9a]"}>
                  <td className="py-2">{fmtDate(new Date(d.t).toISOString())}</td>
                  <td className="py-2 text-right">{d.orders}</td>
                  <td className="py-2 text-right">{d.tickets}</td>
                  <td className="py-2 text-right font-bold">{money(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <div className="flex gap-3">
            {/* Y axis */}
            <div className="flex flex-col justify-between h-[220px] text-[10px] text-[#8a8a8a] font-bold tabular-nums text-right w-10 shrink-0 -mt-1.5 pb-0">
              {ticks.map((t) => (
                <span key={t}>{t === 0 ? "0" : `$${compact(t)}`}</span>
              ))}
            </div>
            <div className="relative flex-1 min-w-0">
              {/* Gridlines */}
              <div className="absolute inset-x-0 top-0 h-[220px] flex flex-col justify-between pointer-events-none">
                {ticks.map((t) => (
                  <div key={t} className={`h-px ${t === 0 ? "bg-[#c4c4c4]" : "bg-[#efefef]"}`} />
                ))}
              </div>
              {/* Columns */}
              <div className="relative h-[220px] flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
                {days.map((d, i) => {
                  const h = d.revenue > 0 ? Math.max(3, (d.revenue / niceMax) * 220) : 0;
                  const dim = hover !== null && hover !== i;
                  return (
                    <div
                      key={d.t}
                      className="flex-1 h-full flex items-end justify-center cursor-default"
                      onMouseEnter={() => setHover(i)}
                    >
                      <div
                        className="w-full max-w-[24px] transition-colors"
                        style={{
                          height: h,
                          background: dim ? "#d4d4d4" : "#000000",
                          borderRadius: "4px 4px 0 0",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* X axis */}
              <div className="flex justify-between text-[10px] text-[#8a8a8a] font-bold mt-2">
                <span>{label(days[0].t)}</span>
                <span>{label(days[14].t)}</span>
                <span>Today</span>
              </div>

              {/* Tooltip */}
              {active && hover !== null && (
                <div
                  className="absolute top-2 z-10 bg-black text-white px-3 py-2 pointer-events-none whitespace-nowrap"
                  style={{
                    left: `${((hover + 0.5) / days.length) * 100}%`,
                    transform: `translateX(${hover > 22 ? "-100%" : hover < 7 ? "0" : "-50%"})`,
                  }}
                >
                  <p className="text-[10px] font-bold text-white/60">{fmtDate(new Date(active.t).toISOString())}</p>
                  <p className="text-sm font-bold">{money(active.revenue)}</p>
                  <p className="text-[10px] text-white/70">
                    {active.orders} order{active.orders === 1 ? "" : "s"} · {active.tickets} ticket{active.tickets === 1 ? "" : "s"}
                  </p>
                </div>
              )}
            </div>
          </div>
          {total === 0 && (
            <p className="absolute inset-x-0 top-[90px] text-center text-xs font-bold text-[#8a8a8a]">
              No paid orders in the last 30 days.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
