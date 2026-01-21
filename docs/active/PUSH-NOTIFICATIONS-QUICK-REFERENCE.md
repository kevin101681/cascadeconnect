# 🔔 PUSH NOTIFICATIONS - QUICK REFERENCE

## 🚀 ONE-LINE INTEGRATION

Add push notifications to any feature in 3 steps:

### Step 1: Import
```typescript
import { sendSmartNotification } from '@/lib/services/pushService';
```

### Step 2: Call
```typescript
await sendSmartNotification(
  userId,        // Clerk ID
  'CHAT',        // Notification type
  'New Message', // Title
  'Hello!',      // Body
  '/chat'        // URL
);
```

### Step 3: Done! ✅
The system automatically:
- ✅ Checks user preferences
- ✅ Fetches subscriptions
- ✅ Sends notifications
- ✅ Handles errors
- ✅ Cleans up expired subscriptions

---

## 📋 7 NOTIFICATION TYPES

| Type | Use For | Column |
|------|---------|--------|
| `CLAIM_SUBMIT` | New claims | `notify_claim_submit` |
| `APPT_ACCEPT_HOMEOWNER` | Homeowner accepts | `notify_appt_accept_homeowner` |
| `APPT_ACCEPT_SUB` | Subcontractor accepts | `notify_appt_accept_sub` |
| `RESCHEDULE` | Reschedule requests | `notify_reschedule` |
| `NEW_TASK` | Task assigned | `notify_new_task` |
| `CHAT` | Chat messages | `notify_new_message` |
| `NEW_ENROLLMENT` | New enrollment | `notify_new_enrollment` |

---

## 🎯 COMMON PATTERNS

### Pattern 1: Notify on Create
```typescript
// After creating record...
const [newClaim] = await db.insert(claims).values(...).returning();

await sendSmartNotification(
  adminId,
  'CLAIM_SUBMIT',
  'New Claim',
  `${homeownerName} submitted a claim`,
  `/claims/${newClaim.id}`
);
```

### Pattern 2: Notify on Update
```typescript
// After updating status...
await db.update(appointments).set({ status: 'accepted' }).where(...);

await sendSmartNotification(
  adminId,
  'APPT_ACCEPT_HOMEOWNER',
  'Appointment Accepted',
  `${homeownerName} accepted`,
  `/appointments/${apptId}`
);
```

### Pattern 3: Notify Multiple Users
```typescript
import { sendBulkNotifications } from '@/lib/services/pushService';

await sendBulkNotifications(
  [adminId1, adminId2, adminId3],
  'NEW_ENROLLMENT',
  'New Enrollment',
  'John Doe enrolled',
  '/homeowners/123'
);
```

### Pattern 4: Fire and Forget (Non-Blocking)
```typescript
// Don't wait for push to complete
sendSmartNotification(userId, 'CHAT', 'New Message', 'Hi', '/chat')
  .catch(err => console.error('Push failed:', err));

// Continue with other logic...
```

---

## 🔧 SETUP (One-Time)

### 1. Generate VAPID Keys
```bash
npx web-push generate-vapid-keys
```

### 2. Add to `.env`
```env
VITE_VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
```

### 3. Run Migration
```bash
npm run create-push-notifications-tables
```

### 4. Subscribe Frontend
```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';

const { subscribeToPush } = usePushNotifications();
useEffect(() => {
  subscribeToPush(userId);
}, [userId]);
```

---

## ⚡ COPY-PASTE EXAMPLES

### Claims
```typescript
await sendSmartNotification(
  adminId,
  'CLAIM_SUBMIT',
  'New Claim',
  `${homeownerName} submitted "${claimTitle}"`,
  `/claims/${claimId}`
);
```

### Tasks
```typescript
await sendSmartNotification(
  assignedUserId,
  'NEW_TASK',
  'Task Assigned',
  taskTitle,
  `/tasks/${taskId}`
);
```

### Appointments
```typescript
await sendSmartNotification(
  adminId,
  'APPT_ACCEPT_HOMEOWNER',
  'Appointment Accepted',
  `${homeownerName} accepted appointment`,
  `/appointments/${apptId}`
);
```

### Reschedules
```typescript
await sendSmartNotification(
  adminId,
  'RESCHEDULE',
  'Reschedule Request',
  `${homeownerName} requested reschedule`,
  `/appointments/${apptId}`
);
```

### Enrollments
```typescript
await sendSmartNotification(
  adminId,
  'NEW_ENROLLMENT',
  'New Enrollment',
  `${homeownerName} completed enrollment`,
  `/homeowners/${homeownerId}`
);
```

---

## 🐛 DEBUGGING

### Check if user has notifications enabled
```sql
SELECT notify_new_message FROM users WHERE clerk_id = 'user_123';
```

### View user's subscriptions
```sql
SELECT * FROM push_subscriptions WHERE user_id = 'user_123';
```

### Test notification manually
```typescript
// In browser console
const reg = await navigator.serviceWorker.ready;
reg.showNotification('Test', { body: 'Testing!' });
```

---

## 📊 FILE LOCATIONS

- **Service Worker**: `public/sw.js`
- **Smart Sender**: `lib/services/pushService.ts`
- **Subscribe API**: `netlify/functions/push-subscribe.ts`
- **React Hook**: `hooks/usePushNotifications.ts`
- **Database Schema**: `db/schema.ts`
- **Migration**: `scripts/create-push-notifications-tables.ts`

---

## 🎉 EXAMPLES ALREADY IMPLEMENTED

✅ **Chat Notifications** - `netlify/functions/chat-send-message.ts` (lines 249-270)

---

## 🚦 WHAT'S NEXT?

1. **Add to Claims**: Wire up `submit-claim.ts`
2. **Add to Tasks**: Wire up `assign-task.ts`
3. **Add to Appointments**: Wire up `appointments.ts`
4. **Add to Enrollments**: Wire up enrollment completion

Use the template above - it's literally 3 lines of code! 🚀
