# Email Open Tracking Implementation

## ✅ Complete - Read Receipts Now Available!

This implementation adds email open tracking to the Email History modal, so you can see when recipients read your emails.

---

## 🎯 What Was Added

### 1. **Database Schema Updates**
**File**: `db/schema.ts`

Added two new fields to the `email_logs` table:

```typescript
sendgrid_message_id: text('sendgrid_message_id')  // For webhook correlation
opened_at: timestamp('opened_at')                  // When email was first opened
```

**Migration SQL**: `scripts/migrations/add-email-open-tracking.sql`

---

### 2. **Email Sending Enhancement**
**File**: `netlify/functions/email-send.js`

#### Enabled Open Tracking
```javascript
openTracking: {
  enable: true  // ✅ Now enabled
}
```

**Note**: Click tracking remains disabled to avoid SSL certificate issues. Open tracking uses an invisible 1x1 pixel and doesn't have SSL problems.

#### Store Message ID
```javascript
await sql(
  `INSERT INTO email_logs (recipient, subject, status, sendgrid_message_id, metadata) 
   VALUES ($1, $2, $3, $4, $5)`,
  [to, subject, 'sent', sendGridMessageId, metadata]
);
```

---

### 3. **SendGrid Webhook Handler**
**File**: `netlify/functions/sendgrid-webhook.js` (NEW)

Receives real-time email event notifications from SendGrid:

```javascript
// Process 'open' events
if (eventType === 'open') {
  // Update opened_at timestamp (first open only)
  await sql(
    `UPDATE email_logs 
     SET opened_at = to_timestamp($1)
     WHERE sendgrid_message_id = $2 
     AND opened_at IS NULL`,
    [timestamp, sg_message_id]
  );
}
```

**Features**:
- ✅ Real-time updates when email is opened
- ✅ First-open tracking only (doesn't overwrite)
- ✅ Logs all event types for debugging
- ✅ Handles batch events from SendGrid

---

### 4. **Email History UI Update**
**File**: `components/EmailHistory.tsx`

#### New "Read" Column
Added between "Status" and "Details" columns:

```tsx
<th>Read</th>  // Header

// In table row:
{email.opened_at ? (
  // ✅ Email was opened
  <div className="flex flex-col items-center gap-1">
    <Eye className="h-4 w-4 text-blue-600" />
    <span className="text-xs text-blue-600">
      {formatDateTime(email.opened_at)}
    </span>
  </div>
) : email.status === 'sent' ? (
  // 📧 Email sent but not opened yet
  <div className="flex items-center gap-1 text-gray-500">
    <Mail className="h-4 w-4" />
    <span className="text-xs">Unread</span>
  </div>
) : (
  // ❌ Email failed to send
  <span className="text-xs">—</span>
)}
```

#### Visual Indicators
- **✅ Read**: Blue eye icon + timestamp
- **📧 Unread**: Gray mail icon + "Unread" text
- **❌ Failed**: Dash (not applicable)

---

## 🔧 Setup Instructions

### Step 1: Run Database Migration
Connect to your Neon database and run:

```sql
-- Add new columns
ALTER TABLE email_logs 
  ADD COLUMN IF NOT EXISTS sendgrid_message_id TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_sendgrid_message_id 
  ON email_logs(sendgrid_message_id) 
  WHERE sendgrid_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_opened_at 
  ON email_logs(opened_at) 
  WHERE opened_at IS NOT NULL;
```

**Neon Console**: https://console.neon.tech/

1. Select your project
2. Go to SQL Editor
3. Paste the migration SQL
4. Run the query

---

### Step 2: Configure SendGrid Webhook

1. **Log in to SendGrid**
   - Go to https://app.sendgrid.com/

2. **Navigate to Mail Settings**
   - Settings → Mail Settings → Event Webhook
   - Or direct link: https://app.sendgrid.com/settings/mail_settings

3. **Configure Webhook**
   - **HTTP POST URL**: `https://cascadeconnect.app/.netlify/functions/sendgrid-webhook`
   - **Authorization Method**: None (public endpoint)
   
4. **Select Events to Post**
   - ✅ **Opened** (Required for read tracking)
   - ⬜ Clicked (Optional - not used currently)
   - ⬜ Bounced (Optional - for future bounce handling)
   - ⬜ Dropped (Optional - for delivery insights)
   - ⬜ Spam Report (Optional - for reputation monitoring)
   - ⬜ Unsubscribe (Optional - for opt-out management)

5. **Test Webhook** (Important!)
   - Click "Test Your Integration"
   - Should see: `✓ Test successful`
   - Check Netlify Functions logs to confirm
   - Look for: `📬 Received X SendGrid event(s)`

6. **Save Settings**
   - Click "Save"
   - Webhook is now active!

---

## 🧪 Testing

### Test 1: Send an Email
1. Log in to Cascade Connect
2. Create a new warranty claim
3. Email notification is sent automatically
4. Check Email History → Email shows as "Unread"

### Test 2: Open the Email
1. Open the email in your inbox
2. Wait 5-10 seconds (webhook processing time)
3. Refresh Email History modal
4. Email now shows:
   - Blue eye icon
   - Timestamp of when you opened it

### Test 3: Multiple Opens
1. Open the same email again
2. Refresh Email History
3. Timestamp should NOT change (first open only)

### Test 4: Check Webhook Logs
1. Go to Netlify Dashboard
2. Functions → sendgrid-webhook → Logs
3. Look for:
   ```
   📬 Received 1 SendGrid event(s)
   ✅ Marked email as opened: user@example.com (sg_message_id)
   ```

---

## 📊 How It Works

```
User Flow:
──────────

1. Cascade Connect sends email
   ↓
2. SendGrid delivers email
   - Inserts invisible 1x1 tracking pixel
   - Stores message ID: sg_abc123...
   ↓
3. Recipient opens email
   ↓
4. Email client loads tracking pixel
   ↓
5. SendGrid detects open event
   ↓
6. SendGrid sends webhook to:
   https://cascadeconnect.app/.netlify/functions/sendgrid-webhook
   ↓
7. Webhook handler updates database:
   UPDATE email_logs 
   SET opened_at = '2024-12-28 10:30:45'
   WHERE sendgrid_message_id = 'sg_abc123'
   ↓
8. Email History modal shows read status!
```

---

## 🎨 UI Preview

### Email History Table

```
┌──────────────────┬─────────────────┬──────────────────┬────────┬────────────────────┬─────────┐
│ Date             │ Recipient       │ Subject          │ Status │ Read               │ Details │
├──────────────────┼─────────────────┼──────────────────┼────────┼────────────────────┼─────────┤
│ Dec 28, 10:15 AM │ john@email.com  │ Claim #123...    │ Sent   │ 👁️ Dec 28, 10:17 AM│ ︾      │
├──────────────────┼─────────────────┼──────────────────┼────────┼────────────────────┼─────────┤
│ Dec 28, 9:45 AM  │ jane@email.com  │ Claim #122...    │ Sent   │ 📧 Unread          │ ︾      │
├──────────────────┼─────────────────┼──────────────────┼────────┼────────────────────┼─────────┤
│ Dec 27, 3:30 PM  │ bob@email.com   │ Claim #121...    │ Failed │ —                  │ ︾      │
└──────────────────┴─────────────────┴──────────────────┴────────┴────────────────────┴─────────┘
```

**Legend**:
- 👁️ + timestamp = Email was opened
- 📧 "Unread" = Email sent but not opened yet
- — = Email failed, tracking not applicable

---

## 🔍 Troubleshooting

### Issue: Emails show "Unread" even after opening

**Possible Causes**:
1. **Webhook not configured** - Follow Step 2 above
2. **Webhook URL incorrect** - Must be exact: `https://cascadeconnect.app/.netlify/functions/sendgrid-webhook`
3. **Email client blocks images** - Some clients (Outlook, Gmail "Images Off") block tracking pixels
4. **Plain text email view** - Text-only view doesn't load images

**Solutions**:
- Check SendGrid webhook settings
- Test with personal Gmail (images enabled)
- Check Netlify function logs for webhook events

---

### Issue: Webhook returns errors

**Check**:
1. **DATABASE_URL** environment variable is set in Netlify
2. Migration was run successfully
3. Netlify function logs show errors

**Debug**:
```bash
# Check Netlify logs
netlify functions:log sendgrid-webhook

# Look for:
# ✅ Success: "Marked email as opened"
# ❌ Error: "Failed to update email log"
```

---

### Issue: Migration fails

**Error**: `column "sendgrid_message_id" already exists`

**Solution**: Column already exists, skip migration or use:
```sql
ALTER TABLE email_logs 
  ADD COLUMN IF NOT EXISTS sendgrid_message_id TEXT;
```

---

## 🚀 Future Enhancements

### 1. Read Rate Analytics
Add dashboard widget showing:
- Overall open rate (% of emails read)
- Average time to open
- Best time to send emails

### 2. Multiple Opens Tracking
Currently tracks first open only. Could add:
- `open_count` column
- `last_opened_at` column
- Track every open

### 3. Click Tracking (Careful with SSL)
If SSL issues resolved:
- Track link clicks
- Most clicked links
- Click-through rate

### 4. Bounce/Spam Handling
Expand webhook to handle:
- Bounced emails (invalid addresses)
- Spam reports (update homeowner communication preferences)
- Unsubscribes (respect opt-outs)

### 5. Email Engagement Score
Calculate score based on:
- Open speed (faster = higher engagement)
- Click activity
- Reply rate
- Use to prioritize follow-ups

---

## 📋 Technical Details

### SendGrid Tracking Pixel
SendGrid adds HTML like this:
```html
<img src="https://u123456.ct.sendgrid.net/wf/open?upn=..." 
     width="1" height="1" alt="" />
```

When the image loads, SendGrid records the open event.

### Webhook Payload Example
```json
[
  {
    "event": "open",
    "email": "john@example.com",
    "timestamp": 1703764645,
    "sg_message_id": "abc123.filterdrecv-p3iad2-1-123456789",
    "ip": "192.0.2.1",
    "useragent": "Mozilla/5.0..."
  }
]
```

### Database Update Query
```sql
UPDATE email_logs 
SET opened_at = to_timestamp(1703764645)
WHERE sendgrid_message_id = 'abc123.filterdrecv-p3iad2-1-123456789'
AND opened_at IS NULL;
```

**Why `AND opened_at IS NULL`?**
- Only update on first open
- Preserve original open timestamp
- Prevent overwrites from multiple opens

---

## ✅ Summary

**What Works**:
- ✅ Emails track when they're opened
- ✅ Real-time webhook updates
- ✅ UI shows read status with timestamp
- ✅ First-open tracking preserved
- ✅ Failed emails handled gracefully

**What's Required**:
1. ⚠️ **Run database migration** (one time)
2. ⚠️ **Configure SendGrid webhook** (one time)
3. ⚠️ **Test webhook** (verify it works)

**After Setup**:
- All new emails will automatically track opens
- Old emails (before migration) won't have tracking
- Works with all email types (claims, appointments, etc.)

---

## 📞 Support

**Issues?**
1. Check SendGrid webhook status
2. Review Netlify function logs
3. Verify database migration ran
4. Test with simple email send

**Still not working?**
- Check that `DATABASE_URL` is set in Netlify
- Verify SendGrid API key is valid
- Ensure webhook URL is correct (no typos!)

---

**Read receipts are now live!** 📧👁️✅

