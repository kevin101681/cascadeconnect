/**
 * SendGrid Webhook Handler - "SAFETY OFF" VERSION
 * ALL signature verification removed to isolate database update logic
 * Enhanced logging to trace every step
 */

import { neon } from '@neondatabase/serverless';

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: string;
  custom_args?: Record<string, string>;
  customArgs?: Record<string, string>;
  [key: string]: any;
}

export const handler = async (event: any) => {
  // ===== STEP 1: LOG ENTRY =====
  console.log('🚨🚨🚨 WEBHOOK HIT! 🚨🚨🚨');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  console.log('Raw Body:', event.body);

  // Handle GET requests (SendGrid verification)
  if (event.httpMethod === 'GET') {
    console.log('✅ GET request - returning 200');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Webhook is active',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    console.log('❌ Method not POST:', event.httpMethod);
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // ===== STEP 2: CHECK DATABASE CONNECTION =====
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not configured!');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database not configured' }),
      };
    }

    console.log('✅ DATABASE_URL exists');
    const sql = neon(databaseUrl);
    console.log('✅ Neon SQL client created');

    // ===== STEP 3: PARSE BODY =====
    if (!event.body) {
      console.log('❌ No body in request');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No body provided' }),
      };
    }

    let events: SendGridEvent[];
    try {
      // Handle base64 encoding if present
      const rawBody = event.isBase64Encoded 
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body;
      
      events = JSON.parse(rawBody);
      console.log(`✅ Parsed ${Array.isArray(events) ? events.length : 1} event(s)`);
    } catch (parseError: any) {
      console.error('❌ JSON parse error:', parseError.message);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }

    // Ensure events is an array
    if (!Array.isArray(events)) {
      events = [events];
    }

    // ===== STEP 4: PROCESS EACH EVENT =====
    let updatesProcessed = 0;

    for (let i = 0; i < events.length; i++) {
      const sgEvent = events[i];
      const eventType = (sgEvent.event || 'unknown').toLowerCase();
      const email = sgEvent.email || '';
      const timestamp = sgEvent.timestamp 
        ? new Date(sgEvent.timestamp * 1000)
        : new Date();
      
      // Extract system_email_id (SendGrid flattens customArgs to top level)
      const systemEmailId: string | undefined =
        sgEvent?.system_email_id ||  // ⭐ PRIMARY: Top-level (SendGrid flattens it)
        sgEvent?.custom_args?.system_email_id ||  // Fallback: nested format
        sgEvent?.customArgs?.system_email_id;     // Fallback: alternate nested format

      console.log(`\n📨 Event #${i + 1}:`);
      console.log(`   Type: ${eventType}`);
      console.log(`   Email: ${email}`);
      console.log(`   System Email ID: ${systemEmailId || 'MISSING ⚠️'}`);
      console.log(`   Timestamp: ${timestamp.toISOString()}`);
      console.log(`   Top-level system_email_id:`, sgEvent?.system_email_id || 'NONE');
      console.log(`   Nested custom_args:`, sgEvent?.custom_args || 'NONE');
      console.log(`   Nested customArgs:`, sgEvent?.customArgs || 'NONE');

      // ===== STEP 5: HANDLE "OPEN" EVENTS =====
      if (eventType === 'open') {
        console.log(`🔔 OPEN EVENT DETECTED!`);

        if (!systemEmailId) {
          console.warn(`⚠️ No system_email_id found - cannot update database`);
          console.warn(`⚠️ This means the email was sent WITHOUT the ID in customArgs`);
          continue;
        }

        console.log(`✅ Found system_email_id: ${systemEmailId}`);

        // ===== STEP 6: UPDATE DATABASE =====
        try {
          console.log(`🔄 Attempting database update for email_logs.id = ${systemEmailId}...`);

          const updateResult = await sql`
            UPDATE email_logs
            SET 
              opened_at = COALESCE(opened_at, ${timestamp.toISOString()}),
              status = 'read'
            WHERE id = ${systemEmailId}
            RETURNING id, sendgrid_message_id, opened_at, status
          `;

          console.log(`🔍 Update result:`, updateResult);

          if (updateResult && updateResult.length > 0) {
            console.log(`✅✅✅ SUCCESS! Database updated for email ID ${systemEmailId}`);
            console.log(`✅ Updated row:`, updateResult[0]);
            updatesProcessed++;
          } else {
            console.error(`❌ No rows updated. Email ID ${systemEmailId} not found in database.`);
            console.error(`❌ This could mean:`);
            console.error(`   1. Email was never logged to database`);
            console.error(`   2. ID mismatch (string vs number)`);
            console.error(`   3. Wrong database being queried`);
          }

        } catch (dbError: any) {
          console.error(`❌ Database update FAILED for ID ${systemEmailId}:`);
          console.error(`   Error:`, dbError.message);
          console.error(`   Stack:`, dbError.stack);
        }
      } else {
        console.log(`ℹ️ Ignoring event type: ${eventType}`);
      }
    }

    // ===== STEP 7: RETURN SUCCESS =====
    console.log(`\n🎯 WEBHOOK COMPLETE`);
    console.log(`   Total events: ${events.length}`);
    console.log(`   Updates processed: ${updatesProcessed}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `Processed ${events.length} events, ${updatesProcessed} updates`,
        received: events.length,
        updatesProcessed,
      }),
    };

  } catch (error: any) {
    console.error('❌❌❌ WEBHOOK CRASHED!', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);

    // Still return 200 to prevent SendGrid from retrying infinitely
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error (logged)',
      }),
    };
  }
};
