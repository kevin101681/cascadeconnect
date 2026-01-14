# ⚡ Monitoring Quick Reference

Quick reference guide for Sentry and PostHog integration.

---

## 🚀 Installation

```bash
# Install packages
npm install @sentry/react @sentry/vite-plugin posthog-js
```

---

## 🔐 Environment Variables

```bash
# .env.local
VITE_SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/123456
VITE_SENTRY_ENVIRONMENT=production

VITE_POSTHOG_KEY=phc_your_project_api_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

---

## 📦 Common Imports

```tsx
// Monitoring helpers
import { 
  identifyUserInMonitoring, 
  clearUserFromMonitoring,
  track,
  captureError,
  addBreadcrumb,
  setTag 
} from './lib/monitoring';

// Direct PostHog access
import { posthog, trackEvent, resetUser } from './components/providers/PostHogProvider';

// Direct Sentry access
import { Sentry } from './sentry.config';
```

---

## 🎯 Common Operations

### Identify User (on login)

```tsx
identifyUserInMonitoring({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
});
```

### Clear User (on logout)

```tsx
clearUserFromMonitoring();
```

### Track Event

```tsx
track('event_name', {
  property1: 'value1',
  property2: 'value2',
});
```

### Capture Error

```tsx
try {
  // risky operation
} catch (error) {
  captureError(error as Error, {
    context: 'additional info',
  });
}
```

### Add Breadcrumb

```tsx
addBreadcrumb('User clicked button', {
  button_id: 'submit',
});
```

### Set Tag

```tsx
setTag('user_role', 'admin');
```

---

## 🎨 Component Examples

### Auth Integration

```tsx
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { identifyUserInMonitoring } from './lib/monitoring';

function App() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      identifyUserInMonitoring({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
      });
    }
  }, [isSignedIn, user]);

  return <div>App</div>;
}
```

### Logout Handler

```tsx
import { useAuth } from '@clerk/clerk-react';
import { clearUserFromMonitoring } from './lib/monitoring';

const handleLogout = async () => {
  clearUserFromMonitoring();
  await signOut();
};
```

### Event Tracking

```tsx
import { track } from './lib/monitoring';

const handleSubmit = () => {
  track('form_submitted', {
    form_name: 'contact',
  });
  submitForm();
};
```

### Error Handling

```tsx
import { captureError } from './lib/monitoring';

try {
  await riskyOperation();
} catch (error) {
  captureError(error as Error, {
    operation: 'riskyOperation',
  });
}
```

---

## 🧪 Testing

### Test Error Boundary

```tsx
<button onClick={() => { throw new Error('Test'); }}>
  Test Error
</button>
```

### Test Event Tracking

```tsx
<button onClick={() => track('test_event')}>
  Test Event
</button>
```

### Check Console

```bash
# Look for these messages:
✅ Sentry initialized
✅ PostHog initialized
📊 PostHog pageview: /dashboard
```

---

## 📊 Dashboard Links

- **Sentry**: [sentry.io](https://sentry.io)
- **PostHog**: [posthog.com](https://posthog.com)

---

## 🔍 Debugging

### Sentry Not Working

1. Check `VITE_SENTRY_DSN` is set
2. Look for console message: `✅ Sentry initialized`
3. Errors are not sent in dev unless `VITE_SENTRY_DEBUG=true`

### PostHog Not Working

1. Check `VITE_POSTHOG_KEY` is set
2. Look for console message: `✅ PostHog initialized`
3. Check console for pageview logs: `📊 PostHog pageview: /path`

---

## 📝 File Structure

```
cascade-connect/
├── sentry.config.ts              # Sentry configuration
├── components/
│   ├── ErrorBoundary.tsx         # Error boundary with Sentry
│   └── providers/
│       └── PostHogProvider.tsx   # PostHog provider
├── lib/
│   └── monitoring.ts             # Helper functions
├── index.tsx                     # App entry (Sentry init)
└── vite.config.ts                # Vite with Sentry plugin
```

---

## 🎯 Event Naming Conventions

```tsx
// ✅ Good naming
track('claim_submitted');
track('user_registered');
track('document_uploaded');

// ❌ Bad naming
track('click');
track('action');
track('event');
```

---

## 🔐 Privacy Checklist

- [ ] Mask sensitive form inputs
- [ ] Filter auth headers
- [ ] Don't track PII
- [ ] Respect Do Not Track
- [ ] Use `person_profiles: 'identified_only'`

---

## 📞 Support

For issues, check:
1. Browser console
2. Environment variables
3. [MONITORING-SETUP.md](./MONITORING-SETUP.md) for detailed guide
4. [MONITORING-INTEGRATION-EXAMPLE.md](./MONITORING-INTEGRATION-EXAMPLE.md) for examples

---

**Version**: 1.0.0
**Last Updated**: January 2026
