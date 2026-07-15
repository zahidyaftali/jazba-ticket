// Native share sheet where available (mobile / modern browsers), clipboard
// copy everywhere else. Returns what actually happened so callers can show
// the right feedback ("copied" toast only when we copied).
export async function shareOrCopy(opts: {
  title: string;
  text?: string;
  url?: string;
}): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = opts.url || window.location.href;

  if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
    try {
      await (navigator as any).share({ title: opts.title, text: opts.text, url });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'cancelled'; // user closed the sheet
      // NotAllowedError / unsupported payload → fall back to clipboard
    }
  }

  await navigator.clipboard.writeText(url);
  return 'copied';
}
