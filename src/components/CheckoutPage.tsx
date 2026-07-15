import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Clock, Ticket, Check,
  Printer, ShieldCheck, Globe, Calendar, Loader2, Minus, Plus,
} from 'lucide-react';
import { EventItem, getAvailableTiers } from '../types';
import { auth } from '../firebase';
import { createBooking } from '../services/backendService';
import StripeCheckoutForm from './StripeCheckoutForm';
import PayPalCheckoutForm from './PayPalCheckoutForm';
import TicketPrintSheet from './TicketPrintSheet';
import { formatMoney as formatLocalMoney } from '../currency';

interface CheckoutPageProps {
  event: EventItem;
  initialQuantity?: number;
  initialTier?: 'general' | 'vip' | 'elite';
  onBack: () => void;
  onGoToDashboard: () => void;
}

type Region = 'PK' | 'UK' | 'US';

interface RegionProfile {
  currencyLabel: string;
  methods: { id: string; name: string; note: string }[];
  defaultMethod: string;
}

// Payment options are decided by the visitor's detected location — never picked manually.
const REGION_PROFILES: Record<Region, RegionProfile> = {
  PK: {
    currencyLabel: 'Pakistani Rupee (PKR)',
    methods: [
      { id: 'easypaisa', name: 'Easypaisa', note: 'Mobile wallet' },
      { id: 'jazzcash', name: 'JazzCash', note: 'Mobile wallet' },
      { id: 'stripe', name: 'Card', note: 'Visa / Mastercard' },
    ],
    defaultMethod: 'easypaisa',
  },
  UK: {
    currencyLabel: 'Pound Sterling (GBP)',
    methods: [
      { id: 'paypal', name: 'PayPal', note: 'Express checkout' },
      { id: 'stripe', name: 'Card', note: 'Visa / Mastercard / Amex' },
    ],
    defaultMethod: 'paypal',
  },
  US: {
    currencyLabel: 'US Dollar (USD)',
    methods: [
      { id: 'stripe', name: 'Card', note: 'Visa / Mastercard / Amex' },
      { id: 'paypal', name: 'PayPal', note: 'Express checkout' },
      { id: 'applepay', name: 'Apple Pay', note: 'Express wallet' },
      { id: 'googlepay', name: 'Google Pay', note: 'Express wallet' },
    ],
    defaultMethod: 'stripe',
  },
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
  onGoToDashboard,
}: CheckoutPageProps) {
  const [step, setStep] = useState<'details' | 'loading' | 'ticket'>('details');
  const [ticketCount, setTicketCount] = useState(initialQuantity);
  // Only packages the admin priced are offered; fall back to the first one
  // if the requested tier isn't available for this event.
  const availableTiers = getAvailableTiers(event);
  const [ticketTier, setTicketTier] = useState<'general' | 'vip' | 'elite'>(
    availableTiers.some((t) => t.tier === initialTier) ? initialTier : (availableTiers[0]?.tier || 'general')
  );
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [ticketCode] = useState(() => `TT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [seatConfig] = useState(() => `${String.fromCharCode(65 + Math.floor(Math.random() * 10))}-${Math.floor(1 + Math.random() * 24)}`);

  // Promo
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Region is resolved from the visitor's IP — the checkout adapts automatically.
  const [paymentRegion, setPaymentRegion] = useState<Region>('US');
  const [paymentMethod, setPaymentMethod] = useState<string>('stripe');
  const [pkMobileNumber, setPkMobileNumber] = useState('');
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
        setPaymentMethod(REGION_PROFILES[region].defaultMethod);
      })
      .catch(() => {
        // Fallback: infer from timezone, otherwise international card checkout
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        let region: Region = 'US';
        if (tz.includes('Karachi')) region = 'PK';
        else if (tz.includes('London')) region = 'UK';
        setPaymentRegion(region);
        setPaymentMethod(REGION_PROFILES[region].defaultMethod);
        setDetectedPlace('');
      })
      .finally(() => setIsDetecting(false));
  }, []);

  const profile = REGION_PROFILES[paymentRegion];

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

  const handleCreateBooking = async (e?: React.FormEvent, stripeTransactionId?: string) => {
    if (e) e.preventDefault();
    if (!fullName || !emailAddress) return;

    setStep('loading');
    window.scrollTo({ top: 0, behavior: 'instant' });

    const user = auth.currentUser;
    const bDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const bPrice = getTotalInUsd();
    const barcodeVal = `8${Math.floor(10000000000 + Math.random() * 90000000000)}`;

    const payload = {
      eventId: event.id,
      quantity: ticketCount,
      tier: ticketTier,
      bookingDate: bDate,
      orderId: ticketCode,
      seat: seatConfig,
      barCode: barcodeVal,
      pricePaid: bPrice,
      createdAt: new Date().toISOString(),
      paymentRegion,
      paymentMethod,
      paymentStatus: 'paid',
      stripeTransactionId: stripeTransactionId || null,
      billingName: fullName,
      billingEmail: emailAddress,
      promoApplied,
      discountAmount: getDiscount(),
    };

    if (user) {
      try {
        await createBooking({
          id: ticketCode,
          bookingNumber: ticketCode,
          userId: user.uid,
          ticketType: ticketTier,
          amount: bPrice,
          bookingStatus: 'active',
          qrCode: barcodeVal,
          eventTitle: event.title,
          eventImage: (event as any).bannerImage || (event as any).image || '',
          eventDate: (event as any).date || '',
          ...payload,
        } as any);
      } catch (err) {
        console.error('Failed to write booking to backend:', err);
      }
    } else {
      try {
        const list = JSON.parse(localStorage.getItem('jazbaticket_bookings') || '[]');
        list.push(payload);
        localStorage.setItem('jazbaticket_bookings', JSON.stringify(list));
      } catch (err) {
        console.error('Failed to save local booking:', err);
      }
    }

    setTimeout(() => {
      setStep('ticket');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1500);
  };

  const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

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

        {/* ── STEP 1: DETAILS ─────────────────────────────────── */}
        {step === 'details' && (
          <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-10">

            {/* LEFT — configurator column */}
            <div className="lg:col-span-7">

              <h1 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95]">Checkout</h1>
              <p className="text-[#666] text-sm mt-3 max-w-lg">
                Confirm your details and pay — your tickets arrive by email the moment payment clears.
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
                    <span className="text-[#666]"> — prices shown in {profile.currencyLabel}, with local payment options below.</span>
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

                {/* Method rows — configurator style */}
                <div className="border-b border-[#f2f2f2]">
                  {profile.methods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className="w-full flex items-center justify-between py-5 border-b border-[#f2f2f2] last:border-b-0 cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            paymentMethod === m.id ? 'border-black bg-black' : 'border-[#c4c4c4] group-hover:border-black'
                          }`}
                        >
                          {paymentMethod === m.id && <span className="w-2 h-2 rounded-full bg-[#ffed00]" />}
                        </span>
                        <div>
                          <span className="font-bold text-base block">{m.name}</span>
                          <span className="text-sm text-[#666]">{m.note}</span>
                        </div>
                      </div>
                      {paymentMethod === m.id && <Check className="w-5 h-5" />}
                    </button>
                  ))}
                </div>

                {/* Method detail panel */}
                <div className="bg-[#f7f7f7] p-6 sm:p-8 mt-8">

                  {paymentRegion === 'PK' && (paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') && (
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="font-display font-bold text-lg">
                          {paymentMethod === 'easypaisa' ? 'Easypaisa account' : 'JazzCash account'}
                        </h3>
                        <span className={`${overline} bg-white border border-[#e4e4e4] px-3 py-1.5`}>SMS PIN confirmation</span>
                      </div>

                      <div className="mt-6 max-w-sm">
                        <label className={`${overline} text-[#666] block mb-2`}>Mobile number</label>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-base shrink-0">+92</span>
                          <input
                            type="tel"
                            value={pkMobileNumber}
                            onChange={(e) => setPkMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                            placeholder="300 0000000"
                            required
                            className="w-full bg-transparent px-0 py-3 text-base text-black placeholder-[#8a8a8a]"
                          />
                        </div>
                      </div>

                      <p className="text-sm text-[#666] mt-5 max-w-md">
                        Use the number linked to your {paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} wallet. A confirmation prompt lands on your phone — approve it and you're done.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'stripe' && (
                    <StripeCheckoutForm
                      amount={getTotalInUsd()}
                      currency={paymentRegion === 'PK' ? 'PKR' : paymentRegion === 'UK' ? 'GBP' : 'USD'}
                      billingName={fullName}
                      billingEmail={emailAddress}
                      onPaymentSuccess={(txId) => handleCreateBooking(undefined, txId)}
                      onPaymentError={(err) => console.error('Stripe payment error:', err)}
                    />
                  )}

                  {paymentMethod === 'paypal' && (
                    <PayPalCheckoutForm
                      amount={getTotalInUsd()}
                      currency={paymentRegion === 'PK' ? 'PKR' : paymentRegion === 'UK' ? 'GBP' : 'USD'}
                      billingName={fullName}
                      billingEmail={emailAddress}
                      onPaymentSuccess={(txId) => handleCreateBooking(undefined, txId)}
                      onPaymentError={(err) => console.error('PayPal payment error:', err)}
                    />
                  )}

                  {(paymentMethod === 'applepay' || paymentMethod === 'googlepay') && (
                    <div className="text-center py-6">
                      <span className="inline-block bg-black text-white text-sm font-bold px-8 py-3.5">
                        {paymentMethod === 'applepay' ? 'Pay with Apple Pay' : 'Pay with Google Pay'}
                      </span>
                      <p className="text-sm text-[#666] mt-4">
                        Approve the payment in your wallet app to finish your booking.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e4e4e4] mt-8 pt-5 text-xs text-[#8a8a8a]">
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
                  {paymentMethod === 'stripe' || paymentMethod === 'paypal' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!fullName || !emailAddress) {
                          const nameEl = document.getElementById('checkout-name-input');
                          nameEl?.focus();
                          nameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                          const gate = document.getElementById(paymentMethod === 'stripe' ? 'stripe-checkout-gate' : 'paypal-checkout-gate');
                          gate?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="w-full bg-[#ffed00] text-black py-4 mt-6 font-bold text-sm cursor-pointer hover:bg-[#e6d200] transition-colors"
                    >
                      Continue to {paymentMethod === 'stripe' ? 'card' : 'PayPal'} payment
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="w-full bg-[#ffed00] text-black py-4 mt-6 font-bold text-sm cursor-pointer hover:bg-[#e6d200] transition-colors"
                    >
                      Pay {formatMoney(getTotalInUsd())}
                    </button>
                  )}

                  <p className="text-xs text-[#8a8a8a] text-center mt-4 leading-relaxed">
                    Every order is covered by our refund guarantee. By paying you accept the terms of use.
                  </p>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ── STEP 2: PROCESSING ──────────────────────────────── */}
        {step === 'loading' && (
          <div className="py-32 flex flex-col items-center justify-center text-center gap-6 min-h-[50vh]">
            <Loader2 className="w-12 h-12 animate-spin" />
            <div>
              <h3 className="font-display font-bold text-2xl leading-[0.95]">Confirming your booking</h3>
              <p className="text-sm text-[#666] mt-2">Reserving seats and issuing your tickets…</p>
            </div>
          </div>
        )}

        {/* ── STEP 3: TICKET ISSUED ───────────────────────────── */}
        {step === 'ticket' && (
          <div className="max-w-3xl mx-auto pt-14">

            <div className="text-center">
              <div className="w-14 h-14 bg-[#ffed00] flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-black stroke-[3]" />
              </div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-6">
                You're going to {event.title}.
              </h2>
              <p className="text-[#666] text-sm mt-4 max-w-md mx-auto">
                Payment confirmed and tickets sent to {emailAddress || 'your email'}. Show the barcode below at the entrance — printed or on your phone.
              </p>
            </div>

            {/* Ticket — black storytelling tile */}
            <div className="bg-black text-white mt-10">
              <div className="flex items-center justify-between px-8 py-5 border-b border-white/15">
                <span className="flex items-center gap-2 font-display font-bold text-sm tracking-wide">
                  <Ticket className="w-4 h-4 text-[#ffed00]" /> JAZBATICKET
                </span>
                <span className={`${overline} bg-[#ffed00] text-black px-3 py-1.5`}>
                  {ticketTier === 'elite' ? 'Elite' : ticketTier === 'vip' ? 'VIP' : 'General admission'}
                </span>
              </div>

              <div className="px-8 py-8">
                <span className={`${overline} text-white/50`}>Event</span>
                <h3 className="font-display font-bold text-2xl sm:text-3xl leading-[0.95] mt-2">
                  {event.title}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/15 mt-8 pt-6">
                  <div>
                    <span className={`${overline} text-white/50`}>Ticket holder</span>
                    <span className="block font-bold text-sm mt-1.5 truncate">{fullName || 'Guest'}</span>
                  </div>
                  <div>
                    <span className={`${overline} text-white/50`}>Venue</span>
                    <span className="block font-bold text-sm mt-1.5 truncate">{event.location}</span>
                  </div>
                  <div>
                    <span className={`${overline} text-white/50`}>Time</span>
                    <span className="block font-bold text-sm mt-1.5">{event.time}</span>
                  </div>
                  <div>
                    <span className={`${overline} text-white/50`}>Seats</span>
                    <span className="block font-bold text-sm mt-1.5">Row {seatConfig} · {ticketCount}×</span>
                  </div>
                </div>

                {/* Barcode */}
                <div className="flex flex-col items-center border-t border-white/15 mt-8 pt-8">
                  <div className="bg-white h-14 w-full max-w-sm px-6 py-2 flex items-center justify-center gap-[2px]">
                    {[1, 3, 1.5, 4, 1, 2, 3.5, 1, 4, 1.5, 3, 1, 2, 4, 1.5, 1, 3, 2.5, 1, 3.5].map((w, i) => (
                      <span key={i} className="h-full bg-black" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <span className="font-bold text-xs tracking-[0.25em] mt-4">{ticketCode}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 bg-black text-white py-4 font-bold text-sm cursor-pointer hover:bg-neutral-800 transition-colors"
              >
                <Printer className="w-4 h-4" /> Download / Print ticket
              </button>
              <button
                type="button"
                onClick={onGoToDashboard}
                className="flex items-center justify-center gap-2 bg-white text-black border border-black py-4 font-bold text-sm cursor-pointer hover:bg-[#f7f7f7] transition-colors"
              >
                View in your dashboard
              </button>
            </div>

            {/* While the confirmation is on screen, printing outputs only the ticket */}
            <TicketPrintSheet
              ticket={{
                eventTitle: event.title,
                category: event.category,
                date: event.fullDate || `${event.date}, ${event.year || '2026'}`,
                time: event.time,
                venue: event.location,
                holderName: fullName || 'Guest',
                holderEmail: emailAddress || auth.currentUser?.email || '',
                orderId: ticketCode,
                seat: seatConfig,
                quantity: ticketCount,
                tier: ticketTier,
                code: ticketCode,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
