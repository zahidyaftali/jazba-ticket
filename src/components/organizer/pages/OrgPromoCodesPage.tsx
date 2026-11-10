import React, { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { EventItem, getAvailableTiers } from "../../../types";
import {
  PROMO_RE, createPromoCode, deletePromoCode, listPromoCodes, updatePromoCode, type PromoCodeDoc,
} from "../../../services/organizerToolsService";
import {
  Badge, DataTable, Drawer, EmptyRow, Field, PageHeader, Switch, btnOutline, btnPrimary, fmtDate, inputCls, tdCls, thCls,
} from "../../admin/ui";
import { useOrg } from "../OrganizerContext";
import { Hint } from "../orgUi";

const toLocalInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : "");

function codeState(c: PromoCodeDoc): { label: string; tone: "positive" | "neutral" | "warning" | "negative" } {
  const now = Date.now();
  if (!c.active) return { label: "Paused", tone: "neutral" };
  if (c.endsAt && Date.parse(c.endsAt) <= now) return { label: "Expired", tone: "negative" };
  if (c.startsAt && Date.parse(c.startsAt) > now) return { label: "Scheduled", tone: "warning" };
  if (c.maxUses > 0 && c.uses >= c.maxUses) return { label: "Used up", tone: "negative" };
  return { label: "Active", tone: "positive" };
}

interface Draft {
  code: string;
  percentOff: string;
  eventIds: string[];
  tiers: string[];
  maxUses: string;
  startsAt: string;
  endsAt: string;
  label: string;
}

const BLANK: Draft = { code: "", percentOff: "10", eventIds: [], tiers: [], maxUses: "", startsAt: "", endsAt: "", label: "" };

/** Discount codes for the organiser's own events — checked by the payment
 *  server, so they only ever work on this organiser's events. */
export default function OrgPromoCodesPage() {
  const { orgUid, events, notify, fail } = useOrg();
  const [codes, setCodes] = useState<PromoCodeDoc[] | null>(null);
  const [editing, setEditing] = useState<{ draft: Draft; existing?: PromoCodeDoc } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    listPromoCodes(orgUid)
      .then(setCodes)
      .catch(() => {
        setCodes([]);
        fail("Couldn’t load your discount codes.");
      });
  useEffect(() => {
    void load();
  }, [orgUid]);

  // Ticket types across the chosen events (or all events), by id.
  const tierChoices = useMemo(() => {
    const pick = editing?.draft.eventIds.length ? events.filter((e) => editing.draft.eventIds.includes(e.id)) : events;
    const m = new Map<string, string>();
    for (const e of pick) for (const t of getAvailableTiers(e as EventItem)) if (!m.has(t.tier)) m.set(t.tier, t.name);
    return [...m.entries()];
  }, [events, editing?.draft.eventIds]);

  const titleOf = (id: string) => events.find((e) => e.id === id)?.title || "Removed event";

  const open = (c?: PromoCodeDoc) => {
    setError("");
    setEditing(
      c
        ? {
            existing: c,
            draft: {
              code: c.code,
              percentOff: String(c.percentOff),
              eventIds: c.eventIds || [],
              tiers: c.tiers || [],
              maxUses: c.maxUses ? String(c.maxUses) : "",
              startsAt: toLocalInput(c.startsAt),
              endsAt: toLocalInput(c.endsAt),
              label: c.label || "",
            },
          }
        : { draft: { ...BLANK } },
    );
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e));
  const toggleIn = (k: "eventIds" | "tiers", id: string) =>
    setEditing((e) => {
      if (!e) return e;
      const list = e.draft[k];
      return { ...e, draft: { ...e.draft, [k]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } };
    });

  const save = async () => {
    if (!editing) return;
    const d = editing.draft;
    const code = d.code.trim().toUpperCase();
    const pct = Math.floor(Number(d.percentOff));
    const max = d.maxUses.trim() ? Math.floor(Number(d.maxUses)) : 0;
    setError("");
    if (!PROMO_RE.test(code)) return setError("Codes are 3–24 letters and numbers, no spaces.");
    if (!(pct >= 1 && pct <= 100)) return setError("The discount must be between 1% and 100%.");
    if (!(max >= 0 && max <= 100000)) return setError("The use limit must be a number (leave empty for no limit).");
    if (d.startsAt && d.endsAt && fromLocalInput(d.endsAt) <= fromLocalInput(d.startsAt)) return setError("The end must be after the start.");
    const payload = {
      percentOff: pct,
      eventIds: d.eventIds,
      tiers: d.tiers,
      maxUses: max,
      startsAt: fromLocalInput(d.startsAt),
      endsAt: fromLocalInput(d.endsAt),
      label: d.label.trim().slice(0, 80),
    };
    setSaving(true);
    try {
      if (editing.existing) {
        await updatePromoCode(editing.existing.code, payload);
        notify(`${code} updated.`);
      } else {
        await createPromoCode({ ...payload, code, organizerId: orgUid, active: true });
        notify(`${code} is live — share it with your fans.`);
      }
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err?.message === "taken" ? `${code} is already taken — choose another code.` : "Couldn’t save the code. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: PromoCodeDoc) => {
    try {
      await updatePromoCode(c.code, { active: !c.active });
      await load();
    } catch {
      fail("Couldn’t change the code.");
    }
  };

  const remove = async (c: PromoCodeDoc) => {
    if (!window.confirm(`Delete ${c.code}? Anyone who has it won’t be able to use it.`)) return;
    try {
      await deletePromoCode(c.code);
      notify(`${c.code} deleted.`);
      await load();
    } catch {
      fail("Couldn’t delete the code.");
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notify(`${code} copied.`);
    } catch {
      /* select it manually */
    }
  };

  return (
    <div>
      <PageHeader
        title="Discount codes"
        sub="Give fans, sponsors or groups a percentage off. Buyers type the code on your event page or at checkout."
        actions={
          <button type="button" className={btnPrimary} onClick={() => open()}>
            <Plus className="w-4 h-4" /> New code
          </button>
        }
      />

      <div className="bg-white border border-[#e4e4e4]">
        <DataTable
          head={
            <>
              <th className={thCls}>Code</th>
              <th className={thCls}>Discount</th>
              <th className={thCls}>Works on</th>
              <th className={thCls}>Used</th>
              <th className={thCls}>Ends</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>On</th>
              <th className={thCls}></th>
            </>
          }
        >
          {codes === null && (
            <tr>
              <td colSpan={8} className="py-10 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#8a8a8a]" />
              </td>
            </tr>
          )}
          {(codes || []).map((c) => {
            const st = codeState(c);
            return (
              <tr key={c.code} className="hover:bg-[#fafafa]">
                <td className={tdCls}>
                  <button type="button" className="font-mono font-bold text-sm flex items-center gap-1.5 cursor-pointer" onClick={() => copy(c.code)} title="Copy code">
                    {c.code} <Copy className="w-3 h-3 text-[#8a8a8a]" />
                  </button>
                  {c.label && <p className="text-[11px] text-[#8a8a8a]">{c.label}</p>}
                </td>
                <td className={`${tdCls} font-bold`}>{c.percentOff}% off</td>
                <td className={`${tdCls} text-xs max-w-[240px]`}>
                  {c.eventIds?.length ? c.eventIds.map(titleOf).join(", ") : "All your events"}
                  {c.tiers?.length ? <span className="block text-[#8a8a8a]">Only: {c.tiers.join(", ")}</span> : null}
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>
                  {c.uses}
                  {c.maxUses ? <span className="text-[#8a8a8a]"> / {c.maxUses}</span> : ""}
                </td>
                <td className={`${tdCls} whitespace-nowrap text-xs`}>{c.endsAt ? fmtDate(c.endsAt) : "No end"}</td>
                <td className={tdCls}>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td className={tdCls}>
                  <Switch checked={c.active} onChange={() => toggleActive(c)} label={c.active ? "Pause code" : "Turn code on"} />
                </td>
                <td className={`${tdCls} whitespace-nowrap text-right`}>
                  <button type="button" className={btnOutline} onClick={() => open(c)}>
                    Edit
                  </button>
                  <button type="button" className="ml-1 p-2 text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer" onClick={() => remove(c)} title="Delete code">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
          {codes && codes.length === 0 && (
            <EmptyRow
              colSpan={8}
              title="No discount codes yet"
              sub="Create one for early birds, groups, sponsors or your mailing list."
              action={
                <button type="button" className={btnPrimary} onClick={() => open()}>
                  <Tag className="w-4 h-4" /> Create a code
                </button>
              }
            />
          )}
        </DataTable>
      </div>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        eyebrow={editing?.existing ? "Edit code" : "New code"}
        title={editing?.existing ? editing.existing.code : "Create a discount code"}
        footer={
          <>
            <button type="button" className={btnPrimary} disabled={saving} onClick={save}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {editing?.existing ? "Save changes" : "Create code"}
            </button>
            <button type="button" className={btnOutline} onClick={() => setEditing(null)}>
              Cancel
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5 text-sm">
            {error && <p className="text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Code *">
                <input
                  className={`${inputCls} font-mono uppercase`}
                  value={editing.draft.code}
                  disabled={!!editing.existing}
                  maxLength={24}
                  onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="EARLYBIRD"
                />
              </Field>
              <Field label="Percent off *">
                <input type="number" min={1} max={100} className={inputCls} value={editing.draft.percentOff} onChange={(e) => set("percentOff", e.target.value)} />
              </Field>
            </div>
            <Field label="Label (just for you)">
              <input className={inputCls} value={editing.draft.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Instagram followers" />
            </Field>

            <div>
              <span className="text-[11px] font-bold text-[#666] block mb-2">Which events</span>
              <label className="flex items-center gap-2 py-1.5 font-bold cursor-pointer">
                <input type="checkbox" checked={!editing.draft.eventIds.length} onChange={() => set("eventIds", [])} className="w-4 h-4" />
                All my events (including future ones)
              </label>
              <div className="max-h-44 overflow-y-auto border border-[#e4e4e4] divide-y divide-[#f2f2f2] mt-1">
                {events.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#fafafa]">
                    <input type="checkbox" checked={editing.draft.eventIds.includes(e.id)} onChange={() => toggleIn("eventIds", e.id)} className="w-4 h-4" />
                    <span className="truncate">{e.title}</span>
                  </label>
                ))}
              </div>
            </div>

            {tierChoices.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-[#666] block mb-2">Which ticket types</span>
                <label className="flex items-center gap-2 py-1.5 font-bold cursor-pointer">
                  <input type="checkbox" checked={!editing.draft.tiers.length} onChange={() => set("tiers", [])} className="w-4 h-4" />
                  All ticket types
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tierChoices.map(([id, name]) => (
                    <label key={id} className={`flex items-center gap-2 px-3 py-2 border cursor-pointer ${editing.draft.tiers.includes(id) ? "border-black bg-[#fffbd6]" : "border-[#e4e4e4]"}`}>
                      <input type="checkbox" checked={editing.draft.tiers.includes(id)} onChange={() => toggleIn("tiers", id)} className="w-4 h-4" />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Use limit">
                <input type="number" min={0} className={inputCls} value={editing.draft.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="No limit" />
              </Field>
              <Field label="Starts">
                <input type="datetime-local" className={inputCls} value={editing.draft.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </Field>
              <Field label="Ends">
                <input type="datetime-local" className={inputCls} value={editing.draft.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </Field>
            </div>
            <Hint>One use = one order. Codes can’t be combined with each other or with a sale — the bigger discount applies. Times are in your timezone.</Hint>
          </div>
        )}
      </Drawer>
    </div>
  );
}
