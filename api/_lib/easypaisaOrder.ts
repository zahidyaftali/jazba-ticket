import { sendEmail, escapeHtml, type MailConfig } from './sendEmail.js';
import {
  PaymentError,
  computeTotalUsd,
  fetchEventPricing,
  orderDiscountRate,
  toChargeAmount,
  verifyFirebaseUser,
} from './stripePayment.js';

// Manual Easypaisa payments. The buyer sends the order total to our
// Easypaisa account, then submits the receipt screenshot from the checkout.
// Shared by api/easypaisa-order.ts and the Vite dev middleware.
//
// As with Stripe, the client only says WHAT it wants to buy — the amount due
// is recomputed here from the event, so the team checks the screenshot
// against a figure the browser cannot change. Nothing is booked
// automatically: the team verifies the transfer and emails the tickets.

const NOTIFY_TO = 'info@jazbatickets.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const SCREENSHOT_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// ~3 MB decoded — keeps the whole request under Vercel's 4.5 MB body limit.
const MAX_SCREENSHOT_BASE64 = 4_000_000;
const SALE_GRACE_MS = 60 * 60 * 1000;

export interface EasypaisaOrderBody {
  eventId?: unknown;
  tier?: unknown;
  quantity?: unknown;
  promoCode?: unknown;
  idToken?: unknown;
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  screenshot?: unknown;
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function row(label: string, value: string): string {
  if (!value) return '';
  return `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#111">${escapeHtml(value)}</td></tr>`;
}

export async function submitEasypaisaOrder(
  mail: MailConfig,
  body: EasypaisaOrderBody,
): Promise<{ orderRef: string; amountPkr: number }> {
  const eventId = str(body.eventId, 128);
  const tier = str(body.tier, 64);
  const quantity = Number(body.quantity);
  const promoCode = str(body.promoCode, 40).toUpperCase();
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  const fullName = str(body.fullName, 200);
  const email = str(body.email, 200);
  const phone = str(body.phone, 40);
  const shot: any = body.screenshot && typeof body.screenshot === 'object' ? body.screenshot : {};
  const shotType = typeof shot.type === 'string' ? shot.type : '';
  const shotData = typeof shot.data === 'string' ? shot.data : '';

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(eventId)) throw new PaymentError('Invalid event.');
  if (!/^[a-z0-9-]{1,64}$/.test(tier)) throw new PaymentError('Invalid ticket type.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new PaymentError('Invalid ticket quantity.');
  if (!fullName) throw new PaymentError('Please enter your full name.');
  if (!EMAIL_RE.test(email)) throw new PaymentError('Please enter a valid email address.');
  if (!/^\+?[\d\s()-]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7) {
    throw new PaymentError('Please enter a valid phone number.');
  }
  if (!SCREENSHOT_TYPES[shotType] || !shotData || !BASE64_RE.test(shotData)) {
    throw new PaymentError('Please attach a screenshot of your Easypaisa payment (JPG or PNG).');
  }
  if (shotData.length > MAX_SCREENSHOT_BASE64) {
    throw new PaymentError('That screenshot is too large. Please upload one under 3 MB.', 413);
  }
  if (!idToken) throw new PaymentError('You must be signed in to buy tickets. Please log in and try again.', 401);

  const user = await verifyFirebaseUser(idToken);
  const event = await fetchEventPricing(eventId, idToken);

  const selected = Object.prototype.hasOwnProperty.call(event.tiers, tier) ? event.tiers[tier] : undefined;
  if (!selected) throw new PaymentError('That ticket package is not available for this event.');

  // A transfer made just before a sale ends can be submitted a little after,
  // so the sale price still counts for an hour past the deadline.
  const discount = orderDiscountRate(promoCode, eventId, tier, selected, Date.now() - SALE_GRACE_MS);
  const promoApplied = discount.code !== '';
  const amountUsd = computeTotalUsd(selected.price, quantity, discount.rate);
  if (amountUsd <= 0 || amountUsd > 10000) throw new PaymentError('Invalid payment amount.');
  // Same rupee figure the checkout shows and a PKR Stripe charge would take.
  const amountPkr = toChargeAmount(amountUsd, 'PKR') / 100;
  const amountLabel = `Rs ${amountPkr.toLocaleString('en-US')}`;

  const orderRef = `EP-${Math.floor(100000 + Math.random() * 900000)}`;

  const rows = [
    row('Reference', orderRef),
    row('Event', event.title),
    row('Ticket category', selected.name),
    row('No. of tickets', String(quantity)),
    row('Promo code', promoApplied ? promoCode : ''),
    row('Sale', discount.sale ? `${Math.round(discount.sale * 100)}% off` : ''),
    row('Amount due', amountLabel),
    row('Full name', fullName),
    row('Phone', phone),
    row('Email', email),
    row('Account email', user.email && user.email.toLowerCase() !== email.toLowerCase() ? user.email : ''),
  ].filter(Boolean).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="font-size:18px;margin:0 0 4px">Easypaisa payment to verify</h2>
      <p style="font-size:13px;color:#666;margin:0 0 16px">Check the attached screenshot shows ${escapeHtml(amountLabel)} received, then email the ticket confirmation to the buyer — reply to this message to reach them.</p>
      <table style="border-collapse:collapse;width:100%">${rows}</table>
      <p style="margin-top:24px;font-size:11px;color:#999">Submitted from the Jazba Tickets checkout.</p>
    </div>`;

  await sendEmail(mail, {
    to: NOTIFY_TO,
    subject: `Easypaisa payment ${orderRef} — ${amountLabel} — ${event.title} — ${fullName}`,
    html,
    replyTo: email,
    attachments: [{ filename: `${orderRef}-easypaisa-receipt.${SCREENSHOT_TYPES[shotType]}`, content: shotData }],
  });

  return { orderRef, amountPkr };
}
