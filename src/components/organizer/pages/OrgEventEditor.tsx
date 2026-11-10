import React, { useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, PlusCircle, Send, Trash2 } from "lucide-react";
import { categories } from "../../../data";
import { notifyOrganizerEmail, saveOrganizerEvent } from "../../../services/organizerService";
import { EditorPanel, Field, addRowBtnCls, fromUsd, inputCls, labelCls, toUsd } from "../../admin/ui";
import { ImageUrlField, MediaPickButton } from "../../admin/media/ImageField";
import { useOrg } from "../OrganizerContext";
import { Hint } from "../orgUi";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface LineupRow {
  name: string;
  role: string;
  avatar: string;
  bio: string;
}
interface FaqRow {
  question: string;
  answer: string;
}
/** One ticket type. `id` is kept once saved (orders refer to it). */
interface TicketRow {
  id: string;
  name: string;
  price: string;
  quantity: string;
  salesEnd: string;
  groupSize: string;
  note: string;
}

const blankTicket = (name = ""): TicketRow => ({ id: "", name, price: "", quantity: "", salesEnd: "", groupSize: "", note: "" });

/** "Early bird (2 people)" → "early-bird-2-people", unique among `taken`. */
function ticketId(name: string, taken: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ticket";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const BLANK = {
  title: "",
  category: "music",
  description: "",
  highlightsText: "",
  bannerImage: "",
  gallery: [] as string[],
  isoDate: "",
  startTime: "19:00",
  endTime: "23:00",
  venue: "",
  city: "",
  country: "Pakistan",
  mapUrl: "",
  priceCurrency: "GBP",
  tickets: [blankTicket("General admission")] as TicketRow[],
  capacity: "",
  lineup: [] as LineupRow[],
  faqs: [] as FaqRow[],
};
type Form = typeof BLANK;

const lines = (t: string) =>
  t
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

/** "20 Jul" + "2026" → "2026-07-20" (blank when it can't be read). */
function isoFrom(date?: string, year?: string): string {
  const m = String(date || "").match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return "";
  const mo = MONTHS_SHORT.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (mo < 0 || !/^\d{4}$/.test(String(year || ""))) return "";
  return `${year}-${String(mo + 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

/** A stored USD price shown back in the currency it was entered in. */
function priceIn(usd: unknown, currency: string): string {
  const n = Number(usd) || 0;
  if (n <= 0) return "";
  const v = fromUsd(n, currency);
  return String(currency === "PKR" ? Math.round(v) : Math.round(v * 100) / 100);
}

function formFrom(e: any): Form {
  const cur = ["PKR", "GBP", "USD"].includes(e.priceCurrency) ? e.priceCurrency : "USD";
  return {
    title: e.title || "",
    category: e.category || "music",
    description: e.description || "",
    highlightsText: (e.highlights || []).join("\n"),
    bannerImage: e.bannerImage || e.image || "",
    gallery: e.gallery || [],
    isoDate: isoFrom(e.date, e.year),
    startTime: e.startTime || "19:00",
    endTime: e.endTime || "",
    venue: e.venue || "",
    city: e.city || "",
    country: e.country || "",
    mapUrl: e.venueInfo?.mapUrl || "",
    priceCurrency: cur,
    tickets: ticketRowsFrom(e, cur),
    capacity: e.capacity ? String(e.capacity) : "",
    lineup: e.lineup || [],
    faqs: e.faqs || [],
  };
}

/** The event's ticket types as editable rows: its own list, or the older
 *  General / VIP / Elite prices. */
function ticketRowsFrom(e: any, cur: string): TicketRow[] {
  if (Array.isArray(e.ticketOptions) && e.ticketOptions.length) {
    return e.ticketOptions.map((o: any) => ({
      id: String(o.id || ""),
      name: String(o.name || ""),
      price: priceIn(o.price, cur),
      quantity: o.capacity ? String(o.capacity) : "",
      salesEnd: toLocalInput(o.salesEnd),
      groupSize: o.groupSize > 1 ? String(o.groupSize) : "",
      note: String(o.note || ""),
    }));
  }
  const rows: TicketRow[] = [];
  const tp = e.tierPrices || {};
  const general = tp.general || e.price;
  if (general > 0) rows.push({ ...blankTicket("General admission"), id: "general", price: priceIn(general, cur) });
  if (tp.vip > 0) rows.push({ ...blankTicket("VIP"), id: "vip", price: priceIn(tp.vip, cur) });
  if (tp.elite > 0) rows.push({ ...blankTicket("Elite"), id: "elite", price: priceIn(tp.elite, cur) });
  return rows.length ? rows : [blankTicket("General admission")];
}

/** What still needs filling in before an event can be sent for review. */
function missingForReview(f: Form): string[] {
  const out: string[] = [];
  if (!f.title.trim()) out.push("event title");
  if (f.description.trim().length < 20) out.push("a description (at least a couple of sentences)");
  if (!f.bannerImage.trim()) out.push("a cover image");
  if (!f.isoDate) out.push("the date");
  if (!f.startTime) out.push("the start time");
  if (!f.venue.trim()) out.push("the venue");
  if (!f.city.trim()) out.push("the city");
  const priced = f.tickets.filter((t) => t.name.trim() && Number(t.price) > 0);
  if (!priced.length) out.push("at least one ticket type with a name and price");
  if (!(Number(f.capacity) > 0) && !priced.every((t) => Number(t.quantity) > 0)) out.push("the total capacity (or a quantity for every ticket type)");
  return out;
}

export default function OrgEventEditor({ eventId }: { eventId?: string }) {
  const { events, eventsLoading, org, orgUid, navigate, notify, fail, reload, report } = useOrg();
  const existing = eventId ? events.find((e) => e.id === eventId) : undefined;
  const soldByTier: Record<string, number> = {};
  for (const [id, t] of Object.entries(report?.events.find((e) => e.id === eventId)?.availability?.tiers || {})) soldByTier[id] = t.sold;
  const [form, setForm] = useState<Form>(() => (existing ? formFrom(existing) : { ...BLANK, city: org.location?.split(",")[0] || "" }));
  const [loadedFor, setLoadedFor] = useState(existing ? eventId : "");
  const [saving, setSaving] = useState<"" | "draft" | "submit" | "save">("");
  const [error, setError] = useState("");

  // The event list may still be loading when the editor opens.
  if (eventId && existing && loadedFor !== eventId) {
    setForm(formFrom(existing));
    setLoadedFor(eventId);
  }
  if (eventId && !existing) {
    return (
      <div className="py-24 text-center">
        {eventsLoading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : (
          <p className="font-bold">
            This event could not be found.{" "}
            <button type="button" className="underline cursor-pointer" onClick={() => navigate("/organizer/events")}>
              Back to events
            </button>
          </p>
        )}
      </div>
    );
  }
  if (existing && ["cancelled", "completed"].includes(existing.status)) {
    return (
      <div className="py-24 text-center text-sm">
        <p className="font-bold">This event is {existing.status} and can’t be edited.</p>
        <p className="text-[#666] mt-1">Email info@jazbatickets.com if something needs changing.</p>
      </div>
    );
  }

  const status: string = existing?.status || "draft";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setRow = <K extends "lineup" | "faqs" | "tickets">(k: K, i: number, patch: Partial<Form[K][number]>) =>
    setForm((f) => ({ ...f, [k]: (f[k] as any[]).map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const removeRow = (k: "lineup" | "faqs" | "tickets", i: number) => setForm((f) => ({ ...f, [k]: (f[k] as any[]).filter((_, j) => j !== i) }));
  const moveTicket = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const list = [...f.tickets];
      const j = i + dir;
      if (j < 0 || j >= list.length) return f;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...f, tickets: list };
    });

  const payload = () => {
    const [y, m, d] = form.isoDate ? form.isoDate.split("-").map(Number) : [0, 0, 0];
    const usd = (v: string) => (Number(v) > 0 ? toUsd(Number(v), form.priceCurrency) : 0);
    // Ticket types: saved ones keep their id (orders point at it).
    const taken = new Set<string>(form.tickets.map((t) => t.id).filter(Boolean));
    const ticketOptions = form.tickets
      .filter((t) => t.name.trim() && Number(t.price) > 0)
      .map((t) => {
        const capacity = Math.max(0, Math.round(Number(t.quantity) || 0));
        const groupSize = Math.max(0, Math.round(Number(t.groupSize) || 0));
        return {
          id: t.id || ticketId(t.name, taken),
          name: t.name.trim().slice(0, 80),
          price: usd(t.price),
          ...(t.note.trim() ? { note: t.note.trim().slice(0, 200) } : {}),
          ...(capacity > 0 ? { capacity } : {}),
          ...(t.salesEnd ? { salesEnd: new Date(t.salesEnd).toISOString() } : {}),
          ...(groupSize > 1 ? { groupSize } : {}),
        };
      });
    const fromPrice = ticketOptions.length ? Math.min(...ticketOptions.map((o) => o.price)) : 0;
    return {
      title: form.title.trim().slice(0, 200),
      category: form.category,
      description: form.description.trim(),
      highlights: lines(form.highlightsText),
      bannerImage: form.bannerImage.trim(),
      image: form.bannerImage.trim(),
      gallery: form.gallery,
      date: form.isoDate ? `${d} ${MONTHS_SHORT[m - 1]}` : "TBA",
      year: form.isoDate ? String(y) : "",
      fullDate: form.isoDate ? `${d} ${MONTHS_LONG[m - 1]} ${y}` : "",
      startTime: form.startTime,
      endTime: form.endTime,
      venue: form.venue.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      venueInfo: { mapUrl: form.mapUrl.trim(), transport: existing?.venueInfo?.transport || [], parking: existing?.venueInfo?.parking || [] },
      capacity: Math.max(0, Math.round(Number(form.capacity) || 0)),
      price: fromPrice,
      ticketOptions,
      // Older screens read these; the ticket types above are what's sold.
      tierPrices: { general: fromPrice },
      priceCurrency: form.priceCurrency,
      lineup: form.lineup.filter((l) => l.name.trim()),
      faqs: form.faqs.filter((f) => f.question.trim()),
      organizerId: orgUid,
      organizerName: org.companyName,
      organizerImage: org.logoUrl || "",
      organizerBio: String(org.description || "").slice(0, 400),
    };
  };

  const save = async (mode: "draft" | "submit" | "save") => {
    setError("");
    if (!form.title.trim()) return setError("Give your event a title first.");
    if (mode === "submit" || (mode === "save" && status !== "draft")) {
      const missing = missingForReview(form);
      if (missing.length) return setError(`Before ${mode === "submit" ? "sending for review" : "saving"}, add ${missing.join(", ")}.`);
    }
    const nextStatus = mode === "draft" ? "draft" : mode === "submit" ? "pending" : status;
    setSaving(mode);
    try {
      const id = await saveOrganizerEvent(eventId || null, {
        ...payload(),
        status: nextStatus,
        ...(mode === "submit" ? { submittedAt: new Date().toISOString() } : {}),
      });
      if (mode === "submit") notifyOrganizerEmail("event-submitted", { eventId: id });
      notify(
        mode === "submit"
          ? "Sent for review — we’ll email you as soon as it’s live."
          : nextStatus === "published"
            ? "Changes saved — they’re live on your event page."
            : "Saved.",
      );
      await reload();
      navigate(`/organizer/events/view/${encodeURIComponent(id)}`);
    } catch (err) {
      console.error("Saving event failed:", err);
      setError("Couldn’t save the event. Please check the details and try again.");
      setSaving("");
    }
  };

  const busy = !!saving;
  const firstPrice = Number(form.tickets.find((t) => Number(t.price) > 0)?.price || 0);
  const pricesHint =
    firstPrice > 0 && form.priceCurrency !== "USD"
      ? `Buyers in other countries see prices converted to their currency (${form.priceCurrency} ${firstPrice} ≈ $${toUsd(firstPrice, form.priceCurrency).toFixed(2)}).`
      : "Buyers see prices converted to their own currency.";
  const totalCapacity = Number(form.capacity) || 0;
  const typeQuantities = form.tickets.reduce((s, t) => s + (Number(t.quantity) || 0), 0);

  return (
    <div className="space-y-6 text-left">
      <div className="bg-black text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate(eventId ? `/organizer/events/view/${encodeURIComponent(eventId)}` : "/organizer/events")}
            className="w-9 h-9 border border-white/30 hover:border-white flex items-center justify-center cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#ffed00] block">
              {eventId ? `Edit event · ${status === "published" ? "On sale" : status === "pending" ? "In review" : "Draft"}` : "Create event"}
            </span>
            <h3 className="font-display font-bold text-lg leading-tight truncate">{form.title || "New event"}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === "draft" ? (
            <>
              <button type="button" disabled={busy} onClick={() => save("draft")} className="py-2.5 px-4 border border-white/30 hover:border-white text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                {saving === "draft" ? "Saving…" : "Save draft"}
              </button>
              <button type="button" disabled={busy} onClick={() => save("submit")} className="py-2.5 px-5 bg-[#ffed00] hover:bg-[#e6d200] text-black text-xs font-bold cursor-pointer disabled:opacity-60 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> {saving === "submit" ? "Sending…" : "Submit for review"}
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => save("save")} className="py-2.5 px-6 bg-[#ffed00] hover:bg-[#e6d200] text-black text-xs font-bold cursor-pointer disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </div>

      {existing?.reviewNote && status === "draft" && (
        <div className="bg-[#fff8c2] border border-[#e6d200] p-4 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold">Changes requested by the Jazba team</p>
            <p className="text-black/75 mt-0.5">{existing.reviewNote}</p>
          </div>
        </div>
      )}
      {status === "published" && (
        <div className="bg-white border border-[#e4e4e4] p-4 text-sm">
          <span className="font-bold">This event is on sale.</span> Changes you save go live straight away — double-check prices and dates.
        </div>
      )}
      {error && <div className="bg-[#f7ecec] text-[#7a2f2f] text-sm font-bold px-4 py-3">{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(status === "draft" ? "draft" : "save");
        }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start text-sm"
      >
        <div className="xl:col-span-2 space-y-6">
          <EditorPanel title="Event details">
            <Field label="Event title *">
              <input className={inputCls} value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Sufi Night with Abida Parveen" />
            </Field>
            <ImageUrlField label="Cover image *" folder="partners" value={form.bannerImage} onChange={(v) => set("bannerImage", v)} wide />
            <Hint>A wide image works best (about 1600 × 900). It’s shown at the top of your event page and on event cards.</Hint>
            <Field label="Description *">
              <textarea
                className={`${inputCls} h-36`}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What’s the event, who’s performing, and why should people come?"
              />
            </Field>
            <Field label="Highlights (one per line)">
              <textarea
                className={`${inputCls} h-20`}
                value={form.highlightsText}
                onChange={(e) => set("highlightsText", e.target.value)}
                placeholder={"Live band\nFood stalls\nFamily friendly"}
              />
            </Field>
          </EditorPanel>

          <EditorPanel title="Date & venue">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date *">
                <input type="date" className={inputCls} value={form.isoDate} onChange={(e) => set("isoDate", e.target.value)} />
              </Field>
              <Field label="Starts *">
                <input type="time" className={inputCls} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
              </Field>
              <Field label="Ends">
                <input type="time" className={inputCls} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Venue *">
                <input className={inputCls} value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. Alhamra Arts Council" />
              </Field>
              <Field label="City *">
                <input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Lahore" />
              </Field>
              <Field label="Country">
                <input className={inputCls} value={form.country} onChange={(e) => set("country", e.target.value)} />
              </Field>
            </div>
            <Field label="Google Maps link or venue address">
              <input className={inputCls} value={form.mapUrl} onChange={(e) => set("mapUrl", e.target.value)} placeholder="Shows a map on your event page" />
            </Field>
          </EditorPanel>

          <EditorPanel
            title="Ticket types"
            sub="Add as many as you like — e.g. Early bird, Standard, VIP, Family (4 people). Each can have its own quantity and sales end."
            action={
              <button type="button" className={addRowBtnCls} onClick={() => set("tickets", [...form.tickets, blankTicket()])}>
                <PlusCircle className="w-3.5 h-3.5" /> Add ticket type
              </button>
            }
          >
            {form.tickets.length === 0 && <Hint>No ticket types yet.</Hint>}
            {form.tickets.map((row, i) => {
              const sold = existing && row.id ? Number(soldByTier[row.id] || 0) : 0;
              return (
                <div key={i} className="bg-[#f7f7f7] p-3 border border-[#e4e4e4] space-y-2.5">
                  <div className="grid grid-cols-12 gap-2">
                    <label className="col-span-12 sm:col-span-6">
                      <span className="text-[10px] font-bold text-[#666] block mb-1">Name *</span>
                      <input className="w-full bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.name} onChange={(e) => setRow("tickets", i, { name: e.target.value })} placeholder="e.g. Early bird" />
                    </label>
                    <label className="col-span-6 sm:col-span-3">
                      <span className="text-[10px] font-bold text-[#666] block mb-1">Price ({form.priceCurrency}) *</span>
                      <input type="number" min={0} step="0.01" className="w-full bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.price} onChange={(e) => setRow("tickets", i, { price: e.target.value })} placeholder="0" />
                    </label>
                    <label className="col-span-6 sm:col-span-3">
                      <span className="text-[10px] font-bold text-[#666] block mb-1">Quantity</span>
                      <input type="number" min={0} className="w-full bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.quantity} onChange={(e) => setRow("tickets", i, { quantity: e.target.value })} placeholder="No limit" />
                    </label>
                    <label className="col-span-12 sm:col-span-5">
                      <span className="text-[10px] font-bold text-[#666] block mb-1">Sales end (optional)</span>
                      <input type="datetime-local" className="w-full bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.salesEnd} onChange={(e) => setRow("tickets", i, { salesEnd: e.target.value })} />
                    </label>
                    <label className="col-span-6 sm:col-span-3">
                      <span className="text-[10px] font-bold text-[#666] block mb-1">People per ticket</span>
                      <input type="number" min={1} max={20} className="w-full bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.groupSize} onChange={(e) => setRow("tickets", i, { groupSize: e.target.value })} placeholder="1" />
                    </label>
                    <div className="col-span-6 sm:col-span-4 flex items-end justify-end gap-1">
                      <button type="button" onClick={() => moveTicket(i, -1)} disabled={i === 0} className="p-2 border border-[#e4e4e4] bg-white text-xs font-bold cursor-pointer disabled:opacity-30" title="Move up">↑</button>
                      <button type="button" onClick={() => moveTicket(i, 1)} disabled={i === form.tickets.length - 1} className="p-2 border border-[#e4e4e4] bg-white text-xs font-bold cursor-pointer disabled:opacity-30" title="Move down">↓</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (sold > 0 && !window.confirm(`${sold} ${row.name} ticket${sold === 1 ? " has" : "s have"} been sold. Remove this type from sale anyway? Those tickets stay valid.`)) return;
                          removeRow("tickets", i);
                        }}
                        className="p-2 text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer"
                        title="Remove ticket type"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input className="w-full bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.note} onChange={(e) => setRow("tickets", i, { note: e.target.value })} placeholder="Short description (optional) — e.g. Includes a drink, front rows" />
                  {sold > 0 && <Hint>{sold} sold so far.</Hint>}
                </div>
              );
            })}
            <Hint>{pricesHint} A sold-out or closed ticket type shows a waitlist on your event page.</Hint>
          </EditorPanel>

          <EditorPanel
            title="Line-up"
            sub="Optional — performers shown on your event page."
            action={
              <button type="button" className={addRowBtnCls} onClick={() => set("lineup", [...form.lineup, { name: "", role: "", avatar: "", bio: "" }])}>
                <PlusCircle className="w-3.5 h-3.5" /> Add performer
              </button>
            }
          >
            {form.lineup.length === 0 && <Hint>No performers added.</Hint>}
            {form.lineup.map((row, i) => (
              <div key={i} className="bg-[#f7f7f7] p-2.5 border border-[#e4e4e4] space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <input className="col-span-12 sm:col-span-4 bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.name} onChange={(e) => setRow("lineup", i, { name: e.target.value })} placeholder="Name" />
                  <input className="col-span-12 sm:col-span-3 bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.role} onChange={(e) => setRow("lineup", i, { role: e.target.value })} placeholder="Role, e.g. Headliner" />
                  <div className="col-span-10 sm:col-span-4 flex gap-1.5 min-w-0">
                    <input className="flex-1 min-w-0 bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.avatar} onChange={(e) => setRow("lineup", i, { avatar: e.target.value })} placeholder="Photo (optional)" />
                    <MediaPickButton folder="partners" onSelect={(urls) => setRow("lineup", i, { avatar: urls[0] })} />
                  </div>
                  <button type="button" onClick={() => removeRow("lineup", i)} className="col-span-2 sm:col-span-1 p-2 text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer flex items-center justify-center" title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input className="w-full bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.bio} onChange={(e) => setRow("lineup", i, { bio: e.target.value })} placeholder="One line about them" />
              </div>
            ))}
          </EditorPanel>

          <EditorPanel
            title="Questions & answers"
            sub="Optional — parking, age limits, dress code, refunds…"
            action={
              <button type="button" className={addRowBtnCls} onClick={() => set("faqs", [...form.faqs, { question: "", answer: "" }])}>
                <PlusCircle className="w-3.5 h-3.5" /> Add question
              </button>
            }
          >
            {form.faqs.length === 0 && <Hint>No questions added.</Hint>}
            {form.faqs.map((row, i) => (
              <div key={i} className="bg-[#f7f7f7] p-2.5 border border-[#e4e4e4] space-y-2">
                <div className="flex gap-2">
                  <input className="flex-1 bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black" value={row.question} onChange={(e) => setRow("faqs", i, { question: e.target.value })} placeholder="Question" />
                  <button type="button" onClick={() => removeRow("faqs", i)} className="p-2 text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer" title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea className="w-full bg-white px-2.5 py-2 text-sm border border-[#e4e4e4] outline-none focus:border-black h-16" value={row.answer} onChange={(e) => setRow("faqs", i, { answer: e.target.value })} placeholder="Answer" />
              </div>
            ))}
          </EditorPanel>

          <EditorPanel
            title="Photo gallery"
            sub="Optional — photos from your past events."
            action={
              <MediaPickButton
                multiple
                folder="partners"
                label="Add photos"
                onSelect={(urls) => set("gallery", [...form.gallery, ...urls.filter((u) => !form.gallery.includes(u))])}
              />
            }
          >
            {form.gallery.length === 0 ? (
              <Hint>No photos yet.</Hint>
            ) : (
              <div className="flex flex-wrap gap-2">
                {form.gallery.map((src, i) => (
                  <div key={`${i}-${src}`} className="relative">
                    <img src={src} alt="" className="w-20 h-20 object-cover bg-[#f2f2f2]" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      title="Remove photo"
                      aria-label="Remove photo"
                      onClick={() => set("gallery", form.gallery.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white text-xs leading-none flex items-center justify-center cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </EditorPanel>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24">
          <EditorPanel title="Tickets">
            <Field label="Prices in">
              <select className={inputCls} value={form.priceCurrency} onChange={(e) => set("priceCurrency", e.target.value)}>
                <option value="GBP">British pounds (GBP)</option>
                <option value="USD">US dollars (USD)</option>
                <option value="PKR">Pakistani rupees (PKR)</option>
              </select>
            </Field>
            <Field label="Total capacity (venue limit)">
              <input type="number" min={0} className={inputCls} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="e.g. 500" />
            </Field>
            <Hint>
              {totalCapacity > 0
                ? `No more than ${totalCapacity} tickets sell in total, whatever the types allow.`
                : "Leave empty if each ticket type has its own quantity."}
              {totalCapacity > 0 && typeQuantities > totalCapacity ? ` Your ticket types add up to ${typeQuantities} — the total limit still applies.` : ""}
            </Hint>
          </EditorPanel>

          <EditorPanel title="Category">
            <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {categories
                .filter((c) => c.id !== "all")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </EditorPanel>

          <div className="bg-white border border-[#e4e4e4] p-5 text-xs text-[#555] space-y-2 leading-relaxed">
            <span className={labelCls}>How it goes live</span>
            <p>1. Save a draft any time, then submit it for review.</p>
            <p>2. The Jazba team checks it — usually within a day.</p>
            <p>3. It goes on sale and you get an email with the link.</p>
            <p>Payments are collected by Jazba Tickets and settled with you after the event.</p>
          </div>
        </div>
      </form>
    </div>
  );
}
