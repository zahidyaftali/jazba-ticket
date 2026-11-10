import React, { useEffect, useState } from "react";
import { Copy, ExternalLink, KeyRound, Loader2, Pause, Play, Plus, ScanLine, Smartphone, Trash2, UserPlus } from "lucide-react";
import { suggestPassword } from "../../../services/doorStaffService";
import {
  createStaffLogin, deleteStaffLogin, listStaffLogins, setStaffEvents, setStaffPassword, setStaffStatus, type StaffLogin,
} from "../../../services/organizerToolsService";
import { Badge, Drawer, EmptyState, Field, PageHeader, Panel, btnDark, btnOutline, btnPrimary, inputCls } from "../../admin/ui";
import { useOrg } from "../OrganizerContext";
import { Hint, eventDateText } from "../orgUi";

/** Door check-in for an organiser's own events: scan yourself with Jazba
 *  Scan, or make logins for your door team — each sees only the events you
 *  pick and can only check tickets in. */
export default function OrgDoorStaffPage() {
  const { events, toolOrgId, actingAsAdmin, notify, fail } = useOrg();
  const scannable = events.filter((e) => e.status === "published" || e.status === "completed");
  const [staff, setStaff] = useState<StaffLogin[] | null>(null);
  const [drawer, setDrawer] = useState<{ mode: "new" } | { mode: "events" | "password"; login: StaffLogin } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scanUrl = `${window.location.origin}/scan`;

  const load = () =>
    listStaffLogins(toolOrgId)
      .then(setStaff)
      .catch((err) => {
        setStaff([]);
        fail(err?.message || "Couldn’t load your door staff.");
      });
  useEffect(() => {
    void load();
  }, [toolOrgId]);

  const openNew = () => {
    setName("");
    setEmail("");
    setPassword(suggestPassword());
    setPicked(scannable.length === 1 ? [scannable[0].id] : []);
    setError("");
    setDrawer({ mode: "new" });
  };
  const openEvents = (login: StaffLogin) => {
    setPicked(login.events);
    setError("");
    setDrawer({ mode: "events", login });
  };
  const openPassword = (login: StaffLogin) => {
    setPassword(suggestPassword());
    setError("");
    setDrawer({ mode: "password", login });
  };

  const submit = async () => {
    if (!drawer) return;
    setError("");
    setBusy(true);
    try {
      if (drawer.mode === "new") {
        if (!name.trim()) throw new Error("Add the staff member’s name.");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) throw new Error("Add a valid email address — it’s their username.");
        if (password.length < 8) throw new Error("The password needs at least 8 characters.");
        await createStaffLogin({ name: name.trim(), email: email.trim(), password, events: picked }, toolOrgId);
        notify(`Login made for ${name.trim()}. Share the email and password with them.`);
      } else if (drawer.mode === "events") {
        await setStaffEvents(drawer.login.uid, picked, toolOrgId);
        notify("Events updated — it changes on their phone straight away.");
      } else {
        if (password.length < 8) throw new Error("The password needs at least 8 characters.");
        await setStaffPassword(drawer.login.uid, password, toolOrgId);
        notify(`New password set for ${drawer.login.name}.`);
      }
      setDrawer(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (login: StaffLogin) => {
    try {
      await setStaffStatus(login.uid, login.status === "suspended" ? "active" : "suspended", toolOrgId);
      notify(login.status === "suspended" ? `${login.name} can sign in again.` : `${login.name} can’t sign in now.`);
      await load();
    } catch (err: any) {
      fail(err?.message || "Couldn’t change that login.");
    }
  };

  const remove = async (login: StaffLogin) => {
    if (!window.confirm(`Delete ${login.name}’s login? They’ll be signed out of Jazba Scan.`)) return;
    try {
      await deleteStaffLogin(login.uid, toolOrgId);
      notify("Login deleted.");
      await load();
    } catch (err: any) {
      fail(err?.message || "Couldn’t delete that login.");
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${what} copied.`);
    } catch {
      /* select it manually */
    }
  };

  const titleOf = (id: string) => events.find((e) => e.id === id)?.title || "Event";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Door staff & scanning"
        sub="Check tickets in at the door with Jazba Scan on any phone. Every ticket works once only — even with several phones at the same door."
        actions={
          <button type="button" className={btnPrimary} onClick={openNew}>
            <UserPlus className="w-4 h-4" /> Add door staff
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Scan tickets yourself">
          <div className="flex items-start gap-4">
            <span className="w-11 h-11 bg-black text-[#ffed00] flex items-center justify-center shrink-0">
              <ScanLine className="w-5 h-5" />
            </span>
            <div className="text-sm space-y-2">
              <p>
                Open <span className="font-bold">{scanUrl.replace(/^https?:\/\//, "")}</span> on your phone and sign in with{" "}
                {actingAsAdmin ? "the organiser’s" : "this"} account. You’ll see your events that are on sale.
              </p>
              <p className="text-[#666]">Tip: add it to your home screen — it works like an app, with the camera or a barcode scanner gun.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a href="/scan" target="_blank" rel="noopener noreferrer" className={btnDark}>
                  <ExternalLink className="w-3.5 h-3.5" /> Open Jazba Scan
                </a>
                <button type="button" className={btnOutline} onClick={() => copy(scanUrl, "Scanner link")}>
                  <Copy className="w-3.5 h-3.5" /> Copy link
                </button>
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="How door staff logins work">
          <ul className="text-sm space-y-2 text-[#444]">
            <li className="flex gap-2"><Smartphone className="w-4 h-4 shrink-0 mt-0.5" /> They sign in to Jazba Scan with the email and password you set.</li>
            <li className="flex gap-2"><ScanLine className="w-4 h-4 shrink-0 mt-0.5" /> They only see the events you give them, and can only check people in.</li>
            <li className="flex gap-2"><Pause className="w-4 h-4 shrink-0 mt-0.5" /> Pause or delete a login any time — it stops working straight away.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Your door staff" bodyClassName="">
        {staff === null ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#8a8a8a]" />
          </div>
        ) : staff.length === 0 ? (
          <div className="py-12 px-4">
            <EmptyState
              icon={UserPlus}
              title="No door staff yet"
              sub="Add a login for each person on your door — they’ll only see the events you choose."
              action={
                <button type="button" className={btnPrimary} onClick={openNew}>
                  <Plus className="w-4 h-4" /> Add door staff
                </button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#f2f2f2]">
            {staff.map((s) => (
              <li key={s.uid} className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold flex items-center gap-2">
                    {s.name} {s.status === "suspended" ? <Badge tone="neutral">Paused</Badge> : <Badge tone="positive">Active</Badge>}
                  </p>
                  <p className="text-xs text-[#8a8a8a]">{s.email}</p>
                  <p className="text-xs text-[#444] mt-1">{s.events.length ? s.events.map(titleOf).join(", ") : "No events yet — give them one"}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button type="button" className={btnOutline} onClick={() => openEvents(s)}>
                    Events
                  </button>
                  <button type="button" className={btnOutline} onClick={() => openPassword(s)} title="Set a new password">
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className={btnOutline} onClick={() => toggleStatus(s)} title={s.status === "suspended" ? "Let them sign in" : "Pause login"}>
                    {s.status === "suspended" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button" className="p-2 text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer" onClick={() => remove(s)} title="Delete login">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        eyebrow={drawer?.mode === "new" ? "New login" : drawer ? drawer.login.name : ""}
        title={drawer?.mode === "new" ? "Add door staff" : drawer?.mode === "events" ? "Which events can they check?" : "Set a new password"}
        footer={
          <>
            <button type="button" className={btnPrimary} disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {drawer?.mode === "new" ? "Create login" : "Save"}
            </button>
            <button type="button" className={btnOutline} onClick={() => setDrawer(null)}>
              Cancel
            </button>
          </>
        }
      >
        {drawer && (
          <div className="space-y-5 text-sm">
            {error && <p className="text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-3 py-2">{error}</p>}
            {drawer.mode === "new" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name *">
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bilal — front door" />
                </Field>
                <Field label="Email (their username) *">
                  <input type="email" inputMode="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
              </div>
            )}
            {drawer.mode !== "events" && (
              <Field label="Password" hint="At least 8 characters. Share it with them privately — you can set a new one any time.">
                <div className="flex gap-2">
                  <input className={`${inputCls} font-mono`} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className={btnOutline} onClick={() => setPassword(suggestPassword())}>
                    New
                  </button>
                  <button type="button" className={btnOutline} onClick={() => copy(password, "Password")}>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Field>
            )}
            {drawer.mode !== "password" && (
              <div>
                <span className="text-[11px] font-bold text-[#666] block mb-2">Events they can check</span>
                {scannable.length === 0 ? (
                  <Hint>None of your events are on sale yet — you can add events to this login later.</Hint>
                ) : (
                  <div className="border border-[#e4e4e4] divide-y divide-[#f2f2f2] max-h-64 overflow-y-auto">
                    {scannable.map((e) => (
                      <label key={e.id} className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-[#fafafa]">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={picked.includes(e.id)}
                          onChange={() => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))}
                        />
                        <span className="min-w-0">
                          <span className="font-bold block truncate">{e.title}</span>
                          <span className="text-[11px] text-[#8a8a8a]">{eventDateText(e)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
