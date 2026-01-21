# PDF Reports App Integration - Discussion Record

**Date:** Current Session  
**Status:** Pending Decision - User will decide on merge approach later

## Context

User has a second React app (PDF Reports App) that generates PDF reports for homeowners. They want to:
1. Link homeowner accounts from Cascade Connect to the PDF Reports App
2. Automatically create users in the PDF Reports App based on homeowners in Cascade Connect

## What Has Been Created

### 1. Sync Service (`services/reportAppSync.ts`)
- `createReportAppUser()` - Creates a user in PDF Reports App
- `updateReportAppUser()` - Updates user when homeowner data changes
- `checkReportAppLink()` - Checks if homeowner is already linked
- `getReportAppLink()` - Generates deep link URL to PDF Reports App

### 2. Integration Component (`components/ReportAppIntegration.tsx`)
- UI component for linking homeowners to PDF Reports App
- Shows link status (linked/not linked)
- Provides "Link", "Sync Update", and "Open Reports" actions
- Handles loading states and error messages

### 3. Database Schema Updates (`db/schema.ts`)
Added to `homeowners` table:
- `reportAppUserId` (text) - ID of user in PDF Reports App
- `reportAppLinked` (boolean) - Whether homeowner is linked
- `reportAppLinkedAt` (timestamp) - When link was created

### 4. Type Updates (`types.ts`)
Added to `Homeowner` interface:
- `reportAppUserId?: string`
- `reportAppLinked?: boolean`
- `reportAppLinkedAt?: Date`

### 5. Documentation
- `INTEGRATION-GUIDE.md` - Comprehensive integration guide
- `INTEGRATION-QUICK-START.md` - Quick setup instructions

## Integration Options Discussed

### Option 1: Separate Apps with API Integration (Currently Implemented)
- **Status:** ✅ Code created and ready
- **Approach:** Keep apps separate, communicate via REST API
- **Pros:** 
  - Apps remain independent
  - Can deploy separately
  - Clear separation of concerns
- **Cons:** 
  - Requires API setup
  - Network dependency
  - CORS configuration needed

### Option 2: Monorepo Merge
- **Status:** ⏸️ Not implemented - discussed as option
- **Approach:** Merge both apps into single codebase using monorepo tool
- **Tools suggested:** Turborepo, Nx, Lerna, or npm workspaces
- **Structure:**
  ```
  cascade-connect/
  ├── apps/
  │   ├── cascade-connect/  (current app)
  │   └── pdf-reports/     (new app)
  ```
- **Pros:**
  - Shared code and types
  - Single deployment
  - Easier development
- **Cons:**
  - Larger codebase
  - More complex build setup

### Option 3: Direct Integration (Single App)
- **Status:** ⏸️ Not implemented - discussed as option
- **Approach:** Add PDF report generation directly into Cascade Connect
- **Pros:**
  - Single app to maintain
  - No API needed
  - Simpler architecture
- **Cons:**
  - Larger app size
  - Mixing concerns

## Current Implementation Details

### Environment Variables Needed
```env
VITE_REPORT_APP_API_URL=http://localhost:3001/api
VITE_REPORT_APP_URL=http://localhost:3001
VITE_REPORT_APP_API_KEY=your_api_key_here
VITE_REPORT_APP_AUTO_SYNC=false
```

### Required API Endpoints (for Option 1)
The PDF Reports App needs to implement:
1. **POST `/api/users`** - Create user from homeowner data
2. **PUT `/api/users/:userId`** - Update user when homeowner changes
3. **GET `/api/users/by-cascade-id/:homeownerId`** - Check if user exists

### Database Migration
Run `npm run db:push` to add the new columns to the homeowners table.

## What Still Needs to Be Decided

1. **Integration Approach:** Which option (1, 2, or 3) to use?
2. **PDF Reports App Details:**
   - What framework/stack is it using? (React, Next.js, etc.)
   - Does it already have an API?
   - What authentication does it use?
3. **User Creation Strategy:**
   - Should users be created automatically on homeowner creation?
   - Or manually via the integration component?
4. **Authentication:**
   - Should both apps share Clerk authentication?
   - Or use separate auth systems with API keys?
5. **UI Placement:**
   - Where should the integration component be displayed?
   - In homeowner detail view? Enrollment form? Both?

## Next Steps (When Ready)

1. **If choosing Option 1 (Separate Apps):**
   - Set up API endpoints in PDF Reports App
   - Configure environment variables
   - Add integration component to UI
   - Test linking and syncing

2. **If choosing Option 2 (Monorepo):**
   - Set up monorepo structure
   - Move PDF Reports App into monorepo
   - Configure shared dependencies
   - Set up build pipeline

3. **If choosing Option 3 (Direct Integration):**
   - Copy PDF generation code into Cascade Connect
   - Create new route/view for reports
   - Integrate with homeowner data
   - Add navigation links

## Files Created/Modified

### New Files:
- `services/reportAppSync.ts` - API sync service
- `components/ReportAppIntegration.tsx` - UI component
- `INTEGRATION-GUIDE.md` - Full documentation
- `INTEGRATION-QUICK-START.md` - Quick start guide
- `INTEGRATION-DISCUSSION-RECORD.md` - This file

### Modified Files:
- `types.ts` - Added report app fields to Homeowner interface
- `db/schema.ts` - Added report app columns to homeowners table

## Questions for User (When Resuming)

1. What is the tech stack of your PDF Reports App?
2. Do you prefer keeping apps separate or merging them?
3. Should user creation be automatic or manual?
4. What authentication system does the PDF Reports App use?
5. Where should the integration UI be placed?

## Notes

- All code is ready for Option 1 (separate apps with API)
- Can easily pivot to Option 2 or 3 if preferred
- Database schema supports all options
- Integration component is reusable regardless of approach

---

**To continue:** Review this document and decide on integration approach, then we can proceed with implementation.






