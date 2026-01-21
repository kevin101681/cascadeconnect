# CASCADE MOBILE - COMPLETE DEPLOYMENT GUIDE

## 📋 Overview

This guide walks you through deploying the complete AI Gatekeeper system with mobile app.

---

## ✅ PART 1: Backend Deployment (Ready Now)

Your backend functions are already in place:
- ✅ `twilio-token.ts` - Generate access tokens
- ✅ `twilio-voice-webhook.ts` - Handle Twilio calls
- ✅ `contact-sync.ts` - Sync contacts API
- ✅ `vapi-gatekeeper.ts` - Call routing logic

### Deploy Backend to Netlify

```bash
# From project root
cd "C:\Users\Kevin\Cascade Connect"

# Deploy to production
npm run build
git add .
git commit -m "Add AI Gatekeeper mobile VoIP support"
git push origin main
```

Netlify will automatically deploy when you push to `main`.

### Add Twilio Environment Variables

Go to Netlify Dashboard → Your Site → Environment Variables → Add these:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxx...
TWILIO_AUTH_TOKEN=your_token
TWILIO_API_KEY=SKxxxxxxxx...
TWILIO_API_SECRET=your_secret
TWILIO_TWIML_APP_SID=APxxxxxxxx...
TWILIO_CLIENT_IDENTITY=kevin_pixel
```

Get these from: https://console.twilio.com

---

## 📱 PART 2: Mobile App Setup (Manual Steps Required)

### Step 1: Create Mobile Directory

```bash
cd "C:\Users\Kevin\Cascade Connect"
mkdir cascade-mobile
cd cascade-mobile
```

### Step 2: Initialize Expo Project

```bash
npx create-expo-app@latest . --template blank-typescript
```

### Step 3: Install Dependencies

```bash
npm install @clerk/clerk-expo expo-secure-store @react-native-community/netinfo expo-contacts @twilio/voice-react-native-sdk react-native-safe-area-context
```

### Step 4: Create Directory Structure

```bash
mkdir services
mkdir components
```

### Step 5: Copy Implementation Files

You need to manually create these files from CASCADE-MOBILE-IMPLEMENTATION.md:

**Services:**
1. `services/auth.ts`
2. `services/api.ts`
3. `services/contactSync.ts`
4. `services/voice.ts`

**Components:**
1. `components/GatekeeperStatus.tsx`
2. `components/IncomingCallModal.tsx`

**Root Files:**
1. `App.tsx` (replace existing)
2. `app.config.js` (replace existing)
3. `eas.json` (create new)
4. `.env` (create new)

**Content for .env:**
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
EXPO_PUBLIC_API_URL=https://cascadebuilderservices.com
```

---

## 🔨 PART 3: Build Mobile App

### Option A: EAS Build (Recommended)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure EAS
eas build:configure

# Update eas.json with your Clerk key
# Edit: eas.json → build.development.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

# Build development version
eas build --profile development --platform android
```

**Build takes 10-15 minutes.** You'll get a download link when complete.

### Option B: Local Build (Faster for Testing)

```bash
# Generate native projects
npx expo prebuild

# Connect Android device via USB or start emulator

# Build and run
npx expo run:android
```

---

## 🧪 PART 4: Testing

### Test Backend Functions

```bash
# Test Twilio token generation
curl -X GET \
  https://cascadebuilderservices.com/.netlify/functions/twilio-token \
  -H "Authorization: Bearer test_user_123"

# Test voice webhook
curl -X POST \
  https://cascadebuilderservices.com/.netlify/functions/twilio-voice-webhook \
  -d "From=+15551234567&To=+15559876543&CallSid=CA123"
```

### Test Mobile App

1. Install APK on Android device
2. Open app
3. Sign in with Clerk
4. Check status shows "ACTIVE" (green)
5. Tap "Sync Contacts"
6. Verify sync completes
7. Have someone call your Vapi number
8. App should ring if they're in contacts

---

## ⚙️ PART 5: Twilio Configuration

### Create API Key

1. Go to: https://console.twilio.com/us1/account/keys-credentials/api-keys
2. Click "Create API Key"
3. Name: "AI Gatekeeper Mobile"
4. Key Type: Standard
5. Save the SID and Secret (you can't see the secret again!)

### Create TwiML App

1. Go to: https://console.twilio.com/us1/develop/voice/manage/twiml-apps
2. Click "Create new TwiML App"
3. Name: "AI Gatekeeper Voice"
4. Voice Configuration:
   - Request URL: `https://cascadebuilderservices.com/.netlify/functions/twilio-voice-webhook`
   - HTTP Method: POST
5. Save and copy the App SID

### Configure Phone Number

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click your phone number
3. Voice Configuration:
   - A Call Comes In: TwiML App
   - Select: "AI Gatekeeper Voice"
4. Save

---

## 🎯 Quick Deployment Checklist

**Backend:**
- [ ] Push code to Git
- [ ] Netlify deploys automatically
- [ ] Add Twilio environment variables
- [ ] Test `/twilio-token` endpoint
- [ ] Test `/twilio-voice-webhook` endpoint

**Twilio:**
- [ ] Create API Key
- [ ] Create TwiML App
- [ ] Configure phone number
- [ ] Test with curl commands

**Mobile:**
- [ ] Create cascade-mobile directory
- [ ] Initialize Expo project
- [ ] Install dependencies
- [ ] Copy all files from implementation doc
- [ ] Create .env with Clerk key
- [ ] Build with EAS or locally
- [ ] Install on device
- [ ] Test sign-in
- [ ] Test contact sync
- [ ] Test incoming calls

---

## 🚨 Common Issues

### Backend Issues

**Issue:** Function not found
- **Fix:** Check Netlify deploy logs, ensure functions are in `netlify/functions/`

**Issue:** Twilio token fails
- **Fix:** Verify all `TWILIO_*` environment variables are set in Netlify

### Mobile Issues

**Issue:** Build fails
- **Fix:** Run `npx expo prebuild` first

**Issue:** App crashes on startup
- **Fix:** Check `adb logcat` for errors, verify Clerk key is correct

**Issue:** Voice not registering
- **Fix:** Check `.env` has correct `EXPO_PUBLIC_API_URL`

**Issue:** Can't sync contacts
- **Fix:** Grant contacts permission in phone settings

---

## 📞 Support Commands

### Check Netlify Deploy Status
```bash
netlify status
netlify deploy --prod
```

### Check Mobile Build Status
```bash
eas build:list
```

### View Mobile Logs
```bash
# Android
adb logcat | grep -i "expo\|react\|twilio"

# iOS
xcrun simctl spawn booted log stream --predicate 'process == "Expo"'
```

---

## 🎉 Success Criteria

You'll know everything is working when:

✅ Backend:
- Netlify deploy succeeds
- `/twilio-token` returns JWT token
- `/twilio-voice-webhook` returns TwiML

✅ Mobile:
- App opens without crashing
- Sign-in works
- Status shows green "ACTIVE"
- Contact sync completes
- Incoming calls trigger modal
- Accept/reject works

✅ End-to-End:
- Known contact calls → App rings instantly
- Unknown spam calls → Blocked by AI
- Legitimate unknown → AI screens, then rings

---

**Need Help?** Check the detailed guides:
- [CASCADE-MOBILE-IMPLEMENTATION.md](../archive/CASCADE-MOBILE-IMPLEMENTATION.md) - All code
- [AI-GATEKEEPER-COMPLETE-SYSTEM.md](./AI-GATEKEEPER-COMPLETE-SYSTEM.md) - Architecture
- [CASCADE-MOBILE-QUICKSTART.md](../archive/CASCADE-MOBILE-QUICKSTART.md) - Quick start

---

**Ready to deploy!** 🚀
