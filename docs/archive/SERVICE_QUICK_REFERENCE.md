# 🚀 Service Layer Quick Reference

## Import Statements

```typescript
// Error Tracking
import { logError, logWarning, addBreadcrumb, captureException } from '@/lib/services/errorTrackingService';

// Rate Limiting
import { checkRateLimit, RateLimitPresets, withRateLimit } from '@/lib/services/rateLimitService';

// Caching
import { cached, memoize, CacheTTL, CacheNamespace } from '@/lib/services/cacheService';

// Payment Processing
import { square, createInvoice, withIdempotency } from '@/lib/services/square';

// Existing Services
import { uploadFile, uploadMultipleFiles } from '@/lib/services/uploadService';
import { sendMessage } from '@/lib/services/messagesService';
import { findMatchingHomeowner } from '@/lib/services/homeownerMatchingService';
```

---

## 📋 Common Patterns

### Pattern 1: Upload with Error Tracking
```typescript
try {
  const result = await uploadFile(file);
  if (!result.success) throw new Error(result.error);
  return result.attachment;
} catch (error) {
  logError(error, { component: 'UploadForm', userId });
  throw error;
}
```

### Pattern 2: API Call with Caching
```typescript
const data = await cached(
  `api:${endpoint}`,
  () => fetch(endpoint).then(r => r.json()),
  { ttl: CacheTTL.SHORT }
);
```

### Pattern 3: Function with Rate Limit
```typescript
const result = checkRateLimit(userId, RateLimitPresets.STANDARD);
if (!result.allowed) {
  throw new Error(`Too many requests. Wait ${result.retryAfter}s`);
}
```

### Pattern 4: Memoized Database Query
```typescript
const getCachedHomeowner = memoize(
  (id: string) => db.select().from(homeowners).where(eq(homeowners.id, id)),
  (id) => `homeowner:${id}`,
  { ttl: CacheTTL.MEDIUM, namespace: CacheNamespace.HOMEOWNERS }
);
```

### Pattern 5: Square Payment with Idempotency
```typescript
import { createInvoice } from '@/lib/services/square';

// Safe payment - no double charges even if retried
const invoice = await createInvoice(
  customerId,
  10000, // $100.00 in cents
  'Warranty Claim Invoice'
);
```

---

## 🎯 Presets Cheat Sheet

### Rate Limiting
| Preset | Limit | Use Case |
|--------|-------|----------|
| `STRICT` | 5/min | Password reset, MFA |
| `STANDARD` | 30/min | General API endpoints |
| `RELAXED` | 100/min | Read-only operations |
| `FILE_UPLOAD` | 10/hour | File uploads |
| `EMAIL_SEND` | 20/hour | Email notifications |
| `SMS_SEND` | 10/hour | SMS messages |
| `API_CALL` | 1000/hour | External API calls |

### Cache TTL
| Preset | Duration | Use Case |
|--------|----------|----------|
| `VERY_SHORT` | 30s | Live data |
| `SHORT` | 5min | Default |
| `MEDIUM` | 15min | Moderately stable |
| `LONG` | 1hr | Stable data |
| `VERY_LONG` | 24hr | Rarely changes |

### Cache Namespaces
`HOMEOWNERS` • `CLAIMS` • `CONTRACTORS` • `MESSAGES` • `CALLS` • `API_RESPONSES` • `USER_DATA`

---

## 🧪 Testing

```bash
npm test                  # Watch mode
npm run test:ui           # Interactive UI
npm run test:coverage     # Coverage report
npm run test:run          # CI mode
```

---

## 🐛 Error Severity Levels

```typescript
logFatal(error, context)    // 💀 App-breaking
logError(error, context)    // ❌ Needs attention
logWarning(msg, context)    // ⚠️  Non-critical
logInfo(msg, context)       // ℹ️  Important event
```

---

## 📊 Monitoring

```typescript
// Cache stats
import { getStats, logStats } from '@/lib/services/cacheService';
logStats('homeowners'); // View cache performance

// Rate limit stats
import { getRateLimitStats } from '@/lib/services/rateLimitService';
const stats = getRateLimitStats();

// Local errors (dev only)
import { getLocalErrors } from '@/lib/services/errorTrackingService';
const errors = getLocalErrors();
```

---

## 🔧 Environment Setup

```env
# Optional: Enable Sentry
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_DSN=https://your-dsn@sentry.io/project
```

---

## 💡 Pro Tips

1. **Always add breadcrumbs** before critical operations
2. **Use rate limiting** on all public endpoints
3. **Cache database queries** that are frequently accessed
4. **Include userId** in error context when available
5. **Use namespaces** to organize cache by domain
6. **Test error scenarios** with unit tests
7. **Monitor cache hit rates** to tune TTLs
8. **Invalidate cache** when data changes

---

## 📖 Full Documentation

- **Complete Guide**: See `SERVICE_LAYER_GUIDE.md`
- **Summary**: See `OPTIONAL_WORK_SUMMARY.md`
- **Tests**: See `lib/services/__tests__/`

---

**Questions? Check the guides or inspect the service files directly - they're well documented!**

