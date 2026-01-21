import { TelnyxClient, Call, Invitation } from '@telnyx/react-native';
import { APIClient } from './api';

export type CallInviteCallback = (invitation: Invitation) => void;
export type CallConnectedCallback = (call: Call) => void;
export type CallDisconnectedCallback = () => void;

/**
 * Telnyx Voice service for VoIP calls
 */
export class VoiceService {
  private static instance: VoiceService;
  private client: TelnyxClient | null = null;
  private initialized = false;
  private currentCall: Call | null = null;
  private currentInvitation: Invitation | null = null;
  
  // Event callbacks
  private onCallInviteCallback: CallInviteCallback | null = null;
  private onCallConnectedCallback: CallConnectedCallback | null = null;
  private onCallDisconnectedCallback: CallDisconnectedCallback | null = null;

  private constructor() {
    console.log('[Voice] Initializing Telnyx SDK...');
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  private setupEventListeners() {
    if (!this.client) return;

    console.log('[Voice] Setting up event listeners...');

    // Socket connection events
    this.client.on('socket.ready', () => {
      console.log('[Voice] ✅ Socket connected and ready');
    });

    this.client.on('socket.error', (error: any) => {
      console.error('[Voice] Socket error:', error);
    });

    this.client.on('socket.close', () => {
      console.log('[Voice] Socket closed');
    });

    // Incoming call invitation
    this.client.on('invitation', (invitation: Invitation) => {
      console.log('[Voice] Incoming call invitation:', invitation.callId);
      this.currentInvitation = invitation;
      
      if (this.onCallInviteCallback) {
        this.onCallInviteCallback(invitation);
      }
    });

    // Call state changes
    this.client.on('call.state', (call: Call) => {
      console.log('[Voice] Call state changed:', call.state, 'Call ID:', call.callId);
      
      if (call.state === 'active' || call.state === 'answering') {
        console.log('[Voice] Call connected:', call.callId);
        this.currentCall = call;
        this.currentInvitation = null;
        
        if (this.onCallConnectedCallback) {
          this.onCallConnectedCallback(call);
        }
      } else if (call.state === 'done' || call.state === 'hangup') {
        console.log('[Voice] Call disconnected:', call.callId);
        this.currentCall = null;
        this.currentInvitation = null;
        
        if (this.onCallDisconnectedCallback) {
          this.onCallDisconnectedCallback();
        }
      }
    });

    // Error handling
    this.client.on('error', (error: any) => {
      console.error('[Voice] Error:', error);
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
      console.log('[Voice] Fetching access token...');
      const { token, username } = await APIClient.fetchTelnyxToken(getToken);
      
      console.log('[Voice] Connecting to Telnyx as:', username);
      
      // Initialize Telnyx client
      this.client = new TelnyxClient({
        login_token: token,
      });

      // Set up event listeners
      this.setupEventListeners();

      // Connect to the socket
      await this.client.connect();
      
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
    if (!this.currentInvitation) {
      console.warn('[Voice] No call invitation to accept');
      return;
    }

    try {
      console.log('[Voice] Accepting call...');
      const call = await this.currentInvitation.answer();
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
    if (!this.currentInvitation) {
      console.warn('[Voice] No call invitation to reject');
      return;
    }

    try {
      console.log('[Voice] Rejecting call...');
      await this.currentInvitation.reject();
      this.currentInvitation = null;
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
    if (!this.initialized || !this.client) {
      return;
    }

    try {
      console.log('[Voice] Disconnecting...');
      await this.client.disconnect();
      this.initialized = false;
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
  getCurrentCall(): Call | null {
    return this.currentCall;
  }

  /**
   * Get current call invitation
   */
  getCurrentCallInvitation(): Invitation | null {
    return this.currentInvitation;
  }
}
