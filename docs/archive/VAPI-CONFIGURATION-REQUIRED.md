# 🚨 URGENT: Vapi Assistant Configuration Required

**Date:** December 31, 2025  
**Issue:** Live Vapi calls not extracting structured data  
**Status:** ⚠️ CONFIGURATION NEEDED

## 🔍 Problem Identified

**Symptom:** Webhook receives calls, but `artifact.structuredOutputs` is empty `{}`

**Root Cause:** The Vapi Assistant is NOT configured to extract structured data using the JSON Schema.

## 📝 Vapi Dashboard Terminology

**Important:** Vapi uses different terminology in their dashboard:

- ✅ **"Server URL"** = Webhook URL (where to send call data)
- ✅ **"Server URL Secret"** = Webhook Secret (authentication)
- ✅ **"Structured Outputs"** or **"Artifact Plan"** = Data extraction configuration
- ✅ **"Model"** = The AI model used for extraction (use Gemini 1.5 Flash)

## ✅ Solution: Configure Vapi Dashboard

### Step 1: Upload JSON Schema to Vapi Dashboard

1. Go to https://dashboard.vapi.ai
2. Navigate to your **Assistant** settings
3. Find the **"Structured Outputs"** or **"Artifact"** section
4. Click **"Add Structured Output"** or **"Configure Extraction"**
5. Upload the file: `vapi-punchlist-schema.json`

**OR** paste this schema directly:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Cascade Connect Warranty Extraction",
  "description": "Schema for extracting key information from Vapi AI calls for warranty and punch list management.",
  "type": "object",
  "properties": {
    "propertyAddress": {
      "type": "string",
      "description": "The complete physical address of the property or job site mentioned in the call. Look for phrases like 'my address is', 'the property at', 'job site location'. Prioritize full address, but extract partial if only that is available. If not mentioned, use 'Not Provided'.",
      "minLength": 5,
      "maxLength": 300,
      "default": "Not Provided"
    },
    "homeownerName": {
      "type": "string",
      "description": "The full name of the homeowner or the person making the call. Look for phrases like 'This is [Name]', 'My name is [Name]', 'I'm calling on behalf of [Name]'. If the name is not explicitly stated, use 'Not Provided'.",
      "minLength": 2,
      "maxLength": 150,
      "default": "Not Provided"
    },
    "phoneNumber": {
      "type": "string",
      "description": "The best contact phone number for follow-up. Extract any phone number mentioned. If multiple, prioritize the one explicitly given for contact. If not mentioned, use 'Not Provided'.",
      "minLength": 7,
      "maxLength": 20,
      "pattern": "^[0-9()+\\-\\s.ext]*$|^Not Provided$",
      "default": "Not Provided"
    },
    "issueDescription": {
      "type": "string",
      "description": "A detailed summary of the specific construction defect, punch list item, or warranty claim. Capture the location of the issue, the problem itself, and any timing or severity mentioned. If multiple issues are mentioned, summarize them concisely. If not mentioned, use 'No issue described'.",
      "minLength": 10,
      "maxLength": 2000,
      "default": "No issue described"
    },
    "isUrgent": {
      "type": "boolean",
      "description": "Set to true only if the caller expresses an emergency, safety hazard, or immediate threat. Look for keywords like 'emergency', 'immediate', 'dangerous', 'active leak', 'electrical sparks', 'urgent', 'ASAP'. Otherwise, set to false.",
      "default": false
    }
  },
  "required": [
    "propertyAddress",
    "homeownerName",
    "phoneNumber",
    "issueDescription",
    "isUrgent"
  ],
  "additionalProperties": false
}
```

### Step 2: Enable Structured Outputs

In the Assistant configuration:

1. **Enable "Structured Outputs"** or **"Artifact Plan"**
2. **Select the model:** Gemini 1.5 Flash or Gemini 3 Flash
3. **Assign the schema** you just uploaded
4. **Save the assistant configuration**

### Step 3: Verify Assistant System Prompt

Make sure your assistant's system prompt asks the caller for the required information:

```
You are a friendly AI assistant for Cascade Connect, a home warranty company.

Your job is to:
1. Greet the caller warmly
2. Ask for their FULL NAME
3. Ask for their PROPERTY ADDRESS (street, city, state, zip)
4. Ask for their PHONE NUMBER
5. Ask them to describe the WARRANTY ISSUE or CONSTRUCTION DEFECT in detail
6. Ask if this is an EMERGENCY or URGENT ISSUE

Be conversational but ensure you collect all 5 pieces of information before ending the call.

Important: Always ask for the complete address including city and state.
```

### Step 4: Configure Webhook Settings (Server URL)

In Vapi Dashboard → Assistant Settings → Server URL:

1. **Server URL:** `https://your-domain.netlify.app/.netlify/functions/vapi-webhook`
   - For local testing: `http://localhost:8888/.netlify/functions/vapi-webhook`
   - Or use ngrok for local testing: `https://your-ngrok-url.ngrok.io/.netlify/functions/vapi-webhook`
2. **Server URL Secret:** (the value from your `.env` file: `ferguson1228`)
3. Make sure the assistant is configured to send the `end-of-call-report` event

**Note:** In Vapi, "Webhook URL" is called "Server URL" in the dashboard.

**Where to find this in Vapi Dashboard:**
```
Dashboard → Assistants → [Your Assistant] → Server URL (tab or section)
```

### Step 4a: (Alternative) Configure at Phone Number Level

You can also configure the Server URL at the Phone Number level:

```
Dashboard → Phone Numbers → [Your Number] → Server URL
```

This is useful if you want different webhooks for different phone numbers.

### Step 5: Test with a Real Call

1. Call your Vapi phone number
2. Provide test information:
   - Name: "John Test"
   - Address: "123 Main St, Seattle, WA 98101"
   - Phone: "206-555-1234"
   - Issue: "The kitchen faucet is leaking"
   - Urgency: "It's not urgent"
3. End the call
4. Check your dashboard for the new call
5. Verify structured data was extracted

## 🔍 How to Verify It's Working

### Check the Logs

After restarting `netlify dev`, when a call comes in you should see:

```
📦 FULL VAPI PAYLOAD: {
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "abc-123-xyz",
      "artifact": {
        "structuredOutputs": {
          "propertyAddress": "123 Main St, Seattle, WA 98101",
          "homeownerName": "John Test",
          "phoneNumber": "206-555-1234",
          "issueDescription": "The kitchen faucet is leaking",
          "isUrgent": false
        }
      }
    }
  }
}
```

✅ **Good:** `structuredOutputs` has all 5 fields with real data

❌ **Bad:** `structuredOutputs: {}` (empty object)

### Check the Vapi Dashboard

1. Go to https://dashboard.vapi.ai
2. Click on **"Calls"**
3. Find your recent call
4. Look for **"Artifact"** or **"Structured Outputs"** section
5. You should see the extracted data there

If it's empty in the Vapi Dashboard, it means:
- ❌ The schema wasn't uploaded correctly
- ❌ Structured outputs aren't enabled
- ❌ The assistant isn't configured to use the schema

## 🎯 Common Vapi Configuration Mistakes

### 1. Schema Not Uploaded
**Problem:** You created `vapi-punchlist-schema.json` but didn't upload it to Vapi  
**Solution:** Upload it in the Vapi Dashboard

### 2. Artifact Plan Not Enabled
**Problem:** Structured outputs feature is disabled  
**Solution:** Enable "Artifact Plan" or "Structured Outputs" in assistant settings

### 3. Wrong Model Selected
**Problem:** Using a model that doesn't support structured outputs  
**Solution:** Use Gemini 1.5 Flash or Gemini 1.5 Pro

### 4. Schema ID Not Linked
**Problem:** Schema uploaded but not linked to the assistant  
**Solution:** In assistant settings, select the schema from the dropdown

### 5. System Prompt Doesn't Ask Questions
**Problem:** The AI doesn't ask for the required information  
**Solution:** Update the system prompt to explicitly request each field

## 📋 Quick Checklist

Before making another test call, verify:

- [ ] `vapi-punchlist-schema.json` uploaded to Vapi Dashboard
- [ ] Structured Outputs / Artifact Plan is **ENABLED**
- [ ] Schema is **LINKED** to the assistant
- [ ] Model is **Gemini 1.5 Flash** or compatible
- [ ] System prompt asks for all required information
- [ ] Webhook URL is configured correctly
- [ ] Webhook secret matches your `.env` file
- [ ] `end-of-call-report` event is enabled

## 🔧 Alternative: Configure via Vapi API

If you prefer to configure via API instead of the dashboard:

```bash
curl -X PATCH https://api.vapi.ai/assistant/{assistant-id} \
  -H "Authorization: Bearer YOUR_VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "artifactPlan": {
      "enabled": true,
      "provider": "gemini-flash-1.5",
      "structuredOutputIds": ["YOUR_SCHEMA_ID"]
    }
  }'
```

Replace:
- `{assistant-id}` with your assistant ID
- `YOUR_VAPI_API_KEY` with your Vapi API key (not the secret)
- `YOUR_SCHEMA_ID` with the ID of the uploaded schema

## 🆘 Still Not Working?

If structured data is still empty after configuration:

### Debug Step 1: Check Vapi Call Logs

In Vapi Dashboard:
1. Go to the call details
2. Look at the "Artifact" tab
3. Check if structured data appears there

**If YES:** The problem is with your webhook extraction logic  
**If NO:** The problem is with Vapi configuration

### Debug Step 2: Enable Full Payload Logging

I've already added this to your webhook:

```typescript
console.log('📦 FULL VAPI PAYLOAD:', JSON.stringify(body, null, 2));
```

Restart `netlify dev` and make a test call. Check the logs to see exactly what Vapi is sending.

### Debug Step 3: Contact Vapi Support

If the configuration looks correct but data still isn't extracting:

1. Go to https://docs.vapi.ai
2. Check the latest documentation for "Structured Outputs" or "Artifact Plan"
3. Contact Vapi support with:
   - Your assistant ID
   - A recent call ID that had empty structured outputs
   - Your JSON schema

## 📚 Related Files

- **JSON Schema:** `vapi-punchlist-schema.json`
- **Webhook Handler:** `netlify/functions/vapi-webhook.ts`
- **Vapi Service:** `lib/services/vapiService.ts`
- **Configuration Docs:** `VAPI-STRUCTURED-DATA-FIX.md`

## 🎯 Expected Result After Configuration

Once properly configured, every Vapi call should:

1. ✅ Extract all 5 fields (propertyAddress, homeownerName, phoneNumber, issueDescription, isUrgent)
2. ✅ Send them in the webhook payload under `message.call.artifact.structuredOutputs`
3. ✅ Save to your database with real data (not "MISSING" or "not provided")
4. ✅ Enable homeowner matching via fuzzy address matching
5. ✅ Allow automatic claim creation for matched homeowners

---

**Priority:** 🔴 **HIGH** - This must be configured for the system to work properly

**Next Action:** Configure the Vapi Assistant in the Dashboard following Step 1-5 above

