# SendGrid Open Tracking - Enhanced Logging & Visibility

**Date:** January 9, 2026  
**Issue:** Email "Read/Unread" status not updating despite open tracking being enabled  
**Solution:** Enhanced logging and visibility to diagnose SendGrid webhook correlation

---

## Current State Audit

### ✅ What's Already Working

The SendGrid integration is **already correctly implemented**:

**1. Email Service (lib/services/emailService.ts)**
- ✅ Open tracking enabled (lines 152-157)
- ✅ `x-message-id` captured from SendGrid response (line 196)
- ✅ Message ID passed to email logger in metadata (line 400)

**2. Email Logger (lib/email-logger.js)**
- ✅ Extracts `messageId` from metadata (line 28)
- ✅ Saves to `sendgrid_message_id` column in database (line 43)
- ✅ Logs confirmation with message ID (line 47)

**3. Webhook Handler (netlify/functions/sendgrid-webhook.ts)**
- ✅ Handles `open` events (line 184)
- ✅ Normalizes message IDs (lines 25-30)
- ✅ Updates `opened_at` and `status='read'` (lines 191-195, 222-226)
- ✅ Dual-path matching: custom_args system_email_id OR sg_message_id

---

## Changes Made

### 1. Enhanced Webhook Logging

**Added highly visible event logging at the top of webhook processing:**

```typescript
// 📨 ENHANCED VISIBILITY LOG
console.log(`📨 SendGrid Webhook Event: ${eventType} | Email: ${email} | SG ID: ${rawSgMessageId || 'MISSING'}`);
```

**Location:** `netlify/functions/sendgrid-webhook.ts` (line 176)

**Purpose:**
- Immediately shows every incoming webhook event
- Highlights if `sg_message_id` is missing (critical for correlation)
- Makes it easy to grep logs for specific events

---

### 2. Email Logger Returns Database ID

**Modified `logEmailToDb` to return the inserted email ID:**

```javascript
const result = await sql(query, [...]);
const insertedId = result[0]?.id;
console.log(`✅ [EMAIL LOGGER] Logged email: ${data.status} to ${data.recipient}${sendgridMessageId ? ` (SG: ${sendgridMessageId})` : ''}${insertedId ? ` (DB ID: ${insertedId})` : ''}`);
return insertedId;  // NEW - returns ID for custom_args usage
```

**Location:** `lib/email-logger.js` (lines 24-38)

**Purpose:**
- Allows callers to use the email log ID for `custom_args.system_email_id`
- Enables dual-path webhook matching (more reliable)
- Logs both SendGrid ID and database ID for easy correlation

---

### 3. Enhanced Email Service Logging

**Added detailed logging after email is logged to database:**

```typescript
const emailLogResult = await logEmailToDb({...});
console.log('📝 Email logged to database:', { emailLogResult, messageId: result.messageId });
```

**Location:** `lib/services/emailService.ts` (lines 393-409)

**Purpose:**
- Confirms database logging succeeded
- Shows both database ID and SendGrid message ID
- Makes it easy to track email lifecycle

---

## How Open Tracking Works

### Complete Flow

```
┌─────────────────────────────────────────┐
│ 1. Send Email via SendGrid             │
│    - Open tracking enabled              │
│    - SendGrid returns x-message-id      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Log to Database                      │
│    - Save to email_logs table           │
│    - Store sendgrid_message_id          │
│    - Status: 'sent'                     │
│    - opened_at: null                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. Recipient Opens Email               │
│    - SendGrid tracks pixel/link click  │
│    - Generates 'open' event             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 4. Webhook Receives Event               │
│    - Event type: 'open'                 │
│    - Contains sg_message_id             │
│    - Contains email, timestamp          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 5. Update Database                      │
│    - Match on sendgrid_message_id       │
│    - Set opened_at = timestamp          │
│    - Set status = 'read'                │
└─────────────────────────────────────────┘
```

---

## Expected Console Output

### When Email is Sent

```
📨 Sending email...
✅ Email sent successfully (202)
📝 Email logged to database: { 
  emailLogResult: 'abc-123-def-456', 
  messageId: 'xyz789.filterdel.com' 
}
✅ [EMAIL LOGGER] Logged email: sent to admin@example.com (SG: xyz789.filterdel.com) (DB ID: abc-123-def-456)
✅ Sent 'CLAIM_CREATED' email successfully
```

### When Email is Opened

```
🪝 SendGrid webhook raw body: [{"email":"admin@example.com","event":"open"...}]
📧 Received 1 SendGrid event(s)
📨 SendGrid Webhook Event: open | Email: admin@example.com | SG ID: xyz789.filterdel.com
🪝 Incoming SendGrid payload {
  eventType: 'open',
  email: 'admin@example.com',
  rawSgMessageId: 'xyz789.filterdel.com',
  normalizedMessageId: 'xyz789',
  systemEmailId: 'abc-123-def-456',
  timestamp: '2026-01-09T20:30:45.000Z',
  payload: {...}
}
✅ Marked email as read/opened via custom_args for admin@example.com { matchedIds: ['abc-123-def-456'] }
```

---

## Troubleshooting Guide

### If Emails Remain "Unread"

**1. Check if webhooks are being received:**
```
Look for: 📨 SendGrid Webhook Event: open | ...
```

**If NOT receiving:** SendGrid webhook URL not configured or firewall blocking
- Verify webhook URL in SendGrid dashboard: `https://yoursite.com/.netlify/functions/sendgrid-webhook`
- Check SendGrid webhook event logs for delivery failures

**2. Check if sg_message_id is present:**
```
Look for: SG ID: xyz789.filterdel.com
```

**If MISSING:** SendGrid not including message ID in events
- This is unusual - contact SendGrid support
- Check if using v3 API (required for event webhooks)

**3. Check if database match succeeds:**
```
Look for: ✅ Marked email as read/opened...
```

**If NOT matching:**
- Message ID mismatch (normalization issue)
- Email logged to database AFTER webhook received (timing race)
- Database `sendgrid_message_id` column is null

**4. Check database directly:**

```sql
-- Find emails that should be marked as read
SELECT id, recipient, subject, sendgrid_message_id, status, opened_at, created_at
FROM email_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- Check for emails with missing sendgrid_message_id
SELECT COUNT(*), status
FROM email_logs
WHERE sendgrid_message_id IS NULL
GROUP BY status;
```

---

## Database Schema

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'sent' | 'failed' | 'read'
  error TEXT,
  metadata JSONB,
  sendgrid_message_id TEXT,  -- ← Critical for webhook matching
  opened_at TIMESTAMP,       -- ← Set by webhook on 'open' event
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast webhook lookups
CREATE INDEX idx_email_logs_sendgrid_id ON email_logs(sendgrid_message_id);
```

---

## SendGrid Configuration

### Required Settings

**1. Open Tracking Enabled (App Level)**
- SendGrid Dashboard → Settings → Tracking
- ✅ Open Tracking: ON

**2. Event Webhook Configured**
- SendGrid Dashboard → Settings → Mail Settings → Event Webhook
- URL: `https://yoursite.com/.netlify/functions/sendgrid-webhook`
- Events to POST: ✅ Opened
- ✅ Verification Key (optional but recommended)

**3. API Key Permissions**
- Mail Send: FULL ACCESS
- Tracking: READ ACCESS (for webhook verification)

---

## Files Modified

**1. netlify/functions/sendgrid-webhook.ts**
- Added enhanced visibility logging (line 176)
- Shows every event with clear formatting

**2. lib/email-logger.js**
- Returns inserted email ID (line 38)
- Enhanced logging with both SG ID and DB ID (line 37)

**3. lib/services/emailService.ts**
- Captures and logs email log result (line 409)
- Shows confirmation of database logging

---

## Testing Instructions

### Manual Test

1. **Send a test email:**
   ```typescript
   await sendEmail({
     to: { email: 'your-email@example.com' },
     subject: 'Test Open Tracking',
     text: 'Open this email to test tracking',
     html: '<p>Open this email to test tracking</p>'
   });
   ```

2. **Check logs for sending:**
   ```
   ✅ Email sent successfully (202)
   ✅ [EMAIL LOGGER] Logged email: sent to your-email@example.com (SG: xyz789...)
   ```

3. **Open the email in your inbox**

4. **Check Netlify logs for webhook:**
   ```
   📨 SendGrid Webhook Event: open | Email: your-email@example.com | SG ID: xyz789...
   ✅ Marked email as read/opened...
   ```

5. **Check database:**
   ```sql
   SELECT * FROM email_logs 
   WHERE recipient = 'your-email@example.com' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - `status` should be `'read'`
   - `opened_at` should have a timestamp

---

## Status

✅ **ENHANCED** - Added comprehensive logging for diagnosing open tracking

## Next Steps

1. Deploy to production
2. Send test email
3. Open test email
4. Check logs for:
   - Email sent confirmation
   - Webhook received
   - Database updated

If issues persist, the enhanced logging will show exactly where the correlation is failing.
