import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Loader2,
  Mail,
  Mic2,
  Phone,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import mainLogo from "../../assets/images/Main Logo.png";
import { sendFormEmail } from "../services/formEmailService";

const HIGHLIGHTS = [
  {
    icon: Ticket,
    title: "Real tickets, real shows",
    body: "Concerts, theatre, comedy, sport and festivals — every listing verified before it goes on sale.",
  },
  {
    icon: Mic2,
    title: "Book an artist",
    body: "Hire verified artists to headline your own event, at one flat fee per booking.",
  },
  {
    icon: ShieldCheck,
    title: "Protected checkout",
    body: "Secure Stripe payments, instant digital passes and refund protection on every order.",
  },
];

/**
 * Standalone holding page shown site-wide while no tickets are on sale.
 * Rendered instead of the app by the gate in src/main.tsx — it deliberately
 * carries no navbar or footer so there is nothing to click into yet.
 */
export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Coming Soon — Jazba Tickets";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || sending) return;
    setSending(true);
    setError("");
    const result = await sendFormEmail({
      formName: "newsletter",
      email,
      subject: "Coming soon — notify me at launch",
      message: "Requested a launch notification from the Jazba Tickets coming-soon page.",
    });
    setSending(false);
    if (!result.ok) {
      setError(result.error || "Could not sign you up. Please try again.");
      return;
    }
    setSent(true);
    setEmail("");
  };

  return (
    <div
      className="jz-page min-h-screen bg-black text-white flex flex-col"
      id="coming-soon-root"
    >
      {/* Brand bar */}
      <header className="px-6 sm:px-10 py-7 flex items-center justify-between border-b border-white/10">
        <img
          src={mainLogo}
          alt="Jazba Tickets"
          className="h-8 sm:h-9 w-auto object-contain select-none"
        />
        <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#ffed00]">
          Launching soon
        </span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center px-6 sm:px-10 py-16 sm:py-24">
        <div className="w-full max-w-5xl mx-auto">
          <div className="h-1.5 w-16 bg-[#ffed00] mb-8" />

          <h1 className="font-display font-bold tracking-tight leading-[0.92] text-4xl sm:text-6xl md:text-7xl">
            The box office
            <br />
            opens shortly.
          </h1>

          <p className="mt-7 max-w-2xl text-base sm:text-lg leading-relaxed text-white/70">
            We're finishing the last checks with our venues and promoters, so there
            are no tickets on sale just yet. Leave your email and you'll be first to
            know the moment the first shows go live.
          </p>

          {/* Notify form */}
          <form onSubmit={handleSubmit} className="mt-10 max-w-xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                aria-label="Email address"
                className="flex-1 bg-transparent border border-white/25 focus:border-[#ffed00] outline-none px-4 py-3.5 text-sm text-white placeholder:text-white/40"
              />
              <button
                type="submit"
                disabled={sending}
                className="bg-[#ffed00] text-black font-bold text-sm px-6 py-3.5 cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing you up…
                  </>
                ) : (
                  <>
                    Notify me
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {sent && (
              <p className="mt-3 text-sm font-bold text-[#ffed00] inline-flex items-center gap-2">
                <Check className="w-4 h-4" />
                You're on the list — we'll be in touch at launch.
              </p>
            )}
            {error && <p className="mt-3 text-sm font-bold text-[#ff9d9d]">{error}</p>}

            <p className="mt-3 text-xs text-white/40">
              One email at launch. No spam, unsubscribe any time.
            </p>
          </form>

          {/* What's coming */}
          <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/10 border border-white/10">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-black p-6 sm:p-7">
                <Icon className="w-6 h-6 text-[#ffed00]" strokeWidth={1.6} />
                <h2 className="font-display font-bold text-lg mt-4">{title}</h2>
                <p className="text-sm leading-relaxed text-white/60 mt-2">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Contact / legal */}
      <footer className="px-6 sm:px-10 py-8 border-t border-white/10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <a
              href="mailto:info@jazbatickets.com"
              className="inline-flex items-center gap-2 text-white/70 hover:text-[#ffed00] transition-colors"
            >
              <Mail className="w-4 h-4" />
              info@jazbatickets.com
            </a>
            <a
              href="tel:+443335777014"
              className="inline-flex items-center gap-2 text-white/70 hover:text-[#ffed00] transition-colors"
            >
              <Phone className="w-4 h-4" />
              +44 (0)333 577 7014
            </a>
          </div>
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Jazba Entertainment Ltd — Birmingham, United Kingdom
          </p>
        </div>
      </footer>
    </div>
  );
}
