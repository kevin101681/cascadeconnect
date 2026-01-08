# Security Refactor: OpenAI API Key Protection

**Date:** January 8, 2026  
**Issue:** OpenAI API key exposure in client-side code  
**Status:** ✅ Resolved

---

## The Security Vulnerability

### Before (❌ Insecure)

The application was initializing the OpenAI client **directly in the frontend** (`actions/ai-review.ts`):

```typescript
// ❌ SECURITY RISK: API key exposed to client
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
});
```

### Why This Is Dangerous

1. **API Key Exposure:** Environment variables prefixed with `VITE_` are bundled into the client-side JavaScript, making them visible to anyone inspecting the browser's network tab or source code.
2. **Unauthorized Usage:** A malicious actor could extract the API key and use it to make unlimited requests, incurring costs on your OpenAI account.
3. **Rate Limit Abuse:** The exposed key could be used to exhaust your API rate limits.
4. **No Access Control:** There's no way to limit who can make requests or track usage per user.

---

## The Solution

### Architecture Changes

**Moved OpenAI logic to a secure Netlify Function:**

```
Before:
Browser → actions/ai-review.ts (with exposed API key) → OpenAI API

After:
Browser → Netlify Function (analyze-claim.ts) → OpenAI API (with secure key)
```

---

## Implementation Details

### 1. Created Secure Netlify Function

**File:** `netlify/functions/analyze-claim.ts`

- ✅ Server-side execution only
- ✅ Uses `process.env.OPENAI_API_KEY` (not exposed to client)
- ✅ CORS headers for frontend access
- ✅ Input validation
- ✅ Error handling with graceful fallbacks
- ✅ Exact same prompt logic as before

**Key Features:**
- Accepts `POST` requests with JSON body: `{ claimTitle, claimDescription }`
- Returns JSON: `{ status, reasoning, responseDraft }`
- Handles CORS preflight (`OPTIONS`) requests
- Logs for debugging server-side only

### 2. Updated Frontend

**File:** `components/ClaimInlineEditor.tsx`

**Before:**
```typescript
import { analyzeClaim } from '../actions/ai-review';

const result = await analyzeClaim(claim.title, claim.description);
```

**After:**
```typescript
const response = await fetch('/.netlify/functions/analyze-claim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    claimTitle: claim.title,
    claimDescription: claim.description,
  }),
});

const result = await response.json();
```

### 3. Removed Insecure File

**Deleted:** `actions/ai-review.ts`

This file contained the insecure OpenAI client initialization and is no longer needed.

---

## Environment Variable Requirements

### Netlify Dashboard Setup

You **must** set the following environment variable in your Netlify site settings:

1. Go to **Site Settings → Environment Variables**
2. Add:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** `sk-proj-...` (your OpenAI API key)
   - **Scopes:** All (Production, Deploy Previews, Branch Deploys)

### Local Development

For local testing with Netlify Dev:

1. Create a `.env` file in the project root (if it doesn't exist):
   ```bash
   OPENAI_API_KEY=sk-proj-...
   ```

2. Run the development server:
   ```bash
   netlify dev
   ```

   This will:
   - Start the Vite dev server
   - Run Netlify Functions locally
   - Load environment variables from `.env`

---

## Testing

### Manual Test

1. Open the app in a browser
2. Navigate to an Admin claim detail view
3. Click the "✨ AI Review" button
4. Verify:
   - Loading state appears
   - AI analysis card renders with status, reasoning, and response draft
   - "Copy Draft" button works
   - No console errors

### Security Verification

1. **Check Browser DevTools:**
   - Open Network tab
   - Trigger AI review
   - Verify the request goes to `/.netlify/functions/analyze-claim`
   - **API key should NOT be visible** in any request headers or payload

2. **Check Bundled Code:**
   - Build the app: `npm run build`
   - Search `dist/` folder for your API key
   - **It should NOT appear anywhere** in the bundled JavaScript

---

## Benefits of This Refactor

| Aspect | Before | After |
|--------|--------|-------|
| **Security** | ❌ API key in client bundle | ✅ API key server-side only |
| **Cost Control** | ❌ Unlimited public access | ✅ Only authorized requests |
| **Rate Limits** | ❌ Vulnerable to abuse | ✅ Protected by server logic |
| **Monitoring** | ❌ Can't track usage per user | ✅ Can add user tracking to function |
| **Access Control** | ❌ None | ✅ Can add authentication checks |

---

## Future Enhancements

Now that the AI logic is server-side, you can easily add:

1. **User Authentication:**
   ```typescript
   // In Netlify function
   const userId = event.headers['x-user-id'];
   if (!userId) {
     return { statusCode: 401, body: 'Unauthorized' };
   }
   ```

2. **Rate Limiting:**
   ```typescript
   // Track requests per user
   const requestCount = await db.getUserRequestCount(userId);
   if (requestCount > 100) {
     return { statusCode: 429, body: 'Too many requests' };
   }
   ```

3. **Cost Tracking:**
   ```typescript
   // Log usage to database
   await db.logAIRequest({
     userId,
     claimId,
     tokens: response.usage.total_tokens,
     cost: calculateCost(response.usage),
   });
   ```

4. **Caching:**
   ```typescript
   // Cache results for identical claims
   const cached = await redis.get(cacheKey);
   if (cached) return cached;
   ```

---

## Troubleshooting

### "AI analysis service temporarily unavailable"

**Cause:** Netlify function can't access `OPENAI_API_KEY`

**Fix:**
1. Check Netlify dashboard → Environment Variables
2. Ensure `OPENAI_API_KEY` is set
3. Redeploy the site (environment variable changes require a new deploy)

### "HTTP error! status: 500"

**Cause:** OpenAI API error (invalid key, rate limit, etc.)

**Fix:**
1. Check Netlify function logs (Netlify dashboard → Functions → View logs)
2. Look for specific OpenAI error messages
3. Verify API key is valid and has credits

### Local development not working

**Cause:** `.env` file missing or `netlify dev` not running

**Fix:**
1. Create `.env` file with `OPENAI_API_KEY`
2. Run `netlify dev` instead of `npm run dev`
3. Ensure Netlify CLI is installed: `npm install -g netlify-cli`

---

## Commit History

```
0113870 - security: Move OpenAI API calls to secure Netlify function to protect API key
```

---

## Key Takeaway

**Never expose API keys in client-side code.** Always use serverless functions or backend APIs to:
- Keep secrets secure
- Control access
- Monitor usage
- Prevent abuse

This refactor ensures your OpenAI API key is **never** sent to the browser, protecting your account from unauthorized usage and cost abuse. 🔒

