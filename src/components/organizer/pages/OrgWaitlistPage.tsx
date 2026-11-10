import React, { useMemo, useState } from "react";
import { BellRing, Download, Loader2, Send, Trash2 } from "lucide-react";
import { notifyWaitlist, removeWaitlistEntry } from "../../../services/organizerToolsService";
import { Badge, EmptyState, PageHeader, Panel, btnDark, btnOutline, downloadCsv, fmtDateTime, inputCls } from "../../admin/ui";
import { useOrg } from "../OrganizerContext";

/** Who's waiting for tickets, per event — and one button to tell them
 *  tickets are available again. */
export default function OrgWaitlistPage() {
  const { report, reportLoading, events, toolOrgId, notify, fail, reload } = useOrg();
  const [message, setMessage] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  const groups = useMemo(() => {
    const m = new Map<string, NonNullable<typeof report>["waitlist"]>();
    for (const w of report?.waitlist || []) m.set(w.eventId, [...(m.get(w.eventId) || []), w]);
    return [...m.entries()].map(([eventId, list]) => ({
      eventId,
      title: events.find((e) => e.id === eventId)?.title || list![0].eventTitle || "Event",
      list: list!,
      waiting: list!.filter((w) => w.status !== "notified").length,
    }));
  }, [report, events]);

  const send = async (eventId: string, waiting: number) => {
    if (!window.confirm(`Email ${waiting} ${waiting === 1 ? "person" : "people"} that tickets are available?`)) return;
    setBusy(eventId);
    try {
      const r = await notifyWaitlist(eventId, message[eventId] || "", toolOrgId);
      notify(r.notified ? `Emailed ${r.notified} ${r.notified === 1 ? "person" : "people"}.` : "Everyone has already been told.");
      await reload();
    } catch (err: any) {
      fail(err?.message || "Couldn’t send the emails.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (id: string) => {
    try {
      await removeWaitlistEntry(id, toolOrgId);
      await reload();
    } catch (err: any) {
      fail(err?.message || "Couldn’t remove that entry.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waitlist"
        sub="When a ticket type or a whole event sells out, buyers can join a waitlist. Add more tickets (or open a new ticket type), then tell them in one click."
      />

      {reportLoading && !report ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#8a8a8a]" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-[#e4e4e4] py-14 px-4">
          <EmptyState icon={BellRing} title="No one is waiting" sub="The waitlist opens on your event page by itself when tickets sell out." />
        </div>
      ) : (
        groups.map((g) => (
          <React.Fragment key={g.eventId}>
          <Panel
            title={g.title}
            sub={`${g.waiting} waiting · ${g.list.length - g.waiting} already told`}
            action={
              <button
                type="button"
                className={btnOutline}
                onClick={() =>
                  downloadCsv(`waitlist-${g.eventId}.csv`, [
                    ["Name", "Email", "Ticket type", "Joined", "Status"],
                    ...g.list.map((w) => [w.name, w.email, w.tier, w.createdAt, w.status]),
                  ])
                }
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            }
            bodyClassName=""
          >
            {g.waiting > 0 && (
              <div className="px-5 py-4 border-b border-[#f2f2f2] flex flex-col sm:flex-row gap-3 sm:items-end">
                <label className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-[#666] block mb-1">Add a short message (optional)</span>
                  <input
                    className={inputCls}
                    value={message[g.eventId] || ""}
                    onChange={(e) => setMessage((m) => ({ ...m, [g.eventId]: e.target.value }))}
                    placeholder="e.g. We’ve released 50 more Standard tickets."
                    maxLength={800}
                  />
                </label>
                <button type="button" className={btnDark} disabled={busy === g.eventId} onClick={() => send(g.eventId, g.waiting)}>
                  {busy === g.eventId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Email {g.waiting} waiting
                </button>
              </div>
            )}
            <ul className="divide-y divide-[#f2f2f2]">
              {g.list.map((w) => (
                <li key={w.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="font-bold block truncate">{w.name}</span>
                    <span className="text-[11px] text-[#8a8a8a] block truncate">
                      {w.email}
                      {w.tier ? ` · ${w.tier}` : ""} · joined {fmtDateTime(w.createdAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {w.status === "notified" ? <Badge tone="positive">Told {fmtDateTime(w.notifiedAt)}</Badge> : <Badge tone="warning">Waiting</Badge>}
                    <button type="button" className="p-2 text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer" onClick={() => remove(w.id)} title="Remove from waitlist">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          </React.Fragment>
        ))
      )}
    </div>
  );
}
