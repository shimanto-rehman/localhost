'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/providers/ToastProvider';
import { useCurrency } from '@/lib/use-currency';
import type { OptInMatrix } from '@/lib/calculations/bills';

type Member = { id: string; name: string; photoUrl?: string | null };
type OptionalCost = { id: string; name: string; amount: number };

export function MemberOptionalCostsPanel({
  members,
  optionalCosts,
  optInMatrix,
  isAdmin,
  onRefresh,
}: {
  members: Member[];
  optionalCosts: OptionalCost[];
  optInMatrix: OptInMatrix;
  isAdmin: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [pending, setPending] = useState<string | null>(null);

  if (optionalCosts.length === 0) {
    return (
      <div className="member-opt-in__empty">
        Add variable costs above to assign optional charges per member.
      </div>
    );
  }

  const toggle = async (optionalCostId: string, memberId: string, optedIn: boolean) => {
    if (!isAdmin) return;
    const key = `${optionalCostId}-${memberId}`;
    setPending(key);
    try {
      const res = await fetch(`/api/config/optional-costs/${optionalCostId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matrix: { [memberId]: optedIn } }),
      });
      if (!res.ok) {
        toast('Could not update participation', 'error');
        return;
      }
      await onRefresh();
    } catch {
      toast('Could not update participation', 'error');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="member-opt-in">
      <header className="member-opt-in__head">
        <h3 className="member-opt-in__title">Member optional costs</h3>
        <p className="member-opt-in__lead">
          Uncheck a cost if a member does not use it — the amount is split only among members who are checked in.
        </p>
      </header>

      <div className="member-opt-in__grid">
        {members.map((m, i) => (
          <article key={m.id} className="member-opt-in__card">
            <div className="member-opt-in__card-head">
              <Avatar name={m.name} photoUrl={m.photoUrl} index={i} />
              <div>
                <div className="member-opt-in__name">{m.name}</div>
                <div className="member-opt-in__sub">
                  {optionalCosts.filter((oc) => optInMatrix[oc.id]?.[m.id] !== false).length} of {optionalCosts.length} costs
                </div>
              </div>
            </div>

            <ul className="member-opt-in__list">
              {optionalCosts.map((oc) => {
                const optedIn = optInMatrix[oc.id]?.[m.id] !== false;
                const key = `${oc.id}-${m.id}`;
                return (
                  <li key={oc.id} className={`member-opt-in__item${optedIn ? ' member-opt-in__item--on' : ''}`}>
                    <label className="member-opt-in__check">
                      <input
                        type="checkbox"
                        checked={optedIn}
                        disabled={!isAdmin || pending === key}
                        onChange={(e) => toggle(oc.id, m.id, e.target.checked)}
                      />
                      <span className="member-opt-in__check-ui" aria-hidden />
                      <span className="member-opt-in__cost-name">{oc.name}</span>
                      <span className="member-opt-in__cost-amt">{symbol}{oc.amount}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
