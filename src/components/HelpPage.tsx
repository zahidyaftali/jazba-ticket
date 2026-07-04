import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  Search, 
  Mail, 
  MessageSquare, 
  PhoneCall, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  ArrowRight, 
  MapPin, 
  ShieldCheck, 
  FileText, 
  Cpu, 
  LifeBuoy, 
  ThumbsUp, 
  Undo2, 
  AlertTriangle, 
  Send 
} from 'lucide-react';

interface HelpPageProps {
  onBackToHome: () => void;
  onExploreEvents: () => void;
}

export default function HelpPage({ onBackToHome, onExploreEvents }: HelpPageProps) {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Search Knowledgebase State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'safety' | 'refunds' | 'tech' | 'booking'>('safety');

  // Interactive Troubleshooting Selector
  const [troubleTopic, setTroubleTopic] = useState<string>('');
  const [diagnosticLoading, setDiagnosticLoading] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  // Live support simulated chat states
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    { sender: 'agent', text: "Hi there! Welcome to Jazba Ticket support. How can I help you today?", time: "Just now" }
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Dynamic Contact Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: 'Verification Issue',
    message: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const knowledgebaseArticles = {
    safety: [
      { id: 1, title: "How do I verify if my ticket is genuine?", desc: "Every ticket booked through Jazba Ticket has a unique QR code that's checked at the gate. As long as you booked through our site, your ticket is guaranteed genuine." },
      { id: 2, title: "Can I resell my tickets on third-party sites?", desc: "We don't support reselling on third-party sites, since that's how most ticket fraud happens. If you can no longer attend, contact our support team and we'll help you transfer or refund your ticket." },
      { id: 3, title: "How does ticket scanning work at the venue?", desc: "Each ticket has a unique QR code checked against our system at the door, so duplicate or copied tickets are rejected automatically." }
    ],
    refunds: [
      { id: 4, title: "What is your refund policy?", desc: "Cancel at least 48 hours before the show and you'll get a full refund to your original payment method, automatically." },
      { id: 5, title: "My booking shows 'Wait List' — what does that mean?", desc: "When a show sells out, you can join the wait list. If a spot opens up, we'll email you and hold it for a short window before offering it to the next person in line." },
      { id: 6, title: "Are fees refunded if an event is cancelled?", desc: "Yes. If an event is cancelled by the venue or organizer, you'll get a full refund including any service fees — no charges deducted." }
    ],
    tech: [
      { id: 7, title: "How do I reset my password?", desc: "Use the 'Forgot password' link on the login page, or update your password anytime from your Dashboard's Settings tab." },
      { id: 8, title: "My ticket QR code won't load", desc: "Your tickets are saved for offline access automatically. You can also download a PDF copy from your Dashboard in case you have no signal at the venue." },
      { id: 9, title: "Can I add extra security to my account?", desc: "We're working on two-factor authentication. For now, using a strong, unique password keeps your account secure." }
    ],
    booking: [
      { id: 10, title: "Can I book different ticket tiers together?", desc: "Yes — mix General, VIP, and Elite tickets for the same event in a single checkout." },
      { id: 11, title: "Do I get a physical ticket?", desc: "No, we're fully digital. Your ticket with its QR code appears in your Dashboard immediately after payment." },
      { id: 12, title: "Do ticket names need to match at the gate?", desc: "Yes, the name on the ticket is checked at the door. You can reassign a ticket to someone else from your Dashboard before the event." }
    ]
  };

  const handleTroubleshoot = (topic: string) => {
    setTroubleTopic(topic);
    setDiagnosticLoading(true);
    setDiagnosticResult(null);

    setTimeout(() => {
      setDiagnosticLoading(false);
      if (topic === 'spoof') {
        setDiagnosticResult("All ticket scanners at our partner venues are online and working normally.");
      } else if (topic === 'login') {
        setDiagnosticResult("Login systems are running normally. Try clearing your browser cache and signing in again, or reset your password below.");
      } else if (topic === 'refund') {
        setDiagnosticResult("Refunds are processing normally. If your event was cancelled or you're within the 48-hour window, go to your Dashboard and click 'Request Refund'.");
      } else {
        setDiagnosticResult("All systems are running normally.");
      }
    }, 1200);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatLog(prev => [...prev, { sender: 'user', text: userMsg, time: nowStr }]);
    setChatMessage('');
    setIsTyping(true);

    // Dynamic response from Jazba Assistant
    setTimeout(() => {
      setIsTyping(false);
      let reply = "Thanks for reaching out! Our support team will get back to you shortly. In the meantime, you can check your tickets anytime from your Dashboard.";
      if (userMsg.toLowerCase().includes('refund') || userMsg.toLowerCase().includes('cancel')) {
        reply = "We offer full refunds up to 48 hours before the show. I'll pass this along to our refunds team for you.";
      } else if (userMsg.toLowerCase().includes('hello') || userMsg.toLowerCase().includes('hi')) {
        reply = "Hi there! How can I help you today?";
      } else if (userMsg.toLowerCase().includes('ticket') || userMsg.toLowerCase().includes('code') || userMsg.toLowerCase().includes('qr')) {
        reply = "You can find your tickets anytime under 'My Tickets' in your Dashboard — just show the QR code at the venue entrance.";
      }
      setChatLog(prev => [...prev, { sender: 'agent', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1600);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setFormSubmitted(true);
    setTimeout(() => {
      setContactForm({ name: '', email: '', subject: 'Verification Issue', message: '' });
    }, 3000);
  };

  // Filter list of articles if search query is active
  const filteredArticles = Object.values(knowledgebaseArticles).flat().filter(art => 
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    art.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#FAFBFD] min-h-screen text-black font-sans pb-16" id="help-page-root">
      
      {/* 1. HERO SECTION - Experiential styling matching event page hero section */}
      <section 
        className="relative bg-[#121212] min-h-[650px] px-4 sm:px-6 md:px-8 overflow-visible z-10 flex items-center justify-center py-16 md:py-0"
        id="help-hero-section"
      >
        {/* DARK EVENT BACKGROUND MUSIC PHOTO WITH GRADIENT OVERLAY */}
        <div className="absolute inset-0 z-0 select-none overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1600&auto=crop&fit=crop"
            alt="Concert stage blurred lights help focus background"
            className="w-full h-full object-cover opacity-35 scale-102"
            referrerPolicy="no-referrer"
          />
          {/* Dark overlay gradient starting from bottom (solid dark transition) to top */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAFBFD] via-[#121212]/95 to-neutral-950/40" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(227,71,24,0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
        </div>

        {/* FLOATING ARTISTIC DRAWINGS & BADGES FOR THEME SYNERGY */}
        
        {/* 1. Safe Badge Illustration (Left-bottom side) */}
        <motion.div 
          animate={{ y: [0, -8, 0], rotate: [-8, -5, -8] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="hidden lg:absolute left-12 bottom-12 w-52 h-24 backdrop-blur-md bg-white/5   rounded-2xl shadow-2xl flex items-center justify-center p-3 select-none z-10"
        >
          <div className="   w-full h-full rounded-xl flex items-center justify-center relative bg-white/5 gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            <span className="font-display font-black text-[10px] tracking-widest text-[#E34718]">SSL 256 PROTECTION</span>
          </div>
        </motion.div>

        {/* 2. Sleek Tag Label (Left-top side) */}
        <motion.div 
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="hidden md:absolute left-24 top-24 bg-neutral-950/90   backdrop-blur-md px-4 py-2 rounded-full shadow-lg rotate-[-6deg] flex items-center gap-2 z-10"
        >
          <span className="text-[#E34718] text-[10px] font-black tracking-widest bg-[#E34718]/10 px-2 py-0.5 rounded-full">ACTIVE ACTIONS</span>
          <span className="font-semibold text-xs text-neutral-200">24/7 Response Desk</span>
        </motion.div>

        {/* 3. Floating security pass label (Right side) */}
        <motion.div 
          animate={{ y: [0, -10, 0], rotate: [4, 1, 4] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="hidden lg:absolute right-12 bottom-12 w-48 h-48 flex flex-col items-center justify-end z-10"
        >
          <div className="relative w-full h-36 backdrop-blur-md bg-[#E34718]/10   rounded-2xl shadow-xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <HelpCircle className="w-7 h-7 text-[#E34718]" />
              <span className="text-[10px] font-mono text-[#E34718] bg-black/45 px-1.5 py-0.5 rounded font-black">AUTHENTIC</span>
            </div>
            <div className="space-y-1.5 text-left">
              <div className="w-14 h-1.5 bg-[#E34718] rounded-full"></div>
              <div className="w-24 h-1.5 bg-neutral-700/60 rounded-full"></div>
            </div>
          </div>
          <div className="absolute -bottom-2 right-4 bg-neutral-900   text-neutral-100 rounded-full px-3.5 py-1.5 font-bold text-[11px] shadow-lg">
            Support Secure ✔
          </div>
        </motion.div>

        {/* HERO CONTENT LEFT ALIGNED WITH GLASS SEARCH FORM GRID */}
        <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center justify-between">
          
          {/* LEFT COLUMN: LEFT-ALIGNED HERO TEXT && BUTTONS */}
          <div className="lg:col-span-7 text-left space-y-6 flex flex-col items-start px-4 sm:px-0">
            {/* BREADCRUMB */}
            <div className="inline-flex items-center gap-1.5 bg-neutral-900/90   px-3.5 py-1.5 rounded-full text-xs font-semibold text-neutral-400">
              <span onClick={onBackToHome} className="hover:text-white cursor-pointer transition-colors">Home</span>
              <span className="text-neutral-600">/</span>
              <span className="text-[#E34718] font-bold">Help & Contact Center</span>
            </div>

            <div className="space-y-3">
              <span className="inline-block text-xs font-black tracking-widest text-[#E34718] text-sentence">Support Center</span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-tight leading-[1.1] text-white">
                How can we <span className="text-[#E34718] drop-shadow-[0_2px_10px_rgba(227,71,24,0.15)]">help you</span> today?
              </h1>
            </div>

            <p className="text-neutral-300/90 font-medium text-sm sm:text-base md:text-lg max-w-xl leading-relaxed">
              Check your ticket status, manage refunds, or get in touch with our support team directly.
            </p>

            {/* TWO CTAs/BUTTONS */}
            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={() => {
                  const el = document.getElementById('support-directory-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#E34718] hover:bg-[#C23A12] text-white font-semibold text-sm px-6 py-3.5 rounded-full transition-all active:scale-95 shadow-lg shadow-[#E34718]/15 flex items-center gap-2 cursor-pointer   animate-pulse"
              >
                <span>Explore Support channels</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={onExploreEvents}
                className="bg-neutral-900/80 hover:bg-neutral-900 text-white   backdrop-blur-sm font-semibold text-sm px-6 py-3.5 rounded-full transition-all active:scale-95 shadow-lg cursor-pointer"
              >
                Back to Live Shows
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: TRANSPARENT GLASS SUPPORT COMMAND LOOKUP */}
          <div className="lg:col-span-5 w-full max-w-sm mx-auto lg:ml-auto px-4 sm:px-0">
            <div className="bg-white/5 backdrop-blur-xl   rounded-2xl p-6 shadow-2xl space-y-4 relative text-left">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#E34718]/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#E34718]/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-[#E34718]" />
                  <span>Instant Support Finder</span>
                </h3>
              </div>

              <div className="space-y-3">
                {/* Search query field */}
                <div className="relative">
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search help articles..."
                    className="w-full bg-white/5   rounded-xl pl-4 pr-10 py-3 text-sm text-white font-medium placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#E34718]/50 transition-all font-sans"
                  />
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                </div>

                {/* Troubleshooting Quick Selectors */}
                <div className="  bg-white/5 rounded-xl p-3 space-y-2">
                  <span className="block text-[10px] font-bold text-neutral-400 text-sentence tracking-widest">Quick actions:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                    <button
                      onClick={() => { setActiveTab('safety'); setSearchQuery(''); }}
                      className={`p-2 rounded text-left truncate transition-all ${activeTab === 'safety' ? 'bg-[#E34718] text-white' : 'bg-white/5 hover:bg-white/10 text-neutral-200'}`}
                    >
                      ✦ Ticket Safety
                    </button>
                    <button
                      onClick={() => { setActiveTab('refunds'); setSearchQuery(''); }}
                      className={`p-2 rounded text-left truncate transition-all ${activeTab === 'refunds' ? 'bg-[#E34718] text-white' : 'bg-white/5 hover:bg-white/10 text-neutral-200'}`}
                    >
                      ✦ Refunds Hub
                    </button>
                    <button
                      onClick={() => { setActiveTab('tech'); setSearchQuery(''); }}
                      className={`p-2 rounded text-left truncate transition-all ${activeTab === 'tech' ? 'bg-[#E34718] text-white' : 'bg-white/5 hover:bg-white/10 text-neutral-200'}`}
                    >
                      ✦ Dashboard Help
                    </button>
                    <button
                      onClick={() => { setActiveTab('booking'); setSearchQuery(''); }}
                      className={`p-2 rounded text-left truncate transition-all ${activeTab === 'booking' ? 'bg-[#E34718] text-white' : 'bg-white/5 hover:bg-white/10 text-neutral-200'}`}
                    >
                      ✦ Reservations
                    </button>
                  </div>
                </div>

                {/* Automated chat launcher */}
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="w-full mt-2 bg-[#E34718] hover:bg-[#C23A12] text-white font-extrabold text-xs text-sentence tracking-wider py-3.5 rounded-xl transition-all active:scale-97 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#E34718]/10 outline-none select-none"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-ping shrink-0" />
                  <span>Start Live Chat</span>
                </button>
              </div>

              {/* Quick help info text */}
              <div className="pt-3   flex justify-between items-center text-[10px] text-neutral-400 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#E34718]" />
                  Response time: &lt;1m
                </span>
                <span>SECURE SSL</span>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER CURVE PATTERN */}
        <div className="absolute bottom-0 left-0 right-0 h-10 select-none pointer-events-none opacity-50 z-10">
          <div className="w-full h-full bg-[linear-gradient(180deg,transparent_20%,#FAFBFD_100%)]"></div>
        </div>
      </section>

      {/* 2. THREE CORE HELP CARDS - SEPARATED INSIDE A DISTINCT CONTAINER SECTION */}
      <section className="bg-white py-16  " id="support-directory-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          
          <div className="text-center mb-10 max-w-xl mx-auto space-y-2">
            <span className="inline-block text-[10px] font-black tracking-widest text-[#E34718] bg-orange-50 px-3 py-1 rounded-full text-sentence">
              Support Directory
            </span>
            <h2 className="text-3xl font-display font-black text-neutral-900 tracking-tight leading-none">
              How Can We Help?
            </h2>
            <p className="text-neutral-500 text-xs sm:text-sm font-semibold leading-relaxed">
              Browse help articles, manage your refunds, or get in touch with our support team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#FAFBFD] rounded-3xl p-6    hover:shadow-lg transition-all duration-300 text-left flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#C23A12] flex items-center justify-center mb-4  ">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-neutral-900">Ticket Authenticity</h3>
                <p className="text-xs text-neutral-500 font-semibold leading-relaxed mt-1.5">
                  Every ticket has a unique code that prevents duplicates or double-selling.
                </p>
              </div>
              <button 
                onClick={() => { 
                  setSearchQuery("genuine"); 
                  document.getElementById('help-knowledge-base')?.scrollIntoView({ behavior: 'smooth' }); 
                }}
                className="mt-6 flex items-center gap-1.5 text-xs text-[#C23A12] hover:underline font-black cursor-pointer text-left text-sentence tracking-wider"
              >
                <span>Verify credentials</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#FAFBFD] rounded-3xl p-6    hover:shadow-lg transition-all duration-300 text-left flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-50/80 text-[#C23A12] flex items-center justify-center mb-4  ">
                  <Undo2 className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-neutral-900">Refunds</h3>
                <p className="text-xs text-neutral-500 font-semibold leading-relaxed mt-1.5">
                  Refunds are sent back to your original payment method within 2-4 business days.
                </p>
              </div>
              <button 
                onClick={() => { 
                  setSearchQuery("policy"); 
                  document.getElementById('help-knowledge-base')?.scrollIntoView({ behavior: 'smooth' }); 
                }}
                className="mt-6 flex items-center gap-1.5 text-[#C23A12] hover:underline font-black cursor-pointer text-left text-sentence tracking-wider text-xs"
              >
                <span>Refund policies</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#FAFBFD] rounded-3xl p-6    hover:shadow-lg transition-all duration-300 text-left flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4  ">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-neutral-900">Live Chat</h3>
                <p className="text-xs text-neutral-500 font-semibold leading-relaxed mt-1.5">
                  Chat with our support team instantly, based out of our London office.
                </p>
              </div>
              <button 
                onClick={() => setChatOpen(true)}
                className="mt-6 flex items-center gap-1.5 text-purple-600 hover:underline font-black cursor-pointer text-left text-sentence tracking-wider text-xs"
              >
                <span>Launch chat session</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 3. DIAGNOSTIC PANEL & QUICK RESOLVER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-20" id="ticket-troubleshooter">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 bg-[#E34718]/10   px-3.5 py-1 rounded-full">
              <Cpu className="w-3.5 h-3.5 text-[#C23A12]" />
              <span className="text-[10px] font-bold text-[#C23A12] tracking-widest text-sentence">Quick Checks</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-neutral-900 leading-tight">
              Run a <span className="text-[#E34718]">Quick System Check</span>
            </h2>

            <p className="text-neutral-500 text-sm font-semibold leading-relaxed">
              Before contacting support, try one of these quick checks — most issues resolve in seconds.
            </p>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-sentence tracking-widest text-[#C23A12] mb-2">Choose a Topic</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleTroubleshoot('spoof')}
                  className={`p-3.5 rounded-xl  text-xs font-bold text-center select-none transition-all cursor-pointer ${
                    troubleTopic === 'spoof' 
                      ? 'bg-orange-50 text-[#C23A12] ' 
                      : 'bg-white  text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  Authenticity Scans
                </button>
                <button
                  onClick={() => handleTroubleshoot('login')}
                  className={`p-3.5 rounded-xl  text-xs font-bold text-center select-none transition-all cursor-pointer ${
                    troubleTopic === 'login' 
                      ? 'bg-orange-50 text-[#C23A12] ' 
                      : 'bg-white  text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  Login Access
                </button>
                <button
                  onClick={() => handleTroubleshoot('refund')}
                  className={`p-3.5 rounded-xl  text-xs font-bold text-center select-none transition-all cursor-pointer ${
                    troubleTopic === 'refund' 
                      ? 'bg-orange-50 text-[#C23A12] ' 
                      : 'bg-white  text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  Refund Operations
                </button>
              </div>
            </div>

            {/* Diagnostic readout report */}
            <AnimatePresence mode="wait">
              {diagnosticLoading && (
                <motion.div 
                   initial={{ opacity: 0, y: 5 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0 }}
                   className="bg-neutral-900 text-neutral-400 p-4 rounded-2xl   text-xs font-mono"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E34718] animate-pulse"></span>
                    <span>Checking systems, please wait...</span>
                  </span>
                </motion.div>
              )}

              {diagnosticResult && !diagnosticLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-neutral-900   rounded-2xl p-4 text-left relative overflow-hidden"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#E34718]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-[#E34718]" />
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-black font-mono tracking-wide text-sentence">Check Complete</h4>
                      <p className="text-neutral-400 text-xs font-mono mt-1.5 leading-relaxed">
                        {diagnosticResult}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Graphical Support Visual elements */}
          <div className="lg:col-span-6 bg-[#0d0d0e] rounded-3xl p-6 sm:p-8 text-white text-left relative overflow-hidden   shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#ffed00]/12 via-transparent to-transparent opacity-85 pointer-events-none" />

            <div className="flex items-center gap-2   pb-4 mb-6">
              <LifeBuoy className="w-4.5 h-4.5 text-[#E34718]" />
              <span className="text-[10px] font-mono text-sentence font-black tracking-widest text-[#E34718]">Contact Us</span>
            </div>

            <div className="space-y-4">
              
              <div className="p-4 bg-neutral-900/90   rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E34718]/10 flex items-center justify-center text-[#C23A12] shrink-0">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">Primary Help Inbox</h4>
                    <span className="text-[10px] text-neutral-400 mt-1 block">Response within 2 hours.</span>
                  </div>
                </div>
                <a href="mailto:support@jazbaticket.com" className="text-xs text-[#E34718] hover:underline font-extrabold shrink-0">
                  support@jazbaticket.com
                </a>
              </div>

              <div className="p-4 bg-neutral-900/90   rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <PhoneCall className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">London HQ Direct Line</h4>
                    <span className="text-[10px] text-neutral-400 mt-1 block">Prestige & billing queries.</span>
                  </div>
                </div>
                <span className="text-xs text-neutral-200 font-bold font-mono shrink-0">
                  +44 20 7946 0192
                </span>
              </div>

              <div className="p-4 bg-neutral-900/90   rounded-2xl flex items-center justify-between gap-4 block sm:flex">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E34718]/10 flex items-center justify-center text-[#E34718] shrink-0">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">Support Hours</h4>
                    <span className="text-[10px] text-neutral-400 mt-1 block">London & Hamilton support desks.</span>
                  </div>
                </div>
                <span className="text-xs text-neutral-300 font-semibold shrink-0 mt-2 sm:mt-0 block">
                  08:00 - 18:00 GMT
                </span>
              </div>

            </div>

            <div className="mt-6 pt-5   flex items-center justify-between text-[11px] text-neutral-500">
              <span>We typically respond within 2 hours.</span>
              <button 
                onClick={onExploreEvents}
                className="text-[#E34718] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Browse Shows</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* 4. KNOWLEDGE BASE ACCORDION MODULE */}
      <section className="bg-orange-50 rounded-[3rem]   max-w-7xl mx-auto px-6 sm:px-10 py-16 mb-20 relative overflow-hidden text-left" id="help-knowledge-base">
        <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-3xl mx-auto mb-12 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white   px-3.5 py-1 rounded-full mb-3 shadow-3xs">
            <HelpCircle className="w-3.5 h-3.5 text-[#C23A12]" />
            <span className="text-[10px] font-black text-[#C23A12] tracking-widest text-sentence">Self-Guided Help Database</span>
          </div>
          <h2 className="text-3xl font-display font-black text-neutral-900 tracking-tight">
            Browse Help Topics
          </h2>
          <p className="text-neutral-500 font-semibold text-xs sm:text-sm mt-3 leading-relaxed max-w-xl mx-auto">
            Pick a category below to find answers about tickets, refunds, your account, and bookings.
          </p>

          {/* Tabs switchers */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              onClick={() => { setActiveTab('safety'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all text-sentence cursor-pointer ${
                activeTab === 'safety' ? 'bg-[#E34718] text-white shadow-3xs' : 'bg-white text-neutral-600 hover:text-black  '
              }`}
            >
              Ticket Safety
            </button>
            <button
              onClick={() => { setActiveTab('refunds'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all text-sentence cursor-pointer ${
                activeTab === 'refunds' ? 'bg-[#E34718] text-white shadow-3xs' : 'bg-white text-neutral-600 hover:text-black  '
              }`}
            >
              Refunds & Fees
            </button>
            <button
              onClick={() => { setActiveTab('tech'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all text-sentence cursor-pointer ${
                activeTab === 'tech' ? 'bg-[#E34718] text-white shadow-3xs' : 'bg-white text-neutral-600 hover:text-black  '
              }`}
            >
              Dashboard & Tech
            </button>
            <button
              onClick={() => { setActiveTab('booking'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all text-sentence cursor-pointer ${
                activeTab === 'booking' ? 'bg-[#E34718] text-white shadow-3xs' : 'bg-white text-neutral-600 hover:text-black  '
              }`}
            >
              Seat Reservations
            </button>
          </div>
        </div>

        {/* Dynamic filter results display */}
        <div className="max-w-4xl mx-auto relative z-10 space-y-4">
          {searchQuery ? (
            <div className="bg-white   rounded-3xl p-6 shadow-3xs">
              <span className="text-neutral-400 text-[10px] font-bold text-sentence tracking-widest block mb-4">
                SEARCH RESULTS ({filteredArticles.length})
              </span>
              
              {filteredArticles.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm font-bold text-neutral-400">No article matches your criteria.</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#C23A12] underline font-bold mt-2"
                  >
                    Reset Search Filter
                  </button>
                </div>
              ) : (
                <div className="space-y-6  ">
                  {filteredArticles.map((art) => (
                    <div key={art.id} className="pt-4 first:pt-0 space-y-2">
                      <h4 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E34718]"></span>
                        {art.title}
                      </h4>
                      <p className="text-xs text-neutral-500 font-semibold leading-relaxed pl-3.5">
                        {art.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {knowledgebaseArticles[activeTab].map((art) => (
                <div 
                  key={art.id}
                  className="bg-white hover:bg-neutral-50/75   rounded-2xl p-6 transition-all shadow-3xs"
                >
                  <h4 className="font-display font-bold text-xs sm:text-sm text-neutral-900 tracking-tight leading-snug flex items-start gap-2">
                    <FileText className="w-4.5 h-4.5 text-[#E34718] shrink-0 mt-0.5" />
                    <span>{art.title}</span>
                  </h4>
                  <p className="text-xs text-neutral-400 font-semibold leading-relaxed mt-2.5">
                    {art.desc}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. DIRECT MULTI-METHOD CONTACT SUBMISSION FORM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10" id="contact-form-section">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
          
          {/* Info vertical grid columns */}
          <div className="lg:col-span-4 space-y-6">
            <h2 className="text-3xl font-display font-black tracking-tight text-neutral-900">
              Still Need Help?
            </h2>
            <p className="text-neutral-500 text-xs sm:text-sm font-semibold leading-relaxed">
              Send us a message and our support team will get back to you.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-[#E34718]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-[#E34718]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-800">Secure Tickets</h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-1">Every ticket is protected with a unique, scan-verified code.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-[#E34718]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-[#E34718]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-800">Secure Payments</h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-1 font-sans">Your payment details are never stored on our servers.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Submission Form Card */}
          <div className="lg:col-span-8">
            <div className="bg-white   rounded-[32px] p-6 sm:p-8 shadow-sm">
              <span className="text-neutral-400 text-[10px] font-bold text-sentence tracking-widest block mb-4">
                Contact Form
              </span>

              {formSubmitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#E34718]/10 flex items-center justify-center mx-auto text-[#E34718]">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-neutral-900">Message Sent!</h3>
                  <p className="text-xs text-neutral-500 font-semibold max-w-sm mx-auto">
                    Thanks for reaching out — our support team will get back to you within 2 hours.
                  </p>
                  <button 
                    onClick={() => setFormSubmitted(false)}
                    className="text-xs font-bold text-[#C23A12] hover:underline text-sentence pt-4 cursor-pointer"
                  >
                    Submit another query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-sentence tracking-wider text-neutral-400 mb-1.5 pl-0.5">Your Name</label>
                      <input 
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                        placeholder="e.g. Adrian Vance"
                        className="w-full bg-neutral-50   focus:outline-none focus:ring-1 focus:ring-[#E34718] rounded-xl p-3 text-xs sm:text-sm font-semibold text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-sentence tracking-wider text-neutral-400 mb-1.5 pl-0.5">Contact Email Address</label>
                      <input 
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                        placeholder="you@example.com"
                        className="w-full bg-neutral-50   focus:outline-none focus:ring-1 focus:ring-[#E34718] rounded-xl p-3 text-xs sm:text-sm font-semibold text-neutral-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-sentence tracking-wider text-neutral-400 mb-1.5 pl-0.5">What's this about?</label>
                    <select
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                      className="w-full bg-[#FAFBFD]   focus:outline-none focus:ring-1 focus:ring-[#E34718] rounded-xl p-3 text-xs font-bold text-neutral-700"
                    >
                      <option value="Verification Issue">Issue at venue entry</option>
                      <option value="Billing Discrepancy">Billing or payment issue</option>
                      <option value="General Information">General question</option>
                      <option value="API Access">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-sentence tracking-wider text-neutral-400 mb-1.5 pl-0.5">Tell us what's going on</label>
                    <textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      placeholder="Include the event name and your order number if you have it..."
                      className="w-full bg-neutral-50   focus:outline-none focus:ring-1 focus:ring-[#E34718] rounded-xl p-3 text-xs sm:text-sm font-semibold text-neutral-800 placeholder-neutral-400"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-[#E34718] hover:bg-[#C23A12] text-white text-xs font-bold text-sentence tracking-wider px-6 py-3.5 rounded-full transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Send Message</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* 6. IMMERSIVE FLOATING AUTONOMOUS CHAT MODULE */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {chatOpen ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white   rounded-[30px] shadow-2xl w-80 sm:w-96 overflow-hidden flex flex-col h-[450px]"
            >
              {/* Chat Header */}
              <div className="bg-[#0d0d0e] p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-[#E34718] rounded-full animate-ping"></div>
                  <div>
                    <h4 className="text-xs font-black font-mono tracking-widest text-[#E34718] leading-none">Jazba Support</h4>
                    <span className="text-[9px] text-neutral-500 font-bold">Typically replies in a few minutes</span>
                  </div>
                </div>
                <button 
                  onClick={() => setChatOpen(false)}
                  className="text-neutral-400 hover:text-white font-black text-xs px-2 py-1 rounded-full cursor-pointer bg-neutral-900"
                >
                  Minimize
                </button>
              </div>

              {/* Chat messages stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAFBFD] text-left">
                {chatLog.map((log, i) => (
                  <div key={i} className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      log.sender === 'user' 
                        ? 'bg-[#E34718] text-white font-bold rounded-tr-xs' 
                        : 'bg-white   text-neutral-800 font-semibold shadow-4xs rounded-tl-xs'
                    }`}>
                      <p>{log.text}</p>
                      <span className="block text-[8px] text-neutral-100/80 text-right mt-1 font-semibold">
                        {log.time}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white   p-2.5 rounded-2xl rounded-tl-xs shadow-4xs text-neutral-400 text-[10px] font-mono tracking-wide">
                      Typing...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat formulation form input */}
              <form onSubmit={handleSendMessage} className="p-2   bg-white flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="bg-neutral-50 px-3 py-2 rounded-full text-xs flex-1 focus:outline-none   focus:ring-1 focus:ring-[#E34718] font-semibold text-neutral-800"
                />
                <button 
                  type="submit"
                  className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-neutral-800 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </motion.div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setChatOpen(true)}
              className="bg-[#0d0d0e] hover:bg-neutral-900 text-white rounded-full px-5 py-3.5 shadow-xl flex items-center gap-2.5   cursor-pointer"
            >
              <div className="w-2.5 h-2.5 bg-[#E34718] rounded-full animate-pulse shrink-0"></div>
              <span className="text-xs font-black text-sentence tracking-wider text-white">Chat with us</span>
              <MessageSquare className="w-4 h-4 text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
