# 🔗 Monitoring Integration Examples

This file provides code examples for integrating Sentry and PostHog into your application.

---

## 🎯 Integrate with Clerk Authentication

Update your authentication logic to identify users in monitoring tools:

```tsx
// In App.tsx or your main component
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { identifyUserInMonitoring, clearUserFromMonitoring } from './lib/monitoring';

function App() {
  const { isSignedIn, user } = useUser();

  // Identify user when they sign in
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

  return (
    // Your app content
  );
}
```

---

## 🚪 Handle Logout

Update your logout handler to clear user data:

```tsx
import { useAuth } from '@clerk/clerk-react';
import { clearUserFromMonitoring } from './lib/monitoring';

function LogoutButton() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    // Clear monitoring data
    clearUserFromMonitoring();
    
    // Sign out from Clerk
    await signOut();
  };

  return (
    <button onClick={handleLogout}>
      Sign Out
    </button>
  );
}
```

---

## 📊 Track Custom Events

Track important user actions:

```tsx
import { track } from './lib/monitoring';

function ClaimSubmitButton() {
  const handleSubmit = async (claimData) => {
    try {
      // Submit claim
      await submitClaim(claimData);
      
      // Track success
      track('claim_submitted', {
        claim_type: claimData.type,
        priority: claimData.priority,
      });
    } catch (error) {
      // Error is automatically tracked by Sentry
      console.error('Failed to submit claim:', error);
    }
  };

  return <button onClick={handleSubmit}>Submit Claim</button>;
}
```

---

## 🐛 Manual Error Capture

Capture and track errors explicitly:

```tsx
import { captureError } from './lib/monitoring';

async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // Capture error with context
    captureError(error as Error, {
      endpoint: '/api/data',
      timestamp: new Date().toISOString(),
    });
    
    // Handle error gracefully
    return null;
  }
}
```

---

## 🔍 Add Breadcrumbs for Debugging

Add breadcrumbs to track user actions leading to an error:

```tsx
import { addBreadcrumb } from './lib/monitoring';

function SearchComponent() {
  const handleSearch = (query: string) => {
    // Add breadcrumb
    addBreadcrumb('User performed search', {
      query,
      timestamp: new Date().toISOString(),
    });
    
    // Perform search
    performSearch(query);
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

---

## 🏷️ Set Custom Tags

Add tags for better filtering in Sentry:

```tsx
import { setTag } from './lib/monitoring';

function Dashboard() {
  const { user } = useUser();
  
  useEffect(() => {
    if (user) {
      // Set custom tags
      setTag('user_role', user.publicMetadata.role as string);
      setTag('organization', user.publicMetadata.organization as string);
    }
  }, [user]);

  return <div>Dashboard Content</div>;
}
```

---

## 🎬 Track Form Submissions

Track important form interactions:

```tsx
import { track } from './lib/monitoring';

function ContactForm() {
  const handleSubmit = (formData) => {
    track('form_submitted', {
      form_name: 'contact_form',
      fields_filled: Object.keys(formData).length,
    });
    
    // Submit form
    submitForm(formData);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## 🎯 Track Feature Usage

Monitor which features are being used:

```tsx
import { track } from './lib/monitoring';

function FeatureButton({ featureName }) {
  const handleClick = () => {
    track('feature_used', {
      feature_name: featureName,
      timestamp: new Date().toISOString(),
    });
    
    // Trigger feature
    activateFeature(featureName);
  };

  return <button onClick={handleClick}>Use Feature</button>;
}
```

---

## 📈 Track Page Performance

Monitor page load times:

```tsx
import { track } from './lib/monitoring';
import { useEffect } from 'react';

function Dashboard() {
  useEffect(() => {
    // Measure page load time
    const loadTime = performance.now();
    
    track('page_load_time', {
      page: 'dashboard',
      load_time_ms: Math.round(loadTime),
    });
  }, []);

  return <div>Dashboard</div>;
}
```

---

## 🚨 Test Error Boundary

Add a test button to verify error tracking:

```tsx
function TestErrorButton() {
  const triggerError = () => {
    // This will be caught by ErrorBoundary and sent to Sentry
    throw new Error('Test error from error boundary');
  };

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <button 
      onClick={triggerError}
      style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px',
        background: 'red',
        color: 'white',
        padding: '10px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        zIndex: 9999,
      }}
    >
      🧪 Test Error
    </button>
  );
}
```

---

## 🔐 Track Authentication Events

Monitor authentication flows:

```tsx
import { track } from './lib/monitoring';
import { useUser } from '@clerk/clerk-react';

function AuthMonitor() {
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        track('user_signed_in', {
          timestamp: new Date().toISOString(),
        });
      } else {
        track('user_signed_out', {
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [isSignedIn, isLoaded]);

  return null; // This is a monitoring component
}
```

---

## 📊 Track Claim Status Changes

Monitor claim workflow:

```tsx
import { track } from './lib/monitoring';

function ClaimStatusUpdate({ claimId, newStatus }) {
  const updateStatus = async () => {
    // Update status
    await updateClaimStatus(claimId, newStatus);
    
    // Track the change
    track('claim_status_changed', {
      claim_id: claimId,
      new_status: newStatus,
      timestamp: new Date().toISOString(),
    });
  };

  return <button onClick={updateStatus}>Update Status</button>;
}
```

---

## 🎨 Advanced: Custom PostHog Properties

Add custom properties to all PostHog events:

```tsx
import { posthog } from './components/providers/PostHogProvider';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Set super properties (added to all events)
    posthog.register({
      app_version: '1.0.0',
      environment: import.meta.env.MODE,
    });
  }, []);

  return <div>App Content</div>;
}
```

---

## 🔄 Track Navigation

Monitor route changes:

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { track } from './lib/monitoring';

function NavigationTracker() {
  const location = useLocation();

  useEffect(() => {
    track('navigation', {
      path: location.pathname,
      timestamp: new Date().toISOString(),
    });
  }, [location.pathname]);

  return null;
}

// Add to your App.tsx:
function App() {
  return (
    <>
      <NavigationTracker />
      {/* Rest of your app */}
    </>
  );
}
```

---

## 📝 Best Practices

### 1. Don't Over-Track
- Only track meaningful events
- Avoid tracking every single click
- Focus on business-critical actions

### 2. Protect Privacy
- Never track sensitive data (passwords, credit cards, etc.)
- Use masked attributes for PII
- Respect user privacy preferences

### 3. Use Descriptive Event Names
```tsx
// ✅ Good
track('claim_submitted', { claim_type: 'water_damage' });

// ❌ Bad
track('click', { button: 'submit' });
```

### 4. Add Context to Errors
```tsx
// ✅ Good
captureError(error, {
  user_action: 'submitting_claim',
  claim_id: claimId,
});

// ❌ Bad
captureError(error);
```

### 5. Test in Development
- Use console logs to verify tracking
- Test error boundaries
- Verify user identification

---

**Last Updated**: January 2026
