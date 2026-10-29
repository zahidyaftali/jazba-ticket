import React, { useMemo, useState } from "react";
import { Send, Printer, Eye, Download, Mail, ScanLine, Loader2, CircleCheck, TriangleAlert } from "lucide-react";
import { Booking, TicketPass, updateTicketStatus } from "../../../services/backendService";
import { useAdmin, byNewest } from "../AdminContext";
import { useEmailTicket } from "../BookingDrawer";
import {
  Avatar,
  Badge,
  BOOKING_STATUS,
  DataTable,
  EmptyRow,
  FilterTabs,
  IconButton,
  PageHeader,
  PASS_STATUS,
  PAYMENT_STATUS,
  SearchInput,
  StatusBadge,
  TableFooter,
  Toolbar,
  btnOutline,
  btnPrimary,
  downloadCsv,
  fmtDate,
  fmtDateTime,
  overline,
  selectCls,
  tdCls,
  thCls,
} from "../ui";

type StatusFilter = "all" | "active" | "completed" | "cancelled";

/** All tickets / Upcoming — one row per ticket order. */
export function TicketsPage({ view }: { view: "all" | "upcoming" }) {
  const { data, route, navigate, eventInfo, customerFor, tierName, amountLabel, openBooking, printTicket, ticketDataFor, passesFor, notify, fail } =
    useAdmin();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [source, setSource] = useState<"all" | "online" | "admin">("all");
  const [eventFilter, setEventFilter] = useState(route.query.get("event") || "");
  const { send, sending } = useEmailTicket();
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Rows with their resolved event + customer, scoped to the view.
  const rows = useMemo(() => {
    const list = data.bookings.map((b) => ({ b, info: eventInfo(b.eventId, b), c: customerFor(b) }));
    if (view === "upcoming") {
      return list
        .filter((r) => r.info.upcoming)
        .sort((a, b) => (a.info.timestamp ?? Infinity) - (b.info.timestamp ?? Infinity) || byNewest(a.b, b.b));
    }
    return list.sort((a, b) => byNewest(a.b, b.b));
  }, [data.bookings, eventInfo, customerFor, view]);

  const eventsInView = useMemo(() => {
    const m = new Map<string, { id: string; title: string; ts: number | null; date: string; venue: string; image: string; sold: number; orders: number; checkedIn: number; passes: number; revenue: number }>();
    for (const r of rows) {
      const cur = m.get(r.b.eventId) || {
        id: r.b.eventId,
        title: r.info.title,
        ts: r.info.timestamp,
        date: r.info.date,
        venue: r.info.venue,
        image: r.info.image,
        sold: 0,
        orders: 0,
        checkedIn: 0,
        passes: 0,
        revenue: 0,
      };
      cur.orders += 1;
      if (r.b.bookingStatus !== "cancelled") cur.sold += Number(r.b.quantity) || 1;
      if (r.b.paymentStatus === "paid") cur.revenue += Number(r.b.amount ?? r.b.pricePaid) || 0;
      const passes = passesFor(r.b.id || "").filter((p) => p.status !== "cancelled");
      cur.passes += passes.length;
      cur.checkedIn += passes.filter((p) => p.status === "scanned").length;
      m.set(r.b.eventId, cur);
    }
    return [...m.values()].sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity));
  }, [rows, passesFor]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(({ b, info, c }) => {
    if (status !== "all" && (b.bookingStatus || "active") !== status) return false;
    if (source === "admin" && b.source !== "admin") return false;
    if (source === "online" && b.source === "admin") return false;
    if (eventFilter && b.eventId !== eventFilter) return false;
    if (!q) return true;
    return [b.orderId, b.bookingNumber, b.id, c.name, c.email, c.phone, info.title, tierName(b)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const count = (s: StatusFilter) => rows.filter((r) => s === "all" || (r.b.bookingStatus || "active") === s).length;

  const quickEmail = async (b: Booking, email: string) => {
    if (!email) {
      openBooking(b.id!);
      return;
    }
    if (!window.confirm(`Email this ticket to ${email}?`)) return;
    setSendingId(b.id || null);
    const res = await send(b, email);
    setSendingId(null);
    if (res.ok) notify(`Ticket emailed to ${email}.`);
    else fail(res.error || "The email could not be sent.");
  };

  const exportCsv = () => {
    downloadCsv(`jazba-tickets-${view}-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Order", "Created", "Holder", "Email", "Phone", "Event", "Event date", "Package", "Quantity", "Amount", "Payment", "Status", "Source", "Emailed"],
      ...filtered.map(({ b, info, c }) => [
        b.orderId || b.bookingNumber || b.id,
        fmtDateTime(b.createdAt),
        c.name,
        c.email,
        c.phone,
        info.title,
        info.date,
        tierName(b),
        b.quantity || 1,
        amountLabel(b),
        b.paymentStatus,
        b.bookingStatus || "active",
        b.source === "admin" ? `Portal (${b.issuedBy || "admin"})` : "Online checkout",
        b.emailedAt ? fmtDateTime(b.emailedAt) : "",
      ]),
    ]);
  };

  const selectedEvent = eventFilter ? eventsInView.find((e) => e.id === eventFilter) : undefined;

  return (
    <div>
      <PageHeader
        title={view === "upcoming" ? "Upcoming tickets" : "All tickets"}
        sub={
          view === "upcoming"
            ? "Tickets for events that haven't happened yet — sorted by event date."
            : "Every ticket order — bought online or issued by you in the portal."
        }
        actions={
          <>
            <button type="button" className={btnOutline} onClick={exportCsv}>
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button type="button" className={btnPrimary} onClick={() => navigate("/admin/tickets/new")}>
              <Send className="w-4 h-4" /> Issue ticket
            </button>
          </>
        }
      />

      {/* Upcoming: one card per event */}
      {view === "upcoming" && eventsInView.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 mb-6">
          {eventsInView.map((ev) => {
            const active = eventFilter === ev.id;
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => setEventFilter(active ? "" : ev.id)}
                className={`text-left bg-white border flex cursor-pointer transition-colors ${
                  active ? "border-black outline outline-1 outline-black" : "border-[#e4e4e4] hover:border-black"
                }`}
              >
                {ev.image ? (
                  <img src={ev.image} alt="" className="w-24 object-cover shrink-0 bg-[#f2f2f2]" />
                ) : (
                  <div className="w-24 bg-[#f2f2f2] shrink-0" />
                )}
                <div className="p-4 min-w-0 flex-1">
                  <span className={`${overline} text-[#8a8a8a]`}>{ev.date || "Date TBA"}</span>
                  <p className="font-bold text-sm leading-tight mt-1 line-clamp-2">{ev.title}</p>
                  <div className="flex gap-5 mt-3">
                    <div>
                      <p className="text-lg font-bold leading-none">{ev.sold}</p>
                      <p className="text-[10px] text-[#8a8a8a] mt-1">tickets</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-none">
                        {ev.checkedIn}
                        <span className="text-xs text-[#8a8a8a]">/{ev.passes}</span>
                      </p>
                      <p className="text-[10px] text-[#8a8a8a] mt-1">checked in</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-none">{ev.orders}</p>
                      <p className="text-[10px] text-[#8a8a8a] mt-1">orders</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs
          tabs={[
            { id: "all" as StatusFilter, label: "All", count: count("all") },
            { id: "active" as StatusFilter, label: "Active", count: count("active") },
            { id: "completed" as StatusFilter, label: "Completed", count: count("completed") },
            { id: "cancelled" as StatusFilter, label: "Cancelled", count: count("cancelled") },
          ]}
          value={status}
          onChange={setStatus}
        />
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search order, name, email, event…" />
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className={`${selectCls} max-w-[240px]`}>
            <option value="">All events</option>
            {eventsInView.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value as any)} className={selectCls}>
            <option value="all">All sources</option>
            <option value="online">Online checkout</option>
            <option value="admin">Issued in the portal</option>
          </select>
          {selectedEvent && (
            <button type="button" onClick={() => setEventFilter("")} className="text-[11px] font-bold underline cursor-pointer">
              Clear event filter
            </button>
          )}
        </Toolbar>

        <DataTable
          head={
            <>
              <th className={thCls}>Ticket</th>
              <th className={thCls}>Holder</th>
              <th className={thCls}>Event</th>
              <th className={thCls}>Package</th>
              <th className={thCls}>Amount</th>
              <th className={thCls}>Status</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </>
          }
        >
          {filtered.map(({ b, info, c }) => (
            <tr key={b.id} className="hover:bg-[#fafafa]">
              <td className={`${tdCls} whitespace-nowrap`}>
                <button type="button" onClick={() => openBooking(b.id!)} className="text-left cursor-pointer group">
                  <span className="font-bold tracking-wide group-hover:underline">{b.orderId || b.bookingNumber || b.id}</span>
                  <span className="block text-[11px] text-[#8a8a8a]">{fmtDate(b.createdAt)}</span>
                </button>
              </td>
              <td className={tdCls}>
                <div className="flex items-center gap-2.5 min-w-[180px]">
                  <Avatar src={c.photo} name={c.name} size={30} />
                  <div className="min-w-0">
                    <p className="font-bold truncate max-w-[200px]">{c.name}</p>
                    <p className="text-[11px] text-[#8a8a8a] truncate max-w-[200px]">{c.email || "No email on file"}</p>
                  </div>
                </div>
              </td>
              <td className={tdCls}>
                <p className="font-bold truncate max-w-[260px]">{info.title}</p>
                <p className="text-[11px] text-[#8a8a8a]">{info.date || "Date TBA"}</p>
              </td>
              <td className={`${tdCls} whitespace-nowrap`}>
                {b.quantity || 1} × {tierName(b)}
                {b.source === "admin" && <span className="block text-[11px] text-[#8a8a8a]">Issued in portal</span>}
              </td>
              <td className={`${tdCls} font-bold whitespace-nowrap`}>{amountLabel(b)}</td>
              <td className={tdCls}>
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge map={PAYMENT_STATUS} value={b.paymentStatus} />
                  {(b.bookingStatus || "active") !== "active" && <StatusBadge map={BOOKING_STATUS} value={b.bookingStatus} />}
                </div>
              </td>
              <td className={`${tdCls} text-right`}>
                <div className="flex items-center justify-end">
                  {b.emailedAt && (
                    <span title={`Emailed ${fmtDateTime(b.emailedAt)} to ${b.emailedTo}`} className="mr-1">
                      <Badge tone="positive" dot={false}>
                        <Mail className="w-3 h-3" /> Sent
                      </Badge>
                    </span>
                  )}
                  <IconButton title={c.email ? `Email ticket to ${c.email}` : "Email ticket"} onClick={() => quickEmail(b, c.email)} disabled={sending && sendingId === b.id}>
                    {sending && sendingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </IconButton>
                  <IconButton title="Print ticket" onClick={() => printTicket(ticketDataFor(b))}>
                    <Printer className="w-4 h-4" />
                  </IconButton>
                  <IconButton title="View details" onClick={() => openBooking(b.id!)}>
                    <Eye className="w-4 h-4" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <EmptyRow
              colSpan={7}
              title={rows.length === 0 ? (view === "upcoming" ? "No tickets for upcoming events" : "No tickets yet") : "No tickets match your filters"}
              sub={rows.length === 0 ? "Tickets appear here when someone buys online or you issue one." : "Try a different search or clear the filters."}
              action={
                rows.length === 0 ? (
                  <button type="button" className={btnPrimary} onClick={() => navigate("/admin/tickets/new")}>
                    <Send className="w-4 h-4" /> Issue a ticket
                  </button>
                ) : undefined
              }
            />
          )}
        </DataTable>
        <TableFooter shown={filtered.length} total={rows.length} noun="tickets" />
      </div>
    </div>
  );
}

/** Door check-in: look up a code, then check passes in. Also lists every pass. */
export function CheckInPage() {
  const { data, bookingById, eventInfo, customerFor, tierName, passesFor, openBooking, notify, fail, reload } = useAdmin();
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<{ booking?: Booking; passes: TicketPass[] } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "scanned" | "cancelled">("all");
  const [eventFilter, setEventFilter] = useState("");

  const findCode = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toLowerCase();
    if (!c) return;
    setNotFound(false);
    // A single pass: its ticket number or QR value.
    const pass = data.tickets.find((t) => t.ticketNumber.toLowerCase() === c || (t.qrCode || "").toLowerCase() === c);
    if (pass) {
      setLookup({ booking: bookingById(pass.bookingId), passes: [pass] });
      return;
    }
    // A whole order: its order number, booking id or barcode.
    const booking = data.bookings.find((b) =>
      [b.orderId, b.bookingNumber, b.id, b.barCode, b.qrCode].some((v) => v && String(v).toLowerCase() === c),
    );
    if (booking) {
      setLookup({ booking, passes: passesFor(booking.id || "") });
      return;
    }
    setLookup(null);
    setNotFound(true);
  };

  // Keep the lookup card in sync after a check-in reloads the data.
  const live = lookup
    ? {
        booking: lookup.booking ? bookingById(lookup.booking.id || "") || lookup.booking : undefined,
        passes: lookup.passes.map((p) => data.tickets.find((t) => t.id === p.id) || p),
      }
    : null;

  const setPass = async (ids: string[], next: "active" | "scanned" | "cancelled") => {
    setBusy(ids.join(","));
    try {
      for (const id of ids) await updateTicketStatus(id, next);
      notify(next === "scanned" ? `${ids.length} checked in.` : `Ticket${ids.length > 1 ? "s" : ""} updated.`);
      await reload();
    } catch {
      fail("Failed to update the ticket.");
    } finally {
      setBusy(null);
    }
  };

  const rows = useMemo(
    () =>
      data.tickets
        .map((t) => {
          const b = bookingById(t.bookingId);
          return { t, b, info: eventInfo(t.eventId, b), c: b ? customerFor(b) : null };
        })
        .sort((a, b) => (b.b?.createdAt || "").localeCompare(a.b?.createdAt || "") || a.t.ticketNumber.localeCompare(b.t.ticketNumber, undefined, { numeric: true })),
    [data.tickets, bookingById, eventInfo, customerFor],
  );
  const eventsWithPasses = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.t.eventId, r.info.title);
    return [...m.entries()];
  }, [rows]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(({ t, info, c }) => {
    if (status !== "all" && t.status !== status) return false;
    if (eventFilter && t.eventId !== eventFilter) return false;
    if (!q) return true;
    return [t.ticketNumber, t.bookingId, info.title, c?.name, c?.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });
  const count = (s: typeof status) => rows.filter((r) => s === "all" || r.t.status === s).length;

  const exportCsv = () =>
    downloadCsv(`jazba-passes-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Ticket no.", "Order", "Event", "Holder", "Email", "Status", "Checked in at"],
      ...filtered.map(({ t, info, c }) => [t.ticketNumber, t.bookingId, info.title, c?.name || "", c?.email || "", PASS_STATUS[t.status]?.label || t.status, t.scannedAt ? fmtDateTime(t.scannedAt) : ""]),
    ]);

  const lookupInfo = live?.booking ? eventInfo(live.booking.eventId, live.booking) : live?.passes[0] ? eventInfo(live.passes[0].eventId) : null;
  const lookupCustomer = live?.booking ? customerFor(live.booking) : null;
  const openIds = live ? live.passes.filter((p) => p.status === "active").map((p) => p.id!) : [];

  return (
    <div>
      <PageHeader
        title="Check-in"
        sub="Scan or type a ticket code at the door to admit guests. Every admission pass is listed below."
        actions={
          <button type="button" className={btnOutline} onClick={exportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      {/* Lookup band */}
      <div className="bg-black text-white p-5 sm:p-6 mb-6">
        <form onSubmit={findCode} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className={`${overline} text-white/60 block mb-2`}>Ticket or order code</label>
            <div className="relative">
              <ScanLine className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ffed00]" />
              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. TT-482913 or JZ-120394-T2"
                className="w-full bg-transparent pl-8 pr-2 py-3 text-lg font-bold tracking-wide text-white placeholder-white/35 outline-none"
              />
            </div>
          </div>
          <button type="submit" className="py-3 px-6 bg-[#ffed00] hover:bg-[#e6d200] text-black text-sm font-bold cursor-pointer">
            Find ticket
          </button>
        </form>

        {notFound && (
          <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#ffb4b4]">
            <TriangleAlert className="w-4 h-4" /> No ticket or order matches “{code.trim()}”.
          </div>
        )}

        {live && lookupInfo && (
          <div className="mt-5 bg-white text-black p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0">
                <span className={`${overline} text-[#8a8a8a]`}>{lookupInfo.date || "Date TBA"}</span>
                <p className="font-display font-bold text-lg leading-tight mt-1">{lookupInfo.title}</p>
                {lookupCustomer && (
                  <p className="text-sm mt-1">
                    <span className="font-bold">{lookupCustomer.name}</span>
                    {lookupCustomer.email && <span className="text-[#666]"> · {lookupCustomer.email}</span>}
                  </p>
                )}
                {live.booking && (
                  <p className="text-xs text-[#666] mt-1">
                    {live.booking.quantity || 1} × {tierName(live.booking)} · Order {live.booking.orderId || live.booking.bookingNumber}
                    {live.booking.paymentStatus !== "paid" && (
                      <span className="ml-2">
                        <StatusBadge map={PAYMENT_STATUS} value={live.booking.paymentStatus} />
                      </span>
                    )}
                  </p>
                )}
              </div>
              {openIds.length > 1 && (
                <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => setPass(openIds, "scanned")}>
                  <CircleCheck className="w-4 h-4" /> Check in all {openIds.length}
                </button>
              )}
            </div>
            <div className="mt-4 border border-[#efefef] divide-y divide-[#f2f2f2]">
              {live.passes.length === 0 && <p className="px-3 py-3 text-xs text-[#8a8a8a]">This order has no admission passes.</p>}
              {live.passes.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 flex-wrap">
                  <span className="font-bold text-sm flex-1 min-w-[140px]">{p.ticketNumber}</span>
                  <StatusBadge map={PASS_STATUS} value={p.status} />
                  {p.status === "scanned" && p.scannedAt && (
                    <span className="text-[11px] text-[#8a8a8a]">at {fmtDateTime(p.scannedAt)}</span>
                  )}
                  {busy?.includes(p.id!) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : p.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => setPass([p.id!], "scanned")}
                      className="text-xs font-bold px-3 py-2 bg-black text-white hover:bg-neutral-800 cursor-pointer"
                    >
                      Check in
                    </button>
                  ) : p.status === "scanned" ? (
                    <span className="text-xs font-bold text-[#7a4f0e]">Already admitted</span>
                  ) : (
                    <span className="text-xs font-bold text-[#7a2f2f]">Do not admit</span>
                  )}
                </div>
              ))}
            </div>
            {live.booking && (
              <button type="button" onClick={() => openBooking(live.booking!.id!)} className="mt-3 text-xs font-bold underline cursor-pointer">
                Open order details
              </button>
            )}
          </div>
        )}
      </div>

      {/* All passes */}
      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs
          tabs={[
            { id: "all" as const, label: "All passes", count: count("all") },
            { id: "active" as const, label: "Not checked in", count: count("active") },
            { id: "scanned" as const, label: "Checked in", count: count("scanned") },
            { id: "cancelled" as const, label: "Cancelled", count: count("cancelled") },
          ]}
          value={status}
          onChange={setStatus}
        />
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search ticket no., holder, event…" />
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className={`${selectCls} max-w-[260px]`}>
            <option value="">All events</option>
            {eventsWithPasses.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>Ticket no.</th>
              <th className={thCls}>Event</th>
              <th className={thCls}>Holder</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Manage</th>
            </>
          }
        >
          {filtered.map(({ t, b, info, c }) => (
            <tr key={t.id} className="hover:bg-[#fafafa]">
              <td className={`${tdCls} whitespace-nowrap`}>
                <span className="font-bold">{t.ticketNumber}</span>
                {b && (
                  <button type="button" onClick={() => openBooking(b.id!)} className="block text-[11px] text-[#8a8a8a] hover:underline cursor-pointer">
                    Order {b.orderId || b.bookingNumber || b.id}
                  </button>
                )}
              </td>
              <td className={tdCls}>
                <p className="font-bold truncate max-w-[260px]">{info.title}</p>
                <p className="text-[11px] text-[#8a8a8a]">{info.date || "Date TBA"}</p>
              </td>
              <td className={tdCls}>
                <p className="font-bold">{c?.name || "Unknown holder"}</p>
                <p className="text-[11px] text-[#8a8a8a]">{c?.email || "—"}</p>
              </td>
              <td className={tdCls}>
                <StatusBadge map={PASS_STATUS} value={t.status} />
                {t.scannedAt && <span className="block text-[11px] text-[#8a8a8a] mt-1">{fmtDateTime(t.scannedAt)}</span>}
              </td>
              <td className={tdCls}>
                <select
                  value={t.status}
                  onChange={(e) => setPass([t.id!], e.target.value as any)}
                  disabled={busy === t.id}
                  className={selectCls}
                >
                  <option value="active">Active</option>
                  <option value="scanned">Scanned (entered)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <EmptyRow colSpan={5} title={rows.length ? "No passes match your filters" : "No tickets issued yet"} />
          )}
        </DataTable>
        <TableFooter shown={filtered.length} total={rows.length} noun="passes" />
      </div>
    </div>
  );
}
