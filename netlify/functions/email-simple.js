// Minimal email test without dependencies
const sgMail = require('@sendgrid/mail');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'SENDGRID_API_KEY not configured' })
      };
    }

    // Parse request
    const { to, subject, body } = JSON.parse(event.body || '{}');
    
    if (!to || !subject || !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, body' })
      };
    }

    // Set API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Send email
    const msg = {
      to: to,
      from: process.env.SENDGRID_REPLY_EMAIL || 'noreply@cascadeconnect.app',
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    };

    await sgMail.send(msg);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully' 
      })
    };

  } catch (error) {
    console.error('Email error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Failed to send email',
        details: error.response?.body || null
      })
    };
  }
};

module.exports = { handler: exports.handler };

