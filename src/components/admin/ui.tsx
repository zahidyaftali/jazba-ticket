import React, { useEffect, useState } from "react";
import { ArrowLeft, Inbox, Search, X } from "lucide-react";

// ── Admin portal building blocks — flat, square, black / Sunlight-Yellow ──

export const overline = "text-[10px] font-bold tracking-[0.18em] uppercase";

export const inputCls =
  "w-full bg-[#f7f7f7] px-3 py-2.5 text-sm font-medium text-black placeholder-[#9a9a9a] outline-none border border-transparent focus:border-black transition-colors";
export const labelCls =
  "text-[10px] font-bold tracking-[0.15em] uppercase text-[#666] block mb-1.5";
export const rowInputCls =
  "bg-white px-2.5 py-2 text-sm font-medium text-black placeholder-[#9a9a9a] outline-none border border-[#e4e4e4] focus:border-black transition-colors";
export const selectCls =
  "bg-transparent pl-1 pr-6 py-2 text-xs font-bold text-black cursor-pointer outline-none";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap";
export const btnPrimary = `${btnBase} bg-[#ffed00] hover:bg-[#e6d200] text-black`;
export const btnDark = `${btnBase} bg-black hover:bg-neutral-800 text-white`;
export const btnOutline = `${btnBase} bg-white border border-black hover:bg-[#f7f7f7] text-black`;
export const btnGhost = `${btnBase} text-[#333] hover:bg-[#f2f2f2] hover:text-black`;
export const addRowBtnCls =
  "flex items-center gap-1.5 py-2 px-3.5 bg-black hover:bg-neutral-800 text-white text-[11px] font-bold cursor-pointer transition-colors shrink-0";

// ── Formatting ─────────────────────────────────────────────────────────────

const RATES: Record<string, number> = { USD: 1, GBP: 0.78, PKR: 280 };
const SYMBOLS: Record<string, string> = { USD: "$", GBP: "£", PKR: "PKR " };

/** $1,234.5 → "$1,234.50"; whole numbers drop the decimals. */
export function money(usd: number, currency = "USD"): string {
  const v = Number(usd) || 0;
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  if (currency === "PKR") return `${symbol}${Math.round(v).toLocaleString()}`;
  const whole = Math.abs(v - Math.round(v)) < 0.005;
  return `${symbol}${v.toLocaleString(undefined, {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** USD amount → the given currency at the site's fixed checkout rates. */
export function fromUsd(usd: number, currency: string): number {
  return (Number(usd) || 0) * (RATES[currency] ?? 1);
}
export function toUsd(amount: number, currency: string): number {
  return (Number(amount) || 0) / (RATES[currency] ?? 1);
}

/** Compact axis/tile number: 1,284 / 12.9K / 4.2M. */
export function compact(n: number): string {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 10_000) return `${(n / 1_000).toFixed(v >= 100_000 ? 0 : 1)}K`;
  return Math.round(n).toLocaleString();
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${fmtDate(iso)}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(iso);
}

export function initials(name: string): string {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Download rows as a CSV file (opens cleanly in Excel / Google Sheets). */
export function downloadCsv(filename: string, rows: (string | number | boolean | null | undefined)[][]) {
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    // Stop spreadsheet apps from running cell text as a formula.
    if (/^[=+\-@]/.test(s) && !/^-?\d/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Layout pieces ──────────────────────────────────────────────────────────

export function PageHeader({
  title,
  sub,
  actions,
  back,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        {back && (
          <button
            type="button"
            onClick={back.onClick}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#666] hover:text-black mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {back.label}
          </button>
        )}
        <h1 className="font-display font-bold text-2xl sm:text-[28px] leading-[1.05] text-black">{title}</h1>
        {sub && <p className="text-sm text-[#666] mt-1.5 max-w-3xl">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/** A titled white panel — the building block of every admin screen. */
export function Panel({
  title,
  sub,
  action,
  children,
  className = "",
  bodyClassName = "p-5",
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`bg-white border border-[#e4e4e4] ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#f2f2f2]">
          <div className="min-w-0">
            {title && <h3 className="font-display font-bold text-sm text-black">{title}</h3>}
            {sub && <p className="text-[11px] text-[#8a8a8a] font-medium mt-0.5">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** A titled settings panel used by every editor form. */
export function EditorPanel(props: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return <Panel {...props} bodyClassName="p-5 space-y-4" />;
}

/** Black command bar on top of an editor: back, breadcrumb + title, cancel/save. */
export function EditorHeader({
  crumb,
  title,
  onBack,
  formId,
  saveLabel,
  saving,
}: {
  crumb: string;
  title: string;
  onBack: () => void;
  formId: string;
  saveLabel: string;
  saving?: boolean;
}) {
  return (
    <div className="bg-black text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 border border-white/30 hover:border-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
          title="Back to list"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#ffed00] block">{crumb}</span>
          <h3 className="font-display font-bold text-lg leading-tight truncate">{title}</h3>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="py-2.5 px-4 border border-white/30 hover:border-white text-white text-xs font-bold cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          form={formId}
          disabled={saving}
          className="py-2.5 px-6 bg-[#ffed00] hover:bg-[#e6d200] disabled:opacity-60 text-black text-xs font-bold cursor-pointer transition-colors"
        >
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[#8a8a8a] font-medium">{hint}</p>}
    </div>
  );
}

/** An image URL input with a live thumbnail preview. */
export function ImageUrlField({
  label,
  value,
  onChange,
  wide = false,
  placeholder = "https://…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  placeholder?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [value]);
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div
          className={`shrink-0 bg-[#f2f2f2] border border-[#e4e4e4] overflow-hidden flex items-center justify-center ${wide ? "w-20 h-12" : "w-12 h-12"}`}
        >
          {value && !broken ? (
            <img
              src={value}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
            />
          ) : (
            <span className="text-[9px] font-bold text-[#8a8a8a]">{value ? "Bad URL" : "None"}</span>
          )}
        </div>
        <input
          type="text"
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </Field>
  );
}

// ── Stat tiles ─────────────────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  dark = false,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ElementType;
  dark?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button", onClick } : {})}
      className={`w-full h-full flex flex-col justify-start text-left p-5 border transition-colors ${
        dark ? "bg-black text-white border-black" : "bg-white border-[#e4e4e4]"
      } ${onClick ? `cursor-pointer ${dark ? "hover:bg-[#111]" : "hover:border-black"}` : ""}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className={`text-[11px] font-bold ${dark ? "text-white/60" : "text-[#666]"}`}>{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${dark ? "text-[#ffed00]" : "text-black"}`} />}
      </div>
      <span className={`block font-display font-bold text-[28px] leading-none ${dark ? "text-white" : "text-black"}`}>
        {value}
      </span>
      {sub && <span className={`block text-xs mt-2 ${dark ? "text-[#ffed00] font-bold" : "text-[#8a8a8a]"}`}>{sub}</span>}
    </Tag>
  );
}

// ── Badges ─────────────────────────────────────────────────────────────────

export type Tone = "positive" | "warning" | "negative" | "info" | "neutral" | "brand" | "dark";

const TONES: Record<Tone, { cls: string; dot: string }> = {
  positive: { cls: "bg-[#edf6e8] text-[#2f5d1f]", dot: "#5b9a3c" },
  warning: { cls: "bg-[#fdf2df] text-[#7a4f0e]", dot: "#e0952b" },
  negative: { cls: "bg-[#f7ecec] text-[#7a2f2f]", dot: "#be6464" },
  info: { cls: "bg-[#e9f0f7] text-[#1f4c75]", dot: "#337ab7" },
  neutral: { cls: "bg-[#f2f2f2] text-[#333]", dot: "#8a8a8a" },
  brand: { cls: "bg-[#ffed00] text-black", dot: "#000000" },
  dark: { cls: "bg-black text-white", dot: "#ffed00" },
};

export function Badge({ tone = "neutral", children, dot = true }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  const t = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold leading-none whitespace-nowrap ${t.cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.dot }} />}
      {children}
    </span>
  );
}

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  paid: { label: "Paid", tone: "positive" },
  pending: { label: "Pending", tone: "warning" },
  failed: { label: "Failed", tone: "negative" },
  success: { label: "Successful", tone: "positive" },
};
export const BOOKING_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "info" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "negative" },
};
export const PASS_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Not checked in", tone: "neutral" },
  scanned: { label: "Checked in", tone: "positive" },
  cancelled: { label: "Cancelled", tone: "negative" },
};
export const EVENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  published: { label: "Published", tone: "positive" },
  draft: { label: "Draft", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "negative" },
  completed: { label: "Completed", tone: "info" },
};

export function StatusBadge({ map, value }: { map: Record<string, { label: string; tone: Tone }>; value?: string }) {
  const s = map[value || ""] || { label: value || "—", tone: "neutral" as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

// ── Lists & tables ─────────────────────────────────────────────────────────

/** WordPress-style status filter row: All (12) · Published (5) · Draft (7). */
export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center overflow-x-auto border-b border-[#efefef] px-2">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`relative px-3 py-3 text-xs font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              active ? "text-black" : "text-[#8a8a8a] hover:text-black"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className={`px-1.5 py-0.5 text-[10px] leading-none ${active ? "bg-black text-white" : "bg-[#efefef] text-[#555]"}`}>
                {t.count}
              </span>
            )}
            {active && <span className="absolute left-2 right-2 bottom-0 h-[2px] bg-black" />}
          </button>
        );
      })}
    </div>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b border-[#efefef]">{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1 min-w-[200px] max-w-md">
      <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a8a] pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent pl-6 pr-2 py-2 text-sm font-medium text-black placeholder-[#9a9a9a] outline-none"
      />
    </div>
  );
}

export const thCls = "py-3 px-4 text-[10px] font-bold tracking-[0.14em] uppercase text-[#666] whitespace-nowrap text-left";
export const tdCls = "py-3.5 px-4 align-middle";

export function DataTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-[#fafafa] border-b border-[#efefef]">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-[#f2f2f2] text-[13px] text-[#222]">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, title, sub, action }: { colSpan: number; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 px-4 text-center">
        <EmptyState title={title} sub={sub} action={action} />
      </td>
    </tr>
  );
}

export function EmptyState({
  title,
  sub,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-11 h-11 bg-[#f2f2f2] flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-[#666]" />
      </div>
      <p className="font-bold text-sm text-black">{title}</p>
      {sub && <p className="text-xs text-[#8a8a8a] mt-1 max-w-sm">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableFooter({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <div className="px-4 py-3 border-t border-[#efefef] text-[11px] font-bold text-[#8a8a8a]">
      {shown === total ? `${total} ${noun}` : `Showing ${shown} of ${total} ${noun}`}
    </div>
  );
}

export function IconButton({
  title,
  onClick,
  children,
  danger = false,
  disabled = false,
  href,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  href?: string;
}) {
  const cls = `w-8 h-8 inline-flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
    danger ? "text-[#7a2f2f] hover:bg-[#f7ecec]" : "text-[#333] hover:bg-[#f2f2f2] hover:text-black"
  }`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" title={title} aria-label={title} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function Avatar({ src, name, size = 36, square = false }: { src?: string; name: string; size?: number; square?: boolean }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const shape = square ? "" : "rounded-full";
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`object-cover shrink-0 bg-[#f2f2f2] ${shape}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`shrink-0 flex items-center justify-center bg-black text-[#ffed00] font-bold ${shape}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {initials(name)}
    </div>
  );
}

/** A small on/off switch for quick list toggles. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={`relative w-9 h-5 shrink-0 cursor-pointer transition-colors ${checked ? "bg-black" : "bg-[#d9d9d9]"}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 transition-all ${checked ? "left-[18px] bg-[#ffed00]" : "left-0.5 bg-white"}`}
      />
    </button>
  );
}

// ── Side drawer ────────────────────────────────────────────────────────────

export function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  sub,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45 jz-admin-fade" onClick={onClose} />
      <aside className="relative w-full max-w-xl h-full bg-white flex flex-col border-l border-black jz-admin-slide">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#efefef]">
          <div className="min-w-0">
            {eyebrow && <span className={`${overline} text-[#8a8a8a] block mb-1`}>{eyebrow}</span>}
            <h2 className="font-display font-bold text-xl leading-tight text-black break-words">{title}</h2>
            {sub && <div className="mt-2">{sub}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center border border-[#e4e4e4] hover:border-black cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="border-t border-[#efefef] px-6 py-4 flex flex-wrap gap-2">{footer}</div>}
      </aside>
    </div>
  );
}

/** Label / value pair for detail views. */
export function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className={`${overline} text-[#8a8a8a] block`}>{label}</span>
      <div className="text-sm font-bold text-black mt-1 break-words">{children || "—"}</div>
    </div>
  );
}
