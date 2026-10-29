import React, { useEffect, useMemo, useState } from "react";
import { PlusCircle, Trash2, Edit3, Calendar, Loader2, ExternalLink, Copy, Send, Download, Globe } from "lucide-react";
import { createEvent, updateEvent, deleteEvent, purgeCollection } from "../../../services/backendService";
import { categories } from "../../../data";
import { SEED_PAST_EVENTS } from "../../../seedPastEvents";
import { AgendaEntry, LineupEntry, EventFaq, eventPath } from "../../../types";
import { auth } from "../../../firebase";
import { useAdmin, AdminEvent } from "../AdminContext";
import {
  DataTable,
  EditorHeader,
  EditorPanel,
  EmptyRow,
  EVENT_STATUS,
  Field,
  FilterTabs,
  IconButton,
  ImageUrlField,
  PageHeader,
  SearchInput,
  StatusBadge,
  TableFooter,
  Toolbar,
  addRowBtnCls,
  btnDark,
  btnOutline,
  btnPrimary,
  downloadCsv,
  inputCls,
  labelCls,
  money,
  selectCls,
  tdCls,
  thCls,
} from "../ui";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const BLANK_EVENT_FORM = {
  title: "",
  description: "",
  category: "music",
  venue: "",
  city: "London",
  country: "United Kingdom",
  date: "20 Jul",
  year: "",
  fullDate: "",
  startTime: "19:30",
  endTime: "22:30",
  bannerImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=crop",
  capacity: 1000,
  price: 85,
  type: "upcoming" as "top" | "for-you" | "near-by" | "upcoming",
  status: "draft" as "draft" | "published" | "cancelled" | "completed",

  // ---- Event page content (each hides its section when left empty) ----
  priceVip: "",
  priceElite: "",
  highlightsText: "",
  agenda: [] as AgendaEntry[],
  lineup: [] as LineupEntry[],
  organizerName: "",
  organizerBio: "",
  organizerImage: "",
  mapUrl: "",
  transportText: "",
  parkingText: "",
  galleryText: "",
  faqs: [] as EventFaq[],
};
type EventForm = typeof BLANK_EVENT_FORM;

const parseLines = (text: string) =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

/** "20 Jul" + "2026" → "2026-07-20" for the date picker ('' if unparseable). */
function isoFromForm(date: string, year: string): string {
  const m = (date || "").match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return "";
  const mo = MONTHS_SHORT.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (mo < 0) return "";
  const y = /^\d{4}$/.test(year) ? year : String(new Date().getFullYear());
  return `${y}-${String(mo + 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

export default function EventsPage() {
  const { route } = useAdmin();
  // Keyed so switching between "new" and an edit (or two edits) starts a fresh form.
  if (route.sub === "new" || route.sub === "edit") {
    return (
      <React.Fragment key={`${route.sub}:${route.id}`}>
        <EventEditor eventId={route.sub === "edit" ? route.id : undefined} />
      </React.Fragment>
    );
  }
  return <EventsList />;
}

// ── List ───────────────────────────────────────────────────────────────────

function EventsList() {
  const { data, allEvents, eventInfo, navigate, notify, fail, reload, wpLoading, route } = useAdmin();
  const [source, setSource] = useState<"site" | "wordpress">(route.query.get("source") === "wordpress" ? "wordpress" : "site");
  const [status, setStatus] = useState<"all" | "published" | "draft" | "cancelled" | "completed">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState("");
  const [working, setWorking] = useState(false);
  const [importingEvents, setImportingEvents] = useState(false);
  const [purging, setPurging] = useState(false);

  const sales = useMemo(() => {
    const m = new Map<string, { sold: number; revenue: number }>();
    for (const b of data.bookings) {
      const cur = m.get(b.eventId) || { sold: 0, revenue: 0 };
      if (b.bookingStatus !== "cancelled") cur.sold += Number(b.quantity) || 1;
      if (b.paymentStatus === "paid") cur.revenue += Number(b.amount ?? b.pricePaid) || 0;
      m.set(b.eventId, cur);
    }
    return m;
  }, [data.bookings]);

  const siteEvents = allEvents.filter((e) => e.source === "site");
  const wpEvents = allEvents.filter((e) => e.source === "wordpress");
  const sorted = (list: AdminEvent[]) =>
    [...list].sort((a, b) => (eventInfo(b.id).timestamp ?? 0) - (eventInfo(a.id).timestamp ?? 0));

  const q = query.trim().toLowerCase();
  const matches = (e: AdminEvent) =>
    !q || [e.title, e.venue, e.city, e.location, e.category].some((v) => (v || "").toLowerCase().includes(q));
  const siteFiltered = sorted(siteEvents).filter((e) => (status === "all" || (e.status || "draft") === status) && matches(e));
  const wpFiltered = sorted(wpEvents).filter(matches);
  const count = (s: typeof status) => siteEvents.filter((e) => s === "all" || (e.status || "draft") === s).length;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allSelected = siteFiltered.length > 0 && siteFiltered.every((e) => selected.has(e.id));

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this event? This action cannot be undone.")) return;
    try {
      await deleteEvent(id);
      notify("Event deleted.");
      reload();
    } catch {
      fail("Failed to delete event listing.");
    }
  };

  const handleDuplicate = async (evt: AdminEvent) => {
    const { id: _id, source: _s, slug: _slug, location: _l, time: _t, ...rest } = evt as any;
    try {
      await createEvent({ ...rest, title: `${evt.title} (copy)`, status: "draft", organizerId: auth.currentUser?.uid || "admin" });
      notify("Event duplicated as a draft.");
      reload();
    } catch {
      fail("Failed to duplicate the event.");
    }
  };

  const applyBulk = async () => {
    const ids = [...selected];
    if (!bulk || ids.length === 0) return;
    if (bulk === "delete" && !window.confirm(`Delete ${ids.length} event(s)? This cannot be undone.`)) return;
    setWorking(true);
    let failed = 0;
    for (const id of ids) {
      try {
        if (bulk === "delete") await deleteEvent(id);
        else await updateEvent(id, { status: bulk });
      } catch {
        failed++;
      }
    }
    setWorking(false);
    setSelected(new Set());
    setBulk("");
    if (failed) fail(`${failed} event(s) could not be updated.`);
    else notify(bulk === "delete" ? `${ids.length} event(s) deleted.` : `${ids.length} event(s) updated.`);
    reload();
  };

  // One-click import of the organiser's real past events (scraped from
  // Eventbrite). Skips events whose title already exists.
  const handleImportPastEvents = async () => {
    if (
      !window.confirm(
        `Import ${SEED_PAST_EVENTS.length} past events from the Jazba Entertainment Eventbrite profile? Events with the same title are skipped.`,
      )
    )
      return;
    setImportingEvents(true);
    const existingTitles = new Set(data.events.map((e) => (e.title || "").trim().toLowerCase()));
    let added = 0;
    let skipped = 0;
    let failed = 0;
    for (const seed of SEED_PAST_EVENTS) {
      if (existingTitles.has(seed.title.trim().toLowerCase())) {
        skipped++;
        continue;
      }
      try {
        await createEvent({
          ...seed,
          image: seed.bannerImage,
          tierPrices: { general: seed.price },
          highlights: [],
          gallery: [],
          agenda: [],
          lineup: [],
          faqs: [],
          venueInfo: { mapUrl: `${seed.venue}, ${seed.city}`, transport: [], parking: [] },
          organizerName: "Jazba Entertainment Ltd.",
          organizerBio: "",
          organizerImage: "",
          organizerId: auth.currentUser?.uid || "admin",
        });
        added++;
      } catch (err) {
        console.error(`Failed to import event ${seed.title}:`, err);
        failed++;
      }
    }
    setImportingEvents(false);
    if (failed > 0) fail(`${failed} event(s) failed to import — try again.`);
    notify(`Past events import finished: ${added} added, ${skipped} already existed.`);
    reload();
  };

  const handlePurge = async () => {
    if (!window.confirm("Delete ALL events? This permanently removes them from the database and cannot be undone.")) return;
    setPurging(true);
    try {
      const removed = await purgeCollection("events");
      notify(`Deleted ${removed} record(s).`);
    } catch (err) {
      console.error("Purge failed:", err);
      fail("Failed to delete — make sure you are signed in as an admin.");
    } finally {
      setPurging(false);
      reload();
    }
  };

  const exportCsv = () =>
    downloadCsv(`jazba-events-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Title", "Source", "Status", "Date", "Time", "Venue", "Category", "Base price (USD)", "Tickets sold", "Revenue (USD)"],
      ...[...siteFiltered, ...wpFiltered].map((e) => {
        const i = eventInfo(e.id);
        const s = sales.get(e.id);
        return [e.title, e.source === "site" ? "Site" : "jazbaentertainment.com", e.source === "site" ? e.status || "draft" : "published", i.date, i.time, i.venue, e.category, e.price, s?.sold || 0, (s?.revenue || 0).toFixed(2)];
      }),
    ]);

  return (
    <div>
      <PageHeader
        title="Events"
        sub="Events created here, plus the shows published on jazbaentertainment.com."
        actions={
          <>
            {data.events.length > 0 && (
              <button type="button" onClick={handlePurge} disabled={purging} className={btnOutline} title="Remove every event from the database">
                <Trash2 className="w-4 h-4" />
                {purging ? "Deleting…" : `Delete all events (${data.events.length})`}
              </button>
            )}
            <button
              type="button"
              onClick={handleImportPastEvents}
              disabled={importingEvents}
              className={btnDark}
              title="Adds the organiser's real past events from the Jazba Entertainment Eventbrite profile"
            >
              {importingEvents ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {importingEvents ? "Importing…" : `Import past events (${SEED_PAST_EVENTS.length})`}
            </button>
            <button type="button" onClick={() => navigate("/admin/events/new")} className={btnPrimary}>
              <PlusCircle className="w-4 h-4" /> Create event
            </button>
          </>
        }
      />

      <div className="flex border-b border-[#e4e4e4] mb-5">
        {[
          { id: "site" as const, label: "Site events", count: siteEvents.length },
          { id: "wordpress" as const, label: "jazbaentertainment.com", count: wpEvents.length },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSource(t.id)}
            className={`relative px-4 py-3 text-sm font-bold cursor-pointer flex items-center gap-2 ${
              source === t.id ? "text-black" : "text-[#8a8a8a] hover:text-black"
            }`}
          >
            {t.id === "wordpress" && <Globe className="w-4 h-4" />}
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 ${source === t.id ? "bg-black text-white" : "bg-[#e9e9e9] text-[#555]"}`}>
              {t.id === "wordpress" && wpLoading ? "…" : t.count}
            </span>
            {source === t.id && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-black" />}
          </button>
        ))}
      </div>

      {source === "site" ? (
        <div className="bg-white border border-[#e4e4e4]">
          <FilterTabs
            tabs={[
              { id: "all" as const, label: "All", count: count("all") },
              { id: "published" as const, label: "Published", count: count("published") },
              { id: "draft" as const, label: "Draft", count: count("draft") },
              { id: "cancelled" as const, label: "Cancelled", count: count("cancelled") },
              { id: "completed" as const, label: "Completed", count: count("completed") },
            ]}
            value={status}
            onChange={setStatus}
          />
          <Toolbar>
            <div className="flex items-center gap-2">
              <select value={bulk} onChange={(e) => setBulk(e.target.value)} className={selectCls} aria-label="Bulk actions">
                <option value="">Bulk actions</option>
                <option value="published">Publish</option>
                <option value="draft">Move to draft</option>
                <option value="cancelled">Mark cancelled</option>
                <option value="completed">Mark completed</option>
                <option value="delete">Delete</option>
              </select>
              <button type="button" onClick={applyBulk} disabled={!bulk || selected.size === 0 || working} className={`${btnOutline} py-1.5`}>
                {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Apply{selected.size ? ` (${selected.size})` : ""}
              </button>
            </div>
            <SearchInput value={query} onChange={setQuery} placeholder="Search title, venue, city…" />
            <button type="button" onClick={exportCsv} className="ml-auto text-xs font-bold flex items-center gap-1.5 hover:underline cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </Toolbar>
          <DataTable
            head={
              <>
                <th className={`${thCls} w-10`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(siteFiltered.map((e) => e.id)))}
                    aria-label="Select all"
                  />
                </th>
                <th className={thCls}>Event</th>
                <th className={thCls}>Date</th>
                <th className={thCls}>Venue &amp; city</th>
                <th className={thCls}>Sold</th>
                <th className={thCls}>Revenue</th>
                <th className={thCls}>Status</th>
                <th className={`${thCls} text-right`}>Actions</th>
              </>
            }
          >
            {siteFiltered.map((evt) => {
              const i = eventInfo(evt.id);
              const s = sales.get(evt.id);
              return (
                <tr key={evt.id} className={`hover:bg-[#fafafa] ${selected.has(evt.id) ? "bg-[#fffde6]" : ""}`}>
                  <td className={tdCls}>
                    <input type="checkbox" checked={selected.has(evt.id)} onChange={() => toggle(evt.id)} aria-label={`Select ${evt.title}`} />
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <img src={evt.image} alt="" className="w-14 h-10 object-cover shrink-0 bg-[#f2f2f2]" />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/events/edit/${encodeURIComponent(evt.id)}`)}
                          className="font-bold text-left hover:underline cursor-pointer line-clamp-2"
                        >
                          {evt.title}
                        </button>
                        <span className="block text-[11px] text-[#8a8a8a] capitalize">
                          {categories.find((c) => c.id === evt.category)?.name || evt.category} · from {money(evt.price)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>
                    <span className="font-bold">{i.date}</span>
                    {i.time && <span className="block text-[11px] text-[#8a8a8a]">{i.time}</span>}
                  </td>
                  <td className={tdCls}>
                    {evt.venue}, {evt.city}
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>
                    <span className="font-bold">{s?.sold || 0}</span>
                    {evt.capacity ? <span className="text-[11px] text-[#8a8a8a]"> / {evt.capacity}</span> : null}
                  </td>
                  <td className={`${tdCls} font-bold whitespace-nowrap`}>{money(s?.revenue || 0)}</td>
                  <td className={tdCls}>
                    <StatusBadge map={EVENT_STATUS} value={evt.status || "draft"} />
                  </td>
                  <td className={`${tdCls} text-right`}>
                    <div className="flex items-center justify-end">
                      <IconButton title="Edit event" onClick={() => navigate(`/admin/events/edit/${encodeURIComponent(evt.id)}`)}>
                        <Edit3 className="w-4 h-4" />
                      </IconButton>
                      <IconButton title="Issue a ticket" onClick={() => navigate(`/admin/tickets/new?event=${encodeURIComponent(evt.id)}`)}>
                        <Send className="w-4 h-4" />
                      </IconButton>
                      <IconButton title="View on site" href={eventPath(evt)}>
                        <ExternalLink className="w-4 h-4" />
                      </IconButton>
                      <IconButton title="Duplicate" onClick={() => handleDuplicate(evt)}>
                        <Copy className="w-4 h-4" />
                      </IconButton>
                      <IconButton title="Delete event" onClick={() => handleDelete(evt.id)} danger>
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {siteFiltered.length === 0 && (
              <EmptyRow
                colSpan={8}
                title={siteEvents.length ? "No events match your filters" : "No events found."}
                action={
                  siteEvents.length ? undefined : (
                    <button type="button" onClick={() => navigate("/admin/events/new")} className={btnPrimary}>
                      <PlusCircle className="w-4 h-4" /> Create event
                    </button>
                  )
                }
              />
            )}
          </DataTable>
          <TableFooter shown={siteFiltered.length} total={siteEvents.length} noun="events" />
        </div>
      ) : (
        <div className="bg-white border border-[#e4e4e4]">
          <div className="px-4 py-3 border-b border-[#efefef] bg-[#fafafa] text-xs text-[#555]">
            These events are published on <span className="font-bold text-black">jazbaentertainment.com</span> and sold through the same
            checkout. Edit them in WordPress — changes show here within about 5 minutes.
          </div>
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder="Search title or venue…" />
          </Toolbar>
          <DataTable
            head={
              <>
                <th className={thCls}>Event</th>
                <th className={thCls}>Date</th>
                <th className={thCls}>Venue</th>
                <th className={thCls}>Tickets</th>
                <th className={thCls}>Sold</th>
                <th className={thCls}>Revenue</th>
                <th className={`${thCls} text-right`}>Actions</th>
              </>
            }
          >
            {wpLoading && wpEvents.length === 0 && (
              <tr>
                <td colSpan={7} className="py-14 text-center text-xs font-bold text-[#8a8a8a]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading events from jazbaentertainment.com…
                </td>
              </tr>
            )}
            {wpFiltered.map((evt) => {
              const i = eventInfo(evt.id);
              const s = sales.get(evt.id);
              const wpId = evt.id.replace(/^wp-/, "");
              return (
                <tr key={evt.id} className="hover:bg-[#fafafa]">
                  <td className={tdCls}>
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <img src={evt.image} alt="" className="w-14 h-10 object-cover shrink-0 bg-[#f2f2f2]" />
                      <span className="font-bold line-clamp-2">{evt.title}</span>
                    </div>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>
                    <span className="font-bold">{i.date}</span>
                    {!i.upcoming && i.timestamp !== null && <span className="block text-[11px] text-[#8a8a8a]">Ended</span>}
                  </td>
                  <td className={tdCls}>{i.venue || "—"}</td>
                  <td className={tdCls}>
                    {evt.externalTicketUrl ? (
                      <span className="text-[11px] font-bold text-[#7a4f0e]">Sold by partner</span>
                    ) : (
                      <span className="text-[11px] font-bold">{evt.ticketOptions?.length || 0} packages</span>
                    )}
                  </td>
                  <td className={`${tdCls} font-bold`}>{s?.sold || 0}</td>
                  <td className={`${tdCls} font-bold whitespace-nowrap`}>{money(s?.revenue || 0)}</td>
                  <td className={`${tdCls} text-right`}>
                    <div className="flex items-center justify-end">
                      <IconButton title="Issue a ticket" onClick={() => navigate(`/admin/tickets/new?event=${encodeURIComponent(evt.id)}`)}>
                        <Send className="w-4 h-4" />
                      </IconButton>
                      <IconButton title="View on site" href={eventPath(evt)}>
                        <ExternalLink className="w-4 h-4" />
                      </IconButton>
                      <IconButton
                        title="Edit in WordPress"
                        href={`https://jazbaentertainment.com/wp-admin/post.php?post=${encodeURIComponent(wpId)}&action=edit`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!wpLoading && wpFiltered.length === 0 && (
              <EmptyRow colSpan={7} title={wpEvents.length ? "No events match your search" : "No events from jazbaentertainment.com"} />
            )}
          </DataTable>
          <TableFooter shown={wpFiltered.length} total={wpEvents.length} noun="events" />
        </div>
      )}
    </div>
  );
}

// ── Editor ─────────────────────────────────────────────────────────────────

function EventEditor({ eventId }: { eventId?: string }) {
  const { data, loading, navigate, notify, fail, reload } = useAdmin();
  const editing = data.events.find((e) => e.id === eventId);
  const [eventForm, setEventForm] = useState<EventForm>(BLANK_EVENT_FORM);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [lineupArtistPick, setLineupArtistPick] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const artists = data.artists;

  // Fill the form once the event to edit has loaded.
  useEffect(() => {
    if (!eventId || !editing || loadedId === eventId) return;
    const evt: any = editing;
    setEventForm({
      title: evt.title || "",
      description: evt.description || "",
      category: evt.category || "music",
      venue: evt.venue || "",
      city: evt.city || "London",
      country: evt.country || "United Kingdom",
      date: evt.date || "20 Jul",
      year: evt.year || "",
      fullDate: evt.fullDate && evt.fullDate !== evt.date ? evt.fullDate : "",
      startTime: evt.startTime || "19:30",
      endTime: evt.endTime || "22:30",
      bannerImage: evt.bannerImage || evt.image || BLANK_EVENT_FORM.bannerImage,
      capacity: evt.capacity || 1000,
      price: evt.price || 0,
      type: evt.type || "upcoming",
      status: evt.status || "draft",

      priceVip: evt.tierPrices?.vip ? String(evt.tierPrices.vip) : "",
      priceElite: evt.tierPrices?.elite ? String(evt.tierPrices.elite) : "",
      highlightsText: (evt.highlights || []).join("\n"),
      agenda: evt.agenda || [],
      lineup: evt.lineup || [],
      organizerName: evt.organizerName || "",
      organizerBio: evt.organizerBio || "",
      organizerImage: evt.organizerImage || "",
      mapUrl: evt.venueInfo?.mapUrl || "",
      transportText: (evt.venueInfo?.transport || []).join("\n"),
      parkingText: (evt.venueInfo?.parking || []).join("\n"),
      galleryText: (evt.gallery || []).join("\n"),
      faqs: evt.faqs || [],
    });
    setLoadedId(eventId);
  }, [eventId, editing, loadedId]);

  if (eventId && !editing) {
    return (
      <div className="py-24 text-center">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : (
          <>
            <p className="font-bold">This event could not be found.</p>
            <button type="button" className={`${btnOutline} mt-4`} onClick={() => navigate("/admin/events")}>
              Back to events
            </button>
          </>
        )}
      </div>
    );
  }

  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setEventForm((f) => ({ ...f, [key]: value }));

  // ---- Dynamic list editors (running order / performers / FAQs) ----
  const addListRow = (key: "agenda" | "lineup" | "faqs") => {
    const blank =
      key === "agenda" ? { time: "", title: "", desc: "" } : key === "lineup" ? { name: "", role: "", avatar: "", bio: "" } : { question: "", answer: "" };
    setEventForm((f) => ({ ...f, [key]: [...(f[key] as any[]), blank] }) as typeof f);
  };
  const updateListRow = (key: "agenda" | "lineup" | "faqs", idx: number, field: string, value: string) => {
    setEventForm((f) => ({ ...f, [key]: (f[key] as any[]).map((row, i) => (i === idx ? { ...row, [field]: value } : row)) }) as typeof f);
  };
  const removeListRow = (key: "agenda" | "lineup" | "faqs", idx: number) => {
    setEventForm((f) => ({ ...f, [key]: (f[key] as any[]).filter((_, i) => i !== idx) }) as typeof f);
  };

  // Pull an existing artist profile straight into the event lineup
  const addArtistToLineup = () => {
    const artist = artists.find((a) => a.id === lineupArtistPick);
    setLineupArtistPick("");
    if (!artist) return;
    if (eventForm.lineup.some((l) => l.name.trim().toLowerCase() === artist.stageName.trim().toLowerCase())) return;
    setEventForm((f) => ({
      ...f,
      lineup: [
        ...f.lineup,
        {
          name: artist.stageName,
          role: artist.subCategory || artist.category || "Performer",
          avatar: artist.profileImage || "",
          bio: (artist.bio || "").split("\n")[0].slice(0, 140),
        },
      ],
    }));
  };

  const onPickDate = (iso: string) => {
    if (!iso) {
      setEventForm((f) => ({ ...f, date: "TBA", year: "", fullDate: "" }));
      return;
    }
    const [y, m, d] = iso.split("-").map(Number);
    setEventForm((f) => ({
      ...f,
      date: `${d} ${MONTHS_SHORT[m - 1]}`,
      year: String(y),
      fullDate: `${d} ${MONTHS_LONG[m - 1]} ${y}`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!eventForm.title || !eventForm.venue) {
      setFormError("Event title and venue are required.");
      fail("Event title and venue are required.");
      return;
    }

    // Assemble the event page content — empty fields save as empty
    // arrays/strings so their sections stay hidden on the event page.
    const vip = Number(eventForm.priceVip);
    const elite = Number(eventForm.priceElite);
    const {
      priceVip: _pv,
      priceElite: _pe,
      highlightsText: _h,
      transportText: _t,
      parkingText: _p,
      galleryText: _g,
      mapUrl: _m,
      ...baseForm
    } = eventForm;
    const payload = {
      ...baseForm,
      image: eventForm.bannerImage,
      highlights: parseLines(eventForm.highlightsText),
      gallery: parseLines(eventForm.galleryText),
      venueInfo: {
        mapUrl: eventForm.mapUrl.trim(),
        transport: parseLines(eventForm.transportText),
        parking: parseLines(eventForm.parkingText),
      },
      organizerName: eventForm.organizerName.trim(),
      organizerBio: eventForm.organizerBio.trim(),
      organizerImage: eventForm.organizerImage.trim(),
      agenda: eventForm.agenda.filter((a) => a.time.trim() || a.title.trim()),
      lineup: eventForm.lineup.filter((l) => l.name.trim()),
      faqs: eventForm.faqs.filter((f) => f.question.trim()),
      tierPrices: {
        general: Number(eventForm.price) || 0,
        ...(vip > 0 ? { vip } : {}),
        ...(elite > 0 ? { elite } : {}),
      },
    };

    setSaving(true);
    try {
      if (eventId) {
        await updateEvent(eventId, payload);
        notify("Event updated successfully.");
      } else {
        await createEvent({ ...payload, organizerId: auth.currentUser?.uid || "admin" });
        notify("Event created successfully.");
      }
      reload();
      navigate("/admin/events");
    } catch {
      setFormError("Failed to save event.");
      fail("Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const listRowCls = "grid grid-cols-12 gap-2 items-start bg-[#f7f7f7] p-2.5 border border-[#e4e4e4]";
  const rowInput = "bg-white p-2 text-sm outline-none border border-[#e4e4e4] focus:border-black transition-colors";
  const removeBtn = "col-span-1 p-2 text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer flex items-center justify-center";

  return (
    <div className="space-y-6 text-left">
      <EditorHeader
        crumb={eventId ? "Events · Edit event" : "Events · Create new"}
        title={eventForm.title || "Untitled event"}
        onBack={() => navigate("/admin/events")}
        formId="admin-event-form"
        saveLabel={eventId ? "Save changes" : "Create event"}
        saving={saving}
      />
      {formError && <div className="bg-[#f7ecec] text-[#7a2f2f] text-sm font-bold px-4 py-3">{formError}</div>}

      <form id="admin-event-form" onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start text-sm">
        {/* ── MAIN COLUMN — event content ─────────────────── */}
        <div className="xl:col-span-2 space-y-6">
          <EditorPanel title="Event details" sub="The core listing — shown on event cards and the event page hero.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Event title">
                <input className={inputCls} value={eventForm.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Symphony of the Opera" />
              </Field>
              <Field label="Venue name">
                <input className={inputCls} value={eventForm.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. Royal Albert Hall" />
              </Field>
            </div>

            <ImageUrlField label="Cover banner image URL" value={eventForm.bannerImage} onChange={(v) => set("bannerImage", v)} wide />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="City">
                <input className={inputCls} value={eventForm.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Date" hint={eventForm.date && !isoFromForm(eventForm.date, eventForm.year) ? `Currently “${eventForm.date}”` : undefined}>
                <input type="date" className={inputCls} value={isoFromForm(eventForm.date, eventForm.year)} onChange={(e) => onPickDate(e.target.value)} />
              </Field>
              <Field label="Capacity (seats)">
                <input type="number" className={inputCls} value={eventForm.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
              </Field>
            </div>

            <Field label="Description">
              <textarea className={`${inputCls} h-28`} value={eventForm.description} onChange={(e) => set("description", e.target.value)} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Start time">
                <input type="time" className={inputCls} value={eventForm.startTime} onChange={(e) => set("startTime", e.target.value)} />
              </Field>
              <Field label="End time">
                <input type="time" className={inputCls} value={eventForm.endTime} onChange={(e) => set("endTime", e.target.value)} />
              </Field>
            </div>
          </EditorPanel>

          {/* Everything below is optional — empty content keeps its section hidden on the public event page. */}

          <EditorPanel
            title="Running order"
            sub="The schedule accordion on the event page. No entries = section hidden."
            action={
              <button type="button" onClick={() => addListRow("agenda")} className={addRowBtnCls}>
                <PlusCircle className="w-3.5 h-3.5" /> Add entry
              </button>
            }
          >
            {eventForm.agenda.length === 0 && (
              <p className="text-[11px] text-[#8a8a8a] font-medium">No entries yet — this section stays hidden on the event page.</p>
            )}
            {eventForm.agenda.map((row, idx) => (
              <div key={idx} className={listRowCls}>
                <input className={`col-span-3 ${rowInput}`} value={row.time} onChange={(e) => updateListRow("agenda", idx, "time", e.target.value)} placeholder="7:30 PM" />
                <input className={`col-span-4 ${rowInput}`} value={row.title} onChange={(e) => updateListRow("agenda", idx, "title", e.target.value)} placeholder="Act one" />
                <input className={`col-span-4 ${rowInput}`} value={row.desc} onChange={(e) => updateListRow("agenda", idx, "desc", e.target.value)} placeholder="What happens in this slot" />
                <button type="button" onClick={() => removeListRow("agenda", idx)} className={removeBtn} title="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </EditorPanel>

          <EditorPanel
            title="Performers on stage"
            sub="Pick artists already added to the site, or add one manually. No performers = section hidden."
            action={
              <button type="button" onClick={() => addListRow("lineup")} className={addRowBtnCls}>
                <PlusCircle className="w-3.5 h-3.5" /> Add manually
              </button>
            }
          >
            {artists.length > 0 ? (
              <div className="flex flex-col sm:flex-row gap-2 bg-[#f7f7f7] p-3 border border-[#e4e4e4]">
                <select
                  value={lineupArtistPick}
                  onChange={(e) => setLineupArtistPick(e.target.value)}
                  className="flex-1 bg-white px-3 py-2.5 text-sm font-medium text-black outline-none"
                >
                  <option value="">Choose from your artists…</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.stageName}
                      {a.subCategory ? ` — ${a.subCategory}` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addArtistToLineup} disabled={!lineupArtistPick} className={btnPrimary}>
                  <PlusCircle className="w-3.5 h-3.5" /> Add to lineup
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-[#8a8a8a] font-medium">
                No artists on the site yet — create one under Artists and you'll be able to pick them here.
              </p>
            )}
            {eventForm.lineup.map((row, idx) => (
              <div key={idx} className="space-y-2 bg-[#f7f7f7] p-2.5 border border-[#e4e4e4]">
                <div className="grid grid-cols-12 gap-2">
                  <input className={`col-span-4 ${rowInput}`} value={row.name} onChange={(e) => updateListRow("lineup", idx, "name", e.target.value)} placeholder="Performer name" />
                  <input className={`col-span-3 ${rowInput}`} value={row.role} onChange={(e) => updateListRow("lineup", idx, "role", e.target.value)} placeholder="Role (e.g. Lead vocalist)" />
                  <input className={`col-span-4 ${rowInput}`} value={row.avatar} onChange={(e) => updateListRow("lineup", idx, "avatar", e.target.value)} placeholder="Photo URL (optional)" />
                  <button type="button" onClick={() => removeListRow("lineup", idx)} className={removeBtn} title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input className={`w-full ${rowInput}`} value={row.bio} onChange={(e) => updateListRow("lineup", idx, "bio", e.target.value)} placeholder="Short bio line" />
              </div>
            ))}
          </EditorPanel>

          <EditorPanel title="Event organiser (presented by)" sub='Leave the name empty to hide the "Presented by" card.'>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Organiser name">
                <input className={inputCls} value={eventForm.organizerName} onChange={(e) => set("organizerName", e.target.value)} placeholder="e.g. Jazba Entertainment" />
              </Field>
              <ImageUrlField label="Organiser logo / image URL" value={eventForm.organizerImage} onChange={(v) => set("organizerImage", v)} />
            </div>
            <Field label="Organiser bio">
              <textarea className={`${inputCls} h-16`} value={eventForm.organizerBio} onChange={(e) => set("organizerBio", e.target.value)} placeholder="A line or two about the organiser" />
            </Field>
          </EditorPanel>

          <EditorPanel
            title="Getting there (live map & directions)"
            sub="Paste any Google Maps link or just type the venue address — the live map renders automatically. All empty = section hidden."
          >
            <Field label="Google Maps URL or venue address">
              <input
                className={inputCls}
                value={eventForm.mapUrl}
                onChange={(e) => set("mapUrl", e.target.value)}
                placeholder="e.g. Utilita Arena Birmingham  —  or  https://www.google.com/maps/embed?pb=…"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="By public transport (one line each)">
                <textarea
                  className={`${inputCls} h-20`}
                  value={eventForm.transportText}
                  onChange={(e) => set("transportText", e.target.value)}
                  placeholder={"Underground: Westminster — 4-minute walk\nBus: Routes 24 & 88 stop at the gates"}
                />
              </Field>
              <Field label="By car (one line each)">
                <textarea
                  className={`${inputCls} h-20`}
                  value={eventForm.parkingText}
                  onChange={(e) => set("parkingText", e.target.value)}
                  placeholder={"Parking: On-site Deck G — pre-book\nDrop-off: Lay-by at the main entrance"}
                />
              </Field>
            </div>
          </EditorPanel>

          <EditorPanel title="From past shows (photo gallery)" sub="One image URL per line. Leave empty to hide the gallery.">
            <textarea
              className={`${inputCls} h-24`}
              value={eventForm.galleryText}
              onChange={(e) => set("galleryText", e.target.value)}
              placeholder={"https://…/photo-1.jpg\nhttps://…/photo-2.jpg"}
            />
            {parseLines(eventForm.galleryText).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {parseLines(eventForm.galleryText).slice(0, 12).map((src, i) => (
                  <img key={i} src={src} alt="" className="w-16 h-16 object-cover bg-[#f2f2f2]" referrerPolicy="no-referrer" />
                ))}
              </div>
            )}
          </EditorPanel>

          <EditorPanel
            title="FAQs (good to know)"
            sub="No questions = section hidden."
            action={
              <button type="button" onClick={() => addListRow("faqs")} className={addRowBtnCls}>
                <PlusCircle className="w-3.5 h-3.5" /> Add FAQ
              </button>
            }
          >
            {eventForm.faqs.length === 0 && (
              <p className="text-[11px] text-[#8a8a8a] font-medium">No questions yet — this section stays hidden on the event page.</p>
            )}
            {eventForm.faqs.map((row, idx) => (
              <div key={idx} className={listRowCls}>
                <input className={`col-span-5 ${rowInput}`} value={row.question} onChange={(e) => updateListRow("faqs", idx, "question", e.target.value)} placeholder="Question" />
                <input className={`col-span-6 ${rowInput}`} value={row.answer} onChange={(e) => updateListRow("faqs", idx, "answer", e.target.value)} placeholder="Answer" />
                <button type="button" onClick={() => removeListRow("faqs", idx)} className={removeBtn} title="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </EditorPanel>
        </div>

        {/* ── SIDE RAIL — publishing & pricing ─────────────── */}
        <div className="space-y-6 xl:sticky xl:top-24">
          <EditorPanel title="Publishing" sub="Where and whether this event appears on the site.">
            <Field label="Publication status">
              <select value={eventForm.status} onChange={(e: any) => set("status", e.target.value)} className={inputCls}>
                <option value="draft">Draft (hidden from public)</option>
                <option value="published">Published (live on site)</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
            <Field label="Homepage section">
              <select value={eventForm.type} onChange={(e: any) => set("type", e.target.value)} className={inputCls}>
                <option value="top">Top Events</option>
                <option value="for-you">Tonight's Best Offers (yellow band)</option>
                <option value="near-by">Events Near You</option>
                <option value="upcoming">Upcoming Shows</option>
              </select>
            </Field>
            <Field label="Category">
              <select value={eventForm.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                {categories
                  .filter((c) => c.id !== "all")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
          </EditorPanel>

          <EditorPanel title="Ticket packages" sub="Leave VIP / Elite empty to hide that package on the event page and checkout.">
            <Field label="General price (USD)">
              <input type="number" className={inputCls} value={eventForm.price} onChange={(e) => set("price", Number(e.target.value))} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="VIP (USD)">
                <input type="number" className={inputCls} value={eventForm.priceVip} onChange={(e) => set("priceVip", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Elite (USD)">
                <input type="number" className={inputCls} value={eventForm.priceElite} onChange={(e) => set("priceElite", e.target.value)} placeholder="Optional" />
              </Field>
            </div>
          </EditorPanel>

          <EditorPanel title="Event highlights" sub="Shown as ticks under the description — one per line. Leave empty to hide.">
            <textarea
              className={`${inputCls} h-24`}
              value={eventForm.highlightsText}
              onChange={(e) => set("highlightsText", e.target.value)}
              placeholder={"Two full 45-minute acts\nFull stage and light production"}
            />
          </EditorPanel>

          <button type="submit" disabled={saving} className={`${btnPrimary} w-full py-3.5 text-sm`}>
            {saving ? "Saving…" : eventId ? "Save changes" : "Create event"}
          </button>
          <label className={`${labelCls} text-center`}>All prices in USD — the site converts for each visitor.</label>
        </div>
      </form>
    </div>
  );
}
