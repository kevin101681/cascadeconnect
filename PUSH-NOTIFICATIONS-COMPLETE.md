# 🔔 PUSH NOTIFICATIONS SYSTEM - COMPLETE SETUP & USAGE GUIDE

**Implementation Date:** January 18, 2026  
**Status:** ✅ Fully Implemented  
**Technology Stack:** Web Push API, Service Workers, web-push (Node.js)

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Setup Instructions](#setup-instructions)
5. [Usage Examples](#usage-examples)
6. [Notification Types](#notification-types)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 SYSTEM OVERVIEW

The Universal Push Notification System provides browser-based push notifications for 7 distinct event types:

| Type | Description | User Preference Column |
|------|-------------|----------------------|
| **CLAIM_SUBMIT** | New claim submitted | `notify_claim_submit` |
| **APPT_ACCEPT_HOMEOWNER** | Homeowner accepts appointment | `notify_appt_accept_homeowner` |
| **APPT_ACCEPT_SUB** | Subcontractor accepts appointment | `notify_appt_accept_sub` |
| **RESCHEDULE** | Reschedule request | `notify_reschedule` |
| **NEW_TASK** | New task assigned | `notify_new_task` |
| **CHAT** | New chat message | `notify_new_message` |
| **NEW_ENROLLMENT** | New homeowner enrollment | `notify_new_enrollment` |

### ✨ Key Features

- ✅ **Smart Preference Checking** - Respects user settings before sending
- ✅ **Service Worker Based** - Works even when tab is closed
- ✅ **Automatic Cleanup** - Removes expired subscriptions (410 errors)
- ✅ **Click Actions** - Opens relevant page when notification is clicked
- ✅ **Browser Notifications** - Native OS notifications
- ✅ **VAPID Authentication** - Secure push delivery

---

## 🚀 QUICK START

### 1. Generate VAPID Keys (One-Time Setup)

```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key: BN1x...abc123
Private Key: xyz789...def456
```

### 2. Add Keys to `.env`

```env
# Push Notifications (VAPID Keys)
VITE_VAPID_PUBLIC_KEY=BN1x...abc123
VAPID_PRIVATE_KEY=xyz789...def456
```

### 3. Run Database Migration

```bash
npm run create-push-notifications-tables
```

Or manually using Drizzle:
```bash
npm run db:push
```

### 4. Subscribe Users (Frontend)

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUser } from '@clerk/clerk-react';

function NotificationSettings() {
  const { user } = useUser();
  const { subscribeToPush, permission } = usePushNotifications();

  useEffect(() => {
    if (permission === 'granted' && user) {
      subscribeToPush(user.id);
    }
  }, [permission, user]);

  return <div>Notifications enabled!</div>;
}
```

### 5. Send Notifications (Backend)

```typescript
import { sendSmartNotification } from '@/lib/services/pushService';

// Example: Send a claim notification
await sendSmartNotification(
  adminUserId,           // Clerk ID
  'CLAIM_SUBMIT',        // Notification type
  'New Claim Submitted', // Title
  'John Doe submitted a warranty claim', // Body
  '/claims/abc-123',     // URL to open
  '/logo.svg'            // Optional icon
);
```

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                     PUSH NOTIFICATION FLOW                   │
└─────────────────────────────────────────────────────────────┘

1. SUBSCRIPTION PHASE (One-time per device)
   ┌──────────┐    Register SW    ┌──────────────┐
   │ Browser  │ ───────────────> │ Service Worker│
   │          │                   │   (sw.js)     │
   └──────────┘                   └──────────────┘
        │
        │ Request Permission
        ▼
   [User Grants]
        │
        │ Subscribe to Push Manager
        ▼
   ┌──────────────────┐
   │ Push Subscription│ ──── Send to Backend ───>
   │ (endpoint, keys) │
   └──────────────────┘
                                  ┌─────────────────────┐
                                  │ push-subscribe.ts   │
                                  │ (Netlify Function)  │
                                  └─────────────────────┘
                                           │
                                           ▼
                                  ┌─────────────────────┐
                                  │  Database (Neon)    │
                                  │ push_subscriptions  │
                                  └─────────────────────┘

2. NOTIFICATION PHASE (When event occurs)
   ┌─────────────────┐
   │   Event Occurs  │ (e.g., New Chat Message)
   │ (Backend Logic) │
   └─────────────────┘
           │
           ▼
   ┌───────────────────────────────────────┐
   │  sendSmartNotification()              │
   │  lib/services/pushService.ts          │
   └───────────────────────────────────────┘
           │
           ├─ 1. Fetch user preferences ───────────>
           │                                        ┌──────────┐
           │                                        │ Database │
           │  <─── Check notify_new_message ─────  │  users   │
           │                                        └──────────┘
           │
           ├─ 2. If disabled → STOP (Don't send)
           │
           ├─ 3. Fetch push subscriptions ─────────>
           │                                        ┌──────────┐
           │                                        │ Database │
           │  <──── Get all subscriptions ─────    │push_subs │
           │                                        └──────────┘
           │
           ▼
   ┌───────────────────┐
   │   web-push lib    │
   │ (Send via VAPID)  │
   └───────────────────┘
           │
           │ Push to Browser
           ▼
   ┌──────────────────┐
   │ Service Worker   │ ──> Show Notification
   │    (sw.js)       │
   └──────────────────┘
           │
           │ User Clicks
           ▼
   ┌──────────────────┐
   │  Open URL        │ (e.g., /dashboard/chat)
   │  Focus Window    │
   └──────────────────┘
```

---

## 📁 FILE STRUCTURE

```
cascade-connect/
├── public/
│   └── sw.js                              # Service Worker (handles notifications)
├── hooks/
│   └── usePushNotifications.ts            # React hook for subscription management
├── lib/
│   └── services/
│       └── pushService.ts                 # Smart notification sender (checks preferences)
├── netlify/
│   └── functions/
│       ├── push-subscribe.ts              # Save/remove subscriptions
│       └── chat-send-message.ts           # Example: Chat trigger (WIRED UP ✅)
├── db/
│   └── schema.ts                          # Database schema (updated ✅)
└── scripts/
    └── create-push-notifications-tables.ts # Migration script
```

---

## 🔧 SETUP INSTRUCTIONS

### Step 1: Install Dependencies

```bash
npm install web-push
```

### Step 2: Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

### Step 3: Configure Environment Variables

Add to `.env`:
```env
VITE_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
```

### Step 4: Run Database Migration

```bash
npm run create-push-notifications-tables
```

Or use Drizzle:
```bash
npm run db:push
```

This creates:
- `push_subscriptions` table
- 7 notification preference columns in `users` table

### Step 5: Update Notification Settings UI

Add toggles for the 7 notification types in your settings page:

```tsx
// Example: Notification Settings Component
function NotificationSettings() {
  const { user } = useUser();
  const [preferences, setPreferences] = useState({
    notify_claim_submit: true,
    notify_appt_accept_homeowner: true,
    notify_appt_accept_sub: true,
    notify_reschedule: true,
    notify_new_task: true,
    notify_new_message: true,
    notify_new_enrollment: true,
  });

  const handleToggle = async (key: string, value: boolean) => {
    // Update in database
    await fetch('/.netlify/functions/update-user-preferences', {
      method: 'POST',
      body: JSON.stringify({ userId: user.id, [key]: value }),
    });
    
    setPreferences({ ...preferences, [key]: value });
  };

  return (
    <div>
      <h2>Push Notifications</h2>
      {Object.entries(preferences).map(([key, value]) => (
        <Toggle
          key={key}
          label={key.replace(/_/g, ' ')}
          checked={value}
          onChange={(val) => handleToggle(key, val)}
        />
      ))}
    </div>
  );
}
```

---

## 💡 USAGE EXAMPLES

### Example 1: Chat Notifications (Already Implemented ✅)

Location: `netlify/functions/chat-send-message.ts`

```typescript
import { sendSmartNotification } from '../../lib/services/pushService';

// After saving message to database...
for (const recipientId of participants) {
  if (recipientId !== senderId) {
    await sendSmartNotification(
      recipientId,
      'CHAT',
      `New message from ${senderName}`,
      messageText.substring(0, 100),
      `/dashboard/chat?channel=${channelId}`
    );
  }
}
```

### Example 2: Claim Submit Notification

Location: `netlify/functions/submit-claim.ts`

```typescript
import { sendSmartNotification } from '../../lib/services/pushService';

// After claim is submitted...
await sendSmartNotification(
  adminUserId,
  'CLAIM_SUBMIT',
  'New Claim Submitted',
  `${homeownerName} submitted a claim: ${claimTitle}`,
  `/claims/${claimId}`
);
```

### Example 3: Task Assignment Notification

Location: `netlify/functions/assign-task.ts`

```typescript
import { sendSmartNotification } from '../../lib/services/pushService';

// After task is assigned...
await sendSmartNotification(
  assignedUserId,
  'NEW_TASK',
  'New Task Assigned',
  `You have been assigned: ${taskTitle}`,
  `/tasks/${taskId}`
);
```

### Example 4: Appointment Acceptance (Homeowner)

Location: `netlify/functions/appointments.ts`

```typescript
import { sendSmartNotification } from '../../lib/services/pushService';

// When homeowner accepts appointment...
await sendSmartNotification(
  adminUserId,
  'APPT_ACCEPT_HOMEOWNER',
  'Appointment Accepted',
  `${homeownerName} accepted the appointment for ${date}`,
  `/appointments/${appointmentId}`
);
```

### Example 5: Bulk Notifications

```typescript
import { sendBulkNotifications } from '../../lib/services/pushService';

// Send to multiple admins
const adminIds = ['user_123', 'user_456', 'user_789'];

await sendBulkNotifications(
  adminIds,
  'NEW_ENROLLMENT',
  'New Homeowner Enrolled',
  'John Doe completed enrollment',
  '/homeowners/abc-123'
);
```

---

## 🧪 TESTING GUIDE

### Local Testing

1. **Start Dev Server**
   ```bash
   npm run dev
   ```

2. **Enable Notifications in Browser**
   - Open DevTools → Application → Service Workers
   - Verify `sw.js` is registered
   - Click "Allow" when prompted for notifications

3. **Trigger a Notification**
   ```typescript
   // In browser console
   await fetch('/.netlify/functions/push-subscribe', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       userId: 'user_test123',
       subscription: await registration.pushManager.getSubscription()
     })
   });
   
   // Then trigger an event (e.g., send a chat message)
   ```

4. **Check Browser Console**
   - Look for `[Push Service]` logs
   - Verify preference checks
   - Confirm notification sent

### Production Testing

1. Deploy to Netlify
2. Test on HTTPS domain (required for push notifications)
3. Use different browsers (Chrome, Firefox, Edge)
4. Test on mobile devices

---

## 🛠️ TROUBLESHOOTING

### Issue: Notifications Not Showing

**Cause:** Browser permission denied or service worker not registered

**Solution:**
1. Check browser permissions: `chrome://settings/content/notifications`
2. Verify service worker: DevTools → Application → Service Workers
3. Re-register service worker:
   ```javascript
   navigator.serviceWorker.register('/sw.js', { scope: '/' });
   ```

### Issue: "VAPID keys not configured"

**Cause:** Environment variables not loaded

**Solution:**
1. Verify `.env` file has both keys
2. Restart dev server
3. Check `process.env.VITE_VAPID_PUBLIC_KEY` is defined

### Issue: User preferences not working

**Cause:** Database columns missing or null values

**Solution:**
1. Run migration: `npm run create-push-notifications-tables`
2. Update user preferences manually:
   ```sql
   UPDATE users SET notify_new_message = true WHERE clerk_id = 'user_123';
   ```

### Issue: 410 Gone errors

**Cause:** Browser unsubscribed or subscription expired

**Solution:**
- System automatically removes expired subscriptions
- User needs to re-subscribe from frontend

---

## 📊 MONITORING & ANALYTICS

### Check Subscription Count

```sql
SELECT user_id, COUNT(*) as device_count
FROM push_subscriptions
GROUP BY user_id;
```

### Check User Preferences

```sql
SELECT 
  name,
  notify_claim_submit,
  notify_new_message,
  notify_new_task
FROM users
WHERE clerk_id = 'user_123';
```

### View Recent Subscriptions

```sql
SELECT * FROM push_subscriptions
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚦 NEXT STEPS

### Integrate with Other Features

1. **Claims System**
   - Add to `netlify/functions/submit-claim.ts`
   - Notify admins when claims are submitted

2. **Appointments System**
   - Add to `netlify/functions/appointments.ts`
   - Notify when appointments are accepted/rescheduled

3. **Tasks System**
   - Add to `netlify/functions/tasks.ts`
   - Notify when tasks are assigned

4. **Enrollments System**
   - Add to enrollment completion flow
   - Notify admins of new homeowner enrollments

### Template for New Integrations

```typescript
// 1. Import the service
import { sendSmartNotification } from '@/lib/services/pushService';

// 2. After your event logic...
await sendSmartNotification(
  targetUserId,          // Who to notify
  'NOTIFICATION_TYPE',   // One of the 7 types
  'Notification Title',  // Short title
  'Notification body text', // Description
  '/relevant/url',       // Where to navigate
  '/icon.svg'            // Optional icon
);
```

---

## 📝 SUMMARY

✅ **Service Worker** - Created `public/sw.js`  
✅ **Database Schema** - Added `push_subscriptions` table + 7 preference columns  
✅ **Backend Service** - Created `lib/services/pushService.ts` (smart sender)  
✅ **Netlify Function** - Created `netlify/functions/push-subscribe.ts`  
✅ **React Hook** - Created `hooks/usePushNotifications.ts`  
✅ **Chat Integration** - Wired up in `netlify/functions/chat-send-message.ts`  
✅ **Migration Script** - Created `scripts/create-push-notifications-tables.ts`

**The system is ready to use for all 7 notification types!** 🎉

---

**Questions? Issues?**
- Check the troubleshooting section above
- Review the service worker logs in DevTools
- Verify VAPID keys are configured correctly
