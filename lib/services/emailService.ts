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
 */
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://www.cascadeconnect.app';
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

  // Check if SendGrid is configured
  if (!isSendGridConfigured()) {
    console.log('⚠️ SendGrid not configured, skipping email');
    return {
      success: false,
      error: 'SendGrid not configured',
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
    };

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
    
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as any;
      if (sgError.response?.body) {
        console.error('SendGrid error details:', sgError.response.body);
      }
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
 * Get admin emails from database
 */
async function getAdminEmails(db: any): Promise<string[]> {
  try {
    const { users } = await import('../../db/schema');
    const { eq } = await import('drizzle-orm');
    
    const admins = await db
      .select()
      .from(users)
      .where(eq(users.role, 'ADMIN'));
    
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
 */
function buildUniversalNotificationContent(
  scenario: NotificationScenario,
  data: UniversalNotificationData
): { subject: string; html: string; text: string } {
  const appUrl = getAppUrl();
  const callsLink = `${appUrl}#ai-intake`;
  const homeownerLink = data.matchedHomeownerId ? `${appUrl}#dashboard?homeownerId=${data.matchedHomeownerId}` : null;
  const claimLink = data.claimId ? `${appUrl}#claims?claimId=${data.claimId}` : null;

  let subject = '';
  let headerTitle = '';
  let scenarioDescription = '';
  let statusBadge = '';
  let primaryCta = { text: '', link: '', color: '' };

  // ====================================
  // SCENARIO A: CLAIM CREATED
  // ====================================
  if (scenario === 'CLAIM_CREATED') {
    subject = `New Warranty Claim: ${data.propertyAddress || 'Unknown Address'}`;
    headerTitle = 'New Warranty Claim Created';
    scenarioDescription = `A warranty claim has been automatically created for ${data.matchedHomeownerName || data.homeownerName || 'this homeowner'}.`;
    statusBadge = '<span style="background-color: #1565C0; color: white; padding: 10px 20px; border-radius: 25px; font-weight: bold; display: inline-block;">Claim Created</span>';
    primaryCta = { text: 'View Claim', link: claimLink || callsLink, color: '#26A69A' };
  }
  // ====================================
  // SCENARIO B: MATCH FOUND, NO CLAIM
  // ====================================
  else if (scenario === 'MATCH_NO_CLAIM') {
    subject = `Homeowner Call: ${data.propertyAddress || 'Unknown Address'}`;
    headerTitle = 'Homeowner Call Received';
    scenarioDescription = `${data.matchedHomeownerName || data.homeownerName || 'A homeowner'} called.`;
    statusBadge = '<span style="background-color: #26A69A; color: white; padding: 10px 20px; border-radius: 25px; font-weight: bold; display: inline-block;">Matched - No Claim</span>';
    primaryCta = { text: 'View Homeowner', link: homeownerLink || callsLink, color: '#26A69A' };
  }
  // ====================================
  // SCENARIO C: NO MATCH / UNKNOWN
  // ====================================
  else {
    subject = `Unknown Caller: ${data.phoneNumber || 'No Phone'}`;
    headerTitle = 'Unknown Caller - Manual Review Required';
    scenarioDescription = `The AI could not match this address to any homeowner in the database. Please review manually and create a homeowner record if needed.`;
    statusBadge = '<span style="background-color: #26A69A; color: white; padding: 10px 20px; border-radius: 25px; font-weight: bold; display: inline-block;">Unmatched</span>';
    primaryCta = { text: 'Review Call', link: callsLink, color: '#26A69A' };
  }

  // Add urgency flag to subject if urgent
  if (data.isUrgent) {
    subject = `[URGENT] ${subject}`;
  }

  // Build HTML email body
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <h2 style="color: #1565C0; margin-bottom: 10px; margin-top: 0;">${headerTitle}</h2>
        <div style="margin-bottom: 20px;">${statusBadge}</div>
        <p style="color: #666; font-size: 15px; line-height: 1.6;">${scenarioDescription}</p>
        
        <hr style="border: none; border-top: 2px solid #e0e0e0; margin: 30px 0;">
        
        <!-- Call Information -->
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #333; font-size: 16px;">Call Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${scenario === 'NO_MATCH' ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; width: 160px; color: #666;">Phone Number:</td>
              <td style="padding: 10px 0; color: #333;"><strong>${data.phoneNumber || 'Not provided'}</strong></td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0; font-weight: bold; width: 160px; color: #666;">Property Address:</td>
              <td style="padding: 10px 0; color: #333;"><strong>${data.propertyAddress || 'Not provided'}</strong></td>
            </tr>
            ${scenario !== 'NO_MATCH' ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Homeowner:</td>
              <td style="padding: 10px 0; color: #333;">${data.matchedHomeownerName || data.homeownerName || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Phone:</td>
              <td style="padding: 10px 0; color: #333;">${data.phoneNumber || 'Not provided'}</td>
            </tr>
            ` : `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Caller Name:</td>
              <td style="padding: 10px 0; color: #333;">${data.homeownerName || 'Not provided'}</td>
            </tr>
            `}
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Urgency:</td>
              <td style="padding: 10px 0; color: #333;">
                ${data.isUrgent ? '<span style="color: #dc3545; font-weight: bold;">URGENT</span>' : 'Normal'}
              </td>
            </tr>
            ${scenario === 'CLAIM_CREATED' ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Claim Number:</td>
              <td style="padding: 10px 0; color: #333;"><strong>#${data.claimNumber}</strong></td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Issue Description -->
        ${data.issueDescription ? `
        <div style="background-color: #E3F2FD; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196F3;">
          <h3 style="margin-top: 0; color: #333; font-size: 16px;">${scenario === 'CLAIM_CREATED' ? 'Issue Description' : 'Caller Message'}</h3>
          <p style="margin: 0; color: #333; white-space: pre-wrap; line-height: 1.6;">${data.issueDescription}</p>
        </div>
        ` : ''}

        <!-- Action Needed (for NO_MATCH scenario) -->
        ${scenario === 'NO_MATCH' ? `
        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f44336;">
          <h3 style="margin-top: 0; color: #d32f2f; font-size: 16px;">Action Required</h3>
          <p style="margin: 0; color: #666; line-height: 1.6;">
            This caller could not be matched to a homeowner in the database. Please:
          </p>
          <ul style="color: #666; line-height: 1.8; margin-top: 10px;">
            <li>Verify if this is a valid homeowner</li>
            <li>Check if the address was captured correctly</li>
            <li>Add homeowner to database if needed</li>
            <li>Create a claim manually if this is a warranty issue</li>
          </ul>
        </div>
        ` : ''}

        <!-- CTA Buttons - Pill Shaped -->
        <div style="margin-top: 30px; text-align: center;">
          <a href="${primaryCta.link}" style="display: inline-block; background-color: ${primaryCta.color}; color: #FFFFFF; text-decoration: none; padding: 10px 20px; border-radius: 25px; font-weight: 600; font-size: 14px; margin: 5px;">
            ${primaryCta.text}
          </a>
          ${scenario !== 'NO_MATCH' && homeownerLink && scenario !== 'CLAIM_CREATED' ? `
          <a href="${homeownerLink}" style="display: inline-block; background-color: #26A69A; color: #FFFFFF; text-decoration: none; padding: 10px 20px; border-radius: 25px; font-weight: 600; font-size: 14px; margin: 5px;">
            View Homeowner
          </a>
          ` : ''}
          <a href="${callsLink}" style="display: inline-block; background-color: #26A69A; color: #FFFFFF; text-decoration: none; padding: 10px 20px; border-radius: 25px; font-weight: 600; font-size: 14px; margin: 5px;">
            View All Calls
          </a>
        </div>

      </div>
    </div>
  `;

  // Build plain text version
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

${scenario === 'NO_MATCH' ? `
ACTION REQUIRED
This caller could not be matched to a homeowner. Please:
- Verify if this is a valid homeowner
- Check if the address was captured correctly
- Add homeowner to database if needed
- Create a claim manually if this is a warranty issue
` : ''}

LINKS
${primaryCta.text}: ${primaryCta.link}
${scenario !== 'NO_MATCH' && homeownerLink ? `View Homeowner: ${homeownerLink}` : ''}
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

  // Check if SendGrid is configured
  if (!isSendGridConfigured()) {
    console.log('⚠️ SendGrid not configured, skipping email');
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

