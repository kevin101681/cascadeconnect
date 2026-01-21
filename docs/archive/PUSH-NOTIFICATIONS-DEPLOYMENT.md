# 🚀 PUSH NOTIFICATIONS - DEPLOYMENT CHECKLIST

**Follow this checklist to deploy your push notification system**

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Generate VAPID Keys (5 minutes)

```bash
npx web-push generate-vapid-keys
```

**Output will look like:**
```
=======================================
Public Key:
BN1x...abc123

Private Key:
xyz789...def456
=======================================
```

**Action:**
- [ ] Copy the Public Key
- [ ] Copy the Private Key
- [ ] Store them securely (you'll need them in next step)

---

### 2. Configure Environment Variables (2 minutes)

**Add to your `.env` file:**

```env
# Push Notifications (VAPID Keys)
VITE_VAPID_PUBLIC_KEY=BN1x...abc123
VAPID_PRIVATE_KEY=xyz789...def456
```

**Important:**
- [ ] Public key starts with `VITE_` (visible to frontend)
- [ ] Private key does NOT start with `VITE_` (backend only)
- [ ] Both keys are on separate lines
- [ ] No quotes around the keys

**Also add to Netlify Environment Variables:**

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add `VITE_VAPID_PUBLIC_KEY` with your public key
3. Add `VAPID_PRIVATE_KEY` with your private key
4. Click Save

---

### 3. Run Database Migration (3 minutes)

**Option A: Using the migration script**

```bash
npm run create-push-notifications-tables
```

**Option B: Using Drizzle**

```bash
npm run db:push
```

**Verify migration succeeded:**

```sql
-- Check tables exist
SELECT * FROM push_subscriptions LIMIT 1;

-- Check columns exist
SELECT notify_claim_submit, notify_new_message FROM users LIMIT 1;
```

**Action:**
- [ ] Migration ran without errors
- [ ] Tables created successfully
- [ ] Columns added to users table

---

### 4. Verify Code Changes (2 minutes)

**Check these files exist:**

```bash
# Frontend
✓ public/sw.js
✓ hooks/usePushNotifications.ts

# Backend
✓ lib/services/pushService.ts
✓ netlify/functions/push-subscribe.ts
✓ netlify/functions/chat-send-message.ts (updated)

# Database
✓ db/schema.ts (updated)
✓ scripts/create-push-notifications-tables.ts

# Documentation
✓ PUSH-NOTIFICATIONS-SUMMARY.md
✓ PUSH-NOTIFICATIONS-COMPLETE.md
✓ PUSH-NOTIFICATIONS-QUICK-REFERENCE.md
✓ PUSH-NOTIFICATIONS-TESTING-GUIDE.md
✓ PUSH-NOTIFICATIONS-VISUAL-GUIDE.md
✓ PUSH-NOTIFICATIONS-FILES.md
```

**Action:**
- [ ] All files present
- [ ] No TypeScript errors (`npm run build`)

---

### 5. Build & Deploy (5 minutes)

```bash
# Build locally to check for errors
npm run build

# If build succeeds, deploy to Netlify
npm run netlify:deploy:prod
```

**Or push to GitHub (if auto-deploy is enabled):**

```bash
git add .
git commit -m "feat: Add universal push notification system with 7 notification types"
git push origin main
```

**Action:**
- [ ] Build completed successfully
- [ ] Deployed to production
- [ ] No deployment errors

---

## 🧪 POST-DEPLOYMENT TESTING

### Test 1: Service Worker Registration

1. Open your production site in Chrome
2. Open DevTools (F12)
3. Go to **Application** tab → **Service Workers**
4. Verify `sw.js` is registered and **activated**

**Expected:** Green dot next to service worker

---

### Test 2: Subscribe to Notifications

1. Make sure you're logged in
2. Open browser console
3. Run:

```javascript
// Request permission
await Notification.requestPermission();
// Should show "granted"

// Register service worker
const reg = await navigator.serviceWorker.register('/sw.js');
await navigator.serviceWorker.ready;
console.log('Service worker ready');

// Get your user ID (from Clerk)
const userId = 'YOUR_CLERK_USER_ID';

// Subscribe
const vapidKey = 'YOUR_PUBLIC_KEY';
const subscription = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidKey)
});

// Save to backend
await fetch('/.netlify/functions/push-subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userId,
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

**Expected:** Console logs "✅ Subscribed!"

---

### Test 3: Verify Subscription in Database

```sql
SELECT * FROM push_subscriptions 
WHERE user_id = 'YOUR_CLERK_USER_ID';
```

**Expected:** 1 row with endpoint, p256dh_key, auth_key

---

### Test 4: Send Test Notification (Chat)

1. Go to chat interface
2. Send a message to another user
3. Check if recipient receives push notification

**Expected:**
- Notification appears in browser
- Clicking opens chat window
- No notification if user disabled `notify_new_message`

---

## 🎯 INTEGRATION CHECKLIST

### Claims System

**File to update:** `netlify/functions/submit-claim.ts` (or similar)

**Add:**
```typescript
import { sendSmartNotification } from '../../lib/services/pushService';

// After claim is saved...
await sendSmartNotification(
  adminUserId,
  'CLAIM_SUBMIT',
  'New Claim',
  `${homeownerName} submitted "${claimTitle}"`,
  `/claims/${claimId}`
);
```

**Test:**
- [ ] Admin receives notification when claim submitted
- [ ] Clicking notification opens claim page
- [ ] No notification if admin disabled preference

---

### Tasks System

**File to update:** `netlify/functions/tasks.ts` (or similar)

**Add:**
```typescript
import { sendSmartNotification } from '../../lib/services/pushService';

// After task is assigned...
await sendSmartNotification(
  assignedUserId,
  'NEW_TASK',
  'Task Assigned',
  taskTitle,
  `/tasks/${taskId}`
);
```

**Test:**
- [ ] User receives notification when task assigned
- [ ] Clicking notification opens task
- [ ] No notification if user disabled preference

---

### Appointments System

**File to update:** `netlify/functions/appointments.ts`

**Add (homeowner accepts):**
```typescript
await sendSmartNotification(
  adminUserId,
  'APPT_ACCEPT_HOMEOWNER',
  'Appointment Accepted',
  `${homeownerName} accepted appointment`,
  `/appointments/${apptId}`
);
```

**Add (sub accepts):**
```typescript
await sendSmartNotification(
  adminUserId,
  'APPT_ACCEPT_SUB',
  'Sub Accepted Job',
  `${subName} accepted the job`,
  `/appointments/${apptId}`
);
```

**Add (reschedule):**
```typescript
await sendSmartNotification(
  adminUserId,
  'RESCHEDULE',
  'Reschedule Request',
  `${homeownerName} requested reschedule`,
  `/appointments/${apptId}`
);
```

**Test:**
- [ ] Admin receives notification for each event type
- [ ] Clicking notification opens appointment
- [ ] Preferences respected

---

### Enrollment System

**File to update:** Enrollment completion handler

**Add:**
```typescript
await sendSmartNotification(
  adminUserId,
  'NEW_ENROLLMENT',
  'New Enrollment',
  `${homeownerName} completed enrollment`,
  `/homeowners/${homeownerId}`
);
```

**Test:**
- [ ] Admin receives notification on enrollment
- [ ] Clicking notification opens homeowner page
- [ ] Preference respected

---

## 🎨 UI/UX INTEGRATION

### Notification Settings UI

**Create a settings page with toggles for each type:**

```tsx
import { useState, useEffect } from 'react';

function NotificationSettings() {
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
    await updateUserPreferences({ [key]: value });
    setPreferences({ ...preferences, [key]: value });
  };

  return (
    <div>
      <h2>Push Notifications</h2>
      <Toggle
        label="Claims"
        checked={preferences.notify_claim_submit}
        onChange={(val) => handleToggle('notify_claim_submit', val)}
      />
      <Toggle
        label="Appointment Acceptances (Homeowner)"
        checked={preferences.notify_appt_accept_homeowner}
        onChange={(val) => handleToggle('notify_appt_accept_homeowner', val)}
      />
      <Toggle
        label="Appointment Acceptances (Subcontractor)"
        checked={preferences.notify_appt_accept_sub}
        onChange={(val) => handleToggle('notify_appt_accept_sub', val)}
      />
      <Toggle
        label="Reschedule Requests"
        checked={preferences.notify_reschedule}
        onChange={(val) => handleToggle('notify_reschedule', val)}
      />
      <Toggle
        label="Tasks"
        checked={preferences.notify_new_task}
        onChange={(val) => handleToggle('notify_new_task', val)}
      />
      <Toggle
        label="Chat Messages"
        checked={preferences.notify_new_message}
        onChange={(val) => handleToggle('notify_new_message', val)}
      />
      <Toggle
        label="Enrollments"
        checked={preferences.notify_new_enrollment}
        onChange={(val) => handleToggle('notify_new_enrollment', val)}
      />
    </div>
  );
}
```

**Action:**
- [ ] Settings UI added
- [ ] Toggles work
- [ ] Preferences saved to database

---

## 📊 MONITORING SETUP

### Query to Check System Health

```sql
-- Active subscriptions per user
SELECT user_id, COUNT(*) as device_count
FROM push_subscriptions
GROUP BY user_id
ORDER BY device_count DESC;

-- Total subscriptions
SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;

-- Users with notifications enabled
SELECT 
  COUNT(*) FILTER (WHERE notify_claim_submit = true) as claims_enabled,
  COUNT(*) FILTER (WHERE notify_new_message = true) as chat_enabled,
  COUNT(*) FILTER (WHERE notify_new_task = true) as tasks_enabled
FROM users;
```

**Action:**
- [ ] Queries run successfully
- [ ] Monitoring dashboard created (optional)

---

## ✅ FINAL VERIFICATION

### Checklist

- [ ] VAPID keys generated and configured
- [ ] Environment variables set (local + Netlify)
- [ ] Database migration completed
- [ ] All code files in place
- [ ] Build succeeds without errors
- [ ] Deployed to production
- [ ] Service worker registered
- [ ] Test subscription works
- [ ] Test notification received
- [ ] Chat notifications working
- [ ] Preferences respected

### Browser Compatibility

- [ ] Tested on Chrome Desktop
- [ ] Tested on Firefox Desktop
- [ ] Tested on Edge Desktop
- [ ] Tested on Chrome Mobile (Android)
- [ ] Note: Safari/iOS not supported (use APNS separately)

---

## 🎉 LAUNCH

**Once all checks pass, you're ready to launch!**

### Post-Launch

1. **Monitor logs** for any errors
2. **Check database** for subscription growth
3. **Gather feedback** from users
4. **Add remaining integrations** (claims, tasks, appointments, etc.)

---

## 📞 SUPPORT

**If you encounter issues:**

1. Check the documentation files
2. Review server logs for errors
3. Verify VAPID keys are correct
4. Ensure database migration ran
5. Check browser console for errors

**Documentation:**
- `PUSH-NOTIFICATIONS-COMPLETE.md` - Full guide
- `PUSH-NOTIFICATIONS-TESTING-GUIDE.md` - Testing help
- `PUSH-NOTIFICATIONS-QUICK-REFERENCE.md` - Code examples

---

**Deployment Date:** __________  
**Deployed By:** __________  
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete  

---

**Good luck with your launch!** 🚀🎉
