import React, { useState } from 'react';
import { MapPin, Clock, Heart, ArrowRight } from 'lucide-react';
import { EventItem } from '../types';

interface EventCardProps {
  key?: string;
  event: EventItem;
  onBook: (event: EventItem) => void;
  onViewDetail?: (event: EventItem) => void;
}

export default function EventCard({ event, onBook, onViewDetail }: EventCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  // Determine badge background colors based on parameters or static values
  const getBadgeColorClass = (color?: string) => {
    switch (color) {
      case 'blue':
        return 'bg-sky-500 text-white'; // Refined blue
      case 'teal':
        return 'bg-[#E34718] text-white'; // Authentic premium orange
      case 'orange':
        return 'bg-orange-500 text-white'; // Refined orange
      case 'yellow':
      default:
        return 'bg-[#E34718] text-white'; // Authentic premium orange
    }
  };

  const [day, month] = event.date.split(' ');

  return (
    <div 
      onClick={() => onViewDetail?.(event)}
      className="group bg-white    rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
      id={`event-card-${event.id}`}
    >
      <div className="relative">
        {/* IMAGE CONTAINER */}
        <div className="h-44 sm:h-48 overflow-hidden relative">
          <img 
            src={event.image} 
            alt={event.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"></div>
        </div>

        {/* DATE BADGE */}
        <div className={`absolute top-3.5 left-3.5 w-11 h-12 rounded-xl flex flex-col items-center justify-center   font-black leading-none shadow-sm shrink-0 ${getBadgeColorClass(event.badgeColor)}`}>
          <span className="text-[15px] font-display font-black">{day || '18'}</span>
          <span className="text-[9px] text-sentence font-bold tracking-wider mt-0.5">{month || 'Feb'}</span>
        </div>

        {/* FAVORITE HEART WITH REAL INTERACTIVE STATE */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/95 hover:bg-white flex items-center justify-center   shadow-md transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
          title="Add to wishlist"
          id={`btn-like-${event.id}`}
        >
          <Heart 
            className={`w-3.5 h-3.5 transition-colors duration-300 ${
              isLiked ? 'fill-red-500 text-red-500' : 'text-neutral-700'
            }`} 
          />
        </button>
      </div>

      {/* METADATA CONTENT */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-base text-neutral-800 tracking-tight leading-snug group-hover:text-[#E34718] transition-colors line-clamp-1">
            {event.title}
          </h3>

          <div className="mt-3.5 space-y-2">
            {/* LOCATION */}
            <div className="flex items-center gap-1.5 text-neutral-500 font-medium text-xs sm:text-[13px]">
              <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>

            {/* TIME */}
            <div className="flex items-center gap-1.5 text-neutral-500 font-medium text-xs sm:text-[13px]">
              <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>{event.time}</span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE BOOK BUTTON */}
        <div className="pt-3.5   flex items-center justify-between">
          <div>
            <span className="text-[9px] font-semibold text-neutral-400 block text-sentence tracking-wider">Prices from</span>
            <span className="font-display font-black text-neutral-900 text-lg">${event.price}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onBook(event); }}
            className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white px-4.5 py-2.5 rounded-full shadow-sm text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer"
            id={`btn-book-${event.id}`}
          >
            Buy Ticket
            <ArrowRight className="w-3 h-3 text-[#E34718]" />
          </button>
        </div>
      </div>
    </div>
  );
}
