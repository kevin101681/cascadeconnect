# Netlify Database Setup Guide

## Issue: Database Sync Failing

If you're seeing the error: "Warning: Homeowner saved locally but database sync failed", it means the `VITE_DATABASE_URL` environment variable is not set in Netlify.

## Solution: Set Environment Variable in Netlify

### Step 1: Get Your Neon Database Connection String

1. Go to your Neon dashboard: https://console.neon.tech
2. Select your database project
3. Go to **Connection Details** or **Connection String**
4. Copy the connection string (format: `postgresql://user:password@host/database?sslmode=require`)

### Step 2: Add Environment Variable in Netlify

1. Go to your Netlify site dashboard: https://app.netlify.com/projects/cascadeconnect
2. Navigate to **Site settings** > **Environment variables**
3. Click **Add a variable**
4. Set:
   - **Key**: `VITE_DATABASE_URL`
   - **Value**: Paste your Neon connection string
   - **Scopes**: Select **All scopes** (or at least **Production** and **Deploy previews**)
5. Click **Save**

### Step 3: Redeploy

After adding the environment variable, you need to redeploy:

```bash
npm run netlify:deploy:prod
```

Or trigger a new deployment from the Netlify dashboard:
1. Go to **Deploys** tab
2. Click **Trigger deploy** > **Deploy site**

## Verify It's Working

After redeploying:

1. Open your production site: https://cascadeconnect.netlify.app
2. Open browser console (F12)
3. Look for these messages:
   - `✅ Database connection initialized`
   - `✅ Database connection verified`
4. Try enrolling a new homeowner
5. You should see: `✅ Homeowner saved and verified in database: [id]`

## Troubleshooting

### Still seeing errors?

1. **Check the browser console** for detailed error messages
2. **Verify the connection string**:
   - Should start with `postgresql://`
   - Should include `?sslmode=require` at the end
   - Should NOT have any spaces or line breaks
3. **Check Netlify build logs**:
   - Go to **Deploys** > Click on the latest deploy > **View build log**
   - Look for any errors during build
4. **Verify environment variable is set**:
   - In Netlify dashboard, go to **Site settings** > **Environment variables**
   - Make sure `VITE_DATABASE_URL` is listed
   - Check that it's set for the correct scope (Production)

### Common Issues

**Issue**: "No valid VITE_DATABASE_URL found"
- **Solution**: The environment variable is not set or not accessible. Make sure it's prefixed with `VITE_` and set in Netlify.

**Issue**: "Connection refused" or "Network error"
- **Solution**: Check that your Neon database allows connections from external IPs. Neon Serverless should work, but verify your database is active.

**Issue**: "Authentication failed"
- **Solution**: Your connection string might be incorrect. Double-check the username, password, and database name in the connection string.

## Security Note

⚠️ **Important**: `VITE_DATABASE_URL` is exposed to the client-side code. This is acceptable for Neon Serverless (which is designed for browser connections), but be aware that:

- Anyone can see this in the browser's network tab
- Use a read-only or limited-permission database user if possible
- Consider using server-side API endpoints for write operations in the future

## Need Help?

If you continue to have issues:

1. Check the browser console for the detailed error message
2. Check Netlify build logs
3. Verify your Neon database is active and accessible
4. Test the connection string locally in a `.env.local` file first
