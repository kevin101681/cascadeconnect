import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { ClerkProvider, SignedIn, SignedOut, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { CallInvite } from '@twilio/voice-react-native-sdk';

import { useAuth } from './services/auth';
import { VoiceService } from './services/voice';
import { ContactSyncService } from './services/contactSync';
import { GatekeeperStatus } from './components/GatekeeperStatus';
import { IncomingCallModal } from './components/IncomingCallModal';

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
  
  // Voice state
  const [isVoiceReady, setIsVoiceReady] = useState(false);
  const [incomingCallInvite, setIncomingCallInvite] = useState<CallInvite | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  
  // Contact sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number;
    skipped: number;
    errors: number;
  } | null>(null);

  useEffect(() => {
    initializeVoice();
    
    return () => {
      // Cleanup on unmount
      const voiceService = VoiceService.getInstance();
      voiceService.unregister();
    };
  }, []);

  const initializeVoice = async () => {
    try {
      console.log('[App] Initializing voice service...');
      const voiceService = VoiceService.getInstance();
      
      // Set up call event listeners
      voiceService.setOnCallInvite((callInvite) => {
        console.log('[App] Incoming call!');
        setIncomingCallInvite(callInvite);
      });

      voiceService.setOnCallConnected((call) => {
        console.log('[App] Call connected');
        setIsCallActive(true);
        setIncomingCallInvite(null);
      });

      voiceService.setOnCallDisconnected(() => {
        console.log('[App] Call disconnected');
        setIsCallActive(false);
        setIncomingCallInvite(null);
      });

      // Initialize and register
      await voiceService.initialize(getAuthToken);
      setIsVoiceReady(true);
      
      console.log('[App] ✅ Voice service ready');
    } catch (error: any) {
      console.error('[App] Voice initialization error:', error);
      Alert.alert(
        'Voice Service Error',
        error.message || 'Failed to initialize voice service',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    try {
      console.log('[App] Starting contact sync...');
      const result = await ContactSyncService.syncToCloud(getAuthToken);
      setLastSyncResult(result);
      
      Alert.alert(
        '✅ Sync Complete',
        `Successfully synced ${result.synced} contacts to the cloud.\n\n` +
        `Skipped: ${result.skipped}\n` +
        `Errors: ${result.errors}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('[App] Contact sync error:', error);
      Alert.alert(
        '❌ Sync Failed',
        error.message || 'Failed to sync contacts',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAcceptCall = async () => {
    try {
      console.log('[App] Accepting call...');
      const voiceService = VoiceService.getInstance();
      await voiceService.acceptCall();
    } catch (error: any) {
      console.error('[App] Accept call error:', error);
      Alert.alert('Error', 'Failed to accept call');
    }
  };

  const handleRejectCall = async () => {
    try {
      console.log('[App] Rejecting call...');
      const voiceService = VoiceService.getInstance();
      await voiceService.rejectCall();
      setIncomingCallInvite(null);
    } catch (error: any) {
      console.error('[App] Reject call error:', error);
      setIncomingCallInvite(null);
    }
  };

  const handleEndCall = async () => {
    try {
      console.log('[App] Ending call...');
      const voiceService = VoiceService.getInstance();
      await voiceService.endCall();
      setIsCallActive(false);
    } catch (error: any) {
      console.error('[App] End call error:', error);
      setIsCallActive(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Gatekeeper</Text>
          <Text style={styles.subtitle}>Personal Spam Filter</Text>
        </View>

        {/* Status Card */}
        <GatekeeperStatus isActive={isVoiceReady} identity="kevin_pixel" />

        {/* User Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Registered Identity</Text>
          <Text style={styles.identity}>kevin_pixel</Text>
          <Text style={styles.userId}>User ID: {userId?.substring(0, 12)}...</Text>
        </View>

        {/* Sync Contacts Button */}
        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleSyncContacts}
          disabled={isSyncing}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>📇 Sync Contacts to Cloud</Text>
          )}
        </TouchableOpacity>

        {/* Last Sync Result */}
        {lastSyncResult && (
          <View style={styles.syncResult}>
            <Text style={styles.syncResultText}>
              ✅ Last sync: {lastSyncResult.synced} contacts
            </Text>
            {lastSyncResult.skipped > 0 && (
              <Text style={styles.syncResultDetail}>
                Skipped: {lastSyncResult.skipped}
              </Text>
            )}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How It Works:</Text>
          <Text style={styles.instructionText}>
            1. ✅ Sync your contacts to the cloud
          </Text>
          <Text style={styles.instructionText}>
            2. 📞 Known contacts bypass AI and ring instantly
          </Text>
          <Text style={styles.instructionText}>
            3. 🚫 Unknown spam calls are blocked automatically
          </Text>
          <Text style={styles.instructionText}>
            4. ✓ Legitimate unknown callers are screened by AI
          </Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => signOut()}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Incoming Call Modal */}
      <IncomingCallModal
        visible={!!incomingCallInvite && !isCallActive}
        callInvite={incomingCallInvite}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Active Call Overlay */}
      {isCallActive && (
        <View style={styles.activeCallOverlay}>
          <View style={styles.activeCallContent}>
            <Text style={styles.activeCallText}>📞 Call In Progress</Text>
            <TouchableOpacity
              style={styles.endCallButton}
              onPress={handleEndCall}
              activeOpacity={0.8}
            >
              <Text style={styles.endCallText}>End Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function SignInScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.signInContainer}>
        <Text style={styles.title}>AI Gatekeeper</Text>
        <Text style={styles.subtitle}>Sign In Required</Text>
        <Text style={styles.signInMessage}>
          Please configure Clerk authentication in your app
        </Text>
        <Text style={styles.signInHint}>
          Add your Clerk publishable key to .env file
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  if (!publishableKey) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Missing Clerk Publishable Key
        </Text>
        <Text style={styles.errorHint}>
          Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
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
  scrollContent: {
    paddingBottom: 40,
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
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
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
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  syncButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  syncResult: {
    marginHorizontal: 20,
    marginTop: -5,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  syncResultText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  syncResultDetail: {
    color: '#558B2F',
    fontSize: 12,
    marginTop: 4,
  },
  instructions: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6750A4',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  signOutButton: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeCallContent: {
    padding: 24,
    alignItems: 'center',
  },
  activeCallText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  endCallButton: {
    backgroundColor: '#EF5350',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  endCallText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  signInMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  signInHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF5350',
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});
