import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Clock, Check,
  ShieldCheck, Globe, Calendar, Loader2, Minus, Plus, AlertCircle, Lock,
} from 'lucide-react';
import { EventItem, getAvailableTiers } from '../types';
import { auth } from '../firebase';
import { formatMoney as formatLocalMoney } from '../currency';

interface CheckoutPageProps {
  event: EventItem;
  initialQuantity?: number;
  initialTier?: 'general' | 'vip' | 'elite';
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

const TIER_META: Record<'general' | 'vip' | 'elite', { name: string; note: string }> = {
  general: { name: 'General admission', note: 'Standard entry, unreserved seating' },
  vip: { name: 'VIP', note: 'Reserved seating and priority entry' },
  elite: { name: 'Elite', note: 'Front rows, lounge access and artist meet' },
};

export default function CheckoutPage({
  event,
  initialQuantity = 1,
  initialTier = 'general',
  onBack,
}: CheckoutPageProps) {
  const [redirecting, setRedirecting] = useState(false);
  const [payError, setPayError] = useState('');
  const [ticketCount, setTicketCount] = useState(initialQuantity);
  // Only packages the admin priced are offered; fall back to the first one
  // if the requested tier isn't available for this event.
  const availableTiers = getAvailableTiers(event);
  const [ticketTier, setTicketTier] = useState<'general' | 'vip' | 'elite'>(
    availableTiers.some((t) => t.tier === initialTier) ? initialTier : (availableTiers[0]?.tier || 'general')
  );
  // Checkout is login-gated, so prefill from the signed-in account.
  const [fullName, setFullName] = useState(auth.currentUser?.displayName || '');
  const [emailAddress, setEmailAddress] = useState(auth.currentUser?.email || '');

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

  const tierPricing = {
    general: availableTiers.find((t) => t.tier === 'general')?.price ?? event.price,
    vip: availableTiers.find((t) => t.tier === 'vip')?.price ?? 0,
    elite: availableTiers.find((t) => t.tier === 'elite')?.price ?? 0,
  };

  const getSubtotal = () => tierPricing[ticketTier] * ticketCount;
  const getDiscount = () => (promoApplied ? Math.round(getSubtotal() * 0.18) : 0);
  const getFees = () => Math.round((getSubtotal() - getDiscount()) * 0.08);
  const getTotalInUsd = () => getSubtotal() - getDiscount() + getFees();

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

  const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

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
              Confirm your details, then pay on Stripe's secure checkout page — your tickets arrive by email the moment payment clears.
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

              <div className="bg-[#f7f7f7] p-6 sm:p-8 mt-8" id="stripe-checkout-gate">
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
                  <Lock className="w-4 h-4" /> Continue to Stripe — pay {formatMoney(getTotalInUsd())}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e4e4e4] mt-6 pt-5 text-xs text-[#8a8a8a]">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> 256-bit SSL encryption
                  </span>
                  <span>PCI-DSS compliant</span>
                </div>
              </div>
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
                {availableTiers.map(({ tier }) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTicketTier(tier)}
                    className="w-full flex items-center justify-between py-4 border-b border-[#f2f2f2] last:border-b-0 cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          ticketTier === tier ? 'border-black bg-black' : 'border-[#c4c4c4] group-hover:border-black'
                        }`}
                      >
                        {ticketTier === tier && <span className="w-2 h-2 rounded-full bg-[#ffed00]" />}
                      </span>
                      <div>
                        <span className="font-bold text-sm block">{TIER_META[tier].name}</span>
                        <span className="text-xs text-[#666]">{TIER_META[tier].note}</span>
                      </div>
                    </div>
                    <span className="font-display font-bold text-base">{formatMoney(tierPricing[tier])}</span>
                  </button>
                ))}
              </div>

              {/* Quantity */}
              <div className="p-6 border-b border-[#f2f2f2] flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm block">Tickets</span>
                  <span className="text-xs text-[#666]">Up to 10 per order</span>
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
                    <span>{formatMoney(getSubtotal())}</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-[#666]">
                      <span>Discount (18%)</span>
                      <span>−{formatMoney(getDiscount())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#666]">
                    <span>Service fee (8%)</span>
                    <span>{formatMoney(getFees())}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-black mt-4 pt-4">
                    <span className="font-display font-bold text-lg">Total</span>
                    <span className="font-display font-bold text-2xl">{formatMoney(getTotalInUsd())}</span>
                  </div>
                </div>

                {/* Primary CTA — the page's single yellow moment */}
                <button
                  type="button"
                  onClick={handleStartStripeCheckout}
                  className="w-full bg-[#ffed00] text-black py-4 mt-6 font-bold text-sm cursor-pointer hover:bg-[#e6d200] transition-colors"
                >
                  Continue to payment
                </button>

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
