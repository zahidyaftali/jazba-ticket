// Custom auth client for the /api backend. This file deliberately keeps the
// same module path and export names the pages used with Firebase Auth
// (auth, onAuthStateChanged, signInWithEmailAndPassword, ...), so switching
// a page over is an import-path change only — no logic or design changes.
import { apiGet, apiPost, apiPut, getToken, setToken } from './services/apiClient';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: string | null;
  providerData: { providerId: string; email: string | null }[];
}

type AuthListener = (user: User | null) => void;

interface AuthClient {
  currentUser: User | null;
}

function toUser(apiUser: any): User {
  return {
    uid: apiUser.uid,
    email: apiUser.email ?? null,
    displayName: apiUser.name ?? null,
    photoURL: apiUser.profileImage || null,
    emailVerified: true,
    isAnonymous: false,
    tenantId: null,
    providerData: [{ providerId: 'password', email: apiUser.email ?? null }],
  };
}

export const auth: AuthClient = { currentUser: null };

const listeners = new Set<AuthListener>();
let initDone = false;

function notify() {
  for (const cb of listeners) cb(auth.currentUser);
}

// Restore the session once per page load: validate the stored token
// against /api/auth/me and hydrate currentUser.
const initPromise: Promise<void> = (async () => {
  const token = getToken();
  if (token) {
    try {
      const { user } = await apiGet('/api/auth/me');
      auth.currentUser = toUser(user);
    } catch {
      setToken(null);
      auth.currentUser = null;
    }
  }
  initDone = true;
  notify();
})();

/** Firebase-compatible: fires immediately after the initial session check, then on every sign-in/out. */
export function onAuthStateChanged(_auth: AuthClient, callback: AuthListener): () => void {
  listeners.add(callback);
  if (initDone) {
    callback(auth.currentUser);
  } else {
    initPromise.then(() => {
      if (listeners.has(callback)) callback(auth.currentUser);
    });
  }
  return () => listeners.delete(callback);
}

export async function signInWithEmailAndPassword(_auth: AuthClient, email: string, password: string): Promise<{ user: User }> {
  const { token, user } = await apiPost('/api/auth/login', { email, password });
  setToken(token);
  auth.currentUser = toUser(user);
  notify();
  return { user: auth.currentUser };
}

export async function createUserWithEmailAndPassword(_auth: AuthClient, email: string, password: string): Promise<{ user: User }> {
  const { token, user } = await apiPost('/api/auth/signup', { email, password });
  setToken(token);
  auth.currentUser = toUser(user);
  notify();
  return { user: auth.currentUser };
}

export async function updateProfile(user: User, update: { displayName?: string | null; photoURL?: string | null }): Promise<void> {
  await apiPut(`/api/users/${user.uid}`, {
    name: update.displayName ?? undefined,
    profileImage: update.photoURL ?? undefined,
  });
  if (auth.currentUser && auth.currentUser.uid === user.uid) {
    if (update.displayName !== undefined) auth.currentUser.displayName = update.displayName;
    if (update.photoURL !== undefined) auth.currentUser.photoURL = update.photoURL;
  }
}

export async function signOut(_auth: AuthClient): Promise<void> {
  setToken(null);
  auth.currentUser = null;
  notify();
}

export async function sendPasswordResetEmail(_auth: AuthClient, email: string): Promise<void> {
  await apiPost('/api/auth/reset-request', { email });
}

// ---------------------------------------------------------------
// Social sign-in (Google Identity Services + Facebook JS SDK).
// The provider popup yields an access token; our backend verifies it
// with Google/Facebook and issues the same JWT session as email login.
// ---------------------------------------------------------------

export class GoogleAuthProvider {}
export class FacebookAuthProvider {}

const loadedScripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let p = loadedScripts.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        loadedScripts.delete(src);
        reject(new Error('Could not load the sign-in provider. Check your connection and try again.'));
      };
      document.head.appendChild(el);
    });
    loadedScripts.set(src, p);
  }
  return p;
}

async function googlePopupToken(): Promise<string> {
  const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Google sign-in is not configured yet — please continue with email and password.');
  await loadScript('https://accounts.google.com/gsi/client');
  return new Promise<string>((resolve, reject) => {
    const g = (window as any).google;
    const client = g.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (resp: any) => {
        if (resp?.access_token) resolve(resp.access_token);
        else reject(new Error('Google sign-in was cancelled.'));
      },
      error_callback: () => reject(new Error('Google sign-in was cancelled.')),
    });
    client.requestAccessToken();
  });
}

let fbInitialized = false;

async function facebookPopupToken(): Promise<string> {
  const appId = (import.meta as any).env.VITE_FACEBOOK_APP_ID;
  if (!appId) throw new Error('Facebook sign-in is not configured yet — please continue with email and password.');
  await loadScript('https://connect.facebook.net/en_US/sdk.js');
  const FB = (window as any).FB;
  if (!fbInitialized) {
    FB.init({ appId, version: 'v19.0', cookie: false, xfbml: false });
    fbInitialized = true;
  }
  return new Promise<string>((resolve, reject) => {
    FB.login(
      (resp: any) => {
        if (resp?.authResponse?.accessToken) resolve(resp.authResponse.accessToken);
        else reject(new Error('Facebook sign-in was cancelled.'));
      },
      { scope: 'public_profile,email' },
    );
  });
}

export async function signInWithPopup(_auth: AuthClient, provider: GoogleAuthProvider | FacebookAuthProvider): Promise<{ user: User }> {
  let token: string;
  let user: any;
  if (provider instanceof FacebookAuthProvider) {
    const accessToken = await facebookPopupToken();
    ({ token, user } = await apiPost('/api/auth/facebook', { accessToken }));
  } else {
    const accessToken = await googlePopupToken();
    ({ token, user } = await apiPost('/api/auth/google', { accessToken }));
  }
  setToken(token);
  auth.currentUser = toUser(user);
  notify();
  return { user: auth.currentUser };
}
