# AI Gatekeeper - Complete Configuration Guide

## 🎯 Overview

This guide covers all configuration needed for the complete AI Gatekeeper system:
- Backend environment variables
- Twilio account setup
- Vapi integration
- Mobile app configuration
- Testing procedures

---

## Part 1: Backend Environment Variables

Add these to **Netlify** (Settings → Environment Variables):

### Existing Variables (Already Configured)
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/database

# Vapi Webhook
VAPI_SECRET=your_vapi_webhook_secret

# User Configuration
KEVIN_PHONE_NUMBER=+15551234567  # Your forwarding number

# Gemini AI (Optional - for spam detection)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### NEW Variables (For Mobile VoIP)
```bash
# Twilio Account Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Twilio API Keys (for generating access tokens)
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here

# Twilio TwiML App
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Twilio Client Identity (must match mobile app)
TWILIO_CLIENT_IDENTITY=kevin_pixel
```

---

## Part 2: Twilio Account Setup

### Step 1: Create Twilio Account

1. Go to [twilio.com](https://www.twilio.com/try-twilio)
2. Sign up for free trial (get $15 credit)
3. Verify your phone number
4. Complete account setup

### Step 2: Get Account Credentials

1. Go to [Twilio Console](https://console.twilio.com)
2. Copy **Account SID** and **Auth Token**
3. Save these for Netlify environment variables

### Step 3: Purchase a Phone Number

1. Go to **Phone Numbers** → **Buy a Number**
2. Select country (US)
3. Filter by capabilities:
   - ✅ Voice
   - ✅ SMS (optional)
4. Purchase number
5. Save number (e.g., `+15551234567`)

### Step 4: Create API Key

1. Go to **Account** → **API Keys & Tokens**
2. Click **Create API Key**
3. Friendly name: "AI Gatekeeper Mobile"
4. Key type: **Standard**
5. Click **Create API Key**
6. **IMPORTANT**: Copy **SID** and **Secret** immediately (shown only once)
7. Save as `TWILIO_API_KEY` and `TWILIO_API_SECRET`

### Step 5: Create TwiML App

1. Go to **Voice** → **TwiML Apps**
2. Click **Create new TwiML App**
3. Friendly name: "AI Gatekeeper Voice"
4. **Voice Request URL**:
   ```
   https://your-site.netlify.app/.netlify/functions/twilio-voice-webhook
   ```
   Method: **HTTP POST**
5. Leave other fields empty
6. Click **Save**
7. Copy **TwiML App SID** (starts with `AP...`)
8. Save as `TWILIO_TWIML_APP_SID`

### Step 6: Configure Phone Number

1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Click on your purchased number
3. Scroll to **Voice Configuration**
4. **A Call Comes In**:
   ```
   Webhook: https://your-site.netlify.app/.netlify/functions/twilio-voice-webhook
   HTTP POST
   ```
5. Click **Save**

---

## Part 3: Vapi Integration

### Step 1: Update Vapi Transfer Destination

In your Vapi Dashboard:

1. Go to **Assistants** → Your AI Gatekeeper Assistant
2. Edit **Transfer Destination** for known contacts:
   - Type: **Phone Number**
   - Number: Your **Twilio phone number** (from Step 2.3)
   - Example: `+15551234567`
3. Save changes

### Step 2: Test Transfer Flow

```
Known Contact Calls Vapi Number
    ↓
Vapi checks user_contacts database
    ↓
Match found → Transfer to Twilio number
    ↓
Twilio receives call → Triggers webhook
    ↓
Webhook dials mobile client (kevin_pixel)
    ↓
Mobile app rings → You answer
```

---

## Part 4: Mobile App Configuration

### Step 1: Install Expo CLI & EAS CLI

```bash
npm install -g expo-cli eas-cli
```

### Step 2: Create Expo Account

1. Go to [expo.dev](https://expo.dev)
2. Sign up for free account
3. Verify email

### Step 3: Initialize Mobile Project

```bash
cd "C:\Users\Kevin\Cascade Connect"
mkdir mobile
cd mobile

# Create Expo project
npx create-expo-app@latest . --template blank-typescript

# Install dependencies (see MOBILE-APP-IMPLEMENTATION.md)
npm install # ... all dependencies
```

### Step 4: Configure Clerk for Mobile

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **Applications** → **Native**
4. Add **Android** application:
   - Package name: `com.cascadebuilderservices.aigatekeeper`
5. Add **iOS** application:
   - Bundle ID: `com.cascadebuilderservices.aigatekeeper`
6. Copy **Publishable Key**
7. Add to `.env`:
   ```bash
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

### Step 5: Configure EAS Build

```bash
# Login to Expo
eas login

# Initialize EAS
eas build:configure
```

This creates `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_your_key_here",
        "EXPO_PUBLIC_API_URL": "https://cascadebuilderservices.com"
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

### Step 6: Prebuild Native Projects

```bash
# Generate native projects
npx expo prebuild

# This creates android/ and ios/ directories
```

### Step 7: Install Twilio Voice Native Module

**Android**:

Edit `android/app/build.gradle`:
```gradle
dependencies {
    // ... existing dependencies
    implementation 'com.twilio:voice-android:6.x.x'
}
```

**iOS**:

Edit `ios/Podfile`:
```ruby
pod 'TwilioVoice', '~> 6.x'
```

Then run:
```bash
cd ios && pod install && cd ..
```

### Step 8: Build Development Build

```bash
# For Android
eas build --profile development --platform android

# For iOS (requires Apple Developer account)
eas build --profile development --platform ios

# Or build locally
npx expo run:android
npx expo run:ios
```

---

## Part 5: Testing Procedures

### Test 1: Backend Token Generation

```bash
# Test Twilio token endpoint
curl -X GET https://your-site.netlify.app/.netlify/functions/twilio-token \
  -H "Authorization: Bearer user_2abc123def456"

# Expected response:
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "identity": "user_2abc123def456",
  "expiresIn": 3600
}
```

### Test 2: Voice Webhook

```bash
# Test Twilio voice webhook
curl -X POST https://your-site.netlify.app/.netlify/functions/twilio-voice-webhook \
  -d "From=+15551234567&To=+15559876543&CallSid=CA123"

# Expected response (TwiML):
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" callerId="+15551234567">
    <Client>kevin_pixel</Client>
  </Dial>
  <Say voice="alice">The person you are calling is not available...</Say>
</Response>
```

### Test 3: Mobile App - Contact Sync

1. Open mobile app
2. Sign in with Clerk
3. Click "Sync Contacts"
4. Grant contacts permission
5. Wait for sync to complete
6. Verify in backend:
   ```sql
   SELECT COUNT(*) FROM user_contacts;
   ```

### Test 4: End-to-End Call Flow

**Scenario A: Known Contact**
```
1. Add your personal phone to user_contacts table
2. Call Vapi number from that phone
3. Expected: Call transfers to Twilio → Mobile app rings instantly
4. Accept call on mobile → Connected!
```

**Scenario B: Unknown Contact (Spam)**
```
1. Call Vapi number from unknown phone
2. AI: "Who is this and what do you want?"
3. Say: "I'm calling about solar panels"
4. AI: "Remove this number" → Hangs up
5. Your mobile never rings (spam blocked!)
```

**Scenario C: Unknown Contact (Legitimate)**
```
1. Call Vapi number from unknown phone
2. AI: "Who is this and what do you want?"
3. Say: "This is UPS with a delivery for Kevin at 123 Main Street"
4. AI transfers call → Twilio → Mobile app rings
5. Accept call → Connected!
```

---

## Part 6: Troubleshooting

### Issue: Token generation fails

**Symptoms**: Mobile app can't connect to Twilio

**Cause**: Missing or incorrect Twilio credentials

**Fix**:
1. Verify all Twilio env vars in Netlify
2. Check Account SID, API Key, API Secret
3. Ensure TwiML App SID is correct
4. Redeploy functions

### Issue: Mobile app doesn't ring

**Symptoms**: Call transfers but mobile doesn't ring

**Cause**: Client identity mismatch

**Fix**:
1. Check `TWILIO_CLIENT_IDENTITY` env var
2. Ensure it matches identity in token
3. Default: `kevin_pixel`
4. Rebuild mobile app if changed

### Issue: Voice webhook returns error

**Symptoms**: Twilio shows webhook error

**Cause**: Webhook URL incorrect or function not deployed

**Fix**:
1. Verify webhook URL in Twilio console
2. Test webhook with cURL
3. Check Netlify function logs
4. Ensure function is deployed

### Issue: Contacts not syncing

**Symptoms**: Sync button doesn't work

**Cause**: Permissions or auth error

**Fix**:
1. Grant contacts permission in phone settings
2. Verify Clerk auth token
3. Check backend logs
4. Test API endpoint with cURL

### Issue: Call quality poor

**Symptoms**: Choppy audio, dropped calls

**Cause**: Network issues or codec problems

**Fix**:
1. Use Wi-Fi instead of cellular
2. Check Twilio Voice status page
3. Reduce background apps
4. Update Twilio SDK version

---

## Part 7: Cost Estimation

### Twilio Costs (Pay-as-you-go)

- **Phone number**: $1.00/month
- **Voice calls**: $0.013/minute
- **Recording** (optional): $0.0025/minute

**Example Monthly Cost**:
- 100 incoming calls × 3 min average = 300 minutes
- Cost: 300 × $0.013 = $3.90/month
- Plus phone number: $1.00/month
- **Total: ~$5/month**

### Vapi Costs

- Check [Vapi pricing page](https://vapi.ai/pricing)
- Usually free tier available for testing

### Netlify Costs

- **Free tier**: 100GB bandwidth, 300 build minutes
- **Pro**: $19/month (if needed for higher limits)

**Total Estimated Cost**: $5-25/month

---

## Part 8: Production Checklist

Before going live:

- [ ] All environment variables configured in Netlify
- [ ] Twilio account verified (add payment method)
- [ ] Phone number purchased and configured
- [ ] TwiML app created and configured
- [ ] Vapi webhook using Bearer token auth
- [ ] Mobile app built and tested
- [ ] Contact sync working
- [ ] Known contact transfer working
- [ ] Unknown contact AI gatekeeper working
- [ ] Call quality acceptable
- [ ] Logs monitoring set up
- [ ] Backup plan for downtime

---

## Part 9: Maintenance

### Daily
- Monitor Netlify logs for errors
- Check Twilio usage dashboard

### Weekly
- Review blocked spam calls
- Check false positive rate
- Sync contacts if changed

### Monthly
- Review Twilio bill
- Update AI prompts if needed
- Check for SDK updates

---

## 📚 Related Documentation

- [AI Gatekeeper Implementation](./AI-GATEKEEPER-IMPLEMENTATION.md)
- [Mobile App Implementation](./MOBILE-APP-IMPLEMENTATION.md)
- [Deployment Checklist](./AI-GATEKEEPER-DEPLOYMENT-CHECKLIST.md)
- [Bearer Token Auth Update](./VAPI-BEARER-TOKEN-AUTH-UPDATE.md)

---

## 🆘 Support

- **Twilio Support**: [support.twilio.com](https://support.twilio.com)
- **Vapi Support**: support@vapi.ai
- **Netlify Support**: support@netlify.com
- **Expo Support**: [docs.expo.dev](https://docs.expo.dev)

---

**Last Updated**: 2026-01-20  
**Status**: ✅ Complete Configuration Guide  
**Version**: 1.0.0
