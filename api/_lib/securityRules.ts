// The database's security rules: compare what's live in Firebase with the
// tested firestore.rules in this repo, and publish them — from the admin
// portal, using the Firebase service account (FIREBASE_SERVICE_ACCOUNT).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FIREBASE, HttpError } from './adminAuth.js';
import { serviceAccountToken, type ServiceAccount } from './firebaseAuthUsers.js';

const RULES_API = 'https://firebaserules.googleapis.com/v1';
const PROJECT = `projects/${FIREBASE.projectId}`;
// The site's database is a named one, so its rules release is named after it.
const RELEASE = `${PROJECT}/releases/cloud.firestore/${FIREBASE.databaseId}`;

export interface RulesStatus {
  /** The live rules match firestore.rules in the deployed site. */
  upToDate: boolean;
  /** When the live rules were last published ('' if never). */
  publishedAt: string;
}

const normalise = (s: string) => s.replace(/\r\n/g, '\n').trim();

/** firestore.rules as deployed with the site (vercel.json includeFiles). */
async function repoRules(): Promise<string> {
  try {
    return normalise(await readFile(path.join(process.cwd(), 'firestore.rules'), 'utf8'));
  } catch {
    throw new HttpError('The security rules file is missing from this deployment.', 500);
  }
}

async function call(sa: ServiceAccount, url: string, init: RequestInit = {}): Promise<{ status: number; data: any }> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await serviceAccountToken(sa)}`, ...(init.headers || {}) },
  });
  const data: any = await res.json().catch(() => ({}));
  if (res.status === 403) {
    throw new HttpError('The Firebase admin key is not allowed to manage security rules — publish them from the Firebase console instead.', 502);
  }
  return { status: res.status, data };
}

export async function getRulesStatus(sa: ServiceAccount): Promise<RulesStatus> {
  const wanted = await repoRules();
  const release = await call(sa, `${RULES_API}/${RELEASE}`);
  if (release.status === 404) return { upToDate: false, publishedAt: '' };
  if (release.status !== 200 || !release.data?.rulesetName) {
    console.error('Rules release read failed:', release.status, release.data?.error?.message);
    throw new HttpError('Could not read the live security rules from Firebase.', 502);
  }
  const ruleset = await call(sa, `${RULES_API}/${release.data.rulesetName}`);
  if (ruleset.status !== 200) {
    console.error('Ruleset read failed:', ruleset.status, ruleset.data?.error?.message);
    throw new HttpError('Could not read the live security rules from Firebase.', 502);
  }
  const live = (ruleset.data?.source?.files || []).map((f: any) => normalise(String(f?.content || ''))).join('\n');
  return { upToDate: live === wanted, publishedAt: String(release.data.updateTime || release.data.createTime || '') };
}

/** Publish the repo's rules. Firebase checks them first: invalid rules are
 *  refused and the live ones stay as they are. */
export async function publishRules(sa: ServiceAccount): Promise<RulesStatus> {
  const content = await repoRules();
  const created = await call(sa, `${RULES_API}/${PROJECT}/rulesets`, {
    method: 'POST',
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content }] } }),
  });
  if (created.status !== 200 || !created.data?.name) {
    console.error('Ruleset create failed:', created.status, JSON.stringify(created.data?.error || {}).slice(0, 500));
    throw new HttpError('Firebase refused the security rules, so nothing was changed.', 502);
  }
  const release = { name: RELEASE, rulesetName: created.data.name };
  let updated = await call(sa, `${RULES_API}/${RELEASE}`, { method: 'PATCH', body: JSON.stringify({ release }) });
  if (updated.status === 404) {
    updated = await call(sa, `${RULES_API}/${PROJECT}/releases`, { method: 'POST', body: JSON.stringify(release) });
  }
  if (updated.status !== 200) {
    console.error('Rules release failed:', updated.status, updated.data?.error?.message);
    throw new HttpError('Could not publish the security rules.', 502);
  }
  return getRulesStatus(sa);
}
