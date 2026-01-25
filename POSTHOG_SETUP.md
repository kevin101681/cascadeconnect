# PostHog Analytics Setup Guide

This guide will help you configure PostHog analytics for the Backend Dashboard's PostHog Tab.

## Prerequisites

You need the following PostHog credentials:
- Personal API Key
- Project ID

## Step 1: Get Your Personal API Key

1. Log in to your PostHog dashboard at https://us.i.posthog.com (or your custom host)
2. Click your avatar icon in the **bottom left corner**
3. Go to **Account settings**
4. Select the **Personal API Keys** tab
5. Click **Create personal API key**
6. Add a descriptive name (e.g., "Cascade Connect Backend Dashboard")
7. **Copy the key immediately** - it's only shown once!

Your key will look like: `phx_IFdqdH62fKoax8x17bwu8gujE0tsTBZRvNmlMJ7eZxz`

## Step 2: Find Your Project ID

1. In PostHog dashboard, use the **project switcher** in the middle of the top bar
2. Go to **Project settings**
3. Your Project ID is displayed in the settings page or visible in API URLs

Your Project ID is typically a numeric value (e.g., `12345`)

## Step 3: Update Environment Variables

Add the following to your `.env.local` file:

```bash
# PostHog Analytics API Configuration
VITE_POSTHOG_PROJECT_ID=your_project_id_here
VITE_POSTHOG_PERSONAL_API_KEY=your_personal_api_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

**Note:** You already have `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in your `.env.local` file. These are used for the client-side PostHog tracking. The new variables (`VITE_POSTHOG_PROJECT_ID` and `VITE_POSTHOG_PERSONAL_API_KEY`) are for server-side API queries.

## Step 4: Required PostHog Events

For the analytics to work properly, ensure your application tracks these events:

### 1. `claim_started`
Track when a homeowner opens the new claim modal/form.

```typescript
// In your NewClaimForm component
import posthog from 'posthog-js';

useEffect(() => {
  posthog.capture('claim_started', {
    device_type: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
  });
}, []);
```

### 2. `claim_photo_uploaded`
Track when a photo is successfully uploaded.

```typescript
// In your upload service or component
posthog.capture('claim_photo_uploaded', {
  file_size: file.size,
});
```

### 3. `claim_submitted`
Track when a claim is successfully saved to the database.

```typescript
// After successful DB write
posthog.capture('claim_submitted', {
  claim_id: newClaim.id,
});
```

**Important:** PostHog automatically captures `$device_type`, `$browser`, and `$browser_version` properties, so you don't need to manually include them.

## Step 5: Restart Development Server

After updating `.env.local`, restart your development server:

```bash
npm run dev
```

## Verification

1. Navigate to Backend Dashboard
2. Click on the **PostHog** tab
3. You should see real data loading from your PostHog instance
4. If you see an error, check the browser console for detailed error messages

## Troubleshooting

### "PostHog not configured" Error
- Verify that `VITE_POSTHOG_PROJECT_ID` and `VITE_POSTHOG_PERSONAL_API_KEY` are set in `.env.local`
- Make sure there are no spaces or quotes around the values
- Restart your development server after adding the variables

### "PostHog API error: 401" or "403"
- Your Personal API Key may be invalid or expired
- Generate a new Personal API Key from PostHog dashboard
- Ensure the API key has the `insight:read` scope

### "PostHog API error: 404"
- Your Project ID may be incorrect
- Double-check the Project ID in your PostHog project settings

### No Data Showing
- Ensure you have tracked the required events (`claim_started`, `claim_photo_uploaded`, `claim_submitted`)
- Check that events have been sent to PostHog in the last 30 days
- Verify your events in PostHog dashboard under **Events** section

## API Structure

The service (`services/posthogAnalyticsService.ts`) makes three types of queries:

1. **Device Volume** - Trend query for `claim_submitted` events broken down by `$device_type`
2. **Funnel Analysis** - Funnel query tracking the conversion flow through claim submission steps
3. **Browser Stats** - Trend query for unique users broken down by `$browser`

All queries use the PostHog Query API endpoint:
```
POST https://us.i.posthog.com/api/projects/{project_id}/query/
Authorization: Bearer {personal_api_key}
```

## Security Notes

- Never commit `.env.local` to version control
- The Personal API Key grants read access to your PostHog data
- Consider creating a dedicated API key with minimal scopes for production use
- Rotate API keys periodically for security

## Additional Resources

- [PostHog API Documentation](https://posthog.com/docs/api)
- [PostHog Insights API Reference](https://posthog.com/docs/api/insights)
- [Creating Personal API Keys](https://posthog.com/tutorials/api-get-insights-persons)
