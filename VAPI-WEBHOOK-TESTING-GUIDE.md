# 🧪 Vapi Webhook Testing Guide

**Date:** December 31, 2025  
**Status:** Troubleshooting 401 Unauthorized Errors

## 🎯 Current Issue

The test script (`scripts/test-vapi-webhook.js`) is getting **401 Unauthorized** errors when calling the local webhook endpoint.

## 🔍 Root Cause

The Netlify function (`netlify/functions/vapi-webhook.ts`) cannot find the `VAPI_SECRET` environment variable when running via `netlify dev`.

## ✅ Solution Steps

### Step 1: Verify Environment Variable

Check that your `.env` file contains:

```bash
VAPI_SECRET=ferguson1228
```

**✅ Confirmed:** The `.env` file has the correct secret.

### Step 2: Restart `netlify dev`

The webhook function has been updated with debug logging. You need to restart the server to rebuild the function.

**In the terminal where `netlify dev` is running:**

1. Press `Ctrl+C` to stop the server
2. Run:
   ```bash
   netlify dev
   ```
3. Wait for the "Server now ready on http://localhost:8888" message

### Step 3: Run the Test Script

**In a different terminal:**

```bash
node scripts/test-vapi-webhook.js
```

### Step 4: Check Debug Output

**In the `netlify dev` terminal**, you should now see debug logs like:

```
🚀 [VAPI WEBHOOK] New webhook received...
🔐 Received secret: ferguson12...
🔐 Expected secret: ferguson12...
```

Or if the environment variable isn't loading:

```
🔐 Received secret: ferguson12...
🔐 Expected secret: NOT SET  ← This is the problem!
```

## 🔧 If Still Getting 401 After Restart

### Option A: Add Environment Variable to Netlify Dev Context

```bash
netlify env:set VAPI_SECRET ferguson1228
```

### Option B: Create `.netlify/functions-serve.json`

Create a file at `.netlify/functions-serve.json`:

```json
{
  "vapi-webhook": {
    "environment": {
      "VAPI_SECRET": "ferguson1228"
    }
  }
}
```

### Option C: Temporarily Bypass Authentication (Testing Only)

**⚠️ FOR LOCAL TESTING ONLY - DO NOT COMMIT TO PRODUCTION**

In `netlify/functions/vapi-webhook.ts`, temporarily comment out the auth check:

```typescript
// TEMPORARY: Bypass auth for local testing
// if (!verifyVapiSecret(vapiSecret)) {
//   return {
//     statusCode: 401,
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ error: 'Unauthorized' }),
//   };
// }
console.log('⚠️ AUTH BYPASSED FOR LOCAL TESTING');
```

## 📊 Expected Test Results

When working correctly, you should see:

```
✅ Scenario 1: Standard Warranty Call (New Format): PASSED
✅ Scenario 2: Non-Urgent Call: PASSED
✅ Scenario 3: Legacy Format (Backward Compatibility): PASSED
✅ Scenario 4: Missing Data (Emergency Extraction Test): PASSED

📊 Total: 4 tests
✅ Passed: 4
❌ Failed: 0
```

## 🐛 Debug Checklist

- [ ] `.env` file exists in project root
- [ ] `.env` contains `VAPI_SECRET=ferguson1228`
- [ ] `netlify dev` has been restarted since adding debug code
- [ ] Test script shows "Vapi Secret: ferguson12..." in configuration
- [ ] Debug logs appear in `netlify dev` terminal when test runs
- [ ] Both "Received" and "Expected" secrets match in debug logs

## 📚 Related Files

- **Test Script:** `scripts/test-vapi-webhook.js`
- **Test Documentation:** `scripts/TEST-VAPI-WEBHOOK-README.md`
- **Webhook Handler:** `netlify/functions/vapi-webhook.ts`
- **Vapi Service:** `lib/services/vapiService.ts`
- **JSON Schema:** `vapi-punchlist-schema.json`

## 🚨 Common Mistakes

1. **Not restarting `netlify dev`** after code changes
2. **Running test script before `netlify dev` is fully ready**
3. **Multiple `.env` files** in different locations
4. **Case sensitivity** in environment variable names
5. **Spaces or quotes** around the secret value in `.env`

## 💡 Next Steps After Tests Pass

1. Check the database to verify calls were saved
2. Verify structured data extraction worked correctly
3. Test emergency extraction fallback (Scenario 4)
4. Check email notifications were sent
5. Remove debug logging before deploying to production

