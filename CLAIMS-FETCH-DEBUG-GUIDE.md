# Claims Fetch Debug Guide

## 🔍 Current Setup

### API Endpoint
- **URL**: `/.netlify/functions/get-claims?homeownerId=<uuid>`
- **Method**: GET
- **Function Location**: `netlify/functions/get-claims.ts`
- **Status**: ✅ Function exists and is correctly implemented

### Database Schema
- **Table**: `claims`
- **Filter Column**: `homeowner_id` (mapped as `homeownerId` in Drizzle)
- **Test Homeowner ID**: `c50f858b-6d60-4812-be01-78430717e89c`

## 🐛 Common Issues & Solutions

### Issue 1: 404 Error (Function Not Found)

**Symptoms:**
- `SyntaxError: Unexpected token '<'` when parsing JSON
- Response is HTML instead of JSON
- Console shows 404 status code

**Causes:**
1. **Local Development**: Netlify Functions don't work with `npm run dev` or `vite`
2. **Missing Deployment**: Function not deployed to Netlify
3. **Build Issue**: Function failed to build

**Solutions:**

#### For Local Development:
```bash
# Install Netlify CLI if not installed
npm install -g netlify-cli

# Run the dev server with Netlify Functions support
netlify dev
```

This will:
- Start Vite dev server
- Start Netlify Functions proxy
- Make `/.netlify/functions/*` endpoints available locally
- Access at: http://localhost:8888 (not localhost:5173)

#### For Production:
1. **Commit and push changes** to trigger Netlify deployment
2. **Check Netlify build logs** for function compilation errors
3. **Verify environment variables** are set in Netlify dashboard:
   - `DATABASE_URL`
   - `VITE_DATABASE_URL` (for client-side queries)

### Issue 2: Empty Claims Array

**Symptoms:**
- API returns `{ success: true, claims: [], count: 0 }`
- No errors in console

**Possible Causes:**
1. **Wrong homeownerId**: Check the UUID being sent
2. **No data in database**: Seed script didn't run or data was cleared
3. **Schema mismatch**: Column name mismatch (`homeowner_id` vs `homeownerId`)

**Debugging Steps:**
```bash
# 1. Re-run seed script
npx tsx scripts/seed-test-data.ts

# 2. Verify data in database (check Neon console or use SQL)
SELECT id, title, homeowner_id FROM claims WHERE homeowner_id = 'c50f858b-6d60-4812-be01-78430717e89c';

# 3. Check console logs in browser
# Look for: "📋 Fetched X claims for homeowner Y"
```

### Issue 3: CORS Error

**Symptoms:**
- `Access-Control-Allow-Origin` error in browser console
- Request blocked before reaching server

**Solution:**
The function already includes CORS headers. If you still see this:
1. Check if request is going to the right domain
2. Verify Netlify deployment URL matches your app URL
3. Check browser DevTools Network tab for actual request URL

## 📊 Debugging Checklist

Use this checklist when claims aren't loading:

- [ ] **Environment Check**
  - [ ] Running `netlify dev` (not `npm run dev`)
  - [ ] Accessing via `localhost:8888` (not `localhost:5173`)
  - [ ] `.env.local` file exists with `DATABASE_URL`

- [ ] **Network Check** (Browser DevTools → Network tab)
  - [ ] Request URL is `/.netlify/functions/get-claims?homeownerId=...`
  - [ ] Request status is 200 (not 404, 500)
  - [ ] Response Content-Type is `application/json`
  - [ ] Response body contains `{ success: true, claims: [...] }`

- [ ] **Console Check** (Browser Console)
  - [ ] Look for: `🔄 Homeowner changed to: <uuid> - Fetching claims now.`
  - [ ] Look for: `📡 Calling: /.netlify/functions/get-claims?homeownerId=...`
  - [ ] Look for: `📊 Response status: 200 OK`
  - [ ] Look for: `✅ Loaded X claims for homeowner Y`
  - [ ] No errors logged

- [ ] **Data Check**
  - [ ] Seed script completed successfully
  - [ ] Test homeowner exists in database
  - [ ] Claims exist for test homeowner
  - [ ] homeownerId in claims matches test homeowner

- [ ] **Function Check** (Netlify Dashboard)
  - [ ] Function is listed in Functions tab
  - [ ] Recent invocations show up
  - [ ] No errors in function logs
  - [ ] Environment variables are set

## 🚀 Quick Test

To quickly test if the API is working:

### Local (with netlify dev):
```bash
# Terminal 1: Start dev server
netlify dev

# Terminal 2: Test the endpoint
curl "http://localhost:8888/.netlify/functions/get-claims?homeownerId=c50f858b-6d60-4812-be01-78430717e89c"
```

Expected response:
```json
{
  "success": true,
  "claims": [
    {
      "id": "...",
      "title": "Roof Leak - Living Room",
      "homeowner_id": "c50f858b-6d60-4812-be01-78430717e89c",
      ...
    }
  ],
  "count": 4,
  "homeownerId": "c50f858b-6d60-4812-be01-78430717e89c"
}
```

### Production:
```bash
curl "https://www.cascadeconnect.app/.netlify/functions/get-claims?homeownerId=c50f858b-6d60-4812-be01-78430717e89c"
```

## 📝 Enhanced Logging

The `App.tsx` fetch logic now includes detailed logging:

1. **Request Logging**: Shows URL being called
2. **Response Logging**: Shows status code, headers, content-type
3. **Error Logging**: Shows response text if non-JSON
4. **Success Logging**: Shows number of claims loaded

Check browser console for these logs to diagnose issues.

## 🔧 Alternative: Use Direct Database Queries (Development Only)

If you need to bypass the API for local development:

1. The app already loads tasks, documents, and messages directly from the database
2. Claims are intentionally loaded via API to ensure proper filtering
3. This is a **security concern** for production (exposes database URL to client)

The proper architecture is:
- ✅ Production: All data via API endpoints
- ⚠️ Development: Can use direct DB queries for speed, but should test with `netlify dev`

## 📚 Related Files

- **API Function**: `netlify/functions/get-claims.ts`
- **Fetch Logic**: `App.tsx` (line ~1310)
- **Seed Script**: `scripts/seed-test-data.ts`
- **Schema**: `db/schema.ts`
- **Redirects**: `public/_redirects`
- **Config**: `netlify.toml`
