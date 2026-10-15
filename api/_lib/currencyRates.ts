// USD → local conversion rates for the server. Must mirror src/currency.ts so
// the amount charged always equals the total shown on screen.
export const USD_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.78,
  PKR: 280,
};
