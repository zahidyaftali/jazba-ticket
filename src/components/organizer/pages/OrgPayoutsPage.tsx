import React, { useEffect, useState } from "react";
import { Landmark, Loader2, Lock, Wallet } from "lucide-react";
import { earnings, getPayouts, type Payout } from "../../../services/organizerService";
import { saveOrganizerPrivate, type PayoutDetails } from "../../../services/organizerToolsService";
import { EmptyState, Field, PageHeader, Panel, StatTile, btnPrimary, fmtDate, inputCls, money } from "../../admin/ui";
import { useOrg } from "../OrganizerContext";
import { CurrencyPicker, useMoney } from "../orgUi";

/** What the organiser has earned, Jazba's fee, and what's been paid to them. */
export default function OrgPayoutsPage() {
  const { orgUid, org, report, reportLoading, priv, setPriv, notify, fail } = useOrg();
  const show = useMoney();
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getPayouts(orgUid)
      .then(setPayouts)
      .catch(() => {
        setPayouts([]);
        setError("Couldn’t load your payouts. Please refresh the page.");
      });
  }, [orgUid]);

  const fee = Number(priv?.feePercent ?? org.feePercent) || 0;
  const e = earnings(report?.totals.revenueUsd || 0, fee, payouts || []);
  const loading = reportLoading || payouts === null;

  return (
    <div className="space-y-6">
      <PageHeader title="Payouts" sub="Ticket payments are collected by Jazba Tickets. Here’s what you’ve earned and what’s been paid to you." actions={<CurrencyPicker />} />
      {error && <p className="text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-4 py-3">{error}</p>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Gross ticket sales" value={loading ? "…" : show(e.gross)} />
        <StatTile label={`Your share (after ${fee}% Jazba fee)`} value={loading ? "…" : show(e.net)} sub={fee ? `Fee: ${show(e.fee)}` : "No fee set"} />
        <StatTile label="Paid to you" value={loading ? "…" : show(e.paid)} />
        <StatTile dark label={e.owed >= 0 ? "Still to be paid" : "Paid in advance"} icon={Wallet} value={loading ? "…" : show(Math.abs(e.owed))} />
      </div>

      <PayoutDetailsForm
        value={priv?.payout}
        onSave={async (payout) => {
          try {
            await saveOrganizerPrivate(org.id || orgUid, { payout });
            setPriv({ ...(priv || {}), payout });
            notify("Payout details saved.");
          } catch {
            fail("Couldn’t save your payout details.");
          }
        }}
      />

      <Panel title="Payout history" bodyClassName="">
        {payouts === null ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#8a8a8a]" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="py-12 px-4">
            <EmptyState icon={Wallet} title="No payouts yet" sub="When the Jazba team pays you, each payment appears here." />
          </div>
        ) : (
          <ul className="divide-y divide-[#f2f2f2]">
            {payouts.map((p) => (
              <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-bold block">
                    {fmtDate(p.paidAt)} · {p.method}
                  </span>
                  <span className="text-[11px] text-[#8a8a8a] block truncate">{[p.reference, p.note].filter(Boolean).join(" · ") || "—"}</span>
                </span>
                <span className="font-bold shrink-0">{money(p.amount, p.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-xs text-[#8a8a8a] max-w-2xl">
        Figures use Jazba’s fixed exchange rates; payouts are shown in the currency they were paid in. Questions about a payout? Email{" "}
        <a className="underline" href="mailto:info@jazbatickets.com">
          info@jazbatickets.com
        </a>
        .
      </p>
    </div>
  );
}

const BLANK_PAYOUT: PayoutDetails = { method: "uk", accountName: "", bankName: "", sortCode: "", accountNumber: "", iban: "", bic: "", notes: "" };

/** Where Jazba sends the organiser's money. Private: only they and admins see it. */
function PayoutDetailsForm({ value, onSave }: { value?: PayoutDetails; onSave: (p: PayoutDetails) => Promise<void> }) {
  const [form, setForm] = useState<PayoutDetails>({ ...BLANK_PAYOUT, ...(value || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (value) setForm({ ...BLANK_PAYOUT, ...value });
  }, [value]);
  const set = <K extends keyof PayoutDetails>(k: K, v: PayoutDetails[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.accountName.trim()) return setError("Add the name on the account.");
    if (form.method === "uk") {
      if (!/^\d{2}-?\d{2}-?\d{2}$/.test((form.sortCode || "").trim())) return setError("A UK sort code looks like 12-34-56.");
      if (!/^\d{8}$/.test((form.accountNumber || "").replace(/\s/g, ""))) return setError("A UK account number has 8 digits.");
    }
    if ((form.method === "iban" || form.method === "pk") && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test((form.iban || "").replace(/\s/g, "").toUpperCase())) {
      return setError("That IBAN doesn’t look right.");
    }
    setSaving(true);
    await onSave({
      ...form,
      sortCode: (form.sortCode || "").trim(),
      accountNumber: (form.accountNumber || "").replace(/\s/g, ""),
      iban: (form.iban || "").replace(/\s/g, "").toUpperCase(),
      bic: (form.bic || "").trim().toUpperCase(),
    });
    setSaving(false);
  };

  return (
    <Panel
      title="Payout details"
      sub="Where we send your earnings after each event."
      action={
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#666]">
          <Lock className="w-3.5 h-3.5" /> Private
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4 text-sm" noValidate>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["uk", "UK bank account"],
              ["iban", "IBAN (Europe & worldwide)"],
              ["pk", "Pakistan bank (IBAN)"],
              ["other", "Other"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => set("method", id)}
              className={`px-3 py-2 text-xs font-bold border cursor-pointer ${form.method === id ? "border-black bg-black text-[#ffed00]" : "border-[#e4e4e4] hover:border-black"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name on the account *">
            <input className={inputCls} value={form.accountName} onChange={(e) => set("accountName", e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Bank name">
            <input className={inputCls} value={form.bankName || ""} onChange={(e) => set("bankName", e.target.value)} autoComplete="off" />
          </Field>
          {form.method === "uk" && (
            <>
              <Field label="Sort code *">
                <input className={inputCls} value={form.sortCode || ""} onChange={(e) => set("sortCode", e.target.value)} placeholder="12-34-56" inputMode="numeric" autoComplete="off" />
              </Field>
              <Field label="Account number *">
                <input className={inputCls} value={form.accountNumber || ""} onChange={(e) => set("accountNumber", e.target.value)} placeholder="12345678" inputMode="numeric" autoComplete="off" />
              </Field>
            </>
          )}
          {(form.method === "iban" || form.method === "pk") && (
            <>
              <Field label="IBAN *">
                <input className={`${inputCls} uppercase`} value={form.iban || ""} onChange={(e) => set("iban", e.target.value)} placeholder={form.method === "pk" ? "PK36SCBL0000001123456702" : "GB29NWBK60161331926819"} autoComplete="off" />
              </Field>
              <Field label="BIC / SWIFT">
                <input className={`${inputCls} uppercase`} value={form.bic || ""} onChange={(e) => set("bic", e.target.value)} autoComplete="off" />
              </Field>
            </>
          )}
        </div>
        <Field label={form.method === "other" ? "How should we pay you? *" : "Anything else we should know"}>
          <textarea className={`${inputCls} h-16`} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        {error && <p className="text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-3 py-2">{error}</p>}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-[#8a8a8a] flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5" /> Only you and the Jazba finance team can see these details.
          </p>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save payout details
          </button>
        </div>
      </form>
    </Panel>
  );
}
