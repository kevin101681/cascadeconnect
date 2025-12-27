const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');

// We'll use raw SQL for the email logger to avoid TypeScript schema issues

/**
 * Logs an email send attempt to the database
 * Wrapped in try/catch so logging errors don't block the main application flow
 * @param {Object} data - Email log data
 * @param {string} data.recipient - Recipient email address
 * @param {string} data.subject - Email subject
 * @param {string} data.status - 'sent' | 'failed'
 * @param {string} [data.error] - Error message if status is 'failed'
 * @param {Object} [data.metadata] - JSON metadata (claim_id, user_id, etc.)
 */
async function logEmailToDb(data) {
  try {
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    
    if (!databaseUrl) {
      console.warn('⚠️ [EMAIL LOGGER] Database URL not configured, skipping email log');
      return;
    }

    const sql = neon(databaseUrl);

    // Use raw SQL to insert email log
    const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;
    const query = `
      INSERT INTO email_logs (recipient, subject, status, error, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    `;
    
    await sql(query, [
      data.recipient,
      data.subject,
      data.status,
      data.error || null,
      metadataJson,
      new Date().toISOString()
    ]);

    console.log(`✅ [EMAIL LOGGER] Logged email: ${data.status} to ${data.recipient}`);
  } catch (error) {
    // Log the error but don't throw - email logging should never block the main flow
    console.error('❌ [EMAIL LOGGER] Failed to log email to database:', error.message);
  }
}

module.exports = { logEmailToDb };

