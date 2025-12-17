# Create Missing Tables in Production Database

Your production database is missing the `contractors` and `message_threads` tables. Here are three ways to fix this:

## Option 1: Run SQL Directly in Neon Dashboard (Easiest)

1. Go to your Neon dashboard: https://console.neon.tech
2. Select your production database project
3. Click on **SQL Editor**
4. Copy and paste the SQL from the files below, then click **Run**

### SQL for contractors table:
```sql
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  specialty TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### SQL for message_threads table:
```sql
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  homeowner_id UUID REFERENCES homeowners(id),
  participants JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP DEFAULT NOW(),
  messages JSONB DEFAULT '[]'::jsonb
);
```

## Option 2: Use the Migration Script

1. Get your production database URL from Netlify:
   - Go to Netlify dashboard → Site settings → Environment variables
   - Copy the value of `VITE_DATABASE_URL`

2. Add it to your `.env.local` file:
   ```bash
   VITE_DATABASE_URL=your_production_database_url_here
   ```

3. Run the script:
   ```bash
   npm run create-missing-tables
   ```

## Option 3: Push Entire Schema (Recommended)

This will sync ALL tables and columns to match your code:

1. Get your production database URL from Netlify (same as Option 2)

2. Add it to your `.env.local` file:
   ```bash
   VITE_DATABASE_URL=your_production_database_url_here
   ```

3. Push the schema:
   ```bash
   npm run db:push
   ```

This will create all missing tables and columns, ensuring your database matches your code exactly.

## Verify It's Working

After running any of the above options:

1. Refresh your production app
2. Check the browser console - you should no longer see:
   - "Contractors table not found"
   - "Message threads table not found"
3. Try creating a contractor - it should save to the database without errors
