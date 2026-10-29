import React, { useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
import { updateBookingStatus } from "../../../services/backendService";
import { useAdmin, byNewest } from "../AdminContext";
import { paymentMethodLabel } from "../BookingDrawer";
import {
  Avatar,
  DataTable,
  EmptyRow,
  FilterTabs,
  IconButton,
  PageHeader,
  PAYMENT_STATUS,
  SearchInput,
  StatusBadge,
  StatTile,
  TableFooter,
  Toolbar,
  btnOutline,
  downloadCsv,
  fmtDate,
  fmtDateTime,
  money,
  selectCls,
  tdCls,
  thCls,
} from "../ui";

/** Orders — the bookings ledger with payment / order status management. */
export function OrdersPage() {
  const { data, analytics, eventInfo, customerFor, tierName, amountLabel, openBooking, notify, fail, reload } = useAdmin();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "paid" | "pending" | "failed">("all");
  const [source, setSource] = useState<"all" | "online" | "admin">("all");

  const rows = useMemo(
    () => [...data.bookings].sort(byNewest).map((b) => ({ b, info: eventInfo(b.eventId, b), c: customerFor(b) })),
    [data.bookings, eventInfo, customerFor],
  );

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(({ b, info, c }) => {
    if (status !== "all" && (b.paymentStatus || "pending") !== status) return false;
    if (source === "admin" && b.source !== "admin") return false;
    if (source === "online" && b.source === "admin") return false;
    if (!q) return true;
    return [b.orderId, b.bookingNumber, b.id, b.stripeTransactionId, c.name, c.email, info.title, b.paymentMethod]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const count = (s: typeof status) => rows.filter((r) => s === "all" || (r.b.paymentStatus || "pending") === s).length;

  const change = async (id: string, update: { paymentStatus?: any; bookingStatus?: any }) => {
    try {
      await updateBookingStatus(id, update);
      notify("Booking updated.");
      reload();
    } catch {
      fail("Failed to update booking.");
    }
  };

  const exportCsv = () =>
    downloadCsv(`jazba-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Order", "Date", "Customer", "Email", "Phone", "Event", "Package", "Quantity", "Amount", "Amount (USD)", "Payment method", "Region", "Transaction ID", "Payment status", "Order status", "Source"],
      ...filtered.map(({ b, info, c }) => [
        b.orderId || b.bookingNumber || b.id,
        fmtDateTime(b.createdAt),
        c.name,
        c.email,
        c.phone,
        info.title,
        tierName(b),
        b.quantity || 1,
        amountLabel(b),
        Number(b.amount ?? b.pricePaid) || 0,
        paymentMethodLabel(b.paymentMethod),
        b.paymentRegion || "",
        b.stripeTransactionId || "",
        b.paymentStatus,
        b.bookingStatus || "active",
        b.source === "admin" ? "Portal" : "Online",
      ]),
    ]);

  const pendingValue = data.bookings
    .filter((b) => b.paymentStatus === "pending")
    .reduce((s, b) => s + (Number(b.amount ?? b.pricePaid) || 0), 0);

  return (
    <div>
      <PageHeader
        title="Orders"
        sub="Every booking with its payment details. Change a payment or order status right from the list."
        actions={
          <button type="button" className={btnOutline} onClick={exportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatTile dark label="Paid revenue" value={money(analytics.totalRevenue)} sub="USD equivalent" />
        <StatTile label="Paid orders" value={analytics.paidOrders} sub={`of ${data.bookings.length} orders`} />
        <StatTile label="Awaiting payment" value={money(pendingValue)} sub={`${count("pending")} pending order${count("pending") === 1 ? "" : "s"}`} />
        <StatTile
          label="Average order"
          value={money(analytics.paidOrders ? analytics.totalRevenue / analytics.paidOrders : 0)}
          sub="Per paid order"
        />
      </div>

      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs
          tabs={[
            { id: "all" as const, label: "All", count: count("all") },
            { id: "paid" as const, label: "Paid", count: count("paid") },
            { id: "pending" as const, label: "Pending", count: count("pending") },
            { id: "failed" as const, label: "Failed", count: count("failed") },
          ]}
          value={status}
          onChange={setStatus}
        />
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search order, customer, event, transaction…" />
          <select value={source} onChange={(e) => setSource(e.target.value as any)} className={selectCls}>
            <option value="all">All sources</option>
            <option value="online">Online checkout</option>
            <option value="admin">Issued in the portal</option>
          </select>
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>Order</th>
              <th className={thCls}>Customer</th>
              <th className={thCls}>Event</th>
              <th className={thCls}>Payment</th>
              <th className={thCls}>Amount</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Manage</th>
              <th className={thCls}></th>
            </>
          }
        >
          {filtered.map(({ b, info, c }) => (
            <tr key={b.id} className="hover:bg-[#fafafa]">
              <td className={`${tdCls} whitespace-nowrap`}>
                <span className="font-bold tracking-wide whitespace-nowrap">{b.orderId || b.bookingNumber || b.id}</span>
                <span className="block text-[11px] text-[#8a8a8a]">{fmtDate(b.createdAt)}</span>
              </td>
              <td className={tdCls}>
                <div className="flex items-center gap-2.5 min-w-[170px]">
                  <Avatar src={c.photo} name={c.name} size={28} />
                  <div className="min-w-0">
                    <p className="font-bold truncate max-w-[180px]">{c.name}</p>
                    <p className="text-[11px] text-[#8a8a8a] truncate max-w-[180px]">{c.email || "No email on file"}</p>
                  </div>
                </div>
              </td>
              <td className={tdCls}>
                <p className="font-bold truncate max-w-[220px]">{info.title}</p>
                <p className="text-[11px] text-[#8a8a8a] whitespace-nowrap">
                  {b.quantity || 1} × {tierName(b)}
                </p>
              </td>
              <td className={`${tdCls} whitespace-nowrap`}>
                <span className="font-bold">{paymentMethodLabel(b.paymentMethod)}</span>
                {b.paymentRegion && <span className="block text-[11px] text-[#8a8a8a]">{b.paymentRegion} region</span>}
                {b.source === "admin" && <span className="block text-[11px] text-[#8a8a8a]">Issued in portal</span>}
                {b.stripeTransactionId && (
                  <span className="block text-[11px] text-[#8a8a8a] max-w-[170px] truncate" title={`Transaction ID: ${b.stripeTransactionId}`}>
                    {b.stripeTransactionId}
                  </span>
                )}
              </td>
              <td className={`${tdCls} font-bold whitespace-nowrap`}>{amountLabel(b)}</td>
              <td className={tdCls}>
                <StatusBadge map={PAYMENT_STATUS} value={b.paymentStatus} />
              </td>
              <td className={tdCls}>
                <div className="flex flex-col items-start gap-0.5">
                  <select
                    value={b.paymentStatus || "pending"}
                    onChange={(e) => change(b.id!, { paymentStatus: e.target.value })}
                    className={selectCls}
                    aria-label="Payment status"
                  >
                    <option value="pending">Payment: pending</option>
                    <option value="paid">Payment: paid</option>
                    <option value="failed">Payment: failed</option>
                  </select>
                  <select
                    value={b.bookingStatus || "active"}
                    onChange={(e) => change(b.id!, { bookingStatus: e.target.value })}
                    className={selectCls}
                    aria-label="Order status"
                  >
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </td>
              <td className={`${tdCls} text-right`}>
                <IconButton title="View order" onClick={() => openBooking(b.id!)}>
                  <Eye className="w-4 h-4" />
                </IconButton>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <EmptyRow colSpan={8} title={rows.length ? "No orders match your filters" : "No bookings found."} />
          )}
        </DataTable>
        <TableFooter shown={filtered.length} total={rows.length} noun="orders" />
      </div>
    </div>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
  paypal: "PayPal",
};

/** Payments — the payment-provider ledger. */
export function PaymentsPage() {
  const { data, bookingById, userById, customerFor, userEmail, openBooking } = useAdmin();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "success" | "pending" | "failed">("all");

  const rows = useMemo(
    () =>
      [...data.payments]
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        .map((p) => {
          const b = bookingById(p.bookingId);
          const u = userById(p.userId);
          const who = b
            ? customerFor(b)
            : { name: u?.name || "Unknown customer", email: u ? userEmail(u).email : "", photo: u?.profileImage };
          return { p, b, who };
        }),
    [data.payments, bookingById, userById, customerFor, userEmail],
  );

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(({ p, who }) => {
    if (status !== "all" && p.status !== status) return false;
    if (!q) return true;
    return [p.bookingId, p.transactionId, p.provider, who.name, who.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });
  const count = (s: typeof status) => rows.filter((r) => s === "all" || r.p.status === s).length;

  const exportCsv = () =>
    downloadCsv(`jazba-payments-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Date", "Booking", "Customer", "Email", "Provider", "Transaction ID", "Currency", "Amount", "Status"],
      ...filtered.map(({ p, who }) => [fmtDateTime(p.createdAt), p.bookingId, who.name, who.email, p.provider, p.transactionId, p.currency, p.amount, p.status]),
    ]);

  return (
    <div>
      <PageHeader
        title="Payments"
        sub="Payment records from the payment providers, linked to their orders."
        actions={
          <button type="button" className={btnOutline} onClick={exportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />
      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs
          tabs={[
            { id: "all" as const, label: "All", count: count("all") },
            { id: "success" as const, label: "Successful", count: count("success") },
            { id: "pending" as const, label: "Pending", count: count("pending") },
            { id: "failed" as const, label: "Failed", count: count("failed") },
          ]}
          value={status}
          onChange={setStatus}
        />
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search booking, transaction, customer…" />
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>Date</th>
              <th className={thCls}>Booking</th>
              <th className={thCls}>Customer</th>
              <th className={thCls}>Provider</th>
              <th className={thCls}>Transaction ID</th>
              <th className={thCls}>Amount</th>
              <th className={thCls}>Status</th>
            </>
          }
        >
          {filtered.map(({ p, b, who }) => (
            <tr key={p.id} className="hover:bg-[#fafafa]">
              <td className={`${tdCls} whitespace-nowrap text-[#666]`}>{fmtDate(p.createdAt)}</td>
              <td className={tdCls}>
                {b ? (
                  <button type="button" onClick={() => openBooking(b.id!)} className="font-bold hover:underline cursor-pointer">
                    {b.orderId || b.bookingNumber || p.bookingId}
                  </button>
                ) : (
                  <span className="font-bold">{p.bookingId || "—"}</span>
                )}
              </td>
              <td className={tdCls}>
                <div className="flex items-center gap-2.5 min-w-[170px]">
                  <Avatar src={who.photo} name={who.name} size={28} />
                  <div className="min-w-0">
                    <p className="font-bold truncate max-w-[180px]">{who.name}</p>
                    <p className="text-[11px] text-[#8a8a8a] truncate max-w-[180px]">{who.email || "No email on file"}</p>
                  </div>
                </div>
              </td>
              <td className={`${tdCls} font-bold`}>{PROVIDER_LABELS[p.provider] || p.provider}</td>
              <td className={`${tdCls} text-[11px] text-[#666]`}>{p.transactionId || "—"}</td>
              <td className={`${tdCls} font-bold whitespace-nowrap`}>
                {p.currency} {p.amount}
              </td>
              <td className={tdCls}>
                <StatusBadge map={PAYMENT_STATUS} value={p.status} />
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <EmptyRow
              colSpan={7}
              title={rows.length ? "No payments match your filters" : "No payments recorded yet."}
              sub={rows.length ? undefined : "Card payments are processed on Stripe — their orders are listed under Orders."}
            />
          )}
        </DataTable>
        <TableFooter shown={filtered.length} total={rows.length} noun="payments" />
      </div>
    </div>
  );
}
