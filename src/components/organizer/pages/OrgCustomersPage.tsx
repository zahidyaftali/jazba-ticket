import React, { useMemo, useState } from "react";
import { Contact, Download, ShieldCheck } from "lucide-react";
import {
  DataTable, Drawer, EmptyRow, PageHeader, Pagination, SearchInput, Toolbar, btnOutline, downloadCsv, fmtDate, fmtDateTime, tdCls, thCls, usePaged,
} from "../../admin/ui";
import type { OrganizerOrder } from "../../../services/organizerService";
import { useOrg } from "../OrganizerContext";
import { CurrencyPicker, useMoney } from "../orgUi";

interface Customer {
  key: string;
  name: string;
  email: string;
  phone: string;
  orders: OrganizerOrder[];
  tickets: number;
  spentUsd: number;
  events: string[];
  last: string;
}

/** Everyone who has bought (or been given) tickets to this organiser's
 *  events, one row per person — merged by email. */
export default function OrgCustomersPage() {
  const { report, reportLoading, reportError } = useOrg();
  const show = useMoney();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Customer | null>(null);

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const o of report?.orders || []) {
      if (o.status === "failed") continue;
      const key = (o.buyerEmail || `name:${o.buyerName || o.id}`).toLowerCase();
      const c = map.get(key) || { key, name: "", email: o.buyerEmail || "", phone: "", orders: [], tickets: 0, spentUsd: 0, events: [], last: "" };
      c.orders.push(o);
      if (!c.name && o.buyerName) c.name = o.buyerName;
      if (!c.phone && o.phone) c.phone = o.phone;
      if (o.status === "paid") {
        c.tickets += o.quantity;
        c.spentUsd += o.amountUsd;
      }
      if (!c.events.includes(o.eventTitle)) c.events.push(o.eventTitle);
      if (o.createdAt > c.last) c.last = o.createdAt;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [report]);

  const n = q.trim().toLowerCase();
  const shown = customers.filter((c) => !n || [c.name, c.email, c.phone, ...c.events].some((v) => v.toLowerCase().includes(n)));
  const paged = usePaged(shown, [n]);

  const exportCsv = () =>
    downloadCsv("jazba-customers.csv", [
      ["Name", "Email", "Phone", "Orders", "Tickets", "Spent (USD)", "Events", "Last order"],
      ...shown.map((c) => [c.name, c.email, c.phone, c.orders.length, c.tickets, c.spentUsd.toFixed(2), c.events.join("; "), c.last]),
    ]);

  return (
    <div>
      <PageHeader
        title="Customers"
        sub="Everyone with a ticket to your events, one row per person. Click a name to see their orders."
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

      <div className="bg-[#fffbd6] border border-[#e6d200] px-4 py-3 mb-4 text-xs text-black/80 flex items-start gap-2.5 leading-relaxed">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Use these details to run your events — sending tickets, updates about a show they booked, refunds. Under UK and EU data law (GDPR),
          only send marketing emails to people who agreed to hear from you, and always let them unsubscribe.
        </span>
      </div>

      <div className="bg-white border border-[#e4e4e4]">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, phone, event…" />
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>Customer</th>
              <th className={thCls}>Phone</th>
              <th className={thCls}>Orders</th>
              <th className={thCls}>Tickets</th>
              <th className={thCls}>Spent</th>
              <th className={thCls}>Last order</th>
            </>
          }
        >
          {paged.items.map((c) => (
            <tr key={c.key} className="hover:bg-[#fafafa] cursor-pointer" onClick={() => setOpen(c)}>
              <td className={tdCls}>
                <p className="font-bold">{c.name || "—"}</p>
                {c.email && <p className="text-[11px] text-[#8a8a8a]">{c.email}</p>}
              </td>
              <td className={`${tdCls} whitespace-nowrap text-xs`}>{c.phone || "—"}</td>
              <td className={tdCls}>{c.orders.length}</td>
              <td className={tdCls}>{c.tickets}</td>
              <td className={`${tdCls} font-bold whitespace-nowrap`}>{show(c.spentUsd)}</td>
              <td className={`${tdCls} whitespace-nowrap text-xs`}>{fmtDate(c.last)}</td>
            </tr>
          ))}
          {paged.items.length === 0 && (
            <EmptyRow colSpan={6} title={reportLoading ? "Loading customers…" : customers.length ? "No one matches" : "No customers yet"} sub={customers.length || reportLoading ? undefined : "People appear here as soon as they book."} />
          )}
        </DataTable>
        <Pagination paged={paged} total={shown.length} noun="customers" />
      </div>

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        eyebrow="Customer"
        title={open?.name || open?.email || "Customer"}
        sub={
          <span className="text-sm text-[#666] flex flex-col gap-0.5">
            {open?.email && <a className="underline" href={`mailto:${open.email}`}>{open.email}</a>}
            {open?.phone && <a className="underline" href={`tel:${open.phone}`}>{open.phone}</a>}
          </span>
        }
      >
        {open && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Orders", String(open.orders.length)],
                ["Tickets", String(open.tickets)],
                ["Spent", show(open.spentUsd)],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#f7f7f7] p-3">
                  <p className="text-[11px] font-bold text-[#666]">{k}</p>
                  <p className="font-display font-bold text-lg mt-1">{v}</p>
                </div>
              ))}
            </div>
            <ul className="divide-y divide-[#f2f2f2] border border-[#e4e4e4]">
              {open.orders.map((o) => (
                <li key={o.id} className="px-4 py-3 text-sm flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-bold block truncate">{o.eventTitle}</span>
                    <span className="text-[11px] text-[#8a8a8a] block">
                      {o.id} · {o.quantity} × {o.tierName} · {fmtDateTime(o.createdAt)}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="font-bold block">{o.complimentary ? "Free" : show(o.amountUsd)}</span>
                    <span className="text-[11px] text-[#8a8a8a] capitalize">{o.status}</span>
                  </span>
                </li>
              ))}
            </ul>
            {!open.email && (
              <p className="text-xs text-[#8a8a8a] flex items-center gap-1.5">
                <Contact className="w-3.5 h-3.5" /> No email on file for this customer.
              </p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
