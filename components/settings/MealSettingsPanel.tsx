'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { useCurrency } from '@/lib/use-currency';
import {
  GUEST_MEAL_MODE_DESCRIPTIONS,
  GUEST_MEAL_MODE_LABELS,
  GUEST_MEAL_MODES,
  type GuestMealMode,
} from '@/lib/constants';

const MEAL_PRESETS = [
  ['Breakfast', 'Lunch', 'Dinner'],
  ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'],
  ['Lunch', 'Dinner'],
];

const WEEK_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

type MealTone = 'amber' | 'accent' | 'violet' | 'rose' | 'sky' | 'teal';

const TONE_CYCLE: MealTone[] = ['amber', 'accent', 'violet', 'rose', 'sky', 'teal'];

function resolveMealTone(name: string, index: number): MealTone {
  const n = name.toLowerCase();
  if (n.includes('breakfast') || n.includes('morning')) return 'amber';
  if (n.includes('lunch')) return 'accent';
  if (n.includes('dinner') || n.includes('supper')) return 'violet';
  if (n.includes('snack') || n.includes('evening') || n.includes('tea')) return 'rose';
  return TONE_CYCLE[index % TONE_CYCLE.length];
}

function IconBreakfast() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 10h12v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8z" />
      <path d="M7 10V6a5 5 0 0 1 10 0v4" />
      <path d="M17 14h3v2a2 2 0 0 1-2 2h-1" />
      <path d="M21 10h-4" />
    </svg>
  );
}

function IconLunch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconDinner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSnack() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3c-1.5 2.5-4 4.5-4 8a4 4 0 0 0 8 0c0-3.5-2.5-5.5-4-8z" />
      <path d="M8 21h8" />
    </svg>
  );
}

function IconMealDefault() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" />
    </svg>
  );
}

function MealIcon({ name, index }: { name: string; index: number }) {
  const n = name.toLowerCase();
  if (n.includes('breakfast') || n.includes('morning')) return <IconBreakfast />;
  if (n.includes('lunch')) return <IconLunch />;
  if (n.includes('dinner') || n.includes('supper')) return <IconDinner />;
  if (n.includes('snack') || n.includes('evening') || n.includes('tea')) return <IconSnack />;
  const icons = [IconBreakfast, IconLunch, IconDinner, IconSnack, IconMealDefault];
  const Icon = icons[index % icons.length];
  return <Icon />;
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconRate() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconGuests() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

type MealConfigState = {
  mealsPerDay: number;
  mealNames: string[];
  weekStartDay: number;
  rateOverride: string;
  guestMealMode: GuestMealMode;
};

export function MealSettingsPanel({
  mealConfig,
  canEdit,
  onSaved,
}: {
  mealConfig?: {
    mealsPerDay: number;
    mealNames: string[];
    weekStartDay: number;
    rateOverride?: number | null;
    guestMealMode?: GuestMealMode;
  };
  canEdit: boolean;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<MealConfigState>({
    mealsPerDay: 2,
    mealNames: ['Lunch', 'Dinner'],
    weekStartDay: 6,
    rateOverride: '',
    guestMealMode: 'EQUAL_SPLIT',
  });

  useEffect(() => {
    if (!mealConfig) return;
    setState({
      mealsPerDay: mealConfig.mealsPerDay,
      mealNames: [...mealConfig.mealNames],
      weekStartDay: mealConfig.weekStartDay,
      rateOverride: mealConfig.rateOverride != null ? String(mealConfig.rateOverride) : '',
      guestMealMode: mealConfig.guestMealMode ?? 'EQUAL_SPLIT',
    });
  }, [mealConfig]);

  const applyPreset = (names: string[]) => {
    if (!canEdit) return;
    setState({
      ...state,
      mealsPerDay: names.length,
      mealNames: [...names],
    });
  };

  const updateName = (index: number, value: string) => {
    const mealNames = [...state.mealNames];
    mealNames[index] = value;
    setState({ ...state, mealNames });
  };

  const addSlot = () => {
    if (!canEdit || state.mealNames.length >= 6) return;
    setState({
      ...state,
      mealsPerDay: state.mealNames.length + 1,
      mealNames: [...state.mealNames, `Meal ${state.mealNames.length + 1}`],
    });
  };

  const removeSlot = (index: number) => {
    if (!canEdit || state.mealNames.length <= 1) return;
    const mealNames = state.mealNames.filter((_, i) => i !== index);
    setState({
      ...state,
      mealsPerDay: mealNames.length,
      mealNames,
    });
  };

  const save = async () => {
    if (!canEdit) return;
    const trimmed = state.mealNames.map((n) => n.trim()).filter(Boolean);
    if (trimmed.length !== state.mealNames.length) {
      toast('Every meal slot needs a name', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/config/meal-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealsPerDay: trimmed.length,
          mealNames: trimmed,
          weekStartDay: state.weekStartDay,
          rateOverride: state.rateOverride.trim() ? Number(state.rateOverride) : null,
          guestMealMode: state.guestMealMode,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || 'Could not save meal settings', 'error');
        return;
      }
      toast('Meal settings saved');
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="meal-settings">
      <header className="meal-settings__head">
        <h3 className="meal-settings__title">Daily meal slots</h3>
        <p className="meal-settings__lead">
          Each card is a meal slot members can opt into. Attendance is tracked separately; cost splits per confirmed meal.
        </p>
      </header>

      {canEdit && (
        <div className="meal-settings__presets">
          {MEAL_PRESETS.map((preset) => (
            <button
              key={preset.join('-')}
              type="button"
              className="meal-settings__preset"
              onClick={() => applyPreset(preset)}
            >
              {preset.join(' · ')}
            </button>
          ))}
        </div>
      )}

      <div className="meal-settings__cards">
        {state.mealNames.map((name, index) => {
          const tone = resolveMealTone(name, index);
          return (
            <article key={index} className={`meal-card meal-card--${tone}`}>
              {canEdit && state.mealNames.length > 1 && (
                <button
                  type="button"
                  className="meal-card__remove"
                  onClick={() => removeSlot(index)}
                  aria-label={`Remove ${name}`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
              <span className="meal-card__badge">Meal {index + 1}</span>
              <div className="meal-card__icon" aria-hidden>
                <MealIcon name={name} index={index} />
              </div>
              <input
                className="meal-card__name"
                value={name}
                disabled={!canEdit}
                placeholder="Meal name"
                aria-label={`Meal slot ${index + 1} name`}
                onChange={(e) => updateName(index, e.target.value)}
              />
            </article>
          );
        })}

        {canEdit && state.mealNames.length < 6 && (
          <button type="button" className="meal-card meal-card--add" onClick={addSlot}>
            <span className="meal-card__add-ring" aria-hidden>+</span>
            <span className="meal-card__add-label">Add slot</span>
          </button>
        )}
      </div>

      <div className="meal-settings__options">
        <div className="meal-option-card">
          <div className="meal-option-card__top">
            <span className="meal-option-card__icon meal-option-card__icon--sky">
              <IconCalendar />
            </span>
            <div>
              <div className="meal-option-card__title">Week starts on</div>
              <div className="meal-option-card__sub">Checklist week alignment</div>
            </div>
          </div>
          <div className="meal-option-card__control meal-option-card__select-wrap">
            <select
              className="meal-option-card__select"
              disabled={!canEdit}
              value={state.weekStartDay}
              onChange={(e) => setState({ ...state, weekStartDay: Number(e.target.value) })}
            >
              {WEEK_DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <svg className="meal-option-card__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="meal-option-card">
          <div className="meal-option-card__top">
            <span className="meal-option-card__icon meal-option-card__icon--violet">
              <IconRate />
            </span>
            <div>
              <div className="meal-option-card__title">
                Fixed rate per meal
                <span className="meal-option-card__tag">optional</span>
              </div>
              <div className="meal-option-card__sub">Override auto calculation</div>
            </div>
          </div>
          <div className="meal-option-card__control meal-option-card__money">
            <span className="meal-option-card__currency">{symbol}</span>
            <input
              id="meal-rate-input"
              className="meal-option-card__money-input"
              type="number"
              min="0"
              step="1"
              disabled={!canEdit}
              placeholder="Auto from expenses"
              value={state.rateOverride}
              onChange={(e) => setState({ ...state, rateOverride: e.target.value })}
            />
            <span className="meal-option-card__unit">/ meal</span>
          </div>
          <p className="meal-option-card__hint">
            Empty = Food expenses + shopping ÷ confirmed meals
          </p>
        </div>

        <div className="meal-option-card meal-option-card--wide">
          <div className="meal-option-card__top">
            <span className="meal-option-card__icon meal-option-card__icon--teal">
              <IconGuests />
            </span>
            <div>
              <div className="meal-option-card__title">Guest meal calculation</div>
              <div className="meal-option-card__sub">How guest meal costs are shared</div>
            </div>
          </div>
          <div className="guest-mode-options">
            {GUEST_MEAL_MODES.map((mode) => (
              <label
                key={mode}
                className={`guest-mode-option${state.guestMealMode === mode ? ' guest-mode-option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="guestMealMode"
                  value={mode}
                  disabled={!canEdit}
                  checked={state.guestMealMode === mode}
                  onChange={() => setState({ ...state, guestMealMode: mode })}
                />
                <span className="guest-mode-option__body">
                  <span className="guest-mode-option__title">{GUEST_MEAL_MODE_LABELS[mode]}</span>
                  <span className="guest-mode-option__desc">{GUEST_MEAL_MODE_DESCRIPTIONS[mode]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="meal-settings__actions">
          <button className="btn btn-primary btn-sm" type="button" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save meal settings'}
          </button>
        </div>
      )}
    </div>
  );
}
