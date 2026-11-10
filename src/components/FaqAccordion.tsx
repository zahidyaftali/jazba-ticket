import React, { useState } from 'react';
import { Plus, Minus, Mail, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FAQItem } from '../types';
import { Reveal, SectionHead, SoftBand } from './Decor';

interface FaqAccordionProps {
  faqs: FAQItem[];
  eyebrow?: string;
  title?: string;
  intro?: string;
}

/** Common questions, answered plainly — with a way to reach a person. */
export default function FaqAccordion({
  faqs,
  eyebrow = 'Before you book',
  title = 'Good to know',
  intro = 'The things people ask us most. If your question isn’t here, we’re a message away.',
}: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  return (
    <SoftBand id="faq" labelledBy="faq-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <SectionHead id="faq-title" eyebrow={eyebrow} title={title} sub={intro} className="mb-6" />
          <Reveal delay={120} className="jz-glass p-5">
            <p className="font-bold text-sm">Still stuck?</p>
            <p className="text-sm text-[#555] mt-1">Our team in Birmingham answers Monday to Friday, 10:30am to 5:30pm UK time.</p>
            <div className="flex flex-col gap-2 mt-4 text-sm font-bold">
              <a href="mailto:info@jazbatickets.com" className="inline-flex items-center gap-2 hover:underline">
                <Mail className="w-4 h-4" /> info@jazbatickets.com
              </a>
              <a href="tel:+443335777014" className="inline-flex items-center gap-2 hover:underline">
                <Phone className="w-4 h-4" /> 0333 577 7014
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={80} className="lg:col-span-8 jz-glass">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className="border-b border-black/[0.06] last:border-b-0" id={`faq-item-${faq.id}`}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 sm:px-7 py-5 text-left cursor-pointer group"
                >
                  <span className="font-display font-bold text-base sm:text-lg leading-tight text-black group-hover:opacity-70 transition-opacity">
                    {faq.question}
                  </span>
                  <span
                    className={`shrink-0 w-8 h-8 flex items-center justify-center transition-colors ${
                      isOpen ? 'bg-black text-[#ffed00]' : 'bg-white/70 border border-black/10 text-black'
                    }`}
                  >
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 sm:px-7 pb-6 -mt-1 text-[15px] text-[#444] leading-relaxed max-w-2xl">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </div>
    </SoftBand>
  );
}
