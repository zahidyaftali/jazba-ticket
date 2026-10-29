// Default imports on purpose: both packages are CommonJS, and Node's ESM
// loader (Vercel runs these files as native ESM) only guarantees the
// default export for CommonJS modules.
import QRCode from 'qrcode';
import pdfLib from 'pdf-lib';
import { sendEmail, escapeHtml, type MailConfig } from './sendEmail.js';
import { HttpError, verifyAdmin } from './adminAuth.js';
import { LOGO_PNG_BASE64, LOGO_SIZE, MARK_PNG_BASE64 } from './ticketAssets.js';

const {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
  setCharacterSpacing,
} = pdfLib;
type PDFPage = import('pdf-lib').PDFPage;
type PDFFont = import('pdf-lib').PDFFont;
type Color = import('pdf-lib').Color;

// Emails an e-ticket (with the ticket attached as a PDF) to a ticket holder,
// or returns that PDF for download. Used by the admin portal ("Issue ticket",
// "Email ticket", "Download PDF"), so only a signed-in admin may call it —
// otherwise anyone could use the Jazba mailbox to send mail. Shared by the
// Vercel function (api/send-ticket-email.ts) and the Vite dev middleware.

/** Errors carry the HTTP status the route answers with. */
export { HttpError as TicketEmailError };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export interface TicketEmailBody {
  idToken?: unknown;
  to?: unknown;
  holderName?: unknown;
  eventTitle?: unknown;
  category?: unknown;
  date?: unknown;
  time?: unknown;
  venue?: unknown;
  tierName?: unknown;
  quantity?: unknown;
  orderId?: unknown;
  seat?: unknown;
  code?: unknown;
  amount?: unknown;
  message?: unknown;
  /** Event photo URL (https) — shown on the PDF ticket. */
  image?: unknown;
  /** true → return the PDF instead of sending an email. */
  download?: unknown;
}

export interface TicketFields {
  to: string;
  holderName: string;
  eventTitle: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  tierName: string;
  quantity: number;
  orderId: string;
  seat: string;
  code: string;
  amount: string;
  message: string;
  image: string;
}

/** Validate and normalise the ticket fields sent by the admin portal. */
export function parseTicket(body: TicketEmailBody, requireTo: boolean): TicketFields {
  const to = str(body.to, 200);
  if (requireTo && (!to || !EMAIL_RE.test(to))) throw new HttpError("The client's email address doesn't look right.");
  const eventTitle = str(body.eventTitle, 200);
  if (!eventTitle) throw new HttpError('The ticket is missing its event.');
  const orderId = str(body.orderId, 40);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(orderId)) throw new HttpError('The ticket is missing its order number.');
  const image = str(body.image, 1000);
  return {
    to,
    holderName: str(body.holderName, 120) || 'Guest',
    eventTitle,
    category: str(body.category, 40),
    date: str(body.date, 80),
    time: str(body.time, 80),
    venue: str(body.venue, 200),
    tierName: str(body.tierName, 80) || 'General admission',
    quantity: Math.min(500, Math.max(1, Math.floor(Number(body.quantity) || 1))),
    orderId,
    seat: str(body.seat, 40),
    code: str(body.code, 60) || orderId,
    amount: str(body.amount, 40),
    message: str(body.message, 1500),
    image: /^https:\/\//i.test(image) ? image : '',
  };
}

const ticketFilename = (t: TicketFields) => `Jazba-Ticket-${t.orderId}.pdf`;
const admitsLabel = (q: number) => (q === 1 ? 'ADMIT ONE' : `ADMITS ${q}`);

// ── QR code ───────────────────────────────────────────────────────────────

/** SVG path data (one unit per module) for a QR code of the order number. */
function qrPath(value: string): { d: string; n: number } {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) d += `M${c},${r}h1v1h-1z`;
    }
  }
  return { d, n };
}

// ── PDF ticket ────────────────────────────────────────────────────────────

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const YELLOW = rgb(1, 0.929, 0); // #ffed00
const GREY = rgb(0.45, 0.45, 0.45);
const PAGE_BG = rgb(0.949, 0.949, 0.949);

/** The event photo, when it can be fetched quickly as a JPEG or PNG. */
async function fetchEventImage(url: string): Promise<{ bytes: Uint8Array; kind: 'jpg' | 'png' } | null> {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    if (host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':')) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { Accept: 'image/jpeg,image/png' } });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > 1_500_000) return null; // keep the PDF light enough for email
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return { bytes, kind: 'jpg' };
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { bytes, kind: 'png' };
    return null;
  } catch {
    return null;
  }
}

/** A phone-shaped e-ticket (like a boarding pass) — black event panel with
 *  the Jazba Tickets logo, the details, a perforation and a scannable QR. */
export async function buildTicketPdf(t: TicketFields): Promise<Uint8Array> {
  const W = 380;
  const H = 720;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Ticket ${t.orderId} — ${t.eventTitle}`);
  pdf.setAuthor('Jazba Tickets');
  pdf.setSubject('E-ticket');
  pdf.setCreator('jazbatickets.com');

  const page = pdf.addPage([W, H]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));
  const mark = await pdf.embedPng(Buffer.from(MARK_PNG_BASE64, 'base64'));
  const photo = await fetchEventImage(t.image);
  const photoImg = photo ? await (photo.kind === 'jpg' ? pdf.embedJpg(photo.bytes) : pdf.embedPng(photo.bytes)).catch(() => null) : null;

  // The standard PDF fonts only cover Western characters. Characters they
  // can't draw (e.g. Urdu script) are left out rather than printed as "?".
  const charset = new Set(regular.getCharacterSet());
  const safe = (s: string) =>
    Array.from(s.replace(/\s+/g, ' '))
      .filter((ch) => charset.has(ch.codePointAt(0)!))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  // Fields that must never come out blank get a readable fallback.
  const orElse = (s: string, fallback: string) => (safe(s) ? s : fallback);
  t = {
    ...t,
    holderName: orElse(t.holderName, safe(t.to.split('@')[0]) || 'Ticket holder'),
    eventTitle: orElse(t.eventTitle, 'Live event'),
    tierName: orElse(t.tierName, 'Ticket'),
  };

  // Top-down coordinates: y is measured from the top of the page.
  const Y = (top: number) => H - top;

  const text = (s: string, x: number, top: number, size: number, font: PDFFont, color: Color, spacing = 0) => {
    const value = safe(s);
    if (spacing) page.pushOperators(pushGraphicsState(), setCharacterSpacing(spacing));
    page.drawText(value, { x, y: Y(top), size, font, color });
    if (spacing) page.pushOperators(setCharacterSpacing(0), popGraphicsState());
  };
  const widthOf = (s: string, size: number, font: PDFFont, spacing = 0) =>
    font.widthOfTextAtSize(safe(s), size) + spacing * Math.max(0, safe(s).length - 1);
  const centered = (s: string, top: number, size: number, font: PDFFont, color: Color, spacing = 0) =>
    text(s, (W - widthOf(s, size, font, spacing)) / 2, top, size, font, color, spacing);

  const wrap = (s: string, size: number, font: PDFFont, maxWidth: number, maxLines: number): string[] => {
    const words = safe(s).split(' ').filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = word;
      while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      let last = kept[maxLines - 1];
      while (last.length > 1 && font.widthOfTextAtSize(`${last}…`, size) > maxWidth) last = last.slice(0, -1);
      kept[maxLines - 1] = `${last.trimEnd()}…`;
      return kept;
    }
    return lines.length ? lines : [''];
  };

  // Page + ticket card
  const CX = 16;
  const CW = W - 32;
  const CT = 16;
  const CB = H - 16;
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAGE_BG });
  page.drawRectangle({ x: CX, y: Y(CB), width: CW, height: CB - CT, color: WHITE, borderColor: BLACK, borderWidth: 1.5 });

  // ── Black event panel ──
  const PANEL_H = 232;
  page.drawRectangle({ x: CX, y: Y(CT + PANEL_H), width: CW, height: PANEL_H, color: BLACK });
  if (photoImg) {
    const scale = Math.max(CW / photoImg.width, PANEL_H / photoImg.height);
    const iw = photoImg.width * scale;
    const ih = photoImg.height * scale;
    page.pushOperators(pushGraphicsState(), rectangle(CX, Y(CT + PANEL_H), CW, PANEL_H), clip(), endPath());
    page.drawImage(photoImg, { x: CX + (CW - iw) / 2, y: Y(CT + PANEL_H) + (PANEL_H - ih) / 2, width: iw, height: ih, opacity: 0.3 });
    page.pushOperators(popGraphicsState());
  }

  const logoH = 44;
  const logoW = (LOGO_SIZE.width / LOGO_SIZE.height) * logoH;
  page.drawImage(logo, { x: CX + 16, y: Y(CT + 18 + logoH), width: logoW, height: logoH });

  // Package chip (top right)
  const chip = safe(t.tierName.toUpperCase());
  const chipSize = 7.5;
  const chipW = widthOf(chip, chipSize, bold, 1.2) + 14;
  const chipX = CX + CW - 16 - chipW;
  text('E-TICKET', chipX + chipW - widthOf('E-TICKET', 6.5, bold, 1.5), CT + 26, 6.5, bold, rgb(0.7, 0.7, 0.7), 1.5);
  page.drawRectangle({ x: chipX, y: Y(CT + 50), width: chipW, height: 16, color: YELLOW });
  text(chip, chipX + 7, CT + 45, chipSize, bold, BLACK, 1.2);

  // Title, anchored to the bottom of the panel
  const titleSize = 21;
  const titleLead = 24;
  const titleLines = wrap(t.eventTitle, titleSize, bold, CW - 32, 3);
  const lastBaseline = CT + PANEL_H - 22;
  const firstBaseline = lastBaseline - (titleLines.length - 1) * titleLead;
  text(`${t.category ? `${t.category.toUpperCase()} · ` : ''}LIVE EVENT`, CX + 16, firstBaseline - titleSize - 4, 7, bold, YELLOW, 1.6);
  titleLines.forEach((line, i) => text(line, CX + 16, firstBaseline + i * titleLead, titleSize, bold, WHITE));

  // ── Details ──
  const colW = (CW - 32 - 16) / 2;
  const colX = [CX + 16, CX + 16 + colW + 16];
  let top = CT + PANEL_H + 24;
  const cell = (label: string, value: string, x: number, width: number, cellTop: number, maxLines = 2, sub = '') => {
    text(label.toUpperCase(), x, cellTop, 6.5, bold, GREY, 1.3);
    const lines = wrap(value || '—', 10.5, bold, width, maxLines);
    lines.forEach((l, i) => text(l, x, cellTop + 15 + i * 13, 10.5, bold, BLACK));
    let end = cellTop + 15 + (lines.length - 1) * 13;
    if (sub) {
      const subLines = wrap(sub, 8, regular, width, 1);
      text(subLines[0], x, end + 12, 8, regular, GREY);
      end += 12;
    }
    return end;
  };
  const row = (cells: [string, string, string?][]) => {
    const ends = cells.map(([label, value, sub], i) =>
      cells.length === 1 ? cell(label, value, colX[0], CW - 32, top, 2, sub) : cell(label, value, colX[i], colW, top, 2, sub),
    );
    top = Math.max(...ends) + 22;
  };
  row([
    ['Date', t.date || 'TBA'],
    ['Time', t.time || 'TBA'],
  ]);
  row([['Venue', t.venue || 'TBA']]);
  row([
    ['Ticket holder', t.holderName, t.to],
    ['Admits', `${t.quantity} × ${t.tierName}`],
  ]);
  row([
    [t.seat ? 'Seat / row' : 'Order', t.seat || t.orderId],
    [t.amount ? 'Paid' : 'Issued by', t.amount || 'Jazba Tickets'],
  ]);

  // ── Perforation with notches ──
  const perfY = top - 4;
  page.drawLine({ start: { x: CX + 14, y: Y(perfY) }, end: { x: CX + CW - 14, y: Y(perfY) }, thickness: 1.2, color: BLACK, dashArray: [4, 3] });
  for (const side of [CX, CX + CW]) {
    page.drawCircle({ x: side, y: Y(perfY), size: 10, color: PAGE_BG, borderColor: BLACK, borderWidth: 1.5 });
    const coverX = side === CX ? side - 12 : side;
    page.drawRectangle({ x: coverX, y: Y(perfY) - 10.8, width: 12, height: 21.6, color: PAGE_BG });
  }

  // ── Stub: mark, admits, QR, code ──
  let st = perfY + 22;
  page.drawImage(mark, { x: W / 2 - 11, y: Y(st + 21), width: 22, height: 21 });
  st += 38;
  centered(admitsLabel(t.quantity), st, 12, bold, BLACK, 2);
  st += 12;

  const space = CB - 52 - st; // room left for the QR above the footer
  const qrSize = Math.max(110, Math.min(176, space - 34));
  const qr = qrPath(t.orderId);
  const unit = qrSize / (qr.n + 6); // 3-module quiet zone each side
  const qrX = (W - qrSize) / 2;
  page.drawRectangle({ x: qrX - 4, y: Y(st + qrSize + 4), width: qrSize + 8, height: qrSize + 8, color: WHITE, borderColor: BLACK, borderWidth: 1.5 });
  page.drawSvgPath(qr.d, { x: qrX + 3 * unit, y: Y(st + 3 * unit), scale: unit, color: BLACK, borderWidth: 0 });
  st += qrSize + 22;
  centered(t.code, st, 11, bold, BLACK, 3);
  st += 13;
  centered([t.date, t.time].filter(Boolean).join(' · '), st, 8, regular, GREY);

  // ── Footer ──
  centered('Show this ticket at the entrance — on your phone or printed.', CB - 26, 7.5, regular, GREY);
  centered('jazbatickets.com  ·  support@jazbatickets.com', CB - 14, 7.5, bold, BLACK);

  return pdf.save();
}

// ── Email ─────────────────────────────────────────────────────────────────

function detail(label: string, value: string): string {
  return `
    <td valign="top" width="50%" style="padding:14px 12px 0 0;font-family:Arial,Helvetica,sans-serif">
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#666666">${escapeHtml(label)}</div>
      <div style="font-size:14px;font-weight:700;color:#000000;margin-top:4px;line-height:1.35">${escapeHtml(value || '—')}</div>
    </td>`;
}

/** Render the e-ticket email (no sending). Images are referenced by cid:
 *  — the logo and QR code travel inside the email itself. */
export function buildTicketEmail(t: TicketFields): { to: string; subject: string; html: string } {
  const firstName = t.holderName.split(/\s+/)[0];
  const overline = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#666666';
  const logoW = 140;
  const logoH = Math.round((LOGO_SIZE.height / LOGO_SIZE.width) * logoW);

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your ticket</title></head>
<body style="margin:0;padding:0;background:#f2f2f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f2">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:2px solid #000000;font-family:Arial,Helvetica,sans-serif;color:#000000">
    <tr><td style="background:#000000;padding:16px 24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle">
          <img src="cid:jazba-logo" width="${logoW}" height="${logoH}" alt="JAZBA TICKETS" style="display:block;border:0;outline:none;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:4px">
        </td>
        <td align="right" valign="middle">
          <span style="display:inline-block;background:#ffed00;color:#000000;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:6px 10px">${escapeHtml(t.tierName)}</span>
        </td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:28px 24px 0">
      <p style="margin:0 0 10px;font-size:15px;color:#000000">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#333333">Your ticket for <strong>${escapeHtml(t.eventTitle)}</strong> is below and <strong>attached as a PDF</strong> — save it to your phone and show it at the gate, or print it.</p>
    </td></tr>

    ${t.message ? `<tr><td style="padding:18px 24px 0">
      <div style="border-left:3px solid #ffed00;background:#f7f7f7;padding:12px 14px;font-size:14px;line-height:1.55;color:#222222;white-space:pre-line">${escapeHtml(t.message)}</div>
    </td></tr>` : ''}

    <tr><td style="padding:26px 24px 0">
      <div style="${overline}">${t.category ? `${escapeHtml(t.category)} · ` : ''}E-ticket · Order ${escapeHtml(t.orderId)}</div>
      <h1 style="margin:8px 0 0;font-size:26px;line-height:1.1;font-weight:800;color:#000000">${escapeHtml(t.eventTitle)}</h1>
    </td></tr>

    <tr><td style="padding:18px 24px 26px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #000000">
        <tr>${detail('Date', t.date)}${detail('Time', t.time)}</tr>
        <tr>${detail('Venue', t.venue)}${detail('Admits', `${t.quantity} × ${t.tierName}${t.seat ? ` · ${t.seat}` : ''}`)}</tr>
        <tr>${detail('Ticket holder', t.holderName)}${detail(t.amount ? 'Paid' : 'Email', t.amount || t.to)}</tr>
      </table>
    </td></tr>

    <tr><td align="center" style="border-top:2px dashed #000000;padding:24px 24px 22px">
      <div style="font-size:13px;font-weight:700;letter-spacing:3px;margin-bottom:12px">${escapeHtml(admitsLabel(t.quantity))}</div>
      <img src="cid:ticket-qr" width="180" height="180" alt="QR code ${escapeHtml(t.code)}" style="display:block;margin:0 auto;border:2px solid #000000">
      <div style="font-size:13px;font-weight:700;letter-spacing:5px;margin-top:12px;color:#000000">${escapeHtml(t.code)}</div>
      <div style="font-size:11px;color:#666666;margin-top:8px">Show this QR code at the entrance to be admitted.</div>
    </td></tr>

    <tr><td style="background:#f7f7f7;padding:16px 24px;font-size:11px;line-height:1.6;color:#666666">
      Issued and verified by Jazba Tickets. Questions about your booking? Just reply to this email, or write to support@jazbatickets.com.<br/>
      <a href="https://jazbatickets.com" style="color:#000000;font-weight:700;text-decoration:underline">jazbatickets.com</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

  return { to: t.to, subject: `Your ticket — ${t.eventTitle}`, html };
}

/** Admin: email the ticket — logo + QR inline, the PDF ticket attached. */
export async function sendTicketEmail(mail: MailConfig, body: TicketEmailBody): Promise<void> {
  await verifyAdmin(str(body.idToken, 4096), 'Only admins can send tickets.');
  const t = parseTicket(body, true);
  const { to, subject, html } = buildTicketEmail(t);
  const [pdf, qrPng] = await Promise.all([
    buildTicketPdf(t),
    QRCode.toBuffer(t.orderId, { errorCorrectionLevel: 'M', margin: 2, width: 360, color: { dark: '#000000', light: '#ffffff' } }),
  ]);
  await sendEmail(mail, {
    to,
    subject,
    html,
    attachments: [
      { filename: ticketFilename(t), content: Buffer.from(pdf).toString('base64'), contentType: 'application/pdf' },
      { filename: 'jazba-tickets.png', content: LOGO_PNG_BASE64, contentType: 'image/png', cid: 'jazba-logo' },
      { filename: `qr-${t.orderId}.png`, content: Buffer.from(qrPng).toString('base64'), contentType: 'image/png', cid: 'ticket-qr' },
    ],
  });
}

/** Admin: the ticket as a PDF file, for "Download PDF" in the portal. */
export async function ticketPdfForAdmin(body: TicketEmailBody): Promise<{ bytes: Uint8Array; filename: string }> {
  await verifyAdmin(str(body.idToken, 4096), 'Only admins can send tickets.');
  const t = parseTicket(body, false);
  return { bytes: await buildTicketPdf(t), filename: ticketFilename(t) };
}
