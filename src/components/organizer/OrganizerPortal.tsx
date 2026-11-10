import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, LogOut, ShieldAlert } from "lucide-react";
import {
  auth,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  socialSignInErrorMessage,
  accountEmail,
  updateProfile,
  type User,
} from "../../firebase";
import {
  createUserProfile,
  getAllOrganizers,
  getOrganizerById,
  getUserProfile,
  isUserBootstrappedAdmin,
  syncAccountProfile,
  type OrganizerProfile,
  type UserProfile,
} from "../../services/backendService";
import {
  applyAsOrganizer, getMyOrganizer, isSelfRegistered, organizerStatus, privateFieldsOf, updateMyOrganizer, type OrganizerDetails,
} from "../../services/organizerService";
import { getOrganizerPrivate } from "../../services/organizerToolsService";
import brandMark from "../../../assets/images/Favicon.png";
import { btnOutline, btnPrimary, inputCls, labelCls, overline } from "../admin/ui";
import OrganizerApp from "./OrganizerApp";
import { actingTarget, stopActing } from "./acting";
import OrganizerDetailsForm, { detailsFrom, detailsProblem } from "./OrganizerDetailsForm";

type Stage =
  | { kind: "checking" }
  | { kind: "signed-out" }
  | { kind: "ready"; user: User; me: UserProfile | null; org: OrganizerProfile | null; acting?: boolean };

/** The profile with its private details (fee, review note, application
 *  note) merged in for display — they're stored separately, privately. */
async function withPrivate(org: OrganizerProfile | null): Promise<OrganizerProfile | null> {
  if (!org?.id) return org;
  const priv = await getOrganizerPrivate(org.id);
  const merged = privateFieldsOf(org, priv);
  return {
    ...org,
    ...(merged.feePercent ? { feePercent: merged.feePercent } : {}),
    ...(merged.reviewNote ? { reviewNote: merged.reviewNote } : {}),
    ...(merged.applicationNote ? { applicationNote: merged.applicationNote } : {}),
  };
}

/**
 * /organizer — the organiser portal. Signed out: log in or create an
 * account. Signed in without an organiser profile: the application form.
 * Then: waiting for review, changes requested, paused — or, once an admin
 * approves, the full portal.
 */
export default function OrganizerPortal() {
  const [stage, setStage] = useState<Stage>({ kind: "checking" });

  const load = useCallback(async (user: User) => {
    // An admin opening an organiser's portal.
    const asId = actingTarget();
    if (asId) {
      const me = await getUserProfile(user.uid);
      if (isUserBootstrappedAdmin(user.email) || (me?.role === "admin" && me?.status !== "suspended")) {
        const org = await withPrivate(await getOrganizerById(asId));
        setStage({ kind: "ready", user, me, org, acting: !!org });
        return;
      }
      stopActing();
    }
    const [me, rawOrg] = await Promise.all([getUserProfile(user.uid), getMyOrganizer(user.uid).catch(() => null)]);
    const org = await withPrivate(rawOrg);
    let profile = me;
    if (!profile) {
      // A brand-new sign-up writes its own profile a moment after the account exists.
      await new Promise((r) => setTimeout(r, 1500));
      profile = await getUserProfile(user.uid);
    }
    if (!profile) {
      // An account made elsewhere without a profile: make the basic one.
      profile = await createUserProfile(user.uid, {
        name: user.displayName || accountEmail(user).split("@")[0] || "Organiser",
        email: accountEmail(user),
      }).catch(() => null);
    } else {
      syncAccountProfile(user);
    }
    setStage({ kind: "ready", user, me: profile, org });
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (!user) setStage({ kind: "signed-out" });
        else void load(user);
      }),
    [load],
  );

  const logout = async () => {
    await signOut(auth);
    window.history.replaceState({}, "", "/organizer/login");
    setStage({ kind: "signed-out" });
  };

  if (stage.kind === "checking") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#ffed00] animate-spin" />
      </div>
    );
  }
  if (stage.kind === "signed-out") return <AuthScreen />;

  const { user, me, org } = stage;
  const setOrg = (o: OrganizerProfile) => setStage({ ...stage, org: o });
  const isAdmin = isUserBootstrappedAdmin(user.email) || me?.role === "admin";

  // An admin inside an organiser's portal: the full portal, whatever its status.
  if (stage.acting && org) {
    return <OrganizerApp user={user} me={me} org={org} onLogout={logout} actingAsAdmin />;
  }

  if (!org) {
    if (isAdmin) {
      return (
        <Notice icon={ShieldAlert} title="You’re signed in as an admin" onLogout={logout}>
          <p>Organisers use this portal to run their own events. Open any organiser’s portal to see exactly what they see and make changes for them.</p>
          <AdminOrganizerPicker />
          <a href="/admin/organizers" className={`${btnOutline} mt-5`}>
            Go to the admin portal
          </a>
        </Notice>
      );
    }
    return <ApplyScreen user={user} me={me} onDone={setOrg} onLogout={logout} />;
  }

  const status = organizerStatus(org);
  if (status === "pending") return <PendingScreen user={user} org={org} onSaved={setOrg} onLogout={logout} />;
  if (status === "rejected") return <ApplyScreen user={user} me={me} existing={org} onDone={setOrg} onLogout={logout} />;
  if (status === "suspended" || me?.status === "suspended") {
    return (
      <Notice icon={ShieldAlert} title="Your organiser account is paused" onLogout={logout}>
        <p>You can’t create or change events while it’s paused.</p>
        {org.reviewNote && <p className="mt-3 bg-[#f7f7f7] p-3 text-black">{org.reviewNote}</p>}
        <p className="mt-3">
          Questions? Email <a className="font-bold underline" href="mailto:info@jazbatickets.com">info@jazbatickets.com</a>.
        </p>
      </Notice>
    );
  }
  if (me?.role !== "organizer" && !isAdmin) {
    return (
      <Notice icon={Clock} title="Almost ready" onLogout={logout}>
        <p>Your application is approved, but your account is still being switched over. Please refresh in a minute, or email info@jazbatickets.com if this doesn’t change.</p>
      </Notice>
    );
  }
  return <OrganizerApp user={user} me={me} org={org} onLogout={logout} />;
}

// ── Pieces ────────────────────────────────────────────────────────────────

/** Admin: open one of the self-registered organisers' portals. */
function AdminOrganizerPicker() {
  const [orgs, setOrgs] = useState<OrganizerProfile[] | null>(null);
  useEffect(() => {
    getAllOrganizers().then((list) => setOrgs(list.filter((o) => isSelfRegistered(o)).sort((a, b) => a.companyName.localeCompare(b.companyName))));
  }, []);
  if (!orgs) return <Loader2 className="w-5 h-5 animate-spin mt-5" />;
  if (!orgs.length) return <p className="mt-4 text-[#8a8a8a]">No organisers have signed up yet.</p>;
  return (
    <ul className="mt-5 border border-[#e4e4e4] divide-y divide-[#f2f2f2] max-h-80 overflow-y-auto">
      {orgs.map((o) => (
        <li key={o.id}>
          <a href={`/organizer?as=${encodeURIComponent(o.id!)}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#f7f7f7]">
            <span className="min-w-0">
              <span className="font-bold text-black block truncate">{o.companyName}</span>
              <span className="text-xs text-[#8a8a8a]">{o.status || "approved"}</span>
            </span>
            <span className="text-xs font-bold underline shrink-0">Open portal</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[#f4f4f4] text-black">
      <header className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-3 min-w-0">
            <img src={brandMark} alt="Jazba Tickets" className="w-8 h-8 object-contain" />
            <span className="min-w-0">
              <span className="font-display font-bold text-sm block leading-none">Jazba Tickets</span>
              <span className={`${overline} text-[#ffed00] block mt-1.5 text-[9px]`}>For organisers</span>
            </span>
          </a>
          <a href="/for-organizers" className="text-xs font-bold text-white/70 hover:text-white flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> How it works
          </a>
        </div>
      </header>
      <main className={`mx-auto px-4 py-8 sm:py-12 ${wide ? "max-w-3xl" : "max-w-md"}`}>{children}</main>
    </div>
  );
}

function Notice({
  icon: Icon,
  title,
  children,
  onLogout,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  onLogout: () => void;
}) {
  return (
    <Shell wide>
      <div className="bg-white border border-[#e4e4e4] p-6 sm:p-8 text-sm text-[#444] leading-relaxed">
        <Icon className="w-8 h-8 mb-4" />
        <h1 className="font-display font-bold text-2xl text-black mb-3">{title}</h1>
        {children}
        <button type="button" onClick={onLogout} className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#666] hover:text-black cursor-pointer">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </Shell>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">(window.location.pathname.startsWith("/organizer/signup") ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError("");
    setInfo("");
    window.history.replaceState({}, "", m === "signup" ? "/organizer/signup" : "/organizer/login");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (mode === "signup" && !name.trim()) return setError("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (password.length < 6) return setError("Your password needs at least 6 characters.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await createUserProfile(cred.user.uid, { name: name.trim(), email: cred.user.email || email.trim() }).catch(() => null);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      const code = err?.code || "";
      setError(
        code === "auth/email-already-in-use"
          ? "That email already has an account — log in instead (the same account works for tickets and organising)."
          : code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found"
            ? "That email and password don’t match."
            : code === "auth/too-many-requests"
              ? "Too many attempts. Please wait a few minutes and try again."
              : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      if (getAdditionalUserInfo(result)?.isNewUser) {
        await createUserProfile(result.user.uid, {
          name: result.user.displayName || accountEmail(result.user).split("@")[0] || "Organiser",
          email: accountEmail(result.user),
          profileImage: result.user.photoURL || "",
        }).catch(() => null);
      }
    } catch (err) {
      setError(socialSignInErrorMessage(err, "Google"));
      setBusy(false);
    }
  };

  const reset = async () => {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Type your email above first, then tap “Forgot password”.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("If that email has an account, a password reset link is on its way.");
    } catch {
      setInfo("If that email has an account, a password reset link is on its way.");
    }
  };

  return (
    <Shell>
      <div className="bg-white border border-[#e4e4e4] p-6 sm:p-8">
        <span className={`${overline} text-[#8a8a8a]`}>Organiser portal</span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight mt-1">{mode === "signup" ? "Start selling tickets" : "Log in"}</h1>
        <p className="text-sm text-[#666] mt-2">
          {mode === "signup"
            ? "Create your account, tell us about your events, and our team will approve you — usually within a day or two."
            : "Manage your events, sales and attendees."}
        </p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 border border-black text-sm font-bold hover:bg-[#f7f7f7] cursor-pointer disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
            <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.3z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9C3.9 20.6 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.8 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.7-2.9z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.4 2.1 7l3.7 2.9c.9-2.6 3.3-4.5 6.2-4.5z" />
          </svg>
          Continue with Google
        </button>
        <div className="flex items-center gap-3 my-5 text-[11px] font-bold text-[#8a8a8a]">
          <span className="flex-1 h-px bg-[#e4e4e4]" /> or with email <span className="flex-1 h-px bg-[#e4e4e4]" />
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === "signup" && (
            <div>
              <label className={labelCls} htmlFor="org-name">Your name</label>
              <input id="org-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div>
            <label className={labelCls} htmlFor="org-email">Email</label>
            <input id="org-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className={labelCls} htmlFor="org-pass">Password</label>
            <input
              id="org-pass"
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          {error && (
            <p className="flex items-start gap-2 text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}
          {info && <p className="text-sm font-bold bg-[#fff8c2] px-3 py-2.5">{info}</p>}
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-3.5 text-sm`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs font-bold">
          {mode === "login" ? (
            <>
              <button type="button" onClick={reset} className="text-[#666] hover:text-black cursor-pointer">
                Forgot password?
              </button>
              <button type="button" onClick={() => switchMode("signup")} className="underline cursor-pointer">
                New organiser? Sign up
              </button>
            </>
          ) : (
            <button type="button" onClick={() => switchMode("login")} className="underline cursor-pointer">
              Already have an account? Log in
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-[#8a8a8a] text-center mt-4">
        By continuing you agree to our <a className="underline" href="/terms-of-use">Terms of use</a> and{" "}
        <a className="underline" href="/privacy">Privacy policy</a>.
      </p>
    </Shell>
  );
}

function ApplyScreen({
  user,
  me,
  existing,
  onDone,
  onLogout,
}: {
  user: User;
  me: UserProfile | null;
  existing?: OrganizerProfile;
  onDone: (o: OrganizerProfile) => void;
  onLogout: () => void;
}) {
  const [details, setDetails] = useState<OrganizerDetails>(() =>
    detailsFrom(existing, { contactName: me?.name || user.displayName || "", email: accountEmail(user), phone: me?.phone || "" }),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = detailsProblem(details);
    if (problem) return setError(problem);
    setError("");
    setBusy(true);
    try {
      if (existing) {
        await updateMyOrganizer(user.uid, details, true);
        onDone({ ...existing, ...details, status: "pending" });
      } else {
        onDone(await applyAsOrganizer(user.uid, details));
      }
    } catch (err) {
      console.error("Organiser application failed:", err);
      setError("We couldn’t send your application. Please check your details and try again.");
      setBusy(false);
    }
  };

  return (
    <Shell wide>
      <div className="mb-6">
        <span className={`${overline} text-[#8a8a8a]`}>{existing ? "Changes requested" : "Step 2 of 2 · Your organiser details"}</span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight mt-1">
          {existing ? "Update your application" : "Tell us about your events"}
        </h1>
        <p className="text-sm text-[#666] mt-2">
          {existing
            ? "Our team couldn’t approve your application yet. Update the details below and send it again."
            : "Our team reviews every organiser before their first event goes on sale. It usually takes one or two working days."}
        </p>
        {existing?.reviewNote && (
          <div className="mt-4 bg-[#fff8c2] border border-[#e6d200] p-4 text-sm">
            <span className="font-bold block mb-1">Message from the Jazba team</span>
            {existing.reviewNote}
          </div>
        )}
      </div>
      <form onSubmit={submit} noValidate>
        <OrganizerDetailsForm value={details} onChange={setDetails} mode="apply" />
        {error && (
          <p className="mt-5 flex items-start gap-2 text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-3 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <button type="button" onClick={onLogout} className="text-xs font-bold text-[#666] hover:text-black cursor-pointer flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Sign out ({accountEmail(user)})
          </button>
          <button type="submit" disabled={busy} className={`${btnPrimary} py-3.5 px-8 text-sm`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : existing ? "Send again for review" : "Send application"}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function PendingScreen({
  user,
  org,
  onSaved,
  onLogout,
}: {
  user: User;
  org: OrganizerProfile;
  onSaved: (o: OrganizerProfile) => void;
  onLogout: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState<OrganizerDetails>(() => detailsFrom(org));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = detailsProblem(details);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      await updateMyOrganizer(user.uid, details);
      onSaved({ ...org, ...details });
      setEditing(false);
      setError("");
    } catch {
      setError("We couldn’t save your changes. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <Shell wide>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-6">Edit your application</h1>
        <form onSubmit={save} noValidate>
          <OrganizerDetailsForm value={details} onChange={setDetails} mode="apply" />
          {error && <p className="mt-5 text-sm font-bold text-[#7a2f2f] bg-[#f7ecec] px-3 py-2.5">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className={btnOutline} onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={`${btnPrimary} px-8`}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  return (
    <Notice icon={CheckCircle2} title="Application received" onLogout={onLogout}>
      <p>
        Thanks — we’re reviewing <span className="font-bold text-black">{org.companyName}</span>. We’ll email{" "}
        <span className="font-bold text-black">{org.email || accountEmail(user)}</span> as soon as you’re approved, usually within one or two working days.
      </p>
      <ol className="mt-5 space-y-2">
        {["Account created", "Application sent", "Approval by the Jazba team", "Create your first event"].map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold ${i < 2 ? "bg-black text-[#ffed00]" : i === 2 ? "bg-[#ffed00] text-black" : "bg-[#f2f2f2] text-[#8a8a8a]"}`}>
              {i + 1}
            </span>
            <span className={i <= 2 ? "font-bold text-black" : ""}>{s}</span>
          </li>
        ))}
      </ol>
      <button type="button" className={`${btnOutline} mt-6`} onClick={() => setEditing(true)}>
        Edit application
      </button>
    </Notice>
  );
}
