/**
 * MESSAGES SERVICE
 * Centralized SMS/message sending functionality
 * Follows .cursorrules: Type safety, error handling, env checks
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface SendMessageRequest {
  homeownerId: string;
  text: string;
  callId?: string | null;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Get the API endpoint for message sending
 * Handles both local dev and production environments
 */
export function getMessagesEndpoint(): string {
  const isLocalDev = 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocalDev) {
    return 'http://localhost:3000/api/messages/send';
  }

  // Production: use current hostname with www prefix
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const domain = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
    return `${protocol}//${domain}/api/messages/send`;
  }

  // Fallback
  return '/api/messages/send';
}

// ==========================================
// MESSAGE FUNCTIONS
// ==========================================

/**
 * Send an SMS message
 * @param request - Message data including homeownerId, text, and optional callId
 * @returns Promise with success status and message ID or error
 */
export async function sendMessage(
  request: SendMessageRequest
): Promise<SendMessageResponse> {
  console.log(`📨 Sending message to homeowner: ${request.homeownerId}`);

  // Validation
  if (!request.homeownerId || !request.homeownerId.trim()) {
    console.error('❌ homeownerId is required');
    return {
      success: false,
      error: 'Homeowner ID is required',
    };
  }

  if (!request.text || !request.text.trim()) {
    console.error('❌ Message text is required');
    return {
      success: false,
      error: 'Message text cannot be empty',
    };
  }

  try {
    const endpoint = getMessagesEndpoint();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        homeownerId: request.homeownerId,
        text: request.text.trim(),
        callId: request.callId || null,
      }),
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || response.statusText;
      } catch {
        errorMessage = response.statusText;
      }
      
      console.error(`❌ Message send failed (${response.status}): ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Parse response
    const result = await response.json();

    if (!result.success) {
      console.error('❌ Message send failed:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to send message',
      };
    }

    console.log(`✅ Message sent successfully`);
    return {
      success: true,
      messageId: result.messageId,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error sending message:', errorMessage);
    
    return {
      success: false,
      error: `Failed to send message: ${errorMessage}`,
    };
  }
}

/**
 * Validate message text
 */
export function validateMessageText(text: string): { valid: boolean; error?: string } {
  if (!text || !text.trim()) {
    return {
      valid: false,
      error: 'Message cannot be empty',
    };
  }

  // Check length (SMS typically has 160 char limit, but we'll be more lenient)
  if (text.length > 1600) {
    return {
      valid: false,
      error: 'Message is too long (max 1600 characters)',
    };
  }

  return { valid: true };
}

