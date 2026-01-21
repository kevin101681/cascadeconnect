# Email Notification After Call - Debug & Fix

## Problem
Email notifications after calls were not being sent despite the logic being present in the webhook.

## Root Cause Analysis

### Issues Found:
1. **No Error Handling**: The `sendUniversalNotification` call in the webhook was NOT wrapped in try-catch, so any errors would crash the webhook silently
2. **Silent Failures**: If `SENDGRID_API_KEY` environment variable was missing, emails were skipped with minimal logging
3. **Insufficient Logging**: Not enough diagnostic information to identify why emails weren't sending

## Fixes Applied

### 1. Enhanced Webhook Error Handling (`netlify/functions/vapi-webhook.ts`)

**Added:**
- Try-catch block around `sendUniversalNotification` call (lines 437-451)
- Detailed logging before email attempt:
  - Event type verification
  - `isFinalEvent` check result
  - Scenario determination
  - Email data summary
- Error logging with stack trace if email fails
- Non-blocking error handling (webhook continues even if email fails)

```typescript
// Before (vulnerable to crashes)
await sendUniversalNotification(scenario, data, db);

// After (robust error handling)
try {
  await sendUniversalNotification(scenario, data, db);
  console.log(`✅ Email notification sent successfully`);
} catch (emailError: any) {
  console.error(`❌ Email notification failed (non-blocking):`, emailError.message);
  console.error(`❌ Email error stack:`, emailError.stack);
}
```

### 2. Enhanced Email Service Logging (`lib/services/emailService.ts`)

**sendUniversalNotification:**
- Added data summary logging
- Added SendGrid configuration check with detailed error messages
- Logs whether `SENDGRID_API_KEY` exists in environment

**sendEmail:**
- Added recipient and subject logging
- Enhanced error messages for configuration issues
- Added specific error details for SendGrid API responses
- Added diagnostic hints for common errors (invalid API key, unauthorized, etc.)

## Diagnostic Logs

When a call webhook is received, you should now see:

```
📧 [req-xxx] STEP 4: Sending universal email notification
📧 Event type: end-of-call-report
📧 isFinalEvent check: true
📧 Determined scenario: CLAIM_CREATED
📧 Email data: { propertyAddress: "123 Main St", ... }
📧 Sending 'CLAIM_CREATED' notification...
📧 Data summary: { propertyAddress: "123 Main St", ... }
📧 SendGrid configured: true
📧 SENDGRID_API_KEY exists: true
📨 Sending email...
📨 To: admin@example.com
📨 Subject: New Call - Claim Created
✅ Email sent successfully (202)
✅ Email notification sent successfully
```

## Common Issues & Solutions

### Issue 1: "SendGrid not configured"
**Symptoms:**
```
❌ CRITICAL: SendGrid not configured! SENDGRID_API_KEY environment variable is missing.
```

**Solution:**
- Set `SENDGRID_API_KEY` in Netlify environment variables
- Redeploy the site after adding the variable

### Issue 2: "Unauthorized" or "Invalid API Key"
**Symptoms:**
```
❌ SendGrid error status: 401
❌ SENDGRID_API_KEY may be invalid or expired.
```

**Solution:**
- Verify the SendGrid API key is correct
- Check if the API key has been rotated or expired
- Ensure the API key has "Mail Send" permissions in SendGrid dashboard

### Issue 3: "Not a final event, skipping email"
**Symptoms:**
```
⏭️ Not a final event (type: call.started), skipping email
```

**Solution:**
- This is normal behavior - emails are only sent on `end-of-call-report` events
- Verify that Vapi is configured to send `end-of-call-report` webhooks

### Issue 4: Email sent but no recipient configured
**Symptoms:**
```
📧 Sending to: info@cascadebuilderservices.com
```

**Solution:**
- Add admin users to the database with `emailNotifyClaimSubmitted` enabled
- Or set `ADMIN_NOTIFICATION_EMAIL` environment variable

## Testing the Fix

1. **Trigger a test call** through Vapi
2. **Check Netlify function logs** for:
   - `📧 [req-xxx] STEP 4: Sending universal email notification`
   - `✅ Email notification sent successfully`
3. **If email fails**, check for:
   - Configuration errors (SENDGRID_API_KEY missing)
   - API errors (invalid key, unauthorized)
   - Network errors (SendGrid API unavailable)

## Verification Checklist

- [x] Webhook has try-catch around email sending
- [x] Email failures don't crash webhook
- [x] SendGrid configuration is checked and logged
- [x] Detailed error messages for debugging
- [x] Email service logs recipient and subject
- [x] SendGrid API errors are fully logged
- [x] Common error hints are provided

## Files Modified

1. `netlify/functions/vapi-webhook.ts`
   - Added try-catch block around email sending
   - Added comprehensive logging

2. `lib/services/emailService.ts`
   - Enhanced `sendUniversalNotification` logging
   - Enhanced `sendEmail` error handling
   - Added configuration diagnostics

## Next Steps

If emails still aren't working after this fix:

1. Check Netlify function logs for the diagnostic messages above
2. Verify `SENDGRID_API_KEY` is set in Netlify environment variables
3. Verify SendGrid API key has proper permissions
4. Check if SendGrid account is active and not suspended
5. Test SendGrid API key directly using SendGrid's API testing tools
