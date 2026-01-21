# Service Layer Integration Guide

## Overview
This document describes how to use the enhanced service layer with error tracking, rate limiting, and caching.

## Table of Contents
1. [Error Tracking](#error-tracking)
2. [Rate Limiting](#rate-limiting)
3. [Caching](#caching)
4. [Service Integration](#service-integration)
5. [Testing](#testing)

---

## Error Tracking

### Setup

Initialize Sentry in your app entry point (`App.tsx` or `_app.tsx`):

```typescript
import { initializeSentry, setUserContext } from '@/lib/services/errorTrackingService';

// Initialize on app startup
initializeSentry();

// Set user context after authentication
setUserContext(user.id, {
  email: user.email,
  name: user.name,
});
```

### Usage

#### Basic Error Logging

```typescript
import { logError, logWarning, logInfo } from '@/lib/services/errorTrackingService';

// Log an error
try {
  await someOperation();
} catch (error) {
  logError(error, {
    userId: user.id,
    operation: 'someOperation',
  });
}

// Log a warning (non-blocking issues)
logWarning('API rate limit approaching', {
  endpoint: '/api/claims',
  remaining: 5,
});

// Log info (important events)
logInfo('User completed onboarding', {
  userId: user.id,
});
```

#### Breadcrumbs

Track user actions for debugging:

```typescript
import { addBreadcrumb } from '@/lib/services/errorTrackingService';

// Track navigation
addBreadcrumb('Navigation', { page: '/claims' });

// Track user actions
addBreadcrumb('Form submission', { form: 'newClaim' });

// Track API calls
addBreadcrumb('API call', { endpoint: '/api/homeowners', method: 'GET' });
```

#### Capture & Wrap

Wrap operations for automatic error capture:

```typescript
import { captureException, captureAndIgnore } from '@/lib/services/errorTrackingService';

// Capture and rethrow
const result = await captureException(
  () => uploadFile(file),
  { component: 'UploadForm', userId: user.id }
);

// Capture and ignore (with fallback)
const data = await captureAndIgnore(
  () => fetchOptionalData(),
  { operation: 'fetchOptionalData' },
  [] // fallback value
);
```

---

## Rate Limiting

### Basic Usage

```typescript
import { checkRateLimit, RateLimitPresets } from '@/lib/services/rateLimitService';

// Check rate limit
const result = checkRateLimit(userId, RateLimitPresets.STANDARD);

if (!result.allowed) {
  throw new Error(`Rate limit exceeded. Try again in ${result.retryAfter}s`);
}

// Proceed with operation
await performOperation();
```

### Custom Configuration

```typescript
import { checkRateLimit } from '@/lib/services/rateLimitService';

const result = checkRateLimit(userId, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  keyPrefix: 'custom-operation',
  message: 'Custom rate limit message',
});
```

### Rate Limit Decorator

```typescript
import { withRateLimit } from '@/lib/services/rateLimitService';

// Wrap function with rate limiting
const rateLimitedUpload = withRateLimit(
  uploadFile,
  (file) => `upload:${file.name}`,
  { windowMs: 60000, maxRequests: 10 }
);

// Use the rate-limited function
await rateLimitedUpload(file);
```

### Middleware (API Routes/Netlify Functions)

```typescript
import { createRateLimitMiddleware, RateLimitPresets } from '@/lib/services/rateLimitService';

export const handler = createRateLimitMiddleware(
  RateLimitPresets.API_CALL,
  async (event) => {
    // Your handler logic
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  }
);
```

### Available Presets

- `STRICT`: 5 requests/minute (password reset, sensitive operations)
- `STANDARD`: 30 requests/minute (general API endpoints)
- `RELAXED`: 100 requests/minute (read-only operations)
- `FILE_UPLOAD`: 10 uploads/hour
- `EMAIL_SEND`: 20 emails/hour
- `SMS_SEND`: 10 messages/hour
- `API_CALL`: 1000 requests/hour

---

## Caching

### Basic Usage

```typescript
import { get, set, CacheTTL } from '@/lib/services/cacheService';

// Set cache
set('homeowner:123', homeownerData, { ttl: CacheTTL.MEDIUM });

// Get from cache
const cached = get<Homeowner>('homeowner:123');
if (cached) {
  return cached; // Cache hit
}

// Fetch and cache
const homeowner = await fetchHomeowner(id);
set(`homeowner:${id}`, homeowner, { ttl: CacheTTL.MEDIUM });
```

### Memoization

Automatically cache function results:

```typescript
import { memoize, CacheTTL, CacheNamespace } from '@/lib/services/cacheService';

// Memoize a function
const cachedFetchHomeowner = memoize(
  fetchHomeowner,
  (id) => `homeowner:${id}`,
  { 
    ttl: CacheTTL.MEDIUM,
    namespace: CacheNamespace.HOMEOWNERS,
  }
);

// First call fetches from DB
const homeowner1 = await cachedFetchHomeowner('123'); // Cache MISS

// Second call returns from cache
const homeowner2 = await cachedFetchHomeowner('123'); // Cache HIT
```

### Cache Wrapper

```typescript
import { cached, CacheTTL } from '@/lib/services/cacheService';

const homeowner = await cached(
  `homeowner:${id}`,
  async () => {
    return db.select()
      .from(homeowners)
      .where(eq(homeowners.id, id))
      .limit(1)
      .then(rows => rows[0]);
  },
  { ttl: CacheTTL.MEDIUM }
);
```

### Cache Invalidation

```typescript
import { invalidatePattern, invalidateKeys, clear } from '@/lib/services/cacheService';

// Invalidate by pattern
invalidatePattern('homeowner:', { namespace: CacheNamespace.HOMEOWNERS });

// Invalidate specific keys
invalidateKeys(['homeowner:123', 'homeowner:456']);

// Clear entire namespace
clear(CacheNamespace.HOMEOWNERS);
```

### Cache Warming

Pre-load frequently accessed data:

```typescript
import { warmCache, CacheTTL } from '@/lib/services/cacheService';

await warmCache(
  'homeowners',
  async () => {
    const homeowners = await fetchAllHomeowners();
    return homeowners.map(h => [`homeowner:${h.id}`, h]);
  },
  { ttl: CacheTTL.LONG }
);
```

### TTL Presets

- `VERY_SHORT`: 30 seconds
- `SHORT`: 5 minutes (default)
- `MEDIUM`: 15 minutes
- `LONG`: 1 hour
- `VERY_LONG`: 24 hours

### Namespaces

- `HOMEOWNERS`: Homeowner data
- `CLAIMS`: Claim data
- `CONTRACTORS`: Contractor data
- `MESSAGES`: Message data
- `CALLS`: Call data
- `API_RESPONSES`: External API responses
- `USER_DATA`: User authentication data

---

## Service Integration

### Example: Upload Service with All Features

```typescript
import { uploadFile } from '@/lib/services/uploadService';
import { logError, addBreadcrumb } from '@/lib/services/errorTrackingService';
import { checkRateLimit, RateLimitPresets } from '@/lib/services/rateLimitService';

async function handleFileUpload(file: File, userId: string) {
  // Add breadcrumb
  addBreadcrumb('File upload started', {
    fileName: file.name,
    fileSize: file.size,
    userId,
  });

  // Check rate limit (already built into uploadFile)
  // But you can add custom checks if needed
  
  try {
    // Upload with automatic error tracking and rate limiting
    const result = await uploadFile(file);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.attachment;
  } catch (error) {
    // Error is already logged by uploadFile
    // But you can add component-specific context
    logError(error, {
      component: 'FileUploadForm',
      userId,
      fileName: file.name,
    });
    
    throw error;
  }
}
```

### Example: Cached API Call with Rate Limiting

```typescript
import { cached, CacheTTL } from '@/lib/services/cacheService';
import { checkRateLimit, RateLimitPresets } from '@/lib/services/rateLimitService';
import { logError } from '@/lib/services/errorTrackingService';

async function fetchHomeownerWithCache(id: string, userId: string) {
  // Check rate limit
  const rateLimitResult = checkRateLimit(
    `fetch-homeowner:${userId}`,
    RateLimitPresets.RELAXED
  );
  
  if (!rateLimitResult.allowed) {
    throw new Error(`Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}s`);
  }

  // Fetch with caching
  try {
    return await cached(
      `homeowner:${id}`,
      async () => {
        const result = await db.select()
          .from(homeowners)
          .where(eq(homeowners.id, id))
          .limit(1);
        
        if (!result[0]) {
          throw new Error('Homeowner not found');
        }
        
        return result[0];
      },
      { ttl: CacheTTL.MEDIUM }
    );
  } catch (error) {
    logError(error, {
      operation: 'fetchHomeowner',
      homeownerId: id,
      userId,
    });
    throw error;
  }
}
```

---

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Files

- `lib/services/__tests__/uploadService.test.ts` - Upload service tests
- `lib/services/__tests__/homeownerMatchingService.test.ts` - Homeowner matching tests
- More tests coming soon!

### Example Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit, RateLimitPresets } from '../rateLimitService';

describe('rateLimitService', () => {
  it('should allow requests under limit', () => {
    const result = checkRateLimit('test-user', RateLimitPresets.STRICT);
    
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 5 max - 1 used
  });

  it('should block requests over limit', () => {
    // Make 5 requests (limit)
    for (let i = 0; i < 5; i++) {
      checkRateLimit('test-user-2', RateLimitPresets.STRICT);
    }
    
    // 6th request should be blocked
    const result = checkRateLimit('test-user-2', RateLimitPresets.STRICT);
    
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});
```

---

## Best Practices

### 1. Error Tracking
- ✅ Always add breadcrumbs for user actions
- ✅ Include relevant context (userId, operation, etc.)
- ✅ Use appropriate severity levels
- ❌ Don't log sensitive data (passwords, tokens, etc.)

### 2. Rate Limiting
- ✅ Use presets for common scenarios
- ✅ Add rate limits to all public API endpoints
- ✅ Use stricter limits for sensitive operations
- ❌ Don't rate limit internal service calls

### 3. Caching
- ✅ Cache frequently accessed data
- ✅ Use appropriate TTLs based on data freshness needs
- ✅ Invalidate cache when data changes
- ❌ Don't cache sensitive or rapidly changing data

### 4. General
- ✅ Combine services for optimal performance
- ✅ Test error scenarios
- ✅ Monitor cache hit rates
- ✅ Review rate limit logs regularly

---

## Environment Variables

### Required for Sentry

```env
# Optional: Enable Sentry error tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project
SENTRY_DSN=https://your-dsn@sentry.io/your-project # Server-side
```

### No additional environment variables needed for:
- Rate Limiting (uses in-memory store)
- Caching (uses in-memory store)

---

## Troubleshooting

### Issue: Cache not working
**Solution**: Check if you're using the correct namespace and TTL.

### Issue: Rate limit too strict
**Solution**: Adjust the preset or create a custom configuration.

### Issue: Errors not appearing in Sentry
**Solution**: 
1. Verify `SENTRY_DSN` is set
2. Check `initializeSentry()` is called
3. Ensure not in development mode (filtered by default)

### Issue: Memory usage high
**Solution**:
1. Reduce cache `maxSize`
2. Use shorter TTLs
3. Clear cache more frequently

---

## Next Steps

1. Add Sentry DSN to environment variables (optional)
2. Review and adjust rate limit presets for your use case
3. Identify high-traffic API calls to add caching
4. Write tests for your service integrations
5. Monitor error logs and cache hit rates

For questions or issues, see the main project README or create an issue.

