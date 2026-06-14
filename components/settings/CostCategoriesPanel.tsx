'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { fmt } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export type CostCategory = {
  id: string;
  name: string;
  amount: number;
  inFixedBucket?: boolean;
};

type Draft = { name: string; amount: number };
type ZoneKey = 'bucket' | 'fixed' | 'variable';
type DragPayload = { kind: 'fixed' | 'optional'; id: string; fromZone: ZoneKey };

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-3" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function CostCard({
  item,
  draft,
  badge,
  badgeTone,
  disabled,
  draggable,
  dragPayload,
  isDragging,
  onDraftChange,
  onRemove,
}: {
  item: CostCategory;
  draft: Draft;
  badge: string;
  badgeTone: 'accent' | 'violet' | 'sky';
  disabled: boolean;
  draggable: boolean;
  dragPayload: DragPayload;
  isDragging?: boolean;
  onDraftChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(dragPayload));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <article
      className={`cost-card cost-card--${badgeTone}${isDragging ? ' cost-card--dragging' : ''}`}
    >
      {draggable && (
        <div
          className="cost-card__drag"
          draggable
          onDragStart={handleDragStart}
          title="Drag to another cost zone"
          aria-label="Drag to move category"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
      )}
      {disabled ? null : (
        <button type="button" className="cost-card__remove" onClick={onRemove} aria-label={`Remove ${item.name}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <span className={`cost-card__badge cost-card__badge--${badgeTone}`}>{badge}</span>
      <label className="cost-card__field">
        <span className="cost-card__label">Category name</span>
        <input
          className="form-input cost-card__name"
          value={draft.name}
          disabled={disabled}
          placeholder="e.g. Wi-Fi Bill"
          onChange={(e) => onDraftChange({ name: e.target.value })}
        />
      </label>
      <label className="cost-card__field cost-card__field--amount">
        <span className="cost-card__label">Monthly (৳)</span>
        <div className="cost-card__amount-wrap">
          <span className="cost-card__currency">৳</span>
          <input
            className="form-input cost-card__amount"
            type="number"
            min={0}
            value={draft.amount}
            disabled={disabled}
            onChange={(e) => onDraftChange({ amount: Number(e.target.value) })}
          />
        </div>
      </label>
    </article>
  );
}

export function CostCategoriesPanel({
  fixedCosts,
  optionalCosts,
  fixedBucketTotal,
  isAdmin,
  onRefresh,
}: {
  fixedCosts: CostCategory[];
  optionalCosts: CostCategory[];
  fixedBucketTotal: number;
  isAdmin: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [adding, setAdding] = useState<ZoneKey | null>(null);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [dragOverZone, setDragOverZone] = useState<ZoneKey | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string; kind: 'fixed' | 'optional' } | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const bucketCosts = fixedCosts.filter((c) => c.inFixedBucket);
  const standaloneFixed = fixedCosts.filter((c) => !c.inFixedBucket);
  const variableTotal = optionalCosts.reduce((s, c) => s + c.amount, 0);

  useEffect(() => {
    const next: Record<string, Draft> = {};
    [...fixedCosts, ...optionalCosts].forEach((c) => {
      next[c.id] = { name: c.name, amount: c.amount };
    });
    setDrafts(next);
  }, [fixedCosts, optionalCosts]);

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const moveCost = async (payload: DragPayload, targetZone: ZoneKey) => {
    if (!isAdmin || payload.fromZone === targetZone) return;
    setMoving(true);
    try {
      const res = await fetch('/api/config/costs/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceKind: payload.kind,
          id: payload.id,
          targetZone,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || 'Could not move category', 'error');
        return;
      }
      toast('Category moved');
      await onRefresh();
    } catch {
      toast('Could not move category', 'error');
    } finally {
      setMoving(false);
      setDraggingId(null);
    }
  };

  const handleZoneDrop = (e: React.DragEvent, zoneKey: ZoneKey) => {
    e.preventDefault();
    setDragOverZone(null);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const payload = JSON.parse(raw) as DragPayload;
      moveCost(payload, zoneKey);
    } catch {
      toast('Could not move category', 'error');
    }
  };

  const saveAll = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      for (const c of fixedCosts) {
        const d = drafts[c.id];
        if (!d) continue;
        const payload: Record<string, unknown> = {};
        if (d.amount !== c.amount) payload.amount = d.amount;
        if (d.name.trim() !== c.name) payload.name = d.name.trim();
        if (Object.keys(payload).length) {
          await fetch(`/api/config/fixed-costs/${c.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      }
      for (const c of optionalCosts) {
        const d = drafts[c.id];
        if (!d) continue;
        const payload: Record<string, unknown> = {};
        if (d.amount !== c.amount) payload.amount = d.amount;
        if (d.name.trim() !== c.name) payload.name = d.name.trim();
        if (Object.keys(payload).length) {
          await fetch(`/api/config/optional-costs/${c.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      }
      toast('Cost categories saved');
      await onRefresh();
    } catch {
      toast('Could not save categories', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestRemoveFixed = (id: string, name: string) => {
    if (!isAdmin) return;
    setRemoveTarget({ id, name, kind: 'fixed' });
  };

  const requestRemoveVariable = (id: string, name: string) => {
    if (!isAdmin) return;
    setRemoveTarget({ id, name, kind: 'optional' });
  };

  const confirmRemoveCategory = async () => {
    if (!removeTarget || !isAdmin) return;
    setRemoveLoading(true);
    try {
      const url =
        removeTarget.kind === 'fixed'
          ? `/api/config/fixed-costs/${removeTarget.id}`
          : `/api/config/optional-costs/${removeTarget.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        toast('Could not remove category', 'error');
        return;
      }
      toast('Category removed');
      setRemoveTarget(null);
      await onRefresh();
    } finally {
      setRemoveLoading(false);
    }
  };

  const submitNew = async () => {
    if (!adding || !isAdmin) return;
    const name = newName.trim();
    const amount = Number(newAmount);
    if (name.length < 2) { toast('Name must be at least 2 characters', 'error'); return; }
    if (!Number.isFinite(amount) || amount < 0) { toast('Enter a valid amount', 'error'); return; }

    const url =
      adding === 'variable' ? '/api/config/optional-costs' : '/api/config/fixed-costs';
    const body =
      adding === 'variable'
        ? { name, amount }
        : { name, amount, inFixedBucket: adding === 'bucket' };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || 'Could not add category', 'error');
      return;
    }
    toast('Category added');
    setAdding(null);
    setNewName('');
    setNewAmount('');
    await onRefresh();
  };

  const renderZone = (
    tone: 'accent' | 'violet' | 'sky',
    icon: ReactNode,
    title: string,
    desc: string,
    total: number,
    items: CostCategory[],
    badge: string,
    zoneKey: ZoneKey,
    kind: 'fixed' | 'optional',
    onRemove: (id: string, name: string) => void,
  ) => (
    <section className={`cost-zone cost-zone--${tone}`}>
      <header className="cost-zone__head">
        <div className="cost-zone__icon">{icon}</div>
        <div className="cost-zone__copy">
          <h3 className="cost-zone__title">{title}</h3>
          <p className="cost-zone__desc">{desc}</p>
        </div>
        <div className="cost-zone__total">
          <span className="cost-zone__total-label">Monthly</span>
          <span className="cost-zone__total-value">{fmt(total)}</span>
        </div>
      </header>

      <div
        className={`cost-cards${dragOverZone === zoneKey ? ' cost-cards--drop-target' : ''}`}
        onDragOver={(e) => {
          if (!isAdmin) return;
          e.preventDefault();
          setDragOverZone(zoneKey);
        }}
        onDragLeave={() => setDragOverZone((z) => (z === zoneKey ? null : z))}
        onDrop={(e) => handleZoneDrop(e, zoneKey)}
      >
        {items.length === 0 && (
          <p className="cost-cards__empty">
            {isAdmin ? 'No categories — add one below or drag a card here.' : 'No categories yet.'}
          </p>
        )}
        {items.map((item) => (
          <CostCard
            key={item.id}
            item={item}
            draft={drafts[item.id] || { name: item.name, amount: item.amount }}
            badge={badge}
            badgeTone={tone}
            disabled={!isAdmin}
            draggable={isAdmin && !moving}
            dragPayload={{ kind, id: item.id, fromZone: zoneKey }}
            isDragging={draggingId === item.id}
            onDraftChange={(patch) => updateDraft(item.id, patch)}
            onRemove={() => onRemove(item.id, item.name)}
          />
        ))}
      </div>

      {isAdmin && (
        <div className="cost-zone__actions">
          {adding === zoneKey ? (
            <div className="cost-add-form">
              <input
                className="form-input"
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <input
                className="form-input"
                type="number"
                min={0}
                placeholder="Amount"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" type="button" onClick={submitNew}>
                Add
              </button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => { setAdding(null); setNewName(''); setNewAmount(''); }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="cost-zone__add"
              onClick={() => { setAdding(zoneKey); setNewName(''); setNewAmount(''); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add category
            </button>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="cost-hub">
      <div className="cost-hub__hero">
        <div>
          <h2 className="cost-hub__title">Cost categories</h2>
          <p className="cost-hub__lead">
            Drag cards between zones to switch fixed ↔ variable. Fixed bucket and other fixed stay fixed; variable costs use per-member opt-in below.
          </p>
        </div>
        {!isAdmin && (
          <span className="cost-hub__readonly chip">View only</span>
        )}
      </div>

      {isAdmin && (
        <p className="cost-hub__drag-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 9l4 4-4 4" /><path d="M9 5l4 4-4 4" transform="translate(7 0)" />
          </svg>
          Drag the grip on any card to move it between cost zones
        </p>
      )}

      {renderZone(
        'accent',
        <IconHome />,
        'Fixed bucket',
        'Rent, gas, water & service — combined and split via the Rent Split tab.',
        fixedBucketTotal,
        bucketCosts,
        'Bucket',
        'bucket',
        'fixed',
        requestRemoveFixed,
      )}

      {renderZone(
        'violet',
        <IconLayers />,
        'Other fixed costs',
        'Fixed monthly charges split equally across all members (ceiling rounded).',
        standaloneFixed.reduce((s, c) => s + (drafts[c.id]?.amount ?? c.amount), 0),
        standaloneFixed,
        'Fixed',
        'fixed',
        'fixed',
        requestRemoveFixed,
      )}

      {renderZone(
        'sky',
        <IconSpark />,
        'Variable costs',
        'Optional charges — split only among members who opt in (assign members below).',
        variableTotal,
        optionalCosts,
        'Variable',
        'variable',
        'optional',
        requestRemoveVariable,
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => { if (!removeLoading) setRemoveTarget(null); }}
        onConfirm={confirmRemoveCategory}
        title="Remove cost category?"
        description={
          removeTarget
            ? `"${removeTarget.name}" will be removed from ${removeTarget.kind === 'fixed' ? 'fixed' : 'variable'} costs. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove category"
        cancelLabel="Keep category"
        variant="danger"
        loading={removeLoading}
      />

      {isAdmin && (
        <footer className="cost-hub__save">
          <p className="cost-hub__save-hint">Save name and amount changes for all categories.</p>
          <button className="btn btn-primary" type="button" disabled={saving || moving} onClick={saveAll}>
            {saving ? 'Saving…' : 'Save all categories'}
          </button>
        </footer>
      )}
    </div>
  );
}
