import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleCheck,
  CircleX,
  Copy,
  KeyRound,
  Loader2,
  PauseCircle,
  PlayCircle,
  ScanLine,
  Trash2,
  UserPlus,
  Wand2,
} from "lucide-react";
import { updateUserRoleAndStatus, type UserProfile } from "../../../services/backendService";
import {
  createDoorStaff,
  deleteDoorStaff,
  getDoorStaffAccess,
  setDoorStaffEvents,
  setDoorStaffPassword,
  suggestPassword,
} from "../../../services/doorStaffService";
import { useAdmin } from "../AdminContext";
import {
  Avatar,
  Badge,
  DataTable,
  Drawer,
  EmptyRow,
  Field,
  IconButton,
  PageHeader,
  Panel,
  btnDark,
  btnOutline,
  btnPrimary,
  fmtDateTime,
  inputCls,
  overline,
  tdCls,
  thCls,
} from "../ui";

const SCAN_URL = "https://jazbatickets.com/scan";

/** Login details to hand over, shown once after creating or re-passwording. */
interface Handover {
  name: string;
  email: string;
  password: string;
}

/**
 * Door staff: logins for the people at the gate. They sign in to Jazba Scan
 * and check tickets in — only for the events given to them here, nothing
 * else (firestore.rules → isDoorStaffFor / isDoorCheckIn; the admin portal
 * and every other page refuse them).
 */
export default function DoorStaffPage() {
  const { data, notify, fail, reload, peopleOnPass, eventInfo } = useAdmin();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(suggestPassword);
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);
  /** Each login's events (null while loading). */
  const [assigned, setAssigned] = useState<Map<string, string[]> | null>(null);
  /** Logins an organiser made in their portal: login uid → organiser uid. */
  const [owners, setOwners] = useState<Map<string, string>>(new Map());
  const [editing, setEditing] = useState<UserProfile | null>(null);

  const failRef = useRef(fail);
  failRef.current = fail;
  const loadAssigned = useCallback(async () => {
    try {
      const access = await getDoorStaffAccess();
      setAssigned(access.events);
      setOwners(access.owners);
    } catch (err) {
      console.error("Door staff events could not be loaded:", err);
      setAssigned(new Map());
      failRef.current("Couldn't load which events each login can check. Refresh the page to try again.");
    }
  }, []);

  useEffect(() => {
    loadAssigned();
  }, [loadAssigned]);

  const staff = useMemo(
    () => data.users.filter((u) => u.role === "staff").sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [data.users],
  );

  // People each login has let in, from the check-in log on every pass.
  const activity = useMemo(() => {
    const m = new Map<string, { people: number; last: string }>();
    const add = (by: string, people: number, at: string) => {
      const key = by.toLowerCase();
      const cur = m.get(key) || { people: 0, last: "" };
      cur.people += people;
      if (at > cur.last) cur.last = at;
      m.set(key, cur);
    };
    for (const t of data.tickets) {
      if (Array.isArray(t.checkIns) && t.checkIns.length) {
        for (const c of t.checkIns) if (c?.by) add(c.by, Number(c.people) || 0, c.at || "");
      } else if (t.scannedBy) {
        add(t.scannedBy, peopleOnPass(t).inside, t.scannedAt || "");
      }
    }
    return m;
  }, [data.tickets, peopleOnPass]);

  const active = staff.filter((u) => u.status !== "suspended");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      fail("The password needs at least 8 characters.");
      return;
    }
    if (!newEvents.length && !window.confirm("No events chosen. This login won't be able to scan anything until you give it an event. Create it anyway?")) return;
    setCreating(true);
    try {
      const made = await createDoorStaff(name.trim(), email.trim(), password, newEvents);
      setHandover({ name: made.name, email: made.email, password });
      notify(`Door staff login created for ${made.name}.`);
      setName("");
      setEmail("");
      setPassword(suggestPassword());
      setNewEvents([]);
      await Promise.all([reload(), loadAssigned()]);
    } catch (err: any) {
      fail(err?.message || "Could not create the login.");
    } finally {
      setCreating(false);
    }
  };

  const saveEvents = async (u: UserProfile, events: string[]) => {
    setBusy(u.uid);
    try {
      await setDoorStaffEvents(u.uid, events);
      notify(events.length ? `${u.name} can now check ${events.length} event${events.length === 1 ? "" : "s"}.` : `${u.name} has no events now, so can't scan.`);
      setEditing(null);
      await loadAssigned();
    } catch {
      fail("Could not save the events. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const newPassword = async (u: UserProfile) => {
    const next = window.prompt(`New password for ${u.name} (at least 8 characters):`, suggestPassword());
    if (next === null) return;
    if (next.trim().length < 8) {
      fail("The password needs at least 8 characters.");
      return;
    }
    setBusy(u.uid);
    try {
      await setDoorStaffPassword(u.uid, next.trim());
      setHandover({ name: u.name, email: u.email, password: next.trim() });
      notify(`New password set for ${u.name}.`);
    } catch (err: any) {
      fail(err?.message || "Could not change the password.");
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (u: UserProfile, status: "active" | "suspended") => {
    setBusy(u.uid);
    try {
      await updateUserRoleAndStatus(u.uid, "staff", status);
      notify(status === "suspended" ? `${u.name} can no longer scan tickets.` : `${u.name} can scan tickets again.`);
      await reload();
    } catch {
      fail("Could not update the login.");
    } finally {
      setBusy(null);
    }
  };

  const suspendAll = async () => {
    if (!window.confirm(`Suspend all ${active.length} door staff logins? None of them will be able to scan tickets until you reactivate them.`)) return;
    setBusy("all");
    try {
      for (const u of active) await updateUserRoleAndStatus(u.uid, "staff", "suspended");
      notify("All door staff logins are suspended.");
      await reload();
    } catch {
      fail("Some logins could not be suspended. Try again.");
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (u: UserProfile) => {
    if (!window.confirm(`Delete the login for ${u.name} (${u.email})? They won't be able to sign in again. Their past check-ins stay on record.`)) return;
    setBusy(u.uid);
    try {
      await deleteDoorStaff(u.uid);
      if (handover?.email === u.email) setHandover(null);
      notify(`Login for ${u.name} deleted.`);
      await Promise.all([reload(), loadAssigned()]);
    } catch (err: any) {
      fail(err?.message || "Could not delete the login.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Door staff"
        sub="Logins for the people at the gate. Each one can only sign in to the Jazba Scan app and check tickets for the events you give it. They can't open this portal or see payments, and they can't change any order."
        actions={
          <>
            <a href="/scan" target="_blank" rel="noopener" className={btnOutline}>
              <ScanLine className="w-4 h-4" /> Open scanner app
            </a>
            {active.length > 0 && (
              <button type="button" className={btnDark} onClick={suspendAll} disabled={!!busy}>
                {busy === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />} Suspend all
              </button>
            )}
          </>
        }
      />

      {handover && <HandoverCard handover={handover} onClose={() => setHandover(null)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="space-y-6 min-w-0">
          <Panel title="Add door staff" sub="Creates a login you hand to the staff member. One login per person, so you can see who let each guest in.">
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="e.g. Ali (Gate 1)" className={inputCls} />
              </Field>
              <Field label="Email (their username)" hint="Any address works, e.g. gate1@jazbatickets.com. No email is sent to it.">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={128} placeholder="gate1@jazbatickets.com" className={inputCls} />
              </Field>
              <Field label="Password" hint="At least 8 characters. You'll see it once more after creating the login." className="sm:col-span-2">
                <div className="flex gap-2">
                  <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} className={`${inputCls} font-mono`} />
                  <button type="button" className={btnOutline} onClick={() => setPassword(suggestPassword())} title="Suggest a new password">
                    <Wand2 className="w-4 h-4" /> New
                  </button>
                </div>
              </Field>
              <Field
                label={`Events they can check${newEvents.length ? ` (${newEvents.length})` : ""}`}
                hint="Tick one or more. You can change them any time, and the scanner updates straight away."
                className="sm:col-span-2"
              >
                <EventChecklist selected={newEvents} onChange={setNewEvents} />
              </Field>
              <div className="sm:col-span-2">
                <button type="submit" className={btnPrimary} disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Create login
                </button>
              </div>
            </form>
          </Panel>

          <Panel title={`Logins (${staff.length})`} bodyClassName="">
            <DataTable
              head={
                <>
                  <th className={thCls}>Staff member</th>
                  <th className={thCls}>Events</th>
                  <th className={thCls}>Checked in</th>
                  <th className={`${thCls} text-right`}>Manage</th>
                </>
              }
            >
              {staff.map((u) => {
                const a = activity.get((u.email || "").toLowerCase());
                const suspended = u.status === "suspended";
                const events = assigned?.get(u.uid) || [];
                return (
                  <tr key={u.uid} className="hover:bg-[#fafafa] align-top">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={u.name || u.email} size={32} />
                        <div className="min-w-0">
                          <p className="font-bold truncate">{u.name || "—"}</p>
                          <p className="text-[11px] text-[#8a8a8a] truncate">{u.email}</p>
                          <span className="inline-flex flex-wrap gap-1 mt-1">
                            <Badge tone={suspended ? "negative" : "positive"}>{suspended ? "Suspended" : "Can scan"}</Badge>
                            {owners.get(u.uid) && (
                              <Badge tone="info">
                                Made by {data.organizers.find((o) => o.id === owners.get(u.uid) || o.userId === owners.get(u.uid))?.companyName || "an organiser"}
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={`${tdCls} min-w-[200px]`}>
                      {!assigned ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#8a8a8a]" />
                      ) : events.length === 0 ? (
                        <Badge tone="warning">No events: can't scan</Badge>
                      ) : (
                        <ul className="space-y-1">
                          {events.map((id) => {
                            const info = eventInfo(id);
                            return (
                              <li key={id} className="text-[12px] leading-tight">
                                <span className="font-bold">{info.title || id}</span>
                                {info.date && <span className="text-[#8a8a8a]"> · {info.date}</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(u)}
                        disabled={!!busy || !assigned}
                        className="mt-2 flex items-center gap-1.5 text-[11px] font-bold underline cursor-pointer disabled:opacity-40"
                      >
                        <CalendarDays className="w-3.5 h-3.5" /> {events.length ? "Change events" : "Give events"}
                      </button>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <span className="font-bold">{a?.people || 0}</span>{" "}
                      <span className="text-[#8a8a8a]">{a?.people === 1 ? "person" : "people"}</span>
                      {a?.last && <span className="block text-[11px] text-[#8a8a8a]">last {fmtDateTime(a.last)}</span>}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      {busy === u.uid ? (
                        <Loader2 className="w-4 h-4 animate-spin inline-block" />
                      ) : (
                        <div className="flex items-center justify-end">
                          <IconButton title="Set a new password" onClick={() => newPassword(u)} disabled={!!busy}>
                            <KeyRound className="w-4 h-4" />
                          </IconButton>
                          {suspended ? (
                            <IconButton title="Reactivate: can scan again" onClick={() => setStatus(u, "active")} disabled={!!busy}>
                              <PlayCircle className="w-4 h-4" />
                            </IconButton>
                          ) : (
                            <IconButton title="Suspend: can't scan" onClick={() => setStatus(u, "suspended")} disabled={!!busy}>
                              <PauseCircle className="w-4 h-4" />
                            </IconButton>
                          )}
                          <IconButton title="Delete login" danger onClick={() => remove(u)} disabled={!!busy}>
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && <EmptyRow colSpan={4} title="No door staff yet" sub="Add a login above for each person working the gate." />}
            </DataTable>
          </Panel>
        </div>

        <Panel title="What a door staff login can do">
          <ul className="space-y-2.5 text-sm">
            {[
              "Sign in to the Jazba Scan app",
              "Scan tickets or type an order number, only for the events you give it",
              "See the holder's name, package and how many people the ticket admits",
              "Check people in: a whole group at once, or one by one",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CircleCheck className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
          <p className={`${overline} text-[#8a8a8a] mt-5 mb-2.5`}>Can't</p>
          <ul className="space-y-2.5 text-sm">
            {[
              "Open the admin portal",
              "See or check tickets for any other event",
              "Issue, edit, cancel, delete or reset tickets",
              "Admit unpaid or cancelled tickets",
              "Let in more people than a ticket admits",
              "See or change payments, events, users or settings",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CircleX className="w-4 h-4 text-[#b91c1c] shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#666] mt-5 leading-relaxed">
            The database enforces these limits, not just the app screens. Every check-in records which staff member did it.
          </p>
        </Panel>
      </div>

      {editing && (
        <EventsDrawer
          user={editing}
          initial={assigned?.get(editing.uid) || []}
          saving={busy === editing.uid}
          onSave={(events) => saveEvents(editing, events)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** Tick the events a login may check: upcoming first, past ones on request. */
function EventChecklist({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const { allEvents, eventInfo } = useAdmin();
  const [showPast, setShowPast] = useState(false);

  const { upcoming, past, missing } = useMemo(() => {
    const rows = allEvents.map((e) => ({ id: e.id, info: eventInfo(e.id) }));
    const ids = new Set(rows.map((r) => r.id));
    return {
      upcoming: rows.filter((r) => r.info.upcoming).sort((a, b) => (a.info.timestamp ?? Infinity) - (b.info.timestamp ?? Infinity)),
      past: rows.filter((r) => !r.info.upcoming).sort((a, b) => (b.info.timestamp ?? 0) - (a.info.timestamp ?? 0)),
      // Given earlier but no longer listed (e.g. the event was removed).
      missing: selected.filter((id) => !ids.has(id)),
    };
  }, [allEvents, eventInfo, selected]);

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const row = (id: string, title: string, sub: string) => {
    const on = selected.includes(id);
    return (
      <label key={id} className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer ${on ? "bg-[#fffbd1]" : "hover:bg-[#fafafa]"}`}>
        <input type="checkbox" checked={on} onChange={() => toggle(id)} className="mt-0.5 w-4 h-4 accent-black shrink-0" />
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-tight">{title}</span>
          {sub && <span className="block text-[11px] text-[#8a8a8a] mt-0.5">{sub}</span>}
        </span>
      </label>
    );
  };

  const pastSelected = past.filter((r) => selected.includes(r.id));
  const pastShown = showPast ? past : pastSelected;

  return (
    <div className="border border-[#e4e4e4] max-h-72 overflow-y-auto divide-y divide-[#f2f2f2] bg-white">
      {upcoming.length === 0 && <p className="px-3 py-3 text-xs text-[#8a8a8a]">No upcoming events.</p>}
      {upcoming.map((r) => row(r.id, r.info.title, [r.info.date, r.info.venue].filter(Boolean).join(" · ")))}
      {missing.map((id) => row(id, `Event ${id}`, "No longer listed: untick to remove"))}
      {pastShown.length > 0 && <p className={`${overline} text-[#8a8a8a] px-3 pt-3 pb-1.5`}>Past events</p>}
      {pastShown.map((r) => row(r.id, r.info.title, [r.info.date, r.info.venue].filter(Boolean).join(" · ")))}
      {past.length > pastSelected.length && (
        <button type="button" onClick={() => setShowPast(!showPast)} className="w-full text-left px-3 py-2.5 text-[11px] font-bold underline cursor-pointer">
          {showPast ? "Hide past events" : `Show past events (${past.length})`}
        </button>
      )}
    </div>
  );
}

/** Side panel to change one login's events. */
function EventsDrawer({
  user,
  initial,
  saving,
  onSave,
  onClose,
}: {
  user: UserProfile;
  initial: string[];
  saving: boolean;
  onSave: (events: string[]) => void;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<string[]>(initial);
  const changed = events.length !== initial.length || events.some((id) => !initial.includes(id));
  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="Door staff"
      title={`Events for ${user.name || user.email}`}
      sub={<p className="text-sm text-[#666]">{user.email}</p>}
      footer={
        <div className="flex items-center gap-2">
          <button type="button" className={btnPrimary} disabled={saving || !changed} onClick={() => onSave(events)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save events
          </button>
          <button type="button" className={btnOutline} onClick={onClose}>
            Cancel
          </button>
        </div>
      }
    >
      <p className="text-sm text-[#555] mb-3">
        This login can only scan and check in tickets for the events ticked here. A phone already signed in updates straight away.
      </p>
      <EventChecklist selected={events} onChange={setEvents} />
      <p className="text-xs text-[#8a8a8a] mt-3">
        {events.length === 0 ? "No events ticked: this login won't be able to scan anything." : `${events.length} event${events.length === 1 ? "" : "s"} ticked.`}
      </p>
    </Drawer>
  );
}

/** The details to give the staff member, with a copy button. */
function HandoverCard({ handover, onClose }: { handover: Handover; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Jazba Scan login for ${handover.name}\nApp: ${SCAN_URL}\nEmail: ${handover.email}\nPassword: ${handover.password}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy these login details:", text);
    }
  };
  return (
    <div className="bg-black text-white p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#ffed00]">Give these to {handover.name}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-white/55">App</dt>
            <dd className="font-bold break-all">{SCAN_URL}</dd>
            <dt className="text-white/55">Email</dt>
            <dd className="font-bold break-all">{handover.email}</dd>
            <dt className="text-white/55">Password</dt>
            <dd className="font-bold font-mono break-all">{handover.password}</dd>
          </dl>
          <p className="text-xs text-white/55 mt-3">This password isn't shown again. You can always set a new one from the list below.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 bg-[#ffed00] text-black font-bold text-sm px-4 py-2.5 cursor-pointer">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy details"}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-bold text-white/70 hover:text-white px-3 cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
