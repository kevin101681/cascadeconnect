# Migration Plan: Clerk → Neon Auth (Stack Auth)

## Current Clerk Usage

### What You're Using:
- ✅ Email/Password authentication
- ✅ OAuth (Google, Apple)
- ✅ User session management (`useUser`, `useAuth`)
- ✅ Custom auth UI (AuthScreen component)
- ✅ User role mapping (ADMIN, BUILDER, HOMEOWNER)

### What You're NOT Using:
- ❌ Clerk's pre-built UI components
- ❌ Multi-factor authentication
- ❌ Advanced user management features

## Migration Steps

### Phase 1: Set Up Neon Auth

1. **Enable Neon Auth in Neon Dashboard**
   - Go to your Neon project
   - Navigate to "Auth" section
   - Enable Neon Auth
   - Configure Stack Auth settings
   - Get your credentials

2. **Install Stack Auth Packages**
   ```bash
   npm install @stackframe/stack @stackframe/stack-react
   ```

3. **Update Environment Variables**
   ```env
   # Remove Clerk
   # VITE_CLERK_PUBLISHABLE_KEY=...
   
   # Add Stack Auth
   VITE_STACK_PROJECT_ID=your_project_id
   VITE_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
   ```

### Phase 2: Replace Clerk Code

#### Step 1: Update `index.tsx`
Replace `ClerkProvider` with `StackProvider`

#### Step 2: Update `App.tsx`
Replace Clerk hooks with Stack Auth hooks

#### Step 3: Update `components/AuthScreen.tsx`
Replace Clerk auth methods with Stack Auth

#### Step 4: Update `components/NoAuthProvider.tsx`
Create Stack Auth version or remove if not needed

### Phase 3: Update Database Schema

Stack Auth automatically creates user tables in Neon. You may need to:
- Update foreign key relationships
- Map Stack Auth user IDs to your existing user records
- Update `clerkId` columns (or keep for migration period)

### Phase 4: Test & Clean Up

1. Test all auth flows
2. Remove Clerk dependencies
3. Update documentation

## Benefits You'll Get

1. **Automatic User Sync** - Users appear in your Neon database automatically
2. **Simpler Setup** - One less service to configure
3. **Better Integration** - Native Neon features
4. **Database Branching** - Auth data branches with your database
5. **Cost Savings** - Likely cheaper than Clerk

## Ready to Start?

I can help you:
1. Set up the Stack Auth provider
2. Replace all Clerk code
3. Update the auth screen
4. Test the migration

Let me know when you're ready to begin!






