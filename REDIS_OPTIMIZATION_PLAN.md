# Redis Optimization Plan for localhost App

## Executive Summary

This document outlines Redis caching opportunities to improve application performance and scalability without changing business logic or adding complexity. The application is currently live, so all suggestions are backward-compatible and can be implemented incrementally.

---

## Current Architecture Analysis

### Database Access Patterns Identified

| Pattern | Frequency | Impact |
|---------|-----------|--------|
| Apartment config fetch | Every API request | High |
| Member list queries | Every page load | High |
| Meal calculations | Dashboard, Meals page | Medium |
| Bill calculations | Bills page, Dashboard | Medium |
| Session validation | Every authenticated request | Critical |
| Permission checks | Every protected action | Medium |

### Existing Caching

- `react` `cache()` used in `lib/apartment-data.ts` (request-level only, not persistent)
- No cross-request caching
- No Redis integration currently

---

## Redis Caching Opportunities

### 1. Session & Authentication Cache (Critical Priority)

**Current Problem:**
- Every authenticated request queries the database for session validation
- `getMemberSessionFromRequest()` makes DB calls on every request
- `requireAptSession()` validates apartment sessions repeatedly

**Redis Solution:**
```
Key Pattern: session:{tokenJti}
TTL: 24 hours (matches session expiry)
Data: { memberId, apartmentId, isAdmin, isBillManager, expiresAt }
```

**Implementation:**
- Cache session data after first validation
- Invalidate on logout/session revocation
- Reduces DB load by ~90% for authenticated requests

**Files Affected:**
- `lib/auth.ts` (session lookup)
- `lib/api-helpers.ts` (requireAptSession, requireMemberSession)

---

### 2. Apartment Configuration Cache (High Priority)

**Current Problem:**
- `getApartmentConfig()` makes 7 parallel DB queries
- Called on almost every page load (Settings, Config, Bills, Meals)
- Data changes infrequently (only on admin edits)

**Redis Solution:**
```
Key Pattern: apt_config:{apartmentId}
TTL: 5 minutes (short enough for config changes)
Data: Full apartment config object
```

**Implementation:**
- Cache after first fetch
- Invalidate on any config mutation (fixed costs, optional costs, meal settings, etc.)
- Use cache-aside pattern: check Redis → if miss, query DB → store in Redis

**Invalidation Triggers:**
- `POST /api/config/fixed-costs`
- `PUT /api/config/fixed-costs/[id]`
- `POST /api/config/optional-costs`
- `PUT /api/config/optional-costs/[id]`
- `PATCH /api/config/meal-member-slots`
- `PATCH /api/config/meal-settings`
- `PATCH /api/config/rent-split`
- Member add/remove/update

**Files Affected:**
- `lib/apartment-data.ts` (getApartmentConfig)
- All config mutation routes

---

### 3. Member List Cache (High Priority)

**Current Problem:**
- Member list queried on every page that shows avatars/names
- Rarely changes (add/remove member is infrequent)

**Redis Solution:**
```
Key Pattern: members:{apartmentId}
TTL: 10 minutes
Data: Array of member objects (id, name, photoUrl, isActive, isAdmin, isBillManager)
```

**Implementation:**
- Cache active members list
- Invalidate on member create/update/deactivate
- Use for dashboard, meals, bills pages

**Invalidation Triggers:**
- `POST /api/members`
- `PUT /api/members/[id]`
- `PATCH /api/members/[id]` (photo, name changes)

**Files Affected:**
- `lib/apartment-data.ts`
- `app/api/members/route.ts`
- `app/api/app/bootstrap/route.ts`

---

### 4. Meal Summary Cache (Medium Priority)

**Current Problem:**
- `getMealSummary()` makes multiple DB queries + calculations
- Called on meals page load and dashboard
- Data changes multiple times per day (meal check-ins)

**Redis Solution:**
```
Key Pattern: meal_summary:{apartmentId}:{monthKey}
TTL: 2 minutes (frequent updates expected)
Data: Calculated meal summary object
```

**Implementation:**
- Cache after calculation
- Invalidate on:
  - Meal checklist toggle
  - Guest meal update
  - Shopping item add/remove
  - Meal finalization

**Invalidation Triggers:**
- `PATCH /api/meals/[monthKey]/checklist`
- `PATCH /api/meals/[monthKey]/guests`
- `POST /api/meals/[monthKey]/shopping`
- `DELETE /api/meals/[monthKey]/shopping/[id]`
- `POST /api/meals/[monthKey]/finalize`

**Files Affected:**
- `lib/meal-summary.ts`
- `app/api/meals/[monthKey]/route.ts`
- `app/api/meals/[monthKey]/checklist/route.ts`

---

### 5. Meal Checklist Cache (Medium Priority)

**Current Problem:**
- Weekly meal records fetched on every meals page view
- Multiple users viewing same data simultaneously

**Redis Solution:**
```
Key Pattern: meal_checklist:{apartmentId}:{monthKey}:{weekIndex}
TTL: 30 seconds (real-time feel needed)
Data: { records, guestRecords, weekDates, slotOptInMatrix }
```

**Implementation:**
- Short TTL for near-real-time updates
- Invalidate on any meal toggle
- Reduces DB load during peak meal times (lunch/dinner)

**Files Affected:**
- `app/api/meals/[monthKey]/checklist/route.ts`

---

### 6. Bill Calculation Cache (Medium Priority)

**Current Problem:**
- Bill calculation involves multiple queries + complex math
- Data changes when expenses/shopping added

**Redis Solution:**
```
Key Pattern: bill_calc:{apartmentId}:{monthKey}
TTL: 5 minutes
Data: Full bill calculation result
```

**Invalidation Triggers:**
- Expense add/edit/delete
- Shopping add/edit/delete
- Bill lock/unlock
- Fixed/optional cost changes

**Files Affected:**
- `lib/bill-calculation.ts`
- `app/api/bills/[monthKey]/route.ts`

---

### 7. Role Permissions Cache (Low Priority)

**Current Problem:**
- `resolveMemberPermissionKeys()` called on every permission check
- Permissions rarely change

**Redis Solution:**
```
Key Pattern: permissions:{apartmentId}:{memberId}
TTL: 15 minutes
Data: Set of permission keys
```

**Invalidation Triggers:**
- Role permission changes
- Member role assignment

**Files Affected:**
- `lib/role-permissions.ts`

---

### 8. Dashboard Cache (Medium Priority)

**Current Problem:**
- Dashboard fetches both bill calculation and meal summary
- Heavy queries for a frequently visited page

**Redis Solution:**
```
Key Pattern: dashboard:{apartmentId}
TTL: 2 minutes
Data: Combined dashboard response
```

**Implementation:**
- Cache entire dashboard response
- Invalidate when underlying data changes (meals, expenses, bills)

**Files Affected:**
- `app/api/dashboard/current-month/route.ts`

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)

1. **Install Redis client**
   ```bash
   npm install ioredis
   ```

2. **Create Redis utility module** (`lib/redis.ts`)
   - Connection management
   - Helper functions: `getCache()`, `setCache()`, `invalidateCache()`
   - Error handling (graceful degradation if Redis unavailable)

3. **Implement session caching** (highest impact)
   - Modify `lib/auth.ts`
   - Add cache-aside pattern
   - Test logout invalidation

### Phase 2: High-Impact Caches (Week 2)

4. **Apartment config cache**
   - Modify `lib/apartment-data.ts`
   - Add invalidation to all config routes

5. **Member list cache**
   - Modify member fetch functions
   - Add invalidation to member routes

### Phase 3: Feature Caches (Week 3)

6. **Meal caches** (summary + checklist)
7. **Bill calculation cache**
8. **Dashboard cache**

### Phase 4: Fine-Tuning (Week 4)

9. **Permission cache**
10. **Monitor and adjust TTLs based on usage patterns**

---

## Redis Configuration Recommendations

### Connection Settings

```typescript
// lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
  enableReadyCheck: true,
  lazyConnect: true, // Connect on first command
});

// Graceful degradation
redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
  // Application continues without cache
});
```

### Cache Helper Pattern

```typescript
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null; // Graceful degradation
  }
}

export async function setCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    // Silently fail - app continues without cache
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Silently fail
  }
}
```

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Cache Hit Rate** - Target: >80% for config/member caches
2. **Redis Memory Usage** - Monitor growth
3. **Response Time Improvement** - Compare before/after
4. **Database Query Reduction** - Track query counts

### Logging Recommendations

```typescript
// Add to cache helpers
const CACHE_STATS = { hits: 0, misses: 0 };

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (data) {
    CACHE_STATS.hits++;
    return JSON.parse(data);
  }
  CACHE_STATS.misses++;
  return null;
}

// Expose via admin endpoint for monitoring
export function getCacheStats() {
  return {
    ...CACHE_STATS,
    hitRate: CACHE_STATS.hits / (CACHE_STATS.hits + CACHE_STATS.misses) || 0,
  };
}
```

---

## Risk Mitigation

### Graceful Degradation

- All cache operations wrapped in try/catch
- Application functions normally if Redis is unavailable
- No data loss - cache is purely for performance

### Cache Invalidation Safety

- Use event-driven invalidation (triggered by mutations)
- Short TTLs as safety net (max 15 minutes for any cache)
- Manual invalidation endpoint for emergencies

### Data Consistency

- Cache-aside pattern ensures DB is source of truth
- Invalidate before updating DB (not after)
- Consider using Redis transactions for multi-key operations

---

## Expected Performance Improvements

| Metric | Before | After (Estimated) |
|--------|--------|-------------------|
| Avg API Response Time | 200-500ms | 50-150ms |
| DB Queries per Request | 5-15 | 1-3 |
| Dashboard Load Time | 1-2s | 200-400ms |
| Concurrent User Capacity | ~100 | ~500+ |

---

## Migration Path

1. **No downtime required** - Redis is additive
2. **Feature flags** - Enable caching per-endpoint gradually
3. **Rollback plan** - Disable Redis connection to revert
4. **Testing** - Load test before/after each phase

---

## Environment Variables Required

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_ENABLED=true
```

---

## Summary

This optimization plan focuses on:
- **Zero logic changes** - Only adds caching layer
- **Backward compatible** - App works without Redis
- **Incremental rollout** - Implement one cache at a time
- **High impact** - Targets most frequent DB queries
- **Production safe** - Graceful degradation built-in

Total estimated effort: 2-3 weeks for full implementation.
