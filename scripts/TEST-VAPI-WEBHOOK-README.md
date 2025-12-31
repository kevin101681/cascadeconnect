# 🧪 Vapi Webhook Testing Guide

This directory contains test scripts to verify the Vapi webhook handler's ability to extract structured data from the new Late-2025 payload format.

## 📁 Files

- **`test-vapi-webhook.ts`** - TypeScript version (requires tsx)
- **`test-vapi-webhook.js`** - JavaScript version (runs with Node.js)

## 🚀 Quick Start

### Prerequisites

1. **Environment Variables Required:**
   ```bash
   VAPI_SECRET=your_vapi_secret_here
   DATABASE_URL=your_neon_database_url
   GEMINI_API_KEY=your_gemini_api_key (for emergency extraction)
   ```

2. **Start Netlify Dev Server:**
   ```bash
   netlify dev
   ```
   This starts the local development server at `http://localhost:8888`

### Running Tests

**Option 1: TypeScript (Recommended)**
```bash
npm install -g tsx
tsx scripts/test-vapi-webhook.ts
```

**Option 2: JavaScript**
```bash
node scripts/test-vapi-webhook.js
```

**Option 3: Using npx (no global install)**
```bash
npx tsx scripts/test-vapi-webhook.ts
```

## 🧪 Test Scenarios

The script runs 4 comprehensive test scenarios:

### 1. **Standard Warranty Call (New Format)** ✅
Tests the new `artifact.structuredOutputs` location (Late-2025 Vapi format)
- Property: `123 Test Lane, Builder City, WA 98101`
- Homeowner: `Test User`
- Issue: Master bathroom faucet leak
- Urgent: `true`

### 2. **Non-Urgent Call** ✅
Tests standard warranty issue without urgency
- Property: `456 Oak Avenue, Test City, OR 97001`
- Homeowner: `Jane Smith`
- Issue: Cabinet door misalignment
- Urgent: `false`

### 3. **Legacy Format (Backward Compatibility)** ✅
Tests old `analysis.structuredData` location
- Verifies backward compatibility with pre-2025 Vapi format
- Should still extract data successfully

### 4. **Missing Data (Emergency Extraction)** 🆘
Tests fallback mechanisms when structured data is empty
- Empty `structuredOutputs` object
- Should trigger Gemini emergency extraction from transcript
- Verifies 3-tier extraction pipeline

## 📊 Expected Output

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    VAPI WEBHOOK TEST SUITE                                ║
║                    December 31, 2025                                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

🔧 Configuration:
   Webhook URL: http://localhost:8888/.netlify/functions/vapi-webhook
   Vapi Secret: ab12cd34ef...
   Test Call ID: test-call-1735689123456

================================================================================
🧪 TEST: Scenario 1: Standard Warranty Call (New Format)
================================================================================
📤 Payload: { ... }

📥 Response Status: 200
📥 Response Body: { success: true }
✅ TEST PASSED

...

╔═══════════════════════════════════════════════════════════════════════════╗
║                          TEST SUMMARY                                     ║
╚═══════════════════════════════════════════════════════════════════════════╝

✅ Scenario 1: Standard Warranty Call (New Format): PASSED
✅ Scenario 2: Non-Urgent Call: PASSED
✅ Scenario 3: Legacy Format (Backward Compatibility): PASSED
✅ Scenario 4: Missing Data (Emergency Extraction Test): PASSED

📊 Total: 4 tests
✅ Passed: 4
❌ Failed: 0
```

## 🔍 Verification Steps

After running tests, verify the data pipeline:

### 1. Check Netlify Function Logs
```bash
netlify functions:log vapi-webhook --live
```

**Look for:**
- `🔍 PAYLOAD SNIFFER` - Shows where data was found
- `✅ Found structured data with keys:` - Extraction successful
- `🆘 EMERGENCY EXTRACTION` - Gemini fallback triggered (Scenario 4)
- `✅ Call saved to database` - DB write successful

### 2. Verify Database Records
```bash
psql $DATABASE_URL -c "SELECT vapi_call_id, property_address, homeowner_name, is_urgent FROM calls ORDER BY created_at DESC LIMIT 5;"
```

**Expected:**
```
         vapi_call_id         |          property_address           | homeowner_name | is_urgent
------------------------------+-------------------------------------+----------------+-----------
 test-call-1735689123456      | 123 Test Lane, Builder City, WA... | Test User      | t
 test-call-non-urgent-...     | 456 Oak Avenue, Test City, OR...   | Jane Smith     | f
 test-call-legacy-...         | 789 Pine Street, Legacy Town, CA.. | Legacy User    | f
 test-call-missing-...        | 999 Emergency Lane, Fallback City  | John Doe       | f
```

### 3. Check Call Cards in Dashboard
Navigate to the Calls tab in the admin dashboard and verify:
- All 4 test calls appear
- Property addresses are correctly extracted
- Homeowner names match
- Urgency flags are accurate
- Transcripts are saved

## 🛠️ Troubleshooting

### Error: "VAPI_SECRET not found"
**Solution:** Add to `.env` file:
```bash
VAPI_SECRET=your_actual_vapi_secret
```

### Error: "Connection refused"
**Solution:** Start Netlify dev server first:
```bash
netlify dev
```

### Error: "Invalid signature" (401)
**Solution:** Ensure VAPI_SECRET matches what's configured in Vapi dashboard

### Tests pass but no data in database
**Solution:** Check DATABASE_URL is configured and Neon is accessible:
```bash
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1;"
```

### Emergency extraction not working (Scenario 4)
**Solution:** Verify GEMINI_API_KEY is set:
```bash
echo $GEMINI_API_KEY
```

## 🔧 Configuration Options

You can override the webhook URL via environment variable:

```bash
# Test against deployed Netlify function
export VAPI_WEBHOOK_TEST_URL=https://your-site.netlify.app/.netlify/functions/vapi-webhook
tsx scripts/test-vapi-webhook.ts

# Test against local server (default)
export VAPI_WEBHOOK_TEST_URL=http://localhost:8888/.netlify/functions/vapi-webhook
tsx scripts/test-vapi-webhook.ts
```

## 📝 Customizing Tests

To add your own test scenario, add to the test file:

```javascript
const MY_CUSTOM_TEST = {
  message: {
    type: 'end-of-call-report',
    call: {
      id: `test-call-custom-${Date.now()}`,
      transcript: 'Your custom transcript...',
      artifact: {
        structuredOutputs: {
          propertyAddress: 'Your address',
          homeownerName: 'Your name',
          phoneNumber: 'Your phone',
          issueDescription: 'Your issue',
          isUrgent: false
        }
      }
    }
  }
};

// Add to runAllTests():
results.push(await sendWebhookRequest(MY_CUSTOM_TEST, 'My Custom Scenario'));
```

## 🎯 Success Criteria

All tests should pass (✅) and you should see:

1. ✅ Netlify logs show `✅ Found structured data with keys:`
2. ✅ Database has 4 new call records
3. ✅ Dashboard displays all test calls with correct data
4. ✅ Scenario 4 triggers emergency extraction (check logs for `🆘 EMERGENCY EXTRACTION`)

## 📚 Related Documentation

- **`VAPI-STRUCTURED-DATA-FIX.md`** - Complete fix documentation
- **`vapi-punchlist-schema.json`** - JSON Schema for Vapi Dashboard
- **`lib/services/vapiService.ts`** - Extraction service implementation
- **`netlify/functions/vapi-webhook.ts`** - Webhook handler

---

**🎉 Happy Testing!** If all tests pass, your Vapi integration is ready for production! 🚀

