/**
 * Push Notification Service
 * Handles browser push notifications using the Web Notifications API
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

class PushNotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    // Check if notifications are supported
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request permission for push notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.permission = permission;
        return permission;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return 'denied';
      }
    }

    return Notification.permission;
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Check if permission is granted
   */
  hasPermission(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }

  /**
   * Send a push notification
   */
  async sendNotification(options: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications are not supported in this browser');
      return;
    }

    if (!this.hasPermission()) {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notificationOptions: NotificationOptions = {
        icon: options.icon || '/logo.svg',
        badge: options.badge || '/logo.svg',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        data: options.data,
        ...options
      };

      const notification = new Notification(options.title, notificationOptions);

      // Auto-close after 5 seconds if not requiring interaction
      if (!notificationOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (notificationOptions.data?.url) {
          window.location.href = notificationOptions.data.url;
        }
      };
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send a notification for a new claim submission
   */
  async notifyNewClaim(claimTitle: string, homeownerName: string, claimId: string): Promise<void> {
    await this.sendNotification({
      title: 'New Claim Submitted',
      body: `${homeownerName} submitted: ${claimTitle}`,
      tag: `claim-${claimId}`,
      requireInteraction: true,
      data: {
        type: 'claim',
        claimId,
        url: '/'
      }
    });
  }

  /**
   * Send a notification when homeowner accepts an appointment
   */
  async notifyAppointmentAccepted(claimTitle: string, homeownerName: string, claimId: string, date: string): Promise<void> {
    await this.sendNotification({
      title: 'Appointment Accepted',
      body: `${homeownerName} accepted appointment for: ${claimTitle}`,
      tag: `appointment-accepted-${claimId}`,
      requireInteraction: true,
      data: {
        type: 'appointment',
        claimId,
        url: '/'
      }
    });
  }

  /**
   * Send a notification when sub accepts an appointment
   */
  async notifySubAcceptedAppointment(claimTitle: string, subName: string, claimId: string): Promise<void> {
    await this.sendNotification({
      title: 'Sub Accepted Appointment',
      body: `${subName} accepted appointment for: ${claimTitle}`,
      tag: `sub-accepted-${claimId}`,
      requireInteraction: true,
      data: {
        type: 'appointment',
        claimId,
        url: '/'
      }
    });
  }

  /**
   * Send a notification when homeowner requests reschedule
   */
  async notifyRescheduleRequested(claimTitle: string, homeownerName: string, claimId: string): Promise<void> {
    await this.sendNotification({
      title: 'Reschedule Requested',
      body: `${homeownerName} requested reschedule for: ${claimTitle}`,
      tag: `reschedule-${claimId}`,
      requireInteraction: true,
      data: {
        type: 'claim',
        claimId,
        url: '/'
      }
    });
  }

  /**
   * Send a notification for new task assignment
   */
  async notifyTaskAssigned(taskTitle: string, taskId: string): Promise<void> {
    await this.sendNotification({
      title: 'New Task Assigned',
      body: `You have been assigned: ${taskTitle}`,
      tag: `task-${taskId}`,
      requireInteraction: true,
      data: {
        type: 'task',
        taskId,
        url: '/'
      }
    });
  }

  /**
   * Send a notification when homeowner sends a message
   */
  async notifyHomeownerMessage(senderName: string, content: string, threadId: string): Promise<void> {
    await this.sendNotification({
      title: `New Message from ${senderName}`,
      body: content.length > 100 ? content.substring(0, 100) + '...' : content,
      tag: `message-${threadId}`,
      requireInteraction: true,
      data: {
        type: 'message',
        threadId,
        url: '/'
      }
    });
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

