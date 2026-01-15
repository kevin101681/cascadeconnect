/**
 * EMAIL SERVICE
 * Centralized email notification functionality using SendGrid
 * Follows .cursorrules: Type safety, error handling, env checks
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  content: string; // Base64 encoded content
  filename: string;
  type: string; // MIME type
  disposition?: 'attachment' | 'inline';
}

export interface EmailRequest {
  to: EmailRecipient | EmailRecipient[];
  from?: EmailRecipient;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: EmailRecipient;
  // Optional: system email ID for SendGrid custom_args to improve webhook matching
  systemEmailId?: string;
  // Optional: additional SendGrid custom args
  customArgs?: Record<string, string>;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type NotificationScenario = 'CLAIM_CREATED' | 'MATCH_NO_CLAIM' | 'NO_MATCH';

export interface UniversalNotificationData {
  propertyAddress: string | null;
  homeownerName: string | null;
  phoneNumber: string | null;
  issueDescription: string | null;
  callIntent: string | null;
  isUrgent: boolean;
  isVerified: boolean;
  matchedHomeownerId: string | null;
  matchedHomeownerName: string | null;
  claimNumber: string | null;
  claimId: string | null;
  vapiCallId: string;
  similarity: number | null;
}

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Check if SendGrid is configured
 */
export function isSendGridConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

/**
 * Get SendGrid API key (throws if not configured)
 */
function getSendGridApiKey(): string {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY not configured. Please set the environment variable.');
  }
  
  return apiKey;
}

/**
 * Get default from email
 */
function getDefaultFromEmail(): EmailRecipient {
  const email = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || 'noreply@cascadeconnect.app';
  const name = 'Cascade Connect AI';
  
  return { email, name };
}

/**
 * Get app URL for links
 * Ensures HTTPS protocol is always included
 */
function getAppUrl(): string {
  // If NEXT_PUBLIC_APP_URL is set, use it as-is (should include protocol)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // If VERCEL_URL is set, add https:// protocol (VERCEL_URL doesn't include it)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback to production URL
  return 'https://www.cascadeconnect.app';
}

// ==========================================
// EMAIL FUNCTIONS
// ==========================================

/**
 * Send an email using SendGrid
 * @param request - Email request data
 * @returns Promise with success status
 */
export async function sendEmail(request: EmailRequest): Promise<EmailResponse> {
  console.log('📨 Sending email...');
  console.log('📨 To:', typeof request.to === 'string' ? request.to : request.to.email);
  console.log('📨 Subject:', request.subject);

  // Check if SendGrid is configured
  if (!isSendGridConfigured()) {
    console.error('❌ SendGrid not configured, cannot send email');
    console.error('❌ Set SENDGRID_API_KEY environment variable to enable email sending');
    return {
      success: false,
      error: 'SendGrid not configured - SENDGRID_API_KEY missing',
    };
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(getSendGridApiKey());

    const fromEmail = request.from || getDefaultFromEmail();
    
    // Build message
    const msg: any = {
      to: Array.isArray(request.to) 
        ? request.to.map(r => ({ email: r.email, name: r.name }))
        : { email: request.to.email, name: request.to.name },
      from: {
        email: fromEmail.email,
        name: fromEmail.name || 'Cascade Connect',
      },
      subject: request.subject,
      text: request.text,
      // Enable open tracking for read receipts
      trackingSettings: {
        openTracking: {
          enable: true,
        },
      },
    };

    // Attach custom args for reliable webhook correlation
    const customArgs: Record<string, string> = {};
    if (request.systemEmailId) {
      customArgs.system_email_id = request.systemEmailId;
    }
    if (request.customArgs) {
      Object.assign(customArgs, request.customArgs);
    }
    if (Object.keys(customArgs).length > 0) {
      msg.custom_args = customArgs;
      msg.customArgs = customArgs; // Support both snake_case and camelCase for SendGrid SDK
    }

    // Add optional fields
    if (request.html) {
      msg.html = request.html;
    }

    if (request.attachments) {
      msg.attachments = request.attachments;
    }

    if (request.replyTo) {
      msg.replyTo = {
        email: request.replyTo.email,
        name: request.replyTo.name,
      };
    }

    // Send email
    const [response] = await sgMail.send(msg);
    
    console.log(`✅ Email sent successfully (${response.statusCode})`);
    
    return {
      success: true,
      messageId: response.headers?.['x-message-id'],
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to send email:', errorMessage);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error details:', error);
    
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as any;
      console.error('❌ SendGrid error code:', sgError.code);
      console.error('❌ SendGrid error status:', sgError.response?.statusCode);
      if (sgError.response?.body) {
        console.error('❌ SendGrid error body:', JSON.stringify(sgError.response.body, null, 2));
      }
    }
    
    // Check for common configuration errors
    if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized')) {
      console.error('❌ SENDGRID_API_KEY may be invalid or expired. Please check your environment variables.');
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email to multiple recipients
 * @param requests - Array of email requests
 * @returns Promise with results for each email
 */
export async function sendBatchEmails(requests: EmailRequest[]): Promise<EmailResponse[]> {
  console.log(`📨 Sending batch of ${requests.length} emails...`);
  
  const results = await Promise.all(
    requests.map(request => sendEmail(request))
  );
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Batch complete: ${successCount}/${requests.length} sent successfully`);
  
  return results;
}

// ==========================================
// SPECIALIZED NOTIFICATIONS
// ==========================================

/**
 * Get admin emails from database - only Administrator role
 */
async function getAdminEmails(db: any): Promise<string[]> {
  try {
    const { users } = await import('../../db/schema');
    const { eq, and } = await import('drizzle-orm');
    
    // Only get users with role = 'ADMIN' AND internalRole = 'Administrator'
    const admins = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, 'ADMIN'),
          eq(users.internalRole, 'Administrator')
        )
      );
    
    const adminEmails = admins
      .map((admin: any) => admin.email)
      .filter((email: string) => {
        return email && 
               !email.includes('mock') && 
               !email.includes('test') && 
               !email.includes('example.com');
      });
    
    return adminEmails;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching admin emails:', errorMessage);
    return [];
  }
}

/**
 * Build email content for universal notification
 * Uses modern React Email templates with unified design system
 */
function buildUniversalNotificationContent(
  scenario: NotificationScenario,
  data: UniversalNotificationData
): { subject: string; html: string; text: string } {
  const appUrl = getAppUrl();
  const callsLink = `${appUrl}#ai-intake`;
  const homeownerLink = data.matchedHomeownerId ? `${appUrl}#dashboard?homeownerId=${data.matchedHomeownerId}` : undefined;
  const claimLink = data.claimId ? `${appUrl}#claims?claimId=${data.claimId}` : undefined;

  let subject = '';

  // Determine subject line based on scenario
  if (scenario === 'CLAIM_CREATED') {
    subject = `New Warranty Claim: ${data.propertyAddress || 'Unknown Address'}`;
  } else if (scenario === 'MATCH_NO_CLAIM') {
    subject = `Homeowner Call: ${data.propertyAddress || 'Unknown Address'}`;
  } else {
    subject = `Unknown Caller: ${data.phoneNumber || 'No Phone'}`;
  }

  // Add urgency flag to subject if urgent
  if (data.isUrgent) {
    subject = `[URGENT] ${subject}`;
  }

  // Render React Email template to HTML
  const { render } = require('@react-email/render');
  const UniversalNotificationEmail = require('../../emails/UniversalNotificationEmail').default;
  
  const html = render(
    UniversalNotificationEmail({
      scenario,
      data,
      callsLink,
      homeownerLink,
      claimLink,
    })
  );

  // Build plain text version
  const headerTitle = scenario === 'CLAIM_CREATED' ? 'New Warranty Claim Created' 
    : scenario === 'MATCH_NO_CLAIM' ? 'Homeowner Call Received'
    : 'Unknown Caller - Manual Review Required';
  
  const scenarioDescription = scenario === 'CLAIM_CREATED' 
    ? `A warranty claim has been automatically created for ${data.matchedHomeownerName || data.homeownerName || 'this homeowner'}.`
    : scenario === 'MATCH_NO_CLAIM'
    ? `${data.matchedHomeownerName || data.homeownerName || 'A homeowner'} called.`
    : `A caller could not be matched to a homeowner in the database.`;

  const text = `
${headerTitle}

${scenarioDescription}

CALL INFORMATION
${scenario === 'NO_MATCH' ? `Phone Number: ${data.phoneNumber || 'Not provided'}` : ''}
Property Address: ${data.propertyAddress || 'Not provided'}
${scenario !== 'NO_MATCH' ? `Homeowner: ${data.matchedHomeownerName || data.homeownerName || 'Not provided'}` : `Caller Name: ${data.homeownerName || 'Not provided'}`}
${scenario !== 'NO_MATCH' ? `Phone: ${data.phoneNumber || 'Not provided'}` : ''}
Urgency: ${data.isUrgent ? 'URGENT' : 'Normal'}
${scenario === 'CLAIM_CREATED' ? `Claim Number: #${data.claimNumber}` : ''}

${data.issueDescription ? `\nISSUE DESCRIPTION\n${data.issueDescription}\n` : ''}

LINKS
${scenario === 'CLAIM_CREATED' ? 'View Claim' : scenario === 'MATCH_NO_CLAIM' ? 'View Homeowner' : 'Review Call'}: ${claimLink || homeownerLink || callsLink}
View All Calls: ${callsLink}
  `.trim();

  return { subject, html, text };
}

/**
 * Send universal email notification for Vapi calls
 * Automatically determines scenario and sends appropriate email
 */
export async function sendUniversalNotification(
  scenario: NotificationScenario,
  data: UniversalNotificationData,
  db: any
): Promise<void> {
  console.log(`📧 Sending '${scenario}' notification...`);
  console.log(`📧 Data summary:`, {
    propertyAddress: data.propertyAddress,
    homeownerName: data.homeownerName,
    phoneNumber: data.phoneNumber ? '***' + data.phoneNumber.slice(-4) : null,
    isVerified: data.isVerified,
    claimCreated: !!data.claimId,
    vapiCallId: data.vapiCallId,
  });

  // Check if SendGrid is configured
  const sendGridConfigured = isSendGridConfigured();
  console.log(`📧 SendGrid configured:`, sendGridConfigured);
  console.log(`📧 SENDGRID_API_KEY exists:`, !!process.env.SENDGRID_API_KEY);
  
  if (!sendGridConfigured) {
    console.error('❌ CRITICAL: SendGrid not configured! SENDGRID_API_KEY environment variable is missing.');
    console.error('❌ Email notifications will NOT be sent until SENDGRID_API_KEY is configured.');
    return;
  }

  try {
    // Get admin emails
    const adminEmails = await getAdminEmails(db);
    const recipientEmail = adminEmails.length > 0 
      ? adminEmails[0] 
      : (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SENDGRID_REPLY_EMAIL || 'info@cascadebuilderservices.com');
    
    console.log(`📧 Sending to: ${recipientEmail}`);

    // Build email content
    const { subject, html, text } = buildUniversalNotificationContent(scenario, data);

    // Send to primary recipient
    const result = await sendEmail({
      to: { email: recipientEmail },
      subject,
      text,
      html,
    });

    if (result.success) {
      console.log(`✅ Sent '${scenario}' email successfully`);
      
      // Log email to database for tracking (non-blocking)
      try {
        const { logEmailToDb } = require('../../lib/email-logger.js');
        const emailLogResult = await logEmailToDb({
          recipient: recipientEmail,
          subject,
          status: 'sent',
          metadata: {
            messageId: result.messageId,
            scenario,
            vapiCallId: data.vapiCallId,
            homeownerId: data.matchedHomeownerId,
            claimId: data.claimId,
          },
        });
        console.log('📝 Email logged to database:', { emailLogResult, messageId: result.messageId });
      } catch (logError) {
        console.error('Failed to log email (non-blocking):', logError);
      }
    } else {
      console.error(`❌ Failed to send '${scenario}' email:`, result.error);
    }

    // Send to additional admins
    if (adminEmails.length > 1) {
      for (let i = 1; i < adminEmails.length; i++) {
        try {
          await sendEmail({
            to: { email: adminEmails[i] },
            subject,
            text,
            html,
          });
          console.log(`✅ Sent to additional admin: ${adminEmails[i]}`);
        } catch (err) {
          console.error(`❌ Failed to send to ${adminEmails[i]}`);
        }
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Email notification failed (non-blocking) for scenario '${scenario}':`, errorMessage);
  }
}

