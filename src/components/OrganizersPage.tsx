import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Building2 } from 'lucide-react';
import { getAllOrganizers, OrganizerProfile } from '../services/backendService';
import { EventGridSkeleton } from './Skeletons';

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

export default function OrganizersPage() {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    getAllOrganizers()
      .then((list) => setOrganizers(list))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? organizers.filter((org) =>
          org.companyName.toLowerCase().includes(q) ||
          (org.location || '').toLowerCase().includes(q) ||
          (org.specialties || []).some((s) => s.toLowerCase().includes(q)),
        )
      : organizers;
    // Featured organisers lead the grid
    return [...list].sort((a, b) => Number(b.featured || false) - Number(a.featured || false));
  }, [organizers, searchQuery]);

  return (
    <div className="jz-page bg-white min-h-screen text-black pb-24" id="organizers-page-root">

      {/* ── HERO — black band ─────────────────────────────────── */}
      <section className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide text-white/60 bg-white/5 backdrop-blur-md px-3.5 py-1.5">
            <span onClick={() => navigate('/')} className="hover:text-white cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="text-white">Organisers</span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-[56px] leading-[0.95] tracking-tight mt-5 max-w-3xl">
            The teams behind <span className="text-[#ffed00]">the shows.</span>
          </h1>
          <p className="text-white/70 text-base sm:text-lg mt-5 max-w-2xl leading-relaxed">
            Meet the event organisers on Jazba Tickets — browse their profiles, follow the ones you love, and never miss what they put on next.
          </p>

          {/* Search */}
          <div className="max-w-xl mt-10 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search organisers by name, city or speciality…"
              className="w-full bg-[#111111] text-white placeholder-white/40 pl-11 pr-4 py-4 text-sm"
            />
          </div>
        </div>
      </section>

      {/* ── GRID — white catalogue ────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-12">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-display font-bold text-3xl leading-[0.95]">
            {searchQuery.trim() ? `Results for "${searchQuery}"` : 'All organisers'}
          </h2>
          <span className="text-sm text-[#666] shrink-0">{filtered.length} listed</span>
        </div>

        {loading ? (
          <EventGridSkeleton count={6} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((org) => (
              <button
                key={org.id}
                onClick={() => navigate(`/organizers/${org.id}`)}
                className="group text-left border border-[#e4e4e4] hover:border-black transition-colors cursor-pointer flex flex-col"
              >
                {/* Banner */}
                <div className="h-32 bg-[#f7f7f7] overflow-hidden relative">
                  {org.bannerUrl ? (
                    <img
                      src={org.bannerUrl}
                      alt={org.companyName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-[#ffed00]" />
                    </div>
                  )}
                  {org.featured && (
                    <span className={`${overline} absolute top-3 left-3 bg-[#ffed00] text-black px-2.5 py-1`}>Featured</span>
                  )}
                </div>

                {/* Body */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full overflow-hidden bg-[#f2f2f2] flex items-center justify-center shrink-0 -mt-11 border-2 border-white relative z-10">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-sm">{org.companyName.charAt(0)}</span>
                      )}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl leading-tight mt-3 group-hover:underline">
                    {org.companyName}
                  </h3>
                  {org.location && (
                    <span className="flex items-center gap-1.5 text-sm text-[#666] mt-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {org.location}
                    </span>
                  )}
                  {org.description && (
                    <p className="text-sm text-[#666] leading-relaxed mt-3 line-clamp-2">{org.description}</p>
                  )}
                  {(org.specialties?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {org.specialties!.slice(0, 3).map((s) => (
                        <span key={s} className={`${overline} border border-[#e4e4e4] px-2 py-1 text-[#666]`}>{s}</span>
                      ))}
                    </div>
                  )}
                  <span className="flex items-center gap-1.5 text-sm font-bold mt-auto pt-5">
                    View profile <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="border border-[#f2f2f2] py-20 text-center">
            <p className="font-bold">No organisers found{searchQuery.trim() ? ` for "${searchQuery}"` : ' yet'}.</p>
            <p className="text-sm text-[#666] mt-2">Check back soon — new organisers join Jazba Tickets all the time.</p>
          </div>
        )}
      </section>
    </div>
  );
}
