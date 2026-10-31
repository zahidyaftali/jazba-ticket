import { activeSale } from '../types';

const overline = 'text-[10px] font-bold tracking-[0.18em] uppercase';

/** Black band at the top of a booking rail while the event has a sale on. */
export function SaleBanner({ eventId }: { eventId: string }) {
  const sale = activeSale(eventId);
  if (!sale) return null;
  return (
    <div className="px-6 py-5 bg-black text-white">
      <span className={`${overline} text-[#ffed00]`}>Limited-time offer</span>
      <p className="font-display font-bold text-xl leading-tight mt-1.5">
        {Math.round(sale.rate * 100)}% off tickets
      </p>
      <p className="text-xs text-white/70 mt-1">Ends {sale.endsLabel}</p>
    </div>
  );
}

/** Small "25% off" tag beside an event's price while it has a sale on. */
export function SaleTag({ eventId, className = '' }: { eventId: string; className?: string }) {
  const sale = activeSale(eventId);
  if (!sale) return null;
  return (
    <span className={`${overline} bg-[#ffed00] text-black px-1.5 py-0.5 inline-block ${className}`}>
      {Math.round(sale.rate * 100)}% off
    </span>
  );
}
