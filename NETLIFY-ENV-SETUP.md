# Netlify Environment Variables Setup Guide

## Critical Issue: Backend Authentication Failure

### Error Symptoms:
- ❌ `Action: Set the CLERK_JWT_KEY environment variable`
- ❌ `401 Unauthorized` when sending invoice emails
- ❌ Backend function crashes due to missing JWT verification key

### Root Cause:
The Netlify function `cbsbooks-send-email.ts` uses Clerk's `verifyToken()` to validate user authentication tokens. This requires the **Clerk Secret Key** to be configured in Netlify.

---

## Required Environment Variables

### 1. Clerk Authentication (CRITICAL)

#### `CLERK_SECRET_KEY` ⚠️ REQUIRED
**Purpose**: Used by backend Netlify functions to verify JWT tokens from the frontend  
**Where to get it**:
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **API Keys** in the sidebar
4. Find **Secret Keys** section
5. Copy the key that starts with `sk_test_...` or `sk_live_...`

**How to add to Netlify**:
1. Go to your Netlify Dashboard
2. Select your site
3. Go to **Site Settings** → **Environment Variables**
4. Click **Add a variable**
5. Key: `CLERK_SECRET_KEY`
6. Value: Paste your secret key (e.g., `sk_test_xxxxxxxxxxxxxxxxxxxx`)
7. Scopes: Check **Functions** (critical!)
8. Click **Create variable**

**⚠️ IMPORTANT**: After adding, trigger a new deploy (clear cache and redeploy) for the function to pick up the variable.

---

### 2. Database Configuration (REQUIRED)

#### `DATABASE_URL`
**Purpose**: Connection string for Neon PostgreSQL database  
**Format**: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`  
**Where to get it**:
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to **Connection Details**
4. Copy the connection string

**How to add to Netlify**: Same process as Clerk key above

---

### 3. Email Configuration (REQUIRED)

#### `SENDGRID_API_KEY`
**Purpose**: Send invoice emails via SendGrid  
**Where to get it**:
1. Go to [SendGrid Dashboard](https://app.sendgrid.com)
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it (e.g., "Netlify Production")
5. Select **Full Access** or at minimum **Mail Send** permission
6. Copy the key (starts with `SG.`)

**How to add to Netlify**: Same process as above

#### `SENDGRID_REPLY_EMAIL` (Optional but Recommended)
**Purpose**: The "from" email address for sent invoices  
**Value**: Your verified sender email (e.g., `info@cascadebuilderservices.com`)  
**Note**: This email must be verified in SendGrid

---

## Frontend Environment Variables (.env.local)

These are used by the Vite frontend and should be in your `.env.local` file:

```env
# Clerk Frontend (Public - safe to expose)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx

# Optional: Sentry Error Tracking
VITE_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxxx
VITE_SENTRY_AUTH_TOKEN=your_sentry_auth_token

# Optional: AI Features
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

## Complete Netlify Environment Variables Checklist

Copy this list and check off as you add each variable:

### Authentication & Database
- [ ] `CLERK_SECRET_KEY` - Clerk secret key for token verification (critical!)
- [ ] `DATABASE_URL` - Neon PostgreSQL connection string

### Email Service
- [ ] `SENDGRID_API_KEY` - SendGrid API key for sending emails
- [ ] `SENDGRID_REPLY_EMAIL` - From email address (optional)

### Optional Services
- [ ] `SENTRY_DSN` - Sentry error tracking (optional)
- [ ] `SENTRY_AUTH_TOKEN` - Sentry authentication (optional)
- [ ] `ADMIN_NOTIFICATION_EMAIL` - Admin notification email (optional)

---

## Troubleshooting

### Issue: "CLERK_JWT_KEY environment variable not set"

**This is a red herring!** The actual variable needed is `CLERK_SECRET_KEY`, not `CLERK_JWT_KEY`. The Clerk SDK uses `secretKey` parameter internally.

**Solution**: Add `CLERK_SECRET_KEY` as described above.

### Issue: Still getting 401 after adding CLERK_SECRET_KEY

**Possible causes**:
1. **Didn't redeploy**: After adding environment variables, you MUST trigger a new deploy
2. **Wrong key**: Make sure you copied the **Secret Key** (starts with `sk_`), not the Publishable Key
3. **Scope issue**: Ensure the variable is scoped to **Functions** in Netlify
4. **Cache issue**: Try "Clear cache and deploy site" option in Netlify

### Issue: "User is not an admin"

**Cause**: The authenticated user doesn't have `ADMIN` role in the database.

**Solution**: Update the user's role in your Neon database:
```sql
UPDATE users SET role = 'ADMIN' WHERE clerk_id = 'user_xxxxxxxxxxxxx';
```

### Issue: SendGrid errors

**Possible causes**:
1. API key not set or invalid
2. Sender email not verified in SendGrid
3. Daily sending limit reached (free tier)

---

## How the Authentication Flow Works

1. **Frontend** (React):
   - User logs in via Clerk
   - `useAuth().getToken()` gets a JWT token
   - Token is sent in `Authorization: Bearer ${token}` header

2. **Netlify Function** (`cbsbooks-send-email.ts`):
   - Receives request with token in header or cookie
   - Calls `verifyToken(token, { secretKey: CLERK_SECRET_KEY })`
   - Extracts `clerkUserId` from verified token
   - Queries database to check if user has `ADMIN` role
   - If valid admin: sends email via SendGrid
   - If not: returns 401/403 error

3. **Clerk Backend SDK**:
   - Uses `CLERK_SECRET_KEY` to cryptographically verify the JWT
   - Ensures token wasn't tampered with
   - Validates token expiration
   - Returns user information

---

## Quick Fix Summary

**If invoice emails are failing with 401 errors:**

1. ✅ Go to [Clerk Dashboard](https://dashboard.clerk.com) → API Keys
2. ✅ Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. ✅ Go to Netlify Dashboard → Site Settings → Environment Variables
4. ✅ Add variable: Key = `CLERK_SECRET_KEY`, Value = your secret key
5. ✅ Ensure scope includes **Functions**
6. ✅ Go to Deploys → Trigger Deploy → "Clear cache and deploy site"
7. ✅ Wait for deploy to complete
8. ✅ Test invoice email functionality

**Total time: ~5 minutes**

---

## Security Notes

- ⚠️ Never commit `CLERK_SECRET_KEY` to git
- ⚠️ Never expose secret keys in frontend code
- ⚠️ Rotate keys if compromised
- ⚠️ Use different keys for development vs production
- ✅ Netlify environment variables are encrypted at rest
- ✅ Only Netlify functions can access these variables

---

## Need Help?

If you're still experiencing issues after following this guide:

1. Check Netlify function logs: Site → Functions → cbsbooks-send-email → Recent logs
2. Check browser console for frontend errors
3. Verify all environment variables are present and correctly scoped
4. Ensure you redeployed after adding variables
5. Test with a simple API call to verify function is running

---

**Last Updated**: January 23, 2026  
**Related Files**: 
- `netlify/functions/cbsbooks-send-email.ts` (Backend function)
- `INVOICE-EMAIL-AUTH-STATUS.md` (Frontend authentication status)
