# Quick Migration Setup Guide

## Important: Migration Runs Locally

The migration script runs on your **local machine**, not on Netlify. You need to create a `.env.local` file in your project root.

## Step 1: Create `.env.local` File

Create a file named `.env.local` in your project root (same folder as `package.json`).

## Step 2: Get Your Database URLs

You need two database URLs:

### Source Database (Standalone CBS Books)
1. Go to your Neon dashboard
2. Find your **standalone CBS Books database**
3. Copy the connection string

### Target Database (Cascade Connect)
1. Go to your Neon dashboard  
2. Find your **Cascade Connect database**
3. Copy the connection string
   - This is usually the same as your `VITE_DATABASE_URL`

## Step 3: Add to `.env.local`

Add these lines to your `.env.local` file:

```bash
# Source: Your standalone CBS Books database
DATABASE_URL_SOURCE=postgresql://user:password@host/cbs_books?sslmode=require

# Target: Your Cascade Connect database (usually same as VITE_DATABASE_URL)
DATABASE_URL_TARGET=postgresql://user:password@host/cascade_connect?sslmode=require
```

**Example:**
```bash
DATABASE_URL_SOURCE=postgresql://kevin:abc123@ep-cool-name-123456.us-east-2.aws.neon.tech/cbs_books?sslmode=require
DATABASE_URL_TARGET=postgresql://kevin:abc123@ep-cool-name-789012.us-east-2.aws.neon.tech/cascade_connect?sslmode=require
```

## Step 4: Run Migration

```bash
npm run migrate:cbsbooks
```

## Alternative: Pass URLs Directly

If you don't want to create `.env.local`, you can pass the URLs directly:

**Windows PowerShell:**
```powershell
$env:DATABASE_URL_SOURCE="postgresql://..."; $env:DATABASE_URL_TARGET="postgresql://..."; npm run migrate:cbsbooks
```

**Windows CMD:**
```cmd
set DATABASE_URL_SOURCE=postgresql://... && set DATABASE_URL_TARGET=postgresql://... && npm run migrate:cbsbooks
```

**Mac/Linux:**
```bash
DATABASE_URL_SOURCE=postgresql://... DATABASE_URL_TARGET=postgresql://... npm run migrate:cbsbooks
```

## After Migration

Once migration is complete:
1. Update your `.env.local` to set `NETLIFY_DATABASE_URL` to your Cascade Connect database
2. You can remove `DATABASE_URL_SOURCE` and `DATABASE_URL_TARGET` from `.env.local` after migration
3. Restart your server: `npm run dev`

## Note About Netlify

- **Netlify environment variables** are for your deployed app, not for local scripts
- The migration script runs **locally** on your computer
- After migration, you can update Netlify environment variables if needed, but the migration itself happens locally


