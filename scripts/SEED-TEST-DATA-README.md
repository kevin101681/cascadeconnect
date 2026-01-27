# Test Data Seeding Script

This script populates the "Test Homeowner" account with rich mock data for testing mobile views and other features.

## What Gets Seeded

The script creates/updates the following data for the Test Homeowner:

### 1. **Tasks (5 Items)**
- ✅ **Completed Tasks (2):**
  - "Submit HVAC Filter Photos" (due last week)
  - "Confirm Cabinet Hardware Repair" (due yesterday)
- 📋 **In-Progress Tasks (3):**
  - "Schedule 11-month Walkthrough" (due next week)
  - "Sign Warranty Paperwork" (due tomorrow)
  - "Review Punch List" (due today)

### 2. **Warranty Claims (4 Items)**
- 🔴 **Open Claim:**
  - "Kitchen Sink Leak" - Status: `SUBMITTED`, Priority: HIGH
  - Includes 2 placeholder images
  
- 📅 **Scheduled Claim:**
  - "Drywall Cracks in Hallway" - Status: `SCHEDULED` for Jan 30
  - Assigned to "Perfect Drywall Co."
  - Includes 3 placeholder images and internal notes
  
- ✅ **Completed Claim:**
  - "Missing Cabinet Handle" - Status: `COMPLETED`
  - Includes 1 image, scheduled date, and completion notes
  
- 📝 **Draft Claim:**
  - "Garage Door Noise" - Status: `OPEN` (Unclassified)

### 3. **Message Thread (1 Thread with 4 Messages)**
- Thread: "Re: Kitchen Sink Leak - Claim #1"
- Conversation between Admin and Homeowner about the sink leak
- Includes scheduling for plumber visit

### 4. **Documents (3 PDFs)**
- "Home Warranty Guide.pdf"
- "Floor Plan.pdf"
- "Signed Contract.pdf"
- All use the W3C dummy PDF for testing

## Usage

### Prerequisites
- Make sure you have `tsx` installed (already in package.json)
- Set your `DATABASE_URL` or `VITE_DATABASE_URL` in `.env.local` or `.env`
- The script will automatically load environment variables from `.env.local` (or `.env` as fallback)

### Run the Script

```bash
npx tsx scripts/seed-test-data.ts
```

Or if you have a package.json script:

```bash
npm run seed-test-data
```

### Environment Variables

The script automatically loads environment variables from:
1. `.env.local` (first priority)
2. `.env` (fallback if `.env.local` doesn't exist)
3. System environment variables (if no .env files found)

It requires one of these environment variables:
- `DATABASE_URL` (preferred for Node.js scripts)
- `VITE_DATABASE_URL` (fallback)

Example `.env.local`:
```
DATABASE_URL=postgresql://user:pass@host/database
```

**Note:** The script will display which file it's loading at startup.

## Test Homeowner Credentials

- **Name:** Test Homeowner
- **Email:** test@cascadebuilderservices.com
- **Phone:** +15551234567
- **Address:** 123 Test Street, Portland, OR 97201
- **Builder:** Cascade Test Builders
- **Project:** Test Project - Lot 42

## What the Script Does

1. **Finds or Creates** the Test Homeowner
   - If not found, creates a new homeowner with the details above
   - If found, uses the existing homeowner ID

2. **Clears Existing Data** (for this homeowner only)
   - Removes old tasks, claims, messages, and documents
   - Ensures a clean slate for testing

3. **Seeds Fresh Data**
   - Creates all the data listed above
   - Uses realistic dates (relative to today)
   - Includes rich metadata (attachments, notes, etc.)

4. **Outputs Summary**
   - Shows what was created
   - Provides the homeowner ID for reference

## Notes

- The script is **idempotent** - you can run it multiple times safely
- It will clear and re-seed data each time
- Placeholder images use placehold.co with descriptive text
- PDF links use the W3C dummy PDF (actual working PDF)
- All dates are relative to "now" for realistic testing

## Testing Features

After running this script, you can test:
- ✅ Mobile Task views (with varied statuses and due dates)
- ✅ Mobile Claims/Warranty views (all claim states)
- ✅ Mobile Messages (thread with conversation)
- ✅ Mobile Documents (PDF viewer)
- ✅ Desktop UI with the same data
- ✅ Filtering (Open/Closed claims, etc.)
- ✅ Status badges and icons
- ✅ Image attachments (placeholder images)
- ✅ Date formatting and sorting

## Troubleshooting

### Error: "DATABASE_URL is required"
Make sure you've set the environment variable in your `.env.local` file.

### Error: "Cannot find module 'tsx'"
Install tsx: `npm install -D tsx`

### Claims not showing up
Check that the `homeownerEmail` in your app matches `test@cascadebuilderservices.com`

### Want to customize the data?
Edit `scripts/seed-test-data.ts` and adjust the mock data arrays.
