import React, { useEffect, useRef, useState } from 'react';

// ── Small visual touches used across the public site ──────────────────────
// Kept deliberately quiet: slow movement, soft colour, and nothing that
// gets in the way of reading or booking. Everything here is decorative
// (aria-hidden) and switches off for people who prefer reduced motion.

/** Soft, slowly drifting colour glows behind a section. Put it inside a
 *  `relative` (and usually `overflow-hidden`) parent, before the content. */
export function GlowField({ tone = 'dark', className = '' }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <div aria-hidden className={`jz-glow ${tone === 'dark' ? 'jz-glow-dark' : 'jz-glow-light'} ${className}`}>
      <span className="jz-blob jz-blob-a" />
      <span className="jz-blob jz-blob-b" />
      <span className="jz-blob jz-blob-c" />
    </div>
  );
}

/** A ticket outline: rounded corners, notches either side and a perforation. */
export function TicketShape({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="-2 -2 68 40" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M4 0H60a4 4 0 0 1 4 4V13a5 5 0 0 0 0 10V32a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V23a5 5 0 0 0 0-10V4a4 4 0 0 1 4-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M46 5V31" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.5 3" />
    </svg>
  );
}

const DOODLES = [
  { left: '4%', top: '14%', size: 74, rotate: -14, delay: 0 },
  { left: '88%', top: '10%', size: 58, rotate: 12, delay: -3 },
  { left: '78%', top: '72%', size: 82, rotate: -6, delay: -6 },
  { left: '12%', top: '78%', size: 54, rotate: 18, delay: -2 },
  { left: '46%', top: '6%', size: 46, rotate: 6, delay: -5, wide: true },
  { left: '58%', top: '86%', size: 50, rotate: -20, delay: -8, wide: true },
];

/** Faint tickets floating in a light section's background. */
export function TicketDoodles({ className = '', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  return (
    <div aria-hidden className={`jz-doodles ${tone === 'dark' ? 'text-white/[0.07]' : 'text-black/[0.06]'} ${className}`}>
      {DOODLES.map((d, i) => (
        <span
          key={i}
          className={`jz-doodle ${d.wide ? 'hidden md:block' : ''}`}
          style={{ left: d.left, top: d.top, animationDelay: `${d.delay}s`, ['--jz-r' as string]: `${d.rotate}deg` }}
        >
          <TicketShape style={{ width: d.size, height: d.size * 0.58 }} />
        </span>
      ))}
    </div>
  );
}

/** A light, warm band with soft colour glows — the look of "Booking takes
 *  three steps" on the home page, reused for other explainer sections. */
export function SoftBand({
  children,
  className = '',
  id,
  doodles = false,
  labelledBy,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  doodles?: boolean;
  labelledBy?: string;
}) {
  return (
    <section className={`relative overflow-hidden bg-[#fbfbf7] ${className}`} id={id} aria-labelledby={labelledBy}>
      <GlowField tone="light" />
      {doodles && <TicketDoodles />}
      <div className="jz-above">{children}</div>
    </section>
  );
}

/** Section heading in the same style: a small ticket mark + eyebrow, a big
 *  title, and an optional link or button on the right. */
export function SectionHead({
  eyebrow,
  title,
  sub,
  action,
  id,
  className = 'mb-10',
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <Reveal className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 ${className}`}>
      <div className="max-w-2xl">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#666] inline-flex items-center gap-2">
          <TicketShape className="w-6 h-4 text-black" /> {eyebrow}
        </span>
        <h2 id={id} className="text-3xl md:text-4xl font-display font-bold text-black tracking-tight leading-[0.95] mt-2">
          {title}
        </h2>
        {sub && <p className="text-sm sm:text-base text-[#555] leading-relaxed mt-3">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}

/** A frosted card: black icon square, a big faint number, title and text. */
export function StepCard({
  icon: Icon,
  n,
  title,
  children,
  delay = 0,
  as = 'li',
}: {
  icon: React.ElementType;
  n?: number | string;
  title: string;
  children: React.ReactNode;
  delay?: number;
  as?: 'li' | 'div';
}) {
  return (
    <Reveal as={as} delay={delay} className="jz-glass p-6 sm:p-7 relative h-full">
      <div className="flex items-center justify-between">
        <span className="w-11 h-11 bg-black text-[#ffed00] flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </span>
        {n !== undefined && <span className="font-display font-bold text-5xl leading-none text-black/[0.08]">{n}</span>}
      </div>
      <h3 className="font-display font-bold text-xl mt-5">{title}</h3>
      <div className="text-sm text-[#555] leading-relaxed mt-2">{children}</div>
    </Reveal>
  );
}

/** Fades content up slowly the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'span';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as any;
  return (
    <Tag ref={ref} className={`jz-reveal ${shown ? 'is-in' : ''} ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
