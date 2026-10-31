import { randomInt } from 'node:crypto';

/** No 0/O or 1/I, so an order number read out or typed at the door is unambiguous. */
const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A new order number like "TT-7K3M9QX2". 32^8 possibilities, so two orders
 *  never share one (the old 6-digit numbers could clash after a few hundred). */
export function newOrderId(prefix: string): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)];
  return `${prefix}-${id}`;
}
