'use client';

import { useEffect, useRef, useState } from 'react';

export type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid';

/**
 * Debounced server-side field existence check.
 *
 * - `field='apartment'` → `valid` means apartment EXISTS (signin context)
 * - `field='phone'|'email'` → `valid` means value is AVAILABLE (registration context)
 */
export function useFieldValidation(
  field: 'apartment' | 'phone' | 'email',
  value: string,
  enabled: boolean,
  debounceMs = 500,
): ValidationStatus {
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    const trimmed = value.trim();

    // Reset if disabled or value too short
    if (!enabled || trimmed.length < 2) {
      setStatus('idle');
      return;
    }

    // Show idle while waiting for debounce
    setStatus('idle');

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus('checking');

      try {
        const res = await fetch('/api/auth/validate/exists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, value: trimmed }),
          signal: controller.signal,
        });

        if (!res.ok) {
          setStatus('idle');
          return;
        }

        const data = await res.json();

        if (field === 'apartment') {
          // For signin: valid = apartment exists
          setStatus(data.exists ? 'valid' : 'invalid');
        } else {
          // For registration: valid = value is available (not taken)
          setStatus(data.exists ? 'invalid' : 'valid');
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setStatus('idle');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [field, value, enabled, debounceMs]);

  return status;
}
