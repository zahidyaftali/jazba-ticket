import { useEffect, useState } from 'react';

// ── Local currency by visitor IP ──────────────────────────────────────────
// One detection per session (ipapi.co, timezone fallback), shared by every
// component through useLocalCurrency(). All stored prices stay in USD — only
// the display converts. Rates mirror the checkout so both always agree.

export type Region = 'PK' | 'UK' | 'US';

const REGION_META: Record<Region, { rate: number; symbol: string; code: string }> = {
  PK: { rate: 280, symbol: 'Rs ', code: 'PKR' },
  UK: { rate: 0.78, symbol: '£', code: 'GBP' },
  US: { rate: 1, symbol: '$', code: 'USD' },
};

export function formatMoney(usdAmount: number, region: Region, opts?: { precise?: boolean }): string {
  const meta = REGION_META[region];
  const value = usdAmount * meta.rate;
  if (region === 'PK') return `${meta.symbol}${Math.round(value).toLocaleString()}`;
  if (opts?.precise) return `${meta.symbol}${value.toFixed(2)}`;
  return `${meta.symbol}${Math.round(value).toLocaleString()}`;
}

export function currencyCodeFor(region: Region): string {
  return REGION_META[region].code;
}

let cachedRegion: Region | null = null;
let inflight: Promise<Region> | null = null;

export function detectRegion(): Promise<Region> {
  if (cachedRegion) return Promise.resolve(cachedRegion);
  try {
    const stored = sessionStorage.getItem('jz_region');
    if (stored === 'PK' || stored === 'UK' || stored === 'US') {
      cachedRegion = stored;
      return Promise.resolve(stored);
    }
  } catch { /* sessionStorage unavailable */ }

  if (!inflight) {
    inflight = fetch('https://ipapi.co/json/')
      .then((res) => {
        if (!res.ok) throw new Error('geo lookup failed');
        return res.json();
      })
      .then((data) => {
        const cc = (data?.country_code || '').toUpperCase();
        return (cc === 'PK' ? 'PK' : cc === 'GB' || cc === 'UK' ? 'UK' : 'US') as Region;
      })
      .catch(() => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        return (tz.includes('Karachi') ? 'PK' : tz.includes('London') ? 'UK' : 'US') as Region;
      })
      .then((region) => {
        cachedRegion = region;
        try { sessionStorage.setItem('jz_region', region); } catch { /* ignore */ }
        return region;
      });
  }
  return inflight;
}

/** Hook: the visitor's detected region plus a USD→local formatter. */
export function useLocalCurrency() {
  const [region, setRegion] = useState<Region>(cachedRegion || 'US');
  useEffect(() => {
    let active = true;
    detectRegion().then((r) => { if (active) setRegion(r); });
    return () => { active = false; };
  }, []);
  return {
    region,
    currencyCode: currencyCodeFor(region),
    format: (usdAmount: number, opts?: { precise?: boolean }) => formatMoney(usdAmount, region, opts),
  };
}
