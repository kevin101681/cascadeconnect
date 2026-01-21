# Quick Fix: No Invoices Showing

## Step-by-Step Solution

### 1. Run Diagnostic (Recommended First Step)

```bash
npm run diagnose:cbsbooks
```

This will tell you:
- ✅ If database is connected
- ✅ If tables exist
- ✅ How many invoices are in the database
- ❌ What's missing

### 2. Create Tables (If Missing)

If the diagnostic shows tables don't exist:

```bash
npm run create-cbsbooks-tables
```

### 3. Check Browser Console

Open the invoice modal and check the browser console (F12). You should see:

```
CBS Books: Loading data...
Fetching invoices from API: /api/cbsbooks/invoices
✅ Successfully parsed JSON, invoice count: X
CBS Books: Data loaded: { invoices: X, expenses: Y, clients: Z }
```

**If you see errors:**
- "relation 'invoices' does not exist" → Run `npm run create-cbsbooks-tables`
- "Cannot connect to server" → Make sure server is running (`npm run server`)
- "API returned HTML" → Check server is running on port 3000

### 4. Check localStorage Data

If you had invoice data before, it might be in localStorage. Open browser console and run:

```javascript
// Check for localStorage data
const invoices = JSON.parse(localStorage.getItem('cbs_invoices') || '[]');
console.log('localStorage invoices:', invoices.length);
console.log('Data:', invoices);

// If data exists, it should migrate automatically when you open the invoice modal
// Check console for: "CBS Books: Migrating localStorage data to database..."
```

### 5. Test API Directly

Open in browser or run in terminal:

```bash
# Browser
http://localhost:3000/api/cbsbooks/invoices

# Terminal
curl http://localhost:3000/api/cbsbooks/invoices
```

**Expected response:**
- Empty database: `[]`
- With data: `[{...invoice objects...}]`
- Error: Check server logs

### 6. Verify Server is Running

Make sure you see in terminal:
```
Server running on port 3000
```

If not, start it:
```bash
npm run dev
```

## Common Issues

### Issue: "No invoices found" message shows

**This is normal if:**
- Database is empty (no invoices created yet)
- All invoices are filtered out by search/status filter

**Solution:**
- Create a test invoice using the "New Invoice" button
- Clear any search filters
- Check status filter is set to "All"

### Issue: Console shows "API failed, using mock data"

**This means:**
- API endpoint is not accessible
- Server might not be running
- Proxy might not be configured

**Solution:**
1. Check server is running: `npm run server`
2. Check Vite proxy in `vite.config.ts` (should proxy `/api` to `http://localhost:3000`)
3. Test API directly: `http://localhost:3000/api/cbsbooks/invoices`

### Issue: Tables exist but no data

**This means:**
- Database is empty (normal for new setup)
- Data might be in localStorage and needs migration

**Solution:**
1. Open invoice modal (migration happens automatically)
2. Or manually migrate (see troubleshooting guide)
3. Or create a new invoice to test

## Still Not Working?

1. **Run diagnostic:** `npm run diagnose:cbsbooks`
2. **Check browser console** for errors
3. **Check server terminal** for errors
4. **Verify database URL** in `.env.local`
5. **Test API endpoint** directly

## Quick Test

Create a test invoice:
1. Open invoice modal
2. Click "New Invoice" (or the + button)
3. Fill in:
   - Client Name: "Test Client"
   - Total: 100
   - Add an item
4. Click Save
5. Invoice should appear in the list immediately

If this works, the system is functioning correctly - you just need to migrate or create invoices.

