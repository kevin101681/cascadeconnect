# CBS Books Migration Guide

This guide will help you migrate CBS Books data from your standalone CBS Books database to your Cascade Connect database.

## Prerequisites

1. **Access to both databases:**
   - Source: Your standalone CBS Books Neon database URL
   - Target: Your Cascade Connect Neon database URL

2. **Environment variables set:**
   - `DATABASE_URL_SOURCE` or `CBS_BOOKS_DATABASE_URL` - Your standalone CBS Books database
   - `DATABASE_URL_TARGET` or `VITE_DATABASE_URL` - Your Cascade Connect database

## Migration Steps

### 1. Set Environment Variables

Add these to your `.env.local` file:

```bash
# Source database (standalone CBS Books)
DATABASE_URL_SOURCE=postgresql://user:password@host/cbs_books?sslmode=require

# Target database (Cascade Connect)
DATABASE_URL_TARGET=postgresql://user:password@host/cascade_connect?sslmode=require
```

Or use the alternative names:
- `CBS_BOOKS_DATABASE_URL` for source
- `VITE_DATABASE_URL` or `DATABASE_URL` for target

### 2. Run the Migration Script

```bash
npm run migrate:cbsbooks
```

The script will:
1. Connect to both databases
2. Create the CBS Books tables (`invoices`, `expenses`, `clients`) in the Cascade Connect database if they don't exist
3. Migrate all data from CBS Books to Cascade Connect
4. Skip any duplicate records (based on ID)
5. Show a summary of what was migrated

### 3. Verify Migration

After migration, verify the data:

1. **Check table counts:**
   ```sql
   SELECT COUNT(*) FROM invoices;
   SELECT COUNT(*) FROM expenses;
   SELECT COUNT(*) FROM clients;
   ```

2. **Test in Cascade Connect:**
   - Open the Invoices modal in Cascade Connect
   - Verify invoices, expenses, and clients appear correctly

### 4. Update Environment Variables

After successful migration, update your `.env.local`:

```bash
# Remove or comment out DATABASE_URL_SOURCE
# DATABASE_URL_SOURCE=...

# Ensure your main database URL points to Cascade Connect
NETLIFY_DATABASE_URL=postgresql://user:password@host/cascade_connect?sslmode=require
# Or
DATABASE_URL=postgresql://user:password@host/cascade_connect?sslmode=require
```

### 5. Restart Your Server

Restart your development server so it picks up the new database connection:

```bash
npm run dev
```

## What Gets Migrated

The script migrates three main tables:

1. **invoices** - All invoice records with:
   - Invoice numbers, client info, dates, totals, status
   - Payment links, check numbers
   - Invoice items (stored as JSONB)

2. **expenses** - All expense records with:
   - Date, payee, category, amount, description

3. **clients** - All client/builder records with:
   - Company name, email, address information

## Safety Features

- **Idempotent**: Safe to run multiple times - won't create duplicates
- **Conflict handling**: Uses `ON CONFLICT DO NOTHING` to skip existing records
- **Error handling**: Continues migration even if individual records fail
- **Confirmation prompt**: Asks for confirmation before starting

## Troubleshooting

### Error: "Database configuration is missing"
- Make sure you've set `DATABASE_URL_SOURCE` and `DATABASE_URL_TARGET` in your `.env.local`

### Error: "Connection refused" or "SSL error"
- Verify your database URLs are correct
- Check that both databases allow connections from your IP
- Ensure SSL is enabled (`?sslmode=require`)

### Error: "Table already exists"
- This is normal if tables already exist - the script uses `CREATE TABLE IF NOT EXISTS`

### Data not appearing after migration
- Check that `NETLIFY_DATABASE_URL` or `DATABASE_URL` points to the Cascade Connect database
- Restart your server
- Check browser console for any API errors

## After Migration

Once migration is complete and verified:

1. ✅ Update environment variables to use Cascade Connect database
2. ✅ Restart your server
3. ✅ Test CBS Books functionality in Cascade Connect
4. ✅ (Optional) Disable or archive your standalone CBS Books database

## Notes

- The migration script preserves all data including UUIDs
- It's safe to run multiple times - duplicates are automatically skipped
- The script creates tables if they don't exist, so you don't need to manually create them
- All timestamps and relationships are preserved


