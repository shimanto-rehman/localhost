'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CURRENCIES } from '@/lib/currencies';
import { FlagEmoji } from '@/components/ui/FlagEmoji';

type MenuPos = { top: number; left: number; width: number };

export function CurrencySelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = CURRENCIES.find((c) => c.code === value) || CURRENCIES[0];

  const filtered = useMemo(() => {
    if (!query.trim()) return CURRENCIES;
    const q = query.toLowerCase();
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPos = () => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPos();
    const onReflow = () => updateMenuPos();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setHighlightIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (!disabled && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIdx]) pick(filtered[highlightIdx].code);
        break;
      case 'Escape':
        setOpen(false);
        setQuery('');
        break;
    }
  };

  const menu = open && menuPos && mounted ? (
    <div
      ref={menuRef}
      className="currency-picker__menu currency-picker__menu--portal"
      style={{
        position: 'fixed',
        top: menuPos.top,
        left: menuPos.left,
        width: menuPos.width,
        zIndex: 10000,
      }}
    >
      <div className="currency-picker__search-wrap">
        <svg className="currency-picker__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          className="currency-picker__search"
          placeholder="Search currency…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightIdx(0);
          }}
        />
      </div>
      <ul ref={listRef} className="currency-picker__list" role="listbox">
        {filtered.length === 0 ? (
          <li className="currency-picker__empty">No currency found</li>
        ) : (
          filtered.map((c, i) => (
            <li
              key={c.code}
              role="option"
              aria-selected={c.code === value}
              className={`currency-picker__option${i === highlightIdx ? ' currency-picker__option--hl' : ''}${c.code === value ? ' currency-picker__option--selected' : ''}`}
              onMouseEnter={() => setHighlightIdx(i)}
              onClick={() => pick(c.code)}
            >
              <FlagEmoji locale={c.locale} className="currency-picker__flag" width={24} />
              <span className="currency-picker__option-text">
                <span className="currency-picker__code">{c.code}</span>
                <span className="currency-picker__name">{c.name}</span>
              </span>
              {c.code === value && (
                <svg className="currency-picker__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  ) : null;

  return (
    <div
      ref={wrapRef}
      className={`currency-picker${open ? ' currency-picker--open' : ''}${disabled ? ' currency-picker--disabled' : ''}`}
      onKeyDown={handleKey}
    >
      <button
        type="button"
        className="currency-picker__trigger"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((o) => !o);
            setQuery('');
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FlagEmoji locale={selected.locale} className="currency-picker__flag" width={22} />
        <span className="currency-picker__trigger-text">
          <span className="currency-picker__code">{selected.code}</span>
          <span className="currency-picker__name">{selected.name}</span>
        </span>
        <svg className="currency-picker__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {menu && createPortal(menu, document.body)}
    </div>
  );
}
