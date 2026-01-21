# Invoice Form Refinement - Quick Reference

## ✅ Completed Improvements

### 1. Status Dropdown Removed
- **Before**: Manual dropdown with Draft/Sent/Paid options
- **After**: Automatically managed by backend
  - `draft` → on creation
  - `sent` → on "Save & Mark Sent" or "Save & Email"
  - `paid` → on payment webhook or manual action

### 2. Builder Selection Fixed
- **Before**: 
  - ❌ Opened on focus (annoying)
  - ❌ Selection failed to populate field
  - ❌ Search term stuck in field
- **After**:
  - ✅ Opens only when typing
  - ✅ Selection populates name + email
  - ✅ Dropdown closes automatically
  - ✅ Builder name displays correctly

### 3. Date Pickers Enhanced (Material 3)
- **Container**: `rounded-2xl`, better shadow
- **Selected Date**: Pill shape with `scale-105` and `shadow-md`
- **Today's Date**: Ring outline instead of border
- **Hover Effects**: Micro-interactions with scale
- **Typography**: Semibold, uppercase day names with tracking

## Backend Requirements

```typescript
// Status management logic (backend)
onCreate: status = 'draft'
onSendOrEmail: status = 'sent', sentDate = now()
onPayment: status = 'paid', datePaid = now()
```

## Files Changed
- `components/InvoiceFormPanel.tsx` - Status removed, builder fixed
- `components/CalendarPicker.tsx` - Material 3 styling enhanced

## Commit
`aa9f160` - "refactor: Invoice form UX improvements"
