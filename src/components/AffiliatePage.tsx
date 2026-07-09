import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2,
  UserPlus,
  Share2,
  Percent,
  Banknote,
  Users,
  Mail,
  ArrowRight,
  Check,
} from 'lucide-react';

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: UserPlus,
    title: 'Sign up',
    body: 'Create a free affiliate account — it takes a couple of minutes and there\'s nothing to pay.',
  },
  {
    step: '02',
    icon: Share2,
    title: 'Share your link',
    body: 'Promote a specific event, an artist\'s page, or the whole platform with your unique referral link.',
  },
  {
    step: '03',
    icon: Percent,
    title: 'Earn commission',
    body: 'Earn a commission on the ticket value of every sale made through your link — tracked automatically.',
  },
  {
    step: '04',
    icon: Banknote,
    title: 'Get paid monthly',
    body: 'Once your balance reaches the payout threshold, we pay you monthly — direct to your bank account or PayPal.',
  },
];

const WHO_CAN_JOIN = [
  'Bloggers and writers covering live music, theatre, comedy or sport',
  'Influencers and content creators of any size',
  'Community organisers and fan groups',
  'Events-focused pages and newsletters',
];

export default function AffiliatePage() {
  const navigate = useNavigate();

  return (
    <div className="jz-page bg-white min-h-screen text-black" id="affiliate-page-root">

      {/* ── HERO — dark storytelling band ─────────────────────── */}
      <section className="relative bg-[#121212] min-h-[420px] h-[60vh] px-4 sm:px-6 md:px-8 overflow-hidden z-10 flex items-center">
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=crop&fit=crop"
            alt="Festival crowd at sunset"
            className="w-full h-full object-cover opacity-25"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/45" />
        </div>
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide text-neutral-400 bg-white/5 backdrop-blur-md px-3.5 py-1.5">
            <span onClick={() => navigate('/')} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">Affiliate programme</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight leading-[0.95] max-w-3xl text-white">
            Earn commission promoting <span className="text-[#ffed00]">Jazbatickets events.</span>
          </h1>
          <p className="text-neutral-300 font-normal text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
            Join the Jazbatickets Affiliate Programme and earn a commission on every ticket sold through your unique referral link — whether you're a blogger, influencer, community organiser, or run an events-focused page.
          </p>
          <a
            href="mailto:affiliates@jazbaentertainment.net"
            className="inline-flex items-center gap-2 bg-[#ffed00] text-black font-bold text-sm px-6 py-3.5 hover:bg-[#e6d200] transition-colors"
          >
            <Mail className="w-4 h-4" /> Get started
          </a>
        </div>
      </section>

      {/* ── HOW IT WORKS — yellow accent band ─────────────────── */}
      <section className="bg-[#ffed00] text-black px-4 sm:px-6 md:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <span className={`${overline} text-black/60`}>How it works</span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-3 max-w-xl">
            Four steps from link to payout.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/15 border border-black/15 mt-10">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-[#ffed00] p-7">
                <span className="font-display font-bold text-lg">{s.step}</span>
                <s.icon className="w-6 h-6 mt-4" />
                <h3 className="font-display font-bold text-lg mt-4">{s.title}</h3>
                <p className="text-sm text-black/70 leading-relaxed mt-2">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO CAN JOIN — white catalogue band ───────────────── */}
      <section className="px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <span className={`${overline} text-[#666]`}>Who can join</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-3">
              If you have an audience, you're in.
            </h2>
            <p className="text-base text-[#222] leading-relaxed mt-5 max-w-md">
              Anyone with an audience interested in live music, theatre, comedy, or sport can apply — no minimum follower count required. Promotional content must comply with our{' '}
              <button onClick={() => navigate('/terms-of-use')} className="font-bold underline underline-offset-2 cursor-pointer hover:text-[#666] transition-colors">
                Terms of Use
              </button>{' '}
              and not misrepresent events or pricing.
            </p>
          </div>
          <div className="lg:col-span-7 border-t border-[#f2f2f2]">
            {WHO_CAN_JOIN.map((w) => (
              <div key={w} className="flex items-center gap-4 py-5 border-b border-[#f2f2f2]">
                <span className="w-8 h-8 bg-[#f7f7f7] border border-[#e4e4e4] flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </span>
                <span className="text-base font-medium">{w}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 py-5">
              <span className="w-8 h-8 bg-black flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-[#ffed00]" />
              </span>
              <span className="text-base font-medium">…and anyone else with a crowd that loves a night out.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA — black closing band ──────────────────────────── */}
      <section className="bg-black text-white px-4 sm:px-6 md:px-8 py-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <Link2 className="w-6 h-6 text-[#ffed00]" />
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[0.95] mt-5 max-w-md">
              Ready to start earning?
            </h2>
            <p className="text-white/70 text-sm mt-4 max-w-md">
              Email us and we'll set up your affiliate account and referral link.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:affiliates@jazbaentertainment.net"
              className="bg-[#ffed00] text-black font-bold text-sm px-6 py-3.5 flex items-center gap-2 hover:bg-[#e6d200] transition-colors"
            >
              <Mail className="w-4 h-4" /> affiliates@jazbaentertainment.net
            </a>
            <button
              onClick={() => navigate('/events')}
              className="bg-black text-white border border-white font-bold text-sm px-6 py-3.5 cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              Browse events <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
