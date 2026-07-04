import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FAQItem } from '../types';

interface FaqAccordionProps {
  faqs: FAQItem[];
}

export default function FaqAccordion({ faqs }: FaqAccordionProps) {
  // Opening the first item by default
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section 
      className="bg-white py-18 px-4 sm:px-6 md:px-8  " 
      id="faq"
    >
      <div className="max-w-3xl mx-auto">
        
        {/* HEADING ACCORDION TEXT */}
        <div className="text-center mb-12">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#666]">Support</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-black tracking-tight leading-[0.95] max-w-xl mx-auto mt-2">
            Questions, answered.
          </h2>
        </div>

        {/* ACCORDION WRAPPER */}
        <div className="border-t border-[#f2f2f2]">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <div
                key={faq.id}
                className="border-b border-[#f2f2f2]"
                id={`faq-item-${faq.id}`}
              >
                {/* FAQ TRIGGER BUTTON */}
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full flex items-center justify-between gap-4 py-5 bg-white text-left focus:outline-none cursor-pointer group"
                >
                  <span className="font-display font-bold text-base sm:text-lg leading-tight text-black group-hover:opacity-70 transition-opacity">{faq.question}</span>
                  <div className="shrink-0 w-8 h-8 border border-[#e4e4e4] flex items-center justify-center text-black">
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                {/* EXPANDABLE BODY */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <div className="pb-5 bg-white text-[#666] text-sm leading-relaxed">
                        <p>{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
