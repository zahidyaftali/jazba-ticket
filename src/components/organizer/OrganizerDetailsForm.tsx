import React, { useRef } from "react";
import type { OrganizerProfile } from "../../services/backendService";
import { EVENT_TYPES, SOCIAL_KEYS, SOCIAL_LABELS, type OrganizerDetails } from "../../services/organizerService";
import { EditorPanel, Field, inputCls } from "../admin/ui";
import { ImageUrlField } from "../admin/media/ImageField";

export const BLANK_DETAILS: OrganizerDetails = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  location: "",
  description: "",
  specialties: [],
  socialLinks: {},
  logoUrl: "",
  bannerUrl: "",
  applicationNote: "",
};

export function detailsFrom(org: Partial<OrganizerProfile> | null | undefined, fallback: Partial<OrganizerDetails> = {}): OrganizerDetails {
  return {
    ...BLANK_DETAILS,
    ...fallback,
    ...Object.fromEntries(
      Object.entries({
        companyName: org?.companyName,
        contactName: org?.contactName,
        email: org?.email,
        phone: org?.phone,
        website: org?.website,
        location: org?.location,
        description: org?.description,
        specialties: org?.specialties,
        socialLinks: org?.socialLinks,
        logoUrl: org?.logoUrl,
        bannerUrl: org?.bannerUrl,
        applicationNote: org?.applicationNote,
      }).filter(([, v]) => v !== undefined),
    ),
  } as OrganizerDetails;
}

/** What's missing before an application can be sent. */
export function detailsProblem(d: OrganizerDetails): string {
  if (!d.companyName.trim()) return "Please enter your organiser or company name.";
  if (!d.contactName.trim()) return "Please enter a contact name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return "Please enter a valid contact email.";
  if (d.phone.trim().replace(/\D/g, "").length < 7) return "Please enter a contact phone number.";
  if (!d.location.trim()) return "Please enter your city.";
  return "";
}

/** The organiser's details — on the application, and later on their profile page. */
export default function OrganizerDetailsForm({
  value,
  onChange,
  mode,
}: {
  value: OrganizerDetails;
  onChange: (v: OrganizerDetails) => void;
  /** "apply": the sign-up questions; "profile": the public page, with images. */
  mode: "apply" | "profile";
}) {
  // Changes build on the latest value, so two quick taps both count.
  const latest = useRef(value);
  latest.current = value;
  const set = <K extends keyof OrganizerDetails>(key: K, v: OrganizerDetails[K]) => {
    latest.current = { ...latest.current, [key]: v };
    onChange(latest.current);
  };
  const toggleType = (t: string) => {
    const now = latest.current.specialties;
    set("specialties", now.includes(t) ? now.filter((x) => x !== t) : [...now, t]);
  };

  return (
    <div className="space-y-6">
      <EditorPanel title="About your organisation" sub={mode === "apply" ? "This becomes your public organiser page once you’re approved." : "Shown on your public organiser page."}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Organiser / company name *">
            <input className={inputCls} value={value.companyName} maxLength={120} onChange={(e) => set("companyName", e.target.value)} placeholder="e.g. Karachi Live Events" />
          </Field>
          <Field label="City *">
            <input className={inputCls} value={value.location} maxLength={120} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Lahore, Pakistan" />
          </Field>
        </div>
        {mode === "profile" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUrlField label="Logo" folder="partners" value={value.logoUrl} onChange={(v) => set("logoUrl", v)} />
            <ImageUrlField label="Cover banner" folder="partners" value={value.bannerUrl} onChange={(v) => set("bannerUrl", v)} wide />
          </div>
        )}
        <Field label="About you">
          <textarea
            className={`${inputCls} h-28`}
            value={value.description}
            maxLength={5000}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Who you are, the events you run, and what people can expect."
          />
        </Field>
        <div>
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#666] block mb-1.5">Events you run</span>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((t) => {
              const on = value.specialties.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  aria-pressed={on}
                  className={`px-3 py-1.5 text-xs font-bold border cursor-pointer transition-colors ${
                    on ? "bg-black text-white border-black" : "bg-white text-black border-[#e4e4e4] hover:border-black"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </EditorPanel>

      <EditorPanel title="Contact details" sub="Your email and phone are shown on your public page so fans can reach you.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Contact name *">
            <input className={inputCls} value={value.contactName} maxLength={120} onChange={(e) => set("contactName", e.target.value)} placeholder="Your full name" />
          </Field>
          <Field label="Contact email *">
            <input type="email" className={inputCls} value={value.email} maxLength={254} onChange={(e) => set("email", e.target.value)} placeholder="bookings@company.com" />
          </Field>
          <Field label="Phone / WhatsApp *">
            <input className={inputCls} value={value.phone} maxLength={40} onChange={(e) => set("phone", e.target.value)} placeholder="+92 300 1234567" />
          </Field>
          <Field label="Website">
            <input className={inputCls} value={value.website} maxLength={512} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOCIAL_KEYS.map((k) => (
            <React.Fragment key={k}>
              <Field label={SOCIAL_LABELS[k]}>
                <input
                  className={inputCls}
                  value={value.socialLinks[k] || ""}
                  maxLength={300}
                  onChange={(e) => set("socialLinks", { ...latest.current.socialLinks, [k]: e.target.value })}
                  placeholder={`https://${k}.com/…`}
                />
              </Field>
            </React.Fragment>
          ))}
        </div>
      </EditorPanel>

      {mode === "apply" && (
        <EditorPanel title="Anything else?" sub="Optional — helps us review your application faster.">
          <textarea
            className={`${inputCls} h-24`}
            value={value.applicationNote}
            maxLength={3000}
            onChange={(e) => set("applicationNote", e.target.value)}
            placeholder="e.g. past events you’ve run, expected audience size, your first event on Jazba…"
          />
        </EditorPanel>
      )}
    </div>
  );
}
