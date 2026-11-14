// All money is stored as whole paise (integers) so totals never suffer
// from floating-point rounding. Rupees are only used at the edges (UI input/output).
import { ValidationError } from './errors.js';

export function toPaise(rupees, field = 'price') {
  const value = typeof rupees === 'string' ? Number(rupees.trim()) : rupees;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a number`);
  }
  if (value < 0) {
    throw new ValidationError(`${field} cannot be negative`);
  }
  const paise = Math.round(value * 100);
  if (Math.abs(value * 100 - paise) > 1e-6) {
    throw new ValidationError(`${field} can have at most 2 decimal places`);
  }
  return paise;
}

const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

export function formatRupees(paise) {
  return formatter.format(Number(paise) / 100);
}
