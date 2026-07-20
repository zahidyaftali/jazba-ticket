import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Printer, ShieldCheck, AlertCircle } from 'lucide-react';
import { EventItem } from '../types';
import { auth } from '../firebase';
import { createBooking } from '../services/backendService';
import TicketPrintSheet from './TicketPrintSheet';

interface CheckoutSuccessPageProps {
  sessionId: string;
  events: EventItem[];
  onGoToDashboard: () => void;
  onBrowseEvents: () => void;
}

interface VerifiedSession {
  paid: boolean;
  orderId: string;
  eventId: string;
  tier: 'general' | 'vip' | 'elite';
  quantity: number;
  seat: string;
  buyerUid: string;
  buyerEmail: string;
  buyerName: string;
  amountUsd: number;
  promoApplied: boolean;
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

/**
 * Where Stripe's hosted Checkout page sends the buyer back to. The payment
 * itself already happened entirely on Stripe's own domain — this page only
 * re-verifies it server-side, writes the booking once, shows the ticket,
 * then hands the buyer off to their profile (My tickets).
 */
export default function CheckoutSuccessPage({ sessionId, events, onGoToDashboard, onBrowseEvents }: CheckoutSuccessPageProps) {
  const [status, setStatus] = useState<'verifying' | 'error' | 'done'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [session, setSession] = useState<VerifiedSession | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!sessionId) {
        setErrorMsg('This link is missing its checkout session — if you just paid, check your email for the confirmation.');
        setStatus('error');
        return;
      }

      // Firebase auth can still be resolving right after the full-page
      // redirect back from Stripe, so give it a moment before giving up.
      let user = auth.currentUser;
      for (let i = 0; i < 20 && !user; i++) {
        await new Promise((r) => setTimeout(r, 150));
        user = auth.currentUser;
      }

      try {
        const res = await fetch(`/api/get-checkout-session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setErrorMsg(data.error || 'Could not verify this payment.');
          setStatus('error');
          return;
        }
        const verified = data as VerifiedSession;
        if (!verified.paid) {
          setErrorMsg("This payment hasn't completed yet. If you were charged, please contact support with your order details.");
          setStatus('error');
          return;
        }
        if (!user || user.uid !== verified.buyerUid) {
          setErrorMsg('Please sign in with the account you used to pay, then reopen this confirmation link.');
          setStatus('error');
          return;
        }

        // Write the booking — reusing the Stripe order id as the doc id
        // makes a refreshed page safely idempotent (see createBooking()).
        try {
          const barcodeVal = `8${Math.floor(10000000000 + Math.random() * 90000000000)}`;
          await createBooking({
            id: verified.orderId,
            bookingNumber: verified.orderId,
            userId: user.uid,
            eventId: verified.eventId,
            ticketType: verified.tier,
            quantity: verified.quantity,
            amount: verified.amountUsd,
            paymentStatus: 'paid',
            bookingStatus: 'active',
            qrCode: barcodeVal,
            createdAt: new Date().toISOString(),
            tier: verified.tier,
            bookingDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            orderId: verified.orderId,
            seat: verified.seat,
            barCode: barcodeVal,
            pricePaid: verified.amountUsd,
            paymentMethod: 'stripe',
            billingName: verified.buyerName || user.displayName || 'Guest',
            billingEmail: verified.buyerEmail || user.email || '',
            promoApplied: verified.promoApplied,
          } as any);
        } catch (err) {
          // Already booked (refresh/back-button) — harmless, ticket still shows below.
          console.error('createBooking after Stripe checkout:', err);
        }

        if (cancelled) return;
        setSession(verified);
        setStatus('done');
        redirectTimer.current = setTimeout(onGoToDashboard, 8000);
      } catch (err) {
        console.error('Checkout success verification failed:', err);
        if (!cancelled) {
          setErrorMsg('Something went wrong confirming your payment. Please contact support if you were charged.');
          setStatus('error');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const event = session ? events.find((e) => e.id === session.eventId) : undefined;

  if (status === 'verifying') {
    return (
      <div className="jz-page min-h-[70vh] bg-white flex items-center justify-center px-6 text-center">
        <div>
          <Loader2 className="w-10 h-10 animate-spin mx-auto" />
          <h1 className="font-display font-bold text-2xl mt-6">Confirming your payment…</h1>
          <p className="text-sm text-[#666] mt-2">Please don't close this tab.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="jz-page min-h-[70vh] bg-white flex items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <AlertCircle className="w-10 h-10 mx-auto text-[#be6464]" />
          <h1 className="font-display font-bold text-2xl mt-6">We couldn't confirm that order</h1>
          <p className="text-sm text-[#666] mt-3 leading-relaxed">{errorMsg}</p>
          <button
            onClick={onBrowseEvents}
            className="mt-8 bg-black text-white font-bold text-sm px-6 py-3.5 cursor-pointer hover:bg-neutral-800 transition-colors"
          >
            Browse events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="checkout-success-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-14">
        <div className="text-center">
          <div className="w-14 h-14 bg-[#ffed00] flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-black stroke-[3]" />
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-6">
            {event ? `Thank you — you're going to ${event.title}.` : 'Thank you — your payment is confirmed.'}
          </h2>
          <p className="text-[#666] text-sm mt-4 max-w-md mx-auto">
            Tickets sent to {session?.buyerEmail || 'your email'}. Taking you to your profile shortly — or head there now.
          </p>
        </div>

        {event && session && (
          <div className="bg-black text-white mt-10">
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/15">
              <span className="flex items-center gap-2 font-display font-bold text-sm tracking-wide">
                <ShieldCheck className="w-4 h-4 text-[#ffed00]" /> JAZBA TICKETS
              </span>
              <span className={`${overline} bg-[#ffed00] text-black px-3 py-1.5`}>
                {session.tier === 'elite' ? 'Elite' : session.tier === 'vip' ? 'VIP' : 'General admission'}
              </span>
            </div>

            <div className="px-8 py-8">
              <span className={`${overline} text-white/50`}>Event</span>
              <h3 className="font-display font-bold text-2xl sm:text-3xl leading-[0.95] mt-2">{event.title}</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/15 mt-8 pt-6">
                <div>
                  <span className={`${overline} text-white/50`}>Ticket holder</span>
                  <span className="block font-bold text-sm mt-1.5 truncate">{session.buyerName || 'Guest'}</span>
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
                  <span className="block font-bold text-sm mt-1.5">Row {session.seat} · {session.quantity}×</span>
                </div>
              </div>

              <div className="flex flex-col items-center border-t border-white/15 mt-8 pt-8">
                <div className="bg-white h-14 w-full max-w-sm px-6 py-2 flex items-center justify-center gap-[2px]">
                  {[1, 3, 1.5, 4, 1, 2, 3.5, 1, 4, 1.5, 3, 1, 2, 4, 1.5, 1, 3, 2.5, 1, 3.5].map((w, i) => (
                    <span key={i} className="h-full bg-black" style={{ width: `${w}px` }} />
                  ))}
                </div>
                <span className="font-bold text-xs tracking-[0.25em] mt-4">{session.orderId}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <button
            type="button"
            onClick={() => {
              if (redirectTimer.current) clearTimeout(redirectTimer.current);
              window.print();
            }}
            className="flex items-center justify-center gap-2 bg-black text-white py-4 font-bold text-sm cursor-pointer hover:bg-neutral-800 transition-colors"
          >
            <Printer className="w-4 h-4" /> Download / Print ticket
          </button>
          <button
            type="button"
            onClick={onGoToDashboard}
            className="flex items-center justify-center gap-2 bg-white text-black border border-black py-4 font-bold text-sm cursor-pointer hover:bg-[#f7f7f7] transition-colors"
          >
            View tickets in my profile
          </button>
        </div>

        {event && session && (
          <TicketPrintSheet
            ticket={{
              eventTitle: event.title,
              category: event.category,
              date: event.fullDate || `${event.date}, ${event.year || '2026'}`,
              time: event.time,
              venue: event.location,
              holderName: session.buyerName || 'Guest',
              holderEmail: session.buyerEmail,
              orderId: session.orderId,
              seat: session.seat,
              quantity: session.quantity,
              tier: session.tier,
              code: session.orderId,
            }}
          />
        )}
      </div>
    </div>
  );
}
