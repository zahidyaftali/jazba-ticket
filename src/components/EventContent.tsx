import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, FileText } from 'lucide-react';
import { ContentBlock, ContentSection, TextRun } from '../types';

// Renders the full body of a jazbaentertainment.com event post (see
// ContentBlock in src/types.ts), in the site's own black/white/yellow style.

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';
export const sectionHeadingClass = 'font-display font-bold text-2xl leading-[0.95] border-b border-black pb-4';

/** Text runs with bold, italics and links. "/…" links stay on this site;
 *  web links open in a new tab; mailto:/tel: open the mail or phone app. */
export function RichText({ runs }: { runs: TextRun[] }) {
  return (
    <>
      {runs.map((run, i) => {
        let node: React.ReactNode = run.text;
        if (run.italic) node = <em>{node}</em>;
        if (run.bold) node = <strong className="font-bold text-black">{node}</strong>;
        if (run.href) {
          const linkClass = 'underline underline-offset-2 decoration-1 hover:opacity-60 transition-opacity';
          node = run.href.startsWith('/') ? (
            <Link to={run.href} className={linkClass}>{node}</Link>
          ) : (
            <a
              href={run.href}
              className={linkClass}
              {...(/^https?:/i.test(run.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {node}
            </a>
          );
        }
        return <React.Fragment key={i}>{node}</React.Fragment>;
      })}
    </>
  );
}

/** "<b>Doors open:</b> 6:00 pm" → label + value. */
function splitFact(runs: TextRun[]): { label: string; value: TextRun[] } {
  const [first, ...rest] = runs;
  if (!first?.bold || !/:\s*$/.test(first.text)) return { label: '', value: runs };
  const value = rest.map((r, i) => (i === 0 ? { ...r, text: r.text.replace(/^\s+/, '') } : r)).filter((r) => r.text);
  return { label: first.text.replace(/:\s*$/, ''), value };
}

const isNumeric = (cell: string) => /^[\s\d.,+%£$€-]+$/.test(cell) && /\d/.test(cell);

function Block({ block, lineup }: { key?: React.Key; block: ContentBlock; lineup: React.ReactNode }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-base text-[#222] leading-relaxed whitespace-pre-line">
          <RichText runs={block.runs} />
        </p>
      );

    case 'subheading':
      return <h3 className="font-display font-bold text-lg pt-2">{block.text}</h3>;

    case 'list':
      if (block.facts) {
        return (
          <dl className="border-t border-[#f2f2f2]">
            {block.items.map((runs, i) => {
              const { label, value } = splitFact(runs);
              return (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-x-6 gap-y-1 py-3.5 border-b border-[#f2f2f2] text-sm"
                >
                  <dt className={`${overline} text-[#8a8a8a] sm:pt-1`}>{label}</dt>
                  <dd className="text-[#222] leading-relaxed break-words">
                    <RichText runs={value} />
                  </dd>
                </div>
              );
            })}
          </dl>
        );
      }
      return (
        <ul className="space-y-2.5">
          {block.items.map((runs, i) => (
            <li key={i} className="flex gap-3 text-base text-[#222] leading-relaxed">
              <span className="w-1.5 h-1.5 bg-black mt-[0.65em] shrink-0" />
              <span className="min-w-0 break-words">
                <RichText runs={runs} />
              </span>
            </li>
          ))}
        </ul>
      );

    case 'table': {
      const numericCols = (block.head.length ? block.head : block.rows[0] || []).map(
        (_, col) => block.rows.length > 0 && block.rows.every((row) => !row[col] || isNumeric(row[col])),
      );
      return (
        <div className="overflow-x-auto border border-[#e4e4e4]">
          <table className="w-full text-sm">
            {block.head.length > 0 && (
              <thead>
                <tr className="bg-black text-white">
                  {block.head.map((cell, i) => (
                    <th key={i} className={`${overline} px-4 py-3 ${numericCols[i] ? 'text-right' : 'text-left'}`}>
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t border-[#f2f2f2] first:border-t-0">
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 ${numericCols[i] ? 'text-right font-bold tabular-nums whitespace-nowrap' : 'text-[#222]'}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'image':
      return (
        <figure>
          <img
            src={block.src}
            alt={block.alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-auto border border-[#e4e4e4] bg-[#f7f7f7]"
          />
          {block.caption && <figcaption className="text-xs text-[#8a8a8a] mt-2">{block.caption}</figcaption>}
        </figure>
      );

    case 'partners':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#f2f2f2] border border-[#f2f2f2]">
          {block.items.map((partner, i) => (
            <div key={i} className="bg-white p-6 text-center">
              {partner.logo && (
                <div className="h-24 flex items-center justify-center">
                  <img
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="max-h-24 max-w-[150px] object-contain"
                  />
                </div>
              )}
              <h4 className="font-display font-bold text-base mt-4">{partner.name}</h4>
              {partner.role && <span className={`${overline} text-[#8a8a8a] block mt-1.5`}>{partner.role}</span>}
            </div>
          ))}
        </div>
      );

    case 'packages':
      return (
        <div>
          {block.lead && <p className="text-base text-[#222] leading-relaxed">{block.lead}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#e4e4e4] border border-[#e4e4e4] mt-6">
            {block.items.map((pkg, i) => (
              <div key={i} className={`p-6 ${pkg.featured ? 'bg-black text-white' : 'bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-display font-bold text-lg leading-tight">{pkg.name}</h4>
                  {pkg.badge && (
                    <span className={`${overline} bg-[#ffed00] text-black px-2 py-1 shrink-0`}>{pkg.badge}</span>
                  )}
                </div>
                {pkg.price && <div className="font-display font-bold text-2xl mt-3">{pkg.price}</div>}
                {pkg.points.length > 0 && (
                  <ul className="mt-5 space-y-2.5 text-sm">
                    {pkg.points.map((point, j) => (
                      <li key={j} className={`flex gap-2.5 leading-relaxed ${pkg.featured ? 'text-white/80' : 'text-[#444]'}`}>
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${pkg.featured ? 'text-[#ffed00]' : ''}`} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          {block.note && <p className="text-sm text-[#666] leading-relaxed mt-5">{block.note}</p>}
          {block.action && (
            <a
              href={block.action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-3.5 mt-6 text-sm font-bold hover:bg-neutral-800 transition-colors"
            >
              {block.action.label} <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      );

    case 'link':
      return (
        <a
          href={block.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-4 border border-black px-5 py-4 text-sm font-bold hover:bg-[#f7f7f7] transition-colors"
        >
          <span className="flex items-center gap-3">
            <FileText className="w-5 h-5 shrink-0" /> {block.label}
          </span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </a>
      );

    case 'lineup':
      return <>{lineup}</>;

    case 'tickets':
      return null; // the page renders dates/venues and group packages after this section
  }
}

/** One section of the post: optional eyebrow + heading, then its blocks. */
export function ContentSectionView({
  section,
  heading,
  lineup,
}: {
  section: ContentSection;
  /** Heading to use when the section has none (e.g. the opening text). */
  heading?: string;
  lineup: React.ReactNode;
}) {
  const title = section.heading || heading;
  const blocks = section.blocks.filter((b) => b.type !== 'tickets');
  if (!title && blocks.length === 0) return null;
  return (
    <section>
      {section.eyebrow && <span className={`${overline} text-[#666] block mb-2`}>{section.eyebrow}</span>}
      {title && <h2 className={sectionHeadingClass}>{title}</h2>}
      <div className={`space-y-5 ${title ? 'mt-6' : ''}`}>
        {blocks.map((block, i) => (
          <Block key={i} block={block} lineup={lineup} />
        ))}
      </div>
    </section>
  );
}
