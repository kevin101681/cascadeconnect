# Neon Auth Migration Guide

## What is Neon Auth?

Neon Auth is a serverless authentication solution that:
- **Integrates directly with Neon Postgres** - User data automatically syncs to your database
- **Uses Stack Auth** as the underlying authentication provider
- **Eliminates manual sync** - No webhooks or polling needed
- **Branches with your database** - Authentication data branches along with your database branches

## Comparison: Neon Auth vs Clerk

### Neon Auth Advantages
✅ **Tight Neon Integration** - Seamless sync with your Neon database  
✅ **Automatic User Sync** - User profiles automatically appear in your database  
✅ **Database Branching** - Auth data branches with your database  
✅ **Simplified Setup** - Fewer moving parts  
✅ **Cost** - Potentially lower cost (check Neon pricing)

### Clerk Advantages
✅ **More Features** - Pre-built UI components, MFA, social logins  
✅ **Mature Platform** - More documentation and community support  
✅ **Framework Integrations** - Deep React/Next.js integrations  
✅ **More Customization** - Extensive customization options  
✅ **Multiple Providers** - Support for many auth methods

### Current Status
- **Neon Auth** uses Stack Auth under the hood
- **Neon plans** to integrate with Clerk in the future
- **You can use Clerk with Neon** (separate from Neon Auth)

## Can You Use Neon Auth?

**Yes, but with considerations:**

### ✅ Good Fit If:
- You want automatic user sync with Neon database
- You're okay with Stack Auth's feature set
- You want simpler architecture
- You value tight database integration

### ⚠️ Consider Staying with Clerk If:
- You need advanced features (MFA, social logins, etc.)
- You want extensive customization
- You need Clerk's pre-built UI components
- You want to wait for Neon's native Clerk integration

## Migration Path

### Option 1: Migrate to Neon Auth (Stack Auth)

#### Step 1: Install Stack Auth
```bash
npm install @stackframe/stack
```

#### Step 2: Set Up Neon Auth in Neon Dashboard
1. Go to your Neon project dashboard
2. Navigate to "Auth" section
3. Enable Neon Auth
4. Configure Stack Auth settings
5. Get your Stack Auth credentials

#### Step 3: Update Environment Variables
```env
# Remove Clerk
# VITE_CLERK_PUBLISHABLE_KEY=...

# Add Stack Auth
VITE_STACK_PROJECT_ID=your_project_id
VITE_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
```

#### Step 4: Update Authentication Code

**Replace `index.tsx`:**
```tsx
import { StackProvider } from '@stackframe/stack';
import { StackAuth } from '@stackframe/stack-react';

const stackProjectId = import.meta.env.VITE_STACK_PROJECT_ID;
const publishableClientKey = import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY;

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <StackProvider 
        projectId={stackProjectId}
        publishableClientKey={publishableClientKey}
      >
        <App />
      </StackProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
```

**Update `App.tsx` hooks:**
```tsx
import { useStackApp, useUser } from '@stackframe/stack-react';

// Replace Clerk hooks
const { user } = useUser();
const app = useStackApp();
```

**Update `components/AuthScreen.tsx`:**
```tsx
import { StackAuth } from '@stackframe/stack-react';

// Use Stack Auth components
<StackAuth />
```

#### Step 5: Update Database Schema

Neon Auth automatically creates user tables. You may need to:
1. Remove `clerkId` columns (or keep for migration period)
2. Add Stack Auth user ID columns
3. Update foreign key relationships

#### Step 6: Migrate Existing Users

If you have existing Clerk users:
1. Export user data from Clerk
2. Map Clerk IDs to Stack Auth IDs
3. Update database references
4. Notify users to re-authenticate (or use migration tokens)

### Option 2: Wait for Neon's Native Clerk Integration

Neon has indicated plans to integrate Clerk directly. You could:
- Stay with Clerk for now
- Wait for native integration
- Migrate when it's available

### Option 3: Hybrid Approach

Use both:
- **Clerk** for authentication UI and features
- **Neon Auth** for automatic database sync
- Sync Clerk users to Neon via webhooks

## Current Code Analysis

### Files Using Clerk:
- `index.tsx` - ClerkProvider setup
- `App.tsx` - useUser, useAuth hooks
- `components/AuthScreen.tsx` - Clerk sign-in/sign-up
- `components/NoAuthProvider.tsx` - Mock provider for dev

### What Needs to Change:
1. **Provider** - Replace ClerkProvider with StackProvider
2. **Hooks** - Replace Clerk hooks with Stack Auth hooks
3. **Auth Screen** - Replace Clerk components with Stack Auth
4. **Database** - Update schema for Stack Auth user IDs
5. **User Mapping** - Update user role mapping logic

## Recommendation

### For Your Use Case:

**Consider Neon Auth if:**
- You want automatic user sync (no manual webhooks)
- You're okay with Stack Auth's feature set
- You want simpler architecture
- Database integration is a priority

**Stay with Clerk if:**
- You need advanced auth features
- You want Clerk's UI components
- You have complex auth requirements
- You want to wait for Neon's native Clerk integration

### My Suggestion:

Since you're already using Neon and have a working Clerk setup, I'd recommend:

1. **Short term:** Keep Clerk (it's working)
2. **Monitor:** Watch for Neon's native Clerk integration
3. **Consider:** Migrate to Neon Auth if you need automatic sync and Stack Auth features are sufficient

## Next Steps

If you want to proceed with Neon Auth migration:

1. **Test Stack Auth** - Set up a test project to evaluate features
2. **Check Feature Parity** - Ensure Stack Auth has what you need
3. **Plan Migration** - Create migration script for existing users
4. **Update Code** - Follow the migration steps above
5. **Test Thoroughly** - Test all auth flows before going live

## Resources

- [Neon Auth Documentation](https://neon.com/docs/auth)
- [Stack Auth Documentation](https://docs.stack-auth.com/)
- [Neon Blog: Neon Auth Announcement](https://neon.com/blog/neon-auth-is-here)

## Questions to Consider

1. Do you need features that Stack Auth doesn't provide?
2. Do you have existing users that need migration?
3. Is automatic database sync a priority?
4. Are you okay with Stack Auth's UI components?
5. Can you wait for Neon's native Clerk integration?

---

**Status:** Ready to migrate when you decide. Current Clerk setup can remain in place.






