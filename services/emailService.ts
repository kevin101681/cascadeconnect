import { UserRole } from '../types';

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded content
  contentType?: string; // e.g., 'application/pdf', 'image/jpeg', 'video/mp4'
}

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  fromName: string;
  fromRole: UserRole;
  replyToId?: string; // Thread ID or Claim ID
  replyToEmail?: string; // Email address for replies (e.g., admin's actual email)
  attachments?: EmailAttachment[]; // Array of attachments
}

export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  try {
    // Determine API endpoint - use Netlify Function in production, local server in development
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let apiEndpoint: string;
    if (isLocalDev) {
      apiEndpoint = 'http://localhost:3000/api/email/send';
    } else {
      // Use current domain - no need to add www for Netlify subdomain
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      apiEndpoint = `${protocol}//${hostname}/api/email/send`;
    }

    console.log(`📧 [emailService] Sending email to ${payload.to} via ${apiEndpoint}`);
    if (payload.attachments && payload.attachments.length > 0) {
      console.log(`📎 [emailService] ${payload.attachments.length} attachments to send`);
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
        replyToEmail: payload.replyToEmail,
        attachments: payload.attachments,
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
  // Use modern React Email template with unified design system
  try {
    const { render } = require('@react-email/render');
    const MessageNotificationEmail = require('../emails/MessageNotificationEmail').default;
    
    return render(
      MessageNotificationEmail({
        authorName,
        content,
        contextType,
        contextId,
        link,
      })
    );
  } catch (error) {
    console.error('Failed to render email template, falling back to legacy HTML:', error);
    
    // Fallback to legacy HTML if React Email fails
    const showContextId = contextId && contextId !== 'new' && contextId.length < 20;
    const contextLine = showContextId 
      ? `You have a new message from ${authorName} regarding ${contextType} #${contextId}.`
      : `You have a new message from ${authorName}.`;
    
    return `
${contextLine}

"${content}"

--------------------------------------------------
To reply, simply reply to this email or view your messages in Cascade Connect:

<div style="margin: 20px 0; text-align: center;">
  <a href="${link}" style="display: inline-block; background-color: #2563eb; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Messages</a>
</div>
    `;
  }
};

// Helper to format email body as HTML (for links)
export const formatEmailBodyAsHTML = (body: string): string => {
  // Convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const bodyWithLinks = body.replace(urlRegex, '<a href="$1" style="color: #6750A4; text-decoration: underline;">$1</a>');
  // Convert line breaks to <br>
  return bodyWithLinks.replace(/\n/g, '<br>');
};