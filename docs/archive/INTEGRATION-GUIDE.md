# PDF Reports App Integration Guide

This guide explains how to integrate your PDF Reports App with Cascade Connect to automatically sync homeowners and create user accounts.

## Overview

The integration allows you to:
1. **Link homeowners** from Cascade Connect to your PDF Reports App
2. **Automatically create users** in the PDF Reports App when linking
3. **Sync updates** when homeowner information changes
4. **Deep link** directly to a homeowner's reports in the PDF Reports App

## Setup Options

### Option 1: Separate Apps with API Integration (Recommended)

Keep both apps separate and communicate via API. This is the most flexible approach.

#### Step 1: Configure Environment Variables

Add these to your `.env.local` file:

```env
# PDF Reports App Configuration
VITE_REPORT_APP_API_URL=http://localhost:3001/api
VITE_REPORT_APP_URL=http://localhost:3001
VITE_REPORT_APP_API_KEY=your_api_key_here
VITE_REPORT_APP_AUTO_SYNC=false
```

#### Step 2: Set Up API Endpoints in PDF Reports App

Your PDF Reports App needs to expose these endpoints:

**POST `/api/users`** - Create a new user
```json
Request Body:
{
  "email": "homeowner@example.com",
  "name": "John Doe",
  "phone": "555-1234",
  "address": "123 Main St, City, State 12345",
  "builder": "Builder Name",
  "cascadeConnectHomeownerId": "uuid-from-cascade-connect"
}

Response:
{
  "id": "user-id-in-reports-app",
  "email": "homeowner@example.com",
  "name": "John Doe",
  "cascadeConnectHomeownerId": "uuid-from-cascade-connect",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**PUT `/api/users/:userId`** - Update an existing user
```json
Request Body:
{
  "email": "homeowner@example.com",
  "name": "John Doe Updated",
  "phone": "555-1234",
  "address": "123 Main St, City, State 12345",
  "builder": "Builder Name"
}

Response:
{
  "success": true,
  "message": "User updated successfully"
}
```

**GET `/api/users/by-cascade-id/:homeownerId`** - Check if user exists
```json
Response:
{
  "id": "user-id-in-reports-app",
  "email": "homeowner@example.com",
  "cascadeConnectHomeownerId": "uuid-from-cascade-connect"
}
```

#### Step 3: Add Integration Component to Cascade Connect

The `ReportAppIntegration` component is already created. Add it to your homeowner management view:

```tsx
import ReportAppIntegration from './components/ReportAppIntegration';

// In your homeowner detail/edit view:
<ReportAppIntegration 
  homeowner={homeowner}
  onUpdateHomeowner={handleUpdateHomeowner}
/>
```

### Option 2: Merge Apps into Monorepo

If you want to merge both apps into a single codebase:

1. **Copy PDF Reports App code** into a new directory:
   ```
   cascade-connect/
   ├── apps/
   │   ├── cascade-connect/  (current app)
   │   └── pdf-reports/     (new app)
   ```

2. **Use a monorepo tool** like:
   - **Turborepo** (recommended)
   - **Nx**
   - **Lerna**
   - Or simple npm workspaces

3. **Share types and utilities** between apps

4. **Set up shared authentication** using Clerk

### Option 3: Direct Integration (Single App)

If you want to add PDF report generation directly to Cascade Connect:

1. **Copy PDF generation code** from your PDF Reports App
2. **Add a new route/view** in Cascade Connect for reports
3. **Integrate report generation** into the homeowner dashboard

## Database Migration

After adding the integration fields to the schema, run:

```bash
npm run db:push
```

This will add the following columns to the `homeowners` table:
- `report_app_user_id` - ID of user in PDF Reports App
- `report_app_linked` - Boolean flag for link status
- `report_app_linked_at` - Timestamp of when link was created

## Usage

### Linking a Homeowner

1. Navigate to a homeowner's detail page
2. Find the "PDF Reports App Integration" section
3. Click "Link to PDF Reports App"
4. The system will:
   - Create a user in the PDF Reports App
   - Store the link information
   - Show the link status

### Syncing Updates

When homeowner information changes:
1. Click "Sync Update" in the integration section
2. The PDF Reports App user will be updated with the latest information

### Opening Reports

Click "Open Reports" to open the homeowner's reports in the PDF Reports App in a new tab.

## API Authentication

If your PDF Reports App requires authentication, you can:

1. **Use API Keys**: Set `VITE_REPORT_APP_API_KEY` in environment variables
2. **Use JWT Tokens**: Modify `reportAppSync.ts` to include JWT tokens
3. **Use Clerk**: Share Clerk session tokens between apps

Example with JWT:
```typescript
// In reportAppSync.ts
const token = await getClerkToken(); // Get from Clerk
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
}
```

## Troubleshooting

### "Failed to create user" Error

- Check that `VITE_REPORT_APP_API_URL` is correct
- Verify the API endpoint is accessible
- Check API authentication (API key or token)
- Review browser console for detailed error messages

### "Network error" 

- Ensure the PDF Reports App is running
- Check CORS settings in the PDF Reports App
- Verify the API URL is reachable from the browser

### Link Status Not Updating

- Check browser console for errors
- Verify database connection
- Ensure `onUpdateHomeowner` callback is working

## Security Considerations

1. **API Keys**: Store API keys in environment variables, never in code
2. **CORS**: Configure CORS properly in the PDF Reports App
3. **Authentication**: Use secure authentication between apps
4. **Data Validation**: Validate all data before syncing

## Next Steps

1. Set up your PDF Reports App API endpoints
2. Configure environment variables
3. Test the integration with a single homeowner
4. Add the integration component to your UI
5. Test syncing and updates

For questions or issues, check the console logs and API responses for detailed error messages.






