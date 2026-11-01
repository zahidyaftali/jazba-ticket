import React, { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  CircleCheck,
  Edit3,
  ExternalLink,
  Globe,
  Heart,
  Loader2,
  Mail,
  MessageSquareWarning,
  Phone,
  PlusCircle,
  RotateCcw,
  ShoppingBag,
  Star,
  Ticket,
  Trash2,
  UserX,
  Wallet,
  X,
} from "lucide-react";
import { updateOrganizerProfile, type OrganizerProfile } from "../../../services/backendService";
import {
  eventsOfOrganizer,
  getFollowers,
  isSelfRegistered,
  removeFollower,
  reviewEvent,
  reviewOrganizer,
  SOCIAL_KEYS,
  SOCIAL_LABELS,
  type FollowRow,
  type OrganizerStatus,
} from "../../../services/organizerService";
import { eventPath } from "../../../types";
import { useAdmin, type AdminEvent } from "../AdminContext";
import { DeleteOrganizerDialog, PayoutsPanel } from "./OrganizerMoney";
import {
  Avatar,
  Badge,
  DataTable,
  Detail,
  EmptyRow,
  EVENT_STATUS,
  FilterTabs,
  IconButton,
  ORGANIZER_STATUS,
  PageHeader,
  Panel,
  SearchInput,
  StatTile,
  StatusBadge,
  TableFooter,
  Toolbar,
  btnDark,
  btnOutline,
  btnPrimary,
  fmtDate,
  fmtDateTime,
  money,
  tdCls,
  thCls,
} from "../ui";

type Tab = "all" | OrganizerStatus;

const statusOf = (o: OrganizerProfile): OrganizerStatus | "legacy" => (o.status ? o.status : "legacy");

function OrgStatus({ org }: { org: OrganizerProfile }) {
  return org.status ? <StatusBadge map={ORGANIZER_STATUS} value={org.status} /> : <Badge tone="neutral">Added by admin</Badge>;
}

/** Asks the admin for an optional / required note. null = cancelled. */
function askNote(message: string, required: boolean): string | null {
  const typed = window.prompt(message);
  if (typed === null) return null;
  if (required && !typed.trim()) {
    window.alert("Please write a short note so the organiser knows what to do.");
    return null;
  }
  return typed.trim();
}

/** Approve / reject / suspend / reinstate — shared by the list and the detail page. */
function useOrganizerActions() {
  const { data, notify, fail, reload } = useAdmin();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (org: OrganizerProfile, status: OrganizerStatus) => {
    let note = "";
    if (status === "rejected") {
      const n = askNote(`What should ${org.companyName} change before you approve them? (They’ll get this by email.)`, true);
      if (n === null) return;
      note = n;
    } else if (status === "suspended") {
      const n = askNote(`Suspend ${org.companyName}? They won’t be able to create or change events. Add a note for them (optional):`, false);
      if (n === null) return;
      note = n;
    } else if (status === "approved") {
      if (!window.confirm(`Approve ${org.companyName}? They’ll be able to create events (each event still needs your approval before it goes on sale).`)) return;
    }
    setBusy(org.id || "");
    try {
      const account = data.users.find((u) => u.uid === org.userId);
      await reviewOrganizer(org, status, note, account?.role);
      notify(
        status === "approved"
          ? `${org.companyName} approved — they’ve been emailed.`
          : status === "rejected"
            ? "Sent back with your note."
            : `${org.companyName} suspended.`,
      );
      await reload();
    } catch (err) {
      console.error("Organiser review failed:", err);
      fail("Couldn’t update the organiser. Make sure the latest database rules are published (Dashboard).");
    } finally {
      setBusy(null);
    }
  };
  return { act, busy };
}

// ── List ───────────────────────────────────────────────────────────────────

export function OrganizersList({ initialTab = "all" }: { initialTab?: Tab }) {
  const { data, navigate, notify, fail, reload } = useAdmin();
  const { act, busy } = useOrganizerActions();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [featuring, setFeaturing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<OrganizerProfile | null>(null);
  const organizers = data.organizers;

  const inTab = (o: OrganizerProfile, t: Tab) => t === "all" || statusOf(o) === t || (t === "approved" && statusOf(o) === "legacy");
  const q = query.trim().toLowerCase();
  const filtered = [...organizers]
    .sort((a, b) =>
      tab === "pending" ? String(a.createdAt || "").localeCompare(String(b.createdAt || "")) : (a.companyName || "").localeCompare(b.companyName || ""),
    )
    .filter((o) => inTab(o, tab))
    .filter((o) => !q || [o.companyName, o.contactName, o.location, o.email, o.phone, ...(o.specialties || [])].some((v) => (v || "").toLowerCase().includes(q)));
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: organizers.length },
    { id: "pending", label: "Applications", count: organizers.filter((o) => inTab(o, "pending")).length },
    { id: "approved", label: "Approved", count: organizers.filter((o) => inTab(o, "approved")).length },
    { id: "rejected", label: "Changes requested", count: organizers.filter((o) => inTab(o, "rejected")).length },
    { id: "suspended", label: "Suspended", count: organizers.filter((o) => inTab(o, "suspended")).length },
  ];

  const toggleFeatured = async (org: OrganizerProfile) => {
    if (!org.id) return;
    setFeaturing(org.id);
    try {
      await updateOrganizerProfile(org.id, { featured: !org.featured });
      notify(org.featured ? `${org.companyName} removed from featured.` : `${org.companyName} is now featured.`);
      await reload();
    } catch {
      fail("Failed to update the organiser.");
    } finally {
      setFeaturing(null);
    }
  };

  const view = (o: OrganizerProfile) => navigate(`/admin/organizers/view/${encodeURIComponent(o.id!)}`);

  return (
    <div>
      <PageHeader
        title="Organisers"
        sub="Organisers who signed up to sell tickets, plus the profiles you added yourself. Approve applications, manage their events and see their sales."
        actions={
          <>
            <a href="/for-organizers" target="_blank" rel="noopener noreferrer" className={btnOutline}>
              <ExternalLink className="w-4 h-4" /> Sign-up page
            </a>
            <button type="button" onClick={() => navigate("/admin/organizers/new")} className={btnPrimary}>
              <PlusCircle className="w-4 h-4" /> Add organiser
            </button>
          </>
        }
      />
      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} />
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, contact, city, email…" />
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>Organiser</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Contact</th>
              <th className={thCls}>Events</th>
              <th className={thCls}>Featured</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </>
          }
        >
          {filtered.map((org) => {
            const evCount = eventsOfOrganizer(org, data.events).length;
            const pending = org.status === "pending";
            return (
              <tr key={org.id || org.userId} className="hover:bg-[#fafafa]">
                <td className={tdCls}>
                  <button type="button" onClick={() => view(org)} className="flex items-center gap-3 min-w-[220px] text-left cursor-pointer">
                    <Avatar src={org.logoUrl} name={org.companyName || "?"} size={38} square />
                    <span className="min-w-0">
                      <span className="font-bold block hover:underline">{org.companyName || "—"}</span>
                      <span className="text-[11px] text-[#8a8a8a] block">
                        {[org.location, org.createdAt ? `applied ${fmtDate(org.createdAt)}` : ""].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                  </button>
                </td>
                <td className={tdCls}>
                  <OrgStatus org={org} />
                </td>
                <td className={tdCls}>
                  {org.contactName && <p className="font-bold text-[12px]">{org.contactName}</p>}
                  {org.email ? (
                    <a href={`mailto:${org.email}`} className="flex items-center gap-1.5 hover:underline text-[12px]">
                      <Mail className="w-3 h-3 shrink-0" /> {org.email}
                    </a>
                  ) : (
                    !org.contactName && "—"
                  )}
                  {org.phone && (
                    <a href={`tel:${org.phone}`} className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a] hover:text-black">
                      <Phone className="w-3 h-3 shrink-0" /> {org.phone}
                    </a>
                  )}
                </td>
                <td className={`${tdCls} font-bold`}>{evCount}</td>
                <td className={tdCls}>
                  {featuring === org.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleFeatured(org)}
                      className="w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-[#f2f2f2]"
                      title={org.featured ? "Featured — click to remove" : "Click to feature"}
                      aria-label={org.featured ? "Remove from featured" : "Feature organiser"}
                    >
                      <Star className={`w-4 h-4 ${org.featured ? "fill-black text-black" : "text-[#c4c4c4]"}`} />
                    </button>
                  )}
                </td>
                <td className={`${tdCls} text-right`}>
                  <div className="flex items-center justify-end">
                    {busy === org.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-2" />
                    ) : (
                      pending && (
                        <>
                          <IconButton title="Approve" onClick={() => act(org, "approved")}>
                            <Check className="w-4 h-4 text-[#15803d]" />
                          </IconButton>
                          <IconButton title="Request changes" onClick={() => act(org, "rejected")} danger>
                            <X className="w-4 h-4" />
                          </IconButton>
                        </>
                      )
                    )}
                    <IconButton title="View details" onClick={() => view(org)}>
                      <ExternalLink className="w-4 h-4" />
                    </IconButton>
                    <IconButton title="Edit profile" onClick={() => navigate(`/admin/organizers/edit/${encodeURIComponent(org.id!)}`)}>
                      <Edit3 className="w-4 h-4" />
                    </IconButton>
                    <IconButton title="Delete organiser" danger onClick={() => setDeleting(org)}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <EmptyRow
              colSpan={6}
              title={tab === "pending" ? "No applications waiting" : organizers.length ? "No organisers here" : "No organisers yet"}
              sub={tab === "pending" ? "New sign-ups from the For organisers page appear here." : undefined}
            />
          )}
        </DataTable>
        <TableFooter shown={filtered.length} total={organizers.length} noun="organisers" />
      </div>
      {deleting && <DeleteOrganizerDialog org={deleting} onClose={() => setDeleting(null)} onDeleted={() => setDeleting(null)} />}
    </div>
  );
}

// ── Detail ─────────────────────────────────────────────────────────────────

export function OrganizerDetail({ organizerId }: { organizerId: string }) {
  const { data, loading, navigate, notify, fail, reload, openBooking, eventInfo } = useAdmin();
  const { act, busy } = useOrganizerActions();
  const org = data.organizers.find((o) => o.id === organizerId);
  const [followers, setFollowers] = useState<FollowRow[] | null>(null);
  const [eventBusy, setEventBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!organizerId) return;
    getFollowers("organizer", organizerId)
      .then(setFollowers)
      .catch(() => setFollowers([]));
  }, [organizerId]);

  const events = useMemo(() => (org ? eventsOfOrganizer(org, data.events as AdminEvent[]) : []), [org, data.events]);
  const eventIds = useMemo(() => new Set(events.map((e) => e.id)), [events]);
  const orders = useMemo(
    () => data.bookings.filter((b) => eventIds.has(b.eventId)).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
    [data.bookings, eventIds],
  );
  const paid = orders.filter((b) => b.paymentStatus === "paid" && b.bookingStatus !== "cancelled");
  const revenue = paid.reduce((s, b) => s + (Number(b.amount ?? b.pricePaid) || 0), 0);
  const sold = paid.reduce((s, b) => s + (Number(b.quantity) || 1), 0);
  const perEvent = (id: string) => {
    const p = paid.filter((b) => b.eventId === id);
    return { sold: p.reduce((s, b) => s + (Number(b.quantity) || 1), 0), revenue: p.reduce((s, b) => s + (Number(b.amount ?? b.pricePaid) || 0), 0) };
  };

  if (!org) {
    return (
      <div className="py-24 text-center">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : (
          <>
            <p className="font-bold">This organiser could not be found.</p>
            <button type="button" className={`${btnOutline} mt-4`} onClick={() => navigate("/admin/organizers")}>
              Back to organisers
            </button>
          </>
        )}
      </div>
    );
  }

  const account = data.users.find((u) => u.uid === org.userId);
  const selfReg = isSelfRegistered(org);
  const status = statusOf(org);

  const eventAction = async (evt: AdminEvent, decision: "publish" | "decline" | "unpublish") => {
    let note = "";
    if (decision === "decline") {
      const n = askNote(`What should change before “${evt.title}” can go on sale?`, true);
      if (n === null) return;
      note = n;
    } else if (decision === "publish" && !window.confirm(`Publish “${evt.title}”? It goes on sale straight away.`)) return;
    else if (decision === "unpublish" && !window.confirm(`Take “${evt.title}” off sale? It moves back to draft.`)) return;
    setEventBusy(evt.id);
    try {
      await reviewEvent(evt.id, decision, note);
      notify(decision === "publish" ? "Event published." : decision === "decline" ? "Sent back with your note." : "Event taken off sale.");
      await reload();
    } catch {
      fail("Couldn’t update the event.");
    } finally {
      setEventBusy(null);
    }
  };

  const dropFollower = async (f: FollowRow) => {
    if (!window.confirm("Remove this follower?")) return;
    try {
      await removeFollower(f.id);
      setFollowers((list) => (list || []).filter((x) => x.id !== f.id));
      notify("Follower removed.");
    } catch {
      fail("Couldn’t remove the follower.");
    }
  };

  const socials = SOCIAL_KEYS.map((k) => ({ k, label: SOCIAL_LABELS[k], url: String(org.socialLinks?.[k] || "") })).filter((s) => s.url);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ label: "All organisers", onClick: () => navigate("/admin/organizers") }}
        title={
          <span className="flex items-center gap-3">
            <Avatar src={org.logoUrl} name={org.companyName || "?"} size={44} square />
            <span>{org.companyName}</span>
          </span>
        }
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <OrgStatus org={org} />
            {org.featured && <Badge tone="brand">Featured</Badge>}
            <span>
              {[org.location, org.createdAt ? `Applied ${fmtDateTime(org.createdAt)}` : "", org.reviewedAt ? `reviewed ${fmtDate(org.reviewedAt)}` : ""]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        }
        actions={
          busy === org.id ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {(status === "pending" || status === "rejected") && (
                <button type="button" className={btnPrimary} onClick={() => act(org, "approved")}>
                  <CircleCheck className="w-4 h-4" /> Approve
                </button>
              )}
              {status === "pending" && (
                <button type="button" className={btnOutline} onClick={() => act(org, "rejected")}>
                  <MessageSquareWarning className="w-4 h-4" /> Request changes
                </button>
              )}
              {status === "approved" && (
                <button type="button" className={btnOutline} onClick={() => act(org, "suspended")}>
                  <Ban className="w-4 h-4" /> Suspend
                </button>
              )}
              {status === "suspended" && (
                <button type="button" className={btnPrimary} onClick={() => act(org, "approved")}>
                  <RotateCcw className="w-4 h-4" /> Reinstate
                </button>
              )}
              <button type="button" className={btnOutline} onClick={() => navigate(`/admin/organizers/edit/${encodeURIComponent(org.id!)}`)}>
                <Edit3 className="w-4 h-4" /> Edit profile
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold border border-[#be6464] text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              {status !== "pending" && status !== "rejected" && (
                <a href={`/organizers/${encodeURIComponent(org.id!)}`} target="_blank" rel="noopener noreferrer" className={btnDark}>
                  <ExternalLink className="w-4 h-4" /> Public page
                </a>
              )}
            </>
          )
        }
      />

      {org.reviewNote && (status === "rejected" || status === "suspended") && (
        <div className="bg-[#fff8c2] border border-[#e6d200] px-4 py-3 text-sm">
          <span className="font-bold">Your note to them:</span> {org.reviewNote}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <StatTile dark label="Ticket sales" icon={Wallet} value={money(revenue)} sub="Paid orders, in USD" />
        <StatTile label="Tickets sold" icon={Ticket} value={sold.toLocaleString()} />
        <StatTile label="Orders" icon={ShoppingBag} value={paid.length.toLocaleString()} />
        <StatTile label="Events" icon={PlusCircle} value={events.length} sub={`${events.filter((e) => e.status === "published").length} on sale · ${events.filter((e) => e.status === "pending").length} in review`} />
        <StatTile label="Followers" icon={Heart} value={followers ? followers.length : "…"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <Panel title="Details & contact" className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Detail label="Contact name">{org.contactName}</Detail>
            <Detail label="Contact email">{org.email && <a href={`mailto:${org.email}`} className="underline">{org.email}</a>}</Detail>
            <Detail label="Phone / WhatsApp">{org.phone && <a href={`tel:${org.phone}`} className="underline">{org.phone}</a>}</Detail>
            <Detail label="Website">
              {org.website && (
                <a href={/^https?:\/\//i.test(org.website) ? org.website : `https://${org.website}`} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {org.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </Detail>
            <Detail label="City">{org.location}</Detail>
            <Detail label="Event types">{(org.specialties || []).join(", ")}</Detail>
            {socials.length > 0 && (
              <div className="sm:col-span-2">
                <Detail label="Social">
                  <span className="flex flex-wrap gap-x-4 gap-y-1">
                    {socials.map((s) => (
                      <a key={s.k} href={/^https?:\/\//i.test(s.url) ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer" className="underline">
                        {s.label}
                      </a>
                    ))}
                  </span>
                </Detail>
              </div>
            )}
            <div className="sm:col-span-2">
              <Detail label="About">
                <span className="whitespace-pre-line font-medium">{org.description}</span>
              </Detail>
            </div>
            {org.applicationNote && (
              <div className="sm:col-span-2">
                <Detail label="Note on their application">
                  <span className="whitespace-pre-line font-medium">{org.applicationNote}</span>
                </Detail>
              </div>
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Sign-in account">
            {selfReg ? (
              account ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={account.profileImage} name={account.name || account.email} size={40} />
                    <div className="min-w-0">
                      <p className="font-bold truncate">{account.name}</p>
                      <p className="text-xs text-[#8a8a8a] truncate">{account.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Detail label="Role">{account.role}</Detail>
                    <Detail label="Joined">{fmtDate(account.createdAt)}</Detail>
                  </div>
                  {status === "approved" && account.role !== "organizer" && account.role !== "admin" && (
                    <p className="text-xs font-bold text-[#7a2f2f]">This account doesn’t have the organiser role — click Suspend then Reinstate to fix it.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#8a8a8a]">Account details not found.</p>
              )
            ) : (
              <p className="text-sm text-[#666]">Added by an admin — this profile has no organiser login. Their events are matched by organiser name.</p>
            )}
          </Panel>
          <Panel title="Danger zone">
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs font-bold text-[#7a2f2f] hover:bg-[#f7ecec] px-3 py-2 cursor-pointer flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete organiser profile
            </button>
          </Panel>
        </div>
      </div>

      <PayoutsPanel org={org} grossUsd={revenue} />

      <div className="bg-white border border-[#e4e4e4]">
        <div className="px-5 py-4 border-b border-[#f2f2f2]">
          <h3 className="font-display font-bold text-sm">Events</h3>
          <p className="text-[11px] text-[#8a8a8a] font-medium mt-0.5">Approve, take off sale, edit or delete — you have the final say on every event.</p>
        </div>
        <DataTable
          head={
            <>
              <th className={thCls}>Event</th>
              <th className={thCls}>Date</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Sold</th>
              <th className={thCls}>Sales</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </>
          }
        >
          {events.map((evt) => {
            const s = perEvent(evt.id);
            return (
              <tr key={evt.id} className="hover:bg-[#fafafa]">
                <td className={tdCls}>
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <img src={evt.image || (evt as any).bannerImage} alt="" className="w-14 h-10 object-cover shrink-0 bg-[#f2f2f2]" />
                    <button type="button" onClick={() => navigate(`/admin/events/edit/${encodeURIComponent(evt.id)}`)} className="font-bold text-left hover:underline cursor-pointer line-clamp-2">
                      {evt.title}
                    </button>
                  </div>
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>{eventInfo(evt.id).date}</td>
                <td className={tdCls}>
                  <StatusBadge map={EVENT_STATUS} value={evt.status || "draft"} />
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>
                  <span className="font-bold">{s.sold}</span>
                  {evt.capacity ? <span className="text-[11px] text-[#8a8a8a]"> / {evt.capacity}</span> : null}
                </td>
                <td className={`${tdCls} font-bold whitespace-nowrap`}>{money(s.revenue)}</td>
                <td className={`${tdCls} text-right`}>
                  <div className="flex items-center justify-end">
                    {eventBusy === evt.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-2" />
                    ) : (
                      <>
                        {evt.status === "pending" && (
                          <>
                            <IconButton title="Approve & publish" onClick={() => eventAction(evt, "publish")}>
                              <Check className="w-4 h-4 text-[#15803d]" />
                            </IconButton>
                            <IconButton title="Send back with a note" onClick={() => eventAction(evt, "decline")} danger>
                              <X className="w-4 h-4" />
                            </IconButton>
                          </>
                        )}
                        {evt.status === "published" && (
                          <IconButton title="Take off sale" onClick={() => eventAction(evt, "unpublish")}>
                            <UserX className="w-4 h-4" />
                          </IconButton>
                        )}
                      </>
                    )}
                    <IconButton title="Edit event" onClick={() => navigate(`/admin/events/edit/${encodeURIComponent(evt.id)}`)}>
                      <Edit3 className="w-4 h-4" />
                    </IconButton>
                    {evt.status === "published" && (
                      <IconButton title="View on site" href={eventPath(evt)}>
                        <ExternalLink className="w-4 h-4" />
                      </IconButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {events.length === 0 && <EmptyRow colSpan={6} title="No events yet" />}
        </DataTable>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Panel title="Latest orders" sub="Across this organiser’s events — click one to open it." bodyClassName="">
          {orders.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#8a8a8a]">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-[#f2f2f2]">
              {orders.slice(0, 12).map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => openBooking(b.id!)} className="w-full px-5 py-3 flex items-center justify-between gap-3 text-sm text-left hover:bg-[#fafafa] cursor-pointer">
                    <span className="min-w-0">
                      <span className="font-bold block truncate">{b.billingName || b.billingEmail || b.id}</span>
                      <span className="text-[11px] text-[#8a8a8a] block truncate">
                        {b.quantity} × {b.tierName || b.ticketType} · {eventInfo(b.eventId, b).title} · {fmtDateTime(b.createdAt)}
                      </span>
                    </span>
                    <span className="font-bold shrink-0">{money(Number(b.amount ?? b.pricePaid) || 0)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Followers" sub="People following this organiser’s page." bodyClassName="">
          {followers === null ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#8a8a8a]" />
            </div>
          ) : followers.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#8a8a8a]">No followers yet.</p>
          ) : (
            <ul className="divide-y divide-[#f2f2f2] max-h-[420px] overflow-y-auto">
              {followers.map((f) => {
                const u = data.users.find((x) => x.uid === f.followerId);
                return (
                  <li key={f.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-3 min-w-0">
                      <Avatar src={u?.profileImage} name={u?.name || u?.email || "?"} size={32} />
                      <span className="min-w-0">
                        <span className="font-bold block truncate">{u?.name || "Member"}</span>
                        <span className="text-[11px] text-[#8a8a8a] block truncate">
                          {u?.email || f.followerId} · since {fmtDate(f.createdAt)}
                        </span>
                      </span>
                    </span>
                    <IconButton title="Remove follower" danger onClick={() => dropFollower(f)}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
      {confirmDelete && (
        <DeleteOrganizerDialog org={org} onClose={() => setConfirmDelete(false)} onDeleted={() => navigate("/admin/organizers")} />
      )}
    </div>
  );
}
