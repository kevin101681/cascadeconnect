# 🚨 VAPI WEBHOOK DEBUG & REFACTOR - COMPLETE

**Date:** December 31, 2025  
**Status:** ✅ IMPLEMENTED - READY FOR TESTING

## 🎯 Problem Summary

1. **URL Confusion:** Which URL to use in Vapi Dashboard?
2. **Data Extraction Failure:** Live calls returning empty structured data
3. **Payload Structure Unknown:** Need to see actual Vapi payload structure

## ✅ SOLUTION 1: CORRECT VAPI URL

### 🔴 **USE THIS URL IN VAPI DASHBOARD:**

```
https://cascadeconnect.netlify.app/api/webhook/vapi
```

**❌ DO NOT USE:** `https://cascadeconnect.netlify.app/.netlify/functions/vapi-webhook`

### 📋 Why This URL?

Your project is a **Vite/React SPA** (NOT Next.js App Router) deployed on Netlify with Netlify Functions.

The `public/_redirects` file maps the clean API route to the internal function:

```
/api/webhook/vapi  →  /.netlify/functions/vapi-webhook
```

This allows you to use a clean, professional URL externally while Netlify handles the routing internally.

### 🔧 Vapi Dashboard Configuration

**Go to:** Vapi Dashboard → Assistant → **Server URL**

```
Server URL: https://cascadeconnect.netlify.app/api/webhook/vapi
Server URL Secret: ferguson1228
```

## ✅ SOLUTION 2: DYNAMIC UUID-AGNOSTIC EXTRACTION

### 🚨 The Problem

Vapi's 2025 update may wrap structured outputs in a UUID key:

**Old Format (Flat):**
```json
{
  "artifact": {
    "structuredOutputs": {
      "propertyAddress": "123 Main St",
      "homeownerName": "John Doe"
    }
  }
}
```

**New Format (UUID-Wrapped):**
```json
{
  "artifact": {
    "structuredOutputs": {
      "so-1234-5678-abcd-efgh": {
        "propertyAddress": "123 Main St",
        "homeownerName": "John Doe"
      }
    }
  }
}
```

### ✅ The Fix

Updated `lib/services/vapiService.ts` → `extractStructuredData()` to:

1. **Check for expected keys** (propertyAddress, homeownerName, etc.)
2. **If missing**, iterate through `Object.values(structuredOutputs)`
3. **Find the first object** that contains our expected keys
4. **Unwrap it** and use that data

This makes the extraction **ID-agnostic** - it works with or without UUID wrapping.

### 🔍 Code Implementation

```typescript
// If structuredData doesn't have our expected keys
if (!hasExpectedKeys) {
  console.log('🔍 Checking for UUID wrapping...');
  
  // Get all values from the structuredOutputs object
  const values = Object.values(structuredData);
  
  // Find the first value that looks like our data
  const unwrappedData = values.find((val: any) => {
    return val && 
           typeof val === 'object' && 
           (val.propertyAddress || val.homeownerName || val.phoneNumber);
  });
  
  if (unwrappedData) {
    console.log('✅ Found UUID-wrapped data! Unwrapping...');
    structuredData = unwrappedData;
  }
}
```

## ✅ SOLUTION 3: BLIND LOGGING

### 📊 Enhanced Logging Added

**Location:** `netlify/functions/vapi-webhook.ts`

**What's Logged:**
1. **Request metadata** (timestamp, method, headers)
2. **Complete raw payload** (formatted JSON)
3. **Specific critical fields**:
   - `message.type`
   - `call.id`
   - `artifact` existence
   - `structuredOutputs` existence

**Example Output:**
```
================================================================================
🚀 [VAPI WEBHOOK] [req-1234567890-abc123] New webhook received
⏰ Timestamp: 2025-12-31T20:00:00.000Z
📍 HTTP Method: POST
📦 Headers: { ... }
================================================================================

📦 ========== FULL VAPI PAYLOAD ==========
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "call-abc-123",
      "artifact": {
        "structuredOutputs": {
          "propertyAddress": "...",
          "homeownerName": "..."
        }
      }
    }
  }
}
📦 =========================================

🔍 Payload Analysis:
  - message.type: end-of-call-report
  - call.id: call-abc-123
  - artifact exists: true
  - structuredOutputs exists: true

🔍 PAYLOAD SNIFFER - Checking structured data locations:
  ...
✅ Found structured data with keys: [ 'propertyAddress', 'homeownerName', ... ]
```

### 🎯 Purpose

This logging will allow you to:
1. **See exactly what Vapi sends** in the live payload
2. **Identify the message type** to ensure it's `end-of-call-report`
3. **Verify structured outputs** are present
4. **Diagnose UUID wrapping** if it occurs

## 🧪 TESTING INSTRUCTIONS

### Step 1: Update Vapi Dashboard

1. Go to https://dashboard.vapi.ai
2. Navigate to your Assistant
3. Find **"Server URL"** section
4. Update to: `https://cascadeconnect.netlify.app/api/webhook/vapi`
5. Verify secret is: `ferguson1228`
6. **Save changes**

### Step 2: Deploy to Netlify

The changes need to be deployed to Netlify (they're already committed to GitHub).

**Option A: Auto-Deploy** (if enabled)
- Changes will deploy automatically from main branch

**Option B: Manual Deploy**
```bash
git push origin main
```
Then wait for Netlify to build and deploy.

### Step 3: Make a Live Test Call

1. Call your Vapi phone number
2. Provide test information:
   - Name: "Test User"
   - Address: "123 Test St, Seattle, WA 98101"
   - Phone: "206-555-1234"
   - Issue: "Testing extraction"
   - Urgency: "Not urgent"
3. Complete the call

### Step 4: Check Netlify Logs

**View logs in real-time:**

```bash
netlify functions:log vapi-webhook --live
```

**Or view in Netlify Dashboard:**
1. Go to https://app.netlify.com
2. Select your site
3. Go to **Functions** → `vapi-webhook`
4. Click **Function logs**

**Look for:**
- `📦 FULL VAPI PAYLOAD` - The complete payload structure
- `message.type: end-of-call-report` - Confirms it's the right event
- `✅ Found structured data with keys` - Extraction successful
- `🔍 Found UUID-wrapped data! Unwrapping...` - If UUID wrapping is present

### Step 5: Verify in Dashboard

1. Check Cascade Connect dashboard
2. Look for the new call
3. Verify data was extracted correctly

## 📋 Expected Outcomes

### ✅ Success Looks Like:

**Logs:**
```
✅ Found structured data with keys: [ 'propertyAddress', 'homeownerName', 'phoneNumber', 'issueDescription', 'isUrgent' ]
✅ Call saved to database
```

**Dashboard:**
- Call appears with all 5 fields populated
- Property address, homeowner name, phone, description, urgency all present
- Homeowner matching may trigger (if address matches)
- Email sent with complete information

### ❌ Failure Looks Like:

**Logs:**
```
🚨 STRUCTURED DATA IS EMPTY OR MISSING!
```

**Dashboard:**
- Call appears but fields show "MISSING" or "not provided"
- No homeowner matching possible
- Email sent but with incomplete data

**If This Happens:**
1. Check the full payload in logs
2. Verify Vapi assistant has Structured Outputs enabled
3. Confirm the JSON schema is uploaded and linked
4. Check that the assistant asks for all required information

## 🔧 Files Modified

| File | Changes |
|------|---------|
| `netlify/functions/vapi-webhook.ts` | Added blind logging, enhanced payload analysis |
| `lib/services/vapiService.ts` | Added UUID-agnostic extraction, dynamic unwrapping |
| `VAPI-CONFIGURATION-REQUIRED.md` | Updated with correct URL terminology |

## 🔗 Related Documentation

- **Configuration Guide:** `VAPI-CONFIGURATION-REQUIRED.md`
- **Testing Guide:** `VAPI-WEBHOOK-TESTING-GUIDE.md`
- **Success Summary:** `VAPI-TESTING-SUCCESS-SUMMARY.md`
- **Schema File:** `vapi-punchlist-schema.json`

## 🆘 Troubleshooting

### Issue: Still Getting Empty Structured Data

**Check:**
1. Is the Server URL correct in Vapi Dashboard?
2. Is Structured Outputs enabled in the assistant?
3. Is the JSON schema uploaded and linked?
4. Does the assistant prompt ask for all required info?

**Debug:**
- Look at the full payload in Netlify logs
- Check if `artifact.structuredOutputs` exists
- Check if it's an empty object `{}` or missing entirely

### Issue: 401 Unauthorized

**Check:**
- Server URL Secret in Vapi matches `.env` file (`ferguson1228`)
- Secret doesn't have extra spaces or quotes

### Issue: Logs Not Showing

**Check:**
- Changes deployed to Netlify (not just committed to Git)
- Looking at the right function logs
- Using `netlify functions:log vapi-webhook --live`

## 🎯 Success Criteria

- [ ] Vapi Server URL updated to `/api/webhook/vapi`
- [ ] Changes deployed to Netlify production
- [ ] Live test call made
- [ ] Full payload visible in Netlify logs
- [ ] Structured data extracted successfully
- [ ] All 5 fields populated in dashboard
- [ ] Email received with complete information

---

**Status:** Ready for live testing  
**Next Action:** Update Vapi Server URL and make test call  
**Expected Result:** Full data extraction from live calls

