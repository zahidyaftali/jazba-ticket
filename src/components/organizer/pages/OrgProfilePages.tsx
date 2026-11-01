import React, { useState } from "react";
import { ExternalLink, Heart, KeyRound, Loader2, LogOut } from "lucide-react";
import { accountEmail, auth, sendPasswordResetEmail, updateProfile } from "../../../firebase";
import { updateUserProfile } from "../../../services/backendService";
import { updateMyOrganizer, type OrganizerDetails } from "../../../services/organizerService";
import { EditorPanel, Field, PageHeader, btnOutline, btnPrimary, inputCls } from "../../admin/ui";
import { ImageUrlField } from "../../admin/media/ImageField";
import OrganizerDetailsForm, { detailsFrom, detailsProblem } from "../OrganizerDetailsForm";
import { useOrg } from "../OrganizerContext";

/** The organiser's public page details. */
export function OrgProfilePage() {
  const { org, setOrg, user, report, notify, fail } = useOrg();
  const [details, setDetails] = useState<OrganizerDetails>(() => detailsFrom(org));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = detailsProblem(details);
    if (problem) return setError(problem);
    setError("");
    setSaving(true);
    try {
      await updateMyOrganizer(user.uid, details);
      setOrg({ ...org, ...details });
      notify("Profile saved — your public page is up to date.");
    } catch {
      fail("Couldn’t save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title="Organiser profile"
        sub="Your public page on Jazba Tickets, where fans can follow you and see your events."
        actions={
          <>
            <a href={`/organizers/${encodeURIComponent(org.id || user.uid)}`} target="_blank" rel="noopener noreferrer" className={btnOutline}>
              <ExternalLink className="w-3.5 h-3.5" /> View public page
            </a>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save profile"}
            </button>
          </>
        }
      />
      {error && <div className="mb-4 bg-[#f7ecec] text-[#7a2f2f] text-sm font-bold px-4 py-3">{error}</div>}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2">
          <OrganizerDetailsForm value={details} onChange={setDetails} mode="profile" />
        </div>
        <div className="space-y-6">
          <div className="bg-black text-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/60">Followers</span>
              <Heart className="w-4 h-4 text-[#ffed00]" />
            </div>
            <p className="font-display font-bold text-[28px] mt-3">{report ? report.totals.followers.toLocaleString() : "—"}</p>
            <p className="text-xs text-white/60 mt-2">Fans who follow your page.</p>
          </div>
          <EditorPanel title="Featured & approval" sub="Managed by the Jazba team.">
            <p className="text-sm text-[#444]">
              {org.featured ? "Your page is featured on the Organisers page." : "Featured organisers are chosen by the Jazba team."}
            </p>
          </EditorPanel>
          <button type="submit" disabled={saving} className={`${btnPrimary} w-full py-3.5 text-sm`}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** The person's own sign-in account. */
export function OrgAccountPage() {
  const { me, setMe, user, notify, fail, onLogout } = useOrg();
  const [name, setName] = useState(me?.name || user.displayName || "");
  const [phone, setPhone] = useState(me?.phone || "");
  const [photo, setPhoto] = useState(me?.profileImage || "");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return fail("Please enter your name.");
    if (photo.length > 512) return fail("That photo link is too long.");
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { name: name.trim().slice(0, 128), phone: phone.trim().slice(0, 32), profileImage: photo.trim() });
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name.trim(), photoURL: photo.trim() || null }).catch(() => null);
      if (me) setMe({ ...me, name: name.trim(), phone: phone.trim(), profileImage: photo.trim() });
      notify("Account saved.");
    } catch {
      fail("Couldn’t save your account.");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, accountEmail(user));
      notify(`Password reset link sent to ${accountEmail(user)}.`);
    } catch {
      fail("Couldn’t send the reset email. Please try again.");
    }
  };

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <PageHeader title="Account" sub="Your own sign-in details. The same account works for buying tickets." />
      <EditorPanel title="Your details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Your name">
            <input className={inputCls} value={name} maxLength={128} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={phone} maxLength={32} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="Sign-in email">
          <input className={`${inputCls} opacity-70`} value={accountEmail(user)} readOnly />
        </Field>
        <ImageUrlField label="Profile photo" folder="partners" value={photo} onChange={setPhoto} />
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save account"}
        </button>
      </EditorPanel>
      <EditorPanel title="Security">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnOutline} onClick={resetPassword}>
            <KeyRound className="w-3.5 h-3.5" /> Email me a password reset link
          </button>
          <button type="button" className={btnOutline} onClick={onLogout}>
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </EditorPanel>
    </form>
  );
}
