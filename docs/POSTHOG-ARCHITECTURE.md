# PostHog Operational Efficiency - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Open Claim Form     →  trackEvent('claim_started')        │
│     └─ NewClaimForm.tsx                                        │
│                                                                 │
│  2. Upload Photo        →  trackEvent('claim_photo_uploaded')  │
│     └─ NewClaimForm.tsx (upload handler)                       │
│                                                                 │
│  3. Submit Claim        →  trackEvent('claim_submitted')       │
│     └─ App.tsx (handleCreateClaim)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        POSTHOG SDK                              │
├─────────────────────────────────────────────────────────────────┤
│  • Captures events from trackEvent()                           │
│  • Auto-enriches with device/browser data                      │
│  • Sends to PostHog Cloud (us.i.posthog.com)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      POSTHOG CLOUD                              │
├─────────────────────────────────────────────────────────────────┤
│  • Stores event data                                           │
│  • Provides Insights API                                       │
│  • Real-time event stream (Live Events)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR DASHBOARD                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BackendDashboard.tsx                                          │
│  └─ PostHogTab.tsx                                            │
│     ├─ Widget 1: Device Volume (Pie Chart)                    │
│     ├─ Widget 2: Conversion Funnel (Bar Chart)                │
│     └─ Widget 3: Browser Table                                │
│                                                                 │
│  [FUTURE] posthogService.ts                                    │
│  ├─ getDeviceVolume()      → Insights API                     │
│  ├─ getClaimFunnel()       → Insights API                     │
│  └─ getBrowserStats()      → Insights API                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Event Flow Detail

```
USER ACTION                EVENT TRACKED              PROPERTIES
───────────────────────────────────────────────────────────────────

📱 Opens claim form      → claim_started
                           ├─ user_role: "HOMEOWNER"
                           ├─ screen_width: 375
                           ├─ is_prefilled: false
                           │
                           └─ Auto-captured:
                              ├─ $device_type: "Mobile"
                              ├─ $browser: "Safari"
                              ├─ $browser_version: "17.4"
                              ├─ $os: "iOS"
                              └─ $current_url: "..."

📸 Uploads photo         → claim_photo_uploaded
                           ├─ file_type: "jpeg"
                           ├─ success: true
                           │
                           └─ Auto-captured:
                              ├─ $device_type: "Mobile"
                              ├─ $browser: "Safari"
                              └─ ...

✅ Submits claim         → claim_submitted
                           ├─ claim_id: "abc-123-..."
                           ├─ attachment_count: 2
                           ├─ has_photo: true
                           ├─ is_batch: false
                           │
                           └─ Auto-captured:
                              ├─ $device_type: "Mobile"
                              ├─ $browser: "Safari"
                              └─ ...
```

## Widget Data Sources

### Widget 1: Device Volume

```
PostHog Query:
  POST /api/projects/{id}/insights/trend
  {
    "events": [{ "id": "claim_submitted" }],
    "breakdown": "$device_type",
    "date_from": "-7d"
  }

Response (simplified):
  {
    "Mobile": 127,
    "Desktop": 89,
    "Tablet": 3
  }

Component renders:
  ┌──────────────────┐
  │   🥧 Donut Chart │
  │                  │
  │   Mobile: 59%    │
  │   Desktop: 41%   │
  └──────────────────┘
```

### Widget 2: Conversion Funnel

```
PostHog Query:
  POST /api/projects/{id}/insights/funnel
  {
    "events": [
      { "id": "claim_started", "order": 0 },
      { "id": "claim_photo_uploaded", "order": 1 },
      { "id": "claim_submitted", "order": 2 }
    ],
    "breakdown": "$device_type"
  }

Response (simplified):
  {
    "Mobile": [150, 98, 127],  // counts at each step
    "Desktop": [95, 91, 89]
  }

Calculated drop-offs:
  Mobile:  150 → 98 (-34.7%) → 127 (-15.3%)
  Desktop: 95 → 91 (-4.2%) → 89 (-6.3%)

Component renders:
  ┌────────────────────────────┐
  │ Started Claim              │
  │ ████████ Mobile (150)      │
  │ ████████ Desktop (95)      │
  │                            │
  │ Uploaded Photo (-34.7% M)  │
  │ ████████ Mobile (98)       │
  │ ████████ Desktop (91)      │
  │                            │
  │ Submitted (-15.3% M)       │
  │ ████████ Mobile (127)      │
  │ ████████ Desktop (89)      │
  └────────────────────────────┘
```

### Widget 3: Browser Compatibility

```
PostHog Query:
  POST /api/projects/{id}/insights/trend
  {
    "events": [{ "id": "claim_submitted" }],
    "breakdown": ["$browser", "$browser_version"],
    "aggregation": "unique_users"
  }

Response needs calculation:
  - Completion rate = submitted / started (per browser)
  - Avg time = median time between claim_started and claim_submitted

Component renders:
  ┌─────────────────────────────────────────────┐
  │ Browser | Version | Users | Rate | Avg Time│
  ├─────────────────────────────────────────────┤
  │ Chrome  | 131.x   | 89    | 94%  | 3m 12s  │
  │ Safari  | 18.x    | 67    | 91%  | 3m 45s  │
  │ Safari  | 17.x    | 43    | 68%  | 6m 22s  │⚠️
  │ Safari  | 16.x    | 8     | 50%  | 8m 41s  │❌
  └─────────────────────────────────────────────┘
```

## File Structure

```
cascade-connect/
├── components/
│   ├── backend/
│   │   └── PostHogTab.tsx           ← Main component
│   ├── BackendDashboard.tsx         ← Integration point
│   ├── NewClaimForm.tsx             ← Tracks: started, uploaded
│   └── providers/
│       └── PostHogProvider.tsx      ← trackEvent() function
│
├── lib/
│   └── services/
│       └── posthogService.ts        ← [TODO] API integration
│
├── docs/
│   ├── POSTHOG-OPERATIONAL-EFFICIENCY.md    ← Full guide
│   ├── POSTHOG-IMPLEMENTATION-SUMMARY.md    ← Status
│   ├── POSTHOG-QUICK-REFERENCE.md           ← Quick ref
│   └── POSTHOG-ARCHITECTURE.md              ← This file
│
└── App.tsx                          ← Tracks: submitted
```

## Data Freshness

| View | Latency | Update Frequency |
|------|---------|------------------|
| PostHog Live Events | 1-2 seconds | Real-time |
| PostHog Insights API | 1-5 minutes | On API call |
| Your Dashboard | Manual refresh | On button click |

**Future:** Add auto-refresh every 5 minutes or WebSocket connection.

## State Management

```typescript
// PostHogTab.tsx (Current - Mock Data)
const mockDeviceVolume = { mobile: 127, desktop: 89 };
const mockFunnelData = [...];
const mockBrowserData = [...];

// PostHogTab.tsx (Future - Real Data)
const [data, setData] = useState<{
  deviceVolume: DeviceVolumeData | null;
  funnelData: FunnelStepData[] | null;
  browserData: BrowserData[] | null;
}>({ deviceVolume: null, funnelData: null, browserData: null });

const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const [volume, funnel, browsers] = await Promise.all([
      posthogService.getDeviceVolume(),
      posthogService.getClaimFunnel(),
      posthogService.getBrowserStats()
    ]);
    setData({ deviceVolume: volume, funnelData: funnel, browserData: browsers });
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

## API Rate Limits

PostHog rate limits (as of 2025):
- **Personal API Keys:** 480 requests/minute
- **Typical usage:** 3 requests per dashboard load (one per widget)
- **Recommendation:** Cache results for 5 minutes

```typescript
// Recommended caching strategy
let cache = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

async function fetchWithCache() {
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < cache.ttl) {
    return cache.data;
  }
  
  const data = await fetchData();
  cache = { data, timestamp: now, ttl: cache.ttl };
  return data;
}
```

## Security Considerations

1. **API Keys:**
   - ✅ Personal API Keys stored in `.env`
   - ✅ Never committed to git (`.env` in `.gitignore`)
   - ❌ Don't use Personal API Keys in frontend (future: proxy via backend)

2. **Data Privacy:**
   - ✅ No PII in event properties (no emails, names)
   - ✅ Only aggregate data shown in dashboard
   - ✅ Claim IDs are UUIDs (non-sequential)

3. **Access Control:**
   - ✅ Backend Dashboard requires admin login
   - ✅ PostHog tab only visible to admins
   - ✅ Homeowners cannot see operational analytics

## Performance Optimization

1. **Code Splitting:**
   - ✅ PostHogTab lazy-loaded with BackendDashboard
   - ✅ Only loads when user clicks Backend menu

2. **Data Loading:**
   - ✅ Parallel API calls with Promise.all()
   - ⚠️ Consider caching for 5 minutes
   - ⚠️ Consider pagination for browser table

3. **Rendering:**
   - ✅ SVG for charts (lightweight)
   - ✅ CSS animations (GPU-accelerated)
   - ✅ No heavy chart libraries (recharts not needed)

## Testing Strategy

### Unit Tests (Future)
```typescript
describe('PostHogTab', () => {
  it('renders device volume widget', () => {});
  it('calculates drop-off percentages correctly', () => {});
  it('handles API errors gracefully', () => {});
});
```

### Integration Tests
```typescript
describe('Event Tracking', () => {
  it('tracks claim_started on form mount', () => {});
  it('tracks claim_photo_uploaded on upload', () => {});
  it('tracks claim_submitted on DB save', () => {});
});
```

### E2E Tests
```typescript
describe('Operational Efficiency View', () => {
  it('displays all three widgets', () => {});
  it('refreshes data on button click', () => {});
  it('shows loading state during fetch', () => {});
});
```

## Monitoring & Alerts

**Future Enhancements:**

1. **Data Quality Monitoring:**
   - Alert if event volume drops >50%
   - Alert if no events for 6 hours

2. **UX Monitoring:**
   - Alert if mobile drop-off >40%
   - Alert if any browser <70% success

3. **Performance Monitoring:**
   - Track dashboard load time
   - Alert if API response >3 seconds

## Rollback Plan

If issues occur:

1. **Remove Event Tracking:**
   ```typescript
   // Comment out trackEvent calls
   // trackEvent('claim_started');
   ```

2. **Revert Dashboard Changes:**
   ```bash
   git revert <commit-hash>
   ```

3. **Disable PostHog Tab:**
   ```typescript
   // In BackendDashboard.tsx
   // Hide POSTHOG tab from menu
   ```

## Support & Resources

- **PostHog Docs:** https://posthog.com/docs
- **Insights API:** https://posthog.com/docs/api/insights
- **Funnels:** https://posthog.com/docs/user-guides/funnels
- **Events:** https://posthog.com/docs/data/events

---

**Diagram Version:** 1.0
**Last Updated:** January 24, 2026
