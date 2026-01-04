/**
 * VAPI SERVICE
 * Centralized Vapi AI voice call operations
 * Follows .cursorrules: Type safety, error handling, env checks
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface VapiStructuredData {
  // CamelCase variants (preferred)
  propertyAddress?: string;
  homeownerName?: string;
  phoneNumber?: string;
  issueDescription?: string;
  callIntent?: string;
  isUrgent?: boolean;
  
  // Snake_case variants (for backward compatibility with Vapi webhook)
  property_address?: string;
  homeowner_name?: string;
  phone_number?: string;
  issue_description?: string;
  call_intent?: string;
  is_urgent?: boolean;
  
  // Generic fallbacks
  address?: string;
  name?: string;
  description?: string;
  intent?: string;
  urgent?: boolean;
  
  // Allow any other fields from Vapi
  [key: string]: unknown;
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
  const callData = message?.call || payload.call || message;
  
  // Type guard: check if callData has the id or callId property
  const id = (callData && typeof callData === 'object' && 'id' in callData) ? callData.id : undefined;
  const callId = (callData && typeof callData === 'object' && 'callId' in callData) ? callData.callId : undefined;
  const payloadId = (payload && typeof payload === 'object' && 'id' in payload) ? payload.id : undefined;
  
  return (id as string) || (callId as string) || (payloadId as string) || null;
}

/**
 * Extract structured data from webhook payload
 * Handles various payload structures INCLUDING UUID-wrapped structured outputs
 * 
 * VAPI 2025 UPDATE: Structured outputs may be nested under a UUID key like:
 * {
 *   "structuredOutputs": {
 *     "so-1234-5678-abcd-efgh": {
 *       "propertyAddress": "...",
 *       "homeownerName": "..."
 *     }
 *   }
 * }
 */
export function extractStructuredData(payload: VapiWebhookPayload): VapiStructuredData {
  const message = payload.message || payload;
  const callData = message?.call || payload.call || message;
  const analysis = message?.analysis || (callData && 'analysis' in callData ? callData.analysis : undefined) || payload?.analysis || {};
  const artifact = message?.artifact || (callData && 'artifact' in callData ? callData.artifact : undefined) || payload?.artifact || {};
  
  // 🔍 PAYLOAD SNIFFER: Log the actual structure for debugging
  console.log('🔍 PAYLOAD SNIFFER - Checking structured data locations:');
  console.log('  message?.analysis?.structuredData:', !!message?.analysis?.structuredData);
  console.log('  message?.artifact?.structuredOutputs:', !!message?.artifact?.structuredOutputs);
  console.log('  message?.artifact?.structuredData:', !!(artifact && 'structuredData' in artifact));
  console.log('  payload?.artifact?.structuredOutputs:', !!(payload?.artifact && 'structuredOutputs' in payload.artifact));
  console.log('  analysis?.structuredData:', !!(analysis && 'structuredData' in analysis));
  
  // Try multiple possible locations for structured data (UPDATED FOR LATE-2025 VAPI)
  let structuredData: any = 
    message?.artifact?.structuredOutputs ||  // 🆕 NEW LOCATION (Late-2025 Vapi)
    message?.artifact?.structuredData ||     // 🆕 ALTERNATE NEW LOCATION
    message?.analysis?.structuredData ||     // Legacy location
    (message && 'structuredData' in message ? message.structuredData : undefined) ||
    (artifact && 'structuredOutputs' in artifact ? artifact.structuredOutputs : undefined) ||
    (artifact && 'structuredData' in artifact ? artifact.structuredData : undefined) ||
    (analysis && 'structuredData' in analysis ? analysis.structuredData : undefined) || 
    {};

  // 🆕 DYNAMIC UUID UNWRAPPING
  // If structuredData is an object but doesn't have our expected keys,
  // check if it's a UUID-wrapped object and unwrap it
  if (structuredData && typeof structuredData === 'object' && Object.keys(structuredData).length > 0) {
    const hasExpectedKeys = 
      'propertyAddress' in structuredData ||
      'homeownerName' in structuredData ||
      'phoneNumber' in structuredData ||
      'issueDescription' in structuredData ||
      'isUrgent' in structuredData;
    
    if (!hasExpectedKeys) {
      console.log('🔍 Structured data found but missing expected keys - checking for UUID wrapping...');
      console.log('🔑 Current keys in structuredData:', Object.keys(structuredData));
      
      // Get all values from the object
      const values = Object.values(structuredData);
      console.log('📊 Number of values to check:', values.length);
      
      // Log each value for debugging
      values.forEach((val: any, index: number) => {
        console.log(`🔍 Checking value ${index}:`, typeof val, val ? Object.keys(val) : 'null/undefined');
      });
      
      // Define interface for Vapi's wrapped structure
      interface VapiWrappedData {
        name?: string;
        result?: Record<string, any>;
        compliancePlan?: any;
        [key: string]: any;
      }
      
      // Find the first value that looks like our structured data
      // Check both direct properties AND nested under 'result' key (Vapi 2025 format)
      const unwrappedData = values.find((val: any): val is VapiWrappedData | Record<string, any> => {
        if (!val || typeof val !== 'object') {
          console.log(`🔍 Value is not an object, skipping`);
          return false;
        }
        
        // Check if data is directly on the object
        const hasDirectKeys = val.propertyAddress || val.homeownerName || val.phoneNumber || val.issueDescription || 'isUrgent' in val;
        
        // Check if data is nested under 'result' key (Vapi's new format)
        const hasResultKey = val.result && typeof val.result === 'object';
        const hasKeysInResult = hasResultKey && (
          val.result.propertyAddress || 
          val.result.homeownerName || 
          val.result.phoneNumber || 
          val.result.issueDescription || 
          'isUrgent' in val.result
        );
        
        const isValid = hasDirectKeys || hasKeysInResult;
        console.log(`🔍 Value is valid structured data:`, isValid, hasResultKey ? '(found in result key)' : '');
        
        return isValid;
      });
      
      if (unwrappedData) {
        console.log('✅ Found UUID-wrapped structured data! Unwrapping...');
        console.log('🔑 UUID keys in structuredOutputs:', Object.keys(structuredData));
        
        // Check if data is nested under 'result' key and extract it
        if (unwrappedData.result && typeof unwrappedData.result === 'object') {
          console.log('📦 Data is nested under "result" key - extracting...');
          console.log('📦 Unwrapped data keys:', Object.keys(unwrappedData.result));
          structuredData = unwrappedData.result;
        } else {
          console.log('📦 Unwrapped data keys:', Object.keys(unwrappedData));
          structuredData = unwrappedData;
        }
      } else {
        console.error('❌ UUID key found but no valid data inside!');
        console.error('📦 Raw structuredData:', JSON.stringify(structuredData, null, 2));
      }
    }
  }

  // 🚨 MISSING DATA ALERT
  if (!structuredData || Object.keys(structuredData).length === 0) {
    console.error('🚨 STRUCTURED DATA IS EMPTY OR MISSING!');
    console.log('📦 Full payload structure:', JSON.stringify(payload, null, 2));
  } else {
    console.log('✅ Found structured data with keys:', Object.keys(structuredData));
  }

  return structuredData as VapiStructuredData;
}

/**
 * Extract all call data from webhook payload
 */
export function extractCallData(payload: VapiWebhookPayload): Partial<ExtractedCallData> {
  const callId = extractCallId(payload);
  const message = payload.message || payload;
  const callData = message?.call || payload.call || message;
  const structuredData = extractStructuredData(payload);

  // Helper to safely access properties
  const getProperty = (obj: any, ...keys: string[]): any => {
    for (const key of keys) {
      if (obj && typeof obj === 'object' && key in obj) {
        return obj[key];
      }
    }
    return null;
  };

  // Extract fields with fallbacks
  const propertyAddress = 
    structuredData?.propertyAddress || 
    structuredData?.property_address ||
    structuredData?.address ||
    getProperty(callData, 'propertyAddress', 'address') ||
    null;

  const homeownerName = 
    structuredData?.homeownerName || 
    structuredData?.homeowner_name ||
    structuredData?.name ||
    getProperty(callData, 'homeownerName') ||
    null;

  const phoneNumber = 
    structuredData?.phoneNumber || 
    structuredData?.phone_number ||
    getProperty(callData, 'phoneNumber', 'from') ||
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

  // Parse isUrgent - handle both boolean and string values
  let isUrgent = false;
  const urgentValue = structuredData?.isUrgent ?? structuredData?.is_urgent ?? structuredData?.urgent;
  
  if (typeof urgentValue === 'boolean') {
    isUrgent = urgentValue;
  } else if (urgentValue !== null && urgentValue !== undefined) {
    // Handle string values like "TRUE", "FALSE", "true", "false"
    const stringValue = String(urgentValue).toLowerCase();
    isUrgent = stringValue === 'true';
  }
  
  // Override with callIntent if present
  if (callIntent === 'urgent') {
    isUrgent = true;
  }

  const transcript = getProperty(callData, 'transcript', 'transcription') || getProperty(message, 'transcript') || null;
  const recordingUrl = getProperty(callData, 'recordingUrl', 'recording_url') || null;

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
      
      // 🆘 EMERGENCY EXTRACTION: If still missing data after API call, try Gemini extraction
      const stillMissingFields = requiredFields.filter(field => !callData[field]);
      if (stillMissingFields.length > 0) {
        console.log(`🆘 Still missing fields after API call: ${stillMissingFields.join(', ')}`);
        console.log(`🔄 Attempting emergency Gemini extraction from transcript...`);
        
        const message = payload.message || payload;
        const rawCallData = message?.call || payload.call || message;
        const transcript = callData.transcript || 
                          (rawCallData && typeof rawCallData === 'object' && 'transcript' in rawCallData ? rawCallData.transcript : null) ||
                          (rawCallData && typeof rawCallData === 'object' && 'transcription' in rawCallData ? rawCallData.transcription : null);
        
        if (transcript) {
          const emergencyData = await emergencyExtractFromTranscript(transcript as string);
          
          // Merge emergency extracted data
          if (emergencyData.propertyAddress && !callData.propertyAddress) {
            callData.propertyAddress = emergencyData.propertyAddress;
            console.log(`✅ Emergency extracted propertyAddress: ${callData.propertyAddress}`);
          }
          if (emergencyData.homeownerName && !callData.homeownerName) {
            callData.homeownerName = emergencyData.homeownerName;
            console.log(`✅ Emergency extracted homeownerName: ${callData.homeownerName}`);
          }
          if (emergencyData.issueDescription && !callData.issueDescription) {
            callData.issueDescription = emergencyData.issueDescription;
            console.log(`✅ Emergency extracted issueDescription`);
          }
        } else {
          console.error('❌ No transcript available for emergency extraction');
        }
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
  
  // Only send email on end-of-call-report to prevent duplicates
  return messageType === 'end-of-call-report';
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Emergency extraction from transcript using Gemini
 * Used when Vapi structured data is missing
 */
async function emergencyExtractFromTranscript(transcript: string): Promise<Partial<ExtractedCallData>> {
  console.log('🆘 EMERGENCY EXTRACTION: Using Gemini to extract from transcript');
  
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY not configured, cannot perform emergency extraction');
    return {};
  }
  
  try {
    const prompt = `Extract the following information from this phone call transcript. Return ONLY valid JSON with these fields:
{
  "propertyAddress": "the full property address mentioned",
  "homeownerName": "the caller's name",
  "issueDescription": "brief description of the issue or request",
  "callIntent": "warranty_issue, billing_question, scheduling, or general_inquiry"
}

If a field is not mentioned, use null. Do not include any explanation, only return the JSON object.

Transcript:
${transcript}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Could not extract JSON from Gemini response');
      return {};
    }
    
    const extracted = JSON.parse(jsonMatch[0]);
    console.log('✅ Emergency extraction successful:', extracted);
    
    return {
      propertyAddress: extracted.propertyAddress || null,
      homeownerName: extracted.homeownerName || null,
      issueDescription: extracted.issueDescription || null,
      callIntent: extracted.callIntent || null,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Emergency extraction failed:', errorMessage);
    return {};
  }
}

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

