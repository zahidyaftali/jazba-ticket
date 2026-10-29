import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Loader2, CircleCheck, TriangleAlert, Printer, Eye, Plus, UserRound, Search, X, Mail } from "lucide-react";
import { issueManualTicket, Booking, updateBookingDetails } from "../../../services/backendService";
import { sendTicketEmail } from "../../../services/ticketEmailService";
import { getAvailableTiers, defaultTier, DEFAULT_TIER_META } from "../../../types";
import { useAdmin, Client, eventDateLabel, eventVenueLabel, AdminEvent } from "../AdminContext";
import {
  Avatar,
  Badge,
  EditorPanel,
  Field,
  PageHeader,
  btnDark,
  btnOutline,
  btnPrimary,
  fromUsd,
  inputCls,
  labelCls,
  money,
  overline,
  toUsd,
} from "../ui";

type Currency = "USD" | "GBP" | "PKR";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CUSTOM = "__custom";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "bank-transfer", label: "Bank transfer" },
  { id: "card-in-person", label: "Card (in person)" },
  { id: "easypaisa", label: "Easypaisa" },
  { id: "jazzcash", label: "JazzCash" },
  { id: "complimentary", label: "Complimentary (free)" },
];

/** The currency an event is usually priced in, from where it takes place. */
function currencyFor(e?: AdminEvent): Currency {
  const where = `${e?.location || ""} ${e?.city || ""} ${e?.country || ""} ${e?.title || ""}`;
  if (/pakistan|islamabad|lahore|karachi|rawalpindi|peshawar|multan|faisalabad|quetta|sialkot/i.test(where)) return "PKR";
  if (/united kingdom|\buk\b|england|scotland|wales|london|birmingham|manchester|bradford|leeds|glasgow|leicester|luton|slough|coventry/i.test(where))
    return "GBP";
  return "USD";
}

function roundFor(amount: number, c: Currency): string {
  if (!amount) return "0";
  return c === "PKR" ? String(Math.round(amount)) : String(Math.round(amount * 100) / 100);
}

export default function IssueTicketPage() {
  const { allEvents, eventInfo, clients, route, navigate, reload, notify, fail, openBooking, printTicket, ticketDataFor, data } = useAdmin();

  const [eventId, setEventId] = useState(route.query.get("event") || "");
  const [showPast, setShowPast] = useState(false);
  const [tierChoice, setTierChoice] = useState("");
  const [customTier, setCustomTier] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [unitPrice, setUnitPrice] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [seat, setSeat] = useState("");
  const [client, setClient] = useState({ name: "", email: "", phone: "" });
  const [note, setNote] = useState("");
  const [emailIt, setEmailIt] = useState(true);
  const [emailMessage, setEmailMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ booking: Booking; emailed: boolean; emailError?: string } | null>(null);
  const [resending, setResending] = useState(false);

  // ---- events
  const eventOptions = useMemo(() => {
    const list = allEvents
      .map((e) => ({ e, info: eventInfo(e.id) }))
      .filter(({ info }) => showPast || info.upcoming || info.timestamp === null)
      .sort((a, b) => (a.info.timestamp ?? Infinity) - (b.info.timestamp ?? Infinity));
    return {
      wordpress: list.filter((x) => x.e.source === "wordpress"),
      site: list.filter((x) => x.e.source === "site"),
    };
  }, [allEvents, eventInfo, showPast]);

  const event = allEvents.find((e) => e.id === eventId);
  const info = event ? eventInfo(event.id) : null;
  const tiers = useMemo(() => {
    if (!event) return [];
    const sellable = getAvailableTiers(event);
    if (sellable.length) return sellable;
    // Partner-sold events still list their packages — offer them too.
    return (event.ticketOptions || []).map((o) => ({ tier: o.id, price: o.price, name: o.name, note: o.note || "", groupSize: o.groupSize }));
  }, [event]);

  // A linked past event (e.g. "Issue another" on an old order) must still be listed.
  useEffect(() => {
    if (info && !info.upcoming && info.timestamp !== null) setShowPast(true);
  }, [info?.upcoming, info?.timestamp]); // eslint-disable-line react-hooks/exhaustive-deps

  // New event → its default package and local currency.
  useEffect(() => {
    if (!event) return;
    setTierChoice(tiers.length ? defaultTier(tiers) : CUSTOM);
    setCurrency(currencyFor(event));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, tiers.length]);

  const tier = tiers.find((t) => t.tier === tierChoice);
  const isComp = paymentMethod === "complimentary";

  // Package / currency change → suggested price (still editable).
  useEffect(() => {
    if (isComp) {
      setUnitPrice("0");
      return;
    }
    if (tier) setUnitPrice(roundFor(fromUsd(tier.price, currency), currency));
  }, [tierChoice, currency, isComp, tier?.price]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isComp) setPaymentStatus("paid");
  }, [isComp]);

  // ---- client prefill from ?client=email
  useEffect(() => {
    const email = route.query.get("client");
    if (!email) return;
    const found = clients.find((c) => c.email.toLowerCase() === email.toLowerCase());
    setClient({ name: found?.name || "", email: found?.email || email, phone: found?.phone || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.query.get("client"), clients.length]);

  const matchedMember = useMemo(() => {
    const e = client.email.trim().toLowerCase();
    if (!e) return undefined;
    return data.users.find((u) => (u.email || "").toLowerCase() === e);
  }, [client.email, data.users]);

  const unit = Math.max(0, Number(unitPrice) || 0);
  const totalLocal = isComp ? 0 : unit * quantity;
  const totalUsd = toUsd(totalLocal, currency);
  const tierName = tierChoice === CUSTOM ? customTier.trim() : tier?.name || "";

  const reset = (keepEvent: boolean) => {
    if (!keepEvent) setEventId("");
    setQuantity(1);
    setSeat("");
    setClient({ name: "", email: "", phone: "" });
    setNote("");
    setEmailMessage("");
    setEmailIt(true);
    setError("");
    setIssued(null);
    if (!keepEvent) setTierChoice("");
  };

  const emailPayload = (b: Booking) => {
    const t = ticketDataFor(b);
    return {
      to: b.billingEmail || "",
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
      amount: b.paymentMethod === "complimentary" || !(b.amount > 0) ? "" : money(b.amountLocal ?? b.amount, b.currency || "USD"),
      message: emailMessage.trim(),
    };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!event || !info) return setError("Choose the event this ticket is for.");
    if (!tierName) return setError("Choose a ticket package, or name your custom one.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return setError("Quantity must be between 1 and 100.");
    if (!client.name.trim()) return setError("Enter the client's full name.");
    const email = client.email.trim();
    if (email && !EMAIL_RE.test(email)) return setError("The client's email address doesn't look right.");
    if (emailIt && !email) return setError("Add the client's email to send them the ticket — or untick “Email the ticket”.");

    setSubmitting(true);
    try {
      const booking = await issueManualTicket({
        eventId: event.id,
        eventTitle: info.title,
        eventDate: info.date,
        eventTime: info.time,
        eventVenue: info.venue,
        eventImage: info.image,
        tier: tierChoice === CUSTOM ? customTier.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom" : tierChoice,
        tierName,
        quantity,
        amountUsd: Math.round(totalUsd * 100) / 100,
        currency,
        amountLocal: totalLocal,
        paymentMethod,
        paymentStatus,
        seat: seat.trim(),
        clientName: client.name.trim(),
        clientEmail: email,
        clientPhone: client.phone.trim(),
        clientUid: matchedMember?.uid || "",
        note: note.trim(),
      });

      let emailed = false;
      let emailError: string | undefined;
      if (emailIt && email) {
        const res = await sendTicketEmail(emailPayload(booking));
        if (res.ok) {
          emailed = true;
          try {
            await updateBookingDetails(booking.id!, { emailedAt: new Date().toISOString(), emailedTo: email });
          } catch {
            /* sent — only the "last emailed" note didn't save */
          }
        } else emailError = res.error;
      }

      setIssued({ booking, emailed, emailError });
      notify(emailed ? `Ticket ${booking.orderId} issued and emailed to ${email}.` : `Ticket ${booking.orderId} issued.`);
      reload();
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error("Issue ticket failed:", err);
      setError("The ticket could not be saved. Make sure you are signed in as an admin and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!issued) return;
    setResending(true);
    const res = await sendTicketEmail(emailPayload(issued.booking));
    setResending(false);
    if (res.ok) {
      setIssued({ ...issued, emailed: true, emailError: undefined });
      notify(`Ticket emailed to ${issued.booking.billingEmail}.`);
      updateBookingDetails(issued.booking.id!, { emailedAt: new Date().toISOString(), emailedTo: issued.booking.billingEmail }).catch(() => {});
    } else {
      setIssued({ ...issued, emailError: res.error });
      fail(res.error || "The email could not be sent.");
    }
  };

  // ── Confirmation screen ──────────────────────────────────────────────
  if (issued) {
    const b = issued.booking;
    return (
      <div className="max-w-3xl">
        <div className="bg-white border border-[#e4e4e4]">
          <div className="bg-black text-white px-6 py-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#ffed00] flex items-center justify-center shrink-0">
              <CircleCheck className="w-6 h-6 text-black" />
            </div>
            <div className="min-w-0">
              <span className={`${overline} text-[#ffed00]`}>Ticket issued</span>
              <h1 className="font-display font-bold text-2xl leading-tight mt-1">Order {b.orderId}</h1>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className={`${overline} text-[#8a8a8a] block`}>Client</span>
                <span className="font-bold block mt-1">{b.billingName}</span>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <span className={`${overline} text-[#8a8a8a] block`}>Event</span>
                <span className="font-bold block mt-1">{b.eventTitle}</span>
              </div>
              <div>
                <span className={`${overline} text-[#8a8a8a] block`}>Tickets</span>
                <span className="font-bold block mt-1">
                  {b.quantity} × {b.tierName}
                </span>
              </div>
            </div>

            {issued.emailed ? (
              <div className="flex items-start gap-2 bg-[#edf6e8] text-[#2f5d1f] px-4 py-3 text-sm font-bold">
                <Mail className="w-4 h-4 shrink-0 mt-0.5" /> Emailed to {b.billingEmail}.
              </div>
            ) : issued.emailError ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#f7ecec] text-[#7a2f2f] px-4 py-3 text-sm font-bold">
                <span className="flex items-start gap-2 flex-1">
                  <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> The ticket was saved but the email failed: {issued.emailError}
                </span>
                <button type="button" onClick={resend} disabled={resending} className={btnDark}>
                  {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Try again
                </button>
              </div>
            ) : b.billingEmail ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#f7f7f7] px-4 py-3 text-sm">
                <span className="flex-1">Not emailed yet.</span>
                <button type="button" onClick={resend} disabled={resending} className={btnDark}>
                  {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Email to {b.billingEmail}
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#666] bg-[#f7f7f7] px-4 py-3">No email address — print the ticket or hand over the order code.</p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className={btnDark} onClick={() => printTicket(ticketDataFor(b))}>
                <Printer className="w-4 h-4" /> Print ticket
              </button>
              <button type="button" className={btnOutline} onClick={() => openBooking(b.id!)}>
                <Eye className="w-4 h-4" /> View order
              </button>
              <button type="button" className={btnPrimary} onClick={() => reset(true)}>
                <Plus className="w-4 h-4" /> Issue another for this event
              </button>
              <button type="button" className={btnOutline} onClick={() => navigate("/admin/tickets")}>
                All tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Issue a ticket"
        sub="Create a ticket yourself — box office sales, bank transfers, guest list or complimentary passes — and email it straight to your client."
      />

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {/* 1. Event */}
          <EditorPanel title="1. Event" sub="Which show is this ticket for?">
            <Field label="Event">
              <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={inputCls}>
                <option value="">Choose an event…</option>
                {eventOptions.wordpress.length > 0 && (
                  <optgroup label="jazbaentertainment.com">
                    {eventOptions.wordpress.map(({ e, info: i }) => (
                      <option key={e.id} value={e.id}>
                        {e.title} — {i.date || "Date TBA"}
                      </option>
                    ))}
                  </optgroup>
                )}
                {eventOptions.site.length > 0 && (
                  <optgroup label="Site events">
                    {eventOptions.site.map(({ e, info: i }) => (
                      <option key={e.id} value={e.id}>
                        {e.title} — {i.date || "Date TBA"}
                        {e.status && e.status !== "published" ? ` (${e.status})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-xs font-bold text-[#555] cursor-pointer">
              <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Include past events
            </label>

            {event && info && (
              <div className="flex gap-4 bg-[#f7f7f7] p-3">
                {info.image && <img src={info.image} alt="" className="w-24 h-16 object-cover shrink-0" />}
                <div className="min-w-0 text-sm">
                  <p className="font-bold leading-tight">{event.title}</p>
                  <p className="text-xs text-[#666] mt-1">
                    {[eventDateLabel(event), event.time].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-[#666]">{eventVenueLabel(event)}</p>
                  {event.externalTicketUrl && (
                    <p className="text-[11px] text-[#7a4f0e] font-bold mt-1">Sold online by a partner — you can still issue tickets here.</p>
                  )}
                </div>
              </div>
            )}
          </EditorPanel>

          {/* 2. Package */}
          <EditorPanel title="2. Ticket package & price" sub="Prices are suggested from the event — change them for discounts or special deals.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Package">
                <select value={tierChoice} onChange={(e) => setTierChoice(e.target.value)} className={inputCls} disabled={!event}>
                  {!event && <option value="">Choose an event first</option>}
                  {tiers.map((t) => (
                    <option key={t.tier} value={t.tier}>
                      {t.name}
                      {t.groupSize ? ` (admits ${t.groupSize})` : ""} — {money(fromUsd(t.price, currency), currency)}
                    </option>
                  ))}
                  {event && <option value={CUSTOM}>Custom package…</option>}
                </select>
              </Field>
              {tierChoice === CUSTOM ? (
                <Field label="Custom package name">
                  <input
                    className={inputCls}
                    value={customTier}
                    onChange={(e) => setCustomTier(e.target.value)}
                    placeholder={`e.g. ${DEFAULT_TIER_META.vip.name} guest list`}
                  />
                </Field>
              ) : (
                <Field label="Seat / row (optional)">
                  <input className={inputCls} value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="e.g. Row F, seats 12–13" maxLength={40} />
                </Field>
              )}
            </div>
            {tier?.note && <p className="text-[11px] text-[#8a8a8a] -mt-2">{tier.note}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Quantity">
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputCls}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(100, Math.floor(Number(e.target.value) || 1))))}
                />
              </Field>
              <Field label="Currency">
                <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={inputCls}>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="PKR">PKR (Rs)</option>
                </select>
              </Field>
              <Field label="Price per ticket" className="col-span-2">
                <input
                  type="number"
                  min={0}
                  step={currency === "PKR" ? 1 : 0.01}
                  className={inputCls}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  disabled={isComp}
                />
              </Field>
            </div>
            {tierChoice === CUSTOM && (
              <Field label="Seat / row (optional)">
                <input className={inputCls} value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="e.g. Row F, seats 12–13" maxLength={40} />
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Payment method">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment status">
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className={inputCls}
                  disabled={isComp}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending (pay later)</option>
                </select>
              </Field>
            </div>
          </EditorPanel>

          {/* 3. Client */}
          <EditorPanel title="3. Client" sub="Find someone who has booked before, or add a new client.">
            <ClientPicker clients={clients} onPick={(c) => setClient({ name: c.name, email: c.email, phone: c.phone })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name *">
                <input
                  className={inputCls}
                  value={client.name}
                  onChange={(e) => setClient({ ...client, name: e.target.value })}
                  placeholder="As it should appear on the ticket"
                  maxLength={120}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputCls}
                  value={client.email}
                  onChange={(e) => setClient({ ...client, email: e.target.value })}
                  placeholder="client@example.com"
                  maxLength={200}
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  className={inputCls}
                  value={client.phone}
                  onChange={(e) => setClient({ ...client, phone: e.target.value })}
                  placeholder="+44 7…  /  +92 3…"
                  maxLength={40}
                />
              </Field>
              <div className="flex items-end pb-1">
                {matchedMember ? (
                  <Badge tone="info">
                    <UserRound className="w-3 h-3" /> Registered member — the ticket also shows in their account
                  </Badge>
                ) : client.email.trim() ? (
                  <Badge tone="neutral">New / guest client</Badge>
                ) : null}
              </div>
            </div>
            <Field label="Internal note (optional)" hint="Only visible to admins — e.g. “Paid by bank transfer, ref 4471”.">
              <textarea className={`${inputCls} h-16`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </Field>
          </EditorPanel>

          {/* 4. Delivery */}
          <EditorPanel title="4. Delivery" sub="Send a branded e-ticket from info@jazbatickets.com.">
            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
              <input type="checkbox" checked={emailIt} onChange={(e) => setEmailIt(e.target.checked)} /> Email the ticket to the client now
            </label>
            {emailIt && (
              <Field label="Personal message (optional)" hint="Shown above the ticket in the email.">
                <textarea
                  className={`${inputCls} h-20`}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="e.g. Thanks for booking with us — doors open at 7pm."
                  maxLength={1500}
                />
              </Field>
            )}
          </EditorPanel>
        </div>

        {/* Summary rail */}
        <div className="xl:sticky xl:top-24 space-y-4">
          <div className="bg-black text-white">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
              <span className="font-display font-bold text-xs tracking-[0.2em]">JAZBA TICKETS</span>
              <span className={`${overline} bg-[#ffed00] text-black px-2 py-1 text-[9px]`}>{tierName || "Package"}</span>
            </div>
            <div className="px-5 py-5">
              <span className={`${overline} text-white/50`}>Event</span>
              <p className="font-display font-bold text-lg leading-tight mt-1">{event?.title || "No event chosen"}</p>
              <p className="text-xs text-white/60 mt-1">{info ? [info.date, info.time].filter(Boolean).join(" · ") : "—"}</p>
              <div className="grid grid-cols-2 gap-4 border-t border-white/15 mt-5 pt-4 text-sm">
                <div>
                  <span className={`${overline} text-white/50 block`}>Holder</span>
                  <span className="font-bold block mt-1 truncate">{client.name || "—"}</span>
                </div>
                <div>
                  <span className={`${overline} text-white/50 block`}>Admits</span>
                  <span className="font-bold block mt-1">
                    {quantity}×{tier?.groupSize ? ` (${quantity * tier.groupSize} people)` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e4] p-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666]">
                {quantity} × {isComp ? "Complimentary" : money(unit, currency)}
              </span>
              <span className="font-bold">{isComp ? "Free" : money(totalLocal, currency)}</span>
            </div>
            {currency !== "USD" && !isComp && (
              <div className="flex justify-between text-xs text-[#8a8a8a]">
                <span>Recorded as</span>
                <span>{money(totalUsd)} USD</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#efefef] pt-2">
              <span className="font-bold">Total</span>
              <span className="font-display font-bold text-xl">{isComp ? "Free" : money(totalLocal, currency)}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-[#f7ecec] text-[#7a2f2f] px-4 py-3 text-sm font-bold">
              <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className={`${btnPrimary} w-full py-4 text-sm`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Issuing…" : emailIt ? "Issue & email ticket" : "Issue ticket"}
          </button>
          <p className="text-[11px] text-[#8a8a8a] leading-relaxed">
            Creates the order and {quantity === 1 ? "one admission pass" : `${quantity} admission passes`} for check-in.
            {paymentStatus === "paid" && !isComp ? " Counts towards revenue." : ""}
          </p>
        </div>
      </form>
    </div>
  );
}

/** Search past buyers and members; picking one fills the client fields. */
function ClientPicker({ clients, onPick }: { clients: Client[]; onPick: (c: Client) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const term = q.trim().toLowerCase();
  const matches = term
    ? clients.filter((c) => [c.name, c.email, c.phone].some((v) => (v || "").toLowerCase().includes(term))).slice(0, 8)
    : clients.filter((c) => c.orders.length > 0).slice(0, 6);

  return (
    <div className="relative" ref={boxRef}>
      <label className={labelCls}>Find an existing client</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a8a] pointer-events-none" />
        <input
          className={`${inputCls} pl-9`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name, email or phone…"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#8a8a8a] hover:text-black cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-black z-20 max-h-72 overflow-y-auto">
          {!term && matches.length > 0 && (
            <span className={`${overline} text-[#8a8a8a] block px-4 pt-3 pb-1`}>Recent clients</span>
          )}
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#8a8a8a]">
              {term ? "No match — fill in the details below to add a new client." : "No previous clients yet."}
            </p>
          ) : (
            matches.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  onPick(c);
                  setQ("");
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f7f7f7] text-left cursor-pointer"
              >
                <Avatar src={c.photo} name={c.name} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold truncate">{c.name}</span>
                  <span className="block text-[11px] text-[#8a8a8a] truncate">{c.email || c.phone || "No contact details"}</span>
                </span>
                <span className="text-[10px] font-bold text-[#8a8a8a] shrink-0">
                  {c.orders.length ? `${c.orders.length} order${c.orders.length === 1 ? "" : "s"}` : c.registered ? "Member" : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
