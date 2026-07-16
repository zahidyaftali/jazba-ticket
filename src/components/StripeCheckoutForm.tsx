import React, { useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react';
import { auth } from '../firebase';

// Publishable keys are public by design (they ship to every browser), so the
// live key is embedded as a fallback; an env var still overrides it.
const STRIPE_PUBLISHABLE_KEY =
  (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_LIEA9yOMVhHkwUngSunBepOB';

// Initialize stripe load promise lazily
let stripePromise: Promise<Stripe | null> | null = null;
const getStripePromise = () => {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return null;
  }
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

interface StripeCheckoutFormProps {
  /** USD total — display only; the server recomputes the real charge. */
  amount: number;
  currency: 'USD' | 'PKR' | 'GBP';
  eventId: string;
  tier: 'general' | 'vip' | 'elite';
  quantity: number;
  promoCode: string;
  billingName: string;
  billingEmail: string;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentError: (err: string) => void;
}

function LiveStripeForm({
  currency,
  eventId,
  tier,
  quantity,
  promoCode,
  billingName,
  billingEmail,
  onPaymentSuccess,
  onPaymentError
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (!billingName || !billingEmail) {
      setErrorMessage('Please fill in your full name and email address above first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const cardEl = elements.getElement(CardElement);
      if (!cardEl) {
        throw new Error('Card field not loaded. Please refresh and try again.');
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be signed in to pay. Please log in and try again.');
      }
      const idToken = await user.getIdToken();

      // 1. Ask our server to create a PaymentIntent for this order.
      //    The server verifies the login and computes the price itself.
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          tier,
          quantity,
          promoCode,
          currency,
          idToken,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.clientSecret) {
        throw new Error(data.error || 'Could not start the payment. Please try again.');
      }

      // 2. Confirm the card payment — this is where the charge happens.
      const { paymentIntent, error } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardEl as any,
          billing_details: {
            name: billingName,
            email: billingEmail,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Your card was declined.');
        onPaymentError(error.message || 'Card payment failed.');
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onPaymentSuccess(paymentIntent.id);
      } else {
        throw new Error('Payment was not completed. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.message || 'An unexpected error occurred during checkout.';
      setErrorMessage(msg);
      onPaymentError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const CARD_ELEMENT_OPTIONS = {
    style: {
      base: {
        color: '#171717',
        fontFamily: '"Inter", sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '14px',
        fontWeight: '500',
        '::placeholder': {
          color: '#a3a3a3',
        },
      },
      invalid: {
        color: '#dc2626',
        iconColor: '#dc2626',
      },
    },
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleLivePayment} className="space-y-4" id="live-stripe-form">
      <div className="bg-[#FAFBFD] rounded-xl p-4.5 transition-all">
        <label className="block text-[10px] font-bold text-sentence tracking-wider text-neutral-400 mb-2 flex items-center justify-between">
          <span>Card details</span>
          <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-black">Secure</span>
        </label>

        <div className="py-2">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-3.5 bg-[#E34718] hover:bg-[#C23A12] text-white rounded-xl text-xs font-black text-sentence tracking-widest transition-all shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing payment...</span>
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5" />
            <span>Pay Now</span>
          </>
        )}
      </button>
    </form>
  );
}

export default function StripeCheckoutForm(props: StripeCheckoutFormProps) {
  const stripePromiseInstance = getStripePromise();

  return (
    <div className="bg-white rounded-2xl p-5.5 sm:p-7 shadow-xs font-sans mt-2" id="stripe-checkout-gate">
      {/* Upper Brand Header */}
      <div className="flex items-center justify-between gap-4 pb-3.5 mb-5.5 text-left">
        <div>
          <h3 className="text-xs font-black text-neutral-900 text-sentence tracking-widest flex items-center gap-1.5 leading-none">
            <span className="text-violet-600 font-extrabold text-sm lowercase tracking-tighter">stripe</span> Direct Checkout
          </h3>
          <p className="text-[10px] text-neutral-400 font-bold text-sentence tracking-wider mt-1.5">
            PCI-DSS COMPLIANT ENCRYPTION
          </p>
        </div>
        <div className="bg-neutral-50 px-3 py-1.5 rounded-lg text-right leading-none shrink-0">
          <span className="text-[9px] text-neutral-400 font-bold text-sentence tracking-wider block">Total Payable:</span>
          <span className="text-sm font-mono font-black text-neutral-800 tracking-tight block mt-1">
            {props.currency === 'PKR' && `Rs. ${Math.round(props.amount * 280).toLocaleString()}`}
            {props.currency === 'GBP' && `£${(props.amount * 0.78).toFixed(2)}`}
            {props.currency === 'USD' && `$${props.amount.toFixed(2)}`}
          </span>
        </div>
      </div>

      {stripePromiseInstance ? (
        <Elements stripe={stripePromiseInstance}>
          <LiveStripeForm {...props} />
        </Elements>
      ) : (
        <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-xs font-semibold flex items-start gap-2 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Card payments are temporarily unavailable — the payment gateway is not configured.
            Please contact support or try again later.
          </span>
        </div>
      )}

      {/* Stripe compliance lock trust text */}
      <div className="pt-4 mt-4.5 flex flex-col sm:flex-row gap-2 items-center justify-between text-[9px] font-bold text-neutral-400 font-mono text-sentence tracking-widest">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          256-Bit SSL Encryption
        </span>
        <span className="text-neutral-450">Powered by Stripe</span>
      </div>
    </div>
  );
}
