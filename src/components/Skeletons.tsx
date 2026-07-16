import React from 'react';

// Shared skeleton loaders — grey pulsing placeholders shown while Firestore
// data streams in, so pages never render as blank white space.

/** Placeholder cards matching the event card grid (home + explorer). */
export function EventGridSkeleton({ count = 4, cols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' }: { count?: number; cols?: string }) {
  return (
    <div className={`grid ${cols} gap-6`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-neutral-200 aspect-[4/3] w-full" />
          <div className="bg-neutral-200 h-4 w-3/4 mt-4" />
          <div className="bg-neutral-100 h-3 w-1/2 mt-2" />
          <div className="bg-neutral-100 h-3 w-2/3 mt-2" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a full detail page (event / artist / organiser). */
export function DetailPageSkeleton() {
  return (
    <div className="jz-page bg-white min-h-screen" aria-busy="true" aria-label="Loading page">
      <div className="animate-pulse">
        <div className="bg-neutral-200 w-full h-64 sm:h-80" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-neutral-200 h-8 w-2/3" />
            <div className="bg-neutral-100 h-4 w-1/2" />
            <div className="bg-neutral-100 h-4 w-full mt-6" />
            <div className="bg-neutral-100 h-4 w-full" />
            <div className="bg-neutral-100 h-4 w-3/4" />
          </div>
          <div className="lg:col-span-4">
            <div className="bg-neutral-200 h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Placeholder rows for list-style content (bookings, tickets, results). */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse flex gap-4 items-center">
          <div className="bg-neutral-200 w-20 h-20 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="bg-neutral-200 h-4 w-1/2" />
            <div className="bg-neutral-100 h-3 w-1/3" />
            <div className="bg-neutral-100 h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
