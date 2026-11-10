import React from "react";
import { AlertTriangle, ArrowRight, CalendarPlus, Check, Clock, Heart, Plus, ShoppingBag, Ticket, Wallet } from "lucide-react";
import { Badge, DataTable, EmptyState, PageHeader, Panel, StatTile, StatusBadge, btnPrimary, fmtDateTime, tdCls, thCls } from "../../admin/ui";
import { useOrg } from "../OrganizerContext";
import { CurrencyPicker, ORG_EVENT_STATUS, SoldBar, eventDateText, useMoney } from "../orgUi";

export default function OrgDashboardPage() {
  const { org, me, events, eventsLoading, report, reportError, reportLoading, navigate, priv } = useOrg();
  const show = useMoney();
  const statsFor = (id: string) => report?.events.find((e) => e.id === id);
  const declined = events.filter((e) => e.status === "draft" && e.reviewNote);
  const inReview = events.filter((e) => e.status === "pending");
  const t = report?.totals;
  const firstName = (org.contactName || me?.name || "").split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        sub={`${org.companyName} · organiser dashboard`}
        actions={
          <>
            <CurrencyPicker />
            <button type="button" className={btnPrimary} onClick={() => navigate("/organizer/events/new")}>
              <Plus className="w-4 h-4" /> Create event
            </button>
          </>
        }
      />

      {declined.map((e) => (
        <div key={e.id} className="bg-[#fff8c2] border border-[#e6d200] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Changes requested: {e.title}</p>
              <p className="text-black/75 mt-0.5">{e.reviewNote}</p>
            </div>
          </div>
          <button type="button" className={`${btnPrimary} !bg-black !text-white`} onClick={() => navigate(`/organizer/events/edit/${encodeURIComponent(e.id)}`)}>
            Edit event
          </button>
        </div>
      ))}
      {inReview.length > 0 && (
        <div className="bg-white border border-[#e4e4e4] p-4 flex items-center gap-3 text-sm">
          <Clock className="w-5 h-5 shrink-0" />
          <span>
            <span className="font-bold">
              {inReview.length} event{inReview.length === 1 ? " is" : "s are"} waiting for review.
            </span>{" "}
            We’ll email you as soon as {inReview.length === 1 ? "it’s" : "they’re"} live.
          </span>
        </div>
      )}

      <SetupChecklist
        steps={[
          { done: !!org.logoUrl && String(org.description || "").length > 20, label: "Add your logo and a short story", to: "/organizer/profile" },
          { done: events.length > 0, label: "Create your first event", to: "/organizer/events/new" },
          { done: events.some((e) => e.status === "published"), label: "Get an event approved and on sale", to: "/organizer/events" },
          { done: !!priv?.payout?.accountName, label: "Add your payout details", to: "/organizer/payouts" },
          { done: false, optional: true, label: "Set up door scanning for your team", to: "/organizer/door-staff" },
        ]}
        onGo={navigate}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile dark label="Gross ticket sales" icon={Wallet} value={t ? show(t.revenueUsd) : "—"} sub={t ? `${t.liveEvents} event${t.liveEvents === 1 ? "" : "s"} on sale` : undefined} />
        <StatTile label="Tickets sold" icon={Ticket} value={t ? t.ticketsSold.toLocaleString() : "—"} sub={t ? `${t.checkedIn} checked in` : undefined} />
        <StatTile label="Orders" icon={ShoppingBag} value={t ? t.orders.toLocaleString() : "—"} onClick={() => navigate("/organizer/orders")} />
        <StatTile label="Followers" icon={Heart} value={t ? t.followers.toLocaleString() : "—"} sub="People following your page" />
      </div>
      {reportError && <p className="text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-4 py-3">{reportError}</p>}

      <Panel
        title="Your events"
        sub="Sales update as orders come in."
        action={
          events.length > 0 && (
            <button type="button" className="text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer" onClick={() => navigate("/organizer/events")}>
              All events <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )
        }
        bodyClassName=""
      >
        {events.length === 0 && eventsLoading ? (
          <p className="px-5 py-14 text-sm text-[#8a8a8a] text-center">Loading your events…</p>
        ) : events.length === 0 ? (
          <div className="py-14 px-4">
            <EmptyState
              icon={CalendarPlus}
              title="Create your first event"
              sub="Add the details, set your ticket prices and submit it — our team reviews it and puts it on sale."
              action={
                <button type="button" className={btnPrimary} onClick={() => navigate("/organizer/events/new")}>
                  <Plus className="w-4 h-4" /> Create event
                </button>
              }
            />
          </div>
        ) : (
          <DataTable
            head={
              <>
                <th className={thCls}>Event</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Sold</th>
                <th className={`${thCls} text-right`}>Sales</th>
              </>
            }
          >
            {[...events]
              .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
              .slice(0, 8)
              .map((e) => {
                const s = statsFor(e.id);
                return (
                  <tr key={e.id} className="hover:bg-[#fafafa] cursor-pointer" onClick={() => navigate(`/organizer/events/view/${encodeURIComponent(e.id)}`)}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <img src={e.image || e.bannerImage} alt="" className="w-14 h-10 object-cover bg-[#f2f2f2] shrink-0" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <p className="font-bold truncate max-w-[260px]">{e.title}</p>
                          <p className="text-[11px] text-[#8a8a8a]">{eventDateText(e)}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <StatusBadge map={ORG_EVENT_STATUS} value={e.status} />
                    </td>
                    <td className={tdCls}>
                      <SoldBar sold={s?.ticketsSold || 0} capacity={Number(e.capacity) || 0} />
                    </td>
                    <td className={`${tdCls} text-right font-bold whitespace-nowrap`}>{reportLoading && !s ? "…" : show(s?.revenueUsd || 0)}</td>
                  </tr>
                );
              })}
          </DataTable>
        )}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel
          className="xl:col-span-2"
          title="Latest orders"
          action={
            <button type="button" className="text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer" onClick={() => navigate("/organizer/orders")}>
              All orders <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
          bodyClassName=""
        >
          {(report?.orders || []).length === 0 ? (
            <p className="px-5 py-10 text-sm text-[#8a8a8a] text-center">{reportLoading ? "Loading…" : "No orders yet — they’ll show here as soon as tickets sell."}</p>
          ) : (
            <ul className="divide-y divide-[#f2f2f2]">
              {report!.orders.slice(0, 6).map((o) => (
                <li key={o.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{o.buyerName || o.buyerEmail || "Guest"}</p>
                    <p className="text-[11px] text-[#8a8a8a] truncate">
                      {o.quantity} × {o.tierName} · {o.eventTitle} · {fmtDateTime(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">{show(o.amountUsd)}</p>
                    {o.status !== "paid" && <Badge tone={o.status === "cancelled" ? "negative" : "warning"}>{o.status}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="How you get paid">
          <div className="text-sm text-[#444] space-y-3 leading-relaxed">
            <p>Buyers pay Jazba Tickets securely by card (Stripe) or Easypaisa. You never handle card details.</p>
            <p>After your event, the Jazba team settles your ticket earnings with you directly, as agreed when you were approved.</p>
            <p>
              <button type="button" className="font-bold underline cursor-pointer" onClick={() => navigate("/organizer/payouts")}>
                See your earnings and payouts
              </button>
            </p>
            <p>
              Questions about a payout? Email <a className="font-bold underline" href="mailto:info@jazbatickets.com">info@jazbatickets.com</a>.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}


/** "Get set up" — the few things a new organiser needs, ticked off as they go.
 *  Hidden once the required steps are done. */
function SetupChecklist({
  steps,
  onGo,
}: {
  steps: { done: boolean; label: string; to: string; optional?: boolean }[];
  onGo: (to: string) => void;
}) {
  const required = steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => s.done).length;
  if (doneCount === required.length) return null;
  const pct = Math.round((doneCount / required.length) * 100);
  return (
    <section className="bg-white border border-black">
      <div className="px-5 py-4 border-b border-[#f2f2f2] flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-sm">Get set up</h3>
          <p className="text-[11px] text-[#8a8a8a] font-medium mt-0.5">
            {doneCount} of {required.length} done — most organisers finish in under 15 minutes.
          </p>
        </div>
        <div className="w-28 h-1.5 bg-[#efefef] shrink-0">
          <div className="h-full bg-black transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="divide-y divide-[#f2f2f2]">
        {steps.map((step) => (
          <li key={step.label}>
            <button
              type="button"
              onClick={() => onGo(step.to)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left text-sm hover:bg-[#fafafa] cursor-pointer"
            >
              <span className={`w-6 h-6 flex items-center justify-center shrink-0 ${step.done ? "bg-black text-[#ffed00]" : "border border-[#c4c4c4]"}`}>
                {step.done && <Check className="w-3.5 h-3.5" />}
              </span>
              <span className={`flex-1 ${step.done ? "text-[#8a8a8a] line-through" : "font-bold"}`}>
                {step.label}
                {step.optional && <span className="text-[11px] font-medium text-[#8a8a8a] no-underline ml-2">(optional)</span>}
              </span>
              {!step.done && <ArrowRight className="w-4 h-4 shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
