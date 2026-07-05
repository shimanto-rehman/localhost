'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { monthKey } from '@/lib/utils';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_PLAN_UNITS,
  EXPENSE_PLAN_CATEGORY_ICONS,
} from '@/lib/constants';
import { expensePlanKey } from '@/lib/api/cache-keys';
import { apiFetch } from '@/lib/api/fetcher';
import { useToast } from '@/components/providers/ToastProvider';
import { useApp } from '@/components/providers/AppProvider';
import { useCurrency } from '@/lib/use-currency';
import { memberHasPerm } from '@/lib/client-permissions';
import { ItemNameSuggestInput } from '@/components/expense-plan/ItemNameSuggestInput';

type PlanItem = {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sortOrder: number;
};

type Plan = {
  id: string;
  category: string;
  items: PlanItem[];
};

type PlanData = {
  plans: Plan[];
  totals: Record<string, number>;
  totalItems: number;
  totalBudget: number;
  suggestions?: Record<string, string[]>;
};

const EMPTY_FORM = { itemName: '', unit: 'pcs', quantity: '1', unitPrice: '' };

function canSubmitAddForm(form: typeof EMPTY_FORM) {
  const price = parseInt(form.unitPrice, 10);
  return form.itemName.trim().length > 0 && Number.isFinite(price) && price > 0;
}

function SelectChevron() {
  return (
    <svg className="ep-field__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function ExpensePlanPage() {
  const { currentMember } = useApp();
  const { toast } = useToast();
  const { format, symbol } = useCurrency();
  const [addForms, setAddForms] = useState<Record<string, typeof EMPTY_FORM>>({});
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PlanItem>>({});

  const mk = monthKey(new Date());
  const { data, mutate } = useSWR<PlanData>(expensePlanKey(mk));

  const canEdit = currentMember ? memberHasPerm(currentMember, 'edit_any_expense') : false;

  const getForm = (category: string) => addForms[category] || EMPTY_FORM;
  const setForm = (category: string, updates: Partial<typeof EMPTY_FORM>) => {
    setAddForms((prev) => ({ ...prev, [category]: { ...getForm(category), ...updates } }));
  };

  const getCategoryTotal = (category: string) => data?.totals?.[category] || 0;
  const getCategoryItems = (category: string) =>
    data?.plans?.find((p) => p.category === category)?.items || [];

  const getCategorySuggestions = (category: string) => data?.suggestions?.[category] || [];

  const handleAdd = async (category: string) => {
    if (!canEdit || addingCategory) return;
    const form = getForm(category);
    if (!canSubmitAddForm(form)) return;

    const qty = Math.max(1, parseInt(form.quantity, 10) || 1);
    const price = Math.max(1, parseInt(form.unitPrice, 10) || 0);

    const newItem: PlanItem = {
      id: `temp-${Date.now()}`,
      itemName: form.itemName.trim(),
      unit: form.unit,
      quantity: qty,
      unitPrice: price,
      totalPrice: qty * price,
      sortOrder: 999,
    };

    setAddingCategory(category);

    try {
      await mutate(
        async () => {
          const res = await fetch(`/api/expense-plans/${mk}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category,
              itemName: newItem.itemName,
              unit: newItem.unit,
              quantity: newItem.quantity,
              unitPrice: newItem.unitPrice,
            }),
          });
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            toast((d as { error?: string }).error || 'Could not add item', 'error');
            throw new Error('Failed');
          }
          return apiFetch(expensePlanKey(mk)) as Promise<PlanData>;
        },
        {
          optimisticData: (prev: PlanData | undefined) => {
            if (!prev) {
              return {
                plans: [{ id: `temp-plan-${category}`, category, items: [newItem] }],
                totals: { [category]: newItem.totalPrice },
                totalItems: 1,
                totalBudget: newItem.totalPrice,
                suggestions: { [category]: [newItem.itemName] },
              };
            }
            const plans = prev.plans.map((p) => {
              if (p.category !== category) return p;
              return { ...p, items: [...p.items, newItem] };
            });
            if (!plans.some((p) => p.category === category)) {
              plans.push({ id: `temp-plan-${category}`, category, items: [newItem] });
            }
            const totals = { ...prev.totals };
            totals[category] = (totals[category] || 0) + newItem.totalPrice;
            const suggestions = { ...(prev.suggestions || {}) };
            const catNames = new Set(suggestions[category] || []);
            catNames.add(newItem.itemName);
            suggestions[category] = Array.from(catNames).sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: 'base' }),
            );
            return {
              ...prev,
              plans,
              totals,
              suggestions,
              totalItems: prev.totalItems + 1,
              totalBudget: prev.totalBudget + newItem.totalPrice,
            };
          },
          rollbackOnError: true,
          revalidate: true,
        },
      );

      setAddForms((prev) => ({ ...prev, [category]: EMPTY_FORM }));
      toast('Item added', 'success');
    } catch {
      // Error toast already shown
    } finally {
      setAddingCategory(null);
    }
  };

  const handleDelete = async (itemId: string, category: string, totalPrice: number) => {
    if (!canEdit) return;

    mutate(
      async () => {
        const res = await fetch(`/api/expense-plans/${mk}/${itemId}`, { method: 'DELETE' });
        if (!res.ok) {
          toast('Could not delete item', 'error');
          throw new Error('Failed');
        }
        return apiFetch(expensePlanKey(mk)) as Promise<PlanData>;
      },
      {
        optimisticData: (prev: PlanData | undefined) => {
          if (!prev) return { plans: [], totals: {}, totalItems: 0, totalBudget: 0 };
          const plans = prev.plans.map((p) => {
            if (p.category !== category) return p;
            return { ...p, items: p.items.filter((i) => i.id !== itemId) };
          });
          const totals = { ...prev.totals };
          totals[category] = Math.max(0, (totals[category] || 0) - totalPrice);
          return {
            ...prev,
            plans,
            totals,
            totalItems: Math.max(0, prev.totalItems - 1),
            totalBudget: Math.max(0, prev.totalBudget - totalPrice),
          };
        },
        rollbackOnError: true,
        revalidate: true,
      },
    );
  };

  const handleUpdate = async (itemId: string, category: string, oldTotal: number) => {
    if (!canEdit) return;
    const qty = editValues.quantity ?? 1;
    const price = editValues.unitPrice ?? 0;
    const newTotal = qty * price;

    mutate(
      async () => {
        const res = await fetch(`/api/expense-plans/${mk}/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editValues),
        });
        if (!res.ok) {
          toast('Could not update item', 'error');
          throw new Error('Failed');
        }
        return apiFetch(expensePlanKey(mk)) as Promise<PlanData>;
      },
      {
        optimisticData: (prev: PlanData | undefined) => {
          if (!prev) return { plans: [], totals: {}, totalItems: 0, totalBudget: 0 };
          const plans = prev.plans.map((p) => {
            if (p.category !== category) return p;
            return {
              ...p,
              items: p.items.map((i) =>
                i.id === itemId
                  ? ({ ...i, ...editValues, quantity: qty, unitPrice: price, totalPrice: newTotal } as PlanItem)
                  : i,
              ),
            };
          });
          const totals = { ...prev.totals };
          totals[category] = (totals[category] || 0) - oldTotal + newTotal;
          return { ...prev, plans, totals, totalBudget: prev.totalBudget - oldTotal + newTotal };
        },
        rollbackOnError: true,
        revalidate: true,
      },
    );

    setEditingId(null);
    setEditValues({});
  };

  const handleKeyDown = (e: React.KeyboardEvent, category: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd(category);
    }
  };

  const renderFieldSelect = (
    id: string,
    value: string,
    onChange: (v: string) => void,
    disabled?: boolean,
  ) => (
    <div className="ep-field__select-wrap">
      <select
        id={id}
        className="ep-field__select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {EXPENSE_PLAN_UNITS.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
      <SelectChevron />
    </div>
  );

  return (
    <section className="page active">
      <header className="ep-hero">
        <div className="ep-hero__copy">
          <p className="ep-hero__eyebrow">Monthly planning</p>
          <h1 className="ep-hero__title">Expense Plan</h1>
          <p className="ep-hero__sub">Build your budget by category — track what you expect to spend this month.</p>
        </div>
        <div className="ep-hero__stats">
          <div className="ep-hero-stat ep-hero-stat--primary">
            <span className="ep-hero-stat__value">{format(data?.totalBudget || 0)}</span>
            <span className="ep-hero-stat__label">Total budget</span>
          </div>
          <div className="ep-hero-stat">
            <span className="ep-hero-stat__value">{data?.totalItems || 0}</span>
            <span className="ep-hero-stat__label">Line items</span>
          </div>
          <div className="ep-hero-stat">
            <span className="ep-hero-stat__value">{EXPENSE_CATEGORIES.length}</span>
            <span className="ep-hero-stat__label">Categories</span>
          </div>
        </div>
      </header>

      <div className="ep-grid">
        {EXPENSE_CATEGORIES.map((category) => {
          const items = getCategoryItems(category);
          const total = getCategoryTotal(category);
          const form = getForm(category);
          const color = EXPENSE_CATEGORY_COLORS[category] || '#94a3b8';
          const icon = EXPENSE_PLAN_CATEGORY_ICONS[category] || '📦';

          return (
            <article
              key={category}
              className="ep-card"
              style={{ '--ep-accent': color } as React.CSSProperties}
            >
              <header className="ep-card__head">
                <div className="ep-card__identity">
                  <span className="ep-card__icon">{icon}</span>
                  <div>
                    <h2 className="ep-card__name">{category}</h2>
                    <p className="ep-card__count">
                      {items.length === 0 ? 'No items yet' : `${items.length} item${items.length === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>
              </header>

              <div className="ep-card__body">
                {items.length === 0 ? (
                  <p className="ep-empty">Add your first planned expense below.</p>
                ) : (
                  <ul className="ep-list">
                    {items.map((item) => (
                      <li key={item.id} className="ep-list__item">
                        {editingId === item.id ? (
                          <div className="ep-edit">
                            <div className="ep-edit__grid">
                              <label className="ep-field ep-field--wide">
                                <span className="ep-field__label">Item</span>
                                <input
                                  className="ep-field__input"
                                  value={editValues.itemName ?? item.itemName}
                                  onChange={(e) => setEditValues((v) => ({ ...v, itemName: e.target.value }))}
                                />
                              </label>
                              <label className="ep-field">
                                <span className="ep-field__label">Unit</span>
                                {renderFieldSelect(
                                  `edit-unit-${item.id}`,
                                  editValues.unit ?? item.unit,
                                  (unit) => setEditValues((v) => ({ ...v, unit })),
                                )}
                              </label>
                              <label className="ep-field ep-field--narrow">
                                <span className="ep-field__label">Qty</span>
                                <input
                                  type="number"
                                  className="ep-field__input ep-field__input--center"
                                  value={editValues.quantity ?? item.quantity}
                                  min={1}
                                  onChange={(e) =>
                                    setEditValues((v) => ({
                                      ...v,
                                      quantity: Math.max(1, parseInt(e.target.value) || 1),
                                    }))
                                  }
                                />
                              </label>
                              <label className="ep-field ep-field--narrow">
                                <span className="ep-field__label">Price</span>
                                <div className="ep-field__money">
                                  <span className="ep-field__currency">{symbol}</span>
                                  <input
                                    type="number"
                                    className="ep-field__money-input"
                                    value={editValues.unitPrice ?? item.unitPrice}
                                    min={1}
                                    onChange={(e) =>
                                      setEditValues((v) => ({
                                        ...v,
                                        unitPrice: Math.max(1, parseInt(e.target.value) || 0),
                                      }))
                                    }
                                  />
                                </div>
                              </label>
                            </div>
                            <div className="ep-edit__actions">
                              <button
                                type="button"
                                className="ep-icon-btn ep-icon-btn--save"
                                onClick={() => handleUpdate(item.id, category, item.totalPrice)}
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                className="ep-icon-btn"
                                onClick={() => { setEditingId(null); setEditValues({}); }}
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="ep-row">
                            <div className="ep-row__main">
                              <span className="ep-row__name">{item.itemName}</span>
                              <span className="ep-row__meta">
                                {item.quantity} {item.unit} × {format(item.unitPrice)}
                              </span>
                            </div>
                            <div className="ep-row__aside">
                              <span className="ep-row__amount">{format(item.totalPrice)}</span>
                              {canEdit && (
                                <div className="ep-row__actions">
                                  <button
                                    type="button"
                                    className="ep-icon-btn"
                                    onClick={() => {
                                      setEditingId(item.id);
                                      setEditValues({
                                        itemName: item.itemName,
                                        unit: item.unit,
                                        quantity: item.quantity,
                                        unitPrice: item.unitPrice,
                                      });
                                    }}
                                    title="Edit"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    className="ep-icon-btn ep-icon-btn--danger"
                                    onClick={() => handleDelete(item.id, category, item.totalPrice)}
                                    title="Delete"
                                  >
                                    ×
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {canEdit && (
                <footer className="ep-compose">
                  <p className="ep-compose__title">Add item</p>
                  <div className="ep-compose__grid">
                    <label className="ep-field ep-field--wide">
                      <span className="ep-field__label">Item name</span>
                      <ItemNameSuggestInput
                        id={`add-name-${category}`}
                        placeholder="e.g. Rice, Wi-Fi bill"
                        value={form.itemName}
                        suggestions={getCategorySuggestions(category)}
                        disabled={addingCategory === category}
                        onChange={(itemName) => setForm(category, { itemName })}
                        onKeyDown={(e) => handleKeyDown(e, category)}
                      />
                    </label>
                    <label className="ep-field">
                      <span className="ep-field__label">Unit</span>
                      {renderFieldSelect(
                        `add-unit-${category}`,
                        form.unit,
                        (unit) => setForm(category, { unit }),
                      )}
                    </label>
                    <label className="ep-field ep-field--narrow">
                      <span className="ep-field__label">Qty</span>
                      <input
                        type="number"
                        className="ep-field__input ep-field__input--center"
                        placeholder="1"
                        value={form.quantity}
                        min={1}
                        onChange={(e) => setForm(category, { quantity: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, category)}
                      />
                    </label>
                    <label className="ep-field ep-field--narrow">
                      <span className="ep-field__label">Unit price</span>
                      <div className="ep-field__money">
                        <span className="ep-field__currency">{symbol}</span>
                        <input
                          type="number"
                          className="ep-field__money-input"
                          placeholder="0"
                          value={form.unitPrice}
                          min={1}
                          onChange={(e) => setForm(category, { unitPrice: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, category)}
                        />
                      </div>
                    </label>
                    <button
                      type="button"
                      className={`ep-compose__btn${addingCategory === category ? ' ep-compose__btn--busy' : ''}`}
                      onClick={() => void handleAdd(category)}
                      disabled={!canSubmitAddForm(form) || addingCategory === category}
                      title="Add item"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Add</span>
                    </button>
                  </div>
                </footer>
              )}

              <footer className="ep-card__foot">
                <span className="ep-card__foot-label">Total cost</span>
                <span className="ep-card__foot-value">{format(total)}</span>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
