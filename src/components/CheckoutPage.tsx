import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, MapPin, Clock, Ticket, Check, User, Mail,
  Printer, CreditCard, Smartphone, ShieldCheck, Wallet, Globe,
  Calendar, Info, AlertCircle, ShoppingBag, Sparkles, Loader2
} from 'lucide-react';
import { EventItem } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import StripeCheckoutForm from './StripeCheckoutForm';
import PayPalCheckoutForm from './PayPalCheckoutForm';

interface CheckoutPageProps {
  event: EventItem;
  initialQuantity?: number;
  initialTier?: 'general' | 'vip' | 'elite';
  onBack: () => void;
  onGoToDashboard: () => void;
}

export default function CheckoutPage({ 
  event, 
  initialQuantity = 1, 
  initialTier = 'general', 
  onBack,
  onGoToDashboard
}: CheckoutPageProps) {
  // --- States ---
  const [step, setStep] = useState<'details' | 'loading' | 'ticket'>('details');
  const [ticketCount, setTicketCount] = useState(initialQuantity);
  const [ticketTier, setTicketTier] = useState<'general' | 'vip' | 'elite'>(initialTier);
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [ticketCode] = useState(() => `TT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [seatConfig] = useState(() => `${String.fromCharCode(65 + Math.floor(Math.random() * 10))}-${Math.floor(1 + Math.random() * 24)}`);

  // Promo code states
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Regional Payment System configuration states
  const [paymentRegion, setPaymentRegion] = useState<'PK' | 'UK' | 'US'>('PK');
  const [paymentMethod, setPaymentMethod] = useState<string>('easypaisa');
  const [pkMobileNumber, setPkMobileNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isDetectingIp, setIsDetectingIp] = useState(true);

  // Auto detect IP zone on checkout initialization
  useEffect(() => {
    setIsDetectingIp(true);
    fetch('https://ipapi.co/json/')
      .then((res) => {
        if (!res.ok) throw new Error('API down');
        return res.json();
      })
      .then((data) => {
        if (data && data.country_code) {
          const cc = data.country_code.toUpperCase();
          if (cc === 'PK') {
            setPaymentRegion('PK');
            setPaymentMethod('easypaisa');
          } else if (cc === 'GB' || cc === 'UK') {
            setPaymentRegion('UK');
            setPaymentMethod('paypal');
          } else if (cc === 'US') {
            setPaymentRegion('US');
            setPaymentMethod('card');
          } else {
            setPaymentRegion('PK');
            setPaymentMethod('easypaisa');
          }
        }
      })
      .catch((err) => {
        console.warn('IP geolocator offline, defaulting to Pakistan PK standard.', err);
        setPaymentRegion('PK');
        setPaymentMethod('easypaisa');
      })
      .finally(() => {
        setIsDetectingIp(false);
      });
  }, []);

  const handleRegionChange = (newRegion: 'PK' | 'UK' | 'US') => {
    setPaymentRegion(newRegion);
    if (newRegion === 'PK') {
      setPaymentMethod('easypaisa');
    } else if (newRegion === 'UK') {
      setPaymentMethod('paypal');
    } else {
      setPaymentMethod('card');
    }
  };

  const tierPricing = {
    general: event.price,
    vip: Math.round(event.price * 1.5),
    elite: Math.round(event.price * 2.1),
  };

  const getTierPrice = () => tierPricing[ticketTier];
  const getSubtotal = () => getTierPrice() * ticketCount;

  const getDiscount = () => {
    if (!promoApplied) return 0;
    // JAZBA18 gives 18% off
    return Math.round(getSubtotal() * 0.18);
  };

  const getFees = () => {
    // 8% service fee on remaining subtotal
    return Math.round((getSubtotal() - getDiscount()) * 0.08);
  };

  const getTotalInUsd = () => {
    return getSubtotal() - getDiscount() + getFees();
  };

  const getConvertedPrice = (usdAmount: number) => {
    if (paymentRegion === 'PK') {
      return `Rs. ${Math.round(usdAmount * 280).toLocaleString()}`;
    }
    if (paymentRegion === 'UK') {
      return `£${(usdAmount * 0.78).toFixed(2)}`;
    }
    return `$${usdAmount.toFixed(2)}`;
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoCode.trim().toUpperCase();
    if (clean === 'JAZBA18' || clean === 'EVENT18' || clean === 'HAMILTON18') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid coupon. Try using JAZBA18');
      setPromoApplied(false);
    }
  };

  const handleCreateBooking = async (e?: React.FormEvent, stripeTransactionId?: string) => {
    if (e) e.preventDefault();
    if (!fullName || !emailAddress) return;
    
    // Trigger loading spinner
    setStep('loading');
    window.scrollTo({ top: 0, behavior: 'instant' });

    const user = auth.currentUser;
    const bDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const bPrice = getTotalInUsd();
    const barcodeVal = `8${Math.floor(10000000000 + Math.random() * 90000000000)}`;

    if (user) {
      const bRef = doc(db, 'bookings', ticketCode);
      try {
        await setDoc(bRef, {
          id: ticketCode,
          eventId: event.id,
          quantity: ticketCount,
          tier: ticketTier,
          bookingDate: bDate,
          orderId: ticketCode,
          seat: seatConfig,
          barCode: barcodeVal,
          pricePaid: bPrice,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          paymentRegion: paymentRegion,
          paymentMethod: paymentMethod,
          paymentStatus: "paid",
          stripeTransactionId: stripeTransactionId || null,
          billingName: fullName,
          billingEmail: emailAddress,
          promoApplied: promoApplied,
          discountAmount: getDiscount()
        });
      } catch (err: any) {
        console.error("Failed to write to Firestore:", err);
      }
    } else {
      // Save locally to localStorage for guests
      try {
        const local = localStorage.getItem('jazbaticket_bookings') || '[]';
        const list = JSON.parse(local);
        list.push({
          eventId: event.id,
          quantity: ticketCount,
          tier: ticketTier,
          bookingDate: bDate,
          orderId: ticketCode,
          seat: seatConfig,
          barCode: barcodeVal,
          pricePaid: bPrice,
          createdAt: new Date().toISOString(),
          paymentRegion: paymentRegion,
          paymentMethod: paymentMethod,
          paymentStatus: "paid",
          stripeTransactionId: stripeTransactionId || null,
          billingName: fullName,
          billingEmail: emailAddress,
          promoApplied: promoApplied,
          discountAmount: getDiscount()
        });
        localStorage.setItem('jazbaticket_bookings', JSON.stringify(list));
      } catch (err) {
        console.error("Failed to write local database:", err);
      }
    }

    setTimeout(() => {
      setStep('ticket');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1500);
  };

  return (
    <div className="bg-neutral-50/50 min-h-screen pb-24 pt-8" id="checkout-page-root">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* NAVIGATION ROUTE BREADCRUMB */}
        <div className="mb-8 flex items-center justify-between">
          <button 
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-bold text-sentence tracking-wider transition-all shadow-md active:scale-95 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Event Details</span>
          </button>

          <span className="text-[10px] bg-neutral-100   text-neutral-500 font-bold text-sentence tracking-widest px-3.5 py-1.5 rounded-full">
            Secure Checkout
          </span>
        </div>

        {/* STEP 1: MAIN GRID LAYOUT FOR CHECKOUT DETAILS & CALCULATOR */}
        {step === 'details' && (
          <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT CONTENT COLUMN: 8 Columns of secure fields & payment methods */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* PAGE MAIN BANNER & HEADLINE */}
              <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
                <span className="bg-[#E34718] text-white text-[10px] text-sentence font-black tracking-widest px-3 py-1.5 rounded-full inline-block">
                  Checkout System
                </span>
                <h1 className="text-2xl sm:text-3xl font-display font-medium text-neutral-950 mt-4 tracking-tight">
                  Secure Ticket Checkout
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-2 leading-relaxed">
                  Review your tickets and billing details, then choose a payment method below to confirm your booking.
                </p>
              </div>

              {/* CARD 1: PERSONAL INFORMATION BILLING DATA */}
              <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left">
                <div className="  pb-3 mb-6">
                  <h3 className="text-xs font-black text-neutral-400 text-sentence tracking-widest flex items-center gap-2">
                    <User className="w-4.5 h-4.5 text-[#E34718]" /> Personal Billing Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold text-sentence tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full bg-white   rounded-xl px-4 py-3 text-sm font-semibold text-neutral-800 placeholder-neutral-300  focus:ring-0 focus:outline-none transition-colors"
                      id="checkout-name-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-sentence tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="e.g. john@example.com"
                      required
                      className="w-full bg-white   rounded-xl px-4 py-3 text-sm font-semibold text-neutral-800 placeholder-neutral-300  focus:ring-0 focus:outline-none transition-colors"
                      id="checkout-email-input"
                    />
                    <p className="text-[10px] text-neutral-400 font-medium mt-1.5">
                      Your tickets will be sent to this email address.
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 2: REGIONAL PAYMENT SYSTEM CONTAINER */}
              <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-left" id="payment-system-container">
                
                {/* Header with Country detection indicators */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4   mb-6">
                  <div>
                    <h3 className="text-xs font-black text-neutral-400 text-sentence tracking-widest flex items-center gap-2">
                      <Globe className="w-4.5 h-4.5 text-[#E34718]" /> Payment Method
                    </h3>
                  </div>

                  {/* Manual Bypass Selector */}
                  <div className="flex items-center gap-1 bg-neutral-150 p-1.5 rounded-xl   font-semibold text-xs shrink-0 bg-neutral-100">
                    <span className="text-[10px] text-neutral-400 text-sentence font-black px-2 tracking-wider">Zone:</span>
                    <button
                      type="button"
                      onClick={() => handleRegionChange('PK')}
                      className={`px-3 py-1.5 text-[10px] rounded-lg transition-all cursor-pointer font-bold ${paymentRegion === 'PK' ? 'bg-white shadow-xs font-black text-[#E34718]' : 'text-neutral-500 hover:text-black'}`}
                    >
                      PK 🇵🇰
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegionChange('UK')}
                      className={`px-3 py-1.5 text-[10px] rounded-lg transition-all cursor-pointer font-bold ${paymentRegion === 'UK' ? 'bg-white shadow-xs font-black text-[#E34718]' : 'text-neutral-500 hover:text-black'}`}
                    >
                      UK 🇬🇧
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegionChange('US')}
                      className={`px-3 py-1.5 text-[10px] rounded-lg transition-all cursor-pointer font-bold ${paymentRegion === 'US' ? 'bg-white shadow-xs font-black text-[#E34718]' : 'text-neutral-500 hover:text-black'}`}
                    >
                      US 🇺🇸
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <span className="block text-[11px] font-bold text-sentence tracking-wider text-neutral-400 mb-3 block">
                      Select Payment Method
                    </span>

                    {/* PAKISTAN ZONE */}
                    {paymentRegion === 'PK' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div 
                          onClick={() => setPaymentMethod('easypaisa')}
                          className={`p-4 rounded-xl  cursor-pointer select-none transition-all flex flex-col justify-between h-20 text-left ${
                            paymentMethod === 'easypaisa'
                              ? ' bg-[#E34718]/5'
                              : '  hover:bg-neutral-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-emerald-600 block">easypaisa</span>
                            <div className={`w-4 h-4 rounded-full  flex items-center justify-center ${paymentMethod === 'easypaisa' ? 'bg-[#E34718] text-[9px] text-white ' : 'bg-transparent '}`}>
                              {paymentMethod === 'easypaisa' && '✓'}
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold block">Mobile Wallet</span>
                        </div>

                        <div 
                          onClick={() => setPaymentMethod('jazzcash')}
                          className={`p-4 rounded-xl  cursor-pointer select-none transition-all flex flex-col justify-between h-20 text-left ${
                            paymentMethod === 'jazzcash'
                              ? ' bg-[#E34718]/5'
                              : '  hover:bg-neutral-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-red-600 block text-red-705 tracking-tight font-sans">JazzCash</span>
                            <div className={`w-4 h-4 rounded-full  flex items-center justify-center ${paymentMethod === 'jazzcash' ? 'bg-[#E34718] text-[9px] text-white ' : 'bg-transparent '}`}>
                              {paymentMethod === 'jazzcash' && '✓'}
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold block">Mobile Wallet</span>
                        </div>

                        <div 
                          onClick={() => setPaymentMethod('stripe')}
                          className={`p-4 rounded-xl  cursor-pointer select-none transition-all flex flex-col justify-between h-20 text-left ${
                            paymentMethod === 'stripe'
                              ? ' bg-[#E34718]/5'
                              : '  hover:bg-neutral-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-violet-600 font-sans block leading-none">stripe card</span>
                            <div className={`w-4 h-4 rounded-full  flex items-center justify-center ${paymentMethod === 'stripe' ? 'bg-[#E34718] text-[9px] text-white ' : 'bg-transparent '}`}>
                              {paymentMethod === 'stripe' && '✓'}
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold block">Credit/Debit</span>
                        </div>
                      </div>
                    )}

                    {/* UNITED KINGDOM ZONE */}
                    {paymentRegion === 'UK' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div 
                          onClick={() => setPaymentMethod('paypal')}
                          className={`p-4 rounded-xl  cursor-pointer select-none transition-all flex flex-col justify-between h-20 text-left ${
                            paymentMethod === 'paypal'
                              ? ' bg-[#E34718]/5'
                              : '  hover:bg-neutral-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-blue-700 font-sans block leading-none">PayPal</span>
                            <div className={`w-4 h-4 rounded-full  flex items-center justify-center ${paymentMethod === 'paypal' ? 'bg-[#E34718] text-[9px] text-white ' : 'bg-transparent '}`}>
                              {paymentMethod === 'paypal' && '✓'}
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold">Express Secure</span>
                        </div>

                        <div 
                          onClick={() => setPaymentMethod('stripe')}
                          className={`p-4 rounded-xl  cursor-pointer select-none transition-all flex flex-col justify-between h-20 text-left col-span-2 ${
                            paymentMethod === 'stripe'
                              ? ' bg-[#E34718]/5'
                              : '  hover:bg-neutral-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-violet-650 text-violet-600 font-sans block leading-none">stripe checkout card</span>
                            <div className={`w-4 h-4 rounded-full  flex items-center justify-center ${paymentMethod === 'stripe' ? 'bg-[#E34718] text-[9px] text-white ' : 'bg-transparent '}`}>
                              {paymentMethod === 'stripe' && '✓'}
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold">PCI-Compliant Credit/Debit Clearing</span>
                        </div>
                      </div>
                    )}

                    {/* UNITED STATES ZONE */}
                    {paymentRegion === 'US' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div 
                          onClick={() => setPaymentMethod('stripe')}
                          className={`p-4 rounded-xl  cursor-pointer select-none transition-all flex flex-col justify-between h-20 text-left ${
                            paymentMethod === 'stripe'
                              ? ' bg-[#E34718]/5'
                              : '  hover:bg-neutral-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-violet-600 font-sans block leading-none">stripe card</span>
                            <div className={`w-4 h-4 rounded-full  flex items-center justify-center ${paymentMethod === 'stripe' ? 'bg-[#E34718] text-[9px] text-white ' : 'bg-transparent '}`}>
                              {paymentMethod === 'stripe' && '✓'}
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold">Visa / Master / Amex</span>
                        </div>

                        <div 
                          onClick={() => setPaymentMethod('paypal')}
                          className={`p-4 rounded-xl  cursor-pointer select-none transition-all flex flex-col justify-between h-20 text-left ${
                            paymentMethod === 'paypal'
                              ? ' bg-[#E34718]/5'
                              : '  hover:bg-neutral-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-blue-700 font-sans block leading-none">PayPal</span>
                            <div className={`w-4 h-4 rounded-full  flex items-center justify-center ${paymentMethod === 'paypal' ? 'bg-[#E34718] text-[9px] text-white ' : 'bg-transparent '}`}>
                              {paymentMethod === 'paypal' && '✓'}
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold font-sans">Express Secure</span>
                        </div>

                        <div 
                          onClick={() => setPaymentMethod('applepay')}
                          className={`p-4 rounded-xl  cursor-pointer select-none transition-all flex flex-col justify-between h-20 text-left ${
                            paymentMethod === 'applepay'
                              ? ' bg-neutral-900/5'
                              : '  hover:bg-neutral-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-neutral-900 font-sans block leading-none"> Pay</span>
                            <div className={`w-4 h-4 rounded-full  flex items-center justify-center ${paymentMethod === 'applepay' ? 'bg-black text-[9px] text-white ' : 'bg-transparent '}`}>
                              {paymentMethod === 'applepay' && '✓'}
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold font-sans">Apple Accounts</span>
                        </div>

                        <div 
                          onClick={() => setPaymentMethod('googlepay')}
                          className={`p-4 rounded-xl  cursor-pointer select-none transition-all flex flex-col justify-between h-20 text-left ${
                            paymentMethod === 'googlepay'
                              ? ' bg-[#E34718]/5'
                              : '  hover:bg-neutral-50 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-neutral-800 font-sans block leading-none">Google Pay</span>
                            <div className={`w-4 h-4 rounded-full  flex items-center justify-center ${paymentMethod === 'googlepay' ? 'bg-[#E34718] text-[9px] text-white ' : 'bg-transparent '}`}>
                              {paymentMethod === 'googlepay' && '✓'}
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold font-sans">Google Pay Wallet</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DETAIL ENTRY SUBFORM BASED ON PAYMENT TYPE */}
                  <div className="bg-neutral-50   rounded-2xl p-6">
                    
                    {/* Pakistan direct account details */}
                    {paymentRegion === 'PK' && (paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2   pb-2 mb-2">
                          <span className="text-xs font-bold text-neutral-700 text-sentence tracking-wider flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-[#E34718]" />
                            {paymentMethod === 'easypaisa' ? 'Easypaisa Mobile Account' : 'JazzCash Wallet Account'}
                          </span>
                          <span className="text-[9px] text-[#E34718] bg-[#E34718]/10 text-[#E34718] font-bold text-sentence tracking-wider px-2.5 py-0.5 rounded-full">
                            SMS PIN Required
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-sentence tracking-wider text-neutral-400">
                            Mobile Handset Number (11 Digits)
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-3 text-sm font-black text-neutral-500">+92</span>
                            <input 
                              type="tel" 
                              value={pkMobileNumber}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                setPkMobileNumber(val);
                              }}
                              placeholder="300 0000000"
                              required
                              className="w-full bg-white   rounded-xl pl-14 pr-4 py-3 text-sm font-mono font-bold text-neutral-800  focus:ring-0 focus:outline-none placeholder-neutral-300"
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-500 leading-normal font-semibold">
                          Enter the mobile number linked to your {paymentMethod === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} account. You'll get a confirmation prompt on your phone to approve the payment.
                        </p>
                      </div>
                    )}

                    {/* United Kingdom or United States Cards / Stripe Card */}
                    {paymentMethod === 'stripe' && (
                      <StripeCheckoutForm
                        amount={getTotalInUsd()}
                        currency={paymentRegion === 'PK' ? 'PKR' : paymentRegion === 'UK' ? 'GBP' : 'USD'}
                        billingName={fullName}
                        billingEmail={emailAddress}
                        onPaymentSuccess={(txId) => handleCreateBooking(undefined, txId)}
                        onPaymentError={(err) => console.error("Stripe payment error:", err)}
                      />
                    )}

                    {/* PayPal Checkout Form Integration */}
                    {paymentMethod === 'paypal' && (
                      <PayPalCheckoutForm
                        amount={getTotalInUsd()}
                        currency={paymentRegion === 'PK' ? 'PKR' : paymentRegion === 'UK' ? 'GBP' : 'USD'}
                        billingName={fullName}
                        billingEmail={emailAddress}
                        onPaymentSuccess={(txId) => handleCreateBooking(undefined, txId)}
                        onPaymentError={(err) => console.error("PayPal payment error:", err)}
                      />
                    )}

                    {/* US Apple / Google pay express options */}
                    {paymentRegion === 'US' && (paymentMethod === 'applepay' || paymentMethod === 'googlepay') && (
                      <div className="text-center py-4 space-y-3">
                        <span className="text-[10px] font-bold text-neutral-400 text-sentence tracking-widest block">
                          Express Checkout
                        </span>
                        <div className="inline-flex items-center gap-2 bg-black text-white rounded-xl py-2 px-6 text-xs font-bold shadow-md">
                          <span>{paymentMethod === 'applepay' ? 'Apple Pay Enabled' : 'Google Pay Enabled'}</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-normal font-semibold">
                          Confirm the payment in your wallet app to complete your booking.
                        </p>
                      </div>
                    )}

                    {/* Secure Lock Badge */}
                    <div className="pt-4   mt-4 flex flex-col sm:flex-row gap-2 items-center justify-between text-[9px] font-bold text-neutral-450 font-mono text-sentence tracking-widest text-neutral-400 col-span-2">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        256-Bit SSL Encryption
                      </span>
                      <span>PCI-DSS Compliant</span>
                    </div>

                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: 4 Columns containing Sticky billing details, pricing summary & tier choice */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start h-fit space-y-6">
              
              {/* MICRO EVENT CARD SHAPE */}
              <div className="bg-white   rounded-2xl p-5 shadow-2xs text-left">
                <span className="bg-[#E34718]/10 text-[#C23A12]   text-[9px] font-black text-sentence tracking-widest px-2.5 py-1 rounded-full inline-block">
                  Your Show Selection
                </span>
                
                <div className="mt-4 flex gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 shrink-0  ">
                    <img 
                      src={event.image} 
                      alt={event.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-bold text-sm sm:text-base text-neutral-900 leading-tight truncate">
                      {event.title}
                    </h4>
                    <p className="text-[10px] text-neutral-400 font-extrabold text-sentence tracking-wider mt-1.5 block">
                      {event.category}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4   space-y-2.5 text-xs text-neutral-600 font-semibold">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#E34718] shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#E34718] shrink-0" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#E34718] shrink-0" />
                    <span>{event.fullDate || `${event.date}, ${event.year || '2026'}`}</span>
                  </div>
                </div>
              </div>

              {/* ORDER SUMMARY & PRICING TICKETS CHANGER */}
              <div className="bg-white   rounded-2xl p-5 shadow-2xs text-left relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-[#E34718]"></div>
                
                <h3 className="text-[10px] font-black text-neutral-400 text-sentence tracking-widest mb-4">
                  Pass Summary &amp; Admission
                </h3>

                {/* SELECT TICKET TIER IN RED/GRAY BORDERS */}
                <div className="space-y-2 mb-5">
                  <span className="block text-[10px] font-bold text-neutral-400 text-sentence tracking-widest mb-1">
                    Choose Entry Section
                  </span>
                  
                  {/* General Entrance */}
                  <button 
                    type="button"
                    onClick={() => setTicketTier('general')}
                    className={`w-full text-left p-3 rounded-xl  transition-all flex items-center justify-between cursor-pointer ${
                      ticketTier === 'general' 
                        ? ' bg-[#E34718]/5' 
                        : '  bg-white'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-neutral-850 block">General Entry</span>
                      <span className="text-[9px] text-[#C23A12] font-semibold block mt-0.5 text-sentence tracking-wider">Unreserved Seating</span>
                    </div>
                    <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900">${tierPricing.general}</span>
                  </button>

                  {/* VIP Club Entry */}
                  <button 
                    type="button"
                    onClick={() => setTicketTier('vip')}
                    className={`w-full text-left p-3 rounded-xl  transition-all flex items-center justify-between cursor-pointer ${
                      ticketTier === 'vip' 
                        ? ' bg-[#E34718]/5' 
                        : '  bg-white'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-neutral-850 block">VIP Seating</span>
                      <span className="text-[9px] text-[#C23A12] font-semibold block mt-0.5 text-sentence tracking-wider">Premium Lounges</span>
                    </div>
                    <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900">${tierPricing.vip}</span>
                  </button>

                  {/* Elite Max Entry */}
                  <button 
                    type="button"
                    onClick={() => setTicketTier('elite')}
                    className={`w-full text-left p-3 rounded-xl  transition-all flex items-center justify-between cursor-pointer ${
                      ticketTier === 'elite' 
                        ? ' bg-[#E34718]/5' 
                        : '  bg-white'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-neutral-850 block">Elite Max</span>
                      <span className="text-[9px] text-[#C23A12] font-semibold block mt-0.5 text-sentence tracking-wider">Meet &amp; Gift Hampers</span>
                    </div>
                    <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900">${tierPricing.elite}</span>
                  </button>
                </div>

                {/* QUANTITY PICKER IN SAME STYLE CONTAINER */}
                <div className="flex items-center justify-between bg-neutral-50/65   rounded-xl p-3.5 mb-5 select-none">
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">Total Attendees</span>
                    <span className="text-[9px] text-neutral-400 font-semibold mt-0.5 block">Limit 10 tickets</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                      className="w-7 h-7 rounded-full   bg-white flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-100 cursor-pointer shadow-3xs text-xs"
                    >
                      -
                    </button>
                    <span className="font-display font-extrabold text-sm text-neutral-900 min-w-[20px] text-center">
                      {ticketCount}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                      className="w-7 h-7 rounded-full   bg-white flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-100 cursor-pointer shadow-3xs text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* PROMO CODE GATE */}
                <div className="  rounded-xl p-3.5 mb-5 bg-neutral-50/30 text-left">
                  <span className="text-[9px] font-black text-neutral-400 text-sentence tracking-widest block mb-1.5">Apply Event Coupon</span>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="e.g. JAZBA18 (18% OFF)"
                      className="flex-1 bg-white   rounded-lg px-2.5 py-1.5 text-xs font-bold text-sentence placeholder-neutral-300  focus:outline-none focus:ring-0"
                    />
                    <button 
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-black text-sentence tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {promoApplied && (
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1.5 flex items-center gap-1 animate-fadeIn">
                      ✓ Promo Applied: 18% Off!
                    </span>
                  )}
                  {promoError && (
                    <span className="text-[10px] text-[#E34718] font-bold block mt-1.5">
                      {promoError}
                    </span>
                  )}
                </div>

                {/* FINAL FINANCIAL CALCULATIONS BREAKDOWN */}
                <div className="bg-neutral-50/80   rounded-2xl p-4.5 space-y-2 text-xs font-bold text-neutral-500 mb-5">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{getConvertedPrice(getSubtotal())}</span>
                  </div>

                  {promoApplied && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount (18% Off)</span>
                      <span>-{getConvertedPrice(getDiscount())}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Service Fee (8%)</span>
                    <span>{getConvertedPrice(getFees())}</span>
                  </div>

                  <div className="flex justify-between text-neutral-900 text-sm font-display font-black pt-3    mt-3">
                    <span>Total Due</span>
                    <span className="text-base text-neutral-950 font-mono tracking-tight text-[#E34718]">
                      {getConvertedPrice(getTotalInUsd())}
                    </span>
                  </div>
                </div>

                {/* PRIMARY SUBMIT ACTION */}
                {paymentMethod === 'stripe' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!fullName || !emailAddress) {
                        const nameEl = document.getElementById('checkout-name-input');
                        nameEl?.focus();
                        nameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } else {
                        const stripeEl = document.getElementById('stripe-checkout-gate');
                        stripeEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        stripeEl?.classList.add('ring-2', 'ring-violet-500', 'ring-offset-2');
                        setTimeout(() => {
                          stripeEl?.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2');
                        }, 2000);
                      }
                    }}
                    className="w-full bg-neutral-950 hover:bg-neutral-900 text-white py-4 rounded-full font-bold text-xs text-sentence tracking-wider transition-all shadow-md active:scale-97 cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4 text-violet-400 animate-pulse" />
                    <span>Pay via Stripe form</span>
                  </button>
                ) : paymentMethod === 'paypal' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!fullName || !emailAddress) {
                        const nameEl = document.getElementById('checkout-name-input');
                        nameEl?.focus();
                        nameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } else {
                        const paypalEl = document.getElementById('paypal-checkout-gate');
                        paypalEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        paypalEl?.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2');
                        setTimeout(() => {
                          paypalEl?.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2');
                        }, 2000);
                      }
                    }}
                    className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white py-4 rounded-full font-bold text-xs text-sentence tracking-wider transition-all shadow-md active:scale-97 cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Wallet className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>Pay via PayPal Checkout</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-[#E34718] hover:bg-neutral-900 text-white py-4 rounded-full font-bold text-xs text-sentence tracking-wider transition-all shadow-md active:scale-97 cursor-pointer text-center"
                  >
                    Complete Reservation &amp; Pay
                  </button>
                )}

                <p className="text-[10px] text-neutral-400 text-center font-bold mt-3 leading-snug">
                  By completing this purchase, you agree to Jazba Ticket's terms of service.
                </p>

              </div>
            </div>

          </form>
        )}

        {/* STEP 2: PROCESSING TRANSACTION LOADER SCREEN */}
        {step === 'loading' && (
          <div className="py-24 flex flex-col items-center justify-center text-center gap-5 min-h-[50vh]">
            <Loader2 className="w-16 h-16 text-[#E34718] animate-spin" />
            <div className="space-y-1.5 mt-2">
              <h3 className="font-display font-black text-xl text-neutral-950 tracking-tight">Processing Secure Booking</h3>
              <p className="text-xs text-neutral-400 font-bold tracking-wide text-sentence">Securing entrance seats and compiling ticketing barcode...</p>
            </div>
          </div>
        )}

        {/* STEP 3: VOUCHER TICKET CERTIFICATE COMPLETED STATE */}
        {step === 'ticket' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn text-left">
            
            {/* Completion metrics */}
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-2xs text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto   shadow-3xs">
                <Check className="w-7 h-7 stroke-[3.5]" />
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 tracking-tight leading-none">
                Admission Passes Issued Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium max-w-xl mx-auto leading-relaxed">
                Your payment was successful and your seats are booked. Print this ticket or simply show the QR code on your phone at the venue entrance.
              </p>
            </div>

            {/* THE PREMIUM TICKET PASSPORT LAYOUT */}
            <div className="relative bg-[#E34718]   rounded-3xl overflow-hidden shadow-lg text-white flex flex-col p-6 sm:p-8">
              
              {/* Backplate geometric points */}
              <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none"></div>

              {/* Punch holes styling left and right */}
              <div className="absolute top-[52%] -left-4 w-8 h-8 bg-neutral-50/50   rounded-full z-10"></div>
              <div className="absolute top-[52%] -right-4 w-8 h-8 bg-neutral-50/50   rounded-full z-10"></div>

              {/* Title logo space */}
              <div className="flex items-center justify-between pb-4   mb-6 relative z-10 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-white" />
                  <span className="font-display font-black text-sm text-sentence tracking-widest text-white leading-none">
                    JAZBATICKET PASS
                  </span>
                </div>
                <span className="font-mono text-[9px] font-black tracking-widest text-sentence bg-neutral-900 text-[#E34718] px-3.5 py-1 rounded-full  ">
                  {ticketTier === 'elite' ? 'ELITE ACCESS' : ticketTier === 'vip' ? 'VIP GUEST' : 'GENERAL ENTRY'}
                </span>
              </div>

              {/* Main voucher fields */}
              <div className="relative z-10 space-y-6 text-white text-left">
                <div>
                  <span className="text-[10px] text-sentence tracking-widest font-bold opacity-60">Production Title</span>
                  <h3 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight leading-tight text-sentence mt-1 truncate">
                    {event.title}
                  </h3>
                </div>

                {/* Metrics detail row */}
                <div className="grid grid-cols-2 gap-4   pt-4 text-xs font-bold text-white/90">
                  <div>
                    <span className="block text-[8px] text-sentence tracking-widest opacity-60 mb-0.5">Attendee / Holder</span>
                    <span className="text-white text-sm font-extrabold truncate block">{fullName || 'Jane Doe'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-sentence tracking-widest opacity-60 mb-0.5">Entry Location</span>
                    <span className="text-white text-sm font-extrabold block truncate">{event.location}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4   pt-4 text-xs font-bold text-white/90">
                  <div>
                    <span className="block text-[8px] text-sentence tracking-widest opacity-60 mb-0.5">Performance Time</span>
                    <span className="text-white font-mono text-sm font-extrabold block">{event.time}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-sentence tracking-widest opacity-60 mb-0.5">Seating Block</span>
                    <span className="text-white text-sm font-extrabold block font-mono">Row {seatConfig} ({ticketCount} Pass{ticketCount > 1 ? 'es' : ''})</span>
                  </div>
                </div>

                {/* Barcode representation block */}
                <div className="pt-6    flex flex-col items-center gap-3.5 mt-4">
                  <div className="w-full max-w-sm h-12 flex items-center justify-center gap-[2px] bg-white py-2 px-5   rounded-xl">
                    <div className="w-[1px] h-full bg-neutral-900"></div>
                    <div className="w-[3px] h-full bg-neutral-900"></div>
                    <div className="w-[1.5px] h-full bg-neutral-900"></div>
                    <div className="w-[4px] h-full bg-neutral-900"></div>
                    <div className="w-[1px] h-full bg-neutral-900"></div>
                    <div className="w-[2px] h-full bg-neutral-900"></div>
                    <div className="w-[3.5px] h-full bg-neutral-900"></div>
                    <div className="w-[1px] h-full bg-neutral-900"></div>
                    <div className="w-[4px] h-full bg-neutral-900"></div>
                    <div className="w-[1.5px] h-full bg-neutral-900"></div>
                    <div className="w-[3px] h-full bg-neutral-900"></div>
                    <div className="w-[1px] h-full bg-neutral-900"></div>
                    <div className="w-[2px] h-full bg-neutral-900"></div>
                    <div className="w-[4px] h-full bg-neutral-900"></div>
                    <div className="w-[1.5px] h-full bg-neutral-900"></div>
                    <div className="w-[1px] h-full bg-neutral-900"></div>
                    <div className="w-[3px] h-full bg-neutral-900"></div>
                    <div className="w-[2.5px] h-full bg-neutral-900"></div>
                    <div className="w-[1px] h-full bg-neutral-900"></div>
                    <div className="w-[3.5px] h-full bg-neutral-900"></div>
                  </div>
                  <div className="text-center font-mono text-[11px] font-black text-sentence tracking-widest text-white">
                    {ticketCode}
                  </div>
                </div>

              </div>
            </div>

            {/* ACTION DIRECTIVE BUTTONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-850 text-white py-3.5 rounded-full font-bold text-xs text-sentence tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#E34718]" />
                Print Ticket
              </button>

              <button
                type="button"
                onClick={onGoToDashboard}
                className="flex items-center justify-center bg-white   hover:bg-neutral-50 text-neutral-800 py-3.5 rounded-full font-bold text-xs text-sentence tracking-wider transition-all shadow-3xs cursor-pointer"
              >
                View in Your Dashboard ↗
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
