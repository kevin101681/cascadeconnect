# Calls Deep Link Feature

## Summary
Implemented deep linking from the Homeowner Info Dashboard Card to the main Calls page with automatic filtering by homeowner phone number.

## Changes Made

### 1. Dashboard Component (`components/Dashboard.tsx`)

**Button Behavior Changed:**
- **Before**: Clicking "Calls" button opened a local modal (`showCallsModal`)
- **After**: Navigates to `/calls?search={phoneNumber}` and filters automatically

**Code Changes:**
```typescript
// Added import
import { useRouter } from 'next/navigation';

// Added hook
const router = useRouter();

// Updated button onClick
<Button 
  onClick={() => {
    // Navigate to Calls page with search filter for this homeowner's phone
    const searchParam = encodeURIComponent(displayHomeowner.phone || '');
    router.push(`/calls?search=${searchParam}`);
  }}
  variant="outlined"
  icon={<Phone className="h-4 w-4" />}
  className="!h-9 w-full md:w-auto"
>
  Calls ({homeownerCalls.length})
</Button>
```

**Removed:**
- `showCallsModal` state variable
- Modal JSX (commented out, lines 5433-5655)
- useEffect for initializing selected call on modal open
- `showCallsModal` from useEffect dependencies

### 2. AIIntakeDashboard Component (`components/AIIntakeDashboard.tsx`)

**Added URL Search Param Reading:**
```typescript
// Added import
import { useSearchParams } from 'next/navigation';

// Added hook
const searchParams = useSearchParams();

// Added useEffect to apply search filter from URL
useEffect(() => {
  const searchParam = searchParams.get('search');
  if (searchParam) {
    console.log('🔍 Deep link: Applying search filter from URL:', searchParam);
    setSearchQuery(searchParam);
    // Reset to first page when applying filter
    setCurrentPage(1);
  }
}, [searchParams]);
```

## How It Works

### User Flow:
1. User is viewing a homeowner's dashboard (Main Dashboard with sidebar)
2. User sees the "Calls" button in the Homeowner Info Card (shows count if calls exist)
3. User clicks "Calls ({count})" button
4. App navigates to `/calls?search=253-508-0621` (example phone number)
5. Calls page loads and automatically:
   - Reads the `search` query parameter
   - Sets the search query state to the phone number
   - Filters the calls list to show only that homeowner's calls
   - Resets pagination to page 1

### Technical Details:
- **URL Format**: `/calls?search={encodedPhoneNumber}`
- **Search Param**: Phone number is URL-encoded for safety
- **Filter Application**: Happens on mount via `useSearchParams` hook
- **Existing Filter**: The calls list already had text search functionality; we're just pre-populating it
- **Deep Link Log**: Console logs when filter is applied: `🔍 Deep link: Applying search filter from URL: {phone}`

## Benefits

1. **Better UX**: Single source of truth for calls list (no duplicate modal code)
2. **Sharable URLs**: Users can bookmark or share filtered calls views
3. **Browser History**: Back button works naturally
4. **Maintainability**: One less modal to maintain
5. **Consistency**: All calls viewing happens on the dedicated Calls page

## Testing Checklist

- [ ] Click "Calls" button from homeowner dashboard sidebar
- [ ] Verify navigation to `/calls` page
- [ ] Verify URL contains `?search={phone}` parameter
- [ ] Verify calls list is filtered to only show that homeowner's calls
- [ ] Verify search input field shows the phone number
- [ ] Test with different homeowners (different phone numbers)
- [ ] Test back button (should return to dashboard)
- [ ] Test clearing the search filter manually
- [ ] Test on mobile and desktop

## Backward Compatibility

- The old modal code is commented out, not deleted, for easy restoration if needed
- All existing calls page functionality remains intact
- Phone number formatting utility (`formatPhoneNumber`) continues to work as before

## Related Files

- `components/Dashboard.tsx` - Main dashboard with homeowner card
- `components/AIIntakeDashboard.tsx` - Calls page component
- `lib/utils.ts` - Phone number formatting utility
