# Twilio to Telnyx Voice Migration Guide

## 🔄 Migration Overview

This guide documents the migration of **Voice features only** from Twilio to Telnyx, while keeping Twilio for SMS and other features.

**Status**: ✅ Code Complete - Ready for Configuration

---

## 📦 What Changed

### Backend Changes

#### 1. New Dependencies
- ✅ `telnyx` npm package installed (Twilio remains installed for SMS)

#### 2. New Netlify Functions

**`netlify/functions/telnyx-token.ts`** (NEW)
- Generates Telnyx on-demand credentials for mobile client
- Replaces `/twilio-token` for voice purposes
- Returns JWT token with 24-hour expiration
- Hardcoded username: `kevin_pixel`

**`netlify/functions/telnyx-voice-webhook.ts`** (NEW)
- Handles Telnyx Call Control webhooks
- Processes `call.initiated` and `call.answered` events
- Transfers calls to registered SIP client (mobile app)
- Replaces `/twilio-voice-webhook` for voice

#### 3. Updated Functions

**`netlify/functions/vapi-gatekeeper.ts`** (MODIFIED)
- Updated `generateTransferResponse()` to use `TELNYX_PHONE_NUMBER`
- Still transfers known contacts to Telnyx number (instead of Twilio)
- No other logic changes

### Mobile App Changes

#### 1. SDK Migration
- ✅ Replaced `@twilio/voice-react-native-sdk` with `@telnyx/react-native`
- Updated imports and API calls throughout

#### 2. Updated Files

**`services/voice.ts`** (REFACTORED)
- Replaced `Voice` class with `TelnyxClient`
- Changed `CallInvite` to `Invitation`
- Updated methods: `accept()` → `answer()`, `disconnect()` → `hangup()`
- Added socket event listeners
- Changed `register()` to `connect()`

**`services/api.ts`** (UPDATED)
- Renamed `fetchTwilioToken()` to `fetchTelnyxToken()`
- Updated endpoint from `/twilio-token` to `/telnyx-token`
- Returns `{ token, username }` instead of `{ token, identity }`

**`components/IncomingCallModal.tsx`** (UPDATED)
- Changed prop from `callInvite: CallInvite` to `invitation: Invitation`
- Updated property access (e.g., `invitation.callerName`)

**`App.tsx`** (UPDATED)
- Changed state variable from `incomingCallInvite` to `incomingInvitation`
- Updated type from `CallInvite` to `Invitation`
- Updated all references

**`app.config.js`** (UPDATED)
- Removed `@twilio/voice-react-native-sdk` plugin
- Removed `@clerk/clerk-expo/plugin` (moved to manual config)
- Updated Android permissions for VoIP
- Added iOS `UIBackgroundModes` for VoIP

**`eas.json`** (UPDATED)
- Added production Clerk key: `pk_live_Y2xlcmsuY2FzY2FkZWNvbm5lY3QuYXBwJA`
- Set `EXPO_PUBLIC_API_URL` to production URL

---

## ⚙️ Configuration Required

### 1. Backend Environment Variables (Netlify)

Add these NEW variables to Netlify:

```bash
# Telnyx Configuration
TELNYX_API_KEY=KEY...                    # Your Telnyx API key
TELNYX_CONNECTION_ID=...                 # Your Telnyx SIP Connection ID
TELNYX_PHONE_NUMBER=+1234567890          # Your Telnyx phone number
TELNYX_SIP_USERNAME=kevin_pixel          # SIP username for mobile client
```

Keep these EXISTING variables (for SMS):

```bash
# Twilio (Keep for SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxx...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

### 2. Telnyx Dashboard Setup

#### A. Create SIP Connection
1. Go to: https://portal.telnyx.com/#/app/connections
2. Click "Create New Connection"
3. Select "Credential Connection"
4. Name: "AI Gatekeeper Mobile"
5. Save and copy the **Connection ID**

#### B. Purchase Phone Number
1. Go to: https://portal.telnyx.com/#/app/numbers
2. Purchase a phone number
3. Assign it to your SIP Connection
4. Note the number for `TELNYX_PHONE_NUMBER`

#### C. Configure Voice Settings
1. Go to your phone number settings
2. Voice Settings:
   - **Webhook URL**: `https://www.cascadeconnect.app/.netlify/functions/telnyx-voice-webhook`
   - **HTTP Method**: POST
   - **Failover URL**: (Optional) Same URL
3. Save

#### D. Configure Call Control
1. Go to your SIP Connection settings
2. Enable "Call Control" application
3. Set webhook URL to same as above
4. Enable these events:
   - `call.initiated`
   - `call.answered`
   - `call.hangup`

### 3. Vapi Configuration Update

Update your Vapi phone number forwarding:

1. Go to: https://dashboard.vapi.ai
2. Select your phone number
3. Update transfer destination from Twilio number to **Telnyx number**
4. Keep webhook URL pointing to `/vapi-gatekeeper`

---

## 🔄 Call Flow (Updated)

### Known Contact Flow
```
Mom calls Vapi number
  ↓
Vapi hits /vapi-gatekeeper webhook
  ↓
Database lookup → Match found
  ↓
Transfer to TELNYX_PHONE_NUMBER
  ↓
Telnyx triggers /telnyx-voice-webhook
  ↓
Answer call + Transfer to SIP client (kevin_pixel)
  ↓
Mobile app rings via Telnyx SDK
  ↓
Accept → Connected
```

### Unknown Contact Flow
```
Spam caller → Vapi number
  ↓
Vapi hits /vapi-gatekeeper webhook
  ↓
Database lookup → No match
  ↓
Return aggressive AI assistant config
  ↓
AI screens call (Vapi handles this)
  ↓
If legit → Transfer to Telnyx
  ↓
Mobile rings
```

---

## 📊 Migration Checklist

### Backend
- [x] Install `telnyx` npm package
- [x] Create `telnyx-token.ts` function
- [x] Create `telnyx-voice-webhook.ts` function
- [x] Update `vapi-gatekeeper.ts` transfer destination
- [ ] Add Telnyx environment variables to Netlify
- [ ] Deploy to production
- [ ] Test `/telnyx-token` endpoint
- [ ] Test `/telnyx-voice-webhook` endpoint

### Telnyx Dashboard
- [ ] Create SIP Connection
- [ ] Purchase phone number
- [ ] Configure voice webhook
- [ ] Enable Call Control events
- [ ] Test call routing

### Mobile App
- [x] Replace Twilio SDK with Telnyx SDK
- [x] Update all service files
- [x] Update components
- [x] Update App.tsx
- [x] Update config files
- [ ] Rebuild app with EAS
- [ ] Test on device

### Vapi
- [ ] Update transfer destination to Telnyx number
- [ ] Test known contact transfer
- [ ] Test unknown contact screening

---

## 🧪 Testing

### Test Backend Token Generation

```bash
curl -X GET \
  https://www.cascadeconnect.app/.netlify/functions/telnyx-token \
  -H "Authorization: Bearer test_user_123"

# Expected: { "token": "...", "username": "kevin_pixel", "connection_id": "...", "expires_at": "..." }
```

### Test Voice Webhook

```bash
curl -X POST \
  https://www.cascadeconnect.app/.netlify/functions/telnyx-voice-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "event_type": "call.initiated",
      "payload": {
        "call_control_id": "test_123",
        "from": "+15551234567",
        "to": "+15559876543",
        "call_session_id": "session_123"
      }
    }
  }'

# Expected: { "success": true }
```

### Test Mobile App

1. Build app: `cd cascade-mobile && npx eas-cli build --profile development --platform android`
2. Install on device
3. Sign in with Clerk
4. Check status shows "ACTIVE" (green)
5. Have someone call your Telnyx number
6. App should ring

---

## 🔀 Comparison: Twilio vs Telnyx

| Feature | Twilio | Telnyx |
|---------|--------|--------|
| **Voice SDK** | `@twilio/voice-react-native-sdk` | `@telnyx/react-native` |
| **Token Type** | AccessToken with VoiceGrant | On-demand Credential |
| **Call Object** | `Call` | `Call` |
| **Invitation** | `CallInvite` | `Invitation` |
| **Answer** | `callInvite.accept()` | `invitation.answer()` |
| **Hangup** | `call.disconnect()` | `call.hangup()` |
| **Connection** | `voice.register(token)` | `client.connect()` |
| **Events** | `Voice.Event.*` | String events on client |
| **Identity** | Set in token | Username in credential |

---

## 💰 Cost Comparison

| Service | Twilio | Telnyx |
|---------|--------|--------|
| Phone Number | $1.00/month | $0.40/month |
| Inbound Voice | $0.0085/min | $0.004/min |
| Outbound Voice | $0.013/min | $0.005/min |
| **Estimated (100 calls, 3 min avg)** | **$3.90/month** | **$1.40/month** |

**Savings**: ~60% on voice costs

---

## 🚨 Rollback Plan

If you need to rollback to Twilio:

1. **Backend**: 
   - Revert to old Twilio functions
   - Update environment variables
   - Redeploy

2. **Mobile**:
   - Revert mobile code changes (Git)
   - Rebuild app with Twilio SDK
   - Redeploy

3. **Vapi**:
   - Update transfer destination back to Twilio number

---

## 📚 Additional Resources

- [Telnyx Call Control API](https://developers.telnyx.com/docs/api/v2/call-control)
- [Telnyx React Native SDK](https://github.com/team-telnyx/react-native-telnyx)
- [Telnyx Portal](https://portal.telnyx.com)
- [Telnyx Pricing](https://telnyx.com/pricing/voice)

---

## ✅ Success Criteria

**Backend Working:**
- `/telnyx-token` returns valid credential
- `/telnyx-voice-webhook` processes events
- Telnyx dashboard shows call activity

**Mobile Working:**
- App connects to Telnyx
- Status shows "ACTIVE"
- Incoming calls ring
- Accept/reject works

**End-to-End:**
- Known contact → Instant ring
- Unknown spam → Blocked
- Call quality good

---

**Migration Date**: 2026-01-20  
**Status**: ✅ Code Complete - Awaiting Configuration  
**Next Step**: Add Telnyx environment variables and configure dashboard
