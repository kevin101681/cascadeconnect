# CBS Books Troubleshooting Guide

## Invoice Data Not Showing in Dev Preview

If invoice data doesn't appear in the dev preview, follow these steps:

### Step 1: Check if Database Tables Exist

The most common issue is that the database tables haven't been created yet. Run:

```bash
npm run create-cbsbooks-tables
```

This will create the `invoices`, `expenses`, and `clients` tables in your database.

### Step 2: Verify Server is Running

Make sure both the Vite dev server and Express server are running:

```bash
npm run dev
```

This should start:
- Vite dev server on `http://localhost:5173`
- Express server on `http://localhost:3000`

### Step 3: Check Database Connection

Verify your database URL is set in `.env.local`:

```bash
NETLIFY_DATABASE_URL=postgresql://user:password@host/database?sslmode=require
# OR
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### Step 4: Check Browser Console

Open the browser console (F12) and look for:
- API errors
- Network errors
- Console logs from CBS Books

Common errors and solutions:

#### Error: "relation 'invoices' does not exist"
**Solution:** Run `npm run create-cbsbooks-tables`

#### Error: "Cannot connect to server" or "ECONNREFUSED"
**Solution:** 
- Make sure the Express server is running (`npm run server`)
- Check that port 3000 is not in use by another application

#### Error: "Database configuration is missing"
**Solution:** Set `NETLIFY_DATABASE_URL` or `DATABASE_URL` in your `.env.local` file

#### Error: "API returned HTML instead of JSON"
**Solution:** 
- Check that the Vite proxy is configured correctly in `vite.config.ts`
- Verify the server is running on port 3000

### Step 5: Check localStorage Data

If you have invoice data in localStorage that's not showing:

1. Open browser console
2. Check localStorage:
   ```javascript
   console.log('Invoices:', JSON.parse(localStorage.getItem('cbs_invoices') || '[]'));
   ```

3. If data exists, it should automatically migrate when you open the invoice modal
4. Check the console for migration logs

### Step 6: Manual Migration (if needed)

If automatic migration didn't work, you can manually trigger it:

```javascript
// Run in browser console
async function migrateLocalStorage() {
  const STORAGE_KEYS = {
    INVOICES: 'cbs_invoices',
    EXPENSES: 'cbs_expenses',
    CLIENTS: 'cbs_clients',
  };

  const invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
  const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || '[]');
  const clients = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]');

  if (invoices.length === 0 && expenses.length === 0 && clients.length === 0) {
    console.log('No localStorage data to migrate');
    return;
  }

  try {
    const response = await fetch('/api/cbsbooks/migrate-localstorage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices, expenses, clients })
    });

    const result = await response.json();
    console.log('Migration result:', result);
    
    localStorage.setItem('cbs_localstorage_migrated', 'true');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateLocalStorage();
```

### Step 7: Verify API Endpoint

Test the API endpoint directly:

```bash
curl http://localhost:3000/api/cbsbooks/invoices
```

Or open in browser: `http://localhost:3000/api/cbsbooks/invoices`

You should get a JSON array (even if empty: `[]`).

### Common Issues

#### Tables Auto-Created But Still Empty

The server will automatically create tables if they don't exist, but if you have data in localStorage, you need to:
1. Make sure the server is running
2. Open the invoice modal
3. The migration should happen automatically

#### Data Shows in localStorage But Not in Database

This means:
- The API wasn't available when invoices were created
- The migration hasn't run yet

**Solution:** Open the invoice modal - migration happens automatically on first load.

#### Server Running But API Returns 404

Check:
1. Is the server actually running? Check terminal for "Server running on port 3000"
2. Is the route registered? Check `server/index.js` for `app.use("/api/cbsbooks", cbsbooksRouter)`
3. Is the proxy configured? Check `vite.config.ts` for proxy settings

### Still Not Working?

1. **Check server logs** - Look for errors in the terminal where the server is running
2. **Check browser network tab** - See if API requests are being made and what responses you get
3. **Verify database connection** - Try connecting to your database directly
4. **Check environment variables** - Make sure all required variables are set

### Quick Test

Run this in browser console to test the API:

```javascript
fetch('/api/cbsbooks/invoices')
  .then(r => r.json())
  .then(data => console.log('Invoices:', data))
  .catch(err => console.error('Error:', err));
```

If this works, the API is accessible. If it fails, check the server and proxy configuration.

