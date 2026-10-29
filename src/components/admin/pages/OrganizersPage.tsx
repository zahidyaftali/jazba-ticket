import React, { useEffect, useState } from "react";
import { PlusCircle, Trash2, Edit3, Loader2, ExternalLink, Star, Globe, Mail, Phone } from "lucide-react";
import {
  createOrganizerProfile,
  updateOrganizerProfile,
  deleteOrganizerProfile,
  OrganizerProfile,
} from "../../../services/backendService";
import { auth } from "../../../firebase";
import { useAdmin } from "../AdminContext";
import {
  Avatar,
  DataTable,
  EditorHeader,
  EditorPanel,
  EmptyRow,
  Field,
  IconButton,
  ImageUrlField,
  PageHeader,
  SearchInput,
  Switch,
  TableFooter,
  Toolbar,
  btnOutline,
  btnPrimary,
  inputCls,
  tdCls,
  thCls,
} from "../ui";

const BLANK_ORGANIZER_FORM = {
  companyName: "",
  email: "",
  phone: "",
  logoUrl: "",
  bannerUrl: "",
  description: "",
  website: "",
  location: "",
  specialtiesText: "",
  featured: false,
};
type OrganizerForm = typeof BLANK_ORGANIZER_FORM;

export default function OrganizersPage() {
  const { route } = useAdmin();
  // Keyed so switching between "new" and an edit (or two edits) starts a fresh form.
  if (route.sub === "new" || route.sub === "edit") {
    return (
      <React.Fragment key={`${route.sub}:${route.id}`}>
        <OrganizerEditor organizerId={route.sub === "edit" ? route.id : undefined} />
      </React.Fragment>
    );
  }
  return <OrganizersList />;
}

function OrganizersList() {
  const { data, navigate, notify, fail, reload } = useAdmin();
  const organizers = data.organizers;
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = [...organizers]
    .sort((a, b) => (a.companyName || "").localeCompare(b.companyName || ""))
    .filter((o) => !q || [o.companyName, o.location, o.email, o.phone, ...(o.specialties || [])].some((v) => (v || "").toLowerCase().includes(q)));

  const handleDelete = async (orgId: string) => {
    if (!window.confirm("Delete this organiser? This action cannot be undone.")) return;
    try {
      await deleteOrganizerProfile(orgId);
      notify("Organiser profile deleted.");
      reload();
    } catch {
      fail("Failed to delete organiser profile.");
    }
  };

  const toggleFeatured = async (org: OrganizerProfile) => {
    if (!org.id) return;
    setBusyId(org.id);
    try {
      await updateOrganizerProfile(org.id, { featured: !org.featured });
      notify(org.featured ? `${org.companyName} removed from featured.` : `${org.companyName} is now featured.`);
      await reload();
    } catch {
      fail("Failed to update the organiser.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Organisers"
        sub="Promoters and companies shown on the Organisers pages."
        actions={
          <button type="button" onClick={() => navigate("/admin/organizers/new")} className={btnPrimary}>
            <PlusCircle className="w-4 h-4" /> Add organiser
          </button>
        }
      />
      <div className="bg-white border border-[#e4e4e4]">
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, location, email…" />
        </Toolbar>
        <DataTable
          head={
            <>
              <th className={thCls}>Company</th>
              <th className={thCls}>Location</th>
              <th className={thCls}>Contact</th>
              <th className={thCls}>Specialties</th>
              <th className={thCls}>Featured</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </>
          }
        >
          {filtered.map((org) => (
            <tr key={org.id || org.userId} className="hover:bg-[#fafafa]">
              <td className={tdCls}>
                <div className="flex items-center gap-3 min-w-[200px]">
                  <Avatar src={org.logoUrl} name={org.companyName || "?"} size={38} square />
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/organizers/edit/${encodeURIComponent(org.id!)}`)}
                      className="font-bold hover:underline cursor-pointer text-left"
                    >
                      {org.companyName || "—"}
                    </button>
                    {org.website && (
                      <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-[#8a8a8a] hover:text-black truncate max-w-[220px]">
                        <Globe className="w-3 h-3 shrink-0" /> {org.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
              </td>
              <td className={`${tdCls} whitespace-nowrap`}>{org.location || "—"}</td>
              <td className={tdCls}>
                {org.email ? (
                  <a href={`mailto:${org.email}`} className="flex items-center gap-1.5 hover:underline">
                    <Mail className="w-3 h-3 shrink-0" /> {org.email}
                  </a>
                ) : (
                  "—"
                )}
                {org.phone && (
                  <a href={`tel:${org.phone}`} className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a] hover:text-black">
                    <Phone className="w-3 h-3 shrink-0" /> {org.phone}
                  </a>
                )}
              </td>
              <td className={tdCls}>
                <div className="flex flex-wrap gap-1 max-w-[240px]">
                  {(org.specialties || []).slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] font-bold bg-[#f2f2f2] px-1.5 py-0.5">
                      {s}
                    </span>
                  ))}
                  {(org.specialties || []).length === 0 && <span className="text-[#8a8a8a]">—</span>}
                </div>
              </td>
              <td className={tdCls}>
                {busyId === org.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleFeatured(org)}
                    className="w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-[#f2f2f2]"
                    title={org.featured ? "Featured — click to remove" : "Click to feature"}
                    aria-label={org.featured ? "Remove from featured" : "Feature organiser"}
                  >
                    <Star className={`w-4 h-4 ${org.featured ? "fill-black text-black" : "text-[#c4c4c4]"}`} />
                  </button>
                )}
              </td>
              <td className={`${tdCls} text-right`}>
                <div className="flex items-center justify-end">
                  <IconButton title="Edit organiser" onClick={() => navigate(`/admin/organizers/edit/${encodeURIComponent(org.id!)}`)}>
                    <Edit3 className="w-4 h-4" />
                  </IconButton>
                  <IconButton title="View organiser page" href={`/organizers/${encodeURIComponent(org.id || "")}`}>
                    <ExternalLink className="w-4 h-4" />
                  </IconButton>
                  <IconButton title="Delete organiser" onClick={() => handleDelete(org.id!)} danger>
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <EmptyRow
              colSpan={6}
              title={organizers.length ? "No organisers match your search" : "No organiser profiles yet."}
              sub={organizers.length ? undefined : 'Click "Add organiser" to create the first one.'}
            />
          )}
        </DataTable>
        <TableFooter shown={filtered.length} total={organizers.length} noun="organisers" />
      </div>
    </div>
  );
}

function OrganizerEditor({ organizerId }: { organizerId?: string }) {
  const { data, loading, navigate, notify, fail, reload } = useAdmin();
  const editing = data.organizers.find((o) => o.id === organizerId);
  const [organizerForm, setOrganizerForm] = useState<OrganizerForm>(BLANK_ORGANIZER_FORM);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!organizerId || !editing || loadedId === organizerId) return;
    const org = editing;
    setOrganizerForm({
      companyName: org.companyName || "",
      email: org.email || "",
      phone: org.phone || "",
      logoUrl: org.logoUrl || "",
      bannerUrl: org.bannerUrl || "",
      description: org.description || "",
      website: org.website || "",
      location: org.location || "",
      specialtiesText: (org.specialties || []).join(", "),
      featured: org.featured ?? false,
    });
    setLoadedId(organizerId);
  }, [organizerId, editing, loadedId]);

  if (organizerId && !editing) {
    return (
      <div className="py-24 text-center">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : (
          <>
            <p className="font-bold">This organiser could not be found.</p>
            <button type="button" className={`${btnOutline} mt-4`} onClick={() => navigate("/admin/organizers")}>
              Back to organisers
            </button>
          </>
        )}
      </div>
    );
  }

  const set = <K extends keyof OrganizerForm>(key: K, value: OrganizerForm[K]) => setOrganizerForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!organizerForm.companyName.trim()) {
      setFormError("Organiser name is required.");
      fail("Organiser name is required.");
      return;
    }
    const payload = {
      companyName: organizerForm.companyName.trim(),
      email: organizerForm.email.trim(),
      phone: organizerForm.phone.trim(),
      logoUrl: organizerForm.logoUrl.trim(),
      bannerUrl: organizerForm.bannerUrl.trim(),
      description: organizerForm.description.trim(),
      website: organizerForm.website.trim(),
      location: organizerForm.location.trim(),
      specialties: organizerForm.specialtiesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      featured: organizerForm.featured,
    };
    setSaving(true);
    try {
      if (organizerId) {
        await updateOrganizerProfile(organizerId, payload);
        notify("Organiser profile updated successfully.");
      } else {
        await createOrganizerProfile({ ...payload, userId: auth.currentUser?.uid || "" });
        notify("Organiser profile created successfully.");
      }
      reload();
      navigate("/admin/organizers");
    } catch {
      setFormError("Failed to save organiser profile. Make sure updated Firestore rules have been deployed.");
      fail("Failed to save organiser profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <EditorHeader
        crumb={organizerId ? "Organisers · Edit profile" : "Organisers · Add new"}
        title={organizerForm.companyName || "New organiser"}
        onBack={() => navigate("/admin/organizers")}
        formId="admin-organizer-form"
        saveLabel={organizerId ? "Save changes" : "Create organiser"}
        saving={saving}
      />
      {formError && <div className="bg-[#f7ecec] text-[#7a2f2f] text-sm font-bold px-4 py-3">{formError}</div>}

      <form id="admin-organizer-form" onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start text-sm">
        <div className="xl:col-span-2 space-y-6">
          <EditorPanel title="Organiser profile" sub="Contact details and branding shown on the organiser page.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Organiser / company name">
                <input className={inputCls} value={organizerForm.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="e.g. Jazba Entertainment" />
              </Field>
              <Field label="Location">
                <input className={inputCls} value={organizerForm.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Birmingham, UK" />
              </Field>
              <Field label="Contact email">
                <input type="email" className={inputCls} value={organizerForm.email} onChange={(e) => set("email", e.target.value)} placeholder="bookings@company.com" />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={organizerForm.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+44(0)3335777014" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUrlField label="Logo image URL" value={organizerForm.logoUrl} onChange={(v) => set("logoUrl", v)} />
              <ImageUrlField label="Banner image URL" value={organizerForm.bannerUrl} onChange={(v) => set("bannerUrl", v)} wide />
            </div>
            <Field label="Description / about">
              <textarea
                className={`${inputCls} h-28`}
                value={organizerForm.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Who they are and the kind of events they run. Leave empty to hide the About section."
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Website">
                <input className={inputCls} value={organizerForm.website} onChange={(e) => set("website", e.target.value)} placeholder="https://company.com" />
              </Field>
              <Field label="Specialties (comma separated)">
                <input
                  className={inputCls}
                  value={organizerForm.specialtiesText}
                  onChange={(e) => set("specialtiesText", e.target.value)}
                  placeholder="e.g. Live music, Festivals, Theatre"
                />
              </Field>
            </div>
          </EditorPanel>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24">
          <EditorPanel title="Visibility" sub="Featured organisers are highlighted on the Organisers page.">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-bold">Featured organiser</span>
              <Switch checked={organizerForm.featured} onChange={() => set("featured", !organizerForm.featured)} label="Featured organiser" />
            </label>
          </EditorPanel>
          <button type="submit" disabled={saving} className={`${btnPrimary} w-full py-3.5 text-sm`}>
            {saving ? "Saving…" : organizerId ? "Save changes" : "Create organiser"}
          </button>
          {organizerId && (
            <a href={`/organizers/${encodeURIComponent(organizerId)}`} target="_blank" rel="noopener noreferrer" className={`${btnOutline} w-full`}>
              <ExternalLink className="w-4 h-4" /> View public page
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
