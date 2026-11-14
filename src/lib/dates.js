// The shop works in Indian Standard Time, so "today" and "this month"
// are always calculated in Asia/Kolkata, whatever timezone the server runs in.
import { ValidationError } from './errors.js';

export const SHOP_TIMEZONE = 'Asia/Kolkata';

export function todayInShop(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIMEZONE }).format(now); // YYYY-MM-DD
}

export function thisMonthInShop(now = new Date()) {
  return todayInShop(now).slice(0, 7); // YYYY-MM
}

export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') || Number.isNaN(Date.parse(value))) {
    throw new ValidationError('date must look like 2026-11-05');
  }
  return value;
}

export function parseMonth(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? '')) {
    throw new ValidationError('month must look like 2026-11');
  }
  return value;
}
