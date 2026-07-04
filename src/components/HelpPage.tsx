import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Mail,
  MessageSquare,
  PhoneCall,
  Clock,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  X,
} from 'lucide-react';

interface HelpPageProps {
  onBackToHome: () => void;
  onExploreEvents: () => void;
}

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

export default function HelpPage({ onBackToHome, onExploreEvents }: HelpPageProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Knowledgebase
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'safety' | 'refunds' | 'tech' | 'booking'>('safety');

  // Troubleshooter
  const [troubleTopic, setTroubleTopic] = useState<string>('');
  const [diagnosticLoading, setDiagnosticLoading] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  // Live chat
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    { sender: 'agent', text: 'Hi! You\'re through to Jazbaticket support. How can I help?', time: 'Just now' },
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: 'A ticket order',
    message: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const knowledgebaseArticles = {
    safety: [
      { id: 1, title: 'How do I know my ticket is genuine?', desc: 'Every ticket booked through Jazbaticket carries a unique barcode that we issue and verify at the gate. Book through us and your ticket is guaranteed real.' },
      { id: 2, title: 'Can I resell my tickets elsewhere?', desc: 'We don\'t support third-party resale — it\'s where most ticket fraud happens. If you can\'t attend, contact us and we\'ll transfer or refund your ticket instead.' },
      { id: 3, title: 'How does scanning work at the door?', desc: 'Your barcode is checked live against our system at entry, so copies and duplicates are rejected automatically.' },
    ],
    refunds: [
      { id: 4, title: 'What\'s the refund policy?', desc: 'Cancel at least 48 hours before the show and the full amount goes back to your original payment method — automatically.' },
      { id: 5, title: 'What does "wait list" mean on my booking?', desc: 'The show sold out, so you\'re in the queue. If a spot opens, we email you and hold it for a short window before it goes to the next person.' },
      { id: 6, title: 'Are fees refunded when an event is cancelled?', desc: 'Yes. If the venue or organiser cancels, you get everything back — ticket price and service fees, no deductions.' },
    ],
    tech: [
      { id: 7, title: 'How do I reset my password?', desc: 'Use "Forgot password" on the sign-in page, or change it anytime from Account settings in your dashboard.' },
      { id: 8, title: 'My ticket barcode won\'t load', desc: 'Tickets are saved for offline access automatically, and you can download a PDF copy from your dashboard in case there\'s no signal at the venue.' },
      { id: 9, title: 'Can I add extra security to my account?', desc: 'Two-factor authentication is on the way. Until then, a strong unique password keeps your account safe.' },
    ],
    booking: [
      { id: 10, title: 'Can I mix ticket types in one order?', desc: 'Yes — combine General, VIP and Elite tickets for the same event in a single checkout.' },
      { id: 11, title: 'Do I get a physical ticket?', desc: 'We\'re fully digital. Your ticket and barcode appear in your dashboard the moment payment clears.' },
      { id: 12, title: 'Does the name on the ticket matter?', desc: 'Yes, it\'s checked at the door. You can reassign a ticket to someone else from your dashboard any time before the event.' },
    ],
  };

  const handleTroubleshoot = (topic: string) => {
    setTroubleTopic(topic);
    setDiagnosticLoading(true);
    setDiagnosticResult(null);

    setTimeout(() => {
      setDiagnosticLoading(false);
      if (topic === 'spoof') {
        setDiagnosticResult('All ticket scanners at our partner venues are online and working normally.');
      } else if (topic === 'login') {
        setDiagnosticResult('Sign-in is running normally. Clear your browser cache and try again, or reset your password from the login page.');
      } else if (topic === 'refund') {
        setDiagnosticResult('Refunds are processing normally. If your event was cancelled or you\'re inside the 48-hour window, open your dashboard and choose "Request refund".');
      } else {
        setDiagnosticResult('All systems are running normally.');
      }
    }, 1200);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatLog((prev) => [...prev, { sender: 'user', text: userMsg, time: nowStr }]);
    setChatMessage('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let reply = 'Thanks for the message — a member of the team will reply shortly. You can check your tickets anytime from your dashboard.';
      if (userMsg.toLowerCase().includes('refund') || userMsg.toLowerCase().includes('cancel')) {
        reply = 'Refunds are free up to 48 hours before the show. I\'ve flagged this for our refunds team.';
      } else if (userMsg.toLowerCase().includes('hello') || userMsg.toLowerCase().includes('hi')) {
        reply = 'Hi there! How can I help you today?';
      } else if (userMsg.toLowerCase().includes('ticket') || userMsg.toLowerCase().includes('code') || userMsg.toLowerCase().includes('qr')) {
        reply = 'Your tickets live under "My tickets" in your dashboard — just show the barcode at the entrance.';
      }
      setChatLog((prev) => [...prev, { sender: 'agent', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1600);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setFormSubmitted(true);
    setTimeout(() => {
      setContactForm({ name: '', email: '', subject: 'A ticket order', message: '' });
    }, 3000);
  };

  const filteredArticles = Object.values(knowledgebaseArticles).flat().filter((art) =>
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TAB_LABELS = {
    safety: 'Ticket safety',
    refunds: 'Refunds',
    tech: 'Account & tech',
    booking: 'Booking',
  } as const;

  const articles = searchQuery.trim() ? filteredArticles : knowledgebaseArticles[activeTab];

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="help-page-root">

      {/* ── HERO — black band ─────────────────────────────────── */}
      <section className="bg-black text-white relative overflow-hidden" id="help-hero-section">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1600&auto=crop&fit=crop"
            alt="Concert stage lights"
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-20 sm:py-28 relative z-10">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide text-white/60 bg-white/5 backdrop-blur-md px-3.5 py-1.5">
            <span onClick={onBackToHome} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">Help centre</span>
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-[56px] leading-[0.95] tracking-tight mt-5 max-w-3xl">
            How can we <span className="text-[#ffed00]">help?</span>
          </h1>

          <p className="text-white/70 text-base sm:text-lg mt-6 max-w-2xl leading-relaxed">
            Search the help articles, run a quick status check, or talk to a real person — we answer within 2 hours, every day.
          </p>

          {/* Hero search */}
          <div className="max-w-xl mt-10 flex items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help articles…"
                className="w-full bg-[#111111] text-white placeholder-white/40 pl-11 pr-4 py-4 text-sm"
                style={{ borderBottomColor: 'rgba(255,255,255,0.4)' }}
              />
            </div>
            <button
              onClick={() => setChatOpen(true)}
              className="shrink-0 bg-[#ffed00] text-black px-6 text-sm font-bold cursor-pointer hover:bg-[#e6d200] transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Live chat
            </button>
          </div>
        </div>
      </section>

      {/* ── KNOWLEDGEBASE — white catalogue ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-16">
        <h2 className="font-display font-bold text-3xl leading-[0.95]">
          {searchQuery.trim() ? `Results for "${searchQuery}"` : 'Browse by topic'}
        </h2>

        {/* Topic tabs */}
        {!searchQuery.trim() && (
          <div className="flex border-b border-[#f2f2f2] mt-8 overflow-x-auto">
            {(Object.keys(TAB_LABELS) as Array<keyof typeof TAB_LABELS>).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3.5 text-sm font-bold transition-colors cursor-pointer relative whitespace-nowrap ${
                  activeTab === tab ? 'text-black' : 'text-[#8a8a8a] hover:text-black'
                }`}
              >
                {TAB_LABELS[tab]}
                {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-black" />}
              </button>
            ))}
          </div>
        )}

        {/* Article rows */}
        <div className="border-b border-[#f2f2f2] mt-2">
          {articles.length > 0 ? articles.map((art) => (
            <div key={art.id} className="py-6 border-b border-[#f2f2f2] last:border-b-0">
              <h3 className="font-display font-bold text-lg leading-tight">{art.title}</h3>
              <p className="text-sm text-[#666] leading-relaxed mt-2 max-w-3xl">{art.desc}</p>
            </div>
          )) : (
            <div className="py-14 text-center">
              <p className="font-bold">Nothing found for "{searchQuery}".</p>
              <p className="text-sm text-[#666] mt-2">Try different words, or ask us directly below.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── STATUS CHECK + CONTACT CHANNELS ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#e4e4e4] border border-[#e4e4e4]">

          {/* Status check — white tile */}
          <div className="bg-white p-8 sm:p-10">
            <span className={`${overline} text-[#666]`}>Quick status check</span>
            <h3 className="font-display font-bold text-2xl leading-[0.95] mt-3">
              Something not working?
            </h3>
            <p className="text-sm text-[#666] mt-3 leading-relaxed">
              Pick a topic and we'll check the live system status — most issues resolve in seconds.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7">
              {[
                { id: 'spoof', label: 'Ticket scanning' },
                { id: 'login', label: 'Signing in' },
                { id: 'refund', label: 'Refunds' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTroubleshoot(t.id)}
                  className={`py-3.5 px-4 text-sm font-bold cursor-pointer transition-colors border ${
                    troubleTopic === t.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-[#e4e4e4] hover:border-black'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {diagnosticLoading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 bg-[#f7f7f7] p-5 mt-6 text-sm"
                >
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Checking live status…
                </motion.div>
              )}
              {diagnosticResult && !diagnosticLoading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 bg-[#f7f7f7] p-5 mt-6"
                >
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sm block">All clear</span>
                    <p className="text-sm text-[#666] mt-1 leading-relaxed">{diagnosticResult}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Contact channels — black tile */}
          <div className="bg-black text-white p-8 sm:p-10">
            <span className={`${overline} text-[#ffed00]`}>Talk to us</span>
            <h3 className="font-display font-bold text-2xl leading-[0.95] mt-3">
              Real people, quick answers.
            </h3>

            <div className="border-t border-white/15 mt-7">
              <div className="flex items-center justify-between py-5 border-b border-white/15">
                <span className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-[#ffed00] shrink-0" />
                  <span>
                    <span className="font-bold block">Email</span>
                    <span className="text-white/60">Replies within 2 hours</span>
                  </span>
                </span>
                <span className="font-bold text-sm">support@jazbaticket.com</span>
              </div>
              <div className="flex items-center justify-between py-5 border-b border-white/15">
                <span className="flex items-center gap-3 text-sm">
                  <PhoneCall className="w-4 h-4 text-[#ffed00] shrink-0" />
                  <span>
                    <span className="font-bold block">Phone</span>
                    <span className="text-white/60">Billing & urgent queries</span>
                  </span>
                </span>
                <span className="font-bold text-sm">+44 20 7946 0192</span>
              </div>
              <div className="flex items-center justify-between py-5">
                <span className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-[#ffed00] shrink-0" />
                  <span>
                    <span className="font-bold block">Hours</span>
                    <span className="text-white/60">London & Hamilton desks</span>
                  </span>
                </span>
                <span className="font-bold text-sm">08:00 – 22:00 GMT</span>
              </div>
            </div>

            <button
              onClick={onExploreEvents}
              className="mt-6 flex items-center gap-2 text-sm font-bold text-white hover:text-[#ffed00] transition-colors cursor-pointer"
            >
              Or keep browsing shows <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          <div className="lg:col-span-5">
            <h2 className="font-display font-bold text-3xl leading-[0.95]">Still need help?</h2>
            <p className="text-sm text-[#666] mt-4 leading-relaxed max-w-sm">
              Send us the details and a support agent will reply to your email — usually within 2 hours.
            </p>

            <div className="border-t border-[#f2f2f2] mt-8">
              <div className="flex items-start gap-3 py-5 border-b border-[#f2f2f2]">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">Secure tickets</span>
                  <span className="text-sm text-[#666]">Every barcode is issued and verified by us.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 py-5 border-b border-[#f2f2f2]">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">Secure payments</span>
                  <span className="text-sm text-[#666]">Card details never touch our servers.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="border border-black p-6 sm:p-8">
              {formSubmitted ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 bg-[#ffed00] flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 text-black" />
                  </div>
                  <h3 className="font-display font-bold text-2xl leading-[0.95] mt-5">Message sent</h3>
                  <p className="text-sm text-[#666] mt-3 max-w-sm mx-auto">
                    Thanks — we'll reply to {contactForm.email || 'your email'} shortly. Keep an eye on your inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={`${overline} text-[#666] block mb-2`}>Your name</label>
                      <input
                        type="text" required value={contactForm.name}
                        onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Adrian Vance"
                        className="w-full bg-[#f7f7f7] px-3 py-3 text-sm text-black placeholder-[#8a8a8a]"
                      />
                    </div>
                    <div>
                      <label className={`${overline} text-[#666] block mb-2`}>Email address</label>
                      <input
                        type="email" required value={contactForm.email}
                        onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="you@example.com"
                        className="w-full bg-[#f7f7f7] px-3 py-3 text-sm text-black placeholder-[#8a8a8a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`${overline} text-[#666] block mb-2`}>What's it about?</label>
                    <select
                      value={contactForm.subject}
                      onChange={(e) => setContactForm((p) => ({ ...p, subject: e.target.value }))}
                      className="w-full bg-[#f7f7f7] px-3 py-3 text-sm text-black cursor-pointer"
                    >
                      <option>A ticket order</option>
                      <option>A refund</option>
                      <option>Trouble at the venue</option>
                      <option>Signing in</option>
                      <option>Something else</option>
                    </select>
                  </div>

                  <div>
                    <label className={`${overline} text-[#666] block mb-2`}>Tell us what's going on</label>
                    <textarea
                      required rows={5} value={contactForm.message}
                      onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                      placeholder="Include the event name and order number if you have them…"
                      className="w-full bg-[#f7f7f7] px-3 py-3 text-sm text-black placeholder-[#8a8a8a] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-[#ffed00] text-black px-8 py-4 text-sm font-bold cursor-pointer hover:bg-[#e6d200] transition-colors flex items-center gap-2"
                  >
                    Send message <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FLOATING CHAT LAUNCHER + PANEL ────────────────────── */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-black text-white px-5 py-3.5 text-sm font-bold cursor-pointer hover:bg-neutral-800 transition-colors flex items-center gap-2 border border-white/20"
        >
          <span className="w-2 h-2 rounded-full bg-[#ffed00]" />
          Chat with us
          <MessageSquare className="w-4 h-4" />
        </button>
      )}

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm bg-white border border-black flex flex-col"
            style={{ height: 'min(480px, 70vh)' }}
          >
            {/* Chat header */}
            <div className="bg-black text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#ffed00]" />
                <div>
                  <span className="font-bold text-sm block leading-tight">Jazbaticket support</span>
                  <span className="text-[11px] text-white/60">Typically replies in under a minute</span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f7f7f7]">
              {chatLog.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-black text-white'
                        : 'bg-white text-black border border-[#e4e4e4]'
                    }`}
                  >
                    {msg.text}
                    <span className={`block text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-white/50' : 'text-[#8a8a8a]'}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#e4e4e4] px-3.5 py-2.5 text-sm text-[#8a8a8a]">
                    Typing…
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handleSendMessage} className="flex items-stretch border-t border-black shrink-0">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type your message…"
                className="flex-1 px-4 py-3.5 text-sm text-black placeholder-[#8a8a8a]"
                style={{ borderBottom: 'none' }}
              />
              <button
                type="submit"
                disabled={!chatMessage.trim()}
                className="bg-[#ffed00] text-black px-5 font-bold cursor-pointer hover:bg-[#e6d200] disabled:opacity-40 transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
