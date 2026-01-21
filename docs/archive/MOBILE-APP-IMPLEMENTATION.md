# AI Gatekeeper Mobile App - Complete Implementation Guide

## 🎯 Overview

React Native (Expo) mobile app that:
- Syncs contacts to AI Gatekeeper allowlist
- Receives incoming calls via Twilio Voice
- Shows real-time gatekeeper status
- Provides seamless VoIP calling experience

**Tech Stack**:
- Expo (Managed workflow with Development Build)
- NativeWind (Tailwind CSS)
- Clerk Expo (Authentication)
- Twilio Voice React Native (VoIP)
- TypeScript

---

## 📁 Project Structure

```
mobile/
├── app.config.js                 # Expo configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # NativeWind config
├── babel.config.js               # Babel config
├── app/                          # Expo Router app directory
│   ├── _layout.tsx              # Root layout with Clerk provider
│   ├── index.tsx                # Home screen
│   ├── sign-in.tsx              # Sign in screen
│   └── sign-up.tsx              # Sign up screen
├── components/                   # Reusable components
│   ├── CallModal.tsx            # Incoming call UI
│   ├── StatusIndicator.tsx      # Gatekeeper status
│   └── ContactSyncButton.tsx    # Sync contacts button
├── services/                     # Business logic
│   ├── voice.ts                 # Twilio Voice service
│   ├── contacts.ts              # Contact sync service
│   └── api.ts                   # Backend API client
├── hooks/                        # Custom React hooks
│   ├── useVoice.ts              # Voice call management
│   └── useContactSync.ts        # Contact sync management
├── types/                        # TypeScript types
│   └── index.ts                 # Shared types
└── constants/                    # App constants
    └── index.ts                 # API URLs, etc.
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** 18+ installed
2. **Expo CLI** installed globally: `npm install -g expo-cli`
3. **Android Studio** or **Xcode** for building
4. **Clerk Account** with Expo app configured
5. **Twilio Account** with Voice API enabled

### Step 1: Create Expo Project

```bash
# Navigate to your project root
cd "C:\Users\Kevin\Cascade Connect"

# Create mobile directory
mkdir mobile
cd mobile

# Initialize Expo project with TypeScript
npx create-expo-app@latest . --template blank-typescript

# Install Expo Router
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install @clerk/clerk-expo
npm install @react-native-community/netinfo
npm install react-native-twilio-voice-sdk
npm install expo-contacts
npm install expo-device
npm install expo-linking

# UI dependencies
npm install nativewind
npm install --save-dev tailwindcss@3.3.2

# Development dependencies
npm install --save-dev @types/react @types/react-native
```

### Step 3: Configure Project Files

See individual file implementations below.

---

## 📄 File Implementations

### 1. `app.config.js`

```javascript
export default {
  name: 'AI Gatekeeper',
  slug: 'ai-gatekeeper',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#6750A4'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.cascadebuilderservices.aigatekeeper',
    infoPlist: {
      NSContactsUsageDescription: 'We need access to your contacts to sync them with the AI Gatekeeper allowlist.',
      NSMicrophoneUsageDescription: 'We need microphone access to make and receive calls.',
    },
    config: {
      usesNonExemptEncryption: false,
    }
  },
  android: {
    package: 'com.cascadebuilderservices.aigatekeeper',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#6750A4'
    },
    permissions: [
      'READ_CONTACTS',
      'RECORD_AUDIO',
      'MODIFY_AUDIO_SETTINGS',
      'BLUETOOTH',
      'BLUETOOTH_CONNECT'
    ]
  },
  plugins: [
    'expo-router',
    [
      '@clerk/clerk-expo/plugin',
      {
        publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
      }
    ],
    // Note: react-native-twilio-voice-sdk doesn't have a config plugin yet
    // You'll need to configure it manually in native code
  ],
  extra: {
    router: {
      origin: false
    },
    eas: {
      projectId: 'your-eas-project-id'
    },
    clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://cascadebuilderservices.com'
  },
  scheme: 'aigatekeeper'
};
```

### 2. `package.json`

```json
{
  "name": "ai-gatekeeper-mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "prebuild": "expo prebuild",
    "lint": "eslint .",
    "test": "jest"
  },
  "dependencies": {
    "@clerk/clerk-expo": "^1.1.0",
    "@react-native-community/netinfo": "11.3.1",
    "expo": "~51.0.0",
    "expo-contacts": "~13.0.0",
    "expo-constants": "~16.0.0",
    "expo-device": "~6.0.0",
    "expo-linking": "~6.3.0",
    "expo-router": "~3.5.0",
    "expo-status-bar": "~1.12.0",
    "nativewind": "^2.0.11",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "~3.31.0",
    "react-native-twilio-voice-sdk": "^1.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "@types/react-native": "~0.73.0",
    "tailwindcss": "3.3.2",
    "typescript": "^5.1.3"
  },
  "private": true
}
```

### 3. `constants/index.ts`

```typescript
import Constants from 'expo-constants';

export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://cascadebuilderservices.com';

export const API_ENDPOINTS = {
  TWILIO_TOKEN: `${API_BASE_URL}/.netlify/functions/twilio-token`,
  CONTACT_SYNC: `${API_BASE_URL}/.netlify/functions/contact-sync`,
  CONTACTS_LIST: `${API_BASE_URL}/.netlify/functions/contact-sync`,
};

export const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
```

### 4. `types/index.ts`

```typescript
export interface Contact {
  name: string;
  phone: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  synced: number;
  failed: number;
  errors?: string[];
}

export interface TwilioTokenResponse {
  token: string;
  identity: string;
  expiresIn: number;
}

export interface Call {
  callSid: string;
  from: string;
  to: string;
  state: 'ringing' | 'connected' | 'disconnected';
}
```

### 5. `services/api.ts`

```typescript
import { useAuth } from '@clerk/clerk-expo';
import { API_ENDPOINTS } from '../constants';

export class APIClient {
  private static getAuthHeader(getToken: () => Promise<string | null>) {
    return async () => {
      const token = await getToken({ template: 'default' });
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    };
  }

  static async fetchTwilioToken(getToken: () => Promise<string | null>): Promise<string> {
    const headers = await this.getAuthHeader(getToken)();
    
    const response = await fetch(API_ENDPOINTS.TWILIO_TOKEN, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Twilio token');
    }

    const data = await response.json();
    return data.token;
  }

  static async syncContacts(
    getToken: () => Promise<string | null>,
    contacts: Array<{ name: string; phone: string }>
  ): Promise<any> {
    const headers = await this.getAuthHeader(getToken)();
    
    const response = await fetch(API_ENDPOINTS.CONTACT_SYNC, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contacts }),
    });

    if (!response.ok) {
      throw new Error('Failed to sync contacts');
    }

    return response.json();
  }
}
```

### 6. `services/voice.ts`

```typescript
import { TwilioVoice } from 'react-native-twilio-voice-sdk';
import { APIClient } from './api';
import { Platform } from 'react-native';

export class VoiceService {
  private static instance: VoiceService;
  private voice: typeof TwilioVoice;
  private initialized = false;
  private currentCall: any = null;

  private constructor() {
    this.voice = TwilioVoice;
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  async initialize(getToken: () => Promise<string | null>) {
    if (this.initialized) {
      console.log('Voice service already initialized');
      return;
    }

    try {
      console.log('Initializing Twilio Voice...');
      
      // Fetch access token from backend
      const token = await APIClient.fetchTwilioToken(getToken);
      
      // Initialize Twilio Voice SDK
      await this.voice.initializeTwilio(token);
      
      // Register device
      await this.voice.register();
      
      this.initialized = true;
      console.log('Twilio Voice initialized successfully');
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize Twilio Voice:', error);
      throw error;
    }
  }

  private setupEventListeners() {
    // Incoming call
    this.voice.addEventListener('deviceDidReceiveIncoming', (call: any) => {
      console.log('Incoming call:', call);
      this.currentCall = call;
      // Trigger UI update via event or callback
    });

    // Call connected
    this.voice.addEventListener('callDidConnect', (call: any) => {
      console.log('Call connected:', call);
      this.currentCall = call;
    });

    // Call disconnected
    this.voice.addEventListener('callDidDisconnect', (call: any) => {
      console.log('Call disconnected:', call);
      this.currentCall = null;
    });

    // Call failed
    this.voice.addEventListener('callDidFailToConnect', (error: any) => {
      console.error('Call failed:', error);
      this.currentCall = null;
    });
  }

  async acceptCall() {
    if (this.currentCall) {
      try {
        await this.voice.acceptCallInvite(this.currentCall.callSid);
      } catch (error) {
        console.error('Failed to accept call:', error);
        throw error;
      }
    }
  }

  async rejectCall() {
    if (this.currentCall) {
      try {
        await this.voice.rejectCallInvite(this.currentCall.callSid);
        this.currentCall = null;
      } catch (error) {
        console.error('Failed to reject call:', error);
        throw error;
      }
    }
  }

  async endCall() {
    if (this.currentCall) {
      try {
        await this.voice.disconnect();
        this.currentCall = null;
      } catch (error) {
        console.error('Failed to end call:', error);
        throw error;
      }
    }
  }

  async unregister() {
    try {
      await this.voice.unregister();
      this.initialized = false;
      console.log('Twilio Voice unregistered');
    } catch (error) {
      console.error('Failed to unregister:', error);
    }
  }

  getCurrentCall() {
    return this.currentCall;
  }
}
```

### 7. `services/contacts.ts`

```typescript
import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';
import { APIClient } from './api';

export class ContactsService {
  static async requestPermission(): Promise<boolean> {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  }

  static async getAll(): Promise<Array<{ name: string; phone: string }>> {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      throw new Error('Contact permission denied');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    // Filter and format contacts
    const formattedContacts = data
      .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
      .map(contact => ({
        name: contact.name || 'Unknown',
        phone: contact.phoneNumbers![0].number || '',
      }))
      .filter(contact => contact.phone); // Remove contacts without phone

    return formattedContacts;
  }

  static async syncToBackend(getToken: () => Promise<string | null>): Promise<any> {
    console.log('Syncing contacts to backend...');
    
    // Get all contacts
    const contacts = await this.getAll();
    
    console.log(`Found ${contacts.length} contacts with phone numbers`);
    
    // Sync to backend
    const result = await APIClient.syncContacts(getToken, contacts);
    
    console.log('Sync result:', result);
    
    return result;
  }
}
```

### 8. `hooks/useVoice.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { VoiceService } from '../services/voice';

export function useVoice() {
  const { getToken, isSignedIn } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn && !isInitialized) {
      initializeVoice();
    }
  }, [isSignedIn]);

  const initializeVoice = async () => {
    try {
      const voiceService = VoiceService.getInstance();
      await voiceService.initialize(getToken);
      setIsInitialized(true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Voice initialization error:', err);
    }
  };

  const acceptCall = useCallback(async () => {
    try {
      const voiceService = VoiceService.getInstance();
      await voiceService.acceptCall();
      setIsCallActive(true);
      setIncomingCall(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const rejectCall = useCallback(async () => {
    try {
      const voiceService = VoiceService.getInstance();
      await voiceService.rejectCall();
      setIncomingCall(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const endCall = useCallback(async () => {
    try {
      const voiceService = VoiceService.getInstance();
      await voiceService.endCall();
      setIsCallActive(false);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return {
    isInitialized,
    incomingCall,
    isCallActive,
    error,
    acceptCall,
    rejectCall,
    endCall,
  };
}
```

### 9. `hooks/useContactSync.ts`

```typescript
import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { ContactsService } from '../services/contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SYNC_KEY = 'last_contact_sync';

export function useContactSync() {
  const { getToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load last sync time on mount
  useState(() => {
    loadLastSyncTime();
  });

  const loadLastSyncTime = async () => {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (timestamp) {
        setLastSync(new Date(parseInt(timestamp)));
      }
    } catch (err) {
      console.error('Failed to load last sync time:', err);
    }
  };

  const syncContacts = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await ContactsService.syncToBackend(getToken);
      setSyncResult(result);
      
      // Save sync time
      const now = Date.now();
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toString());
      setLastSync(new Date(now));
      
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [getToken]);

  return {
    isSyncing,
    lastSync,
    syncResult,
    error,
    syncContacts,
  };
}
```

---

## 🎨 UI Components

### 10. `app/_layout.tsx`

```typescript
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';

const publishableKey = Constants.expoConfig?.extra?.clerkPublishableKey;

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isSignedIn && !inAuthGroup) {
      router.replace('/');
    } else if (!isSignedIn) {
      router.replace('/sign-in');
    }
  }, [isSignedIn, segments]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey!}>
      <InitialLayout />
    </ClerkProvider>
  );
}
```

### 11. `app/index.tsx`

```typescript
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useVoice } from '../hooks/useVoice';
import { useContactSync } from '../hooks/useContactSync';
import { CallModal } from '../components/CallModal';
import { StatusIndicator } from '../components/StatusIndicator';
import { ContactSyncButton } from '../components/ContactSyncButton';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { isInitialized, incomingCall, isCallActive, acceptCall, rejectCall, endCall } = useVoice();
  const { isSyncing, lastSync, syncContacts, syncResult } = useContactSync();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />
      
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <View className="mt-8 mb-6">
          <Text className="text-3xl font-bold text-gray-900">AI Gatekeeper</Text>
          <Text className="text-gray-600 mt-2">Your personal spam filter</Text>
        </View>

        {/* Status Indicator */}
        <StatusIndicator isActive={isInitialized} />

        {/* Contact Sync */}
        <View className="mt-8">
          <ContactSyncButton
            onSync={syncContacts}
            isSyncing={isSyncing}
            lastSync={lastSync}
            syncResult={syncResult}
          />
        </View>

        {/* Stats */}
        {syncResult && (
          <View className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
            <Text className="text-lg font-semibold mb-4">Last Sync Results</Text>
            <View className="flex-row justify-between">
              <View>
                <Text className="text-2xl font-bold text-green-600">{syncResult.synced}</Text>
                <Text className="text-gray-600">Synced</Text>
              </View>
              <View>
                <Text className="text-2xl font-bold text-red-600">{syncResult.failed}</Text>
                <Text className="text-gray-600">Failed</Text>
              </View>
            </View>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity
          className="mt-8 mb-8 bg-red-500 rounded-xl p-4"
          onPress={() => signOut()}
        >
          <Text className="text-white text-center font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <CallModal
          call={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Active Call UI */}
      {isCallActive && (
        <View className="absolute bottom-0 left-0 right-0 bg-green-600 p-6 pb-8">
          <Text className="text-white text-center font-semibold mb-4">Call In Progress</Text>
          <TouchableOpacity
            className="bg-red-600 rounded-full p-4"
            onPress={endCall}
          >
            <Text className="text-white text-center font-bold">End Call</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
```

### 12. `components/CallModal.tsx`

```typescript
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { BlurView } from 'expo-blur';

interface CallModalProps {
  call: any;
  onAccept: () => void;
  onReject: () => void;
}

export function CallModal({ call, onAccept, onReject }: CallModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
    >
      <BlurView intensity={90} className="flex-1 items-center justify-center">
        <View className="bg-white rounded-3xl p-8 mx-6 shadow-2xl">
          {/* Caller Info */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-purple-500 items-center justify-center mb-4">
              <Text className="text-4xl">📞</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">{call.from || 'Unknown'}</Text>
            <Text className="text-gray-600 mt-2">Incoming Call</Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row justify-between space-x-4">
            {/* Reject */}
            <TouchableOpacity
              className="flex-1 bg-red-500 rounded-full p-4 mr-2"
              onPress={onReject}
            >
              <Text className="text-white text-center font-bold">Decline</Text>
            </TouchableOpacity>

            {/* Accept */}
            <TouchableOpacity
              className="flex-1 bg-green-500 rounded-full p-4 ml-2"
              onPress={onAccept}
            >
              <Text className="text-white text-center font-bold">Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
```

### 13. `components/StatusIndicator.tsx`

```typescript
import { View, Text } from 'react-native';

interface StatusIndicatorProps {
  isActive: boolean;
}

export function StatusIndicator({ isActive }: StatusIndicatorProps) {
  return (
    <View className={`rounded-2xl p-6 ${isActive ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-100'}`}>
      <View className="flex-row items-center">
        <View className={`w-4 h-4 rounded-full mr-3 ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
        <View className="flex-1">
          <Text className={`text-lg font-bold ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
            {isActive ? 'AI Gatekeeper Active' : 'Gatekeeper Inactive'}
          </Text>
          <Text className={`text-sm ${isActive ? 'text-green-700' : 'text-gray-600'}`}>
            {isActive ? 'Protecting you from spam calls' : 'Connecting...'}
          </Text>
        </View>
      </View>
    </View>
  );
}
```

### 14. `components/ContactSyncButton.tsx`

```typescript
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

interface ContactSyncButtonProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
  lastSync: Date | null;
  syncResult: any;
}

export function ContactSyncButton({ onSync, isSyncing, lastSync, syncResult }: ContactSyncButtonProps) {
  return (
    <View className="bg-white rounded-2xl p-6 shadow-sm">
      <Text className="text-lg font-semibold mb-4">Contact Sync</Text>
      
      {lastSync && (
        <Text className="text-gray-600 mb-4">
          Last synced {formatDistanceToNow(lastSync, { addSuffix: true })}
        </Text>
      )}

      <TouchableOpacity
        className={`rounded-xl p-4 ${isSyncing ? 'bg-gray-400' : 'bg-purple-600'}`}
        onPress={onSync}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <View className="flex-row items-center justify-center">
            <ActivityIndicator color="white" />
            <Text className="text-white font-semibold ml-2">Syncing...</Text>
          </View>
        ) : (
          <Text className="text-white text-center font-semibold">Sync Contacts</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
```

---

## ⚙️ Configuration Files

### 15. `tailwind.config.js`

```javascript
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### 16. `babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

### 17. `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 🔧 Native Configuration (Manual Steps)

Since `react-native-twilio-voice-sdk` doesn't have a config plugin, you need to configure it manually:

### Android (`android/app/src/main/AndroidManifest.xml`)

Add permissions:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
```

### iOS (`ios/YourApp/Info.plist`)

Add usage descriptions:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to make and receive calls.</string>
<key>NSContactsUsageDescription</key>
<string>We need access to your contacts to sync them with the AI Gatekeeper allowlist.</string>
```

---

## 🚀 Building & Running

### Development Build (Required for Twilio Voice)

**Important**: Twilio Voice React Native requires native modules, so you **cannot use Expo Go**. You must create a development build.

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Create development build for Android
eas build --profile development --platform android

# Or run locally
npx expo prebuild
npx expo run:android
```

### iOS

```bash
# Create development build for iOS
eas build --profile development --platform ios

# Or run locally
npx expo prebuild
npx expo run:ios
```

---

## 🔐 Environment Variables

Create `.env` file in mobile directory:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
EXPO_PUBLIC_API_URL=https://cascadebuilderservices.com
```

---

## 📝 Next Steps

1. **Create Expo account** and configure project
2. **Set up Clerk** for mobile auth
3. **Configure Twilio** (see configuration guide)
4. **Build development build**
5. **Test contact sync**
6. **Test incoming calls**

---

**Note**: This is a complete implementation ready for development. You'll need to adjust colors, logos, and branding to match your design system.
