/**
 * SMS SERVICE
 * Frontend service for sending SMS messages
 * December 29, 2025
 */

export interface SendSmsRequest {
  homeownerId: string;
  message: string;
}

export interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  twilioSid?: string;
  error?: string;
}

/**
 * Send an SMS message to a homeowner
 */
export async function sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
  console.log(`📤 Sending SMS to homeowner: ${request.homeownerId}`);

  // Validation
  if (!request.homeownerId || !request.homeownerId.trim()) {
    return {
      success: false,
      error: 'Homeowner ID is required',
    };
  }

  if (!request.message || !request.message.trim()) {
    return {
      success: false,
      error: 'Message cannot be empty',
    };
  }

  try {
    const response = await fetch('/.netlify/functions/sms-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        homeownerId: request.homeownerId,
        message: request.message.trim(),
      }),
    });

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || response.statusText;
      } catch {
        errorMessage = response.statusText;
      }
      
      console.error(`❌ SMS send failed (${response.status}): ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }

    const result = await response.json();

    if (!result.success) {
      console.error('❌ SMS send failed:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to send SMS',
      };
    }

    console.log(`✅ SMS sent successfully`);
    return {
      success: true,
      messageId: result.messageId,
      twilioSid: result.twilioSid,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error sending SMS:', errorMessage);
    
    return {
      success: false,
      error: `Failed to send SMS: ${errorMessage}`,
    };
  }
}

/**
 * Validate SMS message text
 */
export function validateSmsMessage(text: string): { valid: boolean; error?: string } {
  if (!text || !text.trim()) {
    return {
      valid: false,
      error: 'Message cannot be empty',
    };
  }

  // SMS typically has 160 char limit per segment, but we'll allow multiple segments
  if (text.length > 1600) {
    return {
      valid: false,
      error: 'Message is too long (max 1600 characters)',
    };
  }

  return { valid: true };
}

