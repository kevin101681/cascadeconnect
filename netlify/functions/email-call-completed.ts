// Email notification endpoint for AI Intake calls

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const handler = async (event: any): Promise<HandlerResponse> => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    
    const {
      vapiCallId,
      homeownerName,
      phoneNumber,
      propertyAddress,
      builderName,
      closingDate,
      isUrgent,
      issueDescription,
      transcript,
      recordingUrl,
      isVerified,
      matchedHomeownerId,
    } = payload;

    if (!vapiCallId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing required field: vapiCallId' }),
      };
    }

    // Get recipient email (admin email or configured notification email)
    const recipientEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SENDGRID_REPLY_EMAIL || 'info@cascadebuilderservices.com';
    const fromEmail = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || 'noreply@cascadeconnect.app';
    
    console.log(`📧 [EMAIL] Sending call completion email to: ${recipientEmail}`);
    console.log(`📧 [EMAIL] From email: ${fromEmail}`);
    console.log(`📧 [EMAIL] SendGrid API Key configured: ${!!process.env.SENDGRID_API_KEY}`);

    // Build email subject
    const urgencyTag = isUrgent ? '[URGENT] ' : '';
    const verifiedTag = isVerified ? '[VERIFIED] ' : '[UNVERIFIED] ';
    const subject = `${urgencyTag}${verifiedTag}New AI Intake Call: ${homeownerName || 'Unknown'}`;

    // Build email body
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://www.cascadeconnect.app';
    const callsLink = `${appUrl}#ai-intake`;
    const homeownerLink = matchedHomeownerId ? `${appUrl}#dashboard?homeownerId=${matchedHomeownerId}` : null;

    let htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6750A4; margin-bottom: 20px;">New AI Intake Call Received</h2>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #333;">Call Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 150px;">Homeowner Name:</td>
              <td style="padding: 8px 0;">${homeownerName || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
              <td style="padding: 8px 0;">${phoneNumber || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0;">${propertyAddress || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0;">
                ${isVerified ? '<span style="color: green; font-weight: bold;">✓ Verified (Matched to Homeowner)</span>' : '<span style="color: orange; font-weight: bold;">⚠ Unverified Address</span>'}
              </td>
            </tr>
            ${builderName ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Verified Builder:</td>
              <td style="padding: 8px 0;"><strong>${builderName}</strong></td>
            </tr>
            ` : ''}
            ${closingDate ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Verified Closing Date:</td>
              <td style="padding: 8px 0;"><strong>${new Date(closingDate).toLocaleDateString()}</strong></td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Urgent:</td>
              <td style="padding: 8px 0;">
                ${isUrgent ? '<span style="color: red; font-weight: bold;">YES</span>' : 'No'}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Vapi Call ID:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${vapiCallId}</td>
            </tr>
          </table>
        </div>

        ${issueDescription ? `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #333;">Issue Description</h3>
          <p style="margin: 0; color: #333; white-space: pre-wrap;">${issueDescription}</p>
        </div>
        ` : ''}

        ${transcript ? `
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #333;">Call Transcript</h3>
          <p style="margin: 0; color: #666; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${transcript.substring(0, 1000)}${transcript.length > 1000 ? '...' : ''}</p>
        </div>
        ` : ''}

        <div style="margin-top: 30px; text-align: center;">
          <a href="${callsLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; margin: 5px;">
            View All Calls
          </a>
          ${homeownerLink ? `
          <a href="${homeownerLink}" style="display: inline-block; background-color: #4CAF50; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; margin: 5px;">
            View Homeowner
          </a>
          ` : ''}
        </div>

        ${recordingUrl ? `
        <div style="margin-top: 20px; text-align: center;">
          <a href="${recordingUrl}" style="color: #6750A4; text-decoration: underline;">Listen to Recording</a>
        </div>
        ` : ''}
      </div>
    `;

    // Send email using SendGrid if available
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
          to: recipientEmail,
          from: fromEmail,
          subject: subject,
          html: htmlBody,
          text: htmlBody.replace(/<[^>]*>/g, ''), // Plain text version
        };

        console.log(`📧 [EMAIL] Sending via SendGrid to ${recipientEmail}...`);
        const [response] = await sgMail.send(msg);
        
        console.log(`✅ [EMAIL] Email sent successfully via SendGrid:`, {
          statusCode: response.statusCode,
          messageId: response.headers['x-message-id'],
          to: recipientEmail,
        });

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ 
            success: true, 
            message: 'Email notification sent successfully',
            recipientEmail,
            messageId: response.headers['x-message-id'],
          }),
        };
      } catch (sendGridError: any) {
        console.error(`❌ [EMAIL] SendGrid error:`, {
          message: sendGridError.message,
          code: sendGridError.code,
          response: sendGridError.response?.body,
        });
        
        // Don't throw - return error response instead
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ 
            error: 'Failed to send email via SendGrid',
            details: sendGridError.message,
          }),
        };
      }
    } else {
      // Fallback: Log email (for development)
      console.log('📧 Email Notification (SMTP not configured):');
      console.log('To:', recipientEmail);
      console.log('Subject:', subject);
      console.log('Body:', htmlBody);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Email logged (SMTP not configured)' 
        }),
      };
    }
  } catch (error: any) {
    console.error('❌ Error sending call completion email:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: error.message || 'Failed to send email notification' 
      }),
    };
  }
};

