import { createSign } from 'node:crypto';
import { FIREBASE, HttpError } from './adminAuth.js';

// Reads Firebase Authentication's own user records (email, sign-in method,
// last sign-in) — which the website itself can't see for other people —
// using a Firebase service-account key stored in the FIREBASE_SERVICE_ACCOUNT
// environment variable (the JSON file from Firebase console → Project
// settings → Service accounts → Generate new private key).

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

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

/** The service account from the environment, or null when it isn't set up. */
export function serviceAccountFromEnv(env: Record<string, string | undefined>): ServiceAccount | null {
  let raw = (env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  // Accept the JSON as-is or base64-encoded (some dashboards mangle newlines).
  if (!raw.startsWith('{')) {
    try {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      /* fall through to the JSON error below */
    }
  }
  let sa: any;
  try {
    sa = JSON.parse(raw);
  } catch {
    throw new HttpError('FIREBASE_SERVICE_ACCOUNT is not valid JSON — paste the whole key file.', 500);
  }
  if (!sa?.client_email || !sa?.private_key) {
    throw new HttpError('FIREBASE_SERVICE_ACCOUNT is missing client_email / private_key.', 500);
  }
  if (sa.project_id && sa.project_id !== FIREBASE.projectId) {
    throw new HttpError(
      `That service-account key belongs to Firebase project "${sa.project_id}", but the site uses "${FIREBASE.projectId}".`,
      500,
    );
  }
  return {
    project_id: sa.project_id || FIREBASE.projectId,
    client_email: sa.client_email,
    private_key: String(sa.private_key).replace(/\\n/g, '\n'),
  };
}

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** A signed service-account JWT for Google's OAuth token exchange. */
export function signServiceJwt(sa: ServiceAccount, scope: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: nowSec, exp: nowSec + 3600 }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;
}

// Re-used across warm serverless invocations.
let cachedToken: { value: string; expiresAt: number; email: string } | null = null;

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.email === sa.client_email && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const assertion = signServiceJwt(sa, 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error('Service-account token exchange failed:', data?.error, data?.error_description);
    throw new HttpError('The Firebase admin key was rejected by Google — generate a new key and update FIREBASE_SERVICE_ACCOUNT.', 502);
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000, email: sa.client_email };
  return data.access_token;
}

const iso = (ms: unknown) => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : '';
};

/** Every Firebase Authentication account (paged, up to 20,000). */
export async function listAuthUsers(sa: ServiceAccount): Promise<AuthUserInfo[]> {
  const token = await accessToken(sa);
  const out: AuthUserInfo[] = [];
  let pageToken = '';
  for (let page = 0; page < 20; page++) {
    const url =
      `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(sa.project_id)}/accounts:batchGet` +
      `?maxResults=1000${pageToken ? `&nextPageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('accounts:batchGet failed:', res.status, data?.error?.message);
      throw new HttpError(
        res.status === 403
          ? 'The Firebase admin key does not have permission to read users — use the "Firebase Admin SDK" service account.'
          : 'Could not read sign-in accounts from Firebase right now.',
        502,
      );
    }
    for (const u of data.users || []) {
      const providers: any[] = Array.isArray(u.providerUserInfo) ? u.providerUserInfo : [];
      out.push({
        uid: String(u.localId || ''),
        email: String(u.email || providers.find((p) => p?.email)?.email || ''),
        emailVerified: !!u.emailVerified,
        providers: providers.map((p) => String(p?.providerId || '')).filter(Boolean),
        name: String(u.displayName || providers.find((p) => p?.displayName)?.displayName || ''),
        photo: String(u.photoUrl || providers.find((p) => p?.photoUrl)?.photoUrl || ''),
        createdAt: iso(u.createdAt),
        lastLoginAt: iso(u.lastLoginAt),
      });
    }
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }
  return out;
}
