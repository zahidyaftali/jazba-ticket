// Admin portal → POST /api/admin-security-rules (see api/admin-security-rules.ts):
// are the database's live security rules the tested ones, and publish them.

import { auth } from '../firebase';

export interface RulesStatus {
  upToDate: boolean;
  publishedAt: string;
}

export type RulesResult = { status: 'ready'; rules: RulesStatus } | { status: 'error'; error: string };

export async function securityRules(publish = false): Promise<RulesResult> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return { status: 'error', error: 'Your admin session has expired — please sign in again.' };
    const res = await fetch('/api/admin-security-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, publish }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'error', error: data.error || 'Could not check the database security rules.' };
    return { status: 'ready', rules: { upToDate: !!data.upToDate, publishedAt: String(data.publishedAt || '') } };
  } catch (err) {
    console.error('securityRules failed:', err);
    return { status: 'error', error: 'Could not reach the server.' };
  }
}
