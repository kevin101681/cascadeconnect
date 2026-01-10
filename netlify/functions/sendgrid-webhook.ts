import { neon } from '@neondatabase/serverless';
import { EventWebhook, EventWebhookHeader } from '@sendgrid/eventwebhook';

interface SendGridEvent {
  email: string;
  timestamp: number;
  'smtp-id'?: string;
  event: string;
  category?: string[];
  sg_event_id?: string;
  sg_message_id?: string;
  reason?: string;
  status?: string;
  response?: string;
  attempt?: string;
  useragent?: string;
  ip?: string;
  url?: string;
  asm_group_id?: number;
  [key: string]: any; // Allow additional fields
}

// SendGrid sometimes appends metadata to sg_message_id (e.g., ".filter123")
// Normalize by stripping angle brackets and trimming everything after the first dot.
function normalizeMessageId(id?: string | null): string {
  if (!id) return '';
  const cleaned = id.replace(/[<>]/g, '');
  const dotIndex = cleaned.indexOf('.');
  return dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex);
}

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const handler = async (event: any): Promise<HandlerResponse> => {
  // Log raw body early for debugging
  console.log('🪝 SendGrid webhook raw body:', event.body);

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get environment variables
    const databaseUrl = process.env.DATABASE_URL;
    const webhookVerificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

    if (!databaseUrl) {
      console.error('DATABASE_URL is not configured');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Database not configured' }),
      };
    }

    // IMPORTANT: Get the raw body BEFORE any parsing
    // Netlify functions provide the body as a string in event.body
    // If it's base64 encoded, we need to decode it first
    let rawBody: string;
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(event.body, 'base64').toString('utf-8');
    } else {
      rawBody = event.body || '';
    }

    // Verify webhook signature if key is provided
    // MUST verify signature using raw body BEFORE JSON parsing
    if (webhookVerificationKey) {
      try {
        const ew = new EventWebhook();
        const publicKey = ew.convertPublicKeyToECDSA(webhookVerificationKey);
        
        // Get signature and timestamp from headers
        // SendGrid uses these header names (case-insensitive)
        const signature = event.headers['x-twilio-email-event-webhook-signature'] || 
                         event.headers['X-Twilio-Email-Event-Webhook-Signature'] ||
                         event.headers['x-sendgrid-signature'] ||
                         event.headers['X-Sendgrid-Signature'] || '';
        
        const timestamp = event.headers['x-twilio-email-event-webhook-timestamp'] ||
                         event.headers['X-Twilio-Email-Event-Webhook-Timestamp'] ||
                         event.headers['x-sendgrid-timestamp'] ||
                         event.headers['X-Sendgrid-Timestamp'] || '';

        if (signature && timestamp) {
          // CRITICAL: Use rawBody (before JSON parsing) for signature verification
          const isValid = ew.verifySignature(
            publicKey,
            rawBody,
            signature,
            timestamp
          );

          if (!isValid) {
            console.error('Invalid webhook signature');
            return {
              statusCode: 401,
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ error: 'Invalid signature' }),
            };
          }
          console.log('✅ Webhook signature verified');
        } else {
          console.warn('⚠️ Missing signature or timestamp headers. Skipping verification.');
        }
      } catch (verifyError: any) {
        console.error('Error verifying webhook signature:', verifyError.message);
        // Continue processing even if verification fails (for development)
        // In production, you might want to return an error here
        console.warn('⚠️ Continuing without signature verification');
      }
    } else {
      console.warn('⚠️ SENDGRID_WEBHOOK_VERIFICATION_KEY is not configured. Skipping signature verification.');
    }

    // NOW parse the webhook body (after signature verification)
    let events: SendGridEvent[];
    try {
      events = JSON.parse(rawBody || '[]');
    } catch (parseError: any) {
      console.error('Error parsing webhook body:', parseError.message);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }

    // Ensure events is an array
    if (!Array.isArray(events)) {
      events = [events];
    }

    console.log(`📧 Received ${events.length} SendGrid event(s)`);

    // Connect to Neon database
    const sql = neon(databaseUrl);

    // Process each event
    const processedEvents: any[] = [];
    let openEventsProcessed = 0;
    
    for (const sgEvent of events) {
      try {
        const rawSgMessageId: string = sgEvent.sg_message_id || sgEvent['smtp-id'] || '';
        const normalizedMessageId = normalizeMessageId(rawSgMessageId);
        const email = sgEvent.email || '';
        const eventType = ((sgEvent.event ?? sgEvent.type) || 'unknown').toLowerCase();
        const timestamp = sgEvent.timestamp 
          ? new Date(sgEvent.timestamp * 1000) // SendGrid timestamps are in seconds
          : new Date();
        const lookupPattern = normalizedMessageId ? `${normalizedMessageId}%` : rawSgMessageId;
        const systemEmailId: string | undefined =
          sgEvent?.custom_args?.system_email_id ||
          sgEvent?.customArgs?.system_email_id;

        // 📨 ENHANCED VISIBILITY LOG
        console.log(`📨 SendGrid Webhook Event: ${eventType} | Email: ${email} | SG ID: ${rawSgMessageId || 'MISSING'}`);
        console.log('🪝 Incoming SendGrid payload', {
          eventType,
          email,
          rawSgMessageId,
          normalizedMessageId,
          systemEmailId,
          timestamp: timestamp.toISOString(),
          payload: sgEvent,
        });

        if (eventType === 'open') {
          // Primary path: use system_email_id from custom args
          if (systemEmailId) {
            try {
              const updateById = await sql`
                UPDATE email_logs
                SET 
                  opened_at = COALESCE(opened_at, ${timestamp.toISOString()}),
                  status = 'read'
                WHERE id = ${systemEmailId}
                RETURNING id, sendgrid_message_id, opened_at, status
              `;

              if (updateById && updateById.length > 0) {
                console.log(`✅ Marked email as read/opened via custom_args for ${email}`, {
                  matchedIds: updateById.map((row: any) => row.id),
                });
                openEventsProcessed += updateById.length;
                processedEvents.push({
                  sg_message_id: rawSgMessageId,
                  email,
                  event: eventType,
                  timestamp: timestamp.toISOString(),
                  systemEmailId,
                });
                continue;
              }
              console.log('ℹ️ No email_log matched custom_args system_email_id', { systemEmailId });
            } catch (updateError: any) {
              console.warn(`⚠️ Could not update opened_at/status via custom_args for ${systemEmailId}:`, updateError.message);
            }
          }

          // Fallback path: match on sg_message_id
          if (!rawSgMessageId) {
            console.warn('⚠️ Open event missing sg_message_id/smtp-id; skipping update');
          } else {
            try {
              const updateResult = await sql`
                UPDATE email_logs
                SET 
                  opened_at = COALESCE(opened_at, ${timestamp.toISOString()}),
                  status = 'read'
                WHERE sendgrid_message_id IS NOT NULL
                  AND (
                    sendgrid_message_id = ${rawSgMessageId}
                    OR sendgrid_message_id LIKE ${lookupPattern}
                  )
                RETURNING id, sendgrid_message_id, opened_at, status
              `;
              
              if (updateResult && updateResult.length > 0) {
                console.log(`✅ Marked email as read/opened for ${email}`, {
                  matchedIds: updateResult.map((row: any) => row.sendgrid_message_id),
                });
                openEventsProcessed += updateResult.length;
              } else {
                console.log('ℹ️ No matching email_log found for open event', {
                  rawSgMessageId,
                  normalizedMessageId,
                });
              }
            } catch (updateError: any) {
              console.warn(`⚠️ Could not update opened_at/status for ${rawSgMessageId}:`, updateError.message);
              // Don't fail the webhook if update fails
            }
          }
        } else {
          console.log(`ℹ️ Ignoring unsupported event type: ${eventType}`);
        }

        processedEvents.push({
          sg_message_id: rawSgMessageId,
          email,
          event: eventType,
          timestamp: timestamp.toISOString(),
        });

      } catch (eventError: any) {
        console.error(`❌ Error processing event:`, {
          error: eventError.message,
          event: sgEvent,
        });
        // Continue processing other events even if one fails
      }
    }

    // Always return 200 to SendGrid immediately
    // This prevents SendGrid from retrying
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: `Processed ${openEventsProcessed} open event(s)`,
        received: events.length,
        openEventsProcessed,
      }),
    };
  } catch (error: any) {
    console.error('❌ Webhook handler error:', {
      message: error.message,
      stack: error.stack,
    });

    // Still return 200 to prevent SendGrid retries
    // Log the error for debugging
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error (logged)',
      }),
    };
  }
};

