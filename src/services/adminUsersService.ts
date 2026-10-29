// Admin portal → POST /api/admin-users (see api/admin-users.ts): every
// sign-in account's email and sign-in method, straight from Firebase
// Authentication. Works once FIREBASE_SERVICE_ACCOUNT is set on the server.

import { auth } from '../firebase';

export interface AuthUserInfo {
  uid: string;
  email: string;
  emailVerified: boolean;
  /** e.g. ["google.com"], ["facebook.com"], ["password"] */
  providers: string[];
  name: string;
  photo: string;
  createdAt: string;
  lastLoginAt: string;
}

export type AuthUsersResult =
  | { status: 'ready'; users: AuthUserInfo[] }
  | { status: 'not-configured' }
  | { status: 'error'; error: string };

export async function fetchAuthUsers(): Promise<AuthUsersResult> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return { status: 'error', error: 'Your admin session has expired — please sign in again.' };
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'error', error: data.error || 'Could not load sign-in accounts.' };
    if (!data.configured) return { status: 'not-configured' };
    return { status: 'ready', users: Array.isArray(data.users) ? data.users : [] };
  } catch (err) {
    console.error('fetchAuthUsers failed:', err);
    return { status: 'error', error: 'Could not reach the server.' };
  }
}
