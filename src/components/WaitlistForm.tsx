import React, { useState } from 'react';
import { BellRing, Check, Loader2 } from 'lucide-react';
import { auth, accountEmail } from '../firebase';
import { joinWaitlist } from '../services/organizerToolsService';

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

/** "Sold out — join the waitlist": name and email, one entry per email. */
export default function WaitlistForm({
  eventId, eventTitle, tier = '', compact = false,
}: { eventId: string; eventTitle: string; tier?: string; compact?: boolean }) {
  const user = auth.currentUser;
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user ? accountEmail(user) : '');
  const [state, setState] = useState<'idle' | 'busy' | 'joined' | 'already'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please add your name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Please check your email address.');
    setState('busy');
    try {
      setState(await joinWaitlist(eventId, { name, email, tier }));
    } catch {
      setState('idle');
      setError('Couldn’t add you just now. Please try again.');
    }
  };

  if (state === 'joined' || state === 'already') {
    return (
      <div className={`flex items-start gap-3 ${compact ? '' : 'bg-[#fffbd6] border border-[#e6d200] p-4'}`}>
        <span className="w-8 h-8 bg-black text-[#ffed00] flex items-center justify-center shrink-0"><Check className="w-4 h-4" /></span>
        <p className="text-sm text-[#222] leading-relaxed">
          {state === 'joined' ? 'You’re on the waitlist.' : 'You’re already on the waitlist.'} We’ll email{' '}
          <span className="font-bold break-all">{email.trim()}</span> if tickets for {eventTitle} come up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {!compact && (
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 bg-black text-[#ffed00] flex items-center justify-center shrink-0"><BellRing className="w-4 h-4" /></span>
          <div>
            <span className={`${overline} text-[#666]`}>Waitlist</span>
            <p className="text-sm text-[#222] leading-relaxed mt-1">Leave your details and we’ll email you if tickets are released.</p>
          </div>
        </div>
      )}
      <input
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full bg-transparent py-2.5 text-base sm:text-sm"
        aria-label="Your name"
      />
      <input
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        className="w-full bg-transparent py-2.5 text-base sm:text-sm"
        aria-label="Email address"
      />
      {error && <p className="text-sm text-[#be6464]">{error}</p>}
      <button
        type="submit"
        disabled={state === 'busy'}
        className="jz-cta w-full bg-black text-white py-3.5 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {state === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4 jz-cta-icon text-[#ffed00]" />}
        Join the waitlist
      </button>
      <p className="text-[11px] text-[#8a8a8a] leading-relaxed">We only use your email to tell you about tickets for this event.</p>
    </form>
  );
}
