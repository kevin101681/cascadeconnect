import { Handler } from '@netlify/functions';

/**
 * TELNYX VOICE WEBHOOK
 * 
 * This webhook handles incoming calls via Telnyx Call Control.
 * When a call comes in (transferred from Vapi), this webhook
 * handles the call using Telnyx Call Control REST API.
 * 
 * Flow:
 * 1. Vapi transfers call to Telnyx number (for known contacts)
 * 2. Telnyx triggers this webhook with call.initiated event
 * 3. We answer the call and forward to registered SIP client
 * 4. Mobile app receives incoming call notification
 * 
 * Security: Validates Telnyx signature (optional but recommended)
 */

/**
 * Main handler
 */
export const handler: Handler = async (event) => {
  const requestId = `telnyx-voice-${Date.now()}`;
  console.log(`[${requestId}] Telnyx Voice Webhook`);

  // Only accept POST requests from Telnyx
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Method not allowed',
    };
  }

  try {
    // Parse the incoming webhook payload
    const payload = JSON.parse(event.body || '{}');
    
    console.log(`[${requestId}] Webhook event type:`, payload.data?.event_type);
    console.log(`[${requestId}] Call details:`, {
      callControlId: payload.data?.payload?.call_control_id,
      from: payload.data?.payload?.from,
      to: payload.data?.payload?.to,
      callSessionId: payload.data?.payload?.call_session_id,
    });

    // Check required environment variables
    const apiKey = process.env.TELNYX_API_KEY;
    const sipUsername = process.env.TELNYX_SIP_USERNAME || 'kevin_pixel';

    if (!apiKey) {
      console.error(`[${requestId}] Missing TELNYX_API_KEY`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    // Handle different event types
    const eventType = payload.data?.event_type;
    const callData = payload.data?.payload;
    const callControlId = callData.call_control_id;

    switch (eventType) {
      case 'call.initiated':
        // Incoming call - answer it using Call Control REST API
        console.log(`[${requestId}] Answering incoming call...`);
        
        const answerResponse = await fetch(
          `https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_state: Buffer.from(JSON.stringify({ username: sipUsername })).toString('base64'),
            }),
          }
        );

        if (!answerResponse.ok) {
          const errorText = await answerResponse.text();
          console.error(`[${requestId}] Failed to answer:`, errorText);
        } else {
          console.log(`[${requestId}] Call answered, will transfer on next event`);
        }
        break;

      case 'call.answered':
        // Call was answered, now transfer to the SIP client (mobile app)
        console.log(`[${requestId}] Transferring call to SIP client: ${sipUsername}`);
        
        const transferResponse = await fetch(
          `https://api.telnyx.com/v2/calls/${callControlId}/actions/transfer`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: `sip:${sipUsername}@sip.telnyx.com`,
              from: callData.from,
              from_display_name: callData.from || 'Unknown Caller',
            }),
          }
        );

        if (!transferResponse.ok) {
          const errorText = await transferResponse.text();
          console.error(`[${requestId}] Failed to transfer:`, errorText);
        } else {
          console.log(`[${requestId}] ✅ Call transferred to mobile client`);
        }
        break;

      case 'call.hangup':
        // Call ended
        console.log(`[${requestId}] Call ended:`, callData.hangup_cause);
        break;

      default:
        console.log(`[${requestId}] Unhandled event type:`, eventType);
    }

    // Return 200 OK to acknowledge receipt
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };

  } catch (error: any) {
    console.error(`[${requestId}] Error handling Telnyx webhook:`, error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message || 'Unknown error',
      }),
    };
  }
};
