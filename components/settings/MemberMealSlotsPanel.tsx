'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/providers/ToastProvider';
import type { MealSlotOptInMatrix } from '@/lib/calculations/meals';

type Member = { id: string; name: string; photoUrl?: string | null };

export function MemberMealSlotsPanel({
  members,
  mealNames,
  slotOptInMatrix,
  canEdit,
  onRefresh,
}: {
  members: Member[];
  mealNames: string[];
  slotOptInMatrix: MealSlotOptInMatrix;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  if (mealNames.length === 0) {
    return (
      <div className="member-opt-in__empty">
        Configure meal slots above first.
      </div>
    );
  }

  const toggle = async (memberId: string, slot: number, optedIn: boolean) => {
    if (!canEdit) return;
    const key = `${memberId}-${slot}`;
    setPending(key);
    try {
      const res = await fetch('/api/config/meal-member-slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          slots: { [String(slot)]: optedIn },
        }),
      });
      if (!res.ok) {
        toast('Could not update meal plan', 'error');
        return;
      }
      await onRefresh();
    } catch {
      toast('Could not update meal plan', 'error');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="member-opt-in member-meal-slots">
      <header className="member-opt-in__head">
        <h3 className="member-opt-in__title">Member meal plans</h3>
        <p className="member-opt-in__lead">
          Check the meals each member takes. Unchecked slots are hidden from their checklist and excluded from their bill.
        </p>
      </header>

      <div className="member-opt-in__grid">
        {members.map((m, i) => {
          const enrolled = mealNames.filter((_, slot) => slotOptInMatrix[m.id]?.[slot] !== false).length;
          return (
            <article key={m.id} className="member-opt-in__card">
              <div className="member-opt-in__card-head">
                <Avatar name={m.name} photoUrl={m.photoUrl} index={i} />
                <div>
                  <div className="member-opt-in__name">{m.name}</div>
                  <div className="member-opt-in__sub">
                    {enrolled} of {mealNames.length} meals
                  </div>
                </div>
              </div>

              <ul className="member-opt-in__list">
                {mealNames.map((name, slot) => {
                  const optedIn = slotOptInMatrix[m.id]?.[slot] !== false;
                  const key = `${m.id}-${slot}`;
                  return (
                    <li key={slot} className={`member-opt-in__item${optedIn ? ' member-opt-in__item--on' : ''}`}>
                      <label className="member-opt-in__check">
                        <input
                          type="checkbox"
                          checked={optedIn}
                          disabled={!canEdit || pending === key}
                          onChange={(e) => toggle(m.id, slot, e.target.checked)}
                        />
                        <span className="member-opt-in__check-ui" aria-hidden />
                        <span className="member-opt-in__cost-name">{name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
