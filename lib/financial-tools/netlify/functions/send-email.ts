
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { to, subject, text, html, attachment } = JSON.parse(event.body || '{}');

    if (!to || !attachment) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing 'to' address or attachment data." })
      };
    }

    // Strip data URI prefix from attachment data if present
    const base64Content = attachment.data.replace(/^data:application\/pdf;base64,/, "");
    const fromEmail = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || 'info@cascadebuilderservices.com';

    // Prefer SendGrid if API key is available
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: to,
        from: {
          email: fromEmail,
          name: 'Cascade Builder Services'
        },
        subject: subject || 'Invoice from Cascade Builder Services',
        text: text || '',
        html: html || text || '',
        attachments: [{
          content: base64Content,
          filename: attachment.filename || 'invoice.pdf',
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      };

      const [response] = await sgMail.send(msg);
      console.log('✅ Email sent via SendGrid:', response.statusCode);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: "Email sent successfully",
          messageId: response.headers['x-message-id']
        }),
      };
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Fallback to SMTP if SendGrid not configured
      const nodemailerModule = await import('nodemailer');
      const transporter = nodemailerModule.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'Cascade Builder Services'}" <${fromEmail}>`,
        to: to,
        subject: subject || "Invoice from Cascade Builder Services",
        text: text || "Please find the attached invoice.",
        html: html,
        attachments: [
          {
            filename: attachment.filename || 'invoice.pdf',
            content: base64Content,
            encoding: 'base64',
            contentType: 'application/pdf'
          }
        ]
      });

      console.log('✅ Email sent via SMTP:', info.messageId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: "Email sent successfully",
          messageId: info.messageId
        }),
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: "Email configuration missing. Please set SENDGRID_API_KEY or SMTP credentials in Netlify settings." 
        })
      };
    }
  } catch (error: any) {
    console.error("Email Sending Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Failed to send email" }),
    };
  }
};
