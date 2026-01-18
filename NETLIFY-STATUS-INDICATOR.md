# Netlify Status Indicator - Dev Tool

## Overview
A subtle visual indicator in the Dashboard Header that shows the current Netlify deploy status in real-time.

## Implementation Summary

### Files Created/Modified

1. **Created:** `components/layout/NetlifyStatusIndicator.tsx`
   - Main component that polls Netlify badge API
   - Auto-hides if `VITE_NETLIFY_SITE_ID` is not set
   - Polls every 2 seconds for rapid updates

2. **Modified:** `components/Layout.tsx`
   - Added import for `NetlifyStatusIndicator`
   - Placed indicator in header's right actions section (before dark mode toggle)

## How It Works

### Environment Variable
- **Required:** `VITE_NETLIFY_SITE_ID` in your `.env` file
- If not set, the indicator won't render
- **Production:** Add this env var to your Netlify deployment settings to show the indicator in production

### Status Detection
The component makes a `HEAD` request to:
```
https://api.netlify.com/api/v1/badges/${siteId}/deploy-status
```

It checks the `Content-Disposition` header for status strings:
- **"success"** → Green dot (bg-green-500)
- **"building"** → Yellow pulsing dot (bg-yellow-400 animate-pulse)
- **"failed"** → Red dot (bg-red-500)
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
1. Go to your Netlify site dashboard
2. Navigate to: **Site configuration → Environment variables**
3. Add `VITE_NETLIFY_SITE_ID` with your site ID value
4. Redeploy your site

The indicator will:
- Show in production when `VITE_NETLIFY_SITE_ID` is set in Netlify env vars
- Auto-hide if the env var is not configured
- No errors or console warnings if missing
- Polls every 2 seconds for real-time deploy status

## Future Enhancements (Optional)

- Add click to open Netlify dashboard
- Show deploy time/duration
- Add more detailed status (e.g., deploy preview vs production)
- Add notification for deploy completion
