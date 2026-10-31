import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import mainLogo from "../../assets/images/Main Logo.png";
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
  /** The package name, when the event defines its own (e.g. "Meet & Greet"). */
  tierName?: string;
  code: string;
  /** Event photo shown faintly behind the event title. */
  image?: string;
}

const tierLabel = (tier: string) =>
  tier === "elite" ? "Elite" : tier === "vip" ? "VIP" : "General admission";

const overline = "text-[9px] font-bold tracking-[0.2em] uppercase";

/** A real, scannable QR code of the order number, drawn as crisp SVG
 *  squares. Built synchronously so it's ready before the print dialog opens. */
export function QrCode({ value, size = 128 }: { value: string; size?: number }) {
  const path = useMemo(() => {
    try {
      const qr = QRCode.create(value || "JAZBA", { errorCorrectionLevel: "M" });
      const n = qr.modules.size;
      let d = "";
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (qr.modules.get(r, c)) d += `M${c},${r}h1v1h-1z`;
        }
      }
      return { d, n };
    } catch {
      return null;
    }
  }, [value]);
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-3 -3 ${path.n + 6} ${path.n + 6}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code ${value}`}
      style={{ display: "block", background: "#ffffff" }}
    >
      <path d={path.d} fill="#000000" />
    </svg>
  );
}

/** Print once the ticket's images (logo, event photo) have loaded, so the
 *  printout never comes out with blank spaces. Gives up waiting after 3s. */
export function printWhenReady() {
  requestAnimationFrame(() => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("#print-ticket img"));
    const pending = imgs.filter((img) => !img.complete);
    if (pending.length === 0) {
      window.print();
      return;
    }
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.print();
    };
    let left = pending.length;
    pending.forEach((img) => {
      const settle = () => {
        left -= 1;
        if (left <= 0) go();
      };
      img.addEventListener("load", settle, { once: true });
      img.addEventListener("error", settle, { once: true });
    });
    setTimeout(go, 3000);
  });
}

/**
 * A print-only ticket sheet. It is portalled onto <body> (outside #root) so
 * the print CSS in index.css can hide the whole app and print just this
 * ticket — never the surrounding page.
 */
export default function TicketPrintSheet({ ticket }: { ticket: TicketPrintData }) {
  const tier = ticket.tierName || tierLabel(ticket.tier);
  const admits = ticket.quantity === 1 ? "Admit one" : `Admits ${ticket.quantity}`;

  return createPortal(
    <div id="print-ticket" className="hidden bg-white text-black">
      <div className="max-w-[720px] mx-auto">
        {/* ── The ticket ─────────────────────────────────────────── */}
        <div className="relative flex border-2 border-black bg-white" style={{ breakInside: "avoid" }}>
          {/* Main part */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Dark event panel with the logo */}
            <div className="relative bg-black text-white overflow-hidden">
              {ticket.image && (
                <img
                  src={ticket.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.32 }}
                  referrerPolicy="no-referrer"
                />
              )}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, #000 0%, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0.55) 100%)" }}
              />
              <div className="relative px-7 pt-6 pb-7">
                <div className="flex items-start justify-between gap-4">
                  <img src={mainLogo} alt="Jazba Tickets" className="h-[68px] w-auto object-contain -ml-3 -mt-1" />
                  <div className="text-right shrink-0 pt-1">
                    <span className={`${overline} text-white/60 block`}>E-ticket</span>
                    <span className="inline-block mt-1.5 bg-[#ffed00] text-black text-[10px] font-bold tracking-[0.16em] uppercase px-2.5 py-1">
                      {tier}
                    </span>
                  </div>
                </div>

                <span className={`${overline} text-[#ffed00] block mt-6`}>
                  {ticket.category ? `${ticket.category} · ` : ""}Live event
                </span>
                <h1 className="font-display font-bold text-[30px] leading-[1.02] mt-2 text-white" style={{ letterSpacing: "-0.01em" }}>
                  {ticket.eventTitle}
                </h1>
              </div>
            </div>

            {/* Details band */}
            <div className="grid grid-cols-3 gap-x-5 gap-y-4 px-7 py-5 text-[13px]">
              <div>
                <span className={`${overline} text-[#777] block`}>Date</span>
                <span className="font-bold block mt-1 leading-snug">{ticket.date || "TBA"}</span>
              </div>
              <div>
                <span className={`${overline} text-[#777] block`}>Time</span>
                <span className="font-bold block mt-1 leading-snug">{ticket.time || "TBA"}</span>
              </div>
              <div>
                <span className={`${overline} text-[#777] block`}>Venue</span>
                <span className="font-bold block mt-1 leading-snug">{ticket.venue || "TBA"}</span>
              </div>
              <div>
                <span className={`${overline} text-[#777] block`}>Ticket holder</span>
                <span className="font-bold block mt-1 leading-snug">{ticket.holderName}</span>
                {ticket.holderEmail && <span className="block text-[11px] text-[#555] break-all">{ticket.holderEmail}</span>}
              </div>
              <div>
                <span className={`${overline} text-[#777] block`}>Admits</span>
                <span className="font-bold block mt-1 leading-snug">
                  {ticket.quantity} × {tier}
                </span>
              </div>
              <div>
                <span className={`${overline} text-[#777] block`}>{ticket.seat ? "Seat / row" : "Order"}</span>
                <span className="font-bold block mt-1 leading-snug">{ticket.seat || ticket.orderId}</span>
              </div>
            </div>
          </div>

          {/* Perforation with notches */}
          <div className="relative w-0 shrink-0" style={{ borderLeft: "2px dashed #000" }}>
            <span
              className="absolute bg-white"
              style={{ width: 22, height: 11, left: -12, top: -2, border: "2px solid #000", borderTop: "none", borderRadius: "0 0 11px 11px" }}
            />
            <span
              className="absolute bg-white"
              style={{ width: 22, height: 11, left: -12, bottom: -2, border: "2px solid #000", borderBottom: "none", borderRadius: "11px 11px 0 0" }}
            />
          </div>

          {/* Tear-off stub */}
          <div className="w-[196px] shrink-0 flex flex-col items-center text-center px-4 pt-6 pb-5">
            <img src={brandMark} alt="" className="w-9 h-9 object-contain" />
            <span className="font-display font-bold text-[15px] uppercase tracking-[0.12em] mt-2">{admits}</span>
            <div className="mt-3 p-1.5 border-2 border-black">
              <QrCode value={ticket.orderId || ticket.code} size={118} />
            </div>
            <span className="font-bold text-[12px] tracking-[0.22em] mt-3">{ticket.code}</span>
            <span className="text-[10px] text-[#666] mt-1 leading-snug">
              {ticket.date}
              {ticket.time ? ` · ${ticket.time}` : ""}
            </span>
            <span className="mt-auto pt-3 w-full border-t border-[#e4e4e4] text-[10px] font-bold tracking-[0.16em] uppercase">
              {tier}
              {ticket.seat && <span className="block text-[#666] tracking-normal normal-case font-medium mt-0.5">{ticket.seat}</span>}
            </span>
          </div>
        </div>

        {/* ── Good to know ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-5 mt-6 text-[11px] leading-relaxed text-[#444]">
          <div className="border-t-2 border-black pt-2.5">
            <span className="font-bold text-black block">At the entrance</span>
            Show this ticket — printed or on your phone. Staff scan the QR code once per visit.
          </div>
          <div className="border-t-2 border-black pt-2.5">
            <span className="font-bold text-black block">Keep it private</span>
            Don't post photos of your ticket — anyone with a copy of this code could use it.
          </div>
          <div className="border-t-2 border-black pt-2.5">
            <span className="font-bold text-black block">Need help?</span>
            support@jazbatickets.com · jazbatickets.com — quote order {ticket.orderId}.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
