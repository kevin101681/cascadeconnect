# Debugging SendGrid "Bad Request" Errors

## Enhanced Logging Implemented

The `netlify/functions/cbsbooks-send-email.ts` function now includes comprehensive logging to help diagnose SendGrid "Bad Request" errors.

## What Was Added

### 1. Payload Validation Logging (Lines 105-120)
When the function receives a request, it now logs:
```
📥 Received email request: {
  to: "customer@example.com",
  subject: "Invoice #123",
  hasText: true,
  hasHtml: true,
  hasAttachment: true,
  attachmentFilename: "Invoice_123.pdf",
  attachmentDataLength: 12345
}
```

If validation fails, it logs what's missing:
```
❌ Validation failed: {
  missingTo: false,
  missingAttachment: true,
  receivedTo: "customer@example.com",
  receivedAttachment: "missing"
}
```

### 2. Email Construction Logging (Lines 133-142)
Before sending to SendGrid, logs the prepared email:
```
📧 Preparing email with: {
  to: "customer@example.com",
  from: "info@cascadebuilderservices.com",
  subject: "Invoice from Cascade Builder Services",
  hasText: true,
  hasHtml: true,
  attachmentSize: 123456,
  attachmentFilename: "Invoice_123.pdf"
}
```

### 3. Enhanced Error Logging (Lines 176-200)
If SendGrid returns an error, now captures full details:

```
❌ Email sending error: Request failed with status code 400

🛑 SendGrid Response Status: 400

🛑 SendGrid Validation Errors: {
  "errors": [
    {
      "message": "The from email does not contain a valid address.",
      "field": "from",
      "help": "http://sendgrid.com/docs/API_Reference/Web_API_v3/Mail/errors.html#message.from"
    }
  ]
}

🚨 Specific Validation Errors:
   1. The from email does not contain a valid address.
```

## How to Debug

### Step 1: Trigger the Error
1. Try sending an invoice email from the app
2. Note the exact error message shown to the user

### Step 2: Check Netlify Function Logs
1. Go to Netlify Dashboard
2. Navigate to **Functions** → **cbsbooks-send-email**
3. Click on **Recent logs** or go to **Logs** tab
4. Look for the most recent invocation with the error

### Step 3: Analyze the Logs

Look for these key log entries in order:

#### A. Initial Request Receipt
```
📥 Received email request: { ... }
```
**Check**: 
- Is `to` a valid email address?
- Is `hasAttachment` true?
- Is `attachmentDataLength` reasonable (> 1000)?

#### B. Email Preparation
```
📧 Preparing email with: { ... }
```
**Check**:
- Is `from` a valid, verified email in SendGrid?
- Is `subject` present?
- Is `attachmentSize` reasonable?

#### C. SendGrid Response (If Error)
```
🛑 SendGrid Validation Errors: { ... }
```
**Check**:
- What's the exact error message?
- Which field is causing the problem?
- Does the help link provide more context?

### Step 4: Common Issues & Solutions

#### Issue: "The from email does not contain a valid address"
**Cause**: The sender email is not verified in SendGrid  
**Solution**:
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Verify the email address in `SENDGRID_REPLY_EMAIL` environment variable
3. Or use Single Sender Verification for quick testing
4. Update `SENDGRID_REPLY_EMAIL` in Netlify to match verified email

#### Issue: "The to email does not contain a valid address"
**Cause**: Frontend is sending invalid or empty recipient email  
**Solution**:
1. Check the log: `📥 Received email request: { to: ... }`
2. If `to` is undefined/null, the issue is in the frontend
3. Check invoice client email field is populated
4. Verify frontend is passing `clientEmail` correctly

#### Issue: "Attachment content is not valid base64"
**Cause**: PDF data is corrupted or not properly encoded  
**Solution**:
1. Check log: `attachmentDataLength` should be > 1000
2. If very small, PDF generation failed
3. Check browser console for jsPDF errors
4. Verify invoice has items/data to generate PDF from

#### Issue: "Daily sending limit exceeded"
**Cause**: Free SendGrid plan hit daily limit  
**Solution**:
1. Check SendGrid Dashboard → Activity
2. Upgrade plan or wait 24 hours
3. Use test mode during development

#### Issue: 401 Unauthorized (Before SendGrid)
**Cause**: Missing `CLERK_SECRET_KEY` in Netlify  
**Solution**: See `QUICK-FIX-401-ERRORS.md`

## Testing the Fixes

### Test 1: Valid Email
1. Create invoice with valid client email
2. Click "Email" button
3. Check logs show successful send
4. Verify email received

### Test 2: Missing Recipient
1. Create invoice without client email
2. Try to email
3. Should see frontend validation error
4. Check logs show validation failure

### Test 3: Invalid From Address
1. Set `SENDGRID_REPLY_EMAIL` to unverified email
2. Try to send
3. Check logs show SendGrid rejection
4. Verify error message about "from" field

## Log Search Tips

When viewing Netlify function logs:

**Search for success**: `✅ Invoice email sent`  
**Search for errors**: `❌`  
**Search for validation**: `🛑 SendGrid Validation`  
**Search for specific email**: Search for the recipient email address  

## Monitoring in Production

For production monitoring, consider:
1. Set up Sentry for error tracking
2. Configure SendGrid email activity tracking
3. Add custom logging to your monitoring solution
4. Set up alerts for failed email sends

## Related Documentation

- `NETLIFY-ENV-SETUP.md` - Environment variable setup
- `QUICK-FIX-401-ERRORS.md` - Authentication issues
- `INVOICE-EMAIL-AUTH-STATUS.md` - Frontend authentication status

## Need More Help?

If logs still don't reveal the issue:
1. Copy the full function log output
2. Check SendGrid Activity feed in dashboard
3. Verify all environment variables are set
4. Test with a simple email (no attachment) first
5. Check if issue is specific to certain email addresses

---

**Last Updated**: January 23, 2026  
**Related Commit**: Enhanced error logging in cbsbooks-send-email function
