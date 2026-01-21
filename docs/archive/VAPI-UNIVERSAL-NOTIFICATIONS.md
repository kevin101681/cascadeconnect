# Vapi Webhook - Universal Email Notifications (v2)

## Date: December 27, 2025

## What Changed

The Vapi webhook has been rewritten to send **email notifications for EVERY call**, regardless of whether the AI successfully matches a homeowner or creates a claim.

## Key Features

### ✅ Universal Email Notifications

**Before**: Only sent emails when claims were created  
**After**: Sends emails for ALL calls with dynamic content based on the scenario

### 📧 Three Email Scenarios

#### **Scenario A: Claim Created** 🚨
- **Subject**: `🚨 New Warranty Claim: ${propertyAddress}`
- **When**: Homeowner matched + callIntent is `warranty_issue`
- **Content**: 
  - "A warranty claim has been automatically created"
  - Claim number and link to claim
  - Homeowner details
  - Issue description
- **Primary CTA**: "View Claim" (red button)

#### **Scenario B: Match Found, No Claim** 📞
- **Subject**: `📞 Homeowner Call: ${propertyAddress}`
- **When**: Homeowner matched but intent is NOT `warranty_issue` (e.g., `general_question`, `solicitation`)
- **Content**:
  - "Homeowner called but no claim was automatically created"
  - Call intent displayed
  - Homeowner details
  - Message/description
- **Primary CTA**: "View Homeowner" (green button)

#### **Scenario C: No Match / Unknown Caller** ⚠️
- **Subject**: `⚠️ Unknown Caller: ${phoneNumber}`
- **When**: Address could not be matched to any homeowner in database
- **Content**:
  - "AI could not match this address. Please review manually"
  - Caller phone number prominently displayed
  - Property address (if provided)
  - Action required checklist
- **Primary CTA**: "Review Call" (orange button)

### ✅ Dynamic Email Content

Each scenario has:
- **Custom subject line** with emoji indicator
- **Status badge** (Claim Created / Matched - No Claim / Unmatched)
- **Scenario-specific description**
- **Color-coded CTA buttons**
- **Relevant information highlighted**
- **Action items** (for unknown callers)

### ✅ Safety Features

- **Non-blocking**: Email failures don't crash the webhook
- **Try/catch wrapper**: Errors are logged but don't affect call processing
- **Always returns 200 OK**: Prevents Vapi retry loops
- **Comprehensive logging**: Logs which scenario email was sent

## Email Flow Diagram

```
┌─────────────────────────────────────────────┐
│  Vapi Call Completed                        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Extract Data (with API fallback)           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Attempt to Find Homeowner (fuzzy match)    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Save Call to Database (always)             │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────┴────────┐
         │                 │
    Match Found?      No Match
         │                 │
         ▼                 ▼
┌────────────────┐  ┌──────────────────┐
│ Intent =       │  │  SCENARIO C      │
│ warranty_issue?│  │  NO_MATCH        │
└────┬───────┬───┘  │  ⚠️ Unknown      │
     │       │      │                  │
    Yes     No      │  Send Email:     │
     │       │      │  "Unknown Caller"│
     ▼       ▼      └──────────────────┘
┌─────────┐ ┌──────────────────┐
│ Create  │ │  SCENARIO B      │
│ Claim   │ │  MATCH_NO_CLAIM  │
└────┬────┘ │  📞 Homeowner    │
     │      │                  │
     │      │  Send Email:     │
     │      │  "Homeowner Call"│
     │      └──────────────────┘
     ▼
┌──────────────────┐
│  SCENARIO A      │
│  CLAIM_CREATED   │
│  🚨 Warranty     │
│                  │
│  Send Email:     │
│  "New Warranty   │
│   Claim"         │
└──────────────────┘
```

## Implementation Details

### Logic Flow

1. **Extraction**: Extract `structuredData` from webhook payload
   - Check multiple locations for data
   - API fallback if `propertyAddress` is missing (2-second delay)

2. **Database**: 
   - Attempt fuzzy match on property address
   - **Always save call** to `calls` table (homeowner_id can be null)
   - If (Match + warranty_issue intent), create claim in `claims` table

3. **Notification**: 
   - Determine scenario based on results
   - Send appropriate email **outside any if/else blocks**
   - Email sent for every final event, regardless of match/claim status

### Email Scenario Determination

```typescript
let scenario: 'CLAIM_CREATED' | 'MATCH_NO_CLAIM' | 'NO_MATCH';

if (claimCreated) {
  scenario = 'CLAIM_CREATED';
} else if (matchedHomeowner) {
  scenario = 'MATCH_NO_CLAIM';
} else {
  scenario = 'NO_MATCH';
}
```

### Universal Notification Function

The `sendUniversalEmailNotification()` function:
- Takes scenario as first parameter
- Takes all call data as second parameter
- Dynamically builds subject, content, and CTAs based on scenario
- Wrapped in try/catch (non-blocking)
- Logs which scenario email was sent

## Example Emails

### Scenario A: Claim Created

```
Subject: 🚨 New Warranty Claim: 123 Main St, Seattle, WA 98101

🚨 New Warranty Claim Created
[✓ Claim Created]

A warranty claim has been automatically created for John Doe.

CALL INFORMATION
Property Address: 123 Main St, Seattle, WA 98101
Homeowner: John Doe
Phone: (206) 555-0123
Call Intent: warranty_issue
Urgency: Normal
Claim Number: #3
Match Quality: 95% similar

🔧 ISSUE DESCRIPTION
Leaking roof after recent rain. Water coming through ceiling.

[View Claim] [View All Calls]
```

### Scenario B: Match Found, No Claim

```
Subject: 📞 Homeowner Call: 456 Oak Ave, Seattle, WA 98102

📞 Homeowner Call Received
[✓ Matched - No Claim]

Jane Smith called, but no claim was automatically created. Intent: general_question.

CALL INFORMATION
Property Address: 456 Oak Ave, Seattle, WA 98102
Homeowner: Jane Smith
Phone: (206) 555-0456
Call Intent: general_question
Urgency: Normal
Match Quality: 87% similar

💬 CALLER MESSAGE
Asking about warranty coverage for appliances.

[View Homeowner] [View All Calls]
```

### Scenario C: No Match / Unknown

```
Subject: ⚠️ Unknown Caller: (425) 555-9999

⚠️ Unknown Caller - Manual Review Required
[⚠ Unmatched]

The AI could not match this address to any homeowner in the database. 
Please review manually and create a homeowner record if needed.

CALL INFORMATION
Phone Number: (425) 555-9999
Property Address: 789 Pine St, Bellevue, WA 98004
Caller Name: Bob Johnson
Call Intent: warranty_issue
Urgency: 🔥 URGENT

💬 CALLER MESSAGE
Foundation cracks in basement. Urgent repair needed.

⚠️ ACTION REQUIRED
This caller could not be matched to a homeowner. Please:
• Verify if this is a valid homeowner
• Check if the address was captured correctly
• Add homeowner to database if needed
• Create a claim manually if this is a warranty issue

[Review Call] [View All Calls]
```

## Testing

### Test All Three Scenarios

#### Test Scenario A (Claim Created)
```json
{
  "message": {
    "type": "end-of-call-report",
    "call": { "id": "test-claim-created" },
    "analysis": {
      "structuredData": {
        "propertyAddress": "123 Main St, Seattle, WA 98101",
        "homeownerName": "John Doe",
        "phoneNumber": "+12065550123",
        "issueDescription": "Leaking roof after rain",
        "callIntent": "warranty_issue",
        "isUrgent": false
      }
    }
  }
}
```
**Expected**: Email with "🚨 New Warranty Claim" subject

#### Test Scenario B (Match, No Claim)
```json
{
  "message": {
    "type": "end-of-call-report",
    "call": { "id": "test-match-no-claim" },
    "analysis": {
      "structuredData": {
        "propertyAddress": "123 Main St, Seattle, WA 98101",
        "homeownerName": "John Doe",
        "phoneNumber": "+12065550123",
        "issueDescription": "Question about warranty coverage",
        "callIntent": "general_question",
        "isUrgent": false
      }
    }
  }
}
```
**Expected**: Email with "📞 Homeowner Call" subject

#### Test Scenario C (No Match)
```json
{
  "message": {
    "type": "end-of-call-report",
    "call": { "id": "test-no-match" },
    "analysis": {
      "structuredData": {
        "propertyAddress": "999 Unknown St, Unknown City, WA 99999",
        "homeownerName": "Unknown Person",
        "phoneNumber": "+14255559999",
        "issueDescription": "Foundation cracks",
        "callIntent": "warranty_issue",
        "isUrgent": true
      }
    }
  }
}
```
**Expected**: Email with "⚠️ Unknown Caller" subject

### Verify Logs

After each test, check logs for:
```
📧 Determined scenario: CLAIM_CREATED
✅ Sent 'CLAIM_CREATED' email successfully
```

Or:
```
📧 Determined scenario: MATCH_NO_CLAIM
✅ Sent 'MATCH_NO_CLAIM' email successfully
```

Or:
```
📧 Determined scenario: NO_MATCH
✅ Sent 'NO_MATCH' email successfully
```

## Benefits

### For Admins
- ✅ **Never miss a call**: Get notified about every single call
- ✅ **Instant visibility**: Know immediately when unknown callers reach out
- ✅ **Clear action items**: Unknown callers have explicit next steps
- ✅ **Context-aware**: Different email formats help prioritize responses

### For Operations
- ✅ **Reduced manual checks**: No need to check dashboard for missed calls
- ✅ **Better tracking**: All calls logged and notified, not just claims
- ✅ **Data quality**: Unknown callers help identify missing homeowners
- ✅ **Process improvement**: Can analyze why addresses don't match

### For Homeowners
- ✅ **No lost calls**: Even unmatched calls get reviewed
- ✅ **Faster response**: Urgent unknown calls highlighted
- ✅ **Better service**: All interactions tracked and followed up

## Migration Notes

### Breaking Changes
**None** - This is a enhancement, not a breaking change.

### Behavior Changes
- **Before**: Only received emails when claims were created
- **After**: Receive emails for ALL calls (3 different formats)

### Email Volume
Expect **3x more emails** if you have:
- Callers with unmatched addresses
- Callers with non-warranty intents (general questions, solicitations)

This is intentional and beneficial for complete visibility.

## Environment Variables

No new environment variables needed. Uses existing:
- `VAPI_SECRET` (required)
- `SENDGRID_API_KEY` (required)
- `SENDGRID_REPLY_EMAIL` (required)
- `ADMIN_NOTIFICATION_EMAIL` (optional fallback)

## Files Modified

- `netlify/functions/vapi-webhook.ts` - Complete rewrite (~1200 lines)

## Deployment

```bash
git add netlify/functions/vapi-webhook.ts
git commit -m "Add universal email notifications for all Vapi calls"
git push
```

Netlify will automatically deploy in 2-3 minutes.

## Support

If you notice:
- **Too many "Unknown Caller" emails**: Check if addresses are being captured correctly
- **Missing emails**: Check SendGrid dashboard and Netlify logs
- **Wrong scenario emails**: Review fuzzy matching threshold (currently 40%)

---

**Version**: 2.0  
**Last Updated**: December 27, 2025  
**File**: `netlify/functions/vapi-webhook.ts`

