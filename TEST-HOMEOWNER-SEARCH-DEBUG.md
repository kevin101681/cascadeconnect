# Test Homeowner Not Appearing in Search - Troubleshooting Guide

## 🔍 Issue
"Test Homeowner" doesn't appear when searching on the homeowner search page at `http://localhost:8888`.

## 🧪 Diagnosis Steps

### Step 1: Verify Data Exists in Database

Run the verification script:
```bash
npx tsx scripts/verify-test-homeowner.ts
```

**Expected Output:**
```
✅ Test Homeowner found!
   ID: c50f858b-6d60-4812-be01-78430717e89c
   Name: Test Homeowner
   Email: test@cascadebuilderservices.com
   ...

📋 Claims: 4 found
📋 Tasks: 5 found
📄 Documents: 3 found
💬 Message Threads: 1 found
```

**If NOT found:** Re-run the seed script:
```bash
npx tsx scripts/seed-test-data.ts
```

### Step 2: Check Browser Console

Open your browser's developer console (F12) and look for:

1. **Database Connection Logs:**
   ```
   Database configuration: { isDbConfigured: true, ... }
   ✅ Database connection initialized
   ✅ Database connection verified
   ```

2. **Homeowners Load Logs:**
   ```
   👥 Loaded homeowners from database: X homeowners
   ```

3. **Search Logs:**
   When you type in the search box, you should see the filtered results.

### Step 3: Verify App is Loading Fresh Data

The app loads homeowners **on mount** from the database. If you seeded data after the app loaded:

**Solution: Hard Refresh the Browser**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

This forces the app to re-run the data loading logic.

### Step 4: Check Database Connection

In browser console, look for:
```javascript
// Good:
Database configuration: {
  isDbConfigured: true,
  hasEnvUrl: true,
  connectionStringLength: 180,
  connectionStringPrefix: "postgresql://neondb_..."
}

// Bad:
⚠️ No valid VITE_DATABASE_URL found. App will default to Local Storage/Mock mode.
```

**If "Bad":** The database isn't configured in the browser. Check:
1. Is `VITE_DATABASE_URL` in `.env.local`?
2. Did you restart `netlify dev` after adding it?

## 🛠️ Common Fixes

### Fix 1: Hard Refresh Browser
**Problem:** App cached old data before seed script ran.

**Solution:**
```bash
# In browser:
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Fix 2: Restart Netlify Dev
**Problem:** Environment variables not loaded.

**Solution:**
```bash
# Kill the current server (Ctrl+C)
netlify dev
```

Then refresh the browser.

### Fix 3: Check Search Functionality

The search filters homeowners by:
- Name (e.g., "test", "homeowner")
- Email (e.g., "test@cascade")
- Job Name (e.g., "test project", "lot 42")

**Test searches:**
- Type: `test` → Should find "Test Homeowner"
- Type: `homeowner` → Should find "Test Homeowner"  
- Type: `cascade` → Should find "Test Homeowner" (builder name)
- Type: `lot 42` → Should find "Test Homeowner" (job name)

### Fix 4: Verify Database Query

Open browser console and run:
```javascript
// Check if homeowners are loaded
console.log('Homeowners in state:', window.__appState?.homeowners);
```

If empty or undefined:
1. Database connection failed
2. Query failed  
3. Data not in database

### Fix 5: Check Network Tab

1. Open DevTools → Network tab
2. Refresh the page
3. Look for any failed requests
4. Check if database queries are succeeding

## 📊 How Search Works

The search is implemented in `App.tsx` (line ~1567):

```typescript
const searchResults = searchQuery 
  ? availableHomeowners.filter(h => 
      (h.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (h.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.jobName || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  : [];
```

**Requirements:**
1. `searchQuery` must have a value (you typed something)
2. `availableHomeowners` must contain the homeowners from database
3. Search is case-insensitive
4. Matches partial strings (e.g., "test" matches "Test Homeowner")

## ✅ Quick Verification Checklist

- [ ] **Seed script completed successfully**
  - Run: `npx tsx scripts/seed-test-data.ts`
  - See: `✅ Test Data Seeding Complete!`

- [ ] **Verification script confirms data**
  - Run: `npx tsx scripts/verify-test-homeowner.ts`
  - See: `✅ Test Homeowner found!`

- [ ] **Netlify dev is running**
  - Terminal shows: `⬥ Loaded function get-claims`
  - Access via: `http://localhost:8888` (NOT 5173)

- [ ] **Browser hard refreshed**
  - Press: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
  - Clears cached data

- [ ] **Database connection verified in console**
  - See: `✅ Database connection initialized`
  - See: `👥 Loaded homeowners from database: X homeowners`

- [ ] **Search field works**
  - Type: `test`
  - See: Dropdown with "Test Homeowner" appears

## 🔧 Still Not Working?

If the homeowner still doesn't appear after all fixes:

### Debug in Browser Console

```javascript
// 1. Check database configuration
console.log('DB Configured:', window.localStorage.getItem('dbConfigured'));

// 2. Check if homeowners were loaded
// (You'll need to inspect the React component state)

// 3. Try searching manually
const homeowners = [/* your homeowners array */];
const query = 'test';
const results = homeowners.filter(h => 
  (h.name || '').toLowerCase().includes(query.toLowerCase())
);
console.log('Manual search results:', results);
```

### Check Database Directly

Use Neon console or SQL client:
```sql
SELECT id, name, email, "jobName", builder 
FROM homeowners 
WHERE name = 'Test Homeowner';
```

Should return:
```
id                                   | name           | email                              | jobName              | builder
c50f858b-6d60-4812-be01-78430717e89c | Test Homeowner | test@cascadebuilderservices.com    | Test Project - Lot 42 | Cascade Test Builders
```

### Check App Data Loading

Add temporary logging to `App.tsx` (line ~591):
```typescript
console.log('📊 Loaded homeowners:', mappedHomeowners);
setHomeowners(mappedHomeowners);
```

Then refresh and check console for the mapped homeowners array.

## 📝 Summary

**Most Common Cause:** App loaded before seed script ran, and browser wasn't refreshed.

**Solution:** Hard refresh browser (`Ctrl + Shift + R`)

**Verification:** 
1. Run `npx tsx scripts/verify-test-homeowner.ts`
2. Hard refresh browser
3. Type "test" in search
4. See "Test Homeowner" in dropdown

---

**If still having issues, check:**
- Browser console for errors
- Network tab for failed requests
- Database contains the data (use verification script)
- `netlify dev` is running (not `npm run dev`)
