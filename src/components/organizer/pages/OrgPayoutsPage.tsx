import React, { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { earnings, getPayouts, type Payout } from "../../../services/organizerService";
import { EmptyState, PageHeader, Panel, StatTile, fmtDate, money } from "../../admin/ui";
import { useOrg } from "../OrganizerContext";
import { CurrencyPicker, useMoney } from "../orgUi";

/** What the organiser has earned, Jazba's fee, and what's been paid to them. */
export default function OrgPayoutsPage() {
  const { user, org, report, reportLoading } = useOrg();
  const show = useMoney();
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getPayouts(user.uid)
      .then(setPayouts)
      .catch(() => {
        setPayouts([]);
        setError("Couldn’t load your payouts. Please refresh the page.");
      });
  }, [user.uid]);

  const fee = Number(org.feePercent) || 0;
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
