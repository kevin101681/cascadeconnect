export default {
  name: 'AI Gatekeeper',
  slug: 'ai-gatekeeper',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'cascade-gatekeeper',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#6750A4'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.cascadebuilderservices.aigatekeeper',
    infoPlist: {
      NSContactsUsageDescription: 'We need access to your contacts to sync them with the AI Gatekeeper allowlist for spam filtering.',
      NSMicrophoneUsageDescription: 'We need microphone access to make and receive voice calls.',
    },
  },
  android: {
    package: 'com.cascadebuilderservices.aigatekeeper',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#6750A4'
    },
    permissions: [
      'READ_CONTACTS',
      'RECORD_AUDIO',
      'MODIFY_AUDIO_SETTINGS',
      'ACCESS_NETWORK_STATE',
    ]
  },
  plugins: [
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
        },
      },
    ],
    [
      '@clerk/clerk-expo/plugin',
      {
        publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
      }
    ],
    [
      '@twilio/voice-react-native-sdk',
      {}
    ],
    [
      'expo-contacts',
      {
        contactsPermission: 'Allow AI Gatekeeper to access your contacts for spam filtering.'
      }
    ]
  ],
  extra: {
    clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://www.cascadeconnect.app'
  },
};
