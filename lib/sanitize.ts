import { isValidInternationalPhone } from './phone-countries';

export function sanitizeText(value: unknown, maxLen = 200): string {
  if (value == null) return '';
  return String(value)
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, maxLen);
}

export function sanitizeEmail(value: unknown): string {
  const raw = sanitizeText(value, 255).toLowerCase();
  return raw;
}

export function sanitizePhoneDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Normalize phone to E.164 (+880XXXXXXXXXX for Bangladesh).
 * Accepts +880…, 880…, 01XXXXXXXXX, or raw 10-digit BD mobile.
 */
export function normalizePhone(value: unknown, defaultDial = '+880'): string {
  const raw = sanitizeText(value, 30);
  if (!raw) return '';

  let digits = sanitizePhoneDigits(raw);
  if (raw.startsWith('+')) {
    const dialDigits = sanitizePhoneDigits(defaultDial);
    if (digits.startsWith(dialDigits)) {
      return `+${digits}`;
    }
    return `+${digits}`;
  }

  if (digits.startsWith('880') && digits.length >= 13) {
    return `+${digits}`;
  }

  if (defaultDial === '+880') {
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }
    if (digits.length === 10 && digits.startsWith('1')) {
      return `+880${digits}`;
    }
  }

  const dialDigits = sanitizePhoneDigits(defaultDial);
  if (digits.startsWith(dialDigits)) {
    return `+${digits}`;
  }

  return `${defaultDial}${digits}`;
}

export function sanitizeNid(value: unknown): string {
  return sanitizePhoneDigits(value).slice(0, 17);
}

export function isValidEmail(value: string): boolean {
  const email = sanitizeEmail(value);
  if (!email || email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isValidNid(value: string): boolean {
  const nid = sanitizeNid(value);
  if (!nid) return true;
  return /^(\d{10}|\d{17})$/.test(nid);
}

export function isValidPhone(value: string, dial = '+880'): boolean {
  const phone = value.startsWith('+') ? value : normalizePhone(value, dial);
  if (!phone) return false;
  return isValidInternationalPhone(phone);
}

export function validateApartmentPassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(password)) return 'Password must contain a number';
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain a letter';
  return null;
}
