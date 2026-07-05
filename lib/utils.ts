import { MONTH_NAMES } from './constants';
import { getCurrencyByCode } from './currencies';

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function parseMonthKey(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

/** Format number with currency symbol. Pass currencyCode from apartment context. */
export function fmt(n: number, currencyCode?: string | null): string {
  const currency = getCurrencyByCode(currencyCode);
  return currency.symbol + Number(n).toLocaleString(currency.locale);
}

export function ceilPerHead(total: number, n: number): number {
  return n > 0 ? Math.ceil(total / n) : 0;
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export function generateRegistrationId(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `APT-${year}-${rand}`;
}

export function formatAddress(apt: {
  addressRoad: string;
  addressCity: string;
  addressPostal: string;
  addressCountry: string;
}): string {
  return `${apt.addressRoad}, ${apt.addressCity}-${apt.addressPostal}, ${apt.addressCountry}`;
}

export function isValidMonthKey(key: string): boolean {
  return /^\d{4}-\d{2}$/.test(key);
}

export function memberColor(i: number): string {
  const colors = ['#2dd4bf', '#14b8a6', '#0d9488', '#5eead4', '#2ebfa8', '#0f766e'];
  return colors[i % colors.length];
}

export function stripSensitive<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  const copy = { ...obj };
  for (const k of keys) delete copy[k as keyof T];
  return copy;
}
