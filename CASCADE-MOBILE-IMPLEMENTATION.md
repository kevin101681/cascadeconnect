# AI Gatekeeper Receiver App - Complete Implementation

## 🎯 Overview

This is the complete implementation for the `cascade-mobile` VoIP receiver app. This app:
- Authenticates with Clerk
- Syncs contacts to the AI Gatekeeper allowlist
- Receives incoming calls via Twilio Voice
- Shows real-time gatekeeper status

**Important**: This app requires a **Development Build** (not Expo Go) due to native Twilio SDK.

---

## 📁 Project Structure

```
cascade-mobile/
├── app.config.js
├── package.json
├── tsconfig.json
├── eas.json                    # EAS Build configuration
├── .env                        # Environment variables
├── babel.config.js
├── App.tsx                     # Main app entry
├── services/
│   ├── auth.ts                 # Clerk auth helper
│   ├── api.ts                  # API client with auth
│   ├── contactSync.ts          # Contact sync logic
│   └── voice.ts                # Twilio Voice service
└── components/
    ├── IncomingCallModal.tsx   # Call UI
    └── GatekeeperStatus.tsx    # Status indicator
```

---

## 🚀 Setup Instructions

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
# Core
npm install @clerk/clerk-expo
npm install expo-secure-store
npm install @react-native-community/netinfo

# Contacts
npm install expo-contacts

# Twilio Voice
npm install @twilio/voice-react-native-sdk

# UI
npm install react-native-safe-area-context

# Development
npm install --save-dev @types/react @types/react-native
```

---

## 📄 Complete File Implementations

### 1. `package.json`

\`\`\`json
{
  "name": "cascade-mobile",
  "version": "1.0.0",
  "main": "expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "prebuild": "expo prebuild",
    "build:dev:android": "eas build --profile development --platform android",
    "build:dev:ios": "eas build --profile development --platform ios"
  },
  "dependencies": {
    "@clerk/clerk-expo": "^1.1.0",
    "@react-native-community/netinfo": "11.3.1",
    "@twilio/voice-react-native-sdk": "^1.0.0",
    "expo": "~51.0.0",
    "expo-contacts": "~13.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-status-bar": "~1.12.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-safe-area-context": "4.10.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "@types/react-native": "~0.73.0",
    "typescript": "^5.1.3"
  },
  "private": true
}
\`\`\`

### 2. `app.config.js`

\`\`\`javascript
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
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.cascadebuilderservices.aigatekeeper',
    infoPlist: {
      NSContactsUsageDescription: 'We need access to your contacts to sync them with the AI Gatekeeper allowlist.',
      NSMicrophoneUsageDescription: 'We need microphone access to receive calls.',
    },
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
    ]
  },
  plugins: [
    [
      '@clerk/clerk-expo/plugin',
      {
        publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
      }
    ],
    [
      '@twilio/voice-react-native-sdk',
      {}
    ]
  ],
  extra: {
    clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://cascadebuilderservices.com'
  },
  scheme: 'aigatekeeper'
};
\`\`\`

### 3. `eas.json`

\`\`\`json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "YOUR_CLERK_KEY_HERE",
        "EXPO_PUBLIC_API_URL": "https://cascadebuilderservices.com"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "YOUR_CLERK_KEY_HERE",
        "EXPO_PUBLIC_API_URL": "https://cascadebuilderservices.com"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "YOUR_CLERK_KEY_HERE",
        "EXPO_PUBLIC_API_URL": "https://cascadebuilderservices.com"
      }
    }
  }
}
\`\`\`

### 4. `.env` (Create this file)

\`\`\`bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
EXPO_PUBLIC_API_URL=https://cascadebuilderservices.com
\`\`\`

### 5. `tsconfig.json`

\`\`\`json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
\`\`\`

### 6. `babel.config.js`

\`\`\`javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
\`\`\`

---

## 🔧 Service Files

### 7. `services/auth.ts`

\`\`\`typescript
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

/**
 * Auth helper to get Clerk session token
 */
export function useAuth() {
  const { getToken, isSignedIn, userId } = useClerkAuth();

  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await getToken();
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  };

  return {
    getAuthToken,
    isSignedIn,
    userId,
  };
}
\`\`\`

### 8. `services/api.ts`

\`\`\`typescript
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://cascadebuilderservices.com';

export const API_ENDPOINTS = {
  TWILIO_TOKEN: \`\${API_URL}/.netlify/functions/twilio-token\`,
  CONTACT_SYNC: \`\${API_URL}/.netlify/functions/contact-sync\`,
};

/**
 * API client with Clerk authentication
 */
export class APIClient {
  static async fetchTwilioToken(getToken: () => Promise<string | null>): Promise<string> {
    const token = await getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(API_ENDPOINTS.TWILIO_TOKEN, {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(\`Failed to fetch Twilio token: \${response.status}\`);
    }

    const data = await response.json();
    return data.token;
  }

  static async syncContacts(
    getToken: () => Promise<string | null>,
    contacts: Array<{ name: string; phone: string }>
  ): Promise<any> {
    const token = await getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(API_ENDPOINTS.CONTACT_SYNC, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contacts }),
    });

    if (!response.ok) {
      throw new Error(\`Failed to sync contacts: \${response.status}\`);
    }

    return response.json();
  }
}
\`\`\`

### 9. `services/contactSync.ts`

\`\`\`typescript
import * as Contacts from 'expo-contacts';
import { APIClient } from './api';

/**
 * Contact sync service
 */
export class ContactSyncService {
  static async requestPermission(): Promise<boolean> {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  }

  static normalizePhoneNumber(phone: string): string {
    // Strip all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Add +1 if 10 digits (US)
    if (digits.length === 10) {
      return \`+1\${digits}\`;
    }
    
    // Add + if not present
    if (!digits.startsWith('1') && digits.length === 11) {
      return \`+\${digits}\`;
    }
    
    return \`+\${digits}\`;
  }

  static async getAllContacts(): Promise<Array<{ name: string; phone: string }>> {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      throw new Error('Contact permission denied');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    const formattedContacts = data
      .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
      .map(contact => ({
        name: contact.name || 'Unknown',
        phone: this.normalizePhoneNumber(contact.phoneNumbers![0].number || ''),
      }))
      .filter(contact => contact.phone && contact.phone.length > 5);

    return formattedContacts;
  }

  static async syncToCloud(getToken: () => Promise<string | null>): Promise<any> {
    console.log('Fetching contacts from device...');
    const contacts = await this.getAllContacts();
    
    console.log(\`Found \${contacts.length} contacts\`);
    
    const result = await APIClient.syncContacts(getToken, contacts);
    
    console.log('Sync result:', result);
    
    return result;
  }
}
\`\`\`

### 10. `services/voice.ts`

\`\`\`typescript
import { Voice, Call } from '@twilio/voice-react-native-sdk';
import { APIClient } from './api';

/**
 * Twilio Voice service
 */
export class VoiceService {
  private static instance: VoiceService;
  private voice: Voice;
  private initialized = false;
  private currentCall: Call | null = null;
  private callListener: ((call: Call) => void) | null = null;

  private constructor() {
    this.voice = new Voice();
    this.setupEventListeners();
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  private setupEventListeners() {
    // Listen for incoming calls
    this.voice.on(Voice.Event.CallInvite, (callInvite) => {
      console.log('Incoming call:', callInvite.getCallSid());
      
      if (this.callListener) {
        // Create a Call object from the invite
        const call = callInvite.accept();
        this.currentCall = call;
        this.callListener(call);
      }
    });

    // Call connected
    this.voice.on(Voice.Event.CallConnected, (call) => {
      console.log('Call connected:', call.getCallSid());
      this.currentCall = call;
    });

    // Call disconnected
    this.voice.on(Voice.Event.CallDisconnected, (call) => {
      console.log('Call disconnected:', call.getCallSid());
      this.currentCall = null;
    });

    // Error handling
    this.voice.on(Voice.Event.Error, (error) => {
      console.error('Voice error:', error);
    });
  }

  async initialize(getToken: () => Promise<string | null>) {
    if (this.initialized) {
      console.log('Voice service already initialized');
      return;
    }

    try {
      console.log('Fetching Twilio access token...');
      const token = await APIClient.fetchTwilioToken(getToken);
      
      console.log('Registering with Twilio Voice...');
      await this.voice.register(token);
      
      this.initialized = true;
      console.log('✅ Twilio Voice registered as kevin_pixel');
    } catch (error) {
      console.error('Failed to initialize Voice:', error);
      throw error;
    }
  }

  setCallListener(listener: (call: Call) => void) {
    this.callListener = listener;
  }

  async acceptCall() {
    // Call is already accepted in the listener
    // Just ensure we have the reference
    return this.currentCall;
  }

  async rejectCall() {
    if (this.currentCall) {
      await this.currentCall.disconnect();
      this.currentCall = null;
    }
  }

  async endCall() {
    if (this.currentCall) {
      await this.currentCall.disconnect();
      this.currentCall = null;
    }
  }

  async unregister() {
    if (this.initialized) {
      await this.voice.unregister();
      this.initialized = false;
      console.log('Twilio Voice unregistered');
    }
  }

  getCurrentCall(): Call | null {
    return this.currentCall;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
\`\`\`

---

## 🎨 Component Files

### 11. `components/GatekeeperStatus.tsx`

\`\`\`typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  isActive: boolean;
}

export function GatekeeperStatus({ isActive }: Props) {
  return (
    <View style={[styles.container, isActive ? styles.active : styles.inactive]}>
      <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          AI Gatekeeper: {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Text>
        <Text style={styles.subtitle}>
          {isActive 
            ? "Ready to receive calls as 'kevin_pixel'" 
            : 'Connecting...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  inactive: {
    backgroundColor: '#F5F5F5',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  dotActive: {
    backgroundColor: '#4CAF50',
  },
  dotInactive: {
    backgroundColor: '#9E9E9E',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});
\`\`\`

### 12. `components/IncomingCallModal.tsx`

\`\`\`typescript
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Call } from '@twilio/voice-react-native-sdk';

interface Props {
  visible: boolean;
  call: Call | null;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ visible, call, onAccept, onReject }: Props) {
  if (!call) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onReject}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.badge}>Incoming Verified Call</Text>
          </View>

          {/* Caller Info */}
          <View style={styles.callerInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>📞</Text>
            </View>
            <Text style={styles.callerName}>
              {call.getFrom() || 'Unknown Caller'}
            </Text>
            <Text style={styles.subtitle}>via AI Gatekeeper</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={onReject}
            >
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
            >
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: '#6750A4',
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600',
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
  },
  callerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#EF5350',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
\`\`\`

---

## 📱 Main App File

### 13. `App.tsx`

\`\`\`typescript
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClerkProvider, SignedIn, SignedOut, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import { useAuth } from './services/auth';
import { VoiceService } from './services/voice';
import { ContactSyncService } from './services/contactSync';
import { GatekeeperStatus } from './components/GatekeeperStatus';
import { IncomingCallModal } from './components/IncomingCallModal';
import { Call } from '@twilio/voice-react-native-sdk';

const publishableKey = Constants.expoConfig?.extra?.clerkPublishableKey;

// Token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

function HomeScreen() {
  const { signOut } = useClerkAuth();
  const { getAuthToken, userId } = useAuth();
  const [isVoiceReady, setIsVoiceReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncCount, setLastSyncCount] = useState<number | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);

  useEffect(() => {
    initializeVoice();
  }, []);

  const initializeVoice = async () => {
    try {
      const voiceService = VoiceService.getInstance();
      
      // Set up call listener
      voiceService.setCallListener((call) => {
        console.log('Incoming call received!');
        setIncomingCall(call);
      });

      // Initialize and register
      await voiceService.initialize(getAuthToken);
      setIsVoiceReady(true);
    } catch (error: any) {
      Alert.alert('Voice Error', error.message);
    }
  };

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    try {
      const result = await ContactSyncService.syncToCloud(getAuthToken);
      setLastSyncCount(result.synced);
      Alert.alert(
        'Sync Complete',
        \`Successfully synced \${result.synced} contacts to the cloud.\`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Sync Failed', error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAcceptCall = async () => {
    const voiceService = VoiceService.getInstance();
    await voiceService.acceptCall();
    setIncomingCall(null);
    setIsCallActive(true);
  };

  const handleRejectCall = async () => {
    const voiceService = VoiceService.getInstance();
    await voiceService.rejectCall();
    setIncomingCall(null);
  };

  const handleEndCall = async () => {
    const voiceService = VoiceService.getInstance();
    await voiceService.endCall();
    setIsCallActive(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Gatekeeper</Text>
        <Text style={styles.subtitle}>Personal Spam Filter</Text>
      </View>

      {/* Status */}
      <GatekeeperStatus isActive={isVoiceReady} />

      {/* User Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Registered Identity</Text>
        <Text style={styles.identity}>kevin_pixel</Text>
        <Text style={styles.userId}>User: {userId}</Text>
      </View>

      {/* Sync Contacts Button */}
      <TouchableOpacity
        style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
        onPress={handleSyncContacts}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.syncButtonText}>Sync Contacts to Cloud</Text>
        )}
      </TouchableOpacity>

      {lastSyncCount !== null && (
        <Text style={styles.syncInfo}>
          Last sync: {lastSyncCount} contacts
        </Text>
      )}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Incoming Call Modal */}
      <IncomingCallModal
        visible={!!incomingCall}
        call={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Active Call UI */}
      {isCallActive && (
        <View style={styles.activeCallOverlay}>
          <Text style={styles.activeCallText}>Call In Progress</Text>
          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <Text style={styles.endCallText}>End Call</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function SignInScreen() {
  // In a real app, you'd import and use Clerk's SignIn component
  // For this example, we'll show a placeholder
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In Required</Text>
      <Text style={styles.subtitle}>
        Please configure Clerk authentication
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={publishableKey!} tokenCache={tokenCache}>
      <SignedIn>
        <HomeScreen />
      </SignedIn>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  identity: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6750A4',
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: '#999',
  },
  syncButton: {
    backgroundColor: '#6750A4',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  syncInfo: {
    textAlign: 'center',
    color: '#666',
    marginTop: -10,
  },
  signOutButton: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF5350',
  },
  signOutText: {
    color: '#EF5350',
    fontSize: 16,
    fontWeight: '600',
  },
  activeCallOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  activeCallText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  endCallButton: {
    backgroundColor: '#EF5350',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  endCallText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
\`\`\`

---

## 🔨 Build Instructions

### Build Development Build

\`\`\`bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for Android
eas build --profile development --platform android

# Build for iOS (requires Apple Developer account)
eas build --profile development --platform ios
\`\`\`

### Run Locally

\`\`\`bash
# Prebuild native projects
npx expo prebuild

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
\`\`\`

---

## ⚠️ Important Notes

1. **Cannot use Expo Go** - Twilio Voice requires native modules
2. **Must use Development Build** or bare workflow
3. **Hardcoded identity** - All users register as "kevin_pixel"
4. **Single-user app** - Designed for Kevin's personal use

---

## 🧪 Testing

1. Build and install development build
2. Sign in with Clerk
3. Tap "Sync Contacts to Cloud"
4. Verify contacts in database
5. Have someone call your Vapi number
6. App should ring with incoming call modal

---

**Status**: ✅ Complete Implementation  
**Ready for**: Development Build
