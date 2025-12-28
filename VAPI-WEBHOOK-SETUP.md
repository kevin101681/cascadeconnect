# Vapi Webhook Setup Guide

## Overview

The Vapi webhook integration enables AI-powered voice intake for warranty claims. Homeowners can call a phone number, and Vapi's AI assistant will:
1. Ask about their property address
2. Collect information about their warranty issue
3. Determine if it's urgent
4. Automatically match the address to homeowners in the database
5. Create a warranty claim if needed
6. Send email notifications to admins

## Features

### ✅ Robust Data Extraction
- **Smart Extraction**: Looks for `structuredData` in multiple locations:
  - `message.analysis.structuredData`
  - `message.artifact.structuredOutputs`
  - `message.structuredData`
  - And more fallback paths

### ✅ API Fallback
- If `propertyAddress` is missing in the webhook payload:
  - Waits 2000ms for Vapi to process the call
  - Fetches call details from `https://api.vapi.ai/call/${callId}`
  - Logs: `🔄 Webhook empty. Fetched data from API.`

### ✅ Fuzzy Address Matching
- Uses Levenshtein distance algorithm
- Normalizes addresses (e.g., "Street" → "St", "Avenue" → "Ave")
- Minimum similarity threshold: 0.4 (40% match)
- Automatically links calls to homeowner records

### ✅ Automatic Claim Creation
- Creates claims for `callIntent === 'warranty_issue'`
- Skips duplicate claims within 24 hours
- Generates sequential claim numbers per homeowner
- Status: `SUBMITTED`, Classification: `Unclassified`

### ✅ Email Notifications
- Sends emails to admins when new calls are received
- Includes:
  - Homeowner name and phone
  - Property address
  - Issue description
  - Verification status (matched/unmatched)
  - Urgency flag
  - Links to dashboard and homeowner profile
- Uses SendGrid directly (no separate API call)
- Wrapped in try/catch - email failures won't break the webhook

## Setup Instructions

### 1. Get Vapi API Credentials

1. Sign up at [https://vapi.ai](https://vapi.ai)
2. Create a new assistant
3. Go to **Settings** → **API Keys**
4. Copy your **API Secret**

### 2. Configure Environment Variables

Add to your `.env.local` or Netlify environment variables:

```bash
# Required
VAPI_SECRET=your_vapi_api_secret_here

# Required for email notifications
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_REPLY_EMAIL=noreply@yourdomain.com

# Optional - fallback admin email
ADMIN_NOTIFICATION_EMAIL=admin@yourdomain.com

# Required for database
DATABASE_URL=your_neon_database_url
```

### 3. Configure Vapi Webhook URL

In your Vapi dashboard:

1. Go to **Assistants** → Select your assistant
2. Scroll to **Webhooks** section
3. Add webhook URL:
   ```
   https://yourdomain.com/.netlify/functions/vapi-webhook
   ```
4. Add custom header:
   - **Key**: `X-Vapi-Secret`
   - **Value**: Your `VAPI_SECRET` value
5. Save changes

### 4. Configure Vapi Structured Outputs

In your Vapi assistant configuration, set up structured outputs to extract:

```json
{
  "structuredData": {
    "propertyAddress": "string",
    "homeownerName": "string",
    "phoneNumber": "string",
    "issueDescription": "string",
    "callIntent": "warranty_issue | general_question | solicitation",
    "isUrgent": "boolean"
  }
}
```

## Webhook Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Homeowner calls Vapi phone number                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Vapi AI assistant collects information                  │
│     - Property address                                       │
│     - Issue description                                      │
│     - Urgency                                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Vapi sends webhook to Cascade Connect                   │
│     POST /.netlify/functions/vapi-webhook                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Webhook Handler Processing                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Step 1: Deep Logging                                  │  │
│  │ - Log full body structure                             │  │
│  │ - Log all keys and nested objects                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Step 2: Smart Extraction                              │  │
│  │ - Look for structuredData in multiple locations       │  │
│  │ - Extract: address, name, phone, intent, urgency      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Step 3: API Fallback (if address missing)             │  │
│  │ - Wait 2000ms                                          │  │
│  │ - Fetch from https://api.vapi.ai/call/${callId}       │  │
│  │ - Extract missing data                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Step 4: Database Matching                             │  │
│  │ - Fuzzy match property address                         │  │
│  │ - Find homeowner in database (≥40% similarity)        │  │
│  │ - Save call record                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Step 5: Create Claim (if warranty_issue)              │  │
│  │ - Check for duplicates (24 hours)                     │  │
│  │ - Generate claim number                                │  │
│  │ - Insert into claims table                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Step 6: Email Notification                            │  │
│  │ - Send email to admins via SendGrid                   │  │
│  │ - Include summary and dashboard link                  │  │
│  │ - Wrapped in try/catch (non-blocking)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Always return 200 OK to Vapi                            │
│     (prevents retry loops)                                   │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### `calls` Table
```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY,
  vapi_call_id TEXT NOT NULL UNIQUE,
  homeowner_id UUID REFERENCES homeowners(id),
  homeowner_name TEXT,
  phone_number TEXT,
  property_address TEXT,
  issue_description TEXT,
  is_urgent BOOLEAN DEFAULT false,
  transcript TEXT,
  recording_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  address_match_similarity TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `claims` Table
Automatically populated when `callIntent === 'warranty_issue'` and homeowner is matched.

## Testing

### 1. Test with Mock Data

Create a test file `test-vapi-webhook.json`:

```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "test-call-123",
      "phoneNumber": "+1234567890"
    },
    "analysis": {
      "structuredData": {
        "propertyAddress": "123 Main St, Seattle, WA 98101",
        "homeownerName": "John Doe",
        "phoneNumber": "+1234567890",
        "issueDescription": "Leaking roof after recent rain",
        "callIntent": "warranty_issue",
        "isUrgent": true
      }
    }
  }
}
```

Send POST request:
```bash
curl -X POST https://yourdomain.com/.netlify/functions/vapi-webhook \
  -H "Content-Type: application/json" \
  -H "X-Vapi-Secret: your_vapi_secret" \
  -d @test-vapi-webhook.json
```

### 2. Check Logs

View Netlify function logs:
```bash
netlify logs:function vapi-webhook
```

Look for:
- ✅ `Call saved to database`
- ✅ `Matched homeowner` (if address matches)
- ✅ `Claim #X created` (if warranty_issue)
- ✅ `Email sent successfully`

### 3. Check Database

```sql
-- View recent calls
SELECT * FROM calls ORDER BY created_at DESC LIMIT 10;

-- View recent claims
SELECT * FROM claims ORDER BY date_submitted DESC LIMIT 10;

-- Check matching statistics
SELECT 
  is_verified,
  COUNT(*) as count,
  AVG(CAST(address_match_similarity AS DECIMAL)) as avg_similarity
FROM calls 
GROUP BY is_verified;
```

## Troubleshooting

### Issue: "propertyAddress not found in webhook or API"

**Cause**: Vapi didn't extract the address, or structured outputs aren't configured.

**Solution**:
1. Check Vapi assistant configuration
2. Ensure structured outputs include `propertyAddress`
3. Test the assistant manually to verify extraction
4. Check webhook logs for the full payload structure

### Issue: "No matching homeowner found"

**Cause**: Address doesn't match any homeowner in database (< 40% similarity).

**Solution**:
1. Check the exact address in the database
2. Verify address format matches (e.g., "St" vs "Street")
3. Lower the similarity threshold in code (line 154: `0.4` → `0.3`)
4. Add the homeowner's address to the database

### Issue: "Email notification failed"

**Cause**: SendGrid not configured or invalid API key.

**Solution**:
1. Verify `SENDGRID_API_KEY` is set
2. Verify `SENDGRID_REPLY_EMAIL` is set and verified in SendGrid
3. Check SendGrid dashboard for delivery issues
4. Check webhook logs for specific error messages

**Note**: Email failures won't break the webhook - calls are still saved to the database.

### Issue: "Invalid or missing Vapi secret"

**Cause**: Webhook authentication failed.

**Solution**:
1. Verify `VAPI_SECRET` environment variable is set
2. Verify Vapi is sending the `X-Vapi-Secret` header
3. Check header name (case-sensitive)

## Email Notification Format

### Subject Line
```
[URGENT] [VERIFIED] New Voice Claim: 123 Main St, Seattle, WA 98101
```

Tags:
- `[URGENT]` - Only if `isUrgent === true`
- `[VERIFIED]` - If address matched to homeowner
- `[UNVERIFIED]` - If address couldn't be matched

### Email Body

- Call information table
- Issue description (highlighted)
- Call transcript (truncated to 1000 chars)
- Buttons:
  - "View in Dashboard" → AI Intake page
  - "View Homeowner" → Homeowner profile (if matched)
- Call ID footer

## API Reference

### Webhook Endpoint

```
POST /.netlify/functions/vapi-webhook
```

**Headers:**
```
X-Vapi-Secret: your_vapi_secret
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "call_abc123",
      "phoneNumber": "+1234567890"
    },
    "analysis": {
      "structuredData": {
        "propertyAddress": "123 Main St, Seattle, WA",
        "homeownerName": "John Doe",
        "phoneNumber": "+1234567890",
        "issueDescription": "Description here",
        "callIntent": "warranty_issue",
        "isUrgent": false
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true
}
```

Always returns `200 OK` to prevent Vapi from retrying.

## Security

### Webhook Authentication

The webhook verifies the `X-Vapi-Secret` header matches `VAPI_SECRET` environment variable. Requests with invalid or missing secrets are rejected with `401 Unauthorized`.

### Preventing Duplicate Claims

The system checks for open claims submitted within the last 24 hours before creating a new claim. This prevents duplicate claims if:
- The homeowner calls multiple times
- Vapi sends duplicate webhooks
- Testing/debugging sends duplicate payloads

## Performance

### Typical Execution Times

- Data extraction: ~50ms
- API fallback (if needed): ~2050ms (2s wait + API call)
- Database matching: ~100-500ms (depends on homeowner count)
- Database save: ~50-100ms
- Email sending: ~200-500ms

**Total**: 400ms - 3200ms (with API fallback)

### Optimization Tips

1. **Index the `vapi_call_id` column** for faster upserts
2. **Index the `homeowners.address` column** for faster fuzzy matching
3. **Consider caching homeowner addresses** if you have many homeowners
4. **Use database functions** for claim number generation (atomic)

## Next Steps

1. ✅ Configure Vapi assistant with structured outputs
2. ✅ Set up webhook URL in Vapi dashboard
3. ✅ Add environment variables to Netlify
4. ✅ Test with mock data
5. ✅ Test with real phone call
6. ✅ Monitor webhook logs
7. ✅ Review calls in AI Intake dashboard

## Support

For issues or questions:
- Check Netlify function logs
- Review Vapi dashboard webhook logs
- Check SendGrid delivery logs
- Review database records

---

**File Location**: `netlify/functions/vapi-webhook.ts`  
**Last Updated**: December 2024

