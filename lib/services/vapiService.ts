/**
 * VAPI SERVICE
 * Centralized Vapi AI voice call operations
 * Follows .cursorrules: Type safety, error handling, env checks
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface VapiStructuredData {
  propertyAddress?: string;
  homeownerName?: string;
  phoneNumber?: string;
  issueDescription?: string;
  callIntent?: string;
  isUrgent?: boolean;
}

export interface VapiCall {
  id?: string;
  callId?: string;
  transcript?: string;
  transcription?: string;
  recordingUrl?: string;
  recording_url?: string;
  analysis?: VapiAnalysis;
  artifact?: VapiArtifact;
  propertyAddress?: string;
  address?: string;
  homeownerName?: string;
  phoneNumber?: string;
  from?: string;
}

export interface VapiAnalysis {
  structuredData?: VapiStructuredData;
}

export interface VapiArtifact {
  structuredOutputs?: VapiStructuredData;
  structuredData?: VapiStructuredData;
}

export interface VapiMessage {
  type?: string;
  call?: VapiCall;
  analysis?: VapiAnalysis;
  artifact?: VapiArtifact;
  structuredData?: VapiStructuredData;
  transcript?: string;
}

export interface VapiWebhookPayload {
  message?: VapiMessage;
  call?: VapiCall;
  type?: string;
  id?: string;
  analysis?: VapiAnalysis;
  artifact?: VapiArtifact;
}

export interface ExtractedCallData {
  vapiCallId: string;
  propertyAddress: string | null;
  homeownerName: string | null;
  phoneNumber: string | null;
  issueDescription: string | null;
  callIntent: string | null;
  isUrgent: boolean;
  transcript: string | null;
  recordingUrl: string | null;
}

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Check if Vapi is configured
 */
export function isVapiConfigured(): boolean {
  return !!process.env.VAPI_SECRET;
}

/**
 * Get Vapi API secret (throws if not configured)
 */
function getVapiSecret(): string {
  const secret = process.env.VAPI_SECRET;
  
  if (!secret) {
    throw new Error('VAPI_SECRET not configured. Please set the environment variable.');
  }
  
  return secret;
}

// ==========================================
// API OPERATIONS
// ==========================================

/**
 * Fetch call data from Vapi API as a fallback
 * @param callId - The Vapi call ID
 * @returns Promise with call data
 */
export async function fetchVapiCall(callId: string): Promise<VapiCall> {
  console.log(`🔄 Fetching call data from Vapi API: ${callId}`);

  const vapiSecret = getVapiSecret();

  try {
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vapiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi API error: ${response.status} - ${errorText}`);
    }

    const callData = await response.json();
    console.log('✅ Call data fetched from Vapi API');
    
    return callData;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to fetch from Vapi API:', errorMessage);
    throw new Error(`Failed to fetch call data: ${errorMessage}`);
  }
}

// ==========================================
// DATA EXTRACTION
// ==========================================

/**
 * Extract call ID from webhook payload
 */
export function extractCallId(payload: VapiWebhookPayload): string | null {
  const message = payload.message || payload;
  const callData = message.call || payload.call || message;
  
  return callData?.id || callData?.callId || payload?.id || null;
}

/**
 * Extract structured data from webhook payload
 * Handles various payload structures
 */
export function extractStructuredData(payload: VapiWebhookPayload): VapiStructuredData {
  const message = payload.message || payload;
  const callData = message.call || payload.call || message;
  const analysis = message?.analysis || callData?.analysis || payload?.analysis || {};
  const artifact = message?.artifact || callData?.artifact || payload?.artifact || {};
  
  // Try multiple possible locations for structured data
  const structuredData = 
    message?.analysis?.structuredData ||
    message?.artifact?.structuredOutputs ||
    message?.structuredData ||
    analysis?.structuredData || 
    artifact?.structuredOutputs ||
    artifact?.structuredData ||
    {};

  return structuredData;
}

/**
 * Extract all call data from webhook payload
 */
export function extractCallData(payload: VapiWebhookPayload): Partial<ExtractedCallData> {
  const callId = extractCallId(payload);
  const message = payload.message || payload;
  const callData = message.call || payload.call || message;
  const structuredData = extractStructuredData(payload);

  // Extract fields with fallbacks
  const propertyAddress = 
    structuredData?.propertyAddress || 
    structuredData?.property_address ||
    structuredData?.address ||
    callData?.propertyAddress ||
    callData?.address ||
    null;

  const homeownerName = 
    structuredData?.homeownerName || 
    structuredData?.homeowner_name ||
    structuredData?.name ||
    callData?.homeownerName ||
    null;

  const phoneNumber = 
    structuredData?.phoneNumber || 
    structuredData?.phone_number ||
    callData?.phoneNumber ||
    callData?.from ||
    null;

  const issueDescription = 
    structuredData?.issueDescription || 
    structuredData?.issue_description ||
    structuredData?.description ||
    null;

  const callIntent = 
    structuredData?.callIntent || 
    structuredData?.call_intent ||
    structuredData?.intent ||
    null;

  const isUrgent = 
    structuredData?.isUrgent === true || 
    structuredData?.is_urgent === true ||
    structuredData?.urgent === true ||
    callIntent === 'urgent' ||
    false;

  const transcript = callData?.transcript || callData?.transcription || message?.transcript || null;
  const recordingUrl = callData?.recordingUrl || callData?.recording_url || null;

  return {
    vapiCallId: callId || '',
    propertyAddress,
    homeownerName,
    phoneNumber,
    issueDescription,
    callIntent,
    isUrgent,
    transcript,
    recordingUrl,
  };
}

/**
 * Extract call data with API fallback if data is missing
 * @param payload - Webhook payload
 * @param requiredFields - Array of required field names to check
 * @returns Complete call data
 */
export async function extractCallDataWithFallback(
  payload: VapiWebhookPayload,
  requiredFields: Array<keyof ExtractedCallData> = ['propertyAddress']
): Promise<Partial<ExtractedCallData>> {
  console.log('📦 Extracting call data from webhook...');
  
  let callData = extractCallData(payload);
  
  // Check if any required fields are missing
  const missingFields = requiredFields.filter(field => !callData[field]);
  
  if (missingFields.length > 0 && callData.vapiCallId) {
    console.log(`⚠️ Missing fields: ${missingFields.join(', ')}, attempting API fallback...`);
    
    try {
      // Wait 2 seconds before API call (per .cursorrules)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const apiCallData = await fetchVapiCall(callData.vapiCallId);
      const apiStructuredData = extractStructuredData(apiCallData as any);
      
      // Merge API data with webhook data
      if (apiStructuredData?.propertyAddress && !callData.propertyAddress) {
        callData.propertyAddress = apiStructuredData.propertyAddress;
        console.log(`✅ Got propertyAddress from API: ${callData.propertyAddress}`);
      }
      if (apiStructuredData?.homeownerName && !callData.homeownerName) {
        callData.homeownerName = apiStructuredData.homeownerName;
      }
      if (apiStructuredData?.phoneNumber && !callData.phoneNumber) {
        callData.phoneNumber = apiStructuredData.phoneNumber;
      }
      if (apiStructuredData?.issueDescription && !callData.issueDescription) {
        callData.issueDescription = apiStructuredData.issueDescription;
      }
      if (apiStructuredData?.callIntent && !callData.callIntent) {
        callData.callIntent = apiStructuredData.callIntent;
      }
      if (apiStructuredData?.isUrgent !== undefined && !callData.isUrgent) {
        callData.isUrgent = apiStructuredData.isUrgent === true;
      }
    } catch (apiError: unknown) {
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
      console.error(`❌ API fallback failed:`, errorMessage);
    }
  }

  return callData;
}

// ==========================================
// VALIDATION
// ==========================================

/**
 * Verify Vapi webhook secret
 */
export function verifyVapiSecret(headerSecret: string | undefined): boolean {
  if (!headerSecret) {
    console.error('❌ No Vapi secret in headers');
    return false;
  }

  try {
    const expectedSecret = getVapiSecret();
    
    if (headerSecret !== expectedSecret) {
      console.error('❌ Invalid Vapi secret');
      return false;
    }

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Secret verification failed:', errorMessage);
    return false;
  }
}

/**
 * Check if webhook payload is a final event
 */
export function isFinalEvent(payload: VapiWebhookPayload, callData: Partial<ExtractedCallData>): boolean {
  const messageType = payload.message?.type || payload.type;
  
  return (
    messageType === 'end-of-call-report' || 
    messageType === 'function-call' ||
    !!callData.propertyAddress ||
    !!callData.callIntent
  );
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Log extracted call data for debugging
 */
export function logCallData(callData: Partial<ExtractedCallData>): void {
  console.log('📊 Extracted call data:', {
    propertyAddress: callData.propertyAddress || 'MISSING',
    homeownerName: callData.homeownerName || 'not provided',
    phoneNumber: callData.phoneNumber || 'not provided',
    callIntent: callData.callIntent || 'not provided',
    isUrgent: callData.isUrgent,
  });
}

