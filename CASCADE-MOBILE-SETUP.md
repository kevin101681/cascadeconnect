# Cascade Mobile - Quick Setup Script

## 🚀 One-Command Setup

Run this script to set up the mobile app automatically:

\`\`\`bash
#!/bin/bash

# Navigate to project root
cd "C:\Users\Kevin\Cascade Connect"

# Create cascade-mobile directory
mkdir -p cascade-mobile
cd cascade-mobile

# Initialize Expo project
echo "📱 Creating Expo project..."
npx create-expo-app@latest . --template blank-typescript

# Install dependencies
echo "📦 Installing dependencies..."
npm install @clerk/clerk-expo
npm install expo-secure-store
npm install @react-native-community/netinfo
npm install expo-contacts
npm install @twilio/voice-react-native-sdk
npm install react-native-safe-area-context

# Install dev dependencies
npm install --save-dev @types/react @types/react-native

# Initialize EAS
echo "🔧 Configuring EAS..."
eas build:configure

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy the files from CASCADE-MOBILE-IMPLEMENTATION.md"
echo "2. Update .env with your Clerk and API credentials"
echo "3. Run: eas build --profile development --platform android"
\`\`\`

---

## 📋 Manual Setup Checklist

If you prefer manual setup:

- [ ] Create `cascade-mobile` directory
- [ ] Initialize Expo project
- [ ] Install all dependencies
- [ ] Create `.env` file with credentials
- [ ] Copy all service files
- [ ] Copy all component files
- [ ] Copy `App.tsx`
- [ ] Configure `app.config.js`
- [ ] Configure `eas.json`
- [ ] Run `eas build:configure`
- [ ] Build development build

---

## 🔑 Environment Variables

Create `.env` in `cascade-mobile/`:

\`\`\`bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
EXPO_PUBLIC_API_URL=https://cascadebuilderservices.com
\`\`\`

Also update in `eas.json`:

\`\`\`json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "YOUR_ACTUAL_KEY",
        "EXPO_PUBLIC_API_URL": "https://cascadebuilderservices.com"
      }
    }
  }
}
\`\`\`

---

## 🏗️ Build Commands

\`\`\`bash
# Development build (recommended)
eas build --profile development --platform android

# Preview build (for testing)
eas build --profile preview --platform android

# Production build
eas build --profile production --platform android
\`\`\`

---

## 📱 Install on Device

After build completes:

1. Download the APK from EAS dashboard
2. Transfer to Android device
3. Enable "Install from unknown sources"
4. Install the APK
5. Open app and sign in

---

## 🧪 Testing Checklist

- [ ] App opens successfully
- [ ] Clerk sign-in works
- [ ] Status shows "ACTIVE" when signed in
- [ ] "Sync Contacts" button works
- [ ] Contacts sync to backend
- [ ] Voice service registers
- [ ] Incoming call triggers modal
- [ ] Accept call works
- [ ] Reject call works
- [ ] End call works

---

**Ready to build!** 🚀
