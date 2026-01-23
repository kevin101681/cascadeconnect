# Invoice Email & Download Feature Fixes

## Summary
Fixed two critical issues with the invoicing system:
1. **"Save & Email" Authorization Error** - The email functionality was failing with "Unauthorized: Please sign in to send emails"
2. **Invoice Card Buttons** - Email and Download buttons in the left panel are properly connected

## Changes Made

### 1. Fixed Authentication for Email Sending

**Problem**: The backend function `netlify/functions/cbsbooks-send-email.ts` requires:
- Valid Clerk session authentication (via cookies or Bearer token)
- User must have ADMIN role in the database

**Solution**: Updated the frontend to properly include authentication:

#### `components/InvoiceFormPanel.tsx`
- Added `useAuth` hook from `@clerk/clerk-react` to get authentication token
- Updated `handleSaveAndEmail` to:
  - Get Clerk token using `getToken()`
  - Include both `Authorization` header AND `credentials: 'include'` in fetch requests
  - Generate proper PDF using jsPDF (replaced stub implementation)
  - Use the same PDF generation logic as `Invoices.tsx` for consistency

#### `lib/cbsbooks/services/api.ts`
- Updated `sendEmail` method to include `credentials: 'include'` option
- This ensures Clerk's `__session` cookie is sent with the request
- Backend validates the session cookie automatically

### 2. Verified Invoice Card Button Connections

**Status**: ✅ Already Working Correctly

The left pane invoice card buttons are properly wired:

#### `components/ui/InvoiceCard.tsx` (Lines 168-186)
- Email button: Calls `onEmail?.()` on click
- Download button: Calls `onDownload?.()` on click
- Both have proper `stopPropagation` to prevent card click interference

#### `components/InvoicesListPanel.tsx` (Lines 383-384)
- Passes `onEmail` and `onDownload` handlers to `InvoiceCard`
- Handlers are connected from parent component props

#### `lib/cbsbooks/components/Invoices.tsx` (Lines 2024-2025)
- Passes proper handler functions to `InvoicesListPanel`:
  - `onEmail={(inv) => handlePrepareEmail(inv)}`
  - `onDownload={(inv) => handleDownloadPDF(inv)}`

## Backend Configuration Required

For the email feature to work in production, ensure these environment variables are set in Netlify:

### Required Variables:
- `CLERK_SECRET_KEY` - For authentication validation
- `DATABASE_URL` - Neon database connection string
- `SENDGRID_API_KEY` - SendGrid API key for sending emails

**OR**

- SMTP credentials:
  - `SMTP_HOST`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_PORT` (default: 587)
  - `SMTP_SECURE` (true/false)

### Optional Variables:
- `SENDGRID_REPLY_EMAIL` or `SMTP_FROM` - Sender email address (defaults to info@cascadebuilderservices.com)
- `SMTP_FROM_NAME` - Sender name (defaults to "Cascade Builder Services")

## Testing Checklist

### Email Functionality (Right Pane)
- [ ] Create a new invoice
- [ ] Fill in all required fields (builder, email, line items)
- [ ] Click "Save & Email"
- [ ] Verify no "Unauthorized" error
- [ ] Check that invoice status changes to "Sent"
- [ ] Verify email is received with proper PDF attachment

### Email Functionality (Left Pane)
- [ ] Click the Mail icon on any invoice card
- [ ] Verify email modal opens
- [ ] Fill in email details and send
- [ ] Verify email is sent successfully

### Download Functionality (Left Pane)
- [ ] Click the Download icon on any invoice card
- [ ] Verify PDF is generated and downloaded
- [ ] Open PDF and verify it displays correctly with:
  - Invoice header and number
  - Bill To / Sent From information
  - Line items table
  - Project address (if provided)
  - Total amount
  - Payment link button (if link exists)
  - CBS logo

## Architecture Notes

### Authentication Flow
1. User signs in via Clerk
2. Clerk sets `__session` cookie
3. Frontend makes API request with `credentials: 'include'`
4. Backend validates cookie using Clerk's `verifyToken`
5. Backend checks user role in database (must be ADMIN)
6. If valid, email is sent via SendGrid

### PDF Generation
- Uses jsPDF library
- Consistent styling across both "Save & Email" and "Download" features
- Includes company branding (logo, colors)
- Properly formatted invoice table
- Clickable payment link (if exists)

## Related Files

### Frontend
- `components/InvoiceFormPanel.tsx` - Invoice creation/editing form
- `components/ui/InvoiceCard.tsx` - Invoice card component
- `components/InvoicesListPanel.tsx` - Left panel list
- `lib/cbsbooks/components/Invoices.tsx` - Main invoices page
- `lib/cbsbooks/services/api.ts` - API service layer

### Backend
- `netlify/functions/cbsbooks-send-email.ts` - Email sending endpoint
- `lib/cbsbooks/netlify/functions/send-email.ts` - Legacy/reference implementation

### Configuration
- `public/_redirects` - API routing configuration (line 25)
- `netlify.toml` - Netlify build configuration

## Common Issues & Solutions

### "Unauthorized" Error
**Cause**: Missing or invalid authentication
**Solution**: Ensure user is signed in and has ADMIN role

### "Email service not configured" Error
**Cause**: Missing SendGrid API key
**Solution**: Set `SENDGRID_API_KEY` in Netlify environment variables

### Buttons not responding
**Cause**: Event propagation or missing handlers
**Solution**: Verify `stopPropagation` is called and handlers are passed correctly

### PDF not generating
**Cause**: jsPDF import or logo loading issues
**Solution**: Check browser console for errors, ensure `/images/manual/cbslogo.png` exists
