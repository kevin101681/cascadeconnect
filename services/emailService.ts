import { UserRole } from '../types';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  fromName: string;
  fromRole: UserRole;
  replyToId?: string; // Thread ID or Claim ID
}

export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  try {
    // Determine API endpoint - use Netlify Function in production, local server in development
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let apiEndpoint: string;
    if (isLocalDev) {
      apiEndpoint = 'http://localhost:3000/api/email/send';
    } else {
      // Use full URL with www to avoid redirect issues that break CORS preflight
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      // If already on www, use it; otherwise use www to match Netlify redirect
      const domain = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
      apiEndpoint = `${protocol}//${domain}/api/email/send`;
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
        fromName: payload.fromName,
        fromRole: payload.fromRole,
        replyToId: payload.replyToId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Email API error:', errorData);
      
      // If SMTP is not configured, fall back to simulation mode
      if (errorData.error && errorData.error.includes('Email Configuration Missing')) {
        console.warn('⚠️ SMTP not configured, falling back to simulation mode');
        console.log('--- EMAIL SERVICE SIMULATION (SMTP not configured) ---');
        console.log(`To: ${payload.to}`);
        console.log(`From: ${payload.fromName} (${payload.fromRole})`);
        console.log(`Subject: ${payload.subject}`);
        console.log(`Body: ${payload.body}`);
        console.log('--------------------------------');
        return true; // Return success even in simulation mode
      }
      
      // Log detailed error information
      if (errorData.details) {
        console.error('Email error details:', errorData.details);
      }
      
      throw new Error(errorData.error || 'Failed to send email');
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', result.messageId);
    if (result.details) {
      console.log('Email details:', {
        to: result.details.to,
        from: result.details.from,
        statusCode: result.details.statusCode
      });
    }
    
    // Warn if using SendGrid but email might not be delivered
    if (result.message && result.message.includes('SendGrid')) {
      console.log('📧 Email queued via SendGrid. Check your inbox and spam folder.');
      console.log('💡 If email is not received, verify:');
      console.log('   1. SENDGRID_REPLY_EMAIL is verified in SendGrid');
      console.log('   2. SendGrid account is active and not rate-limited');
      console.log('   3. Recipient email address is correct');
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    
    // Fall back to simulation mode if network error or API unavailable
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.warn('⚠️ Email API unavailable, falling back to simulation mode');
      console.log('--- EMAIL SERVICE SIMULATION (API unavailable) ---');
      console.log(`To: ${payload.to}`);
      console.log(`From: ${payload.fromName} (${payload.fromRole})`);
      console.log(`Subject: ${payload.subject}`);
      console.log(`Body: ${payload.body}`);
      console.log('--------------------------------');
      return true; // Return success even in simulation mode
    }
    
    // Re-throw other errors
    throw error;
  }
};

export const generateNotificationBody = (
  authorName: string, 
  content: string, 
  contextType: 'CLAIM' | 'MESSAGE', 
  contextId: string, 
  link: string
) => {
  return `
You have a new message from ${authorName} regarding ${contextType} #${contextId}.

"${content}"

--------------------------------------------------
To reply, simply reply to this email or log in to your portal:
${link}
  `;
};

// Helper to format email body as HTML (for links)
export const formatEmailBodyAsHTML = (body: string): string => {
  // Convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const bodyWithLinks = body.replace(urlRegex, '<a href="$1" style="color: #6750A4; text-decoration: underline;">$1</a>');
  // Convert line breaks to <br>
  return bodyWithLinks.replace(/\n/g, '<br>');
};