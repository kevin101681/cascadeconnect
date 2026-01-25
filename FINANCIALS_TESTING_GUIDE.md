# Financials Module - Testing Guide

## Prerequisites

### 1. Environment Setup
Ensure these environment variables are configured in Netlify:

```bash
SQUARE_ACCESS_TOKEN=EAAA...  # Your Square Production Access Token
SQUARE_LOCATION_ID=L...      # Your Square Location ID
SQUARE_ENVIRONMENT=production
```

**Important Notes:**
- Do NOT use Application ID for `SQUARE_ACCESS_TOKEN`
- Do NOT use Application ID for `SQUARE_LOCATION_ID`
- Access Token starts with `EAAA...`
- Location ID starts with `L...`

### 2. Test Data
Create at least 2-3 test builders:
- Builder Name: "ABC Builders"
- Email: "test-abc@example.com"
- Address: "123 Main St, Seattle, WA 98101"

---

## Test Scenarios

### Test 1: Create New Invoice as Draft ✅

**Steps:**
1. Navigate to Dashboard → Financials (Invoices tab)
2. Click "New Invoice" button
3. Verify invoice number appears as **badge** in header (not editable)
4. Type "ABC" in Builder Name field
5. Verify autocomplete dropdown appears
6. Select "ABC Builders" from dropdown
7. Verify email auto-fills
8. Add project details: "123 Main St, Seattle, WA"
9. Edit line item:
   - Description: "Walk through and warranty management"
   - Quantity: 1
   - Rate: 1200
10. Verify total shows "$1,200.00"
11. Click "Save as Draft"
12. Verify invoice appears in list with "Draft" badge

**Expected Results:**
- ✅ Invoice number is read-only (badge format)
- ✅ Builder autocomplete works
- ✅ Email auto-populates
- ✅ Total calculates correctly
- ✅ Invoice saved with status "draft"
- ✅ Invoice appears in list

---

### Test 2: Generate Square Payment Link ✅

**Steps:**
1. Create or edit an invoice (follow Test 1 steps 1-10)
2. Scroll to "Square Payment Link" section
3. Click "Generate Link" button
4. Wait for link generation (should take 2-3 seconds)
5. Verify payment link appears in the field
6. Copy the link
7. Open link in new tab
8. Verify Square checkout page loads

**Expected Results:**
- ✅ "Generate Link" button works
- ✅ Link appears in format: `https://square.link/u/...` or `https://checkout.square.site/...`
- ✅ Link opens Square checkout
- ✅ Amount matches invoice total
- ✅ Invoice number appears in checkout

**Common Issues:**
- If link generation fails, check Netlify function logs
- Verify `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID` are correct
- Test link in incognito window to avoid cache issues

---

### Test 3: Save & Mark Sent ✅

**Steps:**
1. Create or edit an invoice
2. Fill all required fields
3. Click "Save & Mark Sent" button
4. Verify modal closes
5. Check invoice in list
6. Verify status badge shows "Sent"

**Expected Results:**
- ✅ Invoice saved successfully
- ✅ Status automatically set to "sent"
- ✅ No status dropdown visible
- ✅ Invoice appears with "Sent" badge

---

### Test 4: Save & Send (Email) ✅

**Prerequisites:**
- Email service configured
- Clerk authentication working
- Valid test email address

**Steps:**
1. Create or edit an invoice
2. Fill all required fields including email
3. Optional: Generate payment link first
4. Click "Save & Send" button
5. Wait for email to send (5-10 seconds)
6. Verify success message appears
7. Check recipient's email inbox
8. Verify email received
9. Open email and check:
   - Subject line correct
   - Body text formatted properly
   - PDF attached
   - Payment button visible (if link was generated)
10. Open PDF attachment
11. Verify all invoice details correct
12. Click "PAY ONLINE" button in PDF (if link exists)

**Expected Results:**
- ✅ Email sends successfully
- ✅ Invoice status set to "sent"
- ✅ Email contains professional formatting
- ✅ PDF attached and formatted correctly
- ✅ Payment button works (if link generated)
- ✅ Square checkout opens from PDF link

**Common Issues:**
- Email not received: Check spam folder
- PDF not attached: Check browser console for errors
- Payment button missing: Ensure link was generated before sending

---

### Test 5: Builder Tab Navigation ✅

**Steps:**
1. Navigate to Dashboard → Financials
2. Click "Builders" tab
3. Verify builders list appears
4. Click "New Builder" button
5. Verify builder form opens in right panel
6. Fill in builder details:
   - Company Name: "XYZ Construction"
   - Email: "xyz@construction.com"
   - Address: "456 Oak Ave, Portland, OR 97201"
7. Click "Save"
8. Verify builder appears in list
9. Click on builder in list
10. Verify builder form opens in edit mode
11. Update builder email
12. Click "Save"
13. Verify changes saved

**Expected Results:**
- ✅ Tab navigation works
- ✅ Builders list displays
- ✅ Create new builder works
- ✅ Edit builder works
- ✅ Changes persist

---

### Test 6: Tab Navigation (All 4 Tabs) ✅

**Steps:**
1. Navigate to Dashboard → Financials
2. Click each tab in order:
   - Invoices
   - Builders
   - P&L
   - Expenses
3. Verify each tab displays correct content
4. Switch back to Invoices tab
5. Create new invoice
6. Switch to Builders tab
7. Verify invoice panel closed
8. Switch back to Invoices
9. Verify invoice list refreshed

**Expected Results:**
- ✅ All 4 tabs visible
- ✅ Each tab shows correct content
- ✅ Tab switching works smoothly
- ✅ State resets when switching tabs
- ✅ Data persists across tab switches

---

### Test 7: Invoice Card Actions ✅

**Steps:**
1. Create a "Sent" invoice (use Test 3)
2. Locate invoice in list
3. Test each action button:
   - **Email (✉️)**: Click and verify email modal opens
   - **Download (💾)**: Click and verify PDF downloads
   - **Delete (🗑️)**: Click and verify confirmation dialog
4. Enter check number in field
5. Click "Pay" button
6. Verify:
   - Invoice status changes to "Paid"
   - Check number saved
   - "Pay" button becomes "Paid" (disabled)

**Expected Results:**
- ✅ All action buttons work
- ✅ Email modal opens
- ✅ PDF downloads correctly
- ✅ Delete confirmation appears
- ✅ Check number saves
- ✅ Pay button marks invoice as paid

---

### Test 8: Invoice Status Filter ✅

**Prerequisites:**
- At least 1 draft invoice
- At least 1 sent invoice
- At least 1 paid invoice

**Steps:**
1. Navigate to Invoices tab
2. Verify filter pills visible: [Sent] [Paid] [Draft] [All]
3. Click "Sent" filter
4. Verify only sent invoices appear
5. Note count in header badge
6. Click "Paid" filter
7. Verify only paid invoices appear
8. Click "Draft" filter
9. Verify only draft invoices appear
10. Click "All" filter
11. Verify all invoices appear

**Expected Results:**
- ✅ Filter pills work
- ✅ Filtering is instant
- ✅ Count updates correctly
- ✅ All status types filterable

---

### Test 9: Invoice Search ✅

**Steps:**
1. Navigate to Invoices tab
2. Locate search bar
3. Type invoice number (e.g., "INV-123")
4. Verify matching invoices appear
5. Clear search
6. Type builder name (e.g., "ABC")
7. Verify matching invoices appear
8. Clear search
9. Type project address (e.g., "Main St")
10. Verify matching invoices appear

**Expected Results:**
- ✅ Search by invoice number works
- ✅ Search by builder name works
- ✅ Search by project details works
- ✅ Search is case-insensitive
- ✅ Search updates in real-time

---

### Test 10: Edge Cases & Error Handling ✅

#### Test 10a: Missing Required Fields
**Steps:**
1. Click "New Invoice"
2. Leave Builder Name empty
3. Click "Save as Draft"
4. Verify error message appears

**Expected:** Validation prevents save

#### Test 10b: Invalid Email Format
**Steps:**
1. Create invoice
2. Enter invalid email: "not-an-email"
3. Click "Save & Send"
4. Verify error message appears

**Expected:** Validation prevents send

#### Test 10c: Square Link Without Amount
**Steps:**
1. Create invoice
2. Set all line items to $0
3. Click "Generate Link"
4. Verify button is disabled

**Expected:** Cannot generate link for $0 invoice

#### Test 10d: Email Without Email Address
**Steps:**
1. Create invoice
2. Select builder without email
3. Leave email field empty
4. Click "Save & Send"
5. Verify error message appears

**Expected:** Validation prevents send

#### Test 10e: Network Error Recovery
**Steps:**
1. Open browser DevTools
2. Go to Network tab
3. Enable "Offline" mode
4. Try to save invoice
5. Verify error handling
6. Disable "Offline" mode
7. Retry save
8. Verify success

**Expected:** Graceful error handling and recovery

---

## Performance Testing

### Load Test: Many Invoices
**Steps:**
1. Create 50+ invoices
2. Navigate to Invoices tab
3. Verify list loads quickly (<2 seconds)
4. Test search with 50+ invoices
5. Verify filtering is instant
6. Verify scroll performance is smooth

**Expected:**
- ✅ List renders quickly even with many items
- ✅ Search/filter remain fast
- ✅ UI remains responsive

### Payment Link Generation Speed
**Steps:**
1. Time how long it takes to generate payment link
2. Try with different amounts
3. Try multiple times in sequence

**Expected:**
- ✅ Generation completes in <5 seconds
- ✅ No rate limiting issues
- ✅ Consistent performance

---

## Mobile Testing

### Responsive Layout
**Steps:**
1. Open Financials on mobile device or in responsive mode (375px width)
2. Verify:
   - Tab navigation accessible
   - Invoice cards stack vertically
   - Action buttons visible and tappable
   - Forms remain usable
   - No horizontal scroll

**Expected:**
- ✅ All features work on mobile
- ✅ Layout adapts properly
- ✅ Touch targets are adequate
- ✅ No UI overlaps

---

## Integration Testing

### Test 11: Full Invoice Lifecycle ✅

**Complete workflow:**
1. Create new builder
2. Create new invoice for that builder
3. Add line items
4. Generate Square payment link
5. Save as draft
6. Edit invoice (add more items)
7. Save & Mark Sent
8. Email invoice to recipient
9. Open email and verify
10. Click payment link and test checkout
11. Return to app
12. Enter check number
13. Mark as paid
14. Verify final state

**Expected:**
- ✅ Entire workflow completes successfully
- ✅ All transitions work smoothly
- ✅ Data persists correctly
- ✅ No errors at any step

---

## Regression Testing

### Test 12: Existing Data Compatibility ✅

**Steps:**
1. Verify existing invoices still display
2. Verify existing builders still work
3. Edit old invoice (created before refactor)
4. Verify all fields populate correctly
5. Save changes
6. Verify data not corrupted

**Expected:**
- ✅ Backward compatibility maintained
- ✅ Old invoices work with new UI
- ✅ No data loss
- ✅ Smooth migration

---

## Bug Reporting Template

When reporting issues, include:

```
**Bug Title:** [Clear, descriptive title]

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Environment:**
- Browser: [Chrome/Firefox/Safari/Edge]
- Version: [Browser version]
- OS: [Windows/Mac/Linux]
- Mobile: [Yes/No, Device type]

**Screenshots:**
[Attach if applicable]

**Console Errors:**
[Copy any errors from browser console]

**Additional Context:**
[Any other relevant information]
```

---

## Test Results Log

Create a test log table:

| Test ID | Test Name | Status | Date | Tester | Notes |
|---------|-----------|--------|------|--------|-------|
| 1 | Create Draft Invoice | ✅ | 2026-01-24 | [Name] | - |
| 2 | Generate Payment Link | ✅ | 2026-01-24 | [Name] | - |
| 3 | Save & Mark Sent | ✅ | 2026-01-24 | [Name] | - |
| 4 | Save & Send Email | ✅ | 2026-01-24 | [Name] | - |
| 5 | Builder Tab | ✅ | 2026-01-24 | [Name] | - |
| 6 | Tab Navigation | ✅ | 2026-01-24 | [Name] | - |
| 7 | Invoice Actions | ✅ | 2026-01-24 | [Name] | - |
| 8 | Status Filter | ✅ | 2026-01-24 | [Name] | - |
| 9 | Invoice Search | ✅ | 2026-01-24 | [Name] | - |
| 10 | Edge Cases | ✅ | 2026-01-24 | [Name] | - |
| 11 | Full Lifecycle | ✅ | 2026-01-24 | [Name] | - |
| 12 | Existing Data | ✅ | 2026-01-24 | [Name] | - |

---

## Sign-off Checklist

Before considering refactoring complete:

- [ ] All test scenarios pass
- [ ] No console errors
- [ ] No linter errors
- [ ] Square payment links generate successfully
- [ ] Emails send with correct formatting
- [ ] PDFs generate correctly
- [ ] All 4 tabs accessible
- [ ] Mobile layout works
- [ ] Performance acceptable
- [ ] Existing data compatible
- [ ] Documentation complete
- [ ] Team trained on new workflow

---

## Support Resources

### Documentation
- `FINANCIALS_REFACTOR_SUMMARY.md` - Overview of changes
- `FINANCIALS_ARCHITECTURE.md` - Visual diagrams and flows

### Configuration
- Netlify Environment Variables
- Square Dashboard
- Email Service Configuration

### Code References
- `InvoiceFormPanel.tsx` - Main invoice form
- `InvoiceModalNew.tsx` - Invoice modal (legacy)
- `CBSBooksPage.tsx` - Main page orchestration
- `InvoicesListPanel.tsx` - List and tab navigation
- `create-payment-link.ts` - Square integration

### External Resources
- Square API Documentation: https://developer.squareup.com/
- jsPDF Documentation: https://github.com/parallax/jsPDF
- Clerk Documentation: https://clerk.com/docs
