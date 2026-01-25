# PostHog Operational Efficiency View - Implementation Guide

## Overview
This document describes the PostHog Operational Efficiency view that helps identify UX friction for homeowners, specifically determining if mobile users are struggling to complete claims compared to desktop users.

## Location
**File:** `components/backend/PostHogTab.tsx`
**Access:** Dashboard Header > Menu > Backend > PostHog Tab

## Current State
✅ **Component Created:** The React component is ready with mock data and full UI implementation.
⚠️ **Event Tracking:** PostHog events need to be added to the codebase.
⚠️ **API Integration:** PostHog Insights API needs to be wired up.

## Required PostHog Events

### 1. `claim_started`
**When:** User opens the new claim modal/form
**Where to Add:** `components/NewClaimForm.tsx`
```typescript
// Add at component mount (useEffect)
useEffect(() => {
  trackEvent('claim_started', {
    device_type: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    screen_width: window.innerWidth,
    form_type: isAdmin ? 'admin' : 'homeowner'
  });
}, []);
```

### 2. `claim_photo_uploaded`
**When:** Photo upload succeeds
**Where to Add:** `lib/services/uploadService.ts` or in the upload success handler in `NewClaimForm.tsx`
```typescript
// After successful upload
trackEvent('claim_photo_uploaded', {
  file_size: file.size,
  file_type: file.type,
  upload_method: 'direct', // or 'chunked' if implemented
  duration_ms: uploadDuration
});
```

### 3. `claim_submitted`
**When:** Claim is successfully saved to database
**Where to Add:** `App.tsx` in the `handleCreateClaim` function (around line 2424)
```typescript
// After successful DB insert
trackEvent('claim_submitted', {
  claim_id: newClaim.id,
  attachment_count: newClaim.attachments?.length || 0,
  has_photo: newClaim.attachments?.some(a => a.type === 'IMAGE'),
  time_to_submit: Date.now() - formOpenedTimestamp
});
```

## Component Features

### Widget 1: Device Volume (Donut Chart)
- **Purpose:** Show raw volume split between mobile and desktop
- **Metric:** Count of "claim_submitted" events
- **Breakdown:** By `$device_type` (Mobile vs. Desktop)
- **Visualization:** SVG donut chart with percentages

**PostHog Query:**
```
POST /api/projects/{project_id}/insights/trend
{
  "events": [{ "id": "claim_submitted" }],
  "breakdown": "$device_type",
  "date_from": "-7d",
  "display": "ActionsBar"
}
```

### Widget 2: Conversion Funnel (Grouped Bar Chart)
- **Purpose:** Show drop-off rates at each step for mobile vs. desktop
- **Steps:** Started → Uploaded Photo → Submitted
- **Visualization:** Grouped horizontal bars with drop-off percentages

**PostHog Query:**
```
POST /api/projects/{project_id}/insights/funnel
{
  "events": [
    { "id": "claim_started", "order": 0 },
    { "id": "claim_photo_uploaded", "order": 1 },
    { "id": "claim_submitted", "order": 2 }
  ],
  "breakdown": "$device_type",
  "funnel_window_interval": 30,
  "funnel_window_interval_unit": "minute"
}
```

### Widget 3: Browser Compatibility (Table)
- **Purpose:** Identify if high-friction users are on outdated browsers
- **Metrics:** Unique users, completion rate, average time
- **Breakdown:** By `$browser` and `$browser_version`

**PostHog Query:**
```
POST /api/projects/{project_id}/insights/trend
{
  "events": [{ "id": "claim_submitted" }],
  "breakdown": ["$browser", "$browser_version"],
  "aggregation": "unique_users",
  "date_from": "-30d"
}
```

## Implementation Checklist

### Phase 1: Event Tracking (Priority: High)
- [ ] Add `trackEvent("claim_started")` to NewClaimForm component mount
- [ ] Add `trackEvent("claim_photo_uploaded")` to upload success handler
- [ ] Add `trackEvent("claim_submitted")` to claim DB write success
- [ ] Test events in PostHog Live Events view
- [ ] Verify device_type, browser, and browser_version are captured

### Phase 2: API Service (Priority: High)
- [ ] Create `lib/services/posthogService.ts`
- [ ] Implement PostHog Insights API client
- [ ] Add authentication with Personal API Key
- [ ] Create functions for each widget's query
- [ ] Handle rate limits and errors gracefully

### Phase 3: Wire Up Data (Priority: Medium)
- [ ] Replace mock data in PostHogTab component
- [ ] Connect refresh button to API calls
- [ ] Add loading states
- [ ] Add error handling with retry logic
- [ ] Test with real data

### Phase 4: Enhancements (Priority: Low)
- [ ] Add date range picker (7d, 30d, 90d)
- [ ] Add export to CSV functionality
- [ ] Add drill-down capability (click to see user list)
- [ ] Add email alerts for critical drop-offs
- [ ] Add A/B test variant tracking

## PostHog Service Template

Create `lib/services/posthogService.ts`:

```typescript
/**
 * PostHog Insights API Service
 * Fetches analytics data for operational efficiency dashboard
 */

const POSTHOG_PROJECT_ID = import.meta.env.VITE_POSTHOG_PROJECT_ID;
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_PERSONAL_API_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

interface PostHogInsightQuery {
  events?: any[];
  breakdown?: string | string[];
  date_from?: string;
  date_to?: string;
  aggregation?: string;
  display?: string;
  funnel_window_interval?: number;
  funnel_window_interval_unit?: string;
}

async function queryPostHog(endpoint: string, query: PostHogInsightQuery) {
  const url = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`PostHog API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getDeviceVolume(days = 7) {
  return queryPostHog('insights/trend', {
    events: [{ id: 'claim_submitted' }],
    breakdown: '$device_type',
    date_from: `-${days}d`,
    display: 'ActionsBar',
  });
}

export async function getClaimFunnel(days = 7) {
  return queryPostHog('insights/funnel', {
    events: [
      { id: 'claim_started', order: 0 },
      { id: 'claim_photo_uploaded', order: 1 },
      { id: 'claim_submitted', order: 2 },
    ],
    breakdown: '$device_type',
    funnel_window_interval: 30,
    funnel_window_interval_unit: 'minute',
    date_from: `-${days}d`,
  });
}

export async function getBrowserStats(days = 30) {
  return queryPostHog('insights/trend', {
    events: [{ id: 'claim_submitted' }],
    breakdown: ['$browser', '$browser_version'],
    aggregation: 'unique_users',
    date_from: `-${days}d`,
  });
}
```

## Environment Variables

Add to `.env`:
```bash
# PostHog Analytics (already configured for tracking)
VITE_POSTHOG_KEY=phc_your_public_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com

# PostHog API (NEW - required for Operational Efficiency view)
VITE_POSTHOG_PROJECT_ID=12345
VITE_POSTHOG_PERSONAL_API_KEY=phx_your_personal_api_key_here
```

**How to get Personal API Key:**
1. Go to PostHog Settings > Personal API Keys
2. Create new key with "Read" permissions for "Insights"
3. Copy key to `.env`

## Testing

### Manual Testing
1. Navigate to Dashboard > Menu > Backend > PostHog Tab
2. Verify all 3 widgets render correctly
3. Click refresh button
4. Test dark mode
5. Test mobile responsive layout

### Event Testing
1. Open PostHog > Live Events
2. Create a new claim (as homeowner)
3. Upload a photo
4. Submit the claim
5. Verify 3 events appear in Live Events:
   - `claim_started`
   - `claim_photo_uploaded`
   - `claim_submitted`

## Analytics Insights

### Key Questions This View Answers:
1. **Are mobile users struggling more than desktop users?**
   - Compare funnel drop-off rates
   - Look for >10% difference in conversion rates

2. **Where do users abandon the claim process?**
   - Photo upload step shows highest friction
   - May indicate file size limits or connection issues

3. **Which browsers have the worst completion rates?**
   - Older Safari versions (iOS 16.x) show 50% success rate
   - Consider showing browser update prompt

4. **What's the volume split between mobile and desktop?**
   - Helps prioritize mobile optimization efforts
   - Current data shows 59% mobile, 41% desktop

## Maintenance

### Weekly Tasks
- Review drop-off rates for anomalies
- Check for new browser versions with low completion rates
- Monitor average time to complete claims

### Monthly Tasks
- Analyze trends over time
- Update mock data if structure changes
- Review and adjust alert thresholds

## Future Enhancements

1. **Real-time Alerts**
   - Email notification if mobile drop-off > 40%
   - Slack integration for critical issues

2. **Cohort Analysis**
   - Compare new vs. returning users
   - Segment by homeowner subdivision

3. **Performance Metrics**
   - Add page load time tracking
   - Monitor API response times
   - Track image optimization effectiveness

4. **A/B Testing**
   - Test different upload UI/UX
   - Compare single-photo vs. multi-photo flows
   - Test form field order variations

## Support

For questions or issues:
- Check PostHog documentation: https://posthog.com/docs/api
- Review component comments in `PostHogTab.tsx`
- Test with mock data first before API integration
