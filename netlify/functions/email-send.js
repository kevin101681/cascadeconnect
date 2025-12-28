// Email send function - working version based on email-simple.js
const sgMail = require('@sendgrid/mail');
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Check SendGrid configuration
    if (!process.env.SENDGRID_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'SENDGRID_API_KEY not configured' })
      };
    }

    // Parse request
    const parsed = JSON.parse(event.body || '{}');
    const { to, subject, body, fromName, replyToId, attachments } = parsed;
    
    if (!to || !subject || !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "Missing required fields: 'to', 'subject', and 'body' are required." 
        })
      };
    }

    const fromEmail = process.env.SENDGRID_REPLY_EMAIL || 'noreply@cascadeconnect.app';

    // Set API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Format email body
    const containsHTML = /<[a-z][\s\S]*>/i.test(body);
    let htmlBody;
    if (containsHTML) {
      htmlBody = body;
    } else {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const bodyWithLinks = body.replace(urlRegex, '<a href="$1" style="color: #6750A4; text-decoration: underline;">$1</a>');
      htmlBody = bodyWithLinks.replace(/\n/g, '<br>');
    }
    const textBody = containsHTML ? body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : body;

    // Create message ID for threading
    const replyMessageId = replyToId 
      ? `${replyToId}@${(fromEmail.split('@')[1] || 'cascadeconnect.app')}`
      : undefined;

    // Prepare attachments
    const sendGridAttachments = attachments && attachments.length > 0
      ? attachments.map((att) => ({
          content: att.content,
          filename: att.filename,
          type: att.contentType || 'application/octet-stream',
          disposition: 'attachment'
        }))
      : [];

    // Log attachment details
    console.log(`📎 Attachments: ${attachments ? attachments.length : 0} provided, ${sendGridAttachments.length} processed`);
    if (sendGridAttachments.length > 0) {
      sendGridAttachments.forEach((att, idx) => {
        console.log(`  📎 Attachment ${idx + 1}: ${att.filename} (${att.type}), content length: ${att.content?.length || 0} chars`);
      });
    }

    // Send email
    const msg = {
      to: to,
      from: {
        email: fromEmail,
        name: fromName || 'Cascade Connect'
      },
      subject: subject,
      text: textBody,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          ${htmlBody}
          ${replyToId ? `<hr style="margin-top: 20px; border: none; border-top: 1px solid #ddd;"><p style="font-size: 12px; color: #666;">Reply-To ID: ${replyToId}</p>` : ''}
        </div>
      `,
      replyTo: fromEmail,
      headers: {
        'X-Thread-ID': replyToId || '',
        'In-Reply-To': replyMessageId,
        'References': replyMessageId
      },
      customArgs: {
        threadId: replyToId || ''
      },
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false
        },
        openTracking: {
          enable: false
        }
      },
      attachments: sendGridAttachments
    };

    const [response] = await sgMail.send(msg);
    const sendGridMessageId = response.headers['x-message-id'];
    
    console.log('✅ Email sent via SendGrid:', {
      statusCode: response.statusCode,
      messageId: sendGridMessageId,
      to: to,
      from: fromEmail,
      subject: subject,
      attachmentsCount: sendGridAttachments.length
    });

    // Log to database
    try {
      const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
      if (databaseUrl) {
        const sql = neon(databaseUrl);
        await sql(
          `INSERT INTO email_logs (recipient, subject, status, metadata) VALUES ($1, $2, $3, $4)`,
          [
            to,
            subject,
            'sent',
            JSON.stringify({
              messageId: sendGridMessageId,
              from: fromEmail,
              fromName: fromName || 'Cascade Connect',
              replyToId: replyToId,
              attachmentCount: sendGridAttachments.length
            })
          ]
        );
        console.log('📝 Logged email to database');
      } else {
        console.warn('⚠️ DATABASE_URL not set, skipping email logging');
      }
    } catch (dbError) {
      // Don't fail the email send if logging fails
      console.error('❌ Failed to log email to database:', dbError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        messageId: sendGridMessageId,
        message: 'Email sent successfully via SendGrid',
        details: {
          to: to,
          from: fromEmail,
          statusCode: response.statusCode
        }
      })
    };

  } catch (error) {
    console.error('SEND EMAIL ERROR:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        statusCode: error.response.statusCode,
        body: error.response.body
      } : null
    });
    
    let errorMessage = error.message || 'Failed to send email';
    if (error.response && error.response.body) {
      const errorBody = typeof error.response.body === 'string' 
        ? JSON.parse(error.response.body) 
        : error.response.body;
      if (errorBody.errors && errorBody.errors.length > 0) {
        errorMessage = errorBody.errors.map((e) => e.message || e).join('; ');
      }
    }
    
    // Log failed email to database
    try {
      const parsed = JSON.parse(event.body || '{}');
      const { to, subject, fromName } = parsed;
      
      const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
      if (databaseUrl && to && subject) {
        const sql = neon(databaseUrl);
        await sql(
          `INSERT INTO email_logs (recipient, subject, status, error, metadata) VALUES ($1, $2, $3, $4, $5)`,
          [
            to,
            subject,
            'failed',
            errorMessage,
            JSON.stringify({
              fromName: fromName || 'Cascade Connect',
              errorCode: error.code,
              errorDetails: error.response ? error.response.body : null
            })
          ]
        );
        console.log('📝 Logged failed email to database');
      }
    } catch (dbError) {
      console.error('❌ Failed to log failed email to database:', dbError);
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.response ? {
          statusCode: error.response.statusCode,
          body: error.response.body
        } : null
      })
    };
  }
};

module.exports = { handler: exports.handler };
