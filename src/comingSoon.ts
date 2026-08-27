/**
 * Site-wide "coming soon" gate.
 *
 * While no real tickets are on sale, every public route renders
 * <ComingSoonPage /> instead of the full site. Two escape hatches:
 *
 *   1. Set VITE_COMING_SOON=false (locally in .env, on Vercel in
 *      Project Settings -> Environment Variables) and redeploy — this is
 *      the switch to flip on launch day.
 *   2. Visit any URL with ?preview=jazba to unlock the real site in your
 *      own browser only. The unlock is remembered in localStorage;
 *      ?preview=off forgets it again.
 *
 * The /admin portal is never gated — see src/main.tsx.
 */

const PREVIEW_KEY = 'jz-preview-access';
const PREVIEW_TOKEN = 'jazba';

/** True unless VITE_COMING_SOON is explicitly set to "false". */
export function isComingSoonEnabled(): boolean {
  return String(import.meta.env.VITE_COMING_SOON ?? 'true').toLowerCase() !== 'false';
}

/**
 * Reads ?preview= from the URL, persists the result, and reports whether
 * this browser is allowed to skip the gate.
 */
export function hasPreviewAccess(): boolean {
  let stored = '';
  try {
    stored = localStorage.getItem(PREVIEW_KEY) || '';
  } catch {
    // Private mode / storage disabled — fall back to the URL only.
  }

  const preview = new URLSearchParams(window.location.search).get('preview');
  if (preview === PREVIEW_TOKEN) {
    stored = 'granted';
    try {
      localStorage.setItem(PREVIEW_KEY, stored);
    } catch { /* ignore */ }
  } else if (preview === 'off') {
    stored = '';
    try {
      localStorage.removeItem(PREVIEW_KEY);
    } catch { /* ignore */ }
  }

  return stored === 'granted';
}

/** Should the visitor see the coming-soon page instead of the site? */
export function shouldShowComingSoon(): boolean {
  return isComingSoonEnabled() && !hasPreviewAccess();
}
