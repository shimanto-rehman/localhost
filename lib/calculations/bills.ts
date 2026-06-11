import { ceilPerHead } from '../utils';

export interface BillMember {
  id: string;
  name: string;
  photoUrl?: string | null;
  isActive?: boolean;
}

export interface FixedCostItem {
  id: string;
  name: string;
  amount: number;
  inFixedBucket: boolean;
}

export interface OptionalCostItem {
  id: string;
  name: string;
  amount: number;
}

export interface RentSplitItem {
  memberId: string;
  fixedAmount: number | null;
}

export interface OptInMatrix {
  [optionalCostId: string]: { [memberId: string]: boolean };
}

export interface Adjustment {
  id: string;
  memberId: string;
  type: 'lend' | 'borrow';
  label: string;
  amount: number;
}

export interface BillBreakdown {
  fixedBucket: number;
  optional: Record<string, number>;
  electricity: number;
  variable: Record<string, number>;
  meals: number;
}

export interface MemberBillResult {
  id: string;
  name: string;
  photoUrl?: string | null;
  breakdown: BillBreakdown;
  baseTotal: number;
  adjDelta: number;
  total: number;
  adjustments: Adjustment[];
}

export interface BillCalculation {
  results: MemberBillResult[];
  collectedTotal: number;
  actualBill: number;
  houseRentTotal: number;
  gap: number;
  electricity: number | null;
  fixedBucket: number;
  optionalTotal: number;
  mealTotal: number;
  elecPH: number;
}

export function calcAdjustmentDelta(adjustments: Adjustment[]): number {
  return adjustments.reduce((sum, a) => sum + (a.type === 'lend' ? a.amount : -a.amount), 0);
}

export function calculateBill(params: {
  members: BillMember[];
  fixedCosts: FixedCostItem[];
  optionalCosts: OptionalCostItem[];
  optInMatrix: OptInMatrix;
  rentSplits: RentSplitItem[];
  electricity: number | null;
  variableCosts?: { name: string; amount: number }[];
  mealCosts?: Record<string, number>;
  adjustments?: Record<string, Adjustment[]>;
  useSnapshot?: {
    fixedCosts?: FixedCostItem[];
    optionalCosts?: OptionalCostItem[];
    optInMatrix?: OptInMatrix;
    rentSplits?: RentSplitItem[];
    members?: BillMember[];
  };
}): BillCalculation | null {
  const {
    electricity,
    variableCosts = [],
    mealCosts = {},
    adjustments = {},
    useSnapshot,
  } = params;

  const members = (useSnapshot?.members || params.members).filter((m) => m.isActive !== false);
  const fixedCosts = useSnapshot?.fixedCosts || params.fixedCosts;
  const optionalCosts = useSnapshot?.optionalCosts || params.optionalCosts;
  const optInMatrix = useSnapshot?.optInMatrix || params.optInMatrix;
  const rentSplits = useSnapshot?.rentSplits || params.rentSplits;

  const n = members.length;
  if (n === 0 || electricity === null) return null;

  const fixedBucket = fixedCosts
    .filter((c) => c.inFixedBucket)
    .reduce((s, c) => s + c.amount, 0);

  const outOfBucketFixed = fixedCosts.filter((c) => !c.inFixedBucket);

  let fixedContributions = 0;
  const freeMembers: string[] = [];
  const rentSplitMap: Record<string, number> = {};

  members.forEach((m) => {
    const split = rentSplits.find((r) => r.memberId === m.id);
    if (split?.fixedAmount != null) {
      fixedContributions += split.fixedAmount;
      rentSplitMap[m.id] = split.fixedAmount;
    } else {
      freeMembers.push(m.id);
    }
  });

  const remaining = Math.max(0, fixedBucket - fixedContributions);
  const freeShare = freeMembers.length > 0 ? Math.round(remaining / freeMembers.length) : 0;

  const optionalPerHead: Record<string, Record<string, number>> = {};
  optionalCosts.forEach((oc) => {
    const optedIn = members.filter((m) => optInMatrix[oc.id]?.[m.id] !== false);
    const perHead = ceilPerHead(oc.amount, optedIn.length);
    optionalPerHead[oc.id] = {};
    optedIn.forEach((m) => { optionalPerHead[oc.id][m.id] = perHead; });
  });

  const elecPH = ceilPerHead(electricity, n);
  const variablePH: Record<string, number> = {};
  variableCosts.forEach((vc) => {
    variablePH[vc.name] = ceilPerHead(vc.amount, n);
  });

  const outOfBucketPH: Record<string, number> = {};
  outOfBucketFixed.forEach((fc) => {
    outOfBucketPH[fc.id] = ceilPerHead(fc.amount, n);
  });

  const results: MemberBillResult[] = members.map((m) => {
    const fixedBucketShare = rentSplitMap[m.id] ?? freeShare;
    const optional: Record<string, number> = {};
    let optionalSum = 0;
    optionalCosts.forEach((oc) => {
      const amt = optionalPerHead[oc.id]?.[m.id] || 0;
      optional[oc.id] = amt;
      optionalSum += amt;
    });

    const variable: Record<string, number> = {};
    let variableSum = 0;
    variableCosts.forEach((vc) => {
      variable[vc.name] = variablePH[vc.name] || 0;
      variableSum += variablePH[vc.name] || 0;
    });

    let outOfBucketSum = 0;
    outOfBucketFixed.forEach((fc) => {
      outOfBucketSum += outOfBucketPH[fc.id] || 0;
    });

    const meals = mealCosts[m.id] || 0;
    const baseTotal = fixedBucketShare + optionalSum + elecPH + variableSum + outOfBucketSum + meals;
    const memberAdj = adjustments[m.id] || [];
    const adjDelta = calcAdjustmentDelta(memberAdj);
    const total = Math.max(0, baseTotal + adjDelta);

    return {
      id: m.id,
      name: m.name,
      photoUrl: m.photoUrl,
      breakdown: {
        fixedBucket: fixedBucketShare,
        optional,
        electricity: elecPH,
        variable,
        meals,
      },
      baseTotal,
      adjDelta,
      total,
      adjustments: memberAdj,
    };
  });

  const collectedTotal = results.reduce((s, r) => s + r.total, 0);
  const optionalTotal = optionalCosts.reduce((s, c) => s + c.amount, 0);
  const variableTotal = variableCosts.reduce((s, c) => s + c.amount, 0);
  const outOfBucketTotal = outOfBucketFixed.reduce((s, c) => s + c.amount, 0);
  const mealTotal = Object.values(mealCosts).reduce((s, v) => s + v, 0);
  const actualBill = fixedBucket + optionalTotal + electricity + variableTotal + outOfBucketTotal + mealTotal;
  const houseRentTotal = fixedBucket + electricity;

  return {
    results,
    collectedTotal,
    actualBill,
    houseRentTotal,
    gap: collectedTotal - actualBill,
    electricity,
    fixedBucket,
    optionalTotal,
    mealTotal,
    elecPH,
  };
}
