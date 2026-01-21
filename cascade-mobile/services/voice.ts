import { TelnyxClient, TelnyxCall, TelnyxNotification } from '@telnyx/react-native';
import { APIClient } from './api';

// Define types for call handling
export interface CallInvite {
  callId: string;
  from: string;
  to: string;
  callerName?: string;
  customParameters?: Record<string, any>;
  getFrom(): string;
  getCustomParameters(): Record<string, any>;
}

export interface ActiveCall {
  callId: string;
  state: string;
  disconnect(): Promise<void>;
  getSid(): string;
}

export type CallInviteCallback = (callInvite: CallInvite) => void;
export type CallConnectedCallback = (call: ActiveCall) => void;
export type CallDisconnectedCallback = () => void;

/**
 * Telnyx Voice service for VoIP calls
 */
export class VoiceService {
  private static instance: VoiceService;
  private telnyxClient: TelnyxClient | null = null;
  private initialized = false;
  private currentCall: TelnyxCall | null = null;
  private currentCallInvite: CallInvite | null = null;
  
  // Event callbacks
  private onCallInviteCallback: CallInviteCallback | null = null;
  private onCallConnectedCallback: CallConnectedCallback | null = null;
  private onCallDisconnectedCallback: CallDisconnectedCallback | null = null;

  private constructor() {
    console.log('[Voice] Initializing Telnyx Voice...');
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  private setupEventListeners() {
    if (!this.telnyxClient) return;

    console.log('[Voice] Setting up Telnyx event listeners...');

    // Incoming call notification
    this.telnyxClient.on('telnyx.notification', (notification: TelnyxNotification) => {
      console.log('[Voice] Telnyx notification:', notification.type);

      if (notification.type === 'callUpdate' && notification.call) {
        const call = notification.call;
        
        // Handle incoming call
        if (call.state === 'ringing' && !this.currentCall) {
          console.log('[Voice] Incoming call from:', call.callerIdNumber);
          
          const callInvite: CallInvite = {
            callId: call.callId,
            from: call.callerIdNumber || 'Unknown',
            to: call.destinationNumber || '',
            callerName: call.callerIdName,
            customParameters: {},
            getFrom: () => call.callerIdNumber || 'Unknown',
            getCustomParameters: () => ({}),
          };
          
          this.currentCallInvite = callInvite;
          
          if (this.onCallInviteCallback) {
            this.onCallInviteCallback(callInvite);
          }
        }

        // Handle call connected
        if (call.state === 'active' && this.currentCall) {
          console.log('[Voice] Call connected:', call.callId);
          
          const activeCall: ActiveCall = {
            callId: call.callId,
            state: call.state,
            disconnect: async () => {
              if (this.currentCall) {
                await this.currentCall.hangup();
              }
            },
            getSid: () => call.callId,
          };
          
          this.currentCallInvite = null;
          
          if (this.onCallConnectedCallback) {
            this.onCallConnectedCallback(activeCall);
          }
        }

        // Handle call disconnected
        if (call.state === 'done' || call.state === 'hangup') {
          console.log('[Voice] Call disconnected:', call.callId);
          this.currentCall = null;
          this.currentCallInvite = null;
          
          if (this.onCallDisconnectedCallback) {
            this.onCallDisconnectedCallback();
          }
        }
      }
    });

    // Socket connection events
    this.telnyxClient.on('telnyx.socket.open', () => {
      console.log('[Voice] ✅ Telnyx socket connected');
    });

    this.telnyxClient.on('telnyx.socket.close', () => {
      console.log('[Voice] Telnyx socket closed');
    });

    this.telnyxClient.on('telnyx.socket.error', (error: any) => {
      console.error('[Voice] Telnyx socket error:', error);
    });

    this.telnyxClient.on('telnyx.ready', () => {
      console.log('[Voice] ✅ Telnyx client ready');
    });

    this.telnyxClient.on('telnyx.error', (error: any) => {
      console.error('[Voice] Telnyx error:', error);
    });
  }

  /**
   * Initialize and connect with Telnyx Voice
   */
  async initialize(getToken: () => Promise<string | null>): Promise<void> {
    if (this.initialized) {
      console.log('[Voice] Already initialized');
      return;
    }

    try {
      console.log('[Voice] Fetching Telnyx credentials...');
      const { token, identity } = await APIClient.fetchTelnyxToken(getToken);
      
      console.log('[Voice] Initializing Telnyx Client as:', identity);
      
      // Initialize Telnyx Client
      this.telnyxClient = new TelnyxClient({
        login: identity,
        password: token,
        // You can add additional configuration here
      });

      this.setupEventListeners();

      // Connect to Telnyx
      await this.telnyxClient.connect();
      
      this.initialized = true;
      console.log('[Voice] ✅ Telnyx Voice service initialized successfully');
    } catch (error) {
      console.error('[Voice] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(): Promise<void> {
    if (!this.currentCallInvite || !this.telnyxClient) {
      console.warn('[Voice] No call invite to accept or client not initialized');
      return;
    }

    try {
      console.log('[Voice] Accepting call...');
      
      // Create a new call and answer it
      const call = await this.telnyxClient.newCall({
        destinationNumber: this.currentCallInvite.from,
        callerIdNumber: this.currentCallInvite.to,
      });
      
      this.currentCall = call;
      await call.answer();
      
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
      
      // If we have a current call object, hang it up
      if (this.currentCall) {
        await this.currentCall.hangup();
      }
      
      this.currentCallInvite = null;
      this.currentCall = null;
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
      await this.currentCall.hangup();
      this.currentCall = null;
      console.log('[Voice] Call ended');
    } catch (error) {
      console.error('[Voice] Failed to end call:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Telnyx Voice
   */
  async unregister(): Promise<void> {
    if (!this.initialized || !this.telnyxClient) {
      return;
    }

    try {
      console.log('[Voice] Disconnecting from Telnyx...');
      await this.telnyxClient.disconnect();
      this.initialized = false;
      this.telnyxClient = null;
      console.log('[Voice] Disconnected successfully');
    } catch (error) {
      console.error('[Voice] Failed to disconnect:', error);
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
  getCurrentCall(): TelnyxCall | null {
    return this.currentCall;
  }

  /**
   * Get current call invite
   */
  getCurrentCallInvite(): CallInvite | null {
    return this.currentCallInvite;
  }
}
