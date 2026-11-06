import React, { useMemo, useState } from "react";
import { Check, CircleCheck, CircleX, Copy, KeyRound, Loader2, PauseCircle, PlayCircle, ScanLine, Trash2, UserPlus, Wand2 } from "lucide-react";
import { updateUserRoleAndStatus, type UserProfile } from "../../../services/backendService";
import { createDoorStaff, deleteDoorStaff, setDoorStaffPassword, suggestPassword } from "../../../services/doorStaffService";
import { useAdmin } from "../AdminContext";
import {
  Avatar,
  Badge,
  DataTable,
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
 * and check tickets in — nothing else (firestore.rules → isDoorCheckIn; the
 * admin portal and every other page refuse them).
 */
export default function DoorStaffPage() {
  const { data, notify, fail, reload, peopleOnPass } = useAdmin();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(suggestPassword);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);

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
    setCreating(true);
    try {
      const made = await createDoorStaff(name.trim(), email.trim(), password);
      setHandover({ name: made.name, email: made.email, password });
      notify(`Door staff login created for ${made.name}.`);
      setName("");
      setEmail("");
      setPassword(suggestPassword());
      await reload();
    } catch (err: any) {
      fail(err?.message || "Could not create the login.");
    } finally {
      setCreating(false);
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
      await reload();
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
        sub="Logins for the people at the gate. They can only sign in to the Jazba Scan app and check tickets in. They can't open this portal or see payments, and they can't change any order."
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
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Checked in</th>
                  <th className={`${thCls} text-right`}>Manage</th>
                </>
              }
            >
              {staff.map((u) => {
                const a = activity.get((u.email || "").toLowerCase());
                const suspended = u.status === "suspended";
                return (
                  <tr key={u.uid} className="hover:bg-[#fafafa]">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={u.name || u.email} size={32} />
                        <div className="min-w-0">
                          <p className="font-bold truncate">{u.name || "—"}</p>
                          <p className="text-[11px] text-[#8a8a8a] truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <Badge tone={suspended ? "negative" : "positive"}>{suspended ? "Suspended" : "Can scan"}</Badge>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <span className="font-bold">{a?.people || 0}</span> <span className="text-[#8a8a8a]">{a?.people === 1 ? "person" : "people"}</span>
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
              "Scan tickets or type an order number",
              "See the holder's name, package and how many people the ticket admits",
              "Check people in: a whole group at once, or one by one",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CircleCheck className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
          <p className={`text-[11px] font-bold tracking-[0.14em] uppercase text-[#8a8a8a] mt-5 mb-2.5`}>Can't</p>
          <ul className="space-y-2.5 text-sm">
            {[
              "Open the admin portal",
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
    </div>
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
