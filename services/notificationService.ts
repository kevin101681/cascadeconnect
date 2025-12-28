import { sendEmail } from './emailService';
import { UserRole } from '../types';

/**
 * CENTRALIZED NOTIFICATION SERVICE
 * 
 * Handles all email notifications with:
 * - Automatic preference checking
 * - Try/catch error handling
 * - Template-based email generation
 * - Comprehensive logging
 */

interface Claim {
  id: string;
  claimNumber?: string;
  title: string;
  description: string;
  homeownerName: string;
  homeownerEmail: string;
  address: string;
  contractorName?: string;
  contractorEmail?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  assignedToId: string;
  assignedById: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role?: string;
  // Existing notification preferences
  emailNotifyClaimSubmitted?: boolean;
  emailNotifyHomeownerAcceptsAppointment?: boolean;
  emailNotifySubAcceptsAppointment?: boolean;
  emailNotifyHomeownerRescheduleRequest?: boolean;
  emailNotifyTaskAssigned?: boolean;
  emailNotifyHomeownerEnrollment?: boolean;
  // New simplified preferences
  notifyClaims?: boolean;
  notifyTasks?: boolean;
  notifyAppointments?: boolean;
}

interface MessageThread {
  id: string;
  subject: string;
  homeownerId?: string;
  participants?: string[];
}

interface Message {
  id: string;
  content: string;
  senderName: string;
  timestamp: Date;
}

class NotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`
      : 'https://www.cascadeconnect.app';
  }

  /**
   * Safe email sending with try/catch wrapper
   */
  private async sendEmailSafely(
    to: string,
    subject: string,
    body: string,
    fromName: string = 'Cascade Connect System',
    fromRole: UserRole = UserRole.ADMIN,
    context: string = 'notification'
  ): Promise<boolean> {
    try {
      console.log(`📧 [NOTIFICATION] Sending ${context} to ${to}`);
      await sendEmail({
        to,
        subject,
        body,
        fromName,
        fromRole,
      });
      console.log(`✅ [NOTIFICATION] ${context} sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      console.error(`❌ [NOTIFICATION] Failed to send ${context} to ${to}:`, error?.message || error);
      return false;
    }
  }

  /**
   * Check if user wants to receive a specific type of notification
   */
  private checkPreference(employee: Employee, preferenceType: 'claim' | 'task' | 'appointment'): boolean {
    // Check new simplified preferences first
    if (preferenceType === 'claim' && employee.notifyClaims !== undefined) {
      return employee.notifyClaims === true;
    }
    if (preferenceType === 'task' && employee.notifyTasks !== undefined) {
      return employee.notifyTasks === true;
    }
    if (preferenceType === 'appointment' && employee.notifyAppointments !== undefined) {
      return employee.notifyAppointments === true;
    }

    // Fallback to specific preferences
    if (preferenceType === 'claim') {
      return employee.emailNotifyClaimSubmitted !== false;
    }
    if (preferenceType === 'task') {
      return employee.emailNotifyTaskAssigned !== false;
    }
    if (preferenceType === 'appointment') {
      return (
        employee.emailNotifyHomeownerAcceptsAppointment !== false ||
        employee.emailNotifySubAcceptsAppointment !== false ||
        employee.emailNotifyHomeownerRescheduleRequest !== false
      );
    }

    return true; // Default to enabled
  }

  /**
   * Filter out mock/test emails
   */
  private isMockEmail(email: string): boolean {
    const mockEmails = ['admin@cascade.com', 'admin@example.com', 'test@example.com', 'mock@example.com'];
    return mockEmails.some(mock => email.toLowerCase() === mock.toLowerCase());
  }

  // ============================================
  // CLAIM NOTIFICATIONS
  // ============================================

  /**
   * Notify admins when a new claim is submitted
   * Checks emailNotifyClaimSubmitted preference
   */
  async notifyClaimSubmitted(claim: Claim, employees: Employee[]): Promise<void> {
    console.log(`📧 [NOTIFICATION] Processing claim submission notification for claim ${claim.claimNumber || claim.id}`);
    
    const claimLink = `${this.baseUrl}#claims?claimId=${claim.id}`;
    
    const emailBody = `
A new warranty claim has been submitted:

<div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Claim #${claim.claimNumber || 'N/A'}</strong><br/>
  <strong>Title:</strong> ${claim.title}<br/>
  <strong>Homeowner:</strong> ${claim.homeownerName}<br/>
  <strong>Address:</strong> ${claim.address}<br/>
  ${claim.description ? `<strong>Description:</strong> ${claim.description.substring(0, 200)}${claim.description.length > 200 ? '...' : ''}` : ''}
</div>

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">View Claim</a>
</div>
    `.trim();

    let sentCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      if (this.isMockEmail(emp.email)) {
        console.log(`⏭️ [NOTIFICATION] Skipping mock email: ${emp.email}`);
        skippedCount++;
        continue;
      }

      if (this.checkPreference(emp, 'claim')) {
        const sent = await this.sendEmailSafely(
          emp.email,
          `New Claim Submitted: ${claim.claimNumber || 'N/A'} - ${claim.title}`,
          emailBody,
          'Cascade Connect System',
          UserRole.ADMIN,
          'claim submission notification'
        );
        if (sent) sentCount++;
      } else {
        console.log(`⏭️ [NOTIFICATION] Skipping ${emp.email} (claim notifications disabled)`);
        skippedCount++;
      }
    }

    console.log(`📧 [NOTIFICATION] Claim submission summary: ${sentCount} sent, ${skippedCount} skipped`);
  }

  // ============================================
  // APPOINTMENT NOTIFICATIONS
  // ============================================

  /**
   * Notify homeowner and sub when admin schedules an appointment
   */
  async notifyAppointmentScheduled(
    claim: Claim,
    appointmentDate: string,
    timeSlot: string
  ): Promise<void> {
    console.log(`📧 [NOTIFICATION] Processing appointment scheduled notification for claim ${claim.claimNumber}`);
    
    const claimLink = `${this.baseUrl}#claims?claimId=${claim.id}`;
    
    // Notify homeowner
    const homeownerBody = `
Your appointment has been scheduled:

<div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Claim #${claim.claimNumber || 'N/A'}</strong><br/>
  <strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}<br/>
  <strong>Time:</strong> ${timeSlot}<br/>
  <strong>Address:</strong> ${claim.address}
</div>

${claim.contractorName ? `<p><strong>Assigned Contractor:</strong> ${claim.contractorName}</p>` : ''}

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">View Details</a>
</div>
    `.trim();

    await this.sendEmailSafely(
      claim.homeownerEmail,
      `Appointment Scheduled: ${claim.claimNumber || 'N/A'} - ${claim.title}`,
      homeownerBody,
      'Cascade Connect',
      UserRole.ADMIN,
      'appointment scheduled (homeowner)'
    );

    // Notify sub if assigned
    if (claim.contractorEmail) {
      const subBody = `
An appointment has been scheduled for your assigned claim:

<div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Claim #${claim.claimNumber || 'N/A'}</strong><br/>
  <strong>Title:</strong> ${claim.title}<br/>
  <strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}<br/>
  <strong>Time:</strong> ${timeSlot}<br/>
  <strong>Address:</strong> ${claim.address}<br/>
  <strong>Homeowner:</strong> ${claim.homeownerName}
</div>

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">View Details</a>
</div>
      `.trim();

      await this.sendEmailSafely(
        claim.contractorEmail,
        `Appointment Scheduled: ${claim.claimNumber || 'N/A'} - ${claim.title}`,
        subBody,
        'Cascade Connect',
        UserRole.ADMIN,
        'appointment scheduled (contractor)'
      );
    }
  }

  /**
   * Notify admins and sub when homeowner accepts an appointment
   * Checks emailNotifyHomeownerAcceptsAppointment preference
   */
  async notifyHomeownerAcceptsAppointment(
    claim: Claim,
    appointmentDate: string,
    employees: Employee[]
  ): Promise<void> {
    console.log(`📧 [NOTIFICATION] Processing homeowner appointment acceptance for claim ${claim.claimNumber}`);
    
    const claimLink = `${this.baseUrl}#claims?claimId=${claim.id}`;
    
    const emailBody = `
${claim.homeownerName} has accepted the appointment date:

<div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Claim #${claim.claimNumber || 'N/A'}</strong><br/>
  <strong>Title:</strong> ${claim.title}<br/>
  <strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}<br/>
  <strong>Address:</strong> ${claim.address}
</div>

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">View Claim</a>
</div>
    `.trim();

    // Notify admins with preference check
    let sentCount = 0;
    for (const emp of employees) {
      if (this.isMockEmail(emp.email)) continue;
      
      if (this.checkPreference(emp, 'appointment')) {
        const sent = await this.sendEmailSafely(
          emp.email,
          `Appointment Accepted: ${claim.claimNumber || 'N/A'} - ${claim.title}`,
          emailBody,
          'Cascade Connect System',
          UserRole.ADMIN,
          'homeowner appointment acceptance (admin)'
        );
        if (sent) sentCount++;
      }
    }

    // Notify sub (no preference check - always notify)
    if (claim.contractorEmail) {
      await this.sendEmailSafely(
        claim.contractorEmail,
        `Homeowner Accepted Appointment: ${claim.claimNumber || 'N/A'} - ${claim.title}`,
        emailBody,
        'Cascade Connect',
        UserRole.ADMIN,
        'homeowner appointment acceptance (contractor)'
      );
    }

    console.log(`📧 [NOTIFICATION] Homeowner acceptance notification sent to ${sentCount} admins${claim.contractorEmail ? ' and contractor' : ''}`);
  }

  /**
   * Notify admins and homeowner when sub accepts an appointment
   * Checks emailNotifySubAcceptsAppointment preference
   */
  async notifySubAcceptsAppointment(
    claim: Claim,
    appointmentDate: string,
    employees: Employee[]
  ): Promise<void> {
    console.log(`📧 [NOTIFICATION] Processing sub appointment acceptance for claim ${claim.claimNumber}`);
    
    const claimLink = `${this.baseUrl}#claims?claimId=${claim.id}`;
    
    const emailBody = `
${claim.contractorName || 'The assigned contractor'} has accepted the appointment date:

<div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Claim #${claim.claimNumber || 'N/A'}</strong><br/>
  <strong>Title:</strong> ${claim.title}<br/>
  <strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}<br/>
  <strong>Address:</strong> ${claim.address}
</div>

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">View Claim</a>
</div>
    `.trim();

    // Notify admins with preference check
    let sentCount = 0;
    for (const emp of employees) {
      if (this.isMockEmail(emp.email)) continue;
      
      if (this.checkPreference(emp, 'appointment')) {
        const sent = await this.sendEmailSafely(
          emp.email,
          `Sub Accepted Appointment: ${claim.claimNumber || 'N/A'} - ${claim.title}`,
          emailBody,
          'Cascade Connect System',
          UserRole.ADMIN,
          'sub appointment acceptance (admin)'
        );
        if (sent) sentCount++;
      }
    }

    // Notify homeowner (no preference check - always notify)
    await this.sendEmailSafely(
      claim.homeownerEmail,
      `Contractor Confirmed Appointment: ${claim.claimNumber || 'N/A'} - ${claim.title}`,
      emailBody,
      'Cascade Connect',
      UserRole.ADMIN,
      'sub appointment acceptance (homeowner)'
    );

    console.log(`📧 [NOTIFICATION] Sub acceptance notification sent to ${sentCount} admins and homeowner`);
  }

  /**
   * Notify admins when homeowner requests to reschedule
   * Checks emailNotifyHomeownerRescheduleRequest preference
   */
  async notifyRescheduleRequest(claim: Claim, reason: string, employees: Employee[]): Promise<void> {
    console.log(`📧 [NOTIFICATION] Processing reschedule request for claim ${claim.claimNumber}`);
    
    const claimLink = `${this.baseUrl}#claims?claimId=${claim.id}`;
    
    const emailBody = `
${claim.homeownerName} has requested to reschedule the appointment:

<div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Claim #${claim.claimNumber || 'N/A'}</strong><br/>
  <strong>Title:</strong> ${claim.title}<br/>
  <strong>Address:</strong> ${claim.address}<br/>
  ${reason ? `<strong>Reason:</strong> ${reason}` : ''}
</div>

<div style="margin: 20px 0;">
  <a href="${claimLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">View Claim & Reschedule</a>
</div>
    `.trim();

    let sentCount = 0;
    for (const emp of employees) {
      if (this.isMockEmail(emp.email)) continue;
      
      if (this.checkPreference(emp, 'appointment')) {
        const sent = await this.sendEmailSafely(
          emp.email,
          `Reschedule Requested: ${claim.claimNumber || 'N/A'} - ${claim.title}`,
          emailBody,
          'Cascade Connect System',
          UserRole.ADMIN,
          'reschedule request'
        );
        if (sent) sentCount++;
      }
    }

    console.log(`📧 [NOTIFICATION] Reschedule request sent to ${sentCount} admins`);
  }

  // ============================================
  // TASK NOTIFICATIONS
  // ============================================

  /**
   * Notify user when a task is assigned to them
   * Checks emailNotifyTaskAssigned preference
   */
  async notifyTaskAssigned(
    task: Task,
    assignedEmployee: Employee,
    assignerName: string
  ): Promise<void> {
    if (!this.checkPreference(assignedEmployee, 'task')) {
      console.log(`⏭️ [NOTIFICATION] Task notification skipped for ${assignedEmployee.email} (disabled by preference)`);
      return;
    }

    console.log(`📧 [NOTIFICATION] Processing task assignment for ${assignedEmployee.email}`);
    
    const taskLink = `${this.baseUrl}#tasks`;
    
    const emailBody = `
A new task has been assigned to you:

<div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Task:</strong> ${task.title}<br/>
  ${task.description ? `<strong>Description:</strong> ${task.description}<br/>` : ''}
  ${task.dueDate ? `<strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}<br/>` : ''}
  <strong>Assigned By:</strong> ${assignerName}
</div>

<div style="margin: 20px 0;">
  <a href="${taskLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">View Tasks</a>
</div>
    `.trim();

    await this.sendEmailSafely(
      assignedEmployee.email,
      `New Task Assigned: ${task.title}`,
      emailBody,
      'Cascade Connect System',
      UserRole.ADMIN,
      'task assignment'
    );
  }

  // ============================================
  // MESSAGE NOTIFICATIONS (Always-On)
  // ============================================

  /**
   * Notify thread participants when homeowner replies
   * ALWAYS SENDS - No preference check per requirements
   */
  async notifyHomeownerReply(
    thread: MessageThread,
    message: Message,
    participants: Employee[]
  ): Promise<void> {
    console.log(`📧 [NOTIFICATION] Processing homeowner reply notification for thread ${thread.id}`);
    
    const messageLink = `${this.baseUrl}#messages?threadId=${thread.id}`;
    
    const emailBody = `
${message.senderName} replied to the message thread:

<div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Thread:</strong> ${thread.subject}<br/>
  <strong>From:</strong> ${message.senderName}<br/>
  <strong>Message:</strong>
  <p style="margin-top: 10px; white-space: pre-wrap;">${message.content.substring(0, 300)}${message.content.length > 300 ? '...' : ''}</p>
</div>

<div style="margin: 20px 0;">
  <a href="${messageLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">View & Reply</a>
</div>

---
<p style="font-size: 12px; color: #666;">To reply, simply reply to this email or click the button above.</p>
    `.trim();

    let sentCount = 0;
    for (const emp of participants) {
      if (this.isMockEmail(emp.email)) continue;
      
      // ALWAYS SEND - No preference check
      const sent = await this.sendEmailSafely(
        emp.email,
        `Re: ${thread.subject}`,
        emailBody,
        message.senderName,
        UserRole.HOMEOWNER,
        'homeowner message reply'
      );
      if (sent) sentCount++;
    }

    console.log(`📧 [NOTIFICATION] Homeowner reply sent to ${sentCount} participants`);
  }

  /**
   * Notify homeowner when admin sends a new message
   * ALWAYS SENDS - No preference check
   */
  async notifyAdminMessage(
    thread: MessageThread,
    message: Message,
    homeownerEmail: string,
    homeownerName: string
  ): Promise<void> {
    console.log(`📧 [NOTIFICATION] Processing admin message notification for ${homeownerEmail}`);
    
    const messageLink = `${this.baseUrl}#messages?threadId=${thread.id}`;
    
    const emailBody = `
You have a new message from ${message.senderName}:

<div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <strong>Subject:</strong> ${thread.subject}<br/>
  <strong>From:</strong> ${message.senderName}<br/>
  <strong>Message:</strong>
  <p style="margin-top: 10px; white-space: pre-wrap;">${message.content}</p>
</div>

<div style="margin: 20px 0;">
  <a href="${messageLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">View & Reply</a>
</div>

---
<p style="font-size: 12px; color: #666;">To reply, simply reply to this email or click the button above.</p>
    `.trim();

    await this.sendEmailSafely(
      homeownerEmail,
      thread.subject,
      emailBody,
      message.senderName,
      UserRole.ADMIN,
      'admin message to homeowner'
    );
  }

  // ============================================
  // OTHER NOTIFICATIONS
  // ============================================

  /**
   * Send homeowner invitation email
   */
  async sendHomeownerInvitation(
    email: string,
    name: string,
    invitedBy: string,
    loginLink: string
  ): Promise<void> {
    console.log(`📧 [NOTIFICATION] Sending homeowner invitation to ${email}`);
    
    const emailBody = `
Hello ${name},

You've been invited to join Cascade Connect by ${invitedBy}.

Cascade Connect is your warranty management portal where you can:
- Submit warranty claims
- Track claim status
- Communicate with your warranty team
- View important documents

<div style="margin: 30px 0;">
  <a href="${loginLink}" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">Get Started</a>
</div>

If you have any questions, please don't hesitate to reach out.

Best regards,<br/>
The Cascade Connect Team
    `.trim();

    await this.sendEmailSafely(
      email,
      `You've been invited to Cascade Connect`,
      emailBody,
      'Cascade Connect',
      UserRole.ADMIN,
      'homeowner invitation'
    );
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

