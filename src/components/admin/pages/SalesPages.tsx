import React, { useMemo, useState } from "react";
import { Download, Eye, ExternalLink, FileDown, Loader2 } from "lucide-react";
import { updateBookingStatus, type Booking } from "../../../services/backendService";
import { useAdmin, byNewest } from "../AdminContext";
import { paymentMethodLabel } from "../BookingDrawer";
import { downloadPaymentPdf, type PaymentPdfSection } from "../paymentPdf";
import {
  Avatar,
  DataTable,
  Detail,
  Drawer,
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
  btnPrimary,
  downloadCsv,
  fmtDate,
  fmtDateTime,
  money,
  overline,
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

interface PaymentRow {
  key: string;
  createdAt: string;
  /** Order number shown in the Booking column. */
  orderId: string;
  booking?: Booking;
  who: { name: string; email: string; photo?: string };
  /** "Event · Package × 2" */
  detail: string;
  provider: string;
  transactionId: string;
  transactionUrl: string;
  currency: string;
  amount: number;
  status: "success" | "pending" | "failed" | "refunded";
  /** Extra line under the status, e.g. why a card failed. */
  note: string;
  /** Stripe's own receipt page, for successful card payments. */
  receiptUrl: string;
  /** Everything known about the payment, as shown in the details panel and PDF. */
  sections: PaymentPdfSection[];
}

const detailRow = (label: string, value?: string | number | null): [string, string] => [
  label,
  value == null ? "" : String(value),
];

const paymentStatusLabel = (s: string) => PAYMENT_STATUS[s]?.label || s;

/** Payments — every card payment straight from Stripe, plus any payment
 *  records saved in the database. */
export function PaymentsPage() {
  const { data, bookingById, userById, customerFor, userEmail, eventInfo, openBooking, cardPayments, cardPaymentsStatus, cardPaymentsError, fail } =
    useAdmin();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | PaymentRow["status"]>("all");
  /** The payment open in the details panel. */
  const [viewKey, setViewKey] = useState("");
  /** The payment whose PDF is being made. */
  const [downloading, setDownloading] = useState("");

  const rows = useMemo<PaymentRow[]>(() => {
    const list: PaymentRow[] = cardPayments.map((cp) => {
      const b = cp.orderId ? bookingById(cp.orderId) : undefined;
      const c = b ? customerFor(b) : undefined;
      const info = cp.eventId ? eventInfo(cp.eventId, b) : undefined;
      const title = cp.eventTitle || info?.title || "";
      const pkg = cp.tierName ? `${cp.tierName} × ${cp.quantity}` : "";
      const name = (c?.name && c.name !== "Unknown customer" ? c.name : "") || cp.customerName || "Unknown customer";
      const email = c?.email || cp.email;
      const notes = [
        cp.status === "success" && !b ? "Paid, but no booking yet: the buyer didn't return to the site." : "",
        cp.status === "refunded" ? `Refunded ${money(cp.amountRefunded, cp.currency)}` : "",
        cp.status === "failed" ? cp.failure || "The card was declined." : "",
        cp.status === "pending" ? "Checkout started, not paid yet." : "",
        cp.promo ? `Promo ${cp.promo}` : "",
        cp.sale ? `${cp.sale} off sale` : "",
      ];
      return {
        key: cp.id,
        createdAt: cp.createdAt,
        orderId: cp.orderId,
        booking: b,
        who: { name, email, photo: c?.photo },
        detail: [title, pkg].filter(Boolean).join(" · "),
        provider: "stripe",
        transactionId: cp.transactionId,
        transactionUrl: cp.transactionId ? `https://dashboard.stripe.com/payments/${cp.transactionId}` : "",
        currency: cp.currency,
        amount: cp.amount,
        status: cp.status,
        note: notes.filter(Boolean).join(" · "),
        receiptUrl: cp.receiptUrl,
        sections: [
          {
            heading: "Order",
            rows: [
              detailRow("Order number", cp.orderId),
              detailRow("Event", title),
              detailRow("Event date", info ? [info.date, info.time].filter(Boolean).join(" · ") : ""),
              detailRow("Venue", info?.venue),
              detailRow("Package", cp.tierName),
              detailRow("Tickets", cp.quantity),
              detailRow(
                "Booking",
                b ? "Created" : cp.status === "success" ? "Not created: the buyer didn't return to the site" : "",
              ),
            ],
          },
          { heading: "Customer", rows: [detailRow("Name", name), detailRow("Email", email)] },
          {
            heading: "Payment",
            rows: [
              detailRow("Amount", money(cp.amount, cp.currency)),
              detailRow("Currency", cp.currency),
              detailRow("Status", paymentStatusLabel(cp.status)),
              detailRow("Paid by", "Card, via Stripe"),
              detailRow("Promo code", cp.promo),
              detailRow("Sale", cp.sale ? `${cp.sale} off` : ""),
              detailRow("Refunded", cp.amountRefunded ? money(cp.amountRefunded, cp.currency) : ""),
              detailRow("Failure reason", cp.status === "failed" ? cp.failure || "The card was declined." : ""),
              detailRow("Transaction ID", cp.transactionId),
              detailRow("Checkout session", cp.id),
            ],
          },
        ],
      };
    });

    // Payment records saved in the database (none are written for card
    // orders today); skip any that duplicate a Stripe payment.
    const seen = new Set(cardPayments.map((cp) => cp.transactionId).filter(Boolean));
    for (const p of data.payments) {
      if (p.transactionId && seen.has(p.transactionId)) continue;
      const b = bookingById(p.bookingId);
      const u = userById(p.userId);
      const who = b
        ? customerFor(b)
        : { name: u?.name || "Unknown customer", email: u ? userEmail(u).email : "", photo: u?.profileImage };
      const info = b ? eventInfo(b.eventId, b) : undefined;
      const orderId = b?.orderId || b?.bookingNumber || p.bookingId;
      const amount = Number(p.amount) || 0;
      list.push({
        key: `db-${p.id}`,
        createdAt: p.createdAt,
        orderId,
        booking: b,
        who,
        detail: info?.title || "",
        provider: p.provider,
        transactionId: p.transactionId,
        transactionUrl: "",
        currency: p.currency,
        amount,
        status: p.status,
        note: "",
        receiptUrl: "",
        sections: [
          {
            heading: "Order",
            rows: [
              detailRow("Order number", orderId),
              detailRow("Event", info?.title),
              detailRow("Event date", info ? [info.date, info.time].filter(Boolean).join(" · ") : ""),
              detailRow("Venue", info?.venue),
            ],
          },
          { heading: "Customer", rows: [detailRow("Name", who.name), detailRow("Email", who.email)] },
          {
            heading: "Payment",
            rows: [
              detailRow("Amount", money(amount, p.currency)),
              detailRow("Currency", p.currency),
              detailRow("Status", paymentStatusLabel(p.status)),
              detailRow("Paid by", PROVIDER_LABELS[p.provider] || p.provider),
              detailRow("Transaction ID", p.transactionId),
            ],
          },
        ],
      });
    }
    return list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [cardPayments, data.payments, bookingById, userById, customerFor, userEmail, eventInfo]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!q) return true;
    return [r.orderId, r.transactionId, r.provider, r.who.name, r.who.email, r.detail]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const count = (s: typeof status) => rows.filter((r) => s === "all" || r.status === s).length;

  const exportCsv = () =>
    downloadCsv(`jazba-payments-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Date", "Order", "Details", "Customer", "Email", "Provider", "Transaction ID", "Currency", "Amount", "Status", "Note"],
      ...filtered.map((r) => [
        fmtDateTime(r.createdAt),
        r.orderId,
        r.detail,
        r.who.name,
        r.who.email,
        PROVIDER_LABELS[r.provider] || r.provider,
        r.transactionId,
        r.currency,
        r.amount,
        r.status,
        r.note,
      ]),
    ]);

  const stripeLoading = cardPaymentsStatus === "loading";
  const viewing = viewKey ? rows.find((r) => r.key === viewKey) : undefined;

  const downloadPdf = async (r: PaymentRow) => {
    setDownloading(r.key);
    try {
      const when = r.createdAt
        ? new Date(r.createdAt).toLocaleString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          })
        : "";
      await downloadPaymentPdf(
        {
          orderId: r.orderId,
          amountLabel: money(r.amount, r.currency),
          statusLabel: paymentStatusLabel(r.status),
          successful: r.status === "success",
          dateLabel: when,
          sections: r.sections,
        },
        `payment-${(r.orderId || r.transactionId || "details").replace(/[^A-Za-z0-9_-]/g, "")}.pdf`,
      );
    } catch (err) {
      console.error("Payment PDF failed:", err);
      fail("Couldn't create the PDF. Please try again.");
    } finally {
      setDownloading("");
    }
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        sub="Every card payment, straight from Stripe, linked to its order."
        actions={
          <button type="button" className={btnOutline} onClick={exportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />
      {cardPaymentsStatus === "error" && (
        <div className="mb-4 border border-[#be6464] bg-white px-4 py-3 text-sm">
          <span className="font-bold">Couldn't load card payments from Stripe.</span>{" "}
          <span className="text-[#666]">{cardPaymentsError} Use the refresh button at the top to try again.</span>
        </div>
      )}
      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs
          tabs={[
            { id: "all" as const, label: "All", count: count("all") },
            { id: "success" as const, label: "Successful", count: count("success") },
            { id: "pending" as const, label: "Pending", count: count("pending") },
            { id: "failed" as const, label: "Failed", count: count("failed") },
            { id: "refunded" as const, label: "Refunded", count: count("refunded") },
          ]}
          value={status}
          onChange={setStatus}
        />
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search order, transaction, customer, event…" />
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
              <th className={`${thCls} text-right`}>Details</th>
            </>
          }
        >
          {filtered.map((r) => (
            <tr key={r.key} className="hover:bg-[#fafafa]">
              <td className={`${tdCls} whitespace-nowrap text-[#666]`}>
                {fmtDate(r.createdAt)}
                <span className="block text-[11px] text-[#8a8a8a]">
                  {r.createdAt ? new Date(r.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </td>
              <td className={tdCls}>
                {r.booking ? (
                  <button type="button" onClick={() => openBooking(r.booking!.id!)} className="font-bold hover:underline cursor-pointer">
                    {r.orderId}
                  </button>
                ) : (
                  <span className="font-bold">{r.orderId || "—"}</span>
                )}
                {r.detail && <span className="block text-[11px] text-[#666] max-w-[240px] truncate">{r.detail}</span>}
              </td>
              <td className={tdCls}>
                <div className="flex items-center gap-2.5 min-w-[170px]">
                  <Avatar src={r.who.photo} name={r.who.name} size={28} />
                  <div className="min-w-0">
                    <p className="font-bold truncate max-w-[180px]">{r.who.name}</p>
                    <p className="text-[11px] text-[#8a8a8a] truncate max-w-[180px]">{r.who.email || "No email on file"}</p>
                  </div>
                </div>
              </td>
              <td className={`${tdCls} font-bold`}>{PROVIDER_LABELS[r.provider] || r.provider}</td>
              <td className={`${tdCls} text-[11px] text-[#666]`}>
                {r.transactionUrl ? (
                  <a href={r.transactionUrl} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-black">
                    {r.transactionId}
                  </a>
                ) : (
                  r.transactionId || "—"
                )}
              </td>
              <td className={`${tdCls} font-bold whitespace-nowrap`}>{money(r.amount, r.currency)}</td>
              <td className={tdCls}>
                <StatusBadge map={PAYMENT_STATUS} value={r.status} />
                {r.note && <span className="block text-[11px] text-[#666] mt-1 max-w-[220px]">{r.note}</span>}
              </td>
              <td className={`${tdCls} text-right whitespace-nowrap`}>
                <IconButton title="View payment details" onClick={() => setViewKey(r.key)}>
                  <Eye className="w-4 h-4" />
                </IconButton>
                <IconButton title="Download payment details (PDF)" onClick={() => downloadPdf(r)} disabled={downloading === r.key}>
                  {downloading === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                </IconButton>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <EmptyRow
              colSpan={8}
              title={
                rows.length
                  ? "No payments match your filters"
                  : stripeLoading
                    ? "Loading payments from Stripe…"
                    : "No payments recorded yet."
              }
              sub={rows.length || stripeLoading ? undefined : "Card payments appear here as soon as Stripe takes them."}
            />
          )}
        </DataTable>
        <TableFooter shown={filtered.length} total={rows.length} noun="payments" />
      </div>

      <Drawer
        open={!!viewing}
        onClose={() => setViewKey("")}
        eyebrow="Payment details"
        title={viewing ? `${money(viewing.amount, viewing.currency)} · ${viewing.orderId || "Payment"}` : ""}
        sub={
          viewing && (
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge map={PAYMENT_STATUS} value={viewing.status} />
              <span className="text-sm text-[#666]">{fmtDateTime(viewing.createdAt)}</span>
            </div>
          )
        }
        footer={
          viewing && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => downloadPdf(viewing)}
                disabled={downloading === viewing.key}
              >
                {downloading === viewing.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Download PDF
              </button>
              {viewing.booking && (
                <button
                  type="button"
                  className={btnOutline}
                  onClick={() => {
                    setViewKey("");
                    openBooking(viewing.booking!.id!);
                  }}
                >
                  View order
                </button>
              )}
              {viewing.transactionUrl && (
                <a href={viewing.transactionUrl} target="_blank" rel="noopener noreferrer" className={btnOutline}>
                  Open in Stripe <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {viewing.receiptUrl && (
                <a href={viewing.receiptUrl} target="_blank" rel="noopener noreferrer" className={btnOutline}>
                  Stripe receipt <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )
        }
      >
        {viewing && (
          <div className="space-y-8">
            {viewing.sections.map((section) => {
              const rows = section.rows.filter(([, v]) => v);
              if (!rows.length) return null;
              return (
                <section key={section.heading}>
                  <h3 className={`${overline} text-[#666] border-b border-black pb-2`}>{section.heading}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
                    {rows.map(([label, value]) => (
                      <div key={label}>
                        <Detail label={label}>{value}</Detail>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </Drawer>
    </div>
  );
}
