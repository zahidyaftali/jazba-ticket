import React, { useEffect, useState } from "react";
import { Loader2, KeyRound, LogOut, ShieldCheck, Copy, Save } from "lucide-react";
import {
  auth,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  accountEmail,
} from "../../../firebase";
import { getUserProfile, updateUserProfile } from "../../../services/backendService";
import { useAdmin } from "../AdminContext";
import { readCollapsedPref, writeCollapsedPref } from "../AdminLayout";
import { Avatar, Badge, Detail, EditorPanel, Field, ImageUrlField, PageHeader, Switch, btnDark, btnOutline, btnPrimary, fmtDateTime, inputCls } from "../ui";

const PROVIDER_NAMES: Record<string, string> = {
  password: "Email & password",
  "google.com": "Google",
  "facebook.com": "Facebook",
};

export default function AccountSettingsPage() {
  const { data, onLogout, notify, fail, reload } = useAdmin();
  const user = auth.currentUser;
  const listed = user ? data.users.find((u) => u.uid === user.uid) : undefined;

  const [profile, setProfile] = useState({ name: "", phone: "", city: "", profileImage: "" });
  const [loaded, setLoaded] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const [collapsedPref, setCollapsedPref] = useState(readCollapsedPref);
  useEffect(() => {
    const onPref = () => setCollapsedPref(readCollapsedPref());
    window.addEventListener("jz-admin-sidebar", onPref);
    return () => window.removeEventListener("jz-admin-sidebar", onPref);
  }, []);

  // Profile from the users list, or fetched directly if it isn't there.
  useEffect(() => {
    if (loaded || !user) return;
    const fill = (p?: { name?: string; phone?: string; city?: string; profileImage?: string } | null) => {
      setProfile({
        name: p?.name || user.displayName || "",
        phone: p?.phone || "",
        city: p?.city || "",
        profileImage: p?.profileImage || user.photoURL || "",
      });
      setLoaded(true);
    };
    if (listed) fill(listed);
    else getUserProfile(user.uid).then(fill);
  }, [listed, loaded, user]);

  if (!user) return null;

  const providers = user.providerData.map((p) => p.providerId);
  const hasPassword = providers.includes("password");
  const email = accountEmail(user);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = profile.name.trim();
    if (!name) return fail("Your name can't be empty.");
    if (profile.phone.length > 32) return fail("Phone number is too long (32 characters max).");
    if (profile.city.length > 64) return fail("City is too long (64 characters max).");
    if (profile.profileImage.length > 512) return fail("Photo URL is too long (512 characters max).");
    setSavingProfile(true);
    try {
      await updateUserProfile(user.uid, {
        name,
        phone: profile.phone.trim(),
        city: profile.city.trim(),
        profileImage: profile.profileImage.trim(),
        ...(email && !listed?.email ? { email } : {}),
      });
      await updateProfile(user, { displayName: name, photoURL: profile.profileImage.trim() || null });
      notify("Profile saved.");
      reload();
    } catch (err) {
      console.error(err);
      fail("Your profile could not be saved. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (pw.next.length < 6) return setPwError("Choose a new password of at least 6 characters.");
    if (pw.next !== pw.confirm) return setPwError("The new passwords don't match.");
    setSavingPw(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, pw.current));
      await updatePassword(user, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      notify("Password updated.");
    } catch (err: any) {
      const code = err?.code || "";
      setPwError(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "Your current password is incorrect."
          : code === "auth/too-many-requests"
            ? "Too many attempts — wait a few minutes and try again."
            : "The password could not be changed. Please try again.",
      );
    } finally {
      setSavingPw(false);
    }
  };

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      notify("User ID copied.");
    } catch {
      fail("Couldn't copy — select it and copy manually.");
    }
  };

  return (
    <div>
      <PageHeader title="Account settings" sub="Your admin profile, password and portal preferences." />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          <form onSubmit={saveProfile}>
            <EditorPanel title="Profile" sub="How you appear in the portal and on the site.">
              <div className="flex items-center gap-4">
                <Avatar src={profile.profileImage} name={profile.name || email} size={64} />
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg leading-tight">{profile.name || "Your name"}</p>
                  <p className="text-xs text-[#666] break-all">{email}</p>
                  <div className="mt-1.5">
                    <Badge tone="dark">
                      <ShieldCheck className="w-3 h-3" /> Administrator
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name">
                  <input className={inputCls} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} maxLength={128} />
                </Field>
                <Field label="Email" hint="Your sign-in email can't be changed here.">
                  <input className={`${inputCls} text-[#666]`} value={email} readOnly />
                </Field>
                <Field label="Phone">
                  <input className={inputCls} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={32} />
                </Field>
                <Field label="City">
                  <input className={inputCls} value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} maxLength={64} />
                </Field>
              </div>
              <ImageUrlField label="Profile photo URL" value={profile.profileImage} onChange={(v) => setProfile({ ...profile, profileImage: v })} />
              <div>
                <button type="submit" disabled={savingProfile || !loaded} className={btnPrimary}>
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </div>
            </EditorPanel>
          </form>

          <EditorPanel title="Password" sub="Change the password you use to sign in to the portal.">
            {hasPassword ? (
              <form onSubmit={changePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Current password">
                    <input
                      type="password"
                      autoComplete="current-password"
                      className={inputCls}
                      value={pw.current}
                      onChange={(e) => setPw({ ...pw, current: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="New password">
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={inputCls}
                      value={pw.next}
                      onChange={(e) => setPw({ ...pw, next: e.target.value })}
                      placeholder="Min. 6 characters"
                      required
                    />
                  </Field>
                  <Field label="Confirm new password">
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={inputCls}
                      value={pw.confirm}
                      onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                      required
                    />
                  </Field>
                </div>
                {pwError && <p className="text-sm font-bold text-[#7a2f2f]">{pwError}</p>}
                <button type="submit" disabled={savingPw} className={btnDark}>
                  {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {savingPw ? "Updating…" : "Update password"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-[#555]">
                You sign in with {providers.map((p) => PROVIDER_NAMES[p] || p).join(" / ") || "a social account"} — your password is
                managed there.
              </p>
            )}
          </EditorPanel>
        </div>

        <div className="space-y-6">
          <EditorPanel title="Sign-in & security">
            <div className="grid grid-cols-1 gap-4">
              <Detail label="Sign-in methods">
                <span className="flex flex-wrap gap-1 mt-0.5">
                  {providers.map((p) => (
                    <span key={p}>
                      <Badge tone="neutral" dot={false}>
                        {PROVIDER_NAMES[p] || p}
                      </Badge>
                    </span>
                  ))}
                </span>
              </Detail>
              <Detail label="Account created">{fmtDateTime(user.metadata.creationTime || "")}</Detail>
              <Detail label="Last sign-in">{fmtDateTime(user.metadata.lastSignInTime || "")}</Detail>
              <Detail label="User ID">
                <span className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#555] break-all">{user.uid}</span>
                  <button type="button" onClick={copyUid} className="shrink-0 text-[#666] hover:text-black cursor-pointer" title="Copy user ID" aria-label="Copy user ID">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </span>
              </Detail>
            </div>
          </EditorPanel>

          <EditorPanel title="Portal preferences">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>
                <span className="block text-sm font-bold">Collapse the side menu</span>
                <span className="block text-[11px] text-[#8a8a8a]">Show icons only — hover an icon to see its pages.</span>
              </span>
              <Switch
                checked={collapsedPref}
                label="Collapse the side menu"
                onChange={() => {
                  const next = !collapsedPref;
                  setCollapsedPref(next);
                  writeCollapsedPref(next);
                  window.dispatchEvent(new Event("jz-admin-sidebar"));
                }}
              />
            </label>
          </EditorPanel>

          <EditorPanel title="Session">
            <p className="text-sm text-[#555]">Signed in as {email}.</p>
            <button type="button" onClick={onLogout} className={btnOutline}>
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </EditorPanel>
        </div>
      </div>
    </div>
  );
}
