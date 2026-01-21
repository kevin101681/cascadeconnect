# Task Modal Overhaul & Auto-Save Implementation Guide

**Date:** January 10, 2026  
**Goal:** Refactor Task Modal UI and implement Google Docs-style auto-save for Task Notes and Claim fields

---

## Part 1: AutoSaveTextarea Component ✅

### Created: `components/ui/AutoSaveTextarea.tsx`

**Features:**
- ✅ Immediate local state updates (no input lag)
- ✅ Debounced server saves (1000ms default, customizable)
- ✅ Force save on blur (when user clicks away)
- ✅ Visual save status indicators
- ✅ Error handling and display
- ✅ TypeScript typed
- ✅ Fully reusable

**Usage Example:**
```tsx
import { AutoSaveTextarea } from './components/ui/AutoSaveTextarea';

<AutoSaveTextarea
  value={task.description}
  onSave={async (newValue) => {
    await updateTask(task.id, { description: newValue });
  }}
  label="Notes"
  placeholder="Add notes..."
  rows={6}
  debounceMs={1000}
  showSaveStatus={true}
/>
```

**Status Indicators:**
- **Idle:** Nothing shown
- **Saving...** (Gray + Spinner): Debounce timer triggered, saving to DB
- **All changes saved** (Green + Check): Save succeeded, fades after 2s
- **Error saving** (Red + Alert): Save failed, shows error message

---

## Part 2: Task Modal UI Refactor

### Target File: `components/TaskDetail.tsx`

### Changes Required:

#### 1. **Remove Header Elements**

**REMOVE (Lines 163-173):**
```tsx
// ❌ DELETE: Mark Complete button in header
<button
  onClick={() => onToggleTask(task.id)}
  className="..."
  title={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
>
  {task.isCompleted && <Check className="h-5 w-5" />}
</button>
```

**Rationale:** Actions should stay on the list card, not modal header

**REMOVE (Line 134):**
```tsx
// ❌ DELETE: Redundant title display in header
<h2 className="text-2xl font-normal...">{task.title}</h2>
```

Keep only the back button and edit controls.

---

#### 2. **Remove "Task Information" Section**

**REMOVE (Lines 191-227):**
```tsx
// ❌ DELETE ENTIRE SECTION: Redundant information
<div className="bg-surface-container dark:bg-gray-800 p-6 rounded-2xl...">
  <h3 className="text-lg font-normal...">Task Information</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Assigned To, Date Assigned, Status */}
  </div>
</div>
```

**Rationale:** This info is already displayed in the header meta section (lines 136-146). Redundant!

---

#### 3. **Refactor Messages Section**

**CHANGE (Line 254):**
```tsx
// ❌ OLD
Message Summary

// ✅ NEW
Messages
```

**MOVE Send Message Button:**

**REMOVE from header (Lines 154-162)**

**ADD to Messages section (after line 318, before closing div):**
```tsx
{/* Send Message Button - Moved to bottom of section */}
{!isEditing && onSendMessage && (
  <div className="mt-4 pt-4 border-t border-surface-outline-variant dark:border-gray-700">
    <Button 
      variant="tonal" 
      onClick={() => onSendMessage(task)} 
      icon={<MessageSquare className="h-4 w-4" />}
      className="w-full"
    >
      Send Message
    </Button>
  </div>
)}
```

---

#### 4. **Apply AutoSaveTextarea to Notes**

**REPLACE (Lines 229-244):**
```tsx
// ❌ OLD: Manual edit mode with Save button
<div className="bg-surface-container dark:bg-gray-800 p-6...">
  <h3>Notes / Description</h3>
  {isEditing ? (
    <textarea
      rows={6}
      className="..."
      value={editTaskNotes}
      onChange={e => setEditTaskNotes(e.target.value)}
    />
  ) : (
    <div className="text-sm...">{task.description || '...'}</div>
  )}
</div>
```

**WITH:**
```tsx
// ✅ NEW: Auto-save pattern (Edit mode only)
<div className="bg-surface-container dark:bg-gray-800 p-6 rounded-2xl border...">
  <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 mb-4">
    Notes
  </h3>
  
  {isEditing ? (
    <AutoSaveTextarea
      value={task.description || ''}
      onSave={async (newValue) => {
        if (onUpdateTask) {
          await onUpdateTask(task.id, { description: newValue });
        }
      }}
      placeholder="Add notes for this task..."
      rows={6}
      showSaveStatus={true}
    />
  ) : (
    <div className="text-sm text-surface-on dark:text-gray-100 whitespace-pre-wrap">
      {task.description || <span className="text-surface-on-variant dark:text-gray-400 italic">No notes provided.</span>}
    </div>
  )}
</div>
```

**CRITICAL:**
- ❌ Do NOT auto-fill with "Sub to Schedule" info
- ✅ Initialize empty or with previously saved notes only
- ✅ Only enable in Edit mode (`isEditing === true`)

---

#### 5. **Add Bottom Padding**

**CHANGE (Line 189):**
```tsx
// ❌ OLD
<div className="space-y-6">

// ✅ NEW
<div className="space-y-6 pb-10">
```

**Rationale:** Prevents content from touching bottom edge when scrolling

---

#### 6. **Update Edit Actions**

**CHANGE (Lines 400-406):**
```tsx
// ❌ OLD: Generic "Save Changes" button
{isEditing && (
  <div className="flex justify-end gap-2">
    <Button variant="text" onClick={handleCancelEdit}>Cancel</Button>
    <Button onClick={handleSaveEdit}>Save Changes</Button>
  </div>
)}
```

**TO:**
```tsx
// ✅ NEW: Only save non-auto-saved fields (title, assignee, claims)
{isEditing && (
  <div className="flex justify-end gap-2">
    <Button variant="text" onClick={handleCancelEdit}>Cancel</Button>
    <Button onClick={handleSaveEdit}>Save Task Details</Button>
  </div>
)}
```

**Update `handleSaveEdit` (Line 88-100):**
```tsx
const handleSaveEdit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!onUpdateTask) return;
  
  onUpdateTask(task.id, {
    title: editTaskTitle,
    assignedToId: editTaskAssignee,
    // ❌ REMOVE: description: editTaskNotes,  <- Now auto-saved
    relatedClaimIds: editSelectedClaimIds
  });
  
  setIsEditing(false);
};
```

**Remove from state (Line 56):**
```tsx
// ❌ DELETE: No longer needed
const [editTaskNotes, setEditTaskNotes] = useState(task.description || '');
```

---

## Part 3: Apply Auto-Save to Warranty Claims

### Target File: `components/ClaimInlineEditor.tsx`

### Changes Required:

#### 1. **Import AutoSaveTextarea**

```tsx
import { AutoSaveTextarea } from './ui/AutoSaveTextarea';
```

#### 2. **Apply to Description Field**

**Find the Description textarea (search for "Description" label)**

**REPLACE:**
```tsx
// ❌ OLD: Manual textarea
<textarea
  value={claim.description}
  onChange={e => handleFieldChange('description', e.target.value)}
  className="..."
  rows={4}
/>
```

**WITH:**
```tsx
// ✅ NEW: Auto-save textarea (Edit mode only!)
<AutoSaveTextarea
  value={claim.description || ''}
  onSave={async (newValue) => {
    // PURE UPDATE - No emails, no notifications!
    await updateClaimField(claim.id, 'description', newValue);
  }}
  placeholder="Describe the warranty issue..."
  rows={4}
  showSaveStatus={true}
/>
```

#### 3. **Apply to Internal Notes Field**

**Find the Internal Notes textarea**

**REPLACE:**
```tsx
// ❌ OLD: Manual textarea
<textarea
  value={claim.internalNotes}
  onChange={e => handleFieldChange('internalNotes', e.target.value)}
  className="..."
  rows={3}
/>
```

**WITH:**
```tsx
// ✅ NEW: Auto-save textarea
<AutoSaveTextarea
  value={claim.internalNotes || ''}
  onSave={async (newValue) => {
    // PURE UPDATE - No emails!
    await updateClaimField(claim.id, 'internalNotes', newValue);
  }}
  label="Internal Notes"
  placeholder="Add internal notes (not visible to homeowner)..."
  rows={3}
  showSaveStatus={true}
/>
```

#### 4. **Create Pure Update Function**

**Add near top of component:**
```tsx
/**
 * PURE claim field update - NO EMAILS, NO NOTIFICATIONS
 * Used by auto-save to prevent spam while typing
 */
const updateClaimField = async (claimId: string, field: string, value: string) => {
  try {
    const response = await fetch(`/.netlify/functions/update-claim-field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId, field, value }),
    });

    if (!response.ok) {
      throw new Error('Failed to update claim');
    }

    console.log(`✅ Auto-saved ${field}`);
  } catch (error) {
    console.error(`❌ Auto-save failed for ${field}:`, error);
    throw error; // Re-throw so AutoSaveTextarea shows error
  }
};
```

#### 5. **Create Server Action (Backend)**

**Create: `netlify/functions/update-claim-field.ts`**

```typescript
import { neon } from '@neondatabase/serverless';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { claimId, field, value } = JSON.parse(event.body || '{}');

    // Validate inputs
    if (!claimId || !field) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing claimId or field' }),
      };
    }

    // Whitelist allowed fields (security!)
    const allowedFields = ['description', 'internalNotes', 'internal_notes'];
    if (!allowedFields.includes(field)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid field' }),
      };
    }

    // Convert camelCase to snake_case for DB
    const dbField = field === 'internalNotes' ? 'internal_notes' : field;

    // Update database (PURE - NO EMAILS!)
    const sql = neon(process.env.DATABASE_URL || '');
    await sql`
      UPDATE claims
      SET ${sql(dbField)} = ${value}, updated_at = NOW()
      WHERE id = ${claimId}
    `;

    console.log(`✅ Updated claim ${claimId} field ${field}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('❌ Update claim field error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update claim' }),
    };
  }
};
```

---

## CRITICAL SAFETY GUARDRAILS

### 1. **Edit Mode Only** ⚠️

```tsx
// ✅ CORRECT: Only auto-save in edit mode
{isEditing && (
  <AutoSaveTextarea ... />
)}

// ❌ WRONG: Don't use in "New Claim" creation
{isCreating && (
  <AutoSaveTextarea ... />  // NO! Would create zombie records
)}
```

**Rationale:** New claim creation must be explicit (Save button) to prevent incomplete records

### 2. **No Emails in Auto-Save** 🚫

```typescript
// ❌ WRONG: Do NOT trigger emails
const onSave = async (value) => {
  await updateClaim(claimId, { description: value });
  await sendNotification(...);  // NO! Spam city!
};

// ✅ CORRECT: Pure database update only
const onSave = async (value) => {
  await updateClaimField(claimId, 'description', value);
  // No emails, no notifications
};
```

**Rationale:** User is typing, not "saving". Don't spam admin inbox!

### 3. **Server Action Whitelist** 🔒

```typescript
// ✅ SECURITY: Whitelist allowed fields
const allowedFields = ['description', 'internalNotes'];
if (!allowedFields.includes(field)) {
  return { statusCode: 400, error: 'Invalid field' };
}
```

**Rationale:** Prevent malicious field injection

---

## User Experience Flow

### Before (Manual Save):
```
1. User opens Task/Claim modal
2. Clicks "Edit" button
3. Types in description field
4. Clicks "Save Changes" button
5. Modal saves all fields
6. Success toast
```

**Problems:**
- User must remember to click Save
- Lose changes if browser crashes
- Can't see multiple sections at once (scrolling)

### After (Auto-Save):
```
1. User opens Task/Claim modal
2. Clicks "Edit" button
3. Types in description field
   → "Saving..." appears (after 1s of no typing)
   → "All changes saved" appears (after save completes)
   → Status fades out after 2s
4. User clicks away (blur) → Immediate save
5. User continues editing other fields
6. Clicks "Save Task Details" for non-auto-saved fields only
```

**Benefits:**
- ✅ Changes saved continuously
- ✅ Clear visual feedback
- ✅ No data loss on crash
- ✅ More Google Docs-like experience

---

## Testing Checklist

### AutoSaveTextarea Component
- [ ] Local state updates immediately (no lag)
- [ ] Save triggers after 1s of no typing
- [ ] "Saving..." status shows during save
- [ ] "All changes saved" shows after success
- [ ] Status fades out after 2s
- [ ] Force save on blur (click away)
- [ ] Error status shows on failure
- [ ] Disabled state prevents typing

### Task Modal
- [ ] Header doesn't show title or complete button
- [ ] "Task Information" section removed
- [ ] "Messages" title (not "Message Summary")
- [ ] "Send Message" button at bottom of Messages section
- [ ] Notes field uses AutoSaveTextarea in edit mode
- [ ] Notes don't auto-fill with "Sub to Schedule" info
- [ ] Bottom padding prevents content cutoff
- [ ] "Save Task Details" button only saves non-auto-saved fields

### Claim Modal (Edit Mode)
- [ ] Description field uses AutoSaveTextarea
- [ ] Internal Notes field uses AutoSaveTextarea
- [ ] Auto-save status shows for each field independently
- [ ] No emails sent during auto-save
- [ ] Manual "Save" button still works for other fields
- [ ] New Claim modal does NOT use auto-save

---

## Files to Modify

### Created:
- ✅ `components/ui/AutoSaveTextarea.tsx` - Reusable auto-save component

### To Modify:
- `components/TaskDetail.tsx` - Task modal UI refactor + auto-save
- `components/ClaimInlineEditor.tsx` - Apply auto-save to edit mode

### To Create:
- `netlify/functions/update-claim-field.ts` - Pure update endpoint
- (Optional) `netlify/functions/update-task-notes.ts` - If tasks need separate endpoint

---

## Benefits Summary

### For Users:
- ✅ No more lost work (continuous save)
- ✅ Clear visual feedback (always know save status)
- ✅ Faster workflow (less clicking)
- ✅ More intuitive (matches Google Docs, Notion)

### For Admins:
- ✅ No email spam during editing
- ✅ Cleaner task modal UI
- ✅ Better information architecture

### For Developers:
- ✅ Reusable component (use anywhere)
- ✅ Well-typed TypeScript
- ✅ Comprehensive error handling
- ✅ Security built-in (field whitelist)

---

## Implementation Status

- ✅ **Part 1:** AutoSaveTextarea component created
- ⏳ **Part 2:** Task Modal UI refactor (needs implementation)
- ⏳ **Part 3:** Claim auto-save application (needs implementation)

---

## Next Steps

1. Apply Task Modal UI changes to `TaskDetail.tsx`
2. Apply auto-save to Task Notes field
3. Apply auto-save to Claim Description & Internal Notes
4. Create `update-claim-field` serverless function
5. Test all scenarios
6. Push to GitHub
