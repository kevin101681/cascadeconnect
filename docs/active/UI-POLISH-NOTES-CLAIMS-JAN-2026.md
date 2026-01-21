# UI Polish: Notes Modal & Warranty Claims

**Date**: January 21, 2026  
**Commit**: ce7f13a

## ✅ Completed Changes

### 1. Notes Modal Refinements

#### Card Styling
- **Updated corner radius**: Changed from `rounded-card` to `rounded-xl`
- **Consistency**: Now matches Warranty Claim card styling
- **File**: `components/ui/NoteCard.tsx`

#### Persist Context Pill
- **Database schema update**: Added `contextLabel` field to tasks table
  - Type: `TEXT`
  - Stores context information like "Drywall cracks • Claim #15"
  - Indexed for performance
- **API update**: Modified `createTask()` to accept and save `contextLabel`
- **UI display**: Context label now shows as a blue badge on note card footer
  - Positioned in footer next to date
  - Styled with `bg-primary/10 text-primary`
  - Small rounded pill badge (`text-[10px]`)
- **Files modified**:
  - `db/schema.ts` - Added field
  - `services/taskService.ts` - Updated interface and API
  - `components/TasksSheet.tsx` - Save context when creating notes
  - `components/ui/NoteCard.tsx` - Display context badge
  - `drizzle/migrations/add-context-label-to-tasks.sql` - Migration

#### Modal Shape
- **Corner radius update**: Changed to `rounded-tl-3xl` and `rounded-bl-3xl`
- **Previous**: `rounded-tl-2xl` and `rounded-bl-2xl`
- **Effect**: More prominent, polished appearance
- **File**: `components/TasksSheet.tsx` (line 277)

### 2. Warranty Claims UI & Logic

#### Delete Button Fixes
**Before**:
- Hidden by default (`opacity-0`)
- Red color (`text-red-600`)
- Overlapped with status badges

**After**:
- **Always visible** - Removed `opacity-0 hover:opacity-100`
- **Neutral gray color** - `text-gray-400 hover:text-gray-600`
- **Better positioning**:
  - White semi-transparent background (`bg-white/80`)
  - Added `shadow-sm` for depth
  - Smaller padding (`p-1` instead of `p-1.5`)
  - Rounded corners (`rounded-md`)
- **No overlap** - Properly positioned without interfering with badges
- **File**: `components/Dashboard.tsx` (line 168)

#### Multi-Select Deletion (New Feature)

**Checkbox Implementation**:
- Added checkbox to left side of every Warranty Claim card
- Flex layout with `gap-2` prevents overlap
- Checkbox styling: `h-4 w-4 rounded border-gray-300 text-blue-600`
- Stops propagation to prevent card selection on checkbox click

**State Management**:
```typescript
const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
```

**Toggle Handler**:
```typescript
const handleToggleClaimSelection = (claimId: string) => {
  setSelectedClaimIds(prev => {
    if (prev.includes(claimId)) {
      return prev.filter(id => id !== claimId);
    } else {
      return [...prev, claimId];
    }
  });
};
```

**Component Updates**:
- Updated `ClaimsListColumn` props to accept:
  - `selectedClaimIds: string[]`
  - `onToggleClaimSelection: (claimId: string) => void`
- Modified layout from `<div className="relative">` to:
  ```tsx
  <div className="relative flex items-start gap-2">
    {/* Checkbox */}
    <div className="pt-3 pl-2 shrink-0">...</div>
    {/* Card */}
    <div className="flex-1 relative">...</div>
  </div>
  ```

#### Bulk Delete Button

**Features**:
- Floating button at bottom center of claims list
- Only appears when claims are selected
- Animated entrance/exit with framer-motion
- Shows count: "Delete X Claim(s)"
- Confirmation dialog before deletion

**Styling**:
```tsx
<button className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors font-medium">
  <Trash2 className="h-4 w-4" />
  <span>Delete {selectedClaimIds.length} Claim{selectedClaimIds.length > 1 ? 's' : ''}</span>
</button>
```

**Animation**:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 20 }}
  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
>
```

**Handler**:
```typescript
const handleBulkDeleteClaims = async () => {
  if (selectedClaimIds.length === 0) return;
  
  const confirmMessage = `Are you sure you want to delete ${selectedClaimIds.length} claim${selectedClaimIds.length > 1 ? 's' : ''}?`;
  if (!confirm(confirmMessage)) return;
  
  // Delete all selected claims from database
  for (const claimId of selectedClaimIds) {
    await db.delete(claimsSchema).where(eq(claimsSchema.id, claimId));
  }
  
  // Clear selection
  setSelectedClaimIds([]);
  
  // Clear detail view if deleted claim was selected
  if (selectedClaimForModal && selectedClaimIds.includes(selectedClaimForModal.id)) {
    setSelectedClaimForModal(null);
  }
};
```

**Positioning**:
- Wrapped `ClaimsListColumn` in relative container
- Button positioned absolute with `bottom-4 left-1/2 -translate-x-1/2`
- z-index 20 to appear above cards

## 📊 Files Modified

1. **Database & Schema**
   - `db/schema.ts` - Added `contextLabel` field
   - `drizzle/migrations/add-context-label-to-tasks.sql` - Migration SQL

2. **Services**
   - `services/taskService.ts` - Updated `SimpleTask` interface and `createTask()` function

3. **Components**
   - `components/ui/NoteCard.tsx` - Added rounded-xl, context label display
   - `components/TasksSheet.tsx` - Updated modal corners, save context label
   - `components/Dashboard.tsx` - Delete button styling, multi-select, bulk delete

## 🎯 Visual Changes

### Notes Modal
- **More prominent corners** (3xl vs 2xl)
- **Consistent card styling** across notes and warranty claims
- **Context badges** show where notes came from (e.g., which claim)

### Warranty Claims
- **Cleaner delete buttons** - Always visible but subtle gray
- **Checkboxes** - Easy to spot and select multiple claims
- **Floating bulk action** - Clear indication when items are selected
- **Better layout** - No overlapping elements

## 🔄 Workflow Improvements

### Adding Notes with Context
1. User clicks "Add Note" from a claim
2. Context label (claim title + number) is passed to modal
3. User types note
4. Context label is saved with note
5. Note card shows context badge for reference

### Bulk Deleting Claims
1. User checks claims to delete
2. Floating button appears showing count
3. User clicks "Delete X Claims"
4. Confirmation dialog appears
5. All selected claims deleted
6. Selection cleared automatically

## 🚀 Benefits

- **Consistent Design**: Notes and Claims use matching rounded corners
- **Better Context**: Notes remember where they came from
- **Easier Deletion**: Delete multiple claims at once
- **Clearer UI**: Always-visible but subtle delete buttons
- **No Overlap**: Proper spacing prevents UI conflicts
- **Smooth Animations**: Polished feel with framer-motion

---

**All changes committed and pushed to GitHub** ✅
