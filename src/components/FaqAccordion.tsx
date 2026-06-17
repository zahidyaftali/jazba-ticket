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
      className="bg-white py-18 px-4 sm:px-6 md:px-8 border-b border-neutral-200/50" 
      id="faq"
    >
      <div className="max-w-3xl mx-auto">
        
        {/* HEADING ACCORDION TEXT */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 tracking-tight leading-tight max-w-xl mx-auto">
            Frequently Asked Questions
          </h2>
          <p className="text-[17px] text-neutral-500 mt-2 font-normal">
            Find immediate answers regarding premium passes, verification, and orders.
          </p>
        </div>

        {/* ACCORDION WRAPPER */}
        <div className="divide-y divide-neutral-200/70 border-t border-b border-neutral-200/70">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <div 
                key={faq.id}
                className="py-1"
                id={`faq-item-${faq.id}`}
              >
                {/* FAQ TRIGGER BUTTON */}
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full flex items-center justify-between py-5 px-1 bg-white text-left font-bold text-sm sm:text-base text-neutral-800 hover:text-black focus:outline-none transition-colors cursor-pointer"
                >
                  <span className="pr-4 leading-tight font-display font-medium text-neutral-950">{faq.question}</span>
                  <div className="shrink-0 w-8 h-8 rounded-full border border-neutral-100 flex items-center justify-center bg-neutral-50 text-neutral-600">
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
                      <div className="pb-5 px-1 bg-white text-neutral-500 font-medium text-xs sm:text-[14px] leading-relaxed">
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
