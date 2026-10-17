import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Clock, Check,
  ShieldCheck, Globe, Calendar, Loader2, Minus, Plus, AlertCircle, Lock,
  Copy, ImageUp, Smartphone,
} from 'lucide-react';
import { EventItem, TicketTier, computeOrderTotals, getAvailableTiers } from '../types';
import { auth } from '../firebase';
import { formatMoney as formatLocalMoney } from '../currency';
import {
  EASYPAISA_ACCOUNT, EASYPAISA_ACCOUNT_DISPLAY, PreparedScreenshot,
  prepareScreenshot, submitEasypaisaOrder,
} from '../services/easypaisaService';

interface CheckoutPageProps {
  event: EventItem;
  initialQuantity?: number;
  initialTier?: TicketTier;
  onBack: () => void;
}

type Region = 'PK' | 'UK' | 'US';

interface RegionProfile {
  currencyLabel: string;
}

// Currency follows the visitor's location; payment always runs through
// Stripe's own hosted Checkout page — never embedded on this site.
const REGION_PROFILES: Record<Region, RegionProfile> = {
  PK: { currencyLabel: 'Pakistani Rupee (PKR)' },
  UK: { currencyLabel: 'Pound Sterling (GBP)' },
  US: { currencyLabel: 'US Dollar (USD)' },
};

// Card goes through Stripe's hosted page; Easypaisa is a manual transfer
// the team verifies from the uploaded receipt before emailing tickets.
type PaymentMethod = 'card' | 'easypaisa';

const PAYMENT_METHODS: { id: PaymentMethod; title: string; note: string }[] = [
  { id: 'card', title: 'Card', note: 'Visa, Mastercard & more via Stripe' },
  { id: 'easypaisa', title: 'Easypaisa', note: 'Mobile account transfer in PKR' },
];

export default function CheckoutPage({
  event,
  initialQuantity = 1,
  initialTier = 'general',
  onBack,
}: CheckoutPageProps) {
  const [redirecting, setRedirecting] = useState(false);
  const [payError, setPayError] = useState('');
  const [ticketCount, setTicketCount] = useState(initialQuantity);
  // Only packages the event offers are shown; fall back to the first one
  // if the requested tier isn't available for this event.
  const availableTiers = getAvailableTiers(event);
  const [ticketTier, setTicketTier] = useState<TicketTier>(
    availableTiers.some((t) => t.tier === initialTier) ? initialTier : (availableTiers[0]?.tier || 'general')
  );
  // Checkout is login-gated, so prefill from the signed-in account.
  const [fullName, setFullName] = useState(auth.currentUser?.displayName || '');
  const [emailAddress, setEmailAddress] = useState(auth.currentUser?.email || '');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Easypaisa — phone + receipt screenshot, sent to the team for verification
  const [phone, setPhone] = useState('');
  const [screenshot, setScreenshot] = useState<PreparedScreenshot | null>(null);
  const [screenshotName, setScreenshotName] = useState('');
  const [preparingShot, setPreparingShot] = useState(false);
  const [epSubmitting, setEpSubmitting] = useState(false);
  const [epError, setEpError] = useState('');
  const [epResult, setEpResult] = useState<{ orderRef: string; amountPkr: number } | null>(null);
  const [copied, setCopied] = useState<'amount' | 'account' | ''>('');

  // Promo
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Region is resolved from the visitor's IP — the checkout adapts automatically.
  const [paymentRegion, setPaymentRegion] = useState<Region>('US');
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectedPlace, setDetectedPlace] = useState('');

  useEffect(() => {
    setIsDetecting(true);
    fetch('https://ipapi.co/json/')
      .then((res) => {
        if (!res.ok) throw new Error('geo lookup failed');
        return res.json();
      })
      .then((data) => {
        const cc = (data?.country_code || '').toUpperCase();
        const place = [data?.city, data?.country_name].filter(Boolean).join(', ');
        setDetectedPlace(place);
        let region: Region = 'US';
        if (cc === 'PK') region = 'PK';
        else if (cc === 'GB' || cc === 'UK') region = 'UK';
        setPaymentRegion(region);
      })
      .catch(() => {
        // Fallback: infer from timezone, otherwise international card checkout
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        let region: Region = 'US';
        if (tz.includes('Karachi')) region = 'PK';
        else if (tz.includes('London')) region = 'UK';
        setPaymentRegion(region);
        setDetectedPlace('');
      })
      .finally(() => setIsDetecting(false));
  }, []);

  const profile = REGION_PROFILES[paymentRegion];
  const currency = paymentRegion === 'PK' ? 'PKR' : paymentRegion === 'UK' ? 'GBP' : 'USD';

  // Same maths as the payment server, so the total shown is the amount charged.
  const unitPrice = availableTiers.find((t) => t.tier === ticketTier)?.price ?? 0;
  const totals = computeOrderTotals(unitPrice, ticketCount, promoApplied);

  // Local pricing follows the detected region — same shared rates as the
  // rest of the site, so card prices and checkout totals always match.
  const formatMoney = (usdAmount: number) => formatLocalMoney(usdAmount, paymentRegion, { precise: true });

  const handleApplyPromo = () => {
    const clean = promoCode.trim().toUpperCase();
    if (clean === 'JAZBA18' || clean === 'EVENT18' || clean === 'HAMILTON18') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('That code isn\'t valid. Try JAZBA18 for 18% off.');
      setPromoApplied(false);
    }
  };

  // Hands off to Stripe's own hosted Checkout page — payment happens
  // entirely on checkout.stripe.com, never inside this site. Stripe then
  // redirects the browser back to /checkout/success, which verifies the
  // payment server-side and writes the booking.
  const handleStartStripeCheckout = async () => {
    if (!fullName || !emailAddress) {
      const nameEl = document.getElementById('checkout-name-input');
      nameEl?.focus();
      nameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setPayError('You need to be signed in to pay. Please log in and try again.');
      return;
    }

    setPayError('');
    setRedirecting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          tier: ticketTier,
          quantity: ticketCount,
          promoCode: promoApplied ? promoCode.trim().toUpperCase() : '',
          currency,
          idToken,
          fullName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start the payment. Please try again.');
      }
      // Full-page navigation to Stripe's hosted Checkout — we leave the site here.
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Failed to start Stripe checkout:', err);
      setPayError(err?.message || 'Could not start the payment. Please try again.');
      setRedirecting(false);
    }
  };

  // Easypaisa is always paid in rupees, whatever currency the page shows.
  const easypaisaAmount = formatLocalMoney(totals.total, 'PK');
  const selectedTierName = availableTiers.find((t) => t.tier === ticketTier)?.name || ticketTier;

  const copyValue = async (key: 'amount' | 'account', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    } catch { /* clipboard blocked — the value is still on screen */ }
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again after an error
    if (!file) return;
    setEpError('');
    setPreparingShot(true);
    try {
      setScreenshot(await prepareScreenshot(file));
      setScreenshotName(file.name);
    } catch (err: any) {
      setEpError(err?.message || 'We couldn\'t read that image. Please try another screenshot.');
    } finally {
      setPreparingShot(false);
    }
  };

  const handleSubmitEasypaisa = async () => {
    const focusField = (id: string) => {
      const el = document.getElementById(id);
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if (!fullName || !emailAddress) {
      focusField('checkout-name-input');
      return;
    }
    if (!phone.trim()) {
      setEpError('Please enter your phone number so we can reach you about this payment.');
      focusField('checkout-phone-input');
      return;
    }
    if (!screenshot) {
      setEpError('Please upload a screenshot of your Easypaisa payment.');
      focusField('checkout-screenshot-drop');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setEpError('You need to be signed in to buy tickets. Please log in and try again.');
      return;
    }

    setEpError('');
    setEpSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const result = await submitEasypaisaOrder({
        eventId: event.id,
        tier: ticketTier,
        quantity: ticketCount,
        promoCode: promoApplied ? promoCode.trim().toUpperCase() : '',
        idToken,
        fullName,
        email: emailAddress,
        phone: phone.trim(),
        screenshot: { type: screenshot.type, data: screenshot.data },
      });
      setEpResult(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to submit Easypaisa payment:', err);
      setEpError(err?.message || 'Could not submit your payment. Please try again.');
    } finally {
      setEpSubmitting(false);
    }
  };

  const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

  if (epResult) {
    return (
      <div className="jz-page min-h-[70vh] bg-white flex items-center justify-center px-4 sm:px-6 py-16">
        <div className="max-w-md w-full text-center">
          <span className="w-14 h-14 rounded-full bg-black mx-auto flex items-center justify-center">
            <Check className="w-7 h-7 text-[#ffed00]" />
          </span>
          <h1 className="font-display font-bold text-3xl mt-6">Payment submitted</h1>
          <p className="text-sm text-[#666] mt-3 leading-relaxed">
            Thank you — we've received your Easypaisa payment details. Once our team has confirmed the
            transfer, we'll email your ticket confirmation to <span className="font-bold text-black break-all">{emailAddress}</span>.
          </p>

          <div className="border border-black text-left mt-8 divide-y divide-[#f2f2f2]">
            {[
              ['Reference', epResult.orderRef],
              ['Event', event.title],
              ['Tickets', `${ticketCount} × ${selectedTierName}`],
              ['Amount sent', `Rs ${epResult.amountPkr.toLocaleString()}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-5 py-3.5 text-sm">
                <span className="text-[#666] shrink-0">{label}</span>
                <span className="font-bold text-right">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#8a8a8a] mt-4">Keep your reference handy — quote it if you contact us about this order.</p>

          <button
            type="button"
            onClick={onBack}
            className="w-full bg-black text-white py-4 mt-8 font-bold text-sm cursor-pointer hover:bg-neutral-800 transition-colors"
          >
            Back to event
          </button>
        </div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="jz-page min-h-[70vh] bg-white flex items-center justify-center px-6 text-center">
        <div>
          <Loader2 className="w-10 h-10 animate-spin mx-auto" />
          <h1 className="font-display font-bold text-2xl mt-6">Taking you to Stripe…</h1>
          <p className="text-sm text-[#666] mt-2">You'll pay on Stripe's secure checkout page, then land back here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="checkout-page-root">

      {/* ── TOP STRIP ─────────────────────────────────────────── */}
      <div className="border-b border-[#f2f2f2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-black hover:opacity-60 text-sm font-bold transition-opacity cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to event</span>
          </button>
          <span className={`${overline} text-[#8a8a8a] flex items-center gap-1.5`}>
            <ShieldCheck className="w-3.5 h-3.5" /> Secure checkout
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">

        {/* Bookings are only created after Stripe confirms the charge — the
            form itself never submits (Enter key must not skip payment). */}
        <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-10">

          {/* LEFT — configurator column */}
          <div className="lg:col-span-7">

            <h1 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95]">Checkout</h1>
            <p className="text-[#666] text-sm mt-3 max-w-lg">
              Confirm your details, then pay by card on Stripe's secure checkout page or send the total by Easypaisa — your tickets arrive by email.
            </p>

            {/* Detected location banner */}
            <div className="flex items-center gap-3 border border-[#e4e4e4] px-5 py-4 mt-8">
              <Globe className="w-5 h-5 shrink-0" />
              {isDetecting ? (
                <span className="text-sm text-[#666] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Detecting your location…
                </span>
              ) : (
                <div className="text-sm">
                  <span className="font-bold">
                    {detectedPlace || (paymentRegion === 'PK' ? 'Pakistan' : paymentRegion === 'UK' ? 'United Kingdom' : 'International')}
                  </span>
                  <span className="text-[#666]"> — prices shown in {profile.currencyLabel}.</span>
                </div>
              )}
            </div>

            {/* 1 · Your details */}
            <div className="mt-10">
              <div className="flex items-baseline gap-3 border-b border-black pb-3">
                <span className="font-display font-bold text-lg">1</span>
                <h2 className="font-display font-bold text-xl">Your details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pt-6">
                <div>
                  <label className={`${overline} text-[#666] block mb-2`}>Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Liam Hall"
                    required
                    className="w-full bg-white px-0 py-3 text-base text-black placeholder-[#8a8a8a]"
                    id="checkout-name-input"
                  />
                </div>
                <div>
                  <label className={`${overline} text-[#666] block mb-2`}>Email address</label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white px-0 py-3 text-base text-black placeholder-[#8a8a8a]"
                    id="checkout-email-input"
                  />
                  <p className="text-xs text-[#8a8a8a] mt-2">Tickets are delivered to this address.</p>
                </div>
              </div>
            </div>

            {/* 2 · Payment */}
            <div className="mt-12" id="payment-system-container">
              <div className="flex items-baseline gap-3 border-b border-black pb-3">
                <span className="font-display font-bold text-lg">2</span>
                <h2 className="font-display font-bold text-xl">Payment</h2>
              </div>

              {/* Method picker */}
              <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                {PAYMENT_METHODS.map(({ id, title, note }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === id}
                    onClick={() => setPaymentMethod(id)}
                    className={`group flex items-center gap-3.5 border p-4 text-left cursor-pointer transition-colors ${
                      paymentMethod === id ? 'border-black' : 'border-[#e4e4e4] hover:border-black'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentMethod === id ? 'border-black bg-black' : 'border-[#c4c4c4] group-hover:border-black'
                      }`}
                    >
                      {paymentMethod === id && <span className="w-2 h-2 rounded-full bg-[#ffed00]" />}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-sm block">{title}</span>
                      <span className="text-xs text-[#666]">{note}</span>
                    </div>
                  </button>
                ))}
              </div>

              {paymentMethod === 'card' ? (
              <div className="bg-[#f7f7f7] p-6 sm:p-8 mt-6" id="stripe-checkout-gate">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span className="text-[#635bff] font-black lowercase tracking-tight">stripe</span> Checkout
                    </h3>
                    <p className="text-xs text-[#666] mt-1">
                      Card payments are completed on Stripe's own secure page — you'll return here automatically once you've paid.
                    </p>
                  </div>
                  <Lock className="w-5 h-5 text-[#8a8a8a] shrink-0" />
                </div>

                {payError && (
                  <div className="flex items-start gap-2 bg-white border border-[#be6464] text-[#be6464] text-xs font-bold p-3 mt-5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{payError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStartStripeCheckout}
                  className="w-full mt-6 bg-black text-white py-4 font-bold text-sm cursor-pointer hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" /> Continue to Stripe — pay {formatMoney(totals.total)}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e4e4e4] mt-6 pt-5 text-xs text-[#8a8a8a]">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> 256-bit SSL encryption
                  </span>
                  <span>PCI-DSS compliant</span>
                </div>
              </div>
              ) : (
              <div className="bg-[#f7f7f7] p-6 sm:p-8 mt-6" id="easypaisa-gate">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span className="text-[#1f9a3f] font-black lowercase tracking-tight">easypaisa</span> Direct transfer
                    </h3>
                    <p className="text-xs text-[#666] mt-1">
                      Send the order total from your Easypaisa account, then upload your receipt — we verify every transfer personally.
                    </p>
                  </div>
                  <Smartphone className="w-5 h-5 text-[#8a8a8a] shrink-0" />
                </div>

                {/* The two figures the buyer types into the Easypaisa app */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#e4e4e4] border border-[#e4e4e4] mt-6">
                  {([
                    ['amount', 'Amount to send', easypaisaAmount, easypaisaAmount.replace(/\D/g, '')],
                    ['account', 'Easypaisa account', EASYPAISA_ACCOUNT_DISPLAY, EASYPAISA_ACCOUNT],
                  ] as const).map(([key, label, shown, raw]) => (
                    <div key={key} className="bg-white p-5">
                      <span className={`${overline} text-[#666]`}>{label}</span>
                      <div className="flex items-center justify-between gap-3 mt-2">
                        <span className="font-display font-bold text-xl sm:text-2xl whitespace-nowrap">{shown}</span>
                        <button
                          type="button"
                          onClick={() => copyValue(key, raw)}
                          aria-label={`Copy ${label.toLowerCase()}`}
                          className="flex items-center gap-1.5 border border-black px-2.5 py-1.5 text-xs font-bold cursor-pointer hover:bg-[#f7f7f7] transition-colors shrink-0"
                        >
                          {copied === key ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {paymentRegion !== 'PK' && (
                  <p className="text-xs text-[#666] mt-3">
                    Easypaisa transfers are made in Pakistani Rupees — {easypaisaAmount} is your order total of {formatMoney(totals.total)}.
                  </p>
                )}

                <ol className="mt-6 space-y-3 text-sm">
                  {[
                    <>Send exactly <span className="font-bold">{easypaisaAmount}</span> to <span className="font-bold">{EASYPAISA_ACCOUNT_DISPLAY}</span> from your Easypaisa app.</>,
                    <>Take a screenshot of the payment confirmation screen.</>,
                    <>Add your phone number, upload the screenshot below and submit.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 mt-8">
                  <div>
                    <label htmlFor="checkout-phone-input" className={`${overline} text-[#666] block mb-2`}>Phone number</label>
                    <input
                      id="checkout-phone-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03XX XXXXXXX"
                      className="w-full bg-transparent px-0 py-3 text-base text-black placeholder-[#8a8a8a]"
                    />
                  </div>
                  <div>
                    <span className={`${overline} text-[#666] block mb-2`}>Payment screenshot</span>
                    <label
                      id="checkout-screenshot-drop"
                      tabIndex={-1}
                      className="flex items-center gap-3.5 border border-dashed border-[#c4c4c4] bg-white p-3 cursor-pointer hover:border-black focus-within:border-black focus-within:border-solid transition-colors"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        className="sr-only"
                      />
                      {screenshot ? (
                        <img src={screenshot.previewUrl} alt="Your payment screenshot" className="w-12 h-12 object-cover border border-[#e4e4e4] shrink-0" />
                      ) : (
                        <span className="w-12 h-12 bg-[#f7f7f7] flex items-center justify-center shrink-0">
                          {preparingShot ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageUp className="w-5 h-5" />}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="font-bold text-sm block truncate">
                          {preparingShot ? 'Preparing image…' : screenshot ? screenshotName : 'Upload screenshot'}
                        </span>
                        <span className="text-xs text-[#666]">{screenshot ? 'Tap to replace' : 'JPG or PNG of your receipt'}</span>
                      </span>
                    </label>
                  </div>
                </div>

                {epError && (
                  <div className="flex items-start gap-2 bg-white border border-[#be6464] text-[#be6464] text-xs font-bold p-3 mt-6">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{epError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmitEasypaisa}
                  disabled={epSubmitting || preparingShot}
                  className="w-full mt-6 bg-black text-white py-4 font-bold text-sm cursor-pointer hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                >
                  {epSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    : <><Check className="w-4 h-4" /> I've paid — submit for verification</>}
                </button>

                <p className="text-xs text-[#8a8a8a] border-t border-[#e4e4e4] mt-6 pt-5 leading-relaxed">
                  Your name, phone, email, ticket category and number of tickets are sent with your screenshot.
                  Once we've received your payment, we'll email your ticket confirmation{emailAddress ? <> to <span className="text-black break-all">{emailAddress}</span></> : ''}.
                </p>
              </div>
              )}
            </div>
          </div>

          {/* RIGHT — order summary rail */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 lg:self-start">
            <div className="border border-black">

              {/* Event strip */}
              <div className="p-6 border-b border-[#f2f2f2]">
                <span className={`${overline} text-[#666]`}>Your order</span>
                <div className="flex gap-4 mt-4">
                  <div className="w-20 h-20 overflow-hidden bg-[#f7f7f7] shrink-0">
                    <img
                      src={event.image}
                      alt={event.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-lg leading-tight truncate">{event.title}</h4>
                    <div className="space-y-1 mt-2 text-sm text-[#666]">
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{event.location}</span></span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0" />{event.fullDate || `${event.date}, ${event.year || '2026'}`}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0" />{event.time}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tier rows */}
              <div className="p-6 border-b border-[#f2f2f2]">
                <span className={`${overline} text-[#666] block mb-1`}>Ticket type</span>
                {availableTiers.map(({ tier, name, price }) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTicketTier(tier)}
                    className="w-full flex items-center justify-between py-4 border-b border-[#f2f2f2] last:border-b-0 cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          ticketTier === tier ? 'border-black bg-black' : 'border-[#c4c4c4] group-hover:border-black'
                        }`}
                      >
                        {ticketTier === tier && <span className="w-2 h-2 rounded-full bg-[#ffed00]" />}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-sm block">{name}</span>
                      </div>
                    </div>
                    <span className="font-display font-bold text-base shrink-0 pl-3">{formatMoney(price)}</span>
                  </button>
                ))}
              </div>

              {/* Quantity */}
              <div className="p-6 border-b border-[#f2f2f2] flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm block">Tickets</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                    className="w-10 h-10 border border-black flex items-center justify-center cursor-pointer hover:bg-[#f7f7f7] transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-display font-bold text-xl min-w-[24px] text-center">{ticketCount}</span>
                  <button
                    type="button"
                    onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                    className="w-10 h-10 border border-black flex items-center justify-center cursor-pointer hover:bg-[#f7f7f7] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Promo */}
              <div className="p-6 border-b border-[#f2f2f2]">
                <label className={`${overline} text-[#666] block mb-2`}>Promo code</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="JAZBA18"
                    className="flex-1 bg-white px-0 py-2.5 text-sm text-black placeholder-[#8a8a8a]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="bg-black text-white text-sm font-bold px-5 cursor-pointer hover:bg-neutral-800 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {promoApplied && (
                  <span className="flex items-center gap-1.5 text-sm font-bold mt-3">
                    <Check className="w-4 h-4" /> 18% discount applied
                  </span>
                )}
                {promoError && (
                  <span className="block text-sm text-[#be6464] mt-3">{promoError}</span>
                )}
              </div>

              {/* Totals */}
              <div className="p-6">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-[#666]">
                    <span>Subtotal</span>
                    <span>{formatMoney(totals.subtotal)}</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-[#666]">
                      <span>Discount (18%)</span>
                      <span>−{formatMoney(totals.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#666]">
                    <span>Service fee (8%)</span>
                    <span>{formatMoney(totals.fees)}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-black mt-4 pt-4">
                    <span className="font-display font-bold text-lg">Total</span>
                    <span className="font-display font-bold text-2xl">{formatMoney(totals.total)}</span>
                  </div>
                </div>

                {/* Primary CTA — the page's single yellow moment */}
                <button
                  type="button"
                  onClick={paymentMethod === 'card' ? handleStartStripeCheckout : handleSubmitEasypaisa}
                  disabled={epSubmitting || preparingShot}
                  className="w-full bg-[#ffed00] text-black py-4 mt-6 font-bold text-sm cursor-pointer hover:bg-[#e6d200] transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {paymentMethod === 'card' ? 'Continue to payment' : epSubmitting ? 'Submitting…' : 'Submit Easypaisa payment'}
                </button>
                {paymentMethod === 'easypaisa' && (
                  <p className="text-xs text-[#666] text-center mt-3">
                    Send {easypaisaAmount} to Easypaisa {EASYPAISA_ACCOUNT_DISPLAY}, then submit your screenshot.
                  </p>
                )}

                <p className="text-xs text-[#8a8a8a] text-center mt-4 leading-relaxed">
                  Every order is covered by our refund guarantee. By paying you accept the terms of use.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
