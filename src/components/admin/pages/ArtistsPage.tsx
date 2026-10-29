import React, { useEffect, useMemo, useState } from "react";
import { PlusCircle, Trash2, Edit3, Users, Loader2, ExternalLink, Star, LayoutGrid, List, Download, MapPin } from "lucide-react";
import {
  createArtistProfile,
  updateArtistProfile,
  deleteArtistProfile,
  purgeCollection,
  ArtistProfile,
} from "../../../services/backendService";
import { SEED_ARTISTS } from "../../../seedArtists";
import { auth } from "../../../firebase";
import { useAdmin } from "../AdminContext";
import {
  Avatar,
  Badge,
  DataTable,
  EditorHeader,
  EditorPanel,
  EmptyRow,
  EmptyState,
  Field,
  FilterTabs,
  IconButton,
  ImageUrlField,
  PageHeader,
  SearchInput,
  Switch,
  TableFooter,
  Toolbar,
  addRowBtnCls,
  btnDark,
  btnOutline,
  btnPrimary,
  downloadCsv,
  inputCls,
  money,
  selectCls,
  tdCls,
  thCls,
} from "../ui";

const BLANK_ARTIST_FORM = {
  stageName: "",
  bio: "",
  category: "music" as ArtistProfile["category"],
  subCategory: "",
  profileImage: "",
  coverImage: "",
  genres: [] as string[],
  hourlyRate: 150,
  location: "London, UK",
  experienceYears: 5,
  availableNow: true,
  featured: false,
  socialWebsite: "",
  socialInstagram: "",
  socialSpotify: "",
  socialYoutube: "",

  // ---- Artist page content (each hides its section when left empty) ----
  rating: "",
  totalReviews: "",
  eventsHosted: "",
  totalAudience: "",
  pastShows: [] as { title: string; date: string; venue: string }[],
};
type ArtistForm = typeof BLANK_ARTIST_FORM;

const CATEGORY_LABELS: Record<string, string> = {
  music: "Music",
  theater: "Theater",
  sports: "Sports",
  conference: "Conference",
  exhibition: "Exhibition",
};

export default function ArtistsPage() {
  const { route } = useAdmin();
  // Keyed so switching between "new" and an edit (or two edits) starts a fresh form.
  if (route.sub === "new" || route.sub === "edit") {
    return (
      <React.Fragment key={`${route.sub}:${route.id}`}>
        <ArtistEditor artistId={route.sub === "edit" ? route.id : undefined} />
      </React.Fragment>
    );
  }
  return <ArtistsList />;
}

// ── List ───────────────────────────────────────────────────────────────────

type ArtistTab = "all" | "featured" | "available" | "unavailable";

function ArtistsList() {
  const { data, navigate, notify, fail, reload } = useAdmin();
  const artists = data.artists;
  const [tab, setTab] = useState<ArtistTab>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"name" | "fee-high" | "fee-low" | "rating">("name");
  const [view, setView] = useState<"table" | "grid">(() => {
    try {
      return localStorage.getItem("jz_admin_artist_view") === "grid" ? "grid" : "table";
    } catch {
      return "table";
    }
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState("");
  const [working, setWorking] = useState(false);
  const [importingRoster, setImportingRoster] = useState(false);
  const [purging, setPurging] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const chooseView = (v: "table" | "grid") => {
    setView(v);
    try {
      localStorage.setItem("jz_admin_artist_view", v);
    } catch {
      /* not remembered — fine */
    }
  };

  const inTab = (a: ArtistProfile, t: ArtistTab) =>
    t === "all" ? true : t === "featured" ? !!a.featured : t === "available" ? a.availableNow !== false : a.availableNow === false;
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = artists.filter((a) => {
      if (!inTab(a, tab)) return false;
      if (category && (a.category || "music") !== category) return false;
      if (!q) return true;
      return [a.stageName, a.subCategory, a.location, ...(a.genres || [])].some((v) => (v || "").toLowerCase().includes(q));
    });
    return list.sort((a, b) => {
      if (sort === "fee-high") return (b.hourlyRate || 0) - (a.hourlyRate || 0);
      if (sort === "fee-low") return (a.hourlyRate || 0) - (b.hourlyRate || 0);
      if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
      return (a.stageName || "").localeCompare(b.stageName || "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artists, tab, category, q, sort]);
  const count = (t: ArtistTab) => artists.filter((a) => inTab(a, t)).length;

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allSelected = filtered.length > 0 && filtered.every((a) => a.id && selected.has(a.id));

  const quickUpdate = async (a: ArtistProfile, update: Partial<ArtistProfile>, msg: string) => {
    if (!a.id) return;
    setBusyId(a.id);
    try {
      await updateArtistProfile(a.id, update);
      notify(msg);
      await reload();
    } catch {
      fail("Failed to update the artist. Make sure updated Firestore rules have been deployed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (artistId: string) => {
    if (!window.confirm("Delete this artist? This action cannot be undone.")) return;
    try {
      await deleteArtistProfile(artistId);
      notify("Artist profile removed.");
      reload();
    } catch {
      fail("Failed to delete artist profile.");
    }
  };

  const applyBulk = async () => {
    const ids = [...selected];
    if (!bulk || ids.length === 0) return;
    if (bulk === "delete" && !window.confirm(`Delete ${ids.length} artist(s)? This cannot be undone.`)) return;
    const updates: Record<string, Partial<ArtistProfile>> = {
      feature: { featured: true },
      unfeature: { featured: false },
      available: { availableNow: true },
      unavailable: { availableNow: false },
    };
    setWorking(true);
    let failed = 0;
    for (const id of ids) {
      try {
        if (bulk === "delete") await deleteArtistProfile(id);
        else await updateArtistProfile(id, updates[bulk]);
      } catch {
        failed++;
      }
    }
    setWorking(false);
    setSelected(new Set());
    setBulk("");
    if (failed) fail(`${failed} artist(s) could not be updated.`);
    else notify(bulk === "delete" ? `${ids.length} artist(s) deleted.` : `${ids.length} artist(s) updated.`);
    reload();
  };

  // One-click import of the researched starter roster (skips existing names)
  const handleImportRoster = async () => {
    if (!window.confirm(`Import the starter roster (${SEED_ARTISTS.length} artists)? Artists whose stage name already exists are skipped.`)) return;
    setImportingRoster(true);
    const existingNames = new Set(artists.map((a) => (a.stageName || "").trim().toLowerCase()));
    let added = 0;
    let skipped = 0;
    let failed = 0;
    for (const seed of SEED_ARTISTS) {
      if (existingNames.has(seed.stageName.trim().toLowerCase())) {
        skipped++;
        continue;
      }
      try {
        await createArtistProfile({ ...seed, userId: auth.currentUser?.uid || "" });
        added++;
      } catch (err) {
        console.error(`Failed to import ${seed.stageName}:`, err);
        failed++;
      }
    }
    setImportingRoster(false);
    if (failed > 0) fail(`${failed} artist(s) failed to import — check Firestore rules and try again.`);
    notify(`Roster import finished: ${added} added, ${skipped} already existed.`);
    reload();
  };

  const handlePurge = async () => {
    if (!window.confirm("Delete ALL artists? This permanently removes them from the database and cannot be undone.")) return;
    setPurging(true);
    try {
      const removed = await purgeCollection("artists");
      notify(`Deleted ${removed} record(s).`);
    } catch (err) {
      console.error("Purge failed:", err);
      fail("Failed to delete — make sure you are signed in as an admin.");
    } finally {
      setPurging(false);
      reload();
    }
  };

  const exportCsv = () =>
    downloadCsv(`jazba-artists-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Stage name", "Title", "Category", "Location", "Fee per event (USD)", "Experience (years)", "Rating", "Reviews", "Genres", "Available", "Featured", "Instagram", "Spotify", "YouTube", "Website"],
      ...filtered.map((a) => [
        a.stageName,
        a.subCategory,
        CATEGORY_LABELS[a.category || "music"],
        a.location,
        a.hourlyRate || 0,
        a.experienceYears || 0,
        a.rating || "",
        a.totalReviews || "",
        (a.genres || []).join("; "),
        a.availableNow === false ? "No" : "Yes",
        a.featured ? "Yes" : "No",
        a.socialLinks?.instagram,
        a.socialLinks?.spotify,
        a.socialLinks?.youtube,
        a.socialLinks?.website,
      ]),
    ]);

  const actions = (a: ArtistProfile) => (
    <>
      <IconButton title="Edit artist" onClick={() => navigate(`/admin/artists/edit/${encodeURIComponent(a.id!)}`)}>
        <Edit3 className="w-4 h-4" />
      </IconButton>
      <IconButton title="View artist page" href={`/artists/${encodeURIComponent(a.id || "")}`}>
        <ExternalLink className="w-4 h-4" />
      </IconButton>
      <IconButton title="Delete artist" onClick={() => a.id && handleDelete(a.id)} danger>
        <Trash2 className="w-4 h-4" />
      </IconButton>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Artists"
        sub="Your talent roster — profiles, fees, availability and what's featured on the Artists page."
        actions={
          <>
            {artists.length > 0 && (
              <button type="button" onClick={handlePurge} disabled={purging} className={btnOutline} title="Remove every artist from the database">
                <Trash2 className="w-4 h-4" />
                {purging ? "Deleting…" : `Delete all artists (${artists.length})`}
              </button>
            )}
            <button
              type="button"
              onClick={handleImportRoster}
              disabled={importingRoster}
              className={btnDark}
              title="Adds a researched starter roster of South Asian artists with bios, photos and Spotify links"
            >
              {importingRoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {importingRoster ? "Importing…" : `Import roster (${SEED_ARTISTS.length})`}
            </button>
            <button type="button" onClick={() => navigate("/admin/artists/new")} className={btnPrimary}>
              <PlusCircle className="w-4 h-4" /> Add artist
            </button>
          </>
        }
      />

      <div className="bg-white border border-[#e4e4e4]">
        <FilterTabs
          tabs={[
            { id: "all" as ArtistTab, label: "All", count: count("all") },
            { id: "featured" as ArtistTab, label: "Featured", count: count("featured") },
            { id: "available" as ArtistTab, label: "Available", count: count("available") },
            { id: "unavailable" as ArtistTab, label: "Unavailable", count: count("unavailable") },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Toolbar>
          <div className="flex items-center gap-2">
            <select value={bulk} onChange={(e) => setBulk(e.target.value)} className={selectCls} aria-label="Bulk actions">
              <option value="">Bulk actions</option>
              <option value="feature">Feature</option>
              <option value="unfeature">Remove from featured</option>
              <option value="available">Mark available</option>
              <option value="unavailable">Mark unavailable</option>
              <option value="delete">Delete</option>
            </select>
            <button type="button" onClick={applyBulk} disabled={!bulk || selected.size === 0 || working} className={`${btnOutline} py-1.5`}>
              {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Apply{selected.size ? ` (${selected.size})` : ""}
            </button>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, genre, location…" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls} aria-label="Category">
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className={selectCls} aria-label="Sort">
            <option value="name">Name A–Z</option>
            <option value="fee-high">Fee: high to low</option>
            <option value="fee-low">Fee: low to high</option>
            <option value="rating">Top rated</option>
          </select>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={exportCsv} className="text-xs font-bold flex items-center gap-1.5 hover:underline cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <div className="flex border border-[#e4e4e4]">
              <button
                type="button"
                onClick={() => chooseView("table")}
                className={`w-8 h-8 flex items-center justify-center cursor-pointer ${view === "table" ? "bg-black text-white" : "text-[#666] hover:text-black"}`}
                aria-label="Table view"
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => chooseView("grid")}
                className={`w-8 h-8 flex items-center justify-center cursor-pointer ${view === "grid" ? "bg-black text-white" : "text-[#666] hover:text-black"}`}
                aria-label="Grid view"
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Toolbar>

        {view === "table" ? (
          <DataTable
            head={
              <>
                <th className={`${thCls} w-10`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((a) => a.id!).filter(Boolean)))}
                    aria-label="Select all"
                  />
                </th>
                <th className={thCls}>Artist</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Location</th>
                <th className={thCls}>Fee</th>
                <th className={thCls}>Rating</th>
                <th className={thCls}>Available</th>
                <th className={thCls}>Featured</th>
                <th className={`${thCls} text-right`}>Actions</th>
              </>
            }
          >
            {filtered.map((artist) => (
              <tr key={artist.id} className={`hover:bg-[#fafafa] ${artist.id && selected.has(artist.id) ? "bg-[#fffde6]" : ""}`}>
                <td className={tdCls}>
                  <input
                    type="checkbox"
                    checked={!!artist.id && selected.has(artist.id)}
                    onChange={() => artist.id && toggleSel(artist.id)}
                    aria-label={`Select ${artist.stageName}`}
                  />
                </td>
                <td className={tdCls}>
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <Avatar src={artist.profileImage} name={artist.stageName} size={40} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/artists/edit/${encodeURIComponent(artist.id!)}`)}
                        className="font-bold hover:underline cursor-pointer text-left"
                      >
                        {artist.stageName}
                      </button>
                      <span className="block text-[11px] text-[#8a8a8a] truncate max-w-[240px]">
                        {artist.subCategory || (artist.genres || []).slice(0, 3).join(", ") || "—"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={tdCls}>{CATEGORY_LABELS[artist.category || "music"] || artist.category}</td>
                <td className={`${tdCls} whitespace-nowrap`}>{artist.location || "—"}</td>
                <td className={`${tdCls} whitespace-nowrap`}>
                  <span className="font-bold">{money(artist.hourlyRate || 0)}</span>
                  <span className="text-[11px] text-[#8a8a8a]">/event</span>
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>
                  {artist.rating ? (
                    <span className="font-bold">
                      ★ {artist.rating}
                      {artist.totalReviews ? <span className="text-[11px] text-[#8a8a8a] font-medium"> ({artist.totalReviews})</span> : null}
                    </span>
                  ) : (
                    <span className="text-[#8a8a8a]">—</span>
                  )}
                </td>
                <td className={tdCls}>
                  {busyId === artist.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={artist.availableNow !== false}
                      label={artist.availableNow !== false ? "Available — click to mark unavailable" : "Unavailable — click to mark available"}
                      onChange={() =>
                        quickUpdate(
                          artist,
                          { availableNow: artist.availableNow === false },
                          artist.availableNow === false ? `${artist.stageName} is now available.` : `${artist.stageName} marked unavailable.`,
                        )
                      }
                    />
                  )}
                </td>
                <td className={tdCls}>
                  <button
                    type="button"
                    onClick={() =>
                      quickUpdate(
                        artist,
                        { featured: !artist.featured },
                        artist.featured ? `${artist.stageName} removed from featured.` : `${artist.stageName} is now featured.`,
                      )
                    }
                    disabled={busyId === artist.id}
                    className="w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-[#f2f2f2]"
                    title={artist.featured ? "Featured — click to remove" : "Click to feature"}
                    aria-label={artist.featured ? "Remove from featured" : "Feature artist"}
                  >
                    <Star className={`w-4 h-4 ${artist.featured ? "fill-black text-black" : "text-[#c4c4c4]"}`} />
                  </button>
                </td>
                <td className={`${tdCls} text-right`}>
                  <div className="flex items-center justify-end">{actions(artist)}</div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <EmptyRow
                colSpan={9}
                title={artists.length ? "No artists match your filters" : "No artist profiles created yet."}
                action={
                  artists.length ? undefined : (
                    <button type="button" onClick={() => navigate("/admin/artists/new")} className={btnPrimary}>
                      <PlusCircle className="w-4 h-4" /> Add artist
                    </button>
                  )
                }
              />
            )}
          </DataTable>
        ) : filtered.length === 0 ? (
          <div className="py-16">
            <EmptyState title={artists.length ? "No artists match your filters" : "No artist profiles created yet."} />
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map((artist) => (
              <div key={artist.id} className="border border-[#e4e4e4] hover:border-black transition-colors flex flex-col">
                <div className="relative h-28 bg-[#111] overflow-hidden">
                  {(artist.coverImage || artist.profileImage) && (
                    <img src={artist.coverImage || artist.profileImage} alt="" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {artist.featured && <Badge tone="brand">Featured</Badge>}
                    {artist.availableNow === false && <Badge tone="dark">Unavailable</Badge>}
                  </div>
                  <label className="absolute top-2 right-2 bg-white w-6 h-6 flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!artist.id && selected.has(artist.id)}
                      onChange={() => artist.id && toggleSel(artist.id)}
                      aria-label={`Select ${artist.stageName}`}
                    />
                  </label>
                </div>
                <div className="px-4 pb-4 -mt-6 relative flex-1 flex flex-col">
                  <div className="border-2 border-white w-fit rounded-full">
                    <Avatar src={artist.profileImage} name={artist.stageName} size={48} />
                  </div>
                  <p className="font-bold mt-2 leading-tight">{artist.stageName}</p>
                  <p className="text-[11px] text-[#8a8a8a] line-clamp-1">{artist.subCategory || CATEGORY_LABELS[artist.category || "music"]}</p>
                  <p className="text-[11px] text-[#666] mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {artist.location || "—"}
                  </p>
                  {(artist.genres || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(artist.genres || []).slice(0, 3).map((g) => (
                        <span key={g} className="text-[10px] font-bold bg-[#f2f2f2] px-1.5 py-0.5">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-[#f2f2f2]">
                    <span className="text-sm font-bold">
                      {money(artist.hourlyRate || 0)}
                      <span className="text-[11px] text-[#8a8a8a] font-medium">/event</span>
                    </span>
                    <div className="flex">{actions(artist)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <TableFooter shown={filtered.length} total={artists.length} noun="artists" />
      </div>
    </div>
  );
}

// ── Editor ─────────────────────────────────────────────────────────────────

function ArtistEditor({ artistId }: { artistId?: string }) {
  const { data, loading, navigate, notify, fail, reload } = useAdmin();
  const editing = data.artists.find((a) => a.id === artistId);
  const [artistForm, setArtistForm] = useState<ArtistForm>(BLANK_ARTIST_FORM);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [genreInput, setGenreInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!artistId || !editing || loadedId === artistId) return;
    const artist = editing;
    setArtistForm({
      stageName: artist.stageName || "",
      bio: artist.bio || "",
      category: artist.category || "music",
      subCategory: artist.subCategory || "",
      profileImage: artist.profileImage || "",
      coverImage: artist.coverImage || "",
      genres: artist.genres || [],
      hourlyRate: artist.hourlyRate || 0,
      location: artist.location || "London, UK",
      experienceYears: artist.experienceYears || 0,
      availableNow: artist.availableNow ?? true,
      featured: artist.featured ?? false,
      socialWebsite: artist.socialLinks?.website || "",
      socialInstagram: artist.socialLinks?.instagram || "",
      socialSpotify: artist.socialLinks?.spotify || "",
      socialYoutube: artist.socialLinks?.youtube || "",

      rating: artist.rating ? String(artist.rating) : "",
      totalReviews: artist.totalReviews ? String(artist.totalReviews) : "",
      eventsHosted: artist.eventsHosted ? String(artist.eventsHosted) : "",
      totalAudience: artist.totalAudience || "",
      pastShows: artist.pastShows || [],
    });
    setLoadedId(artistId);
  }, [artistId, editing, loadedId]);

  if (artistId && !editing) {
    return (
      <div className="py-24 text-center">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : (
          <>
            <p className="font-bold">This artist could not be found.</p>
            <button type="button" className={`${btnOutline} mt-4`} onClick={() => navigate("/admin/artists")}>
              Back to artists
            </button>
          </>
        )}
      </div>
    );
  }

  const set = <K extends keyof ArtistForm>(key: K, value: ArtistForm[K]) => setArtistForm((f) => ({ ...f, [key]: value }));

  // ---- Past shows list editor ----
  const addPastShow = () => setArtistForm((f) => ({ ...f, pastShows: [...f.pastShows, { title: "", date: "", venue: "" }] }));
  const updatePastShow = (idx: number, field: "title" | "date" | "venue", value: string) =>
    setArtistForm((f) => ({ ...f, pastShows: f.pastShows.map((row, i) => (i === idx ? { ...row, [field]: value } : row)) }));
  const removePastShow = (idx: number) => setArtistForm((f) => ({ ...f, pastShows: f.pastShows.filter((_, i) => i !== idx) }));

  const handleAddGenre = () => {
    const g = genreInput.trim();
    if (!g) return;
    // Comma-separated input adds several tags at once.
    const parts = g.split(",").map((s) => s.trim()).filter(Boolean);
    setArtistForm((f) => ({ ...f, genres: [...f.genres, ...parts.filter((p) => !f.genres.includes(p))] }));
    setGenreInput("");
  };
  const handleRemoveGenre = (g: string) => setArtistForm((f) => ({ ...f, genres: f.genres.filter((item) => item !== g) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!artistForm.stageName.trim()) {
      setFormError("Stage name is required.");
      fail("Stage name is required.");
      return;
    }

    const payload = {
      stageName: artistForm.stageName.trim(),
      bio: artistForm.bio,
      category: artistForm.category,
      subCategory: artistForm.subCategory,
      profileImage: artistForm.profileImage,
      coverImage: artistForm.coverImage,
      genres: artistForm.genres,
      hourlyRate: artistForm.hourlyRate,
      location: artistForm.location,
      experienceYears: artistForm.experienceYears,
      availableNow: artistForm.availableNow,
      featured: artistForm.featured,
      socialLinks: {
        website: artistForm.socialWebsite,
        instagram: artistForm.socialInstagram,
        spotify: artistForm.socialSpotify,
        youtube: artistForm.socialYoutube,
      },
      // Artist page content — zeros/empties keep their sections hidden
      rating: Number(artistForm.rating) || 0,
      totalReviews: Number(artistForm.totalReviews) || 0,
      eventsHosted: Number(artistForm.eventsHosted) || 0,
      totalAudience: artistForm.totalAudience.trim(),
      pastShows: artistForm.pastShows.filter((s) => s.title.trim()),
    };

    setSaving(true);
    try {
      if (artistId) {
        await updateArtistProfile(artistId, payload);
        notify("Artist profile updated successfully.");
      } else {
        await createArtistProfile({ ...payload, userId: auth.currentUser?.uid || "" });
        notify("Artist profile created successfully.");
      }
      reload();
      navigate("/admin/artists");
    } catch {
      setFormError("Failed to save artist profile. Make sure updated Firestore rules have been deployed.");
      fail("Failed to save artist profile.");
    } finally {
      setSaving(false);
    }
  };

  const rowInput = "bg-white p-2 text-sm outline-none border border-[#e4e4e4] focus:border-black transition-colors";

  return (
    <div className="space-y-6 text-left">
      <EditorHeader
        crumb={artistId ? "Artists · Edit profile" : "Artists · Add new"}
        title={artistForm.stageName || "New artist"}
        onBack={() => navigate("/admin/artists")}
        formId="admin-artist-form"
        saveLabel={artistId ? "Save changes" : "Create artist"}
        saving={saving}
      />
      {formError && <div className="bg-[#f7ecec] text-[#7a2f2f] text-sm font-bold px-4 py-3">{formError}</div>}

      <form id="admin-artist-form" onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start text-sm">
        {/* ── MAIN COLUMN — artist profile ────────────────── */}
        <div className="xl:col-span-2 space-y-6">
          <EditorPanel title="Artist identity" sub="Name, imagery, genres and story shown on the artist page.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Stage name">
                <input className={inputCls} value={artistForm.stageName} onChange={(e) => set("stageName", e.target.value)} placeholder="e.g. DJ Sparkle" />
              </Field>
              <Field label="Sub-category / title">
                <input
                  className={inputCls}
                  value={artistForm.subCategory}
                  onChange={(e) => set("subCategory", e.target.value)}
                  placeholder="e.g. Soprano Vocalist & Opera Lead"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUrlField label="Profile image URL" value={artistForm.profileImage} onChange={(v) => set("profileImage", v)} />
              <ImageUrlField label="Cover banner image URL" value={artistForm.coverImage} onChange={(v) => set("coverImage", v)} wide />
            </div>

            <Field label="Location">
              <input className={inputCls} value={artistForm.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. London, UK" />
            </Field>

            <Field label="Genres / tags" hint="Press Enter to add — separate several with commas.">
              <div className="flex gap-2">
                <input
                  className={`flex-1 ${inputCls}`}
                  value={genreInput}
                  onChange={(e) => setGenreInput(e.target.value)}
                  placeholder="e.g. Opera, Vocalist"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddGenre();
                    }
                  }}
                />
                <button type="button" onClick={handleAddGenre} className={btnDark}>
                  Add
                </button>
              </div>
              {artistForm.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {artistForm.genres.map((g) => (
                    <span key={g} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-black text-white text-[11px] font-bold">
                      {g}
                      <button
                        type="button"
                        onClick={() => handleRemoveGenre(g)}
                        className="w-4 h-4 flex items-center justify-center hover:bg-[#ffed00] hover:text-black cursor-pointer"
                        aria-label={`Remove ${g}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Biography">
              <textarea className={`${inputCls} h-32`} value={artistForm.bio} onChange={(e) => set("bio", e.target.value)} />
            </Field>
          </EditorPanel>

          <EditorPanel title="Profile stats & rating" sub="Shown on the artist page hero and rating tile. Leave empty to hide each one.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Rating (0–5)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  className={inputCls}
                  value={artistForm.rating}
                  onChange={(e) => set("rating", e.target.value)}
                  placeholder="e.g. 4.8"
                />
              </Field>
              <Field label="Review count">
                <input type="number" className={inputCls} value={artistForm.totalReviews} onChange={(e) => set("totalReviews", e.target.value)} placeholder="e.g. 120" />
              </Field>
              <Field label="Events hosted">
                <input type="number" className={inputCls} value={artistForm.eventsHosted} onChange={(e) => set("eventsHosted", e.target.value)} placeholder="e.g. 42" />
              </Field>
              <Field label="Total audience">
                <input className={inputCls} value={artistForm.totalAudience} onChange={(e) => set("totalAudience", e.target.value)} placeholder="e.g. 12.4k" />
              </Field>
            </div>
          </EditorPanel>

          <EditorPanel
            title="Past shows"
            sub='The "Past shows" tab on the artist page. No entries = tab hidden.'
            action={
              <button type="button" onClick={addPastShow} className={addRowBtnCls}>
                <PlusCircle className="w-3.5 h-3.5" /> Add show
              </button>
            }
          >
            {artistForm.pastShows.length === 0 && (
              <p className="text-[11px] text-[#8a8a8a] font-medium">No shows yet — the tab stays hidden on the artist page.</p>
            )}
            {artistForm.pastShows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-[#f7f7f7] p-2.5 border border-[#e4e4e4]">
                <input className={`col-span-5 ${rowInput}`} value={row.title} onChange={(e) => updatePastShow(idx, "title", e.target.value)} placeholder="Show title" />
                <input className={`col-span-3 ${rowInput}`} value={row.date} onChange={(e) => updatePastShow(idx, "date", e.target.value)} placeholder="e.g. May 2026" />
                <input className={`col-span-3 ${rowInput}`} value={row.venue} onChange={(e) => updatePastShow(idx, "venue", e.target.value)} placeholder="Venue" />
                <button
                  type="button"
                  onClick={() => removePastShow(idx)}
                  className="col-span-1 p-2 text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer flex items-center justify-center"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </EditorPanel>

          <EditorPanel title="Social links" sub="Optional — shown on the artist page.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Website">
                <input className={inputCls} value={artistForm.socialWebsite} onChange={(e) => set("socialWebsite", e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Instagram">
                <input className={inputCls} value={artistForm.socialInstagram} onChange={(e) => set("socialInstagram", e.target.value)} placeholder="https://instagram.com/…" />
              </Field>
              <Field label="Spotify">
                <input className={inputCls} value={artistForm.socialSpotify} onChange={(e) => set("socialSpotify", e.target.value)} placeholder="https://open.spotify.com/artist/…" />
              </Field>
              <Field label="YouTube">
                <input className={inputCls} value={artistForm.socialYoutube} onChange={(e) => set("socialYoutube", e.target.value)} placeholder="https://youtube.com/@…" />
              </Field>
            </div>
          </EditorPanel>
        </div>

        {/* ── SIDE RAIL — listing settings ─────────────────── */}
        <div className="space-y-6 xl:sticky xl:top-24">
          {/* Live preview of the listing card */}
          <div className="bg-white border border-[#e4e4e4]">
            <div className="h-24 bg-[#111] overflow-hidden">
              {(artistForm.coverImage || artistForm.profileImage) && (
                <img src={artistForm.coverImage || artistForm.profileImage} alt="" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
              )}
            </div>
            <div className="px-5 pb-5 -mt-7">
              <div className="border-2 border-white w-fit rounded-full">
                <Avatar src={artistForm.profileImage} name={artistForm.stageName || "New artist"} size={56} />
              </div>
              <p className="font-display font-bold text-lg mt-2 leading-tight">{artistForm.stageName || "Stage name"}</p>
              <p className="text-xs text-[#666]">{artistForm.subCategory || CATEGORY_LABELS[artistForm.category || "music"]}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {artistForm.featured && <Badge tone="brand">Featured</Badge>}
                <Badge tone={artistForm.availableNow ? "positive" : "neutral"}>{artistForm.availableNow ? "Available" : "Unavailable"}</Badge>
              </div>
            </div>
          </div>

          <EditorPanel title="Listing settings" sub="Category, booking fee and visibility flags.">
            <Field label="Category">
              <select value={artistForm.category} onChange={(e: any) => set("category", e.target.value)} className={inputCls}>
                <option value="music">Music</option>
                <option value="theater">Theater</option>
                <option value="sports">Sports</option>
                <option value="conference">Conference</option>
                <option value="exhibition">Exhibition</option>
              </select>
            </Field>
            <Field label="Fee per event (USD) — internal only" hint='For your records only — the public artist pages always show "Price on request" (POR).'>
              <input type="number" className={inputCls} value={artistForm.hourlyRate} onChange={(e) => set("hourlyRate", Number(e.target.value))} />
            </Field>
            <Field label="Years of experience">
              <input type="number" className={inputCls} value={artistForm.experienceYears} onChange={(e) => set("experienceYears", Number(e.target.value))} />
            </Field>
            <div className="space-y-3 pt-3 border-t border-[#f2f2f2]">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm font-bold">Instantly bookable</span>
                <Switch checked={artistForm.availableNow} onChange={() => set("availableNow", !artistForm.availableNow)} label="Instantly bookable" />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm font-bold">Featured / hot talent</span>
                <Switch checked={artistForm.featured} onChange={() => set("featured", !artistForm.featured)} label="Featured / hot talent" />
              </label>
            </div>
          </EditorPanel>

          <button type="submit" disabled={saving} className={`${btnPrimary} w-full py-3.5 text-sm`}>
            {saving ? "Saving…" : artistId ? "Save changes" : "Create artist"}
          </button>
          {artistId && (
            <a href={`/artists/${encodeURIComponent(artistId)}`} target="_blank" rel="noopener noreferrer" className={`${btnOutline} w-full`}>
              <ExternalLink className="w-4 h-4" /> View public page
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
