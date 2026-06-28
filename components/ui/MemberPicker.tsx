'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';

export type MemberPickerMember = {
  id: string;
  name: string;
  photoUrl?: string | null;
};

function ChevronIcon({ open, host }: { open: boolean; host?: boolean }) {
  return (
    <svg
      className={`member-picker__chevron${open ? ' member-picker__chevron--open' : ''}${host ? ' member-picker__chevron--host' : ''}`}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon({ visible }: { visible: boolean }) {
  return (
    <span className="member-picker__check-slot" aria-hidden={!visible}>
      {visible && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

export function MemberPicker({
  members,
  value,
  onChange,
  label,
  id,
  disabled = false,
  variant = 'default',
}: {
  members: MemberPickerMember[];
  value: string;
  onChange: (memberId: string) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
  variant?: 'default' | 'host';
}) {
  const autoId = useId();
  const pickerId = id || autoId;
  const menuId = `${pickerId}-menu`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const isHost = variant === 'host';

  const selectedIndex = members.findIndex((m) => m.id === value);
  const selected = selectedIndex >= 0 ? members[selectedIndex] : members[0];
  const activeId = value || selected?.id;
  const triggerAvatarSize = isHost ? 'sm' : 'xs';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (memberId: string) => {
    onChange(memberId);
    setOpen(false);
  };

  if (!members.length) {
    return (
      <div className={`member-picker member-picker--empty${isHost ? ' member-picker--host' : ''}`}>
        {label ? <span className="form-label">{label}</span> : null}
        <div className="member-picker__empty">No members available</div>
      </div>
    );
  }

  return (
    <div
      className={`member-picker${isHost ? ' member-picker--host' : ''}`}
      ref={rootRef}
    >
      {label ? (
        <label className="form-label" htmlFor={pickerId}>
          {label}
        </label>
      ) : null}
      <button
        id={pickerId}
        type="button"
        className="member-picker__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        {selected && (
          <>
            <span className="member-picker__selected">
              <Avatar
                name={selected.name}
                photoUrl={selected.photoUrl}
                index={selectedIndex >= 0 ? selectedIndex : 0}
                size={triggerAvatarSize}
              />
              <span className="member-picker__name">{selected.name}</span>
            </span>
            <ChevronIcon open={open} host={isHost} />
          </>
        )}
      </button>

      {open && (
        <ul className="member-picker__menu" id={menuId} role="listbox" aria-label={label || 'Select member'}>
          {members.map((m, i) => {
            const isActive = m.id === activeId;
            return (
              <li key={m.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`member-picker__option${isActive ? ' member-picker__option--active' : ''}`}
                  onClick={() => pick(m.id)}
                >
                  <Avatar name={m.name} photoUrl={m.photoUrl} index={i} size="xs" />
                  <span className="member-picker__option-name">{m.name}</span>
                  <CheckIcon visible={isActive} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
