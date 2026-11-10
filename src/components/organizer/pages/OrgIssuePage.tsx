import React, { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mail, RotateCcw, TicketPlus, XCircle } from "lucide-react";
import { EventItem, getAvailableTiers } from "../../../types";
import { cancelOrganizerTicket, issueOrganizerTicket, resendOrganizerTicket } from "../../../services/organizerToolsService";
import {
  Badge, DataTable, EditorPanel, EmptyRow, Field, PageHeader, btnOutline, btnPrimary, fmtDateTime, inputCls, tdCls, thCls,
} from "../../admin/ui";
import { useOrg } from "../OrganizerContext";
import { Hint, eventDateText } from "../orgUi";

/** Guest list, complimentary and box-office tickets the organiser hands out
 *  themselves — real tickets with a QR code, emailed straight to the guest. */
export default function OrgIssuePage() {
  const { events, report, toolOrgId, notify, fail, reload, navigate } = useOrg();
  const issuable = events.filter((e) => e.status !== "cancelled" && e.status !== "draft");
  const preset = new URLSearchParams(window.location.search).get("event") || "";
  const [eventId, setEventId] = useState(issuable.some((e) => e.id === preset) ? preset : issuable[0]?.id || "");
  const event = issuable.find((e) => e.id === eventId);
  const tiers = useMemo(() => (event ? getAvailableTiers(event as EventItem) : []), [event]);
  const [tier, setTier] = useState("");
  const tierId = tiers.some((t) => t.tier === tier) ? tier : tiers[0]?.tier || "";
  const avail = report?.events.find((e) => e.id === eventId)?.availability;
  const leftOf = (id: string) => (avail ? (avail.tiers[id]?.left ?? avail.left) : null);

  const [quantity, setQuantity] = useState("1");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [send, setSend] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ orderId: string; emailed: boolean; to: string } | null>(null);

  const issued = (report?.orders || []).filter((o) => o.source === "organizer");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const q = Math.floor(Number(quantity));
    if (!event) return setError("Choose an event first.");
    if (!tierId) return setError("This event has no ticket types yet — add them in the event editor.");
    if (!name.trim()) return setError("Add the guest’s name.");
    if (!(q >= 1 && q <= 50)) return setError("Issue between 1 and 50 tickets at a time.");
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("That email address doesn’t look right.");
    if (send && !email.trim()) return setError("Add an email address to send the ticket, or untick “Email the ticket”.");
    const left = leftOf(tierId);
    if (left !== null && q > left) return setError(left <= 0 ? "That ticket type is sold out." : `Only ${left} left of that ticket type.`);
    setBusy(true);
    try {
      const result = await issueOrganizerTicket(
        { eventId: event.id, tier: tierId, quantity: q, name: name.trim(), email: email.trim(), phone: phone.trim(), note: note.trim(), send: send && !!email.trim() },
        toolOrgId,
      );
      setDone({ ...result, to: email.trim() });
      notify(result.emailed ? `Ticket ${result.orderId} emailed to ${email.trim()}.` : `Ticket ${result.orderId} issued.`);
      setName("");
      setEmail("");
      setPhone("");
      setNote("");
      setQuantity("1");
      void reload();
    } catch (err: any) {
      setError(err?.message || "Couldn’t issue the ticket.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async (orderId: string) => {
    try {
      const r = await resendOrganizerTicket(orderId, "", toolOrgId);
      notify(`Ticket sent again to ${r.sentTo}.`);
      void reload();
    } catch (err: any) {
      fail(err?.message || "Couldn’t send the ticket.");
    }
  };
  const cancel = async (orderId: string) => {
    if (!window.confirm(`Cancel ticket ${orderId}? Its QR code will stop working at the door.`)) return;
    try {
      await cancelOrganizerTicket(orderId, toolOrgId);
      notify("Ticket cancelled.");
      void reload();
    } catch (err: any) {
      fail(err?.message || "Couldn’t cancel the ticket.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue tickets"
        sub="Guest list, complimentary or box-office tickets. Each one is a real ticket with its own QR code, checked at the door like any other."
      />

      {done && (
        <div className="bg-black text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#ffed00] shrink-0" />
            <div>
              <p className="font-display font-bold text-lg">Ticket {done.orderId} issued</p>
              <p className="text-sm text-white/70 mt-0.5">
                {done.emailed ? `Emailed to ${done.to} with the QR code and a PDF.` : "Not emailed — you can send it from the list below."}
              </p>
            </div>
          </div>
          <button type="button" className="bg-[#ffed00] text-black text-xs font-bold px-4 py-2.5 cursor-pointer" onClick={() => setDone(null)}>
            Issue another
          </button>
        </div>
      )}

      {issuable.length === 0 ? (
        <div className="bg-white border border-[#e4e4e4] p-8 text-center text-sm">
          <TicketPlus className="w-8 h-8 mx-auto" />
          <p className="font-bold mt-3">No events to issue tickets for yet</p>
          <p className="text-[#666] mt-1">Once an event is submitted or on sale, you can hand out tickets for it here.</p>
          <button type="button" className={`${btnPrimary} mt-4`} onClick={() => navigate("/organizer/events/new")}>
            Create an event
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start text-sm" noValidate>
          <div className="xl:col-span-2 space-y-6">
            <EditorPanel title="Ticket">
              <Field label="Event">
                <select className={inputCls} value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  {issuable.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} — {eventDateText(e)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Ticket type" className="sm:col-span-2">
                  <select className={inputCls} value={tierId} onChange={(e) => setTier(e.target.value)}>
                    {tiers.map((t) => {
                      const left = leftOf(t.tier);
                      return (
                        <option key={t.tier} value={t.tier} disabled={left !== null && left <= 0}>
                          {t.name}
                          {left !== null ? ` — ${left <= 0 ? "sold out" : `${left} left`}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </Field>
                <Field label="How many">
                  <input type="number" min={1} max={50} className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </Field>
              </div>
              <Hint>Issued tickets are free and count towards your capacity.</Hint>
            </EditorPanel>

            <EditorPanel title="Guest">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name *">
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder="Name on the ticket" />
                </Field>
                <Field label="Email">
                  <input type="email" inputMode="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Where to send it" />
                </Field>
                <Field label="Phone (optional)">
                  <input type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Field label="Note for you (optional)">
                  <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sponsor guest list" />
                </Field>
              </div>
              <label className="flex items-center gap-2.5 font-bold cursor-pointer">
                <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} className="w-4 h-4" />
                Email the ticket to the guest
              </label>
            </EditorPanel>
          </div>

          <div className="space-y-4 xl:sticky xl:top-24">
            <div className="bg-white border border-[#e4e4e4] p-5 space-y-3">
              <p className="font-bold">{event?.title}</p>
              <p className="text-xs text-[#666]">{event ? eventDateText(event) : ""}</p>
              {error && <p className="text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-3 py-2">{error}</p>}
              <button type="submit" disabled={busy} className={`${btnPrimary} w-full justify-center py-3`}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <TicketPlus className="w-4 h-4" />} Issue ticket
              </button>
            </div>
            <p className="text-xs text-[#8a8a8a] leading-relaxed">
              Only tickets you issue here can be cancelled here. For a refund on a paid order, email{" "}
              <a className="underline" href="mailto:info@jazbatickets.com">info@jazbatickets.com</a>.
            </p>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#e4e4e4]">
        <div className="px-5 py-4 border-b border-[#f2f2f2]">
          <h3 className="font-display font-bold text-sm">Tickets you’ve issued</h3>
        </div>
        <DataTable
          head={
            <>
              <th className={thCls}>Order</th>
              <th className={thCls}>Guest</th>
              <th className={thCls}>Event</th>
              <th className={thCls}>Tickets</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Issued</th>
              <th className={thCls}></th>
            </>
          }
        >
          {issued.map((o) => (
            <tr key={o.id} className="hover:bg-[#fafafa]">
              <td className={`${tdCls} font-mono text-xs whitespace-nowrap`}>{o.id}</td>
              <td className={tdCls}>
                <p className="font-bold">{o.buyerName || "—"}</p>
                <p className="text-[11px] text-[#8a8a8a]">{o.buyerEmail || "No email"}</p>
              </td>
              <td className={`${tdCls} max-w-[200px] truncate`}>{o.eventTitle}</td>
              <td className={`${tdCls} whitespace-nowrap`}>
                {o.quantity} × {o.tierName}
              </td>
              <td className={tdCls}>{o.status === "cancelled" ? <Badge tone="negative">Cancelled</Badge> : <Badge tone="positive">Issued</Badge>}</td>
              <td className={`${tdCls} whitespace-nowrap text-xs`}>{fmtDateTime(o.createdAt)}</td>
              <td className={`${tdCls} whitespace-nowrap text-right`}>
                {o.status !== "cancelled" && (
                  <span className="inline-flex gap-1">
                    {o.buyerEmail && (
                      <button type="button" className={btnOutline} onClick={() => resend(o.id)} title="Email the ticket again">
                        <Mail className="w-3.5 h-3.5" /> <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                    <button type="button" className="text-xs font-bold text-[#7a2f2f] hover:bg-[#f7ecec] px-2.5 py-2 cursor-pointer" onClick={() => cancel(o.id)} title="Cancel ticket">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}
          {issued.length === 0 && <EmptyRow colSpan={7} title="None yet" sub="Tickets you issue appear here." />}
        </DataTable>
      </div>
    </div>
  );
}
