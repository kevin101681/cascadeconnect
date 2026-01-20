# Cascade Mobile - 5-Minute Quick Start

## 🚀 Get Running Fast

### Prerequisites
- Node.js 18+ installed
- Expo CLI: `npm install -g expo-cli eas-cli`
- Android device or emulator

---

## Step 1: Create Mobile App (2 minutes)

\`\`\`bash
# Navigate to project
cd "C:\Users\Kevin\Cascade Connect"

# Create mobile directory
mkdir cascade-mobile
cd cascade-mobile

# Initialize Expo
npx create-expo-app@latest . --template blank-typescript

# Install dependencies
npm install @clerk/clerk-expo expo-secure-store @react-native-community/netinfo expo-contacts @twilio/voice-react-native-sdk react-native-safe-area-context
\`\`\`

---

## Step 2: Copy Implementation Files (1 minute)

Copy these files from **[CASCADE-MOBILE-IMPLEMENTATION.md](./CASCADE-MOBILE-IMPLEMENTATION.md)**:

1. **Configuration Files**:
   - `app.config.js`
   - `eas.json`
   - `package.json` (merge dependencies)
   - `.env` (create new)

2. **Services** (create `services/` directory):
   - `services/auth.ts`
   - `services/api.ts`
   - `services/contactSync.ts`
   - `services/voice.ts`

3. **Components** (create `components/` directory):
   - `components/GatekeeperStatus.tsx`
   - `components/IncomingCallModal.tsx`

4. **Main App**:
   - `App.tsx` (replace existing)

---

## Step 3: Configure Environment (30 seconds)

Edit `.env`:

\`\`\`bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key
EXPO_PUBLIC_API_URL=https://cascadebuilderservices.com
\`\`\`

Edit `eas.json` - update environment variables with your real keys.

---

## Step 4: Build (2 minutes)

\`\`\`bash
# Login to EAS
eas login

# Configure
eas build:configure

# Build development build for Android
eas build --profile development --platform android
\`\`\`

**Note**: Build takes ~10-15 minutes. You'll get a download link when complete.

---

## Step 5: Install & Test (30 seconds)

1. Download APK from EAS dashboard
2. Install on Android device
3. Open app
4. Sign in with Clerk
5. Tap "Sync Contacts"
6. Wait for confirmation

---

## ✅ Verification

App should show:
- ✅ "AI Gatekeeper: ACTIVE" (green)
- ✅ "Ready to receive calls as 'kevin_pixel'"
- ✅ "Sync Contacts to Cloud" button
- ✅ Contact count after sync

---

## 🧪 Quick Test

1. **Test Contact Sync**:
   - Tap "Sync Contacts"
   - Should see "Successfully synced X contacts"

2. **Test Voice Registration**:
   - Status should show green "ACTIVE"
   - Check Netlify logs for "Twilio Voice registered"

3. **Test Incoming Call**:
   - Have someone call your Vapi number
   - If in allowlist → App rings instantly
   - If not in allowlist → AI screens them

---

## 🚨 Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Run `npx expo prebuild` first |
| Can't install APK | Enable "Install from unknown sources" |
| App crashes | Check logs: `adb logcat` |
| Voice not registering | Check `.env` has correct API_URL |
| Clerk error | Verify publishable key in `.env` |

---

## 📱 Alternative: Run Locally

If you want to test faster (requires Android Studio):

\`\`\`bash
# Generate native projects
npx expo prebuild

# Run on connected device
npx expo run:android
\`\`\`

---

## 🎯 Next Steps

Once app is working:

1. ✅ Sync all your contacts
2. ✅ Test incoming calls
3. ✅ Monitor Netlify logs
4. ✅ Adjust AI prompts if needed
5. ✅ Build production version when ready

---

## 📚 Full Documentation

For detailed implementation, see:
- **[CASCADE-MOBILE-IMPLEMENTATION.md](./CASCADE-MOBILE-IMPLEMENTATION.md)** - Complete code
- **[AI-GATEKEEPER-COMPLETE-SYSTEM.md](./AI-GATEKEEPER-COMPLETE-SYSTEM.md)** - System overview
- **[AI-GATEKEEPER-CONFIGURATION-GUIDE.md](./AI-GATEKEEPER-CONFIGURATION-GUIDE.md)** - Setup guide

---

**Total Time**: ~20 minutes (including build time)  
**Difficulty**: Easy  
**Status**: ✅ Ready to Build
