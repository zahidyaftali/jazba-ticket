import React from "react";
import { fromUsd, money } from "../admin/ui";
import { useOrg } from "./OrganizerContext";

/** A USD amount shown in the organiser's chosen currency. */
export function useMoney() {
  const { currency } = useOrg();
  return (usd: number) => money(fromUsd(usd, currency), currency);
}

export function CurrencyPicker() {
  const { currency, setCurrency } = useOrg();
  return (
    <label className="flex items-center gap-2 text-xs font-bold text-[#666]">
      Show in
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="bg-white border border-[#e4e4e4] px-2 py-2 text-xs font-bold text-black cursor-pointer outline-none focus:border-black"
      >
        <option value="GBP">GBP</option>
        <option value="USD">USD</option>
        <option value="PKR">PKR</option>
      </select>
    </label>
  );
}

/** Sold / capacity as a thin bar. */
export function SoldBar({ sold, capacity }: { sold: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;
  return (
    <div className="min-w-[110px]">
      <div className="text-xs font-bold">
        {sold}
        {capacity > 0 && <span className="text-[#8a8a8a] font-medium"> / {capacity}</span>}
      </div>
      {capacity > 0 && (
        <div className="h-1.5 bg-[#efefef] mt-1.5">
          <div className="h-full bg-black" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export const ORG_EVENT_STATUS: Record<string, { label: string; tone: "positive" | "warning" | "neutral" | "negative" | "info" }> = {
  published: { label: "On sale", tone: "positive" },
  pending: { label: "In review", tone: "warning" },
  draft: { label: "Draft", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "negative" },
  completed: { label: "Completed", tone: "info" },
};

export function eventDateText(e: any): string {
  if (e?.fullDate && e.fullDate !== e.date) return e.fullDate;
  return [e?.date, e?.year].filter(Boolean).join(" ") || "Date to be set";
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-[#8a8a8a] font-medium">{children}</p>;
}
