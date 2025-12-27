const nodemailer = require('nodemailer');
const { logEmailToDb } = require('../../lib/email-logger.js');

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const handler = async (event: any, context?: any): Promise<HandlerResponse> => {
  // Only allow POST requests (OPTIONS is handled above)
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'OPTIONS') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  try {
    const { to, subject, body, fromName, fromRole, replyToId, attachments } = JSON.parse(event.body || '{}');

    if (!to || !subject || !body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ 
          error: "Missing required fields: 'to', 'subject', and 'body' are required." 
        })
      };
    }

    const fromEmail = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
    
    // Validate from email address
    if (!fromEmail || !fromEmail.includes('@')) {
      console.error('Invalid from email address:', fromEmail);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ 
          error: "Invalid 'from' email address configured. Please set SENDGRID_REPLY_EMAIL or SMTP_FROM in Netlify environment variables." 
        })
      };
    }
    
    // Format email body - check if it already contains HTML
    const containsHTML = /<[a-z][\s\S]*>/i.test(body);
    let htmlBody: string;
    if (containsHTML) {
      // Body already contains HTML, use as-is
      htmlBody = body;
    } else {
      // Convert plain text to HTML (convert URLs to clickable links)
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const bodyWithLinks = body.replace(urlRegex, '<a href="$1" style="color: #6750A4; text-decoration: underline;">$1</a>');
      htmlBody = bodyWithLinks.replace(/\n/g, '<br>');
    }
    // For text version, strip HTML tags if present
    const textBody = containsHTML ? body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : body;

    // Prefer SendGrid if API key is available
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      // Create message ID with thread ID for reply matching
      const replyMessageId = replyToId 
        ? `${replyToId}@${(process.env.SENDGRID_REPLY_EMAIL || 'cascadeconnect.netlify.app').split('@')[1] || 'cascadeconnect.netlify.app'}`
        : undefined;

      // Prepare attachments for SendGrid
      const sendGridAttachments = attachments && attachments.length > 0
        ? attachments.map((att: any) => ({
            content: att.content,
            filename: att.filename,
            type: att.contentType || 'application/octet-stream',
            disposition: 'attachment'
          }))
        : [];

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
        attachments: sendGridAttachments
      };

      const [response] = await sgMail.send(msg);
      const sendGridMessageId = response.headers['x-message-id'];
      console.log('✅ Email sent via SendGrid:', {
        statusCode: response.statusCode,
        messageId: sendGridMessageId,
        to: to,
        from: fromEmail,
        subject: subject
      });
      
      // Log any warnings from SendGrid
      if (response.body) {
        console.log('SendGrid response body:', JSON.stringify(response.body));
      }
      
      // Log to database (non-blocking - don't await to avoid timeout)
      logEmailToDb({
        recipient: to,
        subject: subject,
        status: 'sent',
        metadata: {
          messageId: sendGridMessageId,
          from: fromEmail,
          fromName: fromName,
          replyToId: replyToId,
          hasAttachments: attachments && attachments.length > 0,
        }
      }).catch((err: any) => console.error('Failed to log email (non-blocking):', err));
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
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
    } 
    // Fall back to SMTP
    else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const smtpMessageId = replyToId 
        ? `${replyToId}@${(process.env.SMTP_FROM || 'localhost').split('@')[1] || 'localhost'}`
        : undefined;

      // Prepare attachments for SMTP
      const smtpAttachments = attachments && attachments.length > 0
        ? attachments.map((att: any) => ({
            filename: att.filename,
            content: att.content,
            encoding: 'base64',
            contentType: att.contentType || 'application/octet-stream'
          }))
        : [];

      const mailOptions = {
        from: `${fromName || 'Cascade Connect'} <${fromEmail}>`,
        to: to,
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
          'In-Reply-To': smtpMessageId,
          'References': smtpMessageId
        },
        attachments: smtpAttachments
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent via SMTP:', info.messageId);
      
      // Log to database (non-blocking - don't await to avoid timeout)
      logEmailToDb({
        recipient: to,
        subject: subject,
        status: 'sent',
        metadata: {
          messageId: info.messageId,
          from: fromEmail,
          fromName: fromName,
          replyToId: replyToId,
          hasAttachments: attachments && attachments.length > 0,
        }
      }).catch((err: any) => console.error('Failed to log email (non-blocking):', err));
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ 
          success: true, 
          messageId: info.messageId,
          message: 'Email sent successfully via SMTP' 
        })
      };
    } else {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ 
          error: "Email configuration missing. Please set SENDGRID_API_KEY or SMTP credentials in Netlify environment variables." 
        })
      };
    }
  } catch (error: any) {
    console.error("SEND EMAIL ERROR:", {
      message: error.message,
      code: error.code,
      response: error.response ? {
        statusCode: error.response.statusCode,
        body: error.response.body,
        headers: error.response.headers
      } : null,
      stack: error.stack
    });
    
    // Provide more detailed error information
    let errorMessage = error.message || "Failed to send email";
    if (error.response && error.response.body) {
      const errorBody = typeof error.response.body === 'string' 
        ? JSON.parse(error.response.body) 
        : error.response.body;
      if (errorBody.errors && errorBody.errors.length > 0) {
        errorMessage = errorBody.errors.map((e: any) => e.message || e).join('; ');
      }
    }
    
    // Log failed email attempt to database (non-blocking)
    const emailTo = typeof to === 'string' ? to : (Array.isArray(to) ? to[0] : 'unknown');
    const emailSubject = subject || 'No Subject';
    logEmailToDb({
      recipient: emailTo,
      subject: emailSubject,
      status: 'failed',
      error: errorMessage,
      metadata: {
        code: error.code,
        from: process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER,
      }
    }).catch((err: any) => console.error('Failed to log email error (non-blocking):', err));
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
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

