'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  type CountryDial,
  PHONE_COUNTRIES,
  emptyPhoneDigits,
  groupDigitIndices,
  isValidPhoneForCountry,
  parseStoredPhone,
} from '@/lib/phone-countries';

export type { CountryDial };
export { PHONE_COUNTRIES };

function ChevronIcon() {
  return (
    <svg className="phone-input__chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function PhoneInput({
  name,
  id,
  required,
  error,
  defaultValue = '',
  onChange,
}: {
  name: string;
  id?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  onChange?: (fullPhone: string, isValid: boolean) => void;
}) {
  const autoId = useId();
  const inputId = id || name || autoId;
  const menuId = `${inputId}-countries`;
  const searchId = `${inputId}-country-search`;
  const initial = parseStoredPhone(defaultValue);
  const [country, setCountry] = useState<CountryDial>(initial.country);
  const [digits, setDigits] = useState<string[]>(initial.digits);
  const [menuOpen, setMenuOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const dialRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const localDigits = digits.join('').replace(/\D/g, '');
  const fullPhone = localDigits.length === country.digitCount ? `${country.dial}${localDigits}` : '';
  const isValid = isValidPhoneForCountry(fullPhone, country);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [countryQuery]);

  const notify = useCallback((phone: string, valid: boolean) => {
    onChange?.(phone, valid);
  }, [onChange]);

  useEffect(() => {
    notify(fullPhone, isValid);
  }, [fullPhone, isValid, notify]);

  useEffect(() => {
    if (!menuOpen) return;
    requestAnimationFrame(() => searchRef.current?.focus());
    const onPointerDown = (e: MouseEvent) => {
      if (dialRef.current && !dialRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setCountryQuery('');
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setCountryQuery('');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const focusDigit = (index: number) => {
    const el = refs.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const applyDigits = (next: string[], focusIndex: number) => {
    setDigits(next);
    requestAnimationFrame(() => focusDigit(focusIndex));
  };

  const handleDigitChange = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, '');
    const next = [...digits];

    if (!incoming) {
      next[index] = '';
      setDigits(next);
      return;
    }

    let cursor = index;
    for (const char of incoming) {
      if (cursor >= country.digitCount) break;
      next[cursor] = char;
      cursor++;
    }

    const focusAt = Math.min(cursor, country.digitCount - 1);
    applyDigits(next, focusAt);
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
        return;
      }
      if (index > 0) {
        e.preventDefault();
        const next = [...digits];
        next[index - 1] = '';
        applyDigits(next, index - 1);
      }
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusDigit(index - 1);
    }
    if (e.key === 'ArrowRight' && index < country.digitCount - 1) {
      e.preventDefault();
      focusDigit(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const parsed = parseStoredPhone(e.clipboardData.getData('text'));
    setCountry(parsed.country);
    setDigits(parsed.digits);
    const firstEmpty = parsed.digits.findIndex((d) => !d);
    focusDigit(firstEmpty >= 0 ? firstEmpty : parsed.country.digitCount - 1);
  };

  const selectCountry = (next: CountryDial) => {
    setCountry(next);
    setDigits(emptyPhoneDigits(next.digitCount));
    refs.current = [];
    setMenuOpen(false);
    setCountryQuery('');
    requestAnimationFrame(() => focusDigit(0));
  };

  const digitGroups = groupDigitIndices(country);

  return (
    <div className={`phone-input${error ? ' phone-input--error' : ''}`}>
      <div className="phone-input__row">
        <div className="phone-input__prefix">
          <span className="phone-input__flag" aria-hidden>{country.flag}</span>
          <div className="phone-input__dial" ref={dialRef}>
            <button
              type="button"
              className="phone-input__dial-trigger"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="phone-input__dial-code">{country.dial}</span>
              <ChevronIcon />
            </button>
            {menuOpen && (
              <div className="phone-input__menu-wrap">
                <div className="phone-input__menu-search">
                  <input
                    ref={searchRef}
                    id={searchId}
                    className="phone-input__menu-search-input"
                    type="search"
                    placeholder="Search country…"
                    value={countryQuery}
                    onChange={(e) => setCountryQuery(e.target.value)}
                    aria-label="Search countries"
                  />
                </div>
                <ul className="phone-input__menu" id={menuId} role="listbox" aria-label="Country code">
                  {filteredCountries.length === 0 ? (
                    <li className="phone-input__menu-empty" role="none">No countries found</li>
                  ) : (
                    filteredCountries.map((c) => (
                      <li key={c.code} role="none">
                        <button
                          type="button"
                          role="option"
                          aria-selected={c.code === country.code}
                          className={`phone-input__menu-item${c.code === country.code ? ' phone-input__menu-item--active' : ''}`}
                          onClick={() => selectCountry(c)}
                        >
                          <span className="phone-input__menu-flag" aria-hidden>{c.flag}</span>
                          <span className="phone-input__menu-label">{c.label}</span>
                          <span className="phone-input__menu-dial">{c.dial}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="phone-input__digits" onPaste={handlePaste}>
          {digitGroups.map((group, gi) => (
            <div key={`${country.code}-g${gi}`} className="phone-input__digit-group">
              {group.map((digitIndex) => (
                <input
                  key={`${country.code}-d${digitIndex}`}
                  ref={(el) => { refs.current[digitIndex] = el; }}
                  className="phone-input__digit"
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  autoComplete={digitIndex === 0 ? 'tel-national' : 'off'}
                  aria-label={`Phone digit ${digitIndex + 1} of ${country.digitCount}`}
                  maxLength={1}
                  value={digits[digitIndex] || ''}
                  onChange={(e) => handleDigitChange(digitIndex, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(digitIndex, e)}
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <input type="hidden" id={inputId} name={name} value={fullPhone} required={required} readOnly />
      {error ? <span className="form-error">{error}</span> : null}
    </div>
  );
}
