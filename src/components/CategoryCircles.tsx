import React from 'react';
import { ArrowRight, Compass, Drama, GalleryHorizontal, Music, Presentation, Sparkles, Trophy } from 'lucide-react';
import { CategoryItem } from '../types';
import { Reveal, SectionHead } from './Decor';

interface CategoryCirclesProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  /** Upcoming events per category id ('all' = every event). Categories with
   *  nothing on are left out. */
  counts?: Record<string, number>;
}

const ICONS: Record<string, React.ElementType> = {
  music: Music,
  theater: Drama,
  sports: Trophy,
  festivals: Sparkles,
  conferences: Presentation,
  exhibitions: GalleryHorizontal,
};

/** Categories as simple tiles: an icon, the name and how many shows are on. */
export default function CategoryCircles({ categories, onSelectCategory, counts }: CategoryCirclesProps) {
  const shown = categories.filter((c) => c.id === 'all' || !counts || (counts[c.id] || 0) > 0);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-14 pb-12 sm:pt-16" id="discover">
      <SectionHead eyebrow="Browse" title="Pick a category" className="mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {shown.map((cat, i) => {
          const Icon = cat.id === 'all' ? Compass : ICONS[cat.iconType] || Compass;
          const n = counts?.[cat.id];
          return (
            <React.Fragment key={cat.id}>
              <Reveal delay={Math.min(i, 5) * 80}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className="group w-full h-full flex items-center gap-3 sm:gap-4 bg-white border border-[#e4e4e4] hover:border-black p-3.5 sm:p-4 text-left cursor-pointer transition-colors"
                >
                  <span className="w-10 h-10 sm:w-11 sm:h-11 bg-black text-[#ffed00] flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:-rotate-6">
                    <Icon className="w-5 h-5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display font-bold text-sm sm:text-base block leading-tight">
                      {cat.id === 'all' ? 'All events' : cat.name}
                    </span>
                    {typeof n === 'number' && (
                      <span className="text-xs text-[#8a8a8a] block mt-0.5">
                        {n} {n === 1 ? 'event' : 'events'}
                      </span>
                    )}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 hidden sm:block" />
                </button>
              </Reveal>
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}
