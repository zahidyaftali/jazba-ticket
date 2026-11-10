import React, { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader, SearchInput, Toolbar, btnOutline, downloadCsv } from "../../admin/ui";
import { useOrg } from "../OrganizerContext";
import { CurrencyPicker } from "../orgUi";
import { OrdersTable } from "./OrgEventsPage";
import { resendOrganizerTicket } from "../../../services/organizerToolsService";

/** Every order across the organiser's events. */
export default function OrgOrdersPage() {
  const { report, reportLoading, reportError, events, toolOrgId, notify, fail } = useOrg();
  const resend = async (orderId: string) => {
    try {
      const r = await resendOrganizerTicket(orderId, "", toolOrgId);
      notify(`Ticket sent again to ${r.sentTo}.`);
    } catch (err: any) {
      fail(err?.message || "Couldn’t send the ticket.");
    }
  };
  const [q, setQ] = useState("");
  const [eventId, setEventId] = useState("");
  const orders = report?.orders || [];
  const n = q.trim().toLowerCase();
  const shown = orders.filter(
    (o) => (!eventId || o.eventId === eventId) && (!n || [o.buyerName, o.buyerEmail, o.id, o.eventTitle, o.tierName].some((v) => String(v || "").toLowerCase().includes(n))),
  );

  const exportCsv = () =>
    downloadCsv("jazba-orders.csv", [
      ["Order", "Event", "Name", "Email", "Phone", "Ticket", "Quantity", "Paid", "Currency", "Promo code", "Type", "Status", "Ordered at"],
      ...shown.map((o) => [
        o.id, o.eventTitle, o.buyerName, o.buyerEmail, o.phone || "", o.tierName, o.quantity,
        o.complimentary ? 0 : o.currency === "USD" ? o.amountUsd.toFixed(2) : o.amountLocal, o.currency, o.promoCode || "",
        o.complimentary ? "Free / issued" : o.source === "online" ? "Online" : "Issued", o.status, o.createdAt,
      ]),
    ]);

  return (
    <div>
      <PageHeader
        title="Orders & attendees"
        sub="Everyone who bought a ticket to your events. Payments are handled by Jazba Tickets."
        actions={
          <>
            <CurrencyPicker />
            <button type="button" className={btnOutline} onClick={exportCsv} disabled={!shown.length}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </>
        }
      />
      {reportError && <p className="mb-4 text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-4 py-3">{reportError}</p>}
      <div className="bg-white border border-[#e4e4e4]">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, order…" />
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="bg-white border border-[#e4e4e4] px-2 py-2 text-xs font-bold text-black cursor-pointer outline-none focus:border-black max-w-[260px]"
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </Toolbar>
        <OrdersTable orders={shown} total={orders.length} loading={reportLoading} showEvent onResend={resend} />
      </div>
    </div>
  );
}
