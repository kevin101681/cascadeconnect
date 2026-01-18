# 🧪 PUSH NOTIFICATIONS - TESTING GUIDE

**Quick start guide to test your push notification system**

---

## ✅ PRE-FLIGHT CHECKLIST

Before testing, verify:

- [ ] VAPID keys generated and added to `.env`
- [ ] Database migration run (`npm run create-push-notifications-tables`)
- [ ] `web-push` package installed (`npm install web-push`)
- [ ] Service worker file exists at `public/sw.js`
- [ ] Application running on HTTPS (production) or localhost (dev)

---

## 🚀 STEP-BY-STEP TESTING

### Step 1: Start Development Server

```bash
npm run dev
```

Navigate to `http://localhost:5173` (or your dev URL)

---

### Step 2: Check Service Worker Registration

1. Open **DevTools** (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Verify `sw.js` is listed and **activated**

✅ **Expected:** Green dot next to service worker

❌ **If not working:**
- Check console for errors
- Verify `public/sw.js` exists
- Clear site data and reload

---

### Step 3: Subscribe to Notifications

#### Option A: Use the Hook (Recommended)

Add this to any component:

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';

function TestNotifications() {
  const { user } = useUser();
  const { subscribeToPush, permission, isSubscribed } = usePushNotifications();

  useEffect(() => {
    if (user && permission !== 'granted') {
      subscribeToPush(user.id);
    }
  }, [user, permission]);

  return (
    <div>
      <p>Permission: {permission}</p>
      <p>Subscribed: {isSubscribed ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

#### Option B: Manual Subscription (Console)

Open browser console and run:

```javascript
// 1. Request permission
const permission = await Notification.requestPermission();
console.log('Permission:', permission);

// 2. Register service worker
const reg = await navigator.serviceWorker.register('/sw.js');
await navigator.serviceWorker.ready;
console.log('Service Worker ready');

// 3. Subscribe to push
const vapidKey = 'YOUR_VITE_VAPID_PUBLIC_KEY'; // From .env
const subscription = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidKey)
});

// 4. Send to backend
await fetch('/.netlify/functions/push-subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_test123', // Your Clerk ID
    subscription: subscription.toJSON()
  })
});

console.log('✅ Subscribed!');

// Helper function
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

---

### Step 4: Verify Subscription in Database

Check if subscription was saved:

```sql
SELECT * FROM push_subscriptions WHERE user_id = 'user_test123';
```

✅ **Expected:** 1 row with endpoint, p256dh_key, auth_key

---

### Step 5: Test Notification Sending

#### Option A: Trigger via Chat (Already Wired)

1. Go to chat interface
2. Send a message to another user
3. Check recipient's browser for notification

#### Option B: Test Notification Manually (Console)

Create a test Netlify function:

**File:** `netlify/functions/test-push-notification.ts`

```typescript
import { Handler } from '@netlify/functions';
import { sendSmartNotification } from '../../lib/services/pushService';

export const handler: Handler = async (event) => {
  const { userId } = JSON.parse(event.body || '{}');

  try {
    await sendSmartNotification(
      userId,
      'CHAT',
      'Test Notification',
      'This is a test push notification!',
      '/dashboard'
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

Then call it:

```javascript
await fetch('/.netlify/functions/test-push-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user_test123' })
});
```

#### Option C: Test with web-push CLI

Install globally:
```bash
npm install -g web-push
```

Generate test notification:
```bash
web-push send-notification \
  --endpoint="YOUR_SUBSCRIPTION_ENDPOINT" \
  --key="YOUR_P256DH_KEY" \
  --auth="YOUR_AUTH_KEY" \
  --vapid-subject="mailto:test@example.com" \
  --vapid-pubkey="YOUR_PUBLIC_KEY" \
  --vapid-pvtkey="YOUR_PRIVATE_KEY" \
  --payload='{"title":"Test","body":"Hello!"}'
```

---

### Step 6: Verify Notification Appears

✅ **Expected:**
- Browser notification appears (top-right or notification center)
- Notification shows title, body, and icon
- Clicking notification opens the correct URL

❌ **If not working:**
- Check browser console for errors
- Verify service worker is active
- Check browser notification permissions
- Look for `[SW]` logs in service worker console

---

## 🧪 TEST CASES

### Test Case 1: User Preference Check

**Setup:**
```sql
UPDATE users 
SET notify_new_message = false 
WHERE clerk_id = 'user_test123';
```

**Action:** Send a chat notification to this user

**Expected:** No notification sent (check logs for "User has disabled")

**Cleanup:**
```sql
UPDATE users 
SET notify_new_message = true 
WHERE clerk_id = 'user_test123';
```

---

### Test Case 2: Multiple Subscriptions

**Setup:** Subscribe from 2 different browsers/devices

**Action:** Send notification

**Expected:** Both devices receive notification

**Verify:**
```sql
SELECT COUNT(*) FROM push_subscriptions WHERE user_id = 'user_test123';
-- Should return 2
```

---

### Test Case 3: Expired Subscription (410 Error)

**Setup:** Unsubscribe in browser but don't tell backend

**Action:** 
1. Unsubscribe: `await subscription.unsubscribe();`
2. Send notification to that user

**Expected:** 
- 410 error logged
- Subscription automatically removed from database

**Verify:**
```sql
SELECT * FROM push_subscriptions WHERE endpoint = 'expired_endpoint';
-- Should return 0 rows
```

---

### Test Case 4: All 7 Notification Types

Test each type:

```typescript
const types = [
  'CLAIM_SUBMIT',
  'APPT_ACCEPT_HOMEOWNER',
  'APPT_ACCEPT_SUB',
  'RESCHEDULE',
  'NEW_TASK',
  'CHAT',
  'NEW_ENROLLMENT'
];

for (const type of types) {
  await sendSmartNotification(
    userId,
    type,
    `Test ${type}`,
    'Testing notification type',
    '/dashboard'
  );
  await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds between
}
```

---

## 📊 MONITORING & DEBUGGING

### Check Service Worker Logs

1. Open DevTools
2. Go to **Console**
3. Filter by `[SW]`
4. Look for:
   - `Push event received`
   - `Showing notification`
   - `Notification clicked`

### Check Backend Logs

Look for:
- `📬 [Push Service] Attempting to send`
- `✅ [Push Service] User has enabled`
- `📡 [Push Service] Found N subscription(s)`
- `✅ [Push Service] Sent to endpoint`
- `🔕 [Push Service] User has disabled` (if preference is off)

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `VAPID keys not configured` | Missing env vars | Add keys to `.env` |
| `User not found` | Invalid userId | Verify Clerk ID |
| `No subscriptions` | User not subscribed | Call `subscribeToPush()` |
| `410 Gone` | Subscription expired | Auto-removed by system |
| `Permission denied` | User blocked notifications | Reset in browser settings |

---

## 🎯 PRODUCTION TESTING

### Deploy to Netlify

```bash
npm run netlify:deploy:prod
```

### Test on Real Devices

1. **Desktop Chrome:** Works ✅
2. **Desktop Firefox:** Works ✅
3. **Desktop Edge:** Works ✅
4. **Desktop Safari:** Not supported ❌ (Use APNS)
5. **Mobile Chrome (Android):** Works ✅
6. **Mobile Safari (iOS):** Not supported ❌ (Use APNS)

### HTTPS Requirement

Push notifications **only work on HTTPS** (or localhost)

Verify:
- Production URL uses `https://`
- SSL certificate is valid
- Service worker loads without errors

---

## ✅ SUCCESS CHECKLIST

Your push notification system is working if:

- [ ] Service worker registered and active
- [ ] User granted notification permission
- [ ] Subscription saved to database
- [ ] Test notification appears in browser
- [ ] Clicking notification opens correct URL
- [ ] Backend logs show successful sends
- [ ] User preferences are respected (test by disabling)
- [ ] Expired subscriptions are auto-removed

---

## 🆘 HELP

**Still not working?**

1. Check the main guide: `PUSH-NOTIFICATIONS-COMPLETE.md`
2. Review troubleshooting section
3. Verify all environment variables
4. Check database tables exist
5. Look for errors in browser console and server logs

**Quick Debug:**

```javascript
// Run in browser console
console.log('Notifications supported?', 'Notification' in window);
console.log('Permission:', Notification.permission);
console.log('Service Worker:', await navigator.serviceWorker.getRegistration());
console.log('Subscription:', await (await navigator.serviceWorker.ready).pushManager.getSubscription());
```

---

**Happy Testing!** 🎉

Once all tests pass, you're ready to integrate push notifications into your other features (claims, tasks, appointments, etc.)
