import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CalendarPlus,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
  Send,
  ShoppingBag,
  Ticket,
  TicketPlus,
  Trash2,
  Undo2,
  UserCheck,
  Wallet,
} from "lucide-react";
import { deleteOrganizerEvent, notifyOrganizerEmail, saveOrganizerEvent } from "../../../services/organizerService";
import { resendOrganizerTicket } from "../../../services/organizerToolsService";
import { EventItem, getAvailableTiers } from "../../../types";
import {
  Badge,
  DataTable,
  EmptyRow,
  EmptyState,
  FilterTabs,
  IconButton,
  PageHeader,
  Panel,
  SearchInput,
  StatTile,
  StatusBadge,
  TableFooter,
  Toolbar,
  btnDark,
  btnOutline,
  btnPrimary,
  downloadCsv,
  fmtDateTime,
  tdCls,
  thCls,
} from "../../admin/ui";
import { useOrg } from "../OrganizerContext";
import { CurrencyPicker, ORG_EVENT_STATUS, SoldBar, eventDateText, useMoney } from "../orgUi";

type Tab = "all" | "published" | "pending" | "draft" | "past";

/** Organisers may delete an event only while it has never been on sale (firestore.rules). */
export const canDelete = (e: any) => (e.status === "draft" || e.status === "pending") && !e.everPublished;

export function OrgEventsList() {
  const { events, eventsLoading, report, navigate, notify, fail, reload } = useOrg();
  const show = useMoney();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const inTab = (e: any, t: Tab) =>
    t === "all" || (t === "past" ? e.status === "completed" || e.status === "cancelled" : e.status === t);
  const shown = events
    .filter((e) => inTab(e, tab) && (!q.trim() || String(e.title || "").toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: events.length },
    { id: "published", label: "On sale", count: events.filter((e) => inTab(e, "published")).length },
    { id: "pending", label: "In review", count: events.filter((e) => inTab(e, "pending")).length },
    { id: "draft", label: "Drafts", count: events.filter((e) => inTab(e, "draft")).length },
    { id: "past", label: "Past", count: events.filter((e) => inTab(e, "past")).length },
  ];

  const remove = async (e: any) => {
    if (!window.confirm(`Delete “${e.title}”? This can’t be undone.`)) return;
    try {
      await deleteOrganizerEvent(e.id);
      notify("Event deleted.");
      await reload();
    } catch {
      fail("Couldn’t delete this event.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Events"
        sub="Create events, submit them for review, and follow their sales."
        actions={
          <>
            <CurrencyPicker />
            <button type="button" className={btnPrimary} onClick={() => navigate("/organizer/events/new")}>
              <Plus className="w-4 h-4" /> Create event
            </button>
          </>
        }
      />
      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} />
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search your events…" />
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>Event</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Sold</th>
              <th className={thCls}>Sales</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </>
          }
        >
          {shown.map((e) => {
            const s = report?.events.find((x) => x.id === e.id);
            return (
              <tr key={e.id} className="hover:bg-[#fafafa]">
                <td className={tdCls}>
                  <button
                    type="button"
                    onClick={() => navigate(`/organizer/events/view/${encodeURIComponent(e.id)}`)}
                    className="flex items-center gap-3 min-w-[240px] text-left cursor-pointer"
                  >
                    <img src={e.image || e.bannerImage} alt="" className="w-16 h-11 object-cover bg-[#f2f2f2] shrink-0" referrerPolicy="no-referrer" />
                    <span className="min-w-0">
                      <span className="font-bold block truncate max-w-[280px] hover:underline">{e.title}</span>
                      <span className="text-[11px] text-[#8a8a8a] block">
                        {eventDateText(e)}
                        {e.venue ? ` · ${e.venue}` : ""}
                      </span>
                    </span>
                  </button>
                </td>
                <td className={tdCls}>
                  <StatusBadge map={ORG_EVENT_STATUS} value={e.status} />
                  {e.status === "draft" && e.reviewNote && <p className="text-[10px] font-bold text-[#7a2f2f] mt-1">Changes requested</p>}
                </td>
                <td className={tdCls}>
                  <SoldBar sold={s?.ticketsSold || 0} capacity={Number(e.capacity) || 0} />
                </td>
                <td className={`${tdCls} font-bold whitespace-nowrap`}>{show(s?.revenueUsd || 0)}</td>
                <td className={`${tdCls} text-right`}>
                  <div className="flex items-center justify-end">
                    <IconButton title="Sales & attendees" onClick={() => navigate(`/organizer/events/view/${encodeURIComponent(e.id)}`)}>
                      <Eye className="w-4 h-4" />
                    </IconButton>
                    <IconButton title="Edit event" onClick={() => navigate(`/organizer/events/edit/${encodeURIComponent(e.id)}`)}>
                      <Edit3 className="w-4 h-4" />
                    </IconButton>
                    {e.status === "published" && (
                      <IconButton title="View public page" href={`/events/${encodeURIComponent(e.id)}`}>
                        <ExternalLink className="w-4 h-4" />
                      </IconButton>
                    )}
                    {canDelete(e) && (
                      <IconButton title="Delete event" danger onClick={() => remove(e)}>
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {shown.length === 0 && (
            <EmptyRow
              colSpan={5}
              title={eventsLoading ? "Loading your events…" : events.length ? "No events here" : "No events yet"}
              sub={events.length || eventsLoading ? undefined : "Create your first event — it goes on sale once our team approves it."}
              action={
                !events.length && !eventsLoading ? (
                  <button type="button" className={btnPrimary} onClick={() => navigate("/organizer/events/new")}>
                    <Plus className="w-4 h-4" /> Create event
                  </button>
                ) : undefined
              }
            />
          )}
        </DataTable>
        <TableFooter shown={shown.length} total={events.length} noun="events" />
      </div>
    </div>
  );
}

export function OrgEventDetail({ eventId }: { eventId: string }) {
  const { events, eventsLoading, report, reportLoading, navigate, notify, fail, reload, toolOrgId } = useOrg();
  const show = useMoney();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const event = events.find((e) => e.id === eventId);
  const stats = report?.events.find((e) => e.id === eventId);
  const orders = useMemo(() => (report?.orders || []).filter((o) => o.eventId === eventId), [report, eventId]);
  const shown = orders.filter((o) => {
    const n = q.trim().toLowerCase();
    return !n || [o.buyerName, o.buyerEmail, o.id, o.tierName].some((v) => String(v || "").toLowerCase().includes(n));
  });

  if (!event) {
    return (
      <div className="py-24 text-center">
        {eventsLoading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : (
          <EmptyState
            icon={CalendarPlus}
            title="Event not found"
            action={
              <button type="button" className={btnOutline} onClick={() => navigate("/organizer/events")}>
                Back to events
              </button>
            }
          />
        )}
      </div>
    );
  }

  const setStatus = async (status: "pending" | "draft", message: string) => {
    setBusy(true);
    try {
      await saveOrganizerEvent(event.id, { status, ...(status === "pending" ? { submittedAt: new Date().toISOString() } : {}) });
      if (status === "pending") notifyOrganizerEmail("event-submitted", { eventId: event.id });
      notify(message);
      await reload();
    } catch {
      fail("Couldn’t update the event. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${event.title}”? This can’t be undone.`)) return;
    try {
      await deleteOrganizerEvent(event.id);
      notify("Event deleted.");
      navigate("/organizer/events");
      await reload();
    } catch {
      fail("Couldn’t delete this event.");
    }
  };

  const publicUrl = `${window.location.origin}/events/${encodeURIComponent(event.id)}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      notify("Event link copied.");
    } catch {
      fail("Couldn’t copy the link.");
    }
  };

  const resend = async (orderId: string) => {
    try {
      const r = await resendOrganizerTicket(orderId, "", toolOrgId);
      notify(`Ticket sent again to ${r.sentTo}.`);
    } catch (err: any) {
      fail(err?.message || "Couldn’t send the ticket.");
    }
  };

  const exportCsv = () =>
    downloadCsv(`${String(event.title || "event").replace(/[^\w]+/g, "-").toLowerCase()}-attendees.csv`, [
      ["Order", "Name", "Email", "Ticket", "Quantity", "Paid", "Currency", "Status", "Ordered at"],
      ...orders.map((o) => [o.id, o.buyerName, o.buyerEmail, o.tierName, o.quantity, o.currency === "USD" ? o.amountUsd.toFixed(2) : o.amountLocal, o.currency, o.status, o.createdAt]),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ label: "All events", onClick: () => navigate("/organizer/events") }}
        title={event.title}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge map={ORG_EVENT_STATUS} value={event.status} />
            <span>
              {eventDateText(event)}
              {event.venue ? ` · ${[event.venue, event.city].filter(Boolean).join(", ")}` : ""}
            </span>
          </span>
        }
        actions={
          <>
            <CurrencyPicker />
            <button type="button" className={btnOutline} onClick={() => navigate(`/organizer/events/edit/${encodeURIComponent(event.id)}`)}>
              <Edit3 className="w-4 h-4" /> Edit
            </button>
            {event.status === "draft" && (
              <button type="button" disabled={busy} className={btnPrimary} onClick={() => setStatus("pending", "Sent for review — we’ll email you when it’s live.")}>
                <Send className="w-4 h-4" /> Submit for review
              </button>
            )}
            {event.status === "pending" && (
              <button type="button" disabled={busy} className={btnOutline} onClick={() => setStatus("draft", "Moved back to drafts.")}>
                <Undo2 className="w-4 h-4" /> Withdraw from review
              </button>
            )}
            {event.status !== "draft" && event.status !== "cancelled" && (
              <button type="button" className={btnOutline} onClick={() => navigate(`/organizer/issue?event=${encodeURIComponent(event.id)}`)}>
                <TicketPlus className="w-4 h-4" /> Issue tickets
              </button>
            )}
            {event.status === "published" && (
              <a href={`/events/${encodeURIComponent(event.id)}`} target="_blank" rel="noopener noreferrer" className={btnDark}>
                <ExternalLink className="w-4 h-4" /> View page
              </a>
            )}
          </>
        }
      />

      {event.status === "draft" && event.reviewNote && (
        <div className="bg-[#fff8c2] border border-[#e6d200] p-4 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold">Changes requested by the Jazba team</p>
            <p className="text-black/75 mt-0.5">{event.reviewNote}</p>
          </div>
        </div>
      )}
      {event.status === "pending" && (
        <div className="bg-white border border-[#e4e4e4] p-4 text-sm">
          <span className="font-bold">In review.</span> Our team checks every event before it goes on sale. We’ll email you as soon as it’s live.
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile dark label="Gross sales" icon={Wallet} value={stats ? show(stats.revenueUsd) : reportLoading ? "…" : show(0)} />
        <StatTile
          label="Tickets sold"
          icon={Ticket}
          value={(stats?.ticketsSold || 0).toLocaleString()}
          sub={Number(event.capacity) > 0 ? `of ${Number(event.capacity).toLocaleString()} capacity` : undefined}
        />
        <StatTile label="Orders" icon={ShoppingBag} value={(stats?.orders || 0).toLocaleString()} />
        <StatTile label="Checked in" icon={UserCheck} value={(stats?.checkedIn || 0).toLocaleString()} sub={stats?.passes ? `of ${stats.passes} tickets` : "At the door, by the Jazba team"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel
          title="Tickets by type"
          sub={stats?.availability?.left != null ? `${stats.availability.left} left of ${stats.availability.capacity} in total` : "Sold, left and when sales close"}
          bodyClassName=""
        >
          {getAvailableTiers(event as EventItem).length ? (
            <ul className="divide-y divide-[#f2f2f2]">
              {getAvailableTiers(event as EventItem).map((t) => {
                const a = stats?.availability?.tiers[t.tier];
                const revenue = stats?.tiers.find((x) => x.name === t.name)?.revenueUsd || 0;
                const ended = a?.salesEnded;
                const soldOut = a?.left !== null && a?.left !== undefined && a.left <= 0;
                return (
                  <li key={t.tier} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold min-w-0 truncate">{t.name}</span>
                      <span className="font-bold shrink-0">{show(revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-1 text-[11px] text-[#8a8a8a]">
                      <span>
                        {a?.sold || 0} sold
                        {a?.capacity ? ` of ${a.capacity}` : ""}
                        {a?.left != null && !soldOut ? ` · ${a.left} left` : ""}
                        {t.salesEnd ? ` · sales end ${fmtDateTime(t.salesEnd)}` : ""}
                      </span>
                      {ended ? <Badge tone="neutral">Closed</Badge> : soldOut ? <Badge tone="negative">Sold out</Badge> : <Badge tone="positive">On sale</Badge>}
                    </div>
                    {a?.capacity ? (
                      <div className="h-1 bg-[#efefef] mt-2">
                        <div className="h-full bg-black" style={{ width: `${Math.min(100, Math.round(((a.sold || 0) / a.capacity) * 100))}%` }} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-[#8a8a8a]">No ticket types yet — add them in the editor.</p>
          )}
          {(stats?.waitlist || 0) > 0 && (
            <button
              type="button"
              onClick={() => navigate("/organizer/waitlist")}
              className="w-full flex items-center justify-between gap-3 px-5 py-3 border-t border-[#f2f2f2] bg-[#fffbd6] text-sm font-bold cursor-pointer hover:bg-[#fff6a8]"
            >
              <span className="flex items-center gap-2">
                <BellRing className="w-4 h-4" /> {stats!.waitlist} on the waitlist
              </span>
              <span className="underline text-xs">Tell them</span>
            </button>
          )}
        </Panel>
        <Panel title="Share your event" className="xl:col-span-2">
          {event.status === "published" ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 bg-[#f7f7f7] px-3 py-2.5 text-xs font-medium outline-none" />
                <button type="button" className={btnDark} onClick={copyLink}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <p className="text-xs text-[#8a8a8a]">Post this link on your socials — buyers check out securely on Jazba Tickets.</p>
            </div>
          ) : (
            <p className="text-sm text-[#8a8a8a]">Your event link appears here once the event is on sale.</p>
          )}
          {(canDelete(event) || event.status === "published") && (
            <div className="mt-5 pt-4 border-t border-[#f2f2f2] flex flex-wrap gap-2">
              {event.status === "published" && (
                <button
                  type="button"
                  disabled={busy}
                  className="text-xs font-bold text-[#7a2f2f] hover:bg-[#f7ecec] px-3 py-2 cursor-pointer"
                  onClick={() => {
                    if (window.confirm("Take this event off sale? It disappears from the site until our team publishes it again.")) {
                      void setStatus("draft", "Event taken off sale.");
                    }
                  }}
                >
                  Take off sale
                </button>
              )}
              {canDelete(event) && (
                <button type="button" className="text-xs font-bold text-[#7a2f2f] hover:bg-[#f7ecec] px-3 py-2 cursor-pointer flex items-center gap-1.5" onClick={remove}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete event
                </button>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="bg-white border border-[#e4e4e4]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#f2f2f2]">
          <div>
            <h3 className="font-display font-bold text-sm">Orders & attendees</h3>
            <p className="text-[11px] text-[#8a8a8a] font-medium mt-0.5">Everyone who has a ticket for this event.</p>
          </div>
          <button type="button" className={btnOutline} onClick={exportCsv} disabled={!orders.length}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, order…" />
        </Toolbar>
        <OrdersTable orders={shown} total={orders.length} loading={reportLoading} onResend={resend} />
      </div>
    </div>
  );
}

export function OrdersTable({
  orders, total, loading, showEvent = false, onResend,
}: { orders: any[]; total: number; loading: boolean; showEvent?: boolean; onResend?: (orderId: string) => void }) {
  const show = useMoney();
  return (
    <>
      <DataTable
        head={
          <>
            <th className={thCls}>Order</th>
            <th className={thCls}>Buyer</th>
            {showEvent && <th className={thCls}>Event</th>}
            <th className={thCls}>Tickets</th>
            <th className={thCls}>Paid</th>
            <th className={thCls}>Status</th>
            <th className={thCls}>Date</th>
            {onResend && <th className={thCls}></th>}
          </>
        }
      >
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-[#fafafa]">
            <td className={`${tdCls} font-mono text-xs whitespace-nowrap`}>{o.id}</td>
            <td className={tdCls}>
              <p className="font-bold">{o.buyerName || "—"}</p>
              {o.buyerEmail && (
                <a href={`mailto:${o.buyerEmail}`} className="text-[11px] text-[#8a8a8a] hover:text-black">
                  {o.buyerEmail}
                </a>
              )}
            </td>
            {showEvent && <td className={`${tdCls} max-w-[220px] truncate`}>{o.eventTitle}</td>}
            <td className={`${tdCls} whitespace-nowrap`}>
              {o.quantity} × {o.tierName}
            </td>
            <td className={`${tdCls} font-bold whitespace-nowrap`}>{show(o.amountUsd)}</td>
            <td className={tdCls}>
              {o.status === "paid" ? (
                <Badge tone="positive">{o.complimentary ? "Free" : o.source === "admin" || o.source === "organizer" ? "Issued" : "Paid"}</Badge>
              ) : (
                <Badge tone={o.status === "cancelled" || o.status === "failed" ? "negative" : "warning"}>{o.status}</Badge>
              )}
            </td>
            <td className={`${tdCls} whitespace-nowrap text-xs`}>{fmtDateTime(o.createdAt)}</td>
            {onResend && (
              <td className={`${tdCls} text-right`}>
                {o.buyerEmail && o.status !== "cancelled" && (
                  <button type="button" className="text-[11px] font-bold underline cursor-pointer whitespace-nowrap" onClick={() => onResend(o.id)} title="Email the ticket again">
                    Resend ticket
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
        {orders.length === 0 && (
          <EmptyRow colSpan={(showEvent ? 7 : 6) + (onResend ? 1 : 0)} title={loading ? "Loading orders…" : total ? "No orders match" : "No orders yet"} sub={total || loading ? undefined : "Orders appear here as soon as tickets sell."} />
        )}
      </DataTable>
      <TableFooter shown={orders.length} total={total} noun="orders" />
    </>
  );
}
