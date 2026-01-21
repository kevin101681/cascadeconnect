# Neon Auth Setup Instructions

## Environment Variables

Add this to your `.env.local` file (get the value from your Neon dashboard):

```env
# Neon Auth Configuration
VITE_NEON_AUTH_URL=your_neon_auth_url_here
```

## Getting Your Credentials

1. Go to your Neon dashboard
2. Navigate to your project
3. Click on the "Auth" section
4. Copy the **Neon Auth URL** (this is your `VITE_NEON_AUTH_URL`)

## Migration Status

✅ **Completed:**
- Installed Stack Auth packages (`@stackframe/stack`, `@stackframe/react`)
- Replaced `ClerkProvider` with `StackProvider` in `index.tsx`
- Updated `App.tsx` to use Stack Auth hooks
- Updated `AuthScreen.tsx` to use Stack Auth methods
- Updated user mapping logic

⏳ **Next Steps:**
1. Add environment variables to `.env.local`
2. Test authentication flows
3. Remove Clerk dependencies (optional cleanup)

## Testing

After adding your credentials:
1. Start the dev server: `npm run dev`
2. Try signing up with email/password
3. Try logging in
4. Try OAuth (Google/Apple) if configured

## Database Sync

Neon Auth automatically creates a `neon_auth` schema in your database with a `users_sync` table. Users will automatically appear there when they sign up!

Query users:
```sql
SELECT * FROM neon_auth.users_sync;
```

## Troubleshooting

- **"StackProvider not found"**: Make sure environment variables are set
- **OAuth not working**: Check OAuth provider configuration in Neon dashboard
- **Users not syncing**: Check database connection and `neon_auth` schema

