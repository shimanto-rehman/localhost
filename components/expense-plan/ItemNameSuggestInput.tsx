'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.trim().length)}</mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

export function ItemNameSuggestInput({
  id,
  value,
  suggestions,
  placeholder,
  disabled,
  onChange,
  onKeyDown,
}: {
  id?: string;
  value: string;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const pool = suggestions.filter((name) => !q || name.toLowerCase().includes(q));
    const exact = pool.find((n) => n.toLowerCase() === q);
    if (exact) {
      return pool.filter((n) => n.toLowerCase() !== q);
    }
    return pool;
  }, [suggestions, value]);

  const showList = open && !disabled && filtered.length > 0;

  useEffect(() => {
    setActiveIndex(-1);
  }, [value, showList]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        pick(filtered[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="ep-suggest" ref={rootRef}>
      <input
        id={id}
        className="ep-field__input"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showList && (
        <ul id={listId} className="ep-suggest__list" role="listbox">
          {filtered.slice(0, 8).map((name, i) => (
            <li key={name} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`ep-suggest__option${i === activeIndex ? ' ep-suggest__option--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(name)}
              >
                {highlightMatch(name, value)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
