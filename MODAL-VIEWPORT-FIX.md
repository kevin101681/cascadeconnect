# Modal Viewport Constraint Fix - January 6, 2026

## Issue
On laptop screens, modals (specifically Warranty/Claim modals) were slightly taller than the viewport, causing the main page to scroll to see footer buttons. This created a poor user experience where users had to scroll the background page instead of the modal content.

## Root Cause
The modal wrapper had:
1. `overflow-y-auto` on the backdrop (wrong layer)
2. Missing `overflow-hidden` on the modal shell
3. Missing `min-h-0` on content areas (preventing flex children from shrinking)
4. Inconsistent `max-h-[90vh]` application

## Solution Applied

### 1. Modal Backdrop (Outer Layer)
**Changed:**
```tsx
// BEFORE
className="fixed inset-0 z-[100] md:flex md:items-center md:justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out] md:overflow-y-auto"

// AFTER
className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
```

**Key Changes:**
- Removed `overflow-y-auto` from backdrop (backdrop should never scroll)
- Removed `md:` prefixes for consistent centering on all screen sizes
- Added `overscrollBehavior: 'contain'` to prevent scroll chaining

### 2. Modal Shell (Middle Layer)
**Changed:**
```tsx
// BEFORE
className="bg-surface dark:bg-gray-800 w-full h-full md:h-auto max-w-6xl rounded-none md:rounded-3xl shadow-elevation-3 overflow-hidden animate-[fade-in_0.2s_ease-out] md:my-auto flex flex-col md:max-h-[90vh]"

// AFTER
className="bg-surface dark:bg-gray-800 w-full h-full md:w-auto md:h-auto max-w-6xl rounded-none md:rounded-3xl shadow-elevation-3 overflow-hidden animate-[fade-in_0.2s_ease-out] flex flex-col max-h-[90vh]"
```

**Key Changes:**
- Applied `max-h-[90vh]` to all screen sizes (not just desktop)
- Ensured `flex flex-col` for proper vertical layout
- Kept `overflow-hidden` to prevent modal shell from scrolling

### 3. Content Area (Inner Layer)
**Changed:**
```tsx
// BEFORE
className="overflow-y-auto overflow-x-hidden flex-1 overscroll-contain -webkit-overflow-scrolling-touch"

// AFTER
className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 overscroll-contain -webkit-overflow-scrolling-touch"
```

**Key Changes:**
- Added `min-h-0` - **CRITICAL** for allowing flex children to shrink below content size
- This enables the content area to respect the `max-h-[90vh]` constraint from parent

## Files Modified

### components/Dashboard.tsx
Fixed 4 modal structures:

1. **CLAIM DETAIL MODAL** (Line ~3338)
   - Used when viewing/editing warranty claims from outside the CLAIMS tab
   
2. **TASK DETAIL MODAL** (Line ~3300)
   - Used when viewing/editing tasks from outside the TASKS tab
   
3. **NEW CLAIM MODAL** (Line ~3415)
   - Used when creating new warranty claims
   
4. **NEW MESSAGE MODAL** (Line ~5992)
   - Used when composing new messages

## Visual Outcome

### Before
- Modal height exceeded viewport on small laptop screens
- User had to scroll the **background page** to see footer buttons
- Confusing UX - unclear what was scrolling
- Modal could trigger page scroll

### After
- Modal is constrained to `max-h-[90vh]` (90% of viewport height)
- Modal header and footer are always visible
- Only the **content area** scrolls (with visible scrollbar)
- No page scroll triggered by modal
- Clean, predictable behavior on all screen sizes

## Technical Details

### The `min-h-0` Fix
The most critical change was adding `min-h-0` to flex children. By default, flex items have `min-height: auto`, which prevents them from shrinking below their content size. This caused the modal to grow beyond the viewport constraint.

**CSS Hierarchy:**
```
.modal-backdrop (fixed inset-0)
  └─ .modal-shell (max-h-[90vh], flex flex-col, overflow-hidden)
      └─ .content-area (flex-1, min-h-0, overflow-y-auto) ← Scrolls here
          └─ .actual-content (ClaimInlineEditor, etc.)
```

### Browser Compatibility
- Works on all modern browsers
- Mobile-optimized with `-webkit-overflow-scrolling: touch`
- Respects `overscrollBehavior: 'contain'` for scroll chaining prevention

## Testing Checklist
- [x] Claim Detail Modal fits in viewport
- [x] Task Detail Modal fits in viewport
- [x] New Claim Modal fits in viewport
- [x] New Message Modal fits in viewport
- [x] Content scrolls inside modal (not page)
- [x] Header/footer always visible
- [x] No linter errors
- [x] Mobile responsive behavior maintained

## Related Documentation
- See `MOBILE-CLAIM-MODAL-FIX.md` for mobile-specific modal fixes
- See `INVOICES-MODAL-REFACTOR.md` for similar viewport constraint patterns

