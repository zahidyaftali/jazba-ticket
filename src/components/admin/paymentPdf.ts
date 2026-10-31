// One payment as a downloadable PDF, built in the browser with pdf-lib (the
// same library as the e-tickets). Loaded on demand so the admin bundle stays
// small until someone actually downloads.

export interface PaymentPdfSection {
  heading: string;
  rows: [label: string, value: string][];
}

export interface PaymentPdfData {
  orderId: string;
  amountLabel: string;
  statusLabel: string;
  /** Successful payments get the yellow status chip. */
  successful: boolean;
  dateLabel: string;
  sections: PaymentPdfSection[];
}

const LOGO_URL = '/email/jazba-tickets-logo.png';

/** Build the PDF and save it to the admin's computer. */
export async function downloadPaymentPdf(data: PaymentPdfData, filename: string): Promise<void> {
  const logo = await fetch(LOGO_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
  const bytes = await buildPaymentPdf(data, logo);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** The payment PDF's bytes. `logo` is the white-on-dark Jazba Tickets PNG. */
export async function buildPaymentPdf(data: PaymentPdfData, logo: ArrayBuffer | Uint8Array | null): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  type PDFFont = import('pdf-lib').PDFFont;
  type Color = import('pdf-lib').Color;

  const BLACK = rgb(0, 0, 0);
  const WHITE = rgb(1, 1, 1);
  const YELLOW = rgb(1, 0.929, 0); // #ffed00
  const GREY = rgb(0.4, 0.4, 0.4);
  const LIGHT = rgb(0.9, 0.9, 0.9);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Payment ${data.orderId}`);
  pdf.setAuthor('Jazba Tickets');
  const page = pdf.addPage([595.28, 841.89]); // A4
  const W = page.getWidth();
  const H = page.getHeight();
  const M = 48;
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // The standard fonts only cover Western characters; others (e.g. Urdu
  // script in a name) are left out rather than breaking the download.
  const charset = new Set(regular.getCharacterSet());
  const safe = (s: string) =>
    Array.from(String(s ?? '').replace(/\s+/g, ' '))
      .filter((ch) => charset.has(ch.codePointAt(0)!))
      .join('')
      .trim();
  const Y = (top: number) => H - top;
  const text = (s: string, x: number, top: number, size: number, font: PDFFont, color: Color) =>
    page.drawText(safe(s), { x, y: Y(top), size, font, color });
  const widthOf = (s: string, size: number, font: PDFFont) => font.widthOfTextAtSize(safe(s), size);

  /** Split text into lines that fit `maxWidth`, breaking long words too. */
  const wrap = (s: string, size: number, font: PDFFont, maxWidth: number): string[] => {
    const lines: string[] = [];
    let line = '';
    for (const word of safe(s).split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (widthOf(candidate, size, font) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      let rest = word;
      while (widthOf(rest, size, font) > maxWidth) {
        let cut = rest.length - 1;
        while (cut > 1 && widthOf(rest.slice(0, cut), size, font) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  };

  // ── Black header band with the logo ──
  const BAND = 104;
  page.drawRectangle({ x: 0, y: Y(BAND), width: W, height: BAND, color: BLACK });
  const logoImg = logo ? await pdf.embedPng(logo).catch(() => null) : null;
  if (logoImg) {
    const logoH = 46;
    page.drawImage(logoImg, { x: M, y: Y(29 + logoH), width: (logoImg.width / logoImg.height) * logoH, height: logoH });
  } else {
    text('JAZBA TICKETS', M, 58, 18, bold, WHITE);
  }
  const eyebrow = 'PAYMENT DETAILS';
  text(eyebrow, W - M - widthOf(eyebrow, 8, bold), 44, 8, bold, rgb(0.7, 0.7, 0.7));
  const order = data.orderId || 'Payment';
  text(order, W - M - widthOf(order, 16, bold), 66, 16, bold, WHITE);

  // ── Amount, status and date ──
  let top = BAND + 52;
  text(data.amountLabel, M, top, 28, bold, BLACK);
  const chip = safe(data.statusLabel.toUpperCase());
  const chipSize = 8;
  const chipW = widthOf(chip, chipSize, bold) + 16;
  const chipX = M + widthOf(data.amountLabel, 28, bold) + 14;
  page.drawRectangle({
    x: chipX,
    y: Y(top - 4),
    width: chipW,
    height: 18,
    color: data.successful ? YELLOW : WHITE,
    borderColor: BLACK,
    borderWidth: data.successful ? 0 : 1,
  });
  text(chip, chipX + 8, top - 9.5, chipSize, bold, BLACK);
  top += 20;
  text(data.dateLabel, M, top, 10, regular, GREY);
  top += 26;

  // ── Sections ──
  const LABEL_W = 150;
  const VALUE_X = M + LABEL_W;
  const VALUE_W = W - M - VALUE_X;
  for (const section of data.sections) {
    const rows = section.rows.filter(([, v]) => safe(v));
    if (!rows.length) continue;
    top += 14;
    text(section.heading.toUpperCase(), M, top, 8, bold, GREY);
    top += 8;
    page.drawLine({ start: { x: M, y: Y(top) }, end: { x: W - M, y: Y(top) }, thickness: 1, color: BLACK });
    for (const [label, value] of rows) {
      const lines = wrap(value, 10.5, bold, VALUE_W);
      top += 18;
      text(label, M, top, 9.5, regular, GREY);
      lines.forEach((line, i) => text(line, VALUE_X, top + i * 14, 10.5, bold, BLACK));
      top += (lines.length - 1) * 14 + 8;
      page.drawLine({ start: { x: M, y: Y(top) }, end: { x: W - M, y: Y(top) }, thickness: 0.5, color: LIGHT });
    }
    top += 6;
  }

  // ── Footer ──
  const generated = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  page.drawLine({ start: { x: M, y: Y(H - 70) }, end: { x: W - M, y: Y(H - 70) }, thickness: 0.5, color: LIGHT });
  text('Jazba Tickets  ·  jazbatickets.com  ·  info@jazbatickets.com', M, H - 54, 8.5, bold, BLACK);
  text(`Record of a payment, not a ticket. Generated ${generated} from the admin portal.`, M, H - 40, 8, regular, GREY);

  return pdf.save();
}
