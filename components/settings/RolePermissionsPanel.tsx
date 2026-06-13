'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/providers/ToastProvider';
import {
  catalogByCategory,
  mergeRolePermissions,
  PERMISSION_CATALOG,
  ROLE_META,
  ROLE_ORDER,
  type PermissionKey,
  type RolePermissionsConfig,
  type RoleTier,
} from '@/lib/role-permissions';

function RoleIcon({ tier }: { tier: RoleTier }) {
  if (tier === 'member') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  if (tier === 'billManager') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function RoleCard({
  tier,
  state,
  canEdit,
  groups,
  onToggle,
}: {
  tier: RoleTier;
  state: RolePermissionsConfig;
  canEdit: boolean;
  groups: ReturnType<typeof catalogByCategory>;
  onToggle: (key: PermissionKey, locked?: boolean) => void;
}) {
  const meta = ROLE_META[tier];
  const count = Object.values(state[tier]).filter(Boolean).length;

  return (
    <article className={`role-cards__card role-cards__card--${tier}`}>
      <header className="role-cards__card-head">
        <span className={`role-cards__icon role-cards__icon--${tier}`}>
          <RoleIcon tier={tier} />
        </span>
        <div className="role-cards__card-meta">
          <span className="role-cards__badge">{meta.short}</span>
          <h4 className="role-cards__card-title">{meta.title}</h4>
          <p className="role-cards__card-sub">{meta.description}</p>
        </div>
        <span className="role-cards__count" aria-label={`${count} permissions enabled`}>
          {count}/{PERMISSION_CATALOG.length}
        </span>
      </header>

      <div className="role-cards__body">
        {groups.map((group) => (
          <div key={group.category} className="role-cards__group">
            <h5 className="role-cards__group-title">{group.category}</h5>
            <ul className="role-cards__list">
              {group.items.map((perm) => {
                const locked = perm.lockedRoles?.includes(tier);
                const checked = state[tier][perm.key];
                return (
                  <li key={perm.key} className="role-cards__item">
                    <label
                      className={`role-cards__check role-cards__check--${tier}${locked ? ' role-cards__check--locked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canEdit || locked}
                        onChange={() => onToggle(perm.key, locked)}
                      />
                      <span className="role-cards__check-ui" aria-hidden>
                        {checked && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span className="role-cards__check-body">
                        <span className="role-cards__check-label">{perm.label}</span>
                        <span className="role-cards__check-hint">{perm.hint}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}

export function RolePermissionsPanel({
  canEdit,
  initialPermissions,
  onSaved,
}: {
  canEdit: boolean;
  initialPermissions?: RolePermissionsConfig;
  onSaved?: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [state, setState] = useState<RolePermissionsConfig>(
    mergeRolePermissions(initialPermissions),
  );
  const [saving, setSaving] = useState(false);

  const { data } = useSWR<{ rolePermissions: RolePermissionsConfig }>(
    canEdit ? '/api/config/role-permissions' : null,
  );

  useEffect(() => {
    if (initialPermissions) setState(mergeRolePermissions(initialPermissions));
  }, [initialPermissions]);

  useEffect(() => {
    if (data?.rolePermissions) setState(mergeRolePermissions(data.rolePermissions));
  }, [data]);

  const groups = useMemo(() => catalogByCategory(), []);

  const toggle = (tier: RoleTier, key: PermissionKey, locked?: boolean) => {
    if (!canEdit || locked) return;
    setState((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [key]: !prev[tier][key],
      },
    }));
  };

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await fetch('/api/config/role-permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolePermissions: state }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || 'Could not save role permissions', 'error');
        return;
      }
      toast('Role permissions saved');
      if (onSaved) await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="role-cards" aria-labelledby="role-cards-title">
      <header className="role-cards__head">
        <h3 id="role-cards-title" className="role-cards__title">Role permissions</h3>
        <p className="role-cards__lead">
          Every role picks from the same {PERMISSION_CATALOG.length} permissions. Check what each
          user type can do — Member is the base; Bill Manager and Admin add their own grants on top.
        </p>
      </header>

      <div className="role-cards__grid">
        {ROLE_ORDER.map((tier) => (
          <RoleCard
            key={tier}
            tier={tier}
            state={state}
            canEdit={canEdit}
            groups={groups}
            onToggle={(key, locked) => toggle(tier, key, locked)}
          />
        ))}
      </div>

      {canEdit && (
        <div className="role-cards__actions">
          <p className="role-cards__save-hint">
            Changes apply after members refresh or sign in again
          </p>
          <button
            className="btn btn-primary btn-sm"
            type="button"
            disabled={saving}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save role permissions'}
          </button>
        </div>
      )}
    </section>
  );
}
