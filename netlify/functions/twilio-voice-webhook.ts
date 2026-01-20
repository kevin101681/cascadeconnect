import { Handler } from '@netlify/functions';
import twilio from 'twilio';

/**
 * TWILIO VOICE WEBHOOK
 * 
 * This webhook handles incoming calls to your Twilio number.
 * When Vapi forwards a call to your Twilio number, this webhook
 * returns TwiML to connect the call to your mobile app.
 * 
 * Flow:
 * 1. Vapi transfers call to Twilio number (for known contacts)
 * 2. Twilio triggers this webhook
 * 3. We return TwiML to dial the mobile client
 * 4. Mobile app receives incoming call notification
 * 
 * Security: Validates Twilio signature (optional but recommended)
 */

const { twiml } = twilio;

/**
 * Main handler
 */
export const handler: Handler = async (event) => {
  const requestId = `voice-${Date.now()}`;
  console.log(`[${requestId}] Twilio Voice Webhook`);

  // Log incoming call details
  console.log('📞 Incoming call details:', {
    from: event.queryStringParameters?.From,
    to: event.queryStringParameters?.To,
    callSid: event.queryStringParameters?.CallSid,
  });

  // Only accept POST requests from Twilio
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Method not allowed',
    };
  }

  try {
    // Optional: Verify Twilio signature for security
    // Uncomment this if you want to validate requests are from Twilio
    /*
    const twilioSignature = event.headers['x-twilio-signature'] || event.headers['X-Twilio-Signature'];
    const url = `https://${event.headers.host}${event.path}`;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilio.validateRequest(authToken!, twilioSignature!, url, event.body)) {
      console.error(`[${requestId}] Invalid Twilio signature`);
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Forbidden',
      };
    }
    */

    // Get the client identity from environment (or extract from user context)
    // This MUST match the identity used when generating the access token
    const clientIdentity = process.env.TWILIO_CLIENT_IDENTITY || 'kevin_pixel';

    console.log(`[${requestId}] Dialing client: ${clientIdentity}`);

    // Create TwiML response
    const response = new twiml.VoiceResponse();
    
    // Dial the mobile client
    const dial = response.dial({
      timeout: 30, // Ring for 30 seconds
      callerId: event.queryStringParameters?.From, // Show caller ID on mobile
    });
    
    // Connect to the registered client (mobile app)
    dial.client(clientIdentity);

    // If client doesn't answer, play a message
    response.say({
      voice: 'alice',
    }, 'The person you are calling is not available. Please try again later.');

    const twimlResponse = response.toString();
    
    console.log(`[${requestId}] TwiML response:`, twimlResponse);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlResponse,
    };

  } catch (error: any) {
    console.error(`[${requestId}] Error handling voice webhook:`, error);
    
    // Return TwiML error message
    const response = new twiml.VoiceResponse();
    response.say({
      voice: 'alice',
    }, 'An error occurred. Please try again later.');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: response.toString(),
    };
  }
};
