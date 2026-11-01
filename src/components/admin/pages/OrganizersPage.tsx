import React, { useEffect, useState } from "react";
import { Loader2, ExternalLink, Phone } from "lucide-react";
import { createOrganizerProfile, updateOrganizerProfile } from "../../../services/backendService";
import { auth } from "../../../firebase";
import { useAdmin } from "../AdminContext";
import { EditorHeader, EditorPanel, Field, Switch, btnOutline, btnPrimary, inputCls } from "../ui";
import { ImageUrlField } from "../media/ImageField";
import { OrganizerDetail, OrganizersList } from "./OrganizerReview";
import { SOCIAL_KEYS, SOCIAL_LABELS } from "../../../services/organizerService";

const BLANK_ORGANIZER_FORM = {
  companyName: "",
  contactName: "",
  socialLinks: {} as Record<string, string>,
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
  if (route.sub === "view") {
    return (
      <React.Fragment key={route.id}>
        <OrganizerDetail organizerId={route.id} />
      </React.Fragment>
    );
  }
  return (
    <React.Fragment key={route.sub}>
      <OrganizersList initialTab={route.sub === "applications" ? "pending" : "all"} />
    </React.Fragment>
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
      contactName: org.contactName || "",
      socialLinks: { ...(org.socialLinks || {}) },
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
    const socialLinks: Record<string, string> = {};
    for (const k of SOCIAL_KEYS) {
      const v = (organizerForm.socialLinks[k] || "").trim().slice(0, 300);
      if (v) socialLinks[k] = v;
    }
    const payload = {
      companyName: organizerForm.companyName.trim(),
      contactName: organizerForm.contactName.trim().slice(0, 120),
      socialLinks,
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
      navigate(organizerId ? `/admin/organizers/view/${encodeURIComponent(organizerId)}` : "/admin/organizers");
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
              <Field label="Contact name">
                <input className={inputCls} value={organizerForm.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Who to speak to" />
              </Field>
              <Field label="Contact email">
                <input type="email" className={inputCls} value={organizerForm.email} onChange={(e) => set("email", e.target.value)} placeholder="bookings@company.com" />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={organizerForm.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+44(0)3335777014" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUrlField label="Logo image" folder="organisers" value={organizerForm.logoUrl} onChange={(v) => set("logoUrl", v)} />
              <ImageUrlField label="Banner image" folder="organisers" value={organizerForm.bannerUrl} onChange={(v) => set("bannerUrl", v)} wide />
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
              {SOCIAL_KEYS.map((k) => (
                <React.Fragment key={k}>
                  <Field label={SOCIAL_LABELS[k]}>
                    <input
                      className={inputCls}
                      value={organizerForm.socialLinks[k] || ""}
                      onChange={(e) => set("socialLinks", { ...organizerForm.socialLinks, [k]: e.target.value })}
                      placeholder={`https://${k}.com/…`}
                    />
                  </Field>
                </React.Fragment>
              ))}
            </div>
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
