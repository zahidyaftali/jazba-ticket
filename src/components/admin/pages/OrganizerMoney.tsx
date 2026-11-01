import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Trash2, Wallet, X } from "lucide-react";
import type { OrganizerProfile } from "../../../services/backendService";
import {
  deleteOrganizerWithCleanup,
  deletePayout,
  earnings,
  eventsOfOrganizer,
  getFollowers,
  getPayouts,
  isSelfRegistered,
  recordPayout,
  setOrganizerFee,
  type Payout,
} from "../../../services/organizerService";
import { useAdmin } from "../AdminContext";
import { IconButton, Panel, btnOutline, btnPrimary, fmtDate, fromUsd, inputCls, labelCls, money } from "../ui";

/** Payouts are keyed by the organiser's login uid, so they can read their own. */
export const payoutKey = (org: OrganizerProfile) => (isSelfRegistered(org) ? org.userId : org.id || "");

const METHODS = ["Bank transfer", "Easypaisa", "JazzCash", "Cash", "Cheque", "Other"];

// ── Delete ─────────────────────────────────────────────────────────────────

/** Delete an organiser, choosing what happens to their events. */
export function DeleteOrganizerDialog({ org, onClose, onDeleted }: { org: OrganizerProfile; onClose: () => void; onDeleted: () => void }) {
  const { data, notify, fail, reload } = useAdmin();
  const [followIds, setFollowIds] = useState<string[] | null>(null);
  const [deleteUnsold, setDeleteUnsold] = useState(true);
  const [takeSoldOffSale, setTakeSoldOffSale] = useState(true);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFollowers("organizer", org.id || "")
      .then((f) => setFollowIds(f.map((x) => x.id)))
      .catch(() => setFollowIds([]));
  }, [org.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const events = eventsOfOrganizer(org, data.events);
  const withOrders = new Set(data.bookings.map((b) => b.eventId));
  // Only an organiser's own (self-registered) events are theirs to remove;
  // events merely naming an admin-made profile stay untouched.
  const own = isSelfRegistered(org) ? events : [];
  const sold = own.filter((e) => withOrders.has(e.id));
  const unsold = own.filter((e) => !withOrders.has(e.id));
  const liveSold = sold.filter((e) => e.status === "published" || e.status === "pending");
  const account = data.users.find((u) => u.uid === org.userId);

  const go = async () => {
    setBusy(true);
    try {
      await deleteOrganizerWithCleanup(org, {
        unsoldEventIds: unsold.map((e) => e.id),
        soldEventIds: liveSold.map((e) => e.id),
        followIds: followIds || [],
        deleteUnsold,
        takeSoldOffSale,
        accountRole: account?.role,
      });
      notify(`${org.companyName} deleted.`);
      await reload();
      onDeleted();
    } catch (err) {
      console.error("Delete organiser failed:", err);
      fail("Couldn’t delete the organiser. Make sure the latest database rules are published (Dashboard).");
      setBusy(false);
    }
  };

  const check = (on: boolean, set: (v: boolean) => void, label: React.ReactNode, sub: string) => (
    <label className="flex items-start gap-3 cursor-pointer py-2">
      <input type="checkbox" checked={on} onChange={() => set(!on)} className="mt-1" />
      <span>
        <span className="font-bold text-sm block">{label}</span>
        <span className="text-xs text-[#666]">{sub}</span>
      </span>
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Delete organiser">
      <div className="absolute inset-0 bg-black/50 jz-admin-fade" onClick={() => !busy && onClose()} />
      <div className="relative bg-white w-full max-w-lg border border-black max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#efefef]">
          <div>
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#7a2f2f]">Delete organiser</span>
            <h2 className="font-display font-bold text-xl leading-tight mt-1">{org.companyName}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="w-9 h-9 flex items-center justify-center border border-[#e4e4e4] hover:border-black cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 text-sm">
          <ul className="space-y-1.5 text-[#333]">
            <li>• Their organiser profile and public page are removed.</li>
            {isSelfRegistered(org) && <li>• Their login stays as a normal customer account{account?.role === "organizer" ? " (organiser access removed)" : ""}.</li>}
            <li>• {followIds === null ? "Counting followers…" : `${followIds.length} follower${followIds.length === 1 ? "" : "s"} removed.`}</li>
            <li>• Orders, tickets and payout records are kept.</li>
          </ul>
          {own.length > 0 && (
            <div className="border-t border-[#f2f2f2] pt-3">
              {unsold.length > 0 &&
                check(deleteUnsold, setDeleteUnsold, `Delete their ${unsold.length} event${unsold.length === 1 ? "" : "s"} with no orders`, "Drafts, events in review and events nobody has bought tickets for.")}
              {liveSold.length > 0 &&
                check(
                  takeSoldOffSale,
                  setTakeSoldOffSale,
                  `Take their ${liveSold.length} event${liveSold.length === 1 ? "" : "s"} with orders off sale`,
                  "These are kept because orders point to them. Tickets already sold stay valid at the door.",
                )}
              {sold.length > 0 && !liveSold.length && <p className="text-xs text-[#666] py-2">Their {sold.length} event(s) with orders are kept.</p>}
            </div>
          )}
          <div className="bg-[#f7ecec] text-[#7a2f2f] p-3 flex items-start gap-2 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" /> This can’t be undone. Their uploaded images stay in Media → Organiser uploads.
          </div>
          <div>
            <label className={labelCls} htmlFor="del-org-confirm">
              Type DELETE to confirm
            </label>
            <input id="del-org-confirm" className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <div className="border-t border-[#efefef] px-6 py-4 flex justify-end gap-2">
          <button type="button" className={btnOutline} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || typed.trim() !== "DELETE" || followIds === null}
            onClick={go}
            className="inline-flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold bg-[#7a2f2f] hover:bg-[#5f2424] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete organiser
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Payouts & fee ──────────────────────────────────────────────────────────

export function PayoutsPanel({ org, grossUsd }: { org: OrganizerProfile; grossUsd: number }) {
  const { notify, fail, reload } = useAdmin();
  const key = payoutKey(org);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [currency, setCurrency] = useState("PKR");
  const [fee, setFee] = useState(String(org.feePercent ?? 0));
  const [savingFee, setSavingFee] = useState(false);
  const [form, setForm] = useState({ amount: "", currency: "PKR", paidAt: new Date().toISOString().slice(0, 10), method: METHODS[0], reference: "", note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!key) return;
    getPayouts(key)
      .then(setPayouts)
      .catch(() => setPayouts([]));
  }, [key]);
  useEffect(() => setFee(String(org.feePercent ?? 0)), [org.feePercent]);

  const e = useMemo(() => earnings(grossUsd, org.feePercent, payouts || []), [grossUsd, org.feePercent, payouts]);
  const show = (usd: number) => money(fromUsd(usd, currency), currency);

  const saveFee = async () => {
    const v = Number(fee);
    if (!(v >= 0 && v <= 100)) return fail("The fee must be between 0 and 100%.");
    setSavingFee(true);
    try {
      await setOrganizerFee(org.id!, v);
      notify(`Jazba fee set to ${v}%.`);
      await reload();
    } catch {
      fail("Couldn’t save the fee.");
    } finally {
      setSavingFee(false);
    }
  };

  const add = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const p = await recordPayout({ organizerId: key, amount: Number(form.amount), currency: form.currency, method: form.method, reference: form.reference, note: form.note, paidAt: form.paidAt });
      setPayouts((list) => [p, ...(list || [])]);
      setForm((f) => ({ ...f, amount: "", reference: "", note: "" }));
      notify("Payout recorded — the organiser can see it in their portal.");
    } catch (err: any) {
      fail(err?.message || "Couldn’t record the payout.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Payout) => {
    if (!window.confirm(`Delete the payout of ${money(p.amount, p.currency)} on ${fmtDate(p.paidAt)}?`)) return;
    try {
      await deletePayout(p.id);
      setPayouts((list) => (list || []).filter((x) => x.id !== p.id));
      notify("Payout deleted.");
    } catch {
      fail("Couldn’t delete the payout.");
    }
  };

  const row = (label: React.ReactNode, value: string, strong = false) => (
    <div className={`flex items-center justify-between py-2 ${strong ? "border-t border-black mt-1 pt-3" : "border-b border-[#f2f2f2]"}`}>
      <span className={strong ? "font-bold" : "text-[#555]"}>{label}</span>
      <span className={`font-bold ${strong ? "text-lg" : ""}`}>{value}</span>
    </div>
  );

  return (
    <Panel
      title="Payouts & Jazba fee"
      sub="Ticket money comes to Jazba; record what you pay the organiser here. They see the same figures in their portal."
      action={
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-white border border-[#e4e4e4] px-2 py-1.5 text-xs font-bold cursor-pointer outline-none">
          <option value="PKR">PKR</option>
          <option value="GBP">GBP</option>
          <option value="USD">USD</option>
        </select>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
        <div>
          {row("Gross ticket sales", show(e.gross))}
          {row(`Jazba fee (${Number(org.feePercent) || 0}%)`, `− ${show(e.fee)}`)}
          {row("Organiser’s share", show(e.net))}
          {row("Paid out", `− ${show(e.paid)}`)}
          {row(e.owed >= 0 ? "Still owed to organiser" : "Overpaid", show(Math.abs(e.owed)), true)}
          <div className="flex items-end gap-2 mt-5">
            <div className="flex-1">
              <label className={labelCls} htmlFor={`fee-${org.id}`}>
                Jazba fee (%)
              </label>
              <input id={`fee-${org.id}`} type="number" min={0} max={100} step="0.5" className={inputCls} value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
            <button type="button" className={btnOutline} onClick={saveFee} disabled={savingFee || Number(fee) === (Number(org.feePercent) || 0)}>
              {savingFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save fee"}
            </button>
          </div>
        </div>
        <div>
          {key ? (
            <form onSubmit={add} className="bg-[#f7f7f7] p-4 space-y-3">
              <span className="font-bold text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Record a payout
              </span>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min={0} step="0.01" required className={`${inputCls} col-span-2 !bg-white`} placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <select className={`${inputCls} !bg-white`} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option>PKR</option>
                  <option>GBP</option>
                  <option>USD</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className={`${inputCls} !bg-white`} value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
                <select className={`${inputCls} !bg-white`} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <input className={`${inputCls} !bg-white`} placeholder="Reference (e.g. bank transaction ID)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} maxLength={120} />
              <input className={`${inputCls} !bg-white`} placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} />
              <button type="submit" className={`${btnPrimary} w-full`} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Record payout"}
              </button>
            </form>
          ) : (
            <p className="text-[#666]">This profile has no organiser login, so payouts can’t be shown to them.</p>
          )}
        </div>
      </div>
      <div className="mt-6">
        <span className={labelCls}>Payout history</span>
        {payouts === null ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#8a8a8a]" />
        ) : payouts.length === 0 ? (
          <p className="text-sm text-[#8a8a8a]">No payouts recorded yet.</p>
        ) : (
          <ul className="divide-y divide-[#f2f2f2] border-t border-[#f2f2f2]">
            {payouts.map((p) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-bold">{money(p.amount, p.currency)}</span>
                  <span className="text-[#666]">
                    {" "}
                    · {fmtDate(p.paidAt)} · {p.method}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  {p.note && <span className="block text-xs text-[#8a8a8a] truncate">{p.note}</span>}
                </span>
                <IconButton title="Delete payout" danger onClick={() => remove(p)}>
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
