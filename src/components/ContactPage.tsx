import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MessageSquare, MapPin, Phone, Check } from 'lucide-react';

const CHANNELS = [
  { icon: Mail, label: 'Email us', value: 'support@jazbaticket.com', note: 'Replies within 2 hours' },
  { icon: Phone, label: 'Call the box office', value: '+44 20 7946 0958', note: 'Mon–Sun, 9am–9pm BST' },
  { icon: MapPin, label: 'Head office', value: 'Westminster, London, UK', note: 'By appointment only' },
];

const TOPICS = ['A ticket order', 'Listing an event', 'Booking an artist', 'Press & partnerships', 'Something else'];

export default function ContactPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSent(true);
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <div className="jz-page bg-white min-h-screen text-black" id="contact-page-root">
      {/* HERO — dark storytelling band (shared pattern) */}
      <section className="relative bg-[#121212] min-h-[420px] h-[60vh] px-4 sm:px-6 md:px-8 overflow-hidden z-10 flex items-center">
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
            <span onClick={() => navigate('/')} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">Contact</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight leading-[0.95] max-w-3xl text-white">
            Talk to a <span className="text-[#ffed00]">real person.</span>
          </h1>
          <p className="text-neutral-300 font-normal text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
            A ticket question, an event to list, or an artist to book — our team is here every day of the week.
          </p>
        </div>
      </section>

      {/* BODY: channels + form */}
      <section className="px-4 sm:px-6 md:px-8 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Channels */}
          <div className="lg:col-span-5 space-y-px bg-[#e4e4e4] border border-[#e4e4e4]">
            {CHANNELS.map((c) => (
              <div key={c.label} className="bg-white p-6 flex items-start gap-4">
                <div className="w-10 h-10 bg-[#ffed00] flex items-center justify-center shrink-0">
                  <c.icon className="w-5 h-5 text-black" />
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#666]">{c.label}</div>
                  <div className="font-display font-bold text-base mt-1">{c.value}</div>
                  <div className="text-xs text-[#8a8a8a] mt-0.5">{c.note}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <div className="border border-black p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-black" />
                <h2 className="font-display font-bold text-xl">Send us a message</h2>
              </div>

              {sent ? (
                <div className="mt-8 flex items-start gap-3 bg-[#f7f7f7] border border-[#e4e4e4] p-5">
                  <div className="w-9 h-9 bg-[#ffed00] flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-black stroke-[3]" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-base">Message sent</div>
                    <p className="text-sm text-[#666] mt-1">Thanks for reaching out — we'll reply to your email within 2 hours.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-[#666] mb-2">Your name</label>
                      <input
                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Liam Hall"
                        className="w-full bg-[#f7f7f7] px-3 py-3 text-sm font-medium text-black placeholder-[#8a8a8a]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-[#666] mb-2">Email address</label>
                      <input
                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-[#f7f7f7] px-3 py-3 text-sm font-medium text-black placeholder-[#8a8a8a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-[#666] mb-2">What's it about?</label>
                    <select
                      value={topic} onChange={(e) => setTopic(e.target.value)}
                      className="w-full bg-[#f7f7f7] px-3 py-3 text-sm font-medium text-black"
                    >
                      {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-[#666] mb-2">Message</label>
                    <textarea
                      required rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help?"
                      className="w-full bg-[#f7f7f7] px-3 py-3 text-sm font-medium text-black placeholder-[#8a8a8a] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-[#ffed00] text-black font-bold text-sm px-6 py-3.5 cursor-pointer"
                  >
                    Send message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
