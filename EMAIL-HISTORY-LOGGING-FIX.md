# Email History Logging Fix

## Issue
Email History modal showed **all zeros** despite sending multiple emails successfully.

## Root Cause
The `email-send.js` Netlify Function was sending emails via SendGrid but **not logging them to the database**.

The `email_logs` table existed, but no data was being written to it.

## Solution
Added database logging to `email-send.js` after successful and failed email sends.

## Implementation

### 1. Import Database Library
```javascript
const { neon } = require('@neondatabase/serverless');
```

### 2. Log Successful Emails
**Location**: After SendGrid send (line ~140)

```javascript
// Log to database
try {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (databaseUrl) {
    const sql = neon(databaseUrl);
    await sql(
      `INSERT INTO email_logs (recipient, subject, status, metadata) VALUES ($1, $2, $3, $4)`,
      [
        to,
        subject,
        'sent',
        JSON.stringify({
          messageId: sendGridMessageId,
          from: fromEmail,
          fromName: fromName || 'Cascade Connect',
          replyToId: replyToId,
          attachmentCount: sendGridAttachments.length
        })
      ]
    );
    console.log('📝 Logged email to database');
  }
} catch (dbError) {
  // Don't fail the email send if logging fails
  console.error('❌ Failed to log email to database:', dbError);
}
```

### 3. Log Failed Emails
**Location**: In catch block (line ~175)

```javascript
// Log failed email to database
try {
  const parsed = JSON.parse(event.body || '{}');
  const { to, subject, fromName } = parsed;
  
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (databaseUrl && to && subject) {
    const sql = neon(databaseUrl);
    await sql(
      `INSERT INTO email_logs (recipient, subject, status, error, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [
        to,
        subject,
        'failed',
        errorMessage,
        JSON.stringify({
          fromName: fromName || 'Cascade Connect',
          errorCode: error.code,
          errorDetails: error.response ? error.response.body : null
        })
      ]
    );
    console.log('📝 Logged failed email to database');
  }
} catch (dbError) {
  console.error('❌ Failed to log failed email to database:', dbError);
}
```

## Database Schema

### email_logs Table
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent' | 'failed'
  error TEXT,           -- Error message if status is 'failed'
  metadata JSONB,       -- Additional data
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Metadata Structure

#### Successful Email
```json
{
  "messageId": "sg_abc123def456",
  "from": "noreply@cascadeconnect.app",
  "fromName": "Cascade Connect System",
  "replyToId": "claim-123-reply",
  "attachmentCount": 0
}
```

#### Failed Email
```json
{
  "fromName": "Cascade Connect System",
  "errorCode": "INVALID_EMAIL",
  "errorDetails": { ... }
}
```

## Features

### ✅ Non-Blocking
Logging is wrapped in try-catch:
- **Email succeeds** → Log succeeds → Perfect!
- **Email succeeds** → Log fails → Email still delivered ✅
- **Email fails** → Logged as failed

The primary function (sending email) is never blocked by logging failures.

### ✅ Rich Metadata
Logs include useful context:
- **SendGrid Message ID**: For tracking in SendGrid dashboard
- **From/FromName**: Who sent it
- **ReplyToId**: For email threading
- **Attachment Count**: How many files attached
- **Error Details**: Full error for failed emails

### ✅ Environment Fallback
```javascript
const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
```
Works with either environment variable.

## Email History Modal Integration

### Before Fix ❌
```
Email History Modal:
┌────────────────────┐
│ Total: 0           │
│ Sent: 0            │
│ Failed: 0          │
└────────────────────┘
(No data shown)
```

### After Fix ✅
```
Email History Modal:
┌────────────────────────────────────────┐
│ Total: 15                              │
│ Sent: 14                               │
│ Failed: 1                              │
├────────────────────────────────────────┤
│ • kevin@example.com                    │
│   New Claim Submitted: #1 - Leak      │
│   Status: Sent ✅                      │
│   Date: 12/28/2025 10:30 AM           │
├────────────────────────────────────────┤
│ • john@example.com                     │
│   Appointment Scheduled               │
│   Status: Failed ❌                    │
│   Error: Invalid email address        │
└────────────────────────────────────────┘
```

## Console Logs

### Successful Email
```
✅ Email sent via SendGrid: {
  statusCode: 202,
  messageId: 'sg_abc123def456',
  to: 'kevin@example.com',
  from: 'noreply@cascadeconnect.app',
  subject: 'New Claim Submitted: #1 - Leak',
  attachmentsCount: 0
}
📝 Logged email to database
```

### Failed Email
```
SEND EMAIL ERROR: {
  message: 'Invalid email address',
  code: 'INVALID_EMAIL',
  response: { ... }
}
📝 Logged failed email to database
```

## Testing

### 1. Send Test Email
Create a claim or trigger any email notification.

### 2. Check Console (Netlify Function Logs)
```
✅ Email sent via SendGrid
📝 Logged email to database
```

### 3. Open Email History Modal
Should now show:
- **Total count**: Number of emails sent
- **Sent count**: Successful emails
- **Failed count**: Failed attempts
- **Email list**: All sent/failed emails with details

### 4. Verify Database
```sql
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;
```

## Files Modified
- `netlify/functions/email-send.js` (added ~60 lines)

## Related Files
- `netlify/functions/email-logs.ts` - Fetches logs for Email History modal
- `components/EmailHistory.tsx` - Displays email logs
- `db/schema.ts` - Defines email_logs table schema

## Benefits

### ✅ Email Analytics
- Track all sent emails
- Monitor failure rates
- Debug delivery issues
- See email history by recipient

### ✅ Compliance & Auditing
- Record of all communications
- Timestamp for each email
- Error details for failures
- Metadata for forensics

### ✅ User Experience
- Email History modal actually works
- See what emails were sent
- Verify email delivery
- Debug if recipient didn't receive

### ✅ Development & Debugging
- Console logs for immediate feedback
- Database logs for historical analysis
- Error tracking for failures
- Metadata for context

## Future Enhancements

### Possible Improvements
1. **Email Opens/Clicks**: Track via SendGrid webhooks
2. **Retry Logic**: Auto-retry failed emails
3. **Email Templates**: Store template IDs in metadata
4. **User Context**: Add userId or claimId to metadata
5. **Search**: Full-text search on email content
6. **Export**: CSV export of email logs
7. **Charts**: Visualize send rates over time

### SendGrid Webhook Integration
Could track:
- Opens
- Clicks
- Bounces
- Spam reports
- Unsubscribes

By listening to SendGrid webhooks and updating the email_logs table.

## Status
✅ **FIXED** - Email History modal now shows accurate data

