'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

type Option = { value: string; label: string; color?: string };

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className = '',
}: {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when dropdown opens.
  useEffect(() => {
    if (open) {
      setHighlightIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Scroll highlighted item into view.
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  const selected = options.find((o) => o.value === value);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
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
        if (filtered[highlightIdx]) {
          onChange(filtered[highlightIdx].value);
          setOpen(false);
          setQuery('');
        }
        break;
      case 'Escape':
        setOpen(false);
        setQuery('');
        break;
    }
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="ss-match">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div
      ref={wrapRef}
      className={`ss-wrap ${className} ${open ? 'ss-wrap--open' : ''}`}
      onKeyDown={handleKey}
    >
      {/* Trigger */}
      <button
        type="button"
        className="ss-trigger"
        onClick={() => { setOpen((o) => !o); setQuery(''); }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="ss-selected">
            {selected.color && (
              <span className="ss-dot" style={{ background: selected.color }} />
            )}
            {selected.label}
          </span>
        ) : (
          <span className="ss-placeholder">{placeholder}</span>
        )}
        <svg className="ss-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="ss-dropdown">
          <div className="ss-search-wrap">
            <svg className="ss-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              className="ss-search"
              placeholder="Search…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlightIdx(0); }}
            />
          </div>
          <ul ref={listRef} className="ss-list" role="listbox">
            {filtered.length === 0 ? (
              <li className="ss-empty">No match found</li>
            ) : (
              filtered.map((o, i) => (
                <li
                  key={o.value}
                  className={`ss-option${i === highlightIdx ? ' ss-option--hl' : ''}${o.value === value ? ' ss-option--selected' : ''}`}
                  role="option"
                  aria-selected={o.value === value}
                  onMouseEnter={() => setHighlightIdx(i)}
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
                >
                  {o.color && (
                    <span className="ss-dot" style={{ background: o.color }} />
                  )}
                  <span className="ss-option-label">{highlightMatch(o.label, query)}</span>
                  {o.value === value && (
                    <svg className="ss-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
