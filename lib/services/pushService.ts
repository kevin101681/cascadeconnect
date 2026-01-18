/**
 * PUSH NOTIFICATION SERVICE
 * Universal push notification system with user preference checking
 * Supports 7 notification types: Claims, Appointments, Chat, Tasks, Reschedules, Enrollments
 * January 18, 2026
 */

import webpush from 'web-push';
import { db } from '../../db';
import { users, pushSubscriptions } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Notification types enum
export type NotificationType =
  | 'CLAIM_SUBMIT'
  | 'APPT_ACCEPT_HOMEOWNER'
  | 'APPT_ACCEPT_SUB'
  | 'RESCHEDULE'
  | 'NEW_TASK'
  | 'CHAT'
  | 'NEW_ENROLLMENT';

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('⚠️ [Push Service] VAPID keys not configured. Push notifications will not work.');
} else {
  webpush.setVapidDetails(
    'mailto:support@cascadeconnect.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * SMART NOTIFICATION SENDER
 * Checks user preferences before sending push notifications
 * 
 * @param userId - Clerk ID of the user to notify
 * @param type - Type of notification (determines which preference to check)
 * @param title - Notification title
 * @param body - Notification body text
 * @param url - URL to open when notification is clicked
 * @param icon - Optional icon URL (defaults to logo)
 */
export async function sendSmartNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  url: string,
  icon?: string
): Promise<void> {
  try {
    console.log(`📬 [Push Service] Attempting to send ${type} notification to user ${userId}`);

    // 1. Fetch user and their preferences
    const userResult = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        name: users.name,
        email: users.email,
        notifyClaimSubmit: users.notifyClaimSubmit,
        notifyApptAcceptHomeowner: users.notifyApptAcceptHomeowner,
        notifyApptAcceptSub: users.notifyApptAcceptSub,
        notifyReschedule: users.notifyReschedule,
        notifyNewTask: users.notifyNewTask,
        notifyNewMessage: users.notifyNewMessage,
        notifyNewEnrollment: users.notifyNewEnrollment,
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (userResult.length === 0) {
      console.warn(`⚠️ [Push Service] User ${userId} not found. Skipping notification.`);
      return;
    }

    const user = userResult[0];

    // 2. Check if user has enabled this notification type
    let isAllowed = false;

    switch (type) {
      case 'CLAIM_SUBMIT':
        isAllowed = user.notifyClaimSubmit ?? true;
        break;
      case 'APPT_ACCEPT_HOMEOWNER':
        isAllowed = user.notifyApptAcceptHomeowner ?? true;
        break;
      case 'APPT_ACCEPT_SUB':
        isAllowed = user.notifyApptAcceptSub ?? true;
        break;
      case 'RESCHEDULE':
        isAllowed = user.notifyReschedule ?? true;
        break;
      case 'NEW_TASK':
        isAllowed = user.notifyNewTask ?? true;
        break;
      case 'CHAT':
        isAllowed = user.notifyNewMessage ?? true;
        break;
      case 'NEW_ENROLLMENT':
        isAllowed = user.notifyNewEnrollment ?? true;
        break;
      default:
        console.warn(`⚠️ [Push Service] Unknown notification type: ${type}`);
        return;
    }

    // 3. If user has disabled this notification type, skip
    if (!isAllowed) {
      console.log(
        `🔕 [Push Service] User ${user.name} has disabled ${type} notifications. Skipping.`
      );
      return;
    }

    console.log(`✅ [Push Service] User ${user.name} has enabled ${type} notifications.`);

    // 4. Fetch all push subscriptions for this user
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (subscriptions.length === 0) {
      console.log(`ℹ️ [Push Service] User ${user.name} has no push subscriptions. Skipping.`);
      return;
    }

    console.log(
      `📡 [Push Service] Found ${subscriptions.length} subscription(s) for user ${user.name}`
    );

    // 5. Build notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/logo.svg',
      badge: '/logo.svg',
      url,
    });

    // 6. Send to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dhKey,
            auth: subscription.authKey,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
        console.log(`✅ [Push Service] Sent to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
      } catch (error: any) {
        console.error(`❌ [Push Service] Failed to send to endpoint:`, error);

        // Handle 410 Gone (subscription expired/unsubscribed)
        if (error.statusCode === 410) {
          console.log(`🗑️ [Push Service] Removing expired subscription: ${subscription.id}`);
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, subscription.id));
        }
      }
    });

    await Promise.all(sendPromises);
    console.log(`✅ [Push Service] Completed sending ${type} notification to user ${user.name}`);
  } catch (error) {
    console.error(`❌ [Push Service] Error in sendSmartNotification:`, error);
    throw error;
  }
}

/**
 * BULK NOTIFICATION SENDER
 * Send notifications to multiple users at once
 * 
 * @param userIds - Array of Clerk IDs
 * @param type - Notification type
 * @param title - Notification title
 * @param body - Notification body
 * @param url - URL to open
 * @param icon - Optional icon URL
 */
export async function sendBulkNotifications(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  url: string,
  icon?: string
): Promise<void> {
  console.log(`📬 [Push Service] Sending bulk ${type} notifications to ${userIds.length} users`);

  const sendPromises = userIds.map((userId) =>
    sendSmartNotification(userId, type, title, body, url, icon)
  );

  await Promise.allSettled(sendPromises);
  console.log(`✅ [Push Service] Completed bulk notification send`);
}
