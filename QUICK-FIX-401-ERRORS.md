# 🚨 QUICK FIX: Invoice Email 401 Errors

## The Problem
Backend Netlify function missing `CLERK_SECRET_KEY` environment variable.

## The Solution (5 minutes)

### Step 1: Get Clerk Secret Key
1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your app → **API Keys**
3. Find **Secret Keys** section
4. Copy the key starting with `sk_test_...` or `sk_live_...`

### Step 2: Add to Netlify
1. Go to Netlify Dashboard → Your Site
2. **Site Settings** → **Environment Variables**
3. Click **Add a variable**
4. Key: `CLERK_SECRET_KEY`
5. Value: (paste your secret key)
6. Scopes: Check **Functions** ✓
7. Click **Create variable**

### Step 3: Redeploy
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait for deploy to complete (~2 min)

### Step 4: Test
Send an invoice email - should work immediately! ✅

---

## Other Required Variables

While you're there, make sure these are also set:

- ✅ `DATABASE_URL` - Neon PostgreSQL connection string
- ✅ `SENDGRID_API_KEY` - For sending emails
- ✅ `SENDGRID_REPLY_EMAIL` - From email address

---

## Still Not Working?

**Check these:**
1. Did you redeploy after adding variables? (Step 3)
2. Is `CLERK_SECRET_KEY` scoped to **Functions**? 
3. Are you using the **Secret Key** (sk_...) not Publishable Key (pk_...)?
4. Is your user an ADMIN in the database?

**View logs**: Netlify → Functions → cbsbooks-send-email → Recent logs

---

📖 For detailed documentation, see: `NETLIFY-ENV-SETUP.md`
