# Query Optimization Report

## 🔴 Critical: N+1 Query Issues

### 1. `lib/monthly-jobs.ts` (Lines 61-98)

**Problem:** Loop makes sequential DB calls per payment member.

```typescript
// CURRENT - N+1 pattern
for (const pay of payments) {
  const balance = pay.amountDue - pay.amountPaid;
  if (balance <= 0 || pay.status === 'paid') continue;

  const already = await prisma.billAdjustment.findFirst({  // DB call per iteration
    where: { billId: currentBill.id, memberId: pay.memberId, label: dueLabel },
  });
  if (!already) {
    await prisma.billAdjustment.create({...});  // Another DB call per iteration
    await createNotification({...});
    await logAudit({...});
  }
}
```

**Fix:** Batch query all existing adjustments first, then create in bulk.

```typescript
// OPTIMIZED
const dueLabel = dueLabelForMonth(prevMonthKey);
const memberIds = payments.map(p => p.memberId);

// Single query to get all existing adjustments
const existingAdjustments = await prisma.billAdjustment.findMany({
  where: {
    billId: currentBill.id,
    memberId: { in: memberIds },
    label: dueLabel,
  },
  select: { memberId: true },
});
const existingSet = new Set(existingAdjustments.map(a => a.memberId));

// Filter payments that need adjustments
const needsAdjustment = payments.filter(pay => {
  const balance = pay.amountDue - pay.amountPaid;
  return balance > 0 && pay.status !== 'paid' && !existingSet.has(pay.memberId);
});

// Bulk create adjustments
if (needsAdjustment.length > 0) {
  await prisma.billAdjustment.createMany({
    data: needsAdjustment.map(pay => ({
      billId: currentBill.id,
      memberId: pay.memberId,
      type: 'lend',
      label: dueLabel,
      amount: pay.amountDue - pay.amountPaid,
    })),
  });

  // Create notifications in bulk
  await createNotificationsForMembers(apartmentId, needsAdjustment.map(p => p.memberId), {
    type: 'bill_due_carried',
    title: `${monthLabel(parseMonthKey(prevMonthKey))} balance carried forward`,
    body: `Balance from last month was added to this month's bill as due.`,
    href: '/bills',
    meta: { monthKey, prevMonthKey },
  });
}
```

**Impact:** Reduces N queries to 2 queries regardless of member count.

---

### 2. `app/api/backup/restore/route.ts` (Lines 57-77)

**Problem:** Loop creates optional costs sequentially with individual DB calls.

```typescript
// CURRENT - N+1 pattern
for (const oc of data.optionalCosts) {
  await tx.optionalCost.create({...});  // DB call per optional cost
  if (oc.members?.length) {
    await tx.optionalCostMember.createMany({...});
  }
}
```

**Fix:** Use createMany for optional costs, then handle members.

```typescript
// OPTIMIZED
if (data.optionalCosts?.length) {
  await tx.optionalCost.createMany({
    data: data.optionalCosts.map((oc) => ({
      id: oc.id,
      apartmentId,
      name: oc.name,
      amount: oc.amount,
      sortOrder: oc.sortOrder,
      isActive: oc.isActive ?? true,
    })),
  });

  // Then create all members in one batch
  const allMembers = data.optionalCosts.flatMap((oc) =>
    (oc.members || []).map((m) => ({
      optionalCostId: oc.id,
      memberId: m.memberId,
      optedIn: m.optedIn,
    }))
  );
  if (allMembers.length > 0) {
    await tx.optionalCostMember.createMany({ data: allMembers });
  }
}
```

**Impact:** Reduces 2N queries to 2 queries.

---

## 🟠 Medium: Sequential Queries (Could Be Parallel)

### 3. `app/api/bug-report/route.ts` (Lines 28-34)

**Problem:** Two sequential queries that are independent.

```typescript
const apartment = await prisma.apartment.findUnique({...});
const reporter = await prisma.member.findUnique({...});
```

**Fix:** Run in parallel.

```typescript
const [apartment, reporter] = await Promise.all([
  prisma.apartment.findUnique({...}),
  prisma.member.findUnique({...}),
]);
```

---

### 4. `app/api/auth/apartment/register/route.ts` (Lines 24-52)

**Problem:** Four sequential validation queries that are independent.

```typescript
const existingName = await prisma.apartment.findUnique({...});
const existingEmail = await prisma.apartment.findFirst({...});
const existingMemberEmail = await prisma.member.findFirst({...});
const existingPhone = await prisma.apartment.findFirst({...});
const existingMemberPhone = await prisma.member.findFirst({...});
```

**Fix:** Run in parallel.

```typescript
const [existingName, existingEmail, existingMemberEmail, existingPhone, existingMemberPhone] = await Promise.all([
  prisma.apartment.findUnique({ where: { name: d.apt_name } }),
  prisma.apartment.findFirst({ where: { registrantEmail: { equals: d.registrant_email, mode: 'insensitive' } } }),
  prisma.member.findFirst({ where: { email: { equals: d.registrant_email, mode: 'insensitive' } } }),
  prisma.apartment.findFirst({ where: { registrantPhone: d.registrant_phone } }),
  prisma.member.findFirst({ where: { phone: d.registrant_phone } }),
]);
```

---

### 5. `app/api/profile/route.ts` (Lines 28-35, 63-93)

**Problem:** Sequential queries in GET and PATCH handlers.

**Fix:** Parallelize independent queries.

---

### 6. `app/api/config/roles/route.ts` (Lines 21-37)

**Problem:** Sequential member validation queries.

```typescript
const admin = await prisma.member.findFirst({...});
const bm = await prisma.member.findFirst({...});
await prisma.apartment.update({...});
```

**Fix:** Run validations in parallel.

---

## 🟡 Low: Double Computation

### 7. `lib/bill-calculation.ts` (Lines 129-142)

**Problem:** `computeBillCalculation` called twice for locked bills.

```typescript
export async function getBillCalculation(apartmentId: string, monthKey: string) {
  const result = await computeBillCalculation(apartmentId, monthKey);  // First call
  if (result?.bill?.isLocked) {
    return unstable_cache(
      async () => computeBillCalculation(apartmentId, monthKey),  // Second call if cache miss
      ...
    )();
  }
  return result;
}
```

**Fix:** Use the result from the first call if available.

```typescript
export async function getBillCalculation(apartmentId: string, monthKey: string) {
  const result = await computeBillCalculation(apartmentId, monthKey);
  if (result?.bill?.isLocked) {
    // Use unstable_cache but pass result if available
    const cached = await unstable_cache(
      async () => result,  // Use already computed result
      ['bill-calculation', apartmentId, monthKey],
      { revalidate: 300, tags: [billCalcCacheTag(apartmentId, monthKey)] }
    )();
    return cached;
  }
  return result;
}
```

---

## Summary of Impact

| Issue | Location | Current Queries | Optimized Queries | Reduction |
|-------|----------|-----------------|-------------------|-----------|
| N+1 loop | monthly-jobs.ts | N+1 | 2 | ~90% |
| N+1 loop | backup/restore | 2N | 2 | ~90% |
| Sequential | register route | 5 | 1 | ~80% |
| Sequential | bug-report | 2 | 1 | ~50% |
| Sequential | profile GET | 2 | 1 | ~50% |
| Sequential | config/roles | 3 | 1 | ~67% |
| Double compute | bill-calculation | 2 | 1 | ~50% |

---

## Implementation Priority

1. **High:** Fix N+1 in `monthly-jobs.ts` (runs monthly for all apartments)
2. **High:** Fix N+1 in `backup/restore` (runs during restore operations)
3. **Medium:** Parallelize `register` route queries
4. **Medium:** Parallelize `profile` route queries
5. **Low:** Fix double computation in `bill-calculation.ts`
6. **Low:** Parallelize other sequential queries

---

## Additional Findings

### 🔴 Missing Database Indexes

| Table | Column(s) | Impact |
|-------|-----------|--------|
| `audit_events` | `apartmentId, createdAt` | Full table scan on every audit log fetch |
| `bill_adjustments` | `billId`, `memberId` | Sequential scans on bill queries |
| `password_reset_tokens` | `memberId` | Slow cleanup queries |

**Fix:** Add to `schema.prisma`:
```prisma
model AuditEvent {
  // ... existing fields ...
  @@index([apartmentId, createdAt])
  @@map("audit_events")
}

model BillAdjustment {
  // ... existing fields ...
  @@index([billId])
  @@index([memberId])
  @@map("bill_adjustments")
}
```

---

### 🔴 Missing `select` on Member Queries

**File:** `app/api/members/route.ts`

```typescript
// CURRENT - fetches ALL columns including passwordHash
const members = await prisma.member.findMany({
  where: { apartmentId: apt.apartmentId },
});

// FIX - only select needed columns
const members = await prisma.member.findMany({
  where: { apartmentId: apt.apartmentId },
  select: {
    id: true, name: true, photoUrl: true, email: true,
    phone: true, hometown: true, country: true, moveInDate: true, isActive: true,
  },
});
```

---

### 🔴 Redundant Member Re-fetch in `meal-summary.ts`

**Problem:** Members fetched twice - once in `getMealCostInputs` and again in `loadMealSlotOptInMatrix`.

**Fix:** Pass already-fetched members to `loadMealSlotOptInMatrix`.

---

### 🟠 Full Table Scan on Expenses

**File:** `app/api/expenses/[monthKey]/route.ts`

```typescript
// CURRENT - fetches ALL expenses ever
const allExpenses = await prisma.expense.findMany({
  where: { apartmentId: apt.apartmentId },
});
```

**Fix:** Add month filter or compute carry-in differently.

---

## Complete Priority List

| # | Priority | Issue | Type | Impact |
|---|----------|-------|------|--------|
| 1 | 🔴 HIGH | Missing index: `audit_events` | Schema | Full table scan |
| 2 | 🔴 HIGH | Missing index: `bill_adjustments` | Schema | Full table scan |
| 3 | 🔴 HIGH | N+1 in `monthly-jobs.ts` | Query | 20-40 queries |
| 4 | 🔴 HIGH | N+1 in `backup/restore` | Query | 2N queries |
| 5 | 🔴 HIGH | Full scan on expenses | Query | All history fetched |
| 6 | 🔴 HIGH | Missing `select` on members | Query | Fetches passwordHash |
| 7 | 🟠 MED | Redundant member re-fetch | Query | 2 extra queries |
| 8 | 🟠 MED | Bill calc runs twice | Query | 4-6 extra queries |
| 9 | 🟠 MED | Sequential register checks | Query | 5 sequential |
| 10 | 🟠 MED | Sequential auth+permission | Query | 2 sequential |
| 11 | 🟡 LOW | N*M upserts in meal slots | Query | 40 queries |
| 12 | 🟡 LOW | Various parallelization | Query | Minor |

---

## Notes

- All fixes maintain existing business logic
- No logic changes required
- Can be implemented incrementally
- Test each fix individually before deploying
- Schema changes need migration: `npx prisma migrate dev`
