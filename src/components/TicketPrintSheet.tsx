import React from "react";
import { createPortal } from "react-dom";
import brandMark from "../../assets/images/Favicon.png";

export interface TicketPrintData {
  eventTitle: string;
  category?: string;
  date: string;
  time: string;
  venue: string;
  holderName: string;
  holderEmail: string;
  orderId: string;
  seat?: string;
  quantity: number;
  tier: "general" | "vip" | "elite" | string;
  code: string;
}

const tierLabel = (tier: string) =>
  tier === "elite" ? "Elite" : tier === "vip" ? "VIP" : "General admission";

const overline = "text-[9px] font-bold tracking-[0.18em] uppercase text-[#666]";

/**
 * A print-only ticket sheet. It is portalled onto <body> (outside #root) so
 * the print CSS in index.css can hide the whole app and print just this
 * ticket — never the surrounding page.
 */
export default function TicketPrintSheet({
  ticket,
}: {
  ticket: TicketPrintData;
}) {
  return createPortal(
    <div id="print-ticket" className="hidden bg-white text-black">
      <div className="max-w-[720px] mx-auto border-2 border-black">
        {/* Header band */}
        <div className="flex items-center justify-between bg-black text-white px-8 py-5">
          <span className="flex items-center gap-3">
            <img src={brandMark} alt="" className="w-9 h-9 object-contain" />
            <span className="font-display font-bold text-base tracking-[0.25em]">
              JAZBA TICKETS
            </span>
          </span>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase bg-[#ffed00] text-black px-3 py-1.5">
            {tierLabel(ticket.tier)}
          </span>
        </div>

        {/* Event */}
        <div className="px-8 pt-7 pb-6">
          <span className={overline}>
            {ticket.category ? `${ticket.category} · ` : ""}E-Ticket · Order{" "}
            {ticket.orderId}
          </span>
          <h1 className="font-display font-bold text-3xl leading-[0.95] mt-2">
            {ticket.eventTitle}
          </h1>

          <div className="grid grid-cols-3 gap-x-6 gap-y-5 border-t-2 border-black mt-6 pt-5 text-sm">
            <div>
              <span className={`${overline} block`}>Date</span>
              <span className="font-bold block mt-1">{ticket.date}</span>
            </div>
            <div>
              <span className={`${overline} block`}>Time</span>
              <span className="font-bold block mt-1">{ticket.time}</span>
            </div>
            <div>
              <span className={`${overline} block`}>Venue</span>
              <span className="font-bold block mt-1">{ticket.venue}</span>
            </div>
            <div>
              <span className={`${overline} block`}>Ticket holder</span>
              <span className="font-bold block mt-1">{ticket.holderName}</span>
            </div>
            <div>
              <span className={`${overline} block`}>Email</span>
              <span className="font-bold block mt-1 break-all">
                {ticket.holderEmail}
              </span>
            </div>
            <div>
              <span className={`${overline} block`}>Admits</span>
              <span className="font-bold block mt-1">
                {ticket.quantity}× {ticket.seat ? `· Row ${ticket.seat}` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Barcode strip */}
        <div className="border-t-2 border-dashed border-black px-8 py-6 flex items-center justify-between gap-8">
          <div>
            <div className="flex items-end h-14">
              {`${ticket.code}${ticket.orderId}`.split("").map((ch, i) => (
                <span
                  key={i}
                  className="inline-block h-full bg-black mr-[2px]"
                  style={{ width: `${(ch.charCodeAt(0) % 4) + 1}px` }}
                />
              ))}
            </div>
            <span className="font-bold text-xs tracking-[0.3em] mt-2 block">
              {ticket.code}
            </span>
          </div>
          <div className="text-right text-[10px] text-[#666] leading-relaxed max-w-[220px]">
            Show this barcode at the entrance — printed or on your phone. Issued
            and verified by Jazba Tickets · support@jazbatickets.com
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
