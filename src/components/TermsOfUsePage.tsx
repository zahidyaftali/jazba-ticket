import React from 'react';
import { Mail, PhoneCall, MapPin } from 'lucide-react';

interface TermsOfUsePageProps {
  onBackToHome: () => void;
}

const SECTIONS: Array<{ id: string; title: string; body: React.ReactNode }> = [
  {
    id: '4.1',
    title: "The Platform's Role",
    body: (
      <p>
        For events listed by third-party organisers, Jazbaticket acts as a ticketing agent and technology platform. The contract for the event itself — its content, safety, running, and any accessibility or seating arrangements — is between you and the event organiser and/or venue, not Jazbaticket. Jazbaticket is responsible for the ticketing transaction and for events we organise directly ourselves.
      </p>
    ),
  },
  {
    id: '4.2',
    title: 'No Authority of Venue Staff or Third Parties',
    body: (
      <>
        <p>
          Only a written communication from an authorised representative of Jazba Entertainment Ltd, sent from an @jazbaentertainment.net address, can vary these Terms, confirm a refund, or make any commitment on behalf of the company.
        </p>
        <p className="mt-3">
          Venue staff, security personnel, stewards, box office staff not employed by Jazbaticket, promoters, and any other third party present at or connected with an event have no authority whatsoever to promise refunds, exchanges, or any other variation of these Terms on our behalf, regardless of anything they say to you at an event or afterwards. If someone claims otherwise, please get it in writing from us directly before relying on it — we will not be bound by a verbal assurance made by someone who does not work for Jazba Entertainment Ltd, or by any of our own staff verbally, unless it's confirmed in writing afterwards by an authorised representative.
        </p>
      </>
    ),
  },
  {
    id: '4.3',
    title: 'Accounts',
    body: (
      <p>
        You must be 18 or over to create an account or submit an artist booking enquiry. You're responsible for keeping your login details secure and for all activity under your account.
      </p>
    ),
  },
  {
    id: '4.4',
    title: 'Buying Tickets & Final Sale Acknowledgment',
    body: (
      <>
        <p>
          All prices are shown in GBP and include VAT where applicable. A booking/service fee is added at checkout and shown before you confirm payment.
        </p>
        <p className="mt-3">
          Any administration or booking fee charged by a third-party payment or ticketing provider is set and collected by that provider, is not received by Jazba Entertainment Ltd, and cannot be refunded by us under any circumstances. Queries about such fees should be directed to the relevant payment provider.
        </p>
        <p className="mt-3">
          Before completing checkout, you will be shown this Refund Policy and asked to actively confirm you've read and accept it. Your confirmation, together with the date and time of purchase, is recorded against your order and may be relied on by us as evidence that these terms were drawn to your attention at the point of sale.
        </p>
        <p className="mt-3">
          Reselling tickets above face value, or using automated software to purchase tickets, is prohibited and may result in order cancellation and account suspension.
        </p>
      </>
    ),
  },
  {
    id: '4.5',
    title: 'Accessibility & Venue Suitability',
    body: (
      <p>
        See Refund Policy §3.8. Buyers are responsible for checking a venue's accessibility, seating, and suitability for their needs before purchase, either directly with the venue or by contacting us in advance. This clause does not limit any right to reasonable adjustments you may have under the Equality Act 2010.
      </p>
    ),
  },
  {
    id: '4.6',
    title: 'Ticket Holder Identity',
    body: (
      <p>
        Tickets are issued to the name and email address of the account holder who completed the purchase. If you buy a ticket for someone else, you remain the account holder of record for that order, and any refund, complaint, or legal claim relating to that order should be made by you, not by the person you gave the ticket to. Where a name provided in connection with a complaint, refund request, or claim doesn't match the name on the original order, we reserve the right to require evidence connecting the two before proceeding.
      </p>
    ),
  },
  {
    id: '4.7',
    title: 'Listing Events',
    body: (
      <p>
        By listing an event you confirm you have the right to sell tickets to it, hold any required licences (venue, PRS/PPL where applicable), and will honour the ticket types and refund terms you publish.
      </p>
    ),
  },
  {
    id: '4.8',
    title: 'Booking Artists',
    body: (
      <p>
        Enquiries submitted via Book an Artist are not confirmed bookings. A booking is only binding once a written Booking Agreement is signed and any required deposit received.
      </p>
    ),
  },
  {
    id: '4.9',
    title: 'Formal Complaints Procedure',
    body: (
      <p>
        See Refund Policy §3.9. Before bringing any claim against Jazba Entertainment Ltd relating to an order, you agree to first raise the matter in writing with <a href="mailto:support@jazbaentertainment.net" className="font-bold underline underline-offset-2">support@jazbaentertainment.net</a> and give us 5 working days to respond. This does not affect your statutory right to bring a claim at any time; it simply reflects the reasonable process we ask customers to follow first.
      </p>
    ),
  },
  {
    id: '4.10',
    title: 'Intellectual Property',
    body: (
      <p>
        All content on the Platform — branding, design, artist media, and text — is owned by Jazba Entertainment Ltd or its licensors and may not be copied, scraped, or reused without written permission.
      </p>
    ),
  },
  {
    id: '4.11',
    title: 'Prohibited Conduct',
    body: (
      <p>
        You agree not to use the Platform for fraudulent purposes, upload false or infringing content, interfere with its operation or security, harass or abuse our staff, or impersonate any artist, organiser, or Jazbaticket staff member.
      </p>
    ),
  },
  {
    id: '4.12',
    title: 'Liability',
    body: (
      <>
        <p>
          Nothing in these Terms excludes or limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else which cannot lawfully be excluded or limited under English law.
        </p>
        <p className="mt-3">
          Subject to that, and to the extent permitted by law: the Platform is provided "as is"; we are not liable for the acts, omissions, cancellation, postponement, or conduct of an event organiser, artist, or venue, including third-party security or venue staff, as these parties act independently of Jazba Entertainment Ltd and not under our direction; and any liability we do have for losses relating to a ticket order is limited to the value of that order.
        </p>
      </>
    ),
  },
  {
    id: '4.13',
    title: 'Indemnity',
    body: (
      <p>
        You agree to reimburse us for any reasonably incurred losses, costs, or expenses arising from your breach of these Terms, your misuse of the Platform, or a claim you bring against us that a court finds to have had no reasonable basis, save where this would be inconsistent with your rights as a consumer under UK law.
      </p>
    ),
  },
  {
    id: '4.14',
    title: 'Entire Agreement — No Reliance on Other Statements',
    body: (
      <p>
        These Terms, together with the Refund Policy and any written Booking Agreement, are the entire agreement between you and Jazba Entertainment Ltd for your order. You confirm that you have not relied on any statement, promise, or representation made by us, our staff, a venue, event organiser, or any third party that is not set out in writing in these Terms or your order confirmation.
      </p>
    ),
  },
  {
    id: '4.15',
    title: 'Disputes & Costs',
    body: (
      <p>
        We'd always rather resolve a concern directly — see §4.9. Where a dispute proceeds to the Small Claims Track, both parties usually bear their own costs; however, we reserve the right to seek costs from a claimant under Civil Procedure Rule 27.14 where a claim is found by the court to be fraudulent, frivolous, vexatious, or where a party has otherwise behaved unreasonably in bringing or conducting the claim.
      </p>
    ),
  },
  {
    id: '4.16',
    title: 'Force Majeure',
    body: (
      <p>
        We are not liable for any failure or delay in performance caused by circumstances beyond our reasonable control, including but not limited to extreme weather, strikes, government action, or venue closure.
      </p>
    ),
  },
  {
    id: '4.17',
    title: 'Severability',
    body: (
      <p>
        If any part of these Terms is found unenforceable by a court, the rest of these Terms remain in full effect.
      </p>
    ),
  },
  {
    id: '4.18',
    title: 'Governing Law',
    body: (
      <p>
        These Terms are governed by the laws of England and Wales, with disputes subject to the exclusive jurisdiction of the courts of England and Wales.
      </p>
    ),
  },
];

export default function TermsOfUsePage({ onBackToHome }: TermsOfUsePageProps) {
  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="terms-of-use-page">

      {/* ── HERO — dark band ──────────────────────────────────── */}
      <section className="relative bg-[#121212] min-h-[360px] px-4 sm:px-6 md:px-8 overflow-hidden z-10 flex items-center py-20">
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=crop&fit=crop"
            alt="Live concert crowd"
            className="w-full h-full object-cover opacity-25"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-neutral-950/85 to-neutral-950/45" />
        </div>
        <div className="max-w-7xl mx-auto w-full relative z-10 text-left space-y-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide text-neutral-400 bg-white/5 backdrop-blur-md px-3.5 py-1.5">
            <span onClick={onBackToHome} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">Terms of use</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight leading-[0.95] max-w-3xl text-white">
            Terms of <span className="text-[#ffed00]">Use</span>
          </h1>
          <p className="text-neutral-300 font-normal text-sm sm:text-base max-w-2xl leading-relaxed">
            The rules that govern your use of the Jazbatickets platform — accounts, ticket purchases, event listings, and artist bookings.
          </p>
          <span className="inline-block text-[11px] font-bold text-white/50">Last updated: 9 July 2026</span>
        </div>
      </section>

      {/* ── INTRO + SECTIONS — white catalogue ────────────────── */}
      <section className="px-4 sm:px-6 md:px-8 pt-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-[#444] leading-relaxed border-b border-[#f2f2f2] pb-8">
            <p>
              Welcome to Jazbaticket. These Terms of Use ("Terms") govern your access to and use of jazba-ticket.vercel.app and any associated apps (the "Platform"), operated by <strong className="font-bold">Jazba Entertainment Ltd</strong>, a company registered in England and Wales (Company No. 08116770), registered office 339 Dudley Road, Birmingham B18 4HB, United Kingdom ("Jazbaticket", "we", "us", "our"). By creating an account, purchasing a ticket, listing an event, or booking an artist through the Platform, you agree to these Terms.
            </p>
          </div>

          {SECTIONS.map((s) => (
            <div key={s.id} className="py-8 border-b border-[#f2f2f2] last:border-b-0">
              <h2 className="font-display font-bold text-xl leading-tight flex items-baseline gap-3">
                <span className="text-[#8a8a8a] font-bold text-sm shrink-0">{s.id}</span>
                {s.title}
              </h2>
              <div className="text-sm text-[#444] leading-relaxed mt-4">{s.body}</div>
            </div>
          ))}

          {/* 4.19 Contact */}
          <div className="bg-black text-white p-6 sm:p-8 mt-12">
            <h3 className="font-display font-bold text-xl flex items-baseline gap-3">
              <span className="text-white/50 font-bold text-sm shrink-0">4.19</span>
              Contact
            </h3>
            <div className="mt-5 space-y-2.5 text-sm font-bold">
              <span className="flex items-start gap-2"><MapPin className="w-4 h-4 text-[#ffed00] shrink-0 mt-0.5" /> Jazba Entertainment Ltd, 339 Dudley Road, Birmingham B18 4HB, United Kingdom</span>
              <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#ffed00]" /> info@jazbaentertainment.net</span>
              <span className="flex items-center gap-2"><PhoneCall className="w-4 h-4 text-[#ffed00]" /> 0333 5777 014</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
