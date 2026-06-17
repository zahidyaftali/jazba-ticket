import React from 'react';
import { Music, Trophy, Sparkles, Presentation, GalleryHorizontal, Eye, Drama, Compass } from 'lucide-react';
import { CategoryItem } from '../types';

interface CategoryCirclesProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export default function CategoryCircles({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategoryCirclesProps) {

  // Map icon types to specific Lucide components styled beautifully with uniform neutral colors
  const getCategoryTheme = (iconType: string) => {
    const iconColor = 'text-neutral-800';
    switch (iconType) {
      case 'music':
        return {
          icon: <Music className={`w-7 h-7 ${iconColor}`} strokeWidth={1.3} />,
          bgColor: 'bg-[#F2ECE1] hover:bg-[#EAE2D1]'
        };
      case 'theater':
        return {
          icon: <Drama className={`w-7 h-7 ${iconColor}`} strokeWidth={1.3} />,
          bgColor: 'bg-[#F2ECE1] hover:bg-[#EAE2D1]'
        };
      case 'sports':
        return {
          icon: <Trophy className={`w-7 h-7 ${iconColor}`} strokeWidth={1.3} />,
          bgColor: 'bg-[#F2ECE1] hover:bg-[#EAE2D1]'
        };
      case 'festivals':
        return {
          icon: <Sparkles className={`w-7 h-7 ${iconColor}`} strokeWidth={1.3} />,
          bgColor: 'bg-[#F2ECE1] hover:bg-[#EAE2D1]'
        };
      case 'conferences':
        return {
          icon: <Presentation className={`w-7 h-7 ${iconColor}`} strokeWidth={1.3} />,
          bgColor: 'bg-[#F2ECE1] hover:bg-[#EAE2D1]'
        };
      case 'exhibitions':
        return {
          icon: <GalleryHorizontal className={`w-7 h-7 ${iconColor}`} strokeWidth={1.3} />,
          bgColor: 'bg-[#F2ECE1] hover:bg-[#EAE2D1]'
        };
      default:
        return {
          icon: <Compass className={`w-7 h-7 ${iconColor}`} strokeWidth={1.3} />,
          bgColor: 'bg-[#F2ECE1] hover:bg-[#EAE2D1]'
        };
    }
  };

  return (
    <div 
      className="max-w-7xl mx-auto px-4 py-16 text-center  "
      id="discover"
    >
      <div className="max-w-xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 tracking-tight">
          Discover Live Shows
        </h2>
        <p className="text-[17px] text-neutral-500 mt-2 font-normal">
          Browse events by category to find what you're looking for.
        </p>
      </div>

      {/* HORIZONTAL WRAPPER AND FLEX */}
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-10">
        {categories.map((cat) => {
          if (cat.id === 'all') {
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="flex flex-col items-center focus:outline-none group cursor-pointer"
              >
                <div 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 bg-[#F2ECE1] hover:bg-[#EAE2D1]   shadow-xs hover:-translate-y-0.5"
                >
                  <Compass className="w-7 h-7 transition-transform duration-300 text-neutral-800 group-hover:rotate-12" strokeWidth={1.3} />
                </div>
                <span className="text-[13px] tracking-tight leading-tight mt-3 transition-colors text-neutral-600 font-medium group-hover:text-neutral-900">
                  All Events
                </span>
              </button>
            );
          }

          const theme = getCategoryTheme(cat.iconType);

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="flex flex-col items-center focus:outline-none group cursor-pointer"
            >
              {/* THE ROUND CIRCULAR BADGE */}
              <div 
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 ${theme.bgColor}   shadow-xs hover:-translate-y-0.5`}
              >
                <div className="transition-transform duration-300 group-hover:rotate-6">
                  {theme.icon}
                </div>
              </div>

              {/* CATEGORY TEXT NAME */}
              <span className="text-[13px] tracking-tight leading-tight mt-3 transition-colors text-neutral-600 font-medium group-hover:text-neutral-900">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
