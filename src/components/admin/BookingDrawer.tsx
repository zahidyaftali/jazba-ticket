import React, { useEffect, useState } from "react";
import { Mail, Printer, Send, Loader2, Phone, UserRound, ExternalLink, FileDown, Trash2 } from "lucide-react";
import { Booking, deleteBooking, updateBookingDetails, updateBookingStatus, updateTicketStatus } from "../../services/backendService";
import { sendTicketEmail, downloadTicketPdf, TicketEmailPayload } from "../../services/ticketEmailService";
import { eventPath, isSeatedTier, ticketSeat } from "../../types";
import { useAdmin } from "./AdminContext";
import {
  Avatar,
  Badge,
  BOOKING_STATUS,
  Detail,
  Drawer,
  PASS_STATUS,
  PAYMENT_STATUS,
  StatusBadge,
  btnDark,
  btnOutline,
  btnPrimary,
  fmtDateTime,
  inputCls,
  labelCls,
  money,
  overline,
  selectCls,
} from "./ui";

const METHOD_LABELS: Record<string, string> = {
  stripe: "Card (Stripe)",
  cash: "Cash",
  "bank-transfer": "Bank transfer",
  "card-in-person": "Card (in person)",
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
  complimentary: "Complimentary",
  paypal: "PayPal",
};
export const paymentMethodLabel = (m?: string) => (m ? METHOD_LABELS[m] || m : "—");

/** Email a booking's e-ticket (PDF attached) or download that PDF. Sending
 *  also records when and where the ticket went. */
export function useEmailTicket() {
  const { ticketDataFor, amountLabel, reload } = useAdmin();
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const payloadFor = (b: Booking, to = "", message = ""): TicketEmailPayload => {
    const t = ticketDataFor(b);
    return {
      to: to.trim(),
      holderName: t.holderName,
      eventTitle: t.eventTitle,
      category: t.category,
      date: t.date,
      time: t.time,
      venue: t.venue,
      tierName: t.tierName || t.tier,
      quantity: t.quantity,
      orderId: t.orderId,
      seat: t.seat,
      code: t.code,
      amount: b.paymentMethod === "complimentary" || !(Number(b.amount) > 0) ? "" : amountLabel(b),
      message: message.trim(),
      image: t.image,
    };
  };

  const send = async (b: Booking, to: string, message = ""): Promise<{ ok: boolean; error?: string }> => {
    setSending(true);
    const res = await sendTicketEmail(payloadFor(b, to, message));
    if (res.ok && b.id) {
      try {
        await updateBookingDetails(b.id, { emailedAt: new Date().toISOString(), emailedTo: to.trim() });
        reload();
      } catch {
        /* the email went out; only the "last sent" note failed to save */
      }
    }
    setSending(false);
    return res;
  };

  const download = async (b: Booking): Promise<{ ok: boolean; error?: string }> => {
    setDownloading(true);
    const res = await downloadTicketPdf(payloadFor(b, b.billingEmail || ""));
    setDownloading(false);
    return res;
  };

  return { send, sending, download, downloading };
}

export default function BookingDrawer() {
  const {
    openBookingId,
    closeBooking,
    bookingById,
    customerFor,
    eventInfo,
    passesFor,
    tierName,
    amountLabel,
    ticketDataFor,
    printTicket,
    notify,
    fail,
    reload,
    navigate,
  } = useAdmin();
  const b = openBookingId ? bookingById(openBookingId) : undefined;
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [busyPass, setBusyPass] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { send, sending, download, downloading } = useEmailTicket();

  const customer = b ? customerFor(b) : null;
  useEffect(() => {
    setTo(customer?.email || "");
    setMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBookingId]);

  if (!openBookingId) return null;
  if (!b || !customer) {
    return (
      <Drawer open onClose={closeBooking} title="Order not found">
        <p className="text-sm text-[#666]">This order may have been deleted. Refresh the data and try again.</p>
      </Drawer>
    );
  }

  const info = eventInfo(b.eventId, b);
  const passes = passesFor(b.id || "");
  const orderId = b.orderId || b.bookingNumber || b.id;
  const checkedIn = passes.filter((p) => p.status === "scanned").length;

  const changeBooking = async (update: { paymentStatus?: any; bookingStatus?: any }) => {
    try {
      await updateBookingStatus(b.id!, update);
      notify("Order updated.");
      reload();
    } catch {
      fail("Failed to update the order.");
    }
  };

  const changePass = async (id: string, status: "active" | "scanned" | "cancelled") => {
    setBusyPass(id);
    try {
      await updateTicketStatus(id, status);
      notify(status === "scanned" ? "Checked in." : `Ticket marked ${PASS_STATUS[status].label.toLowerCase()}.`);
      await reload();
    } catch {
      fail("Failed to update the ticket.");
    } finally {
      setBusyPass(null);
    }
  };

  const doSend = async () => {
    const res = await send(b, to, message);
    if (res.ok) {
      notify(`Ticket emailed to ${to.trim()}.`);
      setMessage("");
    } else fail(res.error || "The email could not be sent.");
  };

  const doDelete = async () => {
    const paidByCard = b.paymentMethod === "stripe" && b.paymentStatus === "paid";
    const warning =
      `Delete order ${orderId} and its ${passes.length || b.quantity} ticket(s)? This cannot be undone.` +
      (paidByCard ? "\n\nThis does NOT refund the card payment — refund it in Stripe first if needed." : "");
    if (!window.confirm(warning)) return;
    setDeleting(true);
    try {
      await deleteBooking(b.id!);
      closeBooking();
      notify(`Order ${orderId} deleted.`);
      reload();
    } catch {
      fail("Failed to delete the order.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Drawer
      open
      onClose={closeBooking}
      eyebrow={b.source === "admin" ? "Issued in the portal" : "Online order"}
      title={`Order ${orderId}`}
      sub={
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge map={PAYMENT_STATUS} value={b.paymentStatus} />
          <StatusBadge map={BOOKING_STATUS} value={b.bookingStatus || "active"} />
          {passes.length > 0 && (
            <Badge tone={checkedIn ? "positive" : "neutral"}>
              {checkedIn}/{passes.length} checked in
            </Badge>
          )}
        </div>
      }
      footer={
        <>
          <button type="button" className={btnDark} onClick={() => printTicket(ticketDataFor(b))}>
            <Printer className="w-4 h-4" /> Print ticket
          </button>
          <button
            type="button"
            className={btnOutline}
            disabled={downloading}
            onClick={async () => {
              const res = await download(b);
              if (!res.ok) fail(res.error || "The PDF could not be created.");
            }}
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Download PDF
          </button>
          {info.event && (
            <a href={eventPath(info.event)} target="_blank" rel="noopener noreferrer" className={btnOutline}>
              <ExternalLink className="w-4 h-4" /> Event page
            </a>
          )}
          <button
            type="button"
            className={`${btnOutline} ml-auto`}
            onClick={() => {
              closeBooking();
              navigate(`/admin/tickets/new?event=${encodeURIComponent(b.eventId)}&client=${encodeURIComponent(customer.email)}`);
            }}
          >
            Issue another
          </button>
        </>
      }
    >
      {/* Event */}
      <div className="flex gap-4 items-start">
        {info.image ? (
          <img src={info.image} alt="" className="w-20 h-20 object-cover shrink-0 bg-[#f2f2f2]" />
        ) : (
          <div className="w-20 h-20 bg-[#f2f2f2] shrink-0" />
        )}
        <div className="min-w-0">
          <span className={`${overline} text-[#8a8a8a]`}>Event</span>
          <p className="font-display font-bold text-lg leading-tight mt-1">{info.title}</p>
          <p className="text-xs text-[#666] mt-1">
            {[info.date, info.time].filter(Boolean).join(" · ") || "Date TBA"}
          </p>
          {info.venue && <p className="text-xs text-[#666]">{info.venue}</p>}
        </div>
      </div>

      {/* Holder */}
      <div className="mt-6 border-t border-[#efefef] pt-5">
        <span className={`${overline} text-[#8a8a8a]`}>Ticket holder</span>
        <div className="flex items-center gap-3 mt-3">
          <Avatar src={customer.photo} name={customer.name} size={40} />
          <div className="min-w-0">
            <p className="font-bold text-sm">{customer.name}</p>
            {customer.email ? (
              <a href={`mailto:${customer.email}`} className="text-xs text-[#333] hover:underline break-all">
                {customer.email}
              </a>
            ) : (
              <p className="text-xs text-[#8a8a8a]">No email on file</p>
            )}
          </div>
          <div className="ml-auto shrink-0">
            {customer.registered ? (
              <Badge tone="info">
                <UserRound className="w-3 h-3" /> Member
              </Badge>
            ) : (
              <Badge tone="neutral">Guest</Badge>
            )}
          </div>
        </div>
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 text-xs font-bold mt-3 hover:underline">
            <Phone className="w-3.5 h-3.5" /> {customer.phone}
          </a>
        )}
      </div>

      {/* Order details */}
      <div className="mt-6 border-t border-[#efefef] pt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        <Detail label="Package">
          {b.quantity || 1} × {tierName(b)}
        </Detail>
        <Detail label="Amount">
          {amountLabel(b)}
          {b.currency && b.currency !== "USD" && Number(b.amount) > 0 && (
            <span className="block text-[11px] text-[#8a8a8a] font-medium">≈ {money(Number(b.amount))} USD</span>
          )}
        </Detail>
        <Detail label="Payment method">
          {paymentMethodLabel(b.paymentMethod)}
          {b.paymentRegion && <span className="block text-[11px] text-[#8a8a8a] font-medium">{b.paymentRegion} region</span>}
        </Detail>
        <Detail label="Seat / row">{ticketSeat(b) || (isSeatedTier(b.tier || b.ticketType) ? "—" : "Standing")}</Detail>
        <Detail label="Ordered">{fmtDateTime(b.createdAt)}</Detail>
        <Detail label="Ticket code">
          <span className="tracking-[0.15em]">{orderId}</span>
        </Detail>
        {b.stripeTransactionId && <Detail label="Transaction ID">{b.stripeTransactionId}</Detail>}
        {b.promoApplied && <Detail label="Promo">Promo code applied</Detail>}
        {b.issuedBy && <Detail label="Issued by">{b.issuedBy}</Detail>}
        {b.emailedAt && (
          <Detail label="Last emailed">
            {fmtDateTime(b.emailedAt)}
            <span className="block text-[11px] text-[#8a8a8a] font-medium break-all">to {b.emailedTo}</span>
          </Detail>
        )}
      </div>
      {b.note && (
        <div className="mt-4 bg-[#f7f7f7] border-l-2 border-black px-3 py-2.5 text-xs text-[#333] whitespace-pre-line">
          <span className="font-bold">Note: </span>
          {b.note}
        </div>
      )}

      {/* Status controls */}
      <div className="mt-6 border-t border-[#efefef] pt-5 grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Payment</label>
          <select
            value={b.paymentStatus || "pending"}
            onChange={(e) => changeBooking({ paymentStatus: e.target.value })}
            className={`${selectCls} w-full`}
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Order status</label>
          <select
            value={b.bookingStatus || "active"}
            onChange={(e) => changeBooking({ bookingStatus: e.target.value })}
            className={`${selectCls} w-full`}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Passes */}
      <div className="mt-6 border-t border-[#efefef] pt-5">
        <span className={`${overline} text-[#8a8a8a]`}>Admission passes ({passes.length})</span>
        {passes.length === 0 ? (
          <p className="text-xs text-[#8a8a8a] mt-2">No individual passes were created for this order.</p>
        ) : (
          <div className="mt-3 border border-[#efefef] divide-y divide-[#f2f2f2]">
            {passes.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold">{p.ticketNumber}</p>
                  {p.scannedAt && <p className="text-[11px] text-[#8a8a8a]">Checked in {fmtDateTime(p.scannedAt)}</p>}
                </div>
                <StatusBadge map={PASS_STATUS} value={p.status} />
                {busyPass === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : p.status === "active" ? (
                  <button
                    type="button"
                    onClick={() => changePass(p.id!, "scanned")}
                    className="text-[11px] font-bold px-2.5 py-1.5 bg-black text-white hover:bg-neutral-800 cursor-pointer"
                  >
                    Check in
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => changePass(p.id!, "active")}
                    className="text-[11px] font-bold px-2.5 py-1.5 border border-[#d4d4d4] hover:border-black cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                {p.status !== "cancelled" && busyPass !== p.id && (
                  <button
                    type="button"
                    onClick={() => changePass(p.id!, "cancelled")}
                    className="text-[11px] font-bold text-[#7a2f2f] hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email */}
      <div className="mt-6 border-t border-[#efefef] pt-5">
        <span className={`${overline} text-[#8a8a8a] flex items-center gap-1.5`}>
          <Mail className="w-3.5 h-3.5" /> Email the ticket
        </span>
        <p className="text-[11px] text-[#8a8a8a] mt-1">The PDF ticket is attached, ready to save on their phone and show at the gate.</p>
        <div className="mt-3 space-y-3">
          <div>
            <label className={labelCls}>Send to</label>
            <input type="email" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" />
          </div>
          <div>
            <label className={labelCls}>Personal message (optional)</label>
            <textarea
              className={`${inputCls} h-20`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Doors open at 7pm — see you there!"
            />
          </div>
          <button type="button" className={btnPrimary} onClick={doSend} disabled={sending || !to.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending…" : b.emailedAt ? "Resend ticket" : "Send ticket"}
          </button>
        </div>
      </div>

      {/* Delete */}
      <div className="mt-8 border-t border-[#efefef] pt-5">
        <button
          type="button"
          onClick={doDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7a2f2f] hover:underline cursor-pointer disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {deleting ? "Deleting…" : "Delete this order"}
        </button>
        <p className="text-[11px] text-[#8a8a8a] mt-1">For test or duplicate orders. Card refunds are done in Stripe.</p>
      </div>
    </Drawer>
  );
}
