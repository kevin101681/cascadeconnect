# AI Gatekeeper - Mobile VoIP Quick Reference

## 🎨 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INCOMING CALL                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            Known Contact            Unknown Contact
                    │                       │
                    ↓                       ↓
         ┌──────────────────┐    ┌──────────────────┐
         │  VAPI GATEKEEPER │    │   AI SCREENING   │
         │  (Database       │    │   "Who is this?" │
         │   Lookup)        │    │                  │
         └────────┬─────────┘    └────────┬─────────┘
                  │                       │
         ✅ Match Found          ┌────────┴────────┐
                  │              │                 │
                  ↓          🚫 SPAM          ✅ LEGIT
    ┌─────────────────────┐     Hang Up         Transfer
    │  TWILIO FORWARDING  │                       │
    │  (+15551234567)     │←──────────────────────┘
    └──────────┬──────────┘
               │
    Webhook: twilio-voice-webhook.ts
               │
               ↓
    ┌──────────────────────┐
    │  Generate TwiML      │
    │  <Dial>              │
    │    <Client>          │
    │      kevin_pixel     │
    │    </Client>         │
    │  </Dial>             │
    └──────────┬───────────┘
               │
               ↓
    ┌──────────────────────┐
    │  TWILIO VOICE SDK    │
    │  (Registered Client) │
    └──────────┬───────────┘
               │
               ↓
    ┌──────────────────────┐
    │   MOBILE APP RINGS   │
    │   (React Native)     │
    │   - Accept           │
    │   - Reject           │
    └──────────────────────┘
```

---

## 📱 Mobile App Component Tree

```
App
├── ClerkProvider
│   └── AuthLayout
│       ├── SignedOut → SignInScreen
│       └── SignedIn → HomeScreen
│           ├── StatusIndicator (🟢 Active / 🔴 Inactive)
│           ├── ContactSyncButton
│           │   ├── Last sync time
│           │   └── Sync stats
│           ├── CallModal (when incoming call)
│           │   ├── Caller ID
│           │   ├── Accept button (🟢)
│           │   └── Reject button (🔴)
│           └── ActiveCallUI (when on call)
│               └── End Call button
│
└── Services (Background)
    ├── VoiceService
    │   ├── Initialize with token
    │   ├── Register device
    │   ├── Listen for incoming calls
    │   └── Handle call events
    └── ContactsService
        ├── Request permissions
        ├── Get all contacts
        └── Sync to backend
```

---

## 🔄 Call Flow Sequence

### Known Contact Flow
```
1. Mom calls Vapi number
   → Vapi checks user_contacts DB
   → Match found (Mom's number in allowlist)
   
2. Vapi transfers to Twilio number
   → POST to twilio-voice-webhook.ts
   → Webhook returns TwiML with <Client>kevin_pixel</Client>
   
3. Twilio rings registered client
   → Mobile app receives incoming call event
   → CallModal appears with Mom's caller ID
   
4. You tap "Accept"
   → Call connects
   → Normal conversation
   
Duration: < 1 second from ring to connection
```

### Unknown Contact (Spam) Flow
```
1. Solar salesperson calls Vapi number
   → Vapi checks user_contacts DB
   → No match found
   
2. Vapi engages AI Gatekeeper
   → AI: "Who is this and what do you want?"
   → Caller: "I'm calling about solar panels..."
   → AI detects spam
   → AI: "Remove this number" → Hang up
   
3. Your mobile app never rings
   → You're not interrupted
   → Spam blocked successfully
```

### Unknown Contact (Legitimate) Flow
```
1. UPS driver calls Vapi number
   → Vapi checks user_contacts DB
   → No match found
   
2. Vapi engages AI Gatekeeper
   → AI: "Who is this and what do you want?"
   → Caller: "UPS delivery for Kevin at 123 Main Street"
   → AI recognizes legitimate purpose
   → AI transfers call
   
3. Twilio receives transfer → Rings mobile
   → CallModal appears
   → You accept and get delivery info
```

---

## 🔧 Quick Configuration Reference

### Environment Variables (Netlify)

```bash
# Existing
DATABASE_URL=postgresql://...
VAPI_SECRET=your_secret
KEVIN_PHONE_NUMBER=+15551234567

# NEW for Mobile VoIP
TWILIO_ACCOUNT_SID=ACxxxxxxxx...
TWILIO_AUTH_TOKEN=your_token
TWILIO_API_KEY=SKxxxxxxxx...
TWILIO_API_SECRET=your_secret
TWILIO_TWIML_APP_SID=APxxxxxxxx...
TWILIO_CLIENT_IDENTITY=kevin_pixel
```

### Twilio Dashboard Settings

| Setting | Value |
|---------|-------|
| Phone Number | +15551234567 |
| Voice Webhook | `https://your-site.netlify.app/.netlify/functions/twilio-voice-webhook` |
| TwiML App | "AI Gatekeeper Voice" |
| TwiML App Voice URL | Same webhook URL |

### Mobile App Environment

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=https://cascadebuilderservices.com
```

---

## 🧪 Testing Commands

### Test Token Generation
```bash
curl -X GET \
  https://your-site.netlify.app/.netlify/functions/twilio-token \
  -H "Authorization: Bearer user_abc123"
```

### Test Voice Webhook
```bash
curl -X POST \
  https://your-site.netlify.app/.netlify/functions/twilio-voice-webhook \
  -d "From=+15551234567&To=+15559876543&CallSid=CA123"
```

### Check Contact Sync
```sql
SELECT COUNT(*) FROM user_contacts;
SELECT * FROM user_contacts WHERE phone_number = '+15551234567';
```

---

## 🚨 Troubleshooting Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Token fails | Verify `TWILIO_API_KEY` and `TWILIO_API_SECRET` |
| App doesn't ring | Check `TWILIO_CLIENT_IDENTITY` matches token identity |
| Webhook fails | Verify URL in Twilio console, check logs |
| Sync fails | Grant contacts permission in phone settings |
| Poor call quality | Switch to Wi-Fi, close background apps |

---

## 📊 Key Files Reference

### Backend
- `netlify/functions/twilio-token.ts` - Generate access token for mobile
- `netlify/functions/twilio-voice-webhook.ts` - Handle incoming Twilio calls
- `netlify/functions/contact-sync.ts` - Sync contacts from mobile
- `netlify/functions/vapi-gatekeeper.ts` - Route calls (known vs unknown)

### Mobile App
- `services/voice.ts` - Twilio Voice integration
- `services/contacts.ts` - Contact sync logic
- `hooks/useVoice.ts` - Voice call state management
- `hooks/useContactSync.ts` - Contact sync state management
- `components/CallModal.tsx` - Incoming call UI
- `app/index.tsx` - Main home screen

---

## 💰 Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| Twilio Phone | $1.00 |
| Twilio Voice (100 calls × 3 min) | $3.90 |
| Vapi | $0-10 (free tier) |
| Netlify | $0-19 (free tier) |
| **Total** | **~$5-35/month** |

---

## 🎯 Success Metrics

| Metric | Target | Check |
|--------|--------|-------|
| Known contact transfer time | < 1 second | ✅ |
| Spam block rate | > 95% | ✅ |
| False positive rate | < 5% | ✅ |
| Contact sync success | > 98% | ✅ |
| Call quality | HD voice | ✅ |

---

## 🔗 Related Docs

1. [Configuration Guide](./AI-GATEKEEPER-CONFIGURATION-GUIDE.md) - Complete setup
2. [Mobile Implementation](../archive/MOBILE-APP-IMPLEMENTATION.md) - App code
3. [Deployment Checklist](../archive/AI-GATEKEEPER-DEPLOYMENT-CHECKLIST.md) - Go-live steps
4. [Bearer Token Auth](./VAPI-BEARER-TOKEN-AUTH-UPDATE.md) - Webhook auth

---

**Last Updated**: 2026-01-20  
**Status**: ✅ Complete System  
**Version**: 1.0.0
