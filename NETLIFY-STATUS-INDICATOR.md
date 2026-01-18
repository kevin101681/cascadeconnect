# Netlify Status Indicator - Dev Tool

## Overview
A subtle visual indicator in the Dashboard Header that shows the current Netlify deploy status in real-time. Uses a backend proxy to avoid CORS restrictions.

## Implementation Summary

### Files Created/Modified

1. **Created:** `netlify/functions/deploy-status.ts`
   - Backend proxy that checks Netlify badge API
   - Reads `Content-Disposition` header server-side (no CORS issues)
   - Returns simple JSON with status to frontend

2. **Created:** `components/layout/NetlifyStatusIndicator.tsx`
   - Frontend component that polls backend function
   - Auto-hides if `VITE_NETLIFY_SITE_ID` is not set
   - Polls every 2 seconds for rapid updates

3. **Modified:** `components/Layout.tsx`
   - Added import for `NetlifyStatusIndicator`
   - Placed indicator in header's right actions section (before dark mode toggle)

## How It Works

### Architecture: Backend Proxy Pattern

**Problem:** Browser CORS security blocks JavaScript from reading the `Content-Disposition` header from Netlify's badge API, even though the fetch succeeds.

**Solution:** Use a Netlify Function as a proxy:
1. Frontend calls `/.netlify/functions/deploy-status`
2. Backend function fetches Netlify badge API (no CORS restrictions server-side)
3. Backend reads `Content-Disposition` header and extracts status
4. Returns simple JSON: `{ status: "success" | "building" | "failed" | "unknown" }`
5. Frontend updates UI based on JSON response

### Environment Variables
- **Frontend:** `VITE_NETLIFY_SITE_ID` in your `.env` file (for conditional rendering)
- **Backend:** `NETLIFY_SITE_ID` or `VITE_NETLIFY_SITE_ID` in Netlify env vars (for API calls)
- If not set, the indicator won't render

### Status Detection
The backend function checks the `Content-Disposition` header from:
```
https://api.netlify.com/api/v1/badges/${siteId}/deploy-status
```

Header pattern matching:
- **"badge-success"** → Green dot (bg-green-500)
- **"badge-building"** → Yellow pulsing dot (bg-yellow-400 animate-pulse)
- **"badge-failed" or "badge-error"** → Red dot (bg-red-500)
- Unknown/error → Component hides itself

### Visual Design
- **Size:** 12px circle (`w-3 h-3`)
- **Border:** White with 20% opacity for subtle elevation
- **Position:** In header, before dark mode toggle
- **Behavior:** Polls every 2 seconds for rapid updates
- **Accessibility:** Includes `title` and `aria-label` for tooltips

## Usage

### Setup
1. Add to your `.env` file:
   ```env
   VITE_NETLIFY_SITE_ID=your-site-id-here
   ```

2. Find your Netlify Site ID:
   - Go to Netlify Dashboard
   - Select your site
   - Site Settings → General → Site details → Site ID

### Testing
The indicator will:
- ✅ Show immediately on page load
- ✅ Update every 2 seconds
- ✅ Hide if env var is missing
- ✅ Hide if status is unknown/error
- ✅ Show tooltip on hover

## Status Colors

| Status    | Color  | Animation | Visual                              |
|-----------|--------|-----------|-------------------------------------|
| Success   | Green  | None      | Solid green dot                     |
| Building  | Yellow | Pulse     | Pulsing yellow dot (breathing)      |
| Failed    | Red    | None      | Solid red dot                       |
| Unknown   | Hidden | -         | Component doesn't render            |

## Production Deployment

To show the indicator in production:

### Step 1: Add Environment Variables
1. Go to your Netlify site dashboard
2. Navigate to: **Site configuration → Environment variables**
3. Add **both** variables:
   - `VITE_NETLIFY_SITE_ID` = your site ID (for frontend conditional rendering)
   - `NETLIFY_SITE_ID` = your site ID (for backend API calls)
4. Redeploy your site

### Step 2: Verify
The indicator will:
- ✅ Show in production when environment variables are set
- ✅ Auto-hide if env vars are not configured
- ✅ No errors or console warnings if missing
- ✅ Poll every 2 seconds for real-time deploy status
- ✅ Work without CORS issues (backend proxy handles API calls)

## Troubleshooting

### Indicator not showing?
1. Check browser console for errors
2. Verify `VITE_NETLIFY_SITE_ID` is set in env vars
3. Ensure component has rendered (check React DevTools)

### Shows "unknown" status?
1. Verify `NETLIFY_SITE_ID` or `VITE_NETLIFY_SITE_ID` is set on backend
2. Check backend function logs in Netlify dashboard
3. Verify site ID is correct

### CORS errors?
- This should NOT happen with the backend proxy approach
- If you see CORS errors, ensure you're calling `/.netlify/functions/deploy-status` (not the API directly)

## Future Enhancements (Optional)

- Add click to open Netlify dashboard
- Show deploy time/duration
- Add more detailed status (e.g., deploy preview vs production)
- Add notification for deploy completion
