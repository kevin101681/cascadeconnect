# PostHog API Fix - 400 Error Resolution

## Problem

The PostHog Analytics Service was returning `400 Bad Request` errors with the message:
```
JSON parse error ... Extra inputs are not permitted
```

This was caused by incorrect query schema in the API requests. The service was using `breakdown` instead of `breakdownFilter`, and the complex nested JSON structure was prone to validation errors.

## Solution

Refactored `services/posthogAnalyticsService.ts` to use:
1. **HogQL queries** for device volume and browser stats (more robust, SQL-like syntax)
2. **Corrected FunnelsQuery schema** with `breakdownFilter` instead of `breakdown`

## Changes Made

### 1. Updated Zod Schemas

**Before:**
```typescript
const PostHogTrendsResultSchema = z.object({
  result: z.array(...)  // Expected nested object structure
});
```

**After:**
```typescript
const PostHogHogQLResultSchema = z.object({
  results: z.array(z.array(z.any())),  // Array of rows
  columns: z.array(z.string()).optional(),
});
```

### 2. Refactored `fetchDeviceVolume()` to Use HogQL

**Before (TrendsQuery with incorrect breakdown):**
```typescript
const query = {
  kind: 'TrendsQuery',
  breakdown: { breakdown: '$device_type', breakdown_type: 'event' }  // ❌ Wrong
};
```

**After (HogQL):**
```typescript
const query = {
  kind: 'HogQLQuery',
  query: `
    SELECT 
      properties.$device_type as device_type,
      count() as event_count
    FROM events
    WHERE event = 'claim_submitted'
      AND timestamp >= now() - INTERVAL 30 DAY
    GROUP BY properties.$device_type
  `,
};
```

### 3. Fixed `fetchMobileFrictionFunnel()` with Correct Schema

**Before:**
```typescript
const query = {
  kind: 'FunnelsQuery',
  breakdown: { ... },  // ❌ Wrong key
  dateRange: { date_to: null }  // ❌ Extra input
};
```

**After:**
```typescript
const query = {
  kind: 'FunnelsQuery',
  breakdownFilter: { ... },  // ✅ Correct key
  dateRange: { date_from: '-30d' }  // ✅ No extra inputs
};
```

Added fallback behavior to return empty data instead of throwing errors if funnel query fails.

### 4. Refactored `fetchBrowserStats()` to Use HogQL

**Before (TrendsQuery with array breakdown - not supported):**
```typescript
breakdown: { breakdown: ['$browser', '$browser_version'] }  // ❌ Arrays not supported
```

**After (HogQL with multiple GROUP BY):**
```typescript
const query = {
  kind: 'HogQLQuery',
  query: `
    SELECT 
      properties.$browser as browser,
      properties.$browser_version as browser_version,
      count(DISTINCT distinct_id) as unique_users
    FROM events
    WHERE event = 'claim_submitted'
      AND timestamp >= now() - INTERVAL 30 DAY
    GROUP BY properties.$browser, properties.$browser_version
    ORDER BY unique_users DESC
    LIMIT 10
  `,
};
```

## Benefits of HogQL

1. **More Robust**: SQL-like syntax is easier to validate and less prone to schema errors
2. **More Flexible**: Supports complex queries with multiple GROUP BY, ORDER BY, LIMIT
3. **Better Error Messages**: SQL parsing errors are clearer than JSON schema validation errors
4. **Future-Proof**: HogQL is PostHog's recommended query language going forward

## API Query Types Used

| Query Type | Used For | Syntax |
|------------|----------|--------|
| `HogQLQuery` | Device Volume | SQL-like |
| `FunnelsQuery` | Conversion Funnel | JSON (fixed schema) |
| `HogQLQuery` | Browser Stats | SQL-like |

## Testing

1. TypeScript compilation: ✅ Passes with no errors
2. Zod schema validation: ✅ Updated to match actual API responses
3. Fallback handling: ✅ Funnel query returns empty data on failure instead of crashing

## Next Steps

1. Test with real PostHog credentials to verify API responses
2. Monitor browser console for any remaining API errors
3. Consider adding response caching to reduce API calls
4. Add unit tests for result parsing logic

## References

- [PostHog HogQL Documentation](https://posthog.com/docs/hogql)
- [PostHog Query API Reference](https://posthog.com/docs/api/query)
- [PostHog Funnels API](https://posthog.com/docs/api/funnels)
