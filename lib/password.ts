import bcrypt from 'bcryptjs';
import { DEFAULT_PASSWORD } from './constants';

const ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function defaultPasswordHash(): Promise<string> {
  return hashPassword(DEFAULT_PASSWORD);
}

/** Apartment account passwords — stricter rules. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(password)) return 'Password must contain at least one number';
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
  return null;
}

/** Member sign-in passwords — short numeric PINs allowed (e.g. default 1234). */
export function validateMemberPassword(password: string): string | null {
  if (!password || password.length < 4) return 'Password must be at least 4 characters';
  return null;
}
