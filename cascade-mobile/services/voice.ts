import { Voice, Call, CallInvite } from '@twilio/voice-react-native-sdk';
import { APIClient } from './api';

export type CallInviteCallback = (callInvite: CallInvite) => void;
export type CallConnectedCallback = (call: Call) => void;
export type CallDisconnectedCallback = () => void;

/**
 * Twilio Voice service for VoIP calls
 */
export class VoiceService {
  private static instance: VoiceService;
  private voice: Voice;
  private initialized = false;
  private currentCall: Call | null = null;
  private currentCallInvite: CallInvite | null = null;
  
  // Event callbacks
  private onCallInviteCallback: CallInviteCallback | null = null;
  private onCallConnectedCallback: CallConnectedCallback | null = null;
  private onCallDisconnectedCallback: CallDisconnectedCallback | null = null;

  private constructor() {
    console.log('[Voice] Initializing Voice SDK...');
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
    console.log('[Voice] Setting up event listeners...');

    // Incoming call invitation
    this.voice.on(Voice.Event.CallInvite, (callInvite: CallInvite) => {
      console.log('[Voice] Incoming call invitation:', callInvite.getCallSid());
      this.currentCallInvite = callInvite;
      
      if (this.onCallInviteCallback) {
        this.onCallInviteCallback(callInvite);
      }
    });

    // Call connected
    this.voice.on(Voice.Event.CallConnected, (call: Call) => {
      console.log('[Voice] Call connected:', call.getSid());
      this.currentCall = call;
      this.currentCallInvite = null;
      
      if (this.onCallConnectedCallback) {
        this.onCallConnectedCallback(call);
      }
    });

    // Call disconnected
    this.voice.on(Voice.Event.CallDisconnected, (call: Call, error?: any) => {
      console.log('[Voice] Call disconnected:', call.getSid(), error);
      this.currentCall = null;
      this.currentCallInvite = null;
      
      if (this.onCallDisconnectedCallback) {
        this.onCallDisconnectedCallback();
      }
    });

    // Error handling
    this.voice.on(Voice.Event.Error, (error: any) => {
      console.error('[Voice] Error:', error);
    });

    // Registration events
    this.voice.on(Voice.Event.Registered, () => {
      console.log('[Voice] ✅ Registered successfully');
    });

    this.voice.on(Voice.Event.Unregistered, () => {
      console.log('[Voice] Unregistered');
    });
  }

  /**
   * Initialize and register with Twilio Voice
   */
  async initialize(getToken: () => Promise<string | null>): Promise<void> {
    if (this.initialized) {
      console.log('[Voice] Already initialized');
      return;
    }

    try {
      console.log('[Voice] Fetching access token...');
      const { token, identity } = await APIClient.fetchTwilioToken(getToken);
      
      console.log('[Voice] Registering with Twilio Voice as:', identity);
      await this.voice.register(token);
      
      this.initialized = true;
      console.log('[Voice] ✅ Voice service initialized successfully');
    } catch (error) {
      console.error('[Voice] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(): Promise<void> {
    if (!this.currentCallInvite) {
      console.warn('[Voice] No call invite to accept');
      return;
    }

    try {
      console.log('[Voice] Accepting call...');
      const call = await this.currentCallInvite.accept();
      this.currentCall = call;
      console.log('[Voice] Call accepted');
    } catch (error) {
      console.error('[Voice] Failed to accept call:', error);
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(): Promise<void> {
    if (!this.currentCallInvite) {
      console.warn('[Voice] No call invite to reject');
      return;
    }

    try {
      console.log('[Voice] Rejecting call...');
      await this.currentCallInvite.reject();
      this.currentCallInvite = null;
      console.log('[Voice] Call rejected');
    } catch (error) {
      console.error('[Voice] Failed to reject call:', error);
      throw error;
    }
  }

  /**
   * End active call
   */
  async endCall(): Promise<void> {
    if (!this.currentCall) {
      console.warn('[Voice] No active call to end');
      return;
    }

    try {
      console.log('[Voice] Ending call...');
      await this.currentCall.disconnect();
      this.currentCall = null;
      console.log('[Voice] Call ended');
    } catch (error) {
      console.error('[Voice] Failed to end call:', error);
      throw error;
    }
  }

  /**
   * Unregister from Twilio Voice
   */
  async unregister(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      console.log('[Voice] Unregistering...');
      await this.voice.unregister();
      this.initialized = false;
      console.log('[Voice] Unregistered successfully');
    } catch (error) {
      console.error('[Voice] Failed to unregister:', error);
      throw error;
    }
  }

  /**
   * Set callback for incoming call invitations
   */
  setOnCallInvite(callback: CallInviteCallback): void {
    this.onCallInviteCallback = callback;
  }

  /**
   * Set callback for call connected
   */
  setOnCallConnected(callback: CallConnectedCallback): void {
    this.onCallConnectedCallback = callback;
  }

  /**
   * Set callback for call disconnected
   */
  setOnCallDisconnected(callback: CallDisconnectedCallback): void {
    this.onCallDisconnectedCallback = callback;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current call
   */
  getCurrentCall(): Call | null {
    return this.currentCall;
  }

  /**
   * Get current call invite
   */
  getCurrentCallInvite(): CallInvite | null {
    return this.currentCallInvite;
  }
}
