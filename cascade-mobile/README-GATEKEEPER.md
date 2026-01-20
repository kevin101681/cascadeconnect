# AI Gatekeeper Mobile App

React Native (Expo) mobile VoIP receiver app for the AI Gatekeeper system.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root of `cascade-mobile/`:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here
EXPO_PUBLIC_API_URL=https://www.cascadeconnect.app
```

Get your Clerk key from: https://dashboard.clerk.com

### 3. Update EAS Configuration

Edit `eas.json` and add your real Clerk key to all build profiles.

### 4. Build the App

#### Option A: EAS Build (Recommended)

```bash
# Login to Expo
npx eas-cli login

# Build development version
npx eas-cli build --profile development --platform android
```

#### Option B: Local Build

```bash
# Generate native projects
npx expo prebuild

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## 📱 Features

- ✅ Clerk authentication
- ✅ Twilio Voice VoIP integration
- ✅ Contact sync to cloud
- ✅ Incoming call modal with accept/reject
- ✅ Real-time gatekeeper status
- ✅ Active call management

## 🏗️ Project Structure

```
cascade-mobile/
├── services/
│   ├── auth.ts           # Clerk authentication helper
│   ├── api.ts            # API client with auth
│   ├── voice.ts          # Twilio Voice SDK wrapper
│   └── contactSync.ts    # Contact sync logic
├── components/
│   ├── GatekeeperStatus.tsx      # Status indicator
│   └── IncomingCallModal.tsx     # Call UI
├── App.tsx               # Main application
├── app.config.js         # Expo configuration
└── eas.json              # EAS Build configuration
```

## 🔧 Configuration

### Backend Environment Variables (Already Set)

The backend at `https://www.cascadeconnect.app` has these configured:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_API_KEY`
- `TWILIO_API_SECRET`
- `TWILIO_TWIML_APP_SID`
- `TWILIO_CLIENT_IDENTITY=kevin_pixel`

### Mobile Environment Variables (You Need to Set)

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
- `EXPO_PUBLIC_API_URL` - Backend URL (default: https://www.cascadeconnect.app)

## 🧪 Testing

1. Build and install the app on your device
2. Sign in with Clerk
3. Check status shows "ACTIVE" (green dot)
4. Tap "Sync Contacts to Cloud"
5. Verify sync completes
6. Have someone call your Vapi number
7. App should ring if they're in your contacts

## ⚠️ Important Notes

- **Cannot use Expo Go** - This app requires native modules (Twilio Voice SDK)
- **Development Build Required** - Use EAS Build or `expo prebuild`
- **Permissions Required** - Contacts and microphone access
- **Identity** - All users register as `kevin_pixel` (single-user app)

## 📞 Call Flow

### Known Contact
```
Contact calls → Vapi checks DB → Match found →
Transfer to Twilio → App rings instantly → Accept
Duration: < 1 second
```

### Unknown Spam
```
Spam calls → Vapi checks DB → No match →
AI screens → Spam detected → Hang up →
App never rings
```

### Legitimate Unknown
```
Legitimate caller → Vapi checks DB → No match →
AI screens → Verified → Transfer to Twilio →
App rings → Accept
```

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Run `npx expo prebuild` first |
| App crashes | Check `.env` has correct keys |
| Voice not working | Verify backend env vars in Netlify |
| No incoming calls | Check Twilio phone number webhook configuration |
| Sync fails | Grant contacts permission in phone settings |

## 📚 Documentation

- [Complete System Architecture](../AI-GATEKEEPER-COMPLETE-SYSTEM.md)
- [Deployment Guide](../CASCADE-MOBILE-DEPLOYMENT-GUIDE.md)
- [Quick Start](../CASCADE-MOBILE-QUICKSTART.md)

## 🎯 Success Criteria

✅ **App Working:**
- Opens without crashing
- Sign-in works
- Status shows "ACTIVE"
- Contact sync completes
- Incoming calls ring

✅ **System Working:**
- Known contacts ring instantly
- Spam calls blocked
- Call quality good

---

**Status**: ✅ Complete and Ready to Build  
**Last Updated**: 2026-01-20
