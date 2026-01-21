# Removing Standalone CBS Books Directory

## ✅ Pre-Removal Checklist

Before removing the standalone CBS Books directory, verify:

### 1. Data Migration Complete
- [ ] All invoice data migrated to Cascade Connect database
- [ ] All expense data migrated
- [ ] All client data migrated
- [ ] Verified data appears in Cascade Connect invoice modal

**How to verify:**
```bash
npm run diagnose:cbsbooks
```

### 2. Integration Working
- [ ] Invoice modal opens without errors
- [ ] Can create new invoices
- [ ] Can edit existing invoices
- [ ] Can delete invoices
- [ ] Data persists after refresh
- [ ] Performance is acceptable

**How to verify:**
- Open invoice modal in Cascade Connect
- Test creating/editing/deleting invoices
- Check browser console for errors
- See `CBS-BOOKS-VERIFICATION.md` for detailed checklist

### 3. No Dependencies on Standalone
- [ ] No code references standalone directory
- [ ] All functionality works in integrated version
- [ ] No broken imports or links

**What to check:**
- The integrated version is in `lib/cbsbooks/` (keep this!)
- Standalone would be a separate directory/repository (can remove)

## What to Remove

### ✅ Safe to Remove:
- **Standalone CBS Books directory/repository** (if it's a separate project)
- **Standalone CBS Books database** (after migration is complete and verified)
- **Standalone deployment** (if you have one)

### ❌ DO NOT Remove:
- `lib/cbsbooks/` directory (this is the integrated version!)
- `server/cbsbooks.js` (server API routes)
- `netlify/functions/cbsbooks-*.js` (Netlify functions)
- `scripts/migrate-cbsbooks.ts` (keep for reference, but not required)
- Documentation files (keep for reference)

## Step-by-Step Removal

### Step 1: Final Verification

Run these checks one last time:

```bash
# Check database has all data
npm run diagnose:cbsbooks

# Test the integration
# Open invoice modal and verify everything works
```

### Step 2: Backup (Optional but Recommended)

Before removing, consider:
- Exporting a backup of the standalone database (if you want to keep it)
- Taking a snapshot of the standalone directory (if you want to keep it)

### Step 3: Remove Standalone Directory

If the standalone CBS Books is a separate directory/repository:

```bash
# Navigate to parent directory
cd ..

# Remove standalone directory (adjust path as needed)
rm -rf cbs-books-standalone
# OR on Windows:
# rmdir /s cbs-books-standalone
```

### Step 4: Clean Up Environment Variables (Optional)

If you have environment variables pointing to the standalone database:

```bash
# In .env.local, remove or comment out:
# DATABASE_URL_SOURCE=... (standalone database)
# CBS_BOOKS_DATABASE_URL=... (standalone database)
```

Keep:
```bash
# Keep these (Cascade Connect database):
NETLIFY_DATABASE_URL=...
DATABASE_URL=...
VITE_DATABASE_URL=...
```

### Step 5: Archive Standalone Database (Optional)

If you want to keep the standalone database for reference but not use it:

1. Go to Neon dashboard
2. Take a snapshot/backup of the standalone database
3. Optionally pause or archive the database

## What Stays in Cascade Connect

These are part of the integrated version and must stay:

```
lib/cbsbooks/              ← Integrated CBS Books (KEEP!)
├── App.tsx
├── components/
├── services/
└── ...

server/cbsbooks.js         ← Server API routes (KEEP!)

netlify/functions/         ← Netlify functions (KEEP!)
├── cbsbooks-invoices.js
├── cbsbooks-expenses.js
└── cbsbooks-clients.js

scripts/
├── migrate-cbsbooks.ts    ← Keep for reference
├── create-cbsbooks-tables.ts  ← Keep (useful)
└── diagnose-cbsbooks.ts  ← Keep (useful)
```

## After Removal

### Verify Everything Still Works

1. **Test invoice modal:**
   - Open Cascade Connect
   - Navigate to Invoices
   - Verify it loads correctly

2. **Test operations:**
   - Create invoice
   - Edit invoice
   - Delete invoice

3. **Check console:**
   - No errors
   - All API calls succeed

### If Something Breaks

If you removed something and it breaks:

1. **Check imports:**
   - Look for any imports pointing to the standalone directory
   - Update them to point to `lib/cbsbooks/`

2. **Check database:**
   - Verify `NETLIFY_DATABASE_URL` points to Cascade Connect database
   - Run `npm run diagnose:cbsbooks` to check connection

3. **Restore if needed:**
   - If you have a backup, restore the standalone directory
   - Re-run migration if needed

## Summary

✅ **Safe to remove:**
- Standalone CBS Books directory/repository (separate project)
- Standalone database (after migration verified)
- Environment variables pointing to standalone

❌ **Must keep:**
- `lib/cbsbooks/` (integrated version)
- `server/cbsbooks.js` (API routes)
- Netlify functions
- Scripts in `scripts/` directory

## Quick Verification Command

Before removing, run this to ensure everything is migrated:

```bash
npm run diagnose:cbsbooks
```

If it shows:
- ✅ Database connected
- ✅ Tables exist
- ✅ Invoice count matches what you expect

Then you're safe to remove the standalone directory!

