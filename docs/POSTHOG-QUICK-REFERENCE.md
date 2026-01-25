# PostHog Operational Efficiency - Quick Reference

## 🎯 Access
```
Dashboard → Menu (☰) → Backend → PostHog Tab
```

## 📊 Three Widgets

### 1. Device Volume (Donut Chart)
**Shows:** Mobile vs Desktop claim submissions
**Metric:** Count of `claim_submitted` events by `$device_type`
**Purpose:** See which platform homeowners use most

### 2. Conversion Funnel (Grouped Bar Chart)
**Shows:** Drop-off rates at each step
**Steps:** 
- Started Claim
- Uploaded Photo
- Submitted Claim
**Purpose:** Identify where users abandon (mobile vs desktop)

### 3. Browser Compatibility (Table)
**Shows:** Success rate by browser version
**Columns:** Browser, Version, Users, Completion %, Avg Time
**Purpose:** Find problematic browser versions

## 🎯 PostHog Events

| Event | Triggers When | Properties |
|-------|---------------|------------|
| `claim_started` | Form opens | `user_role`, `screen_width`, `is_prefilled` |
| `claim_photo_uploaded` | Upload succeeds | `file_type`, `success` |
| `claim_submitted` | DB save succeeds | `claim_id`, `attachment_count`, `has_photo`, `is_batch` |

**Auto-captured:** `$device_type`, `$browser`, `$browser_version`

## ✅ Implementation Status

- ✅ Component built with mock data
- ✅ Integrated into Backend Dashboard
- ✅ Events tracking in production
- ⚠️ PostHog API integration pending

## 🔄 Next Steps

1. **Test Events:** Submit a claim and check PostHog Live Events
2. **Get API Key:** PostHog Settings → Personal API Keys
3. **Add to .env:**
   ```bash
   VITE_POSTHOG_PROJECT_ID=12345
   VITE_POSTHOG_PERSONAL_API_KEY=phx_xxx
   ```
4. **Create Service:** `lib/services/posthogService.ts`
5. **Wire Up Data:** Replace mock data in `PostHogTab.tsx`

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Tab not showing | Check you're in Backend Dashboard, not Admin Dashboard |
| Events not tracking | Check browser console for PostHog init message |
| Widget shows "mock data" banner | Expected - API integration pending |
| Refresh does nothing | Connect to your new fetch function (Phase 3) |

## 📚 Full Documentation

- **Implementation Guide:** `docs/POSTHOG-OPERATIONAL-EFFICIENCY.md`
- **Summary:** `docs/POSTHOG-IMPLEMENTATION-SUMMARY.md`
- **Component:** `components/backend/PostHogTab.tsx`

## 💡 Key Insight

**If mobile drop-off > 10% higher than desktop**, investigate:
- File upload size limits
- Mobile network timeouts
- Touch target sizes
- Form field usability on small screens
