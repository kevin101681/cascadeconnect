# 🔔 Push Notification System Files

**Quick reference for all push notification related files**

---

## 📁 Core Implementation Files

### Frontend

| File | Purpose | Location |
|------|---------|----------|
| **Service Worker** | Handles push events & notifications | `public/sw.js` |
| **React Hook** | Subscription management | `hooks/usePushNotifications.ts` |

### Backend

| File | Purpose | Location |
|------|---------|----------|
| **Push Service** | Smart notification sender | `lib/services/pushService.ts` |
| **Subscribe API** | Save/remove subscriptions | `netlify/functions/push-subscribe.ts` |
| **Chat Example** | Wired up chat notifications | `netlify/functions/chat-send-message.ts` |

### Database

| File | Purpose | Location |
|------|---------|----------|
| **Schema** | Tables & columns | `db/schema.ts` |
| **Migration** | Setup script | `scripts/create-push-notifications-tables.ts` |

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `PUSH-NOTIFICATIONS-SUMMARY.md` | **START HERE** - Overview & quick start |
| `PUSH-NOTIFICATIONS-COMPLETE.md` | Complete guide with all details |
| `PUSH-NOTIFICATIONS-QUICK-REFERENCE.md` | Copy-paste examples for each type |
| `PUSH-NOTIFICATIONS-TESTING-GUIDE.md` | Step-by-step testing procedures |
| `PUSH-NOTIFICATIONS-VISUAL-GUIDE.md` | Architecture diagrams & flows |
| `THIS FILE` | File reference (you are here!) |

---

## 🚀 Quick Commands

```bash
# Setup (one-time)
npx web-push generate-vapid-keys
npm run setup-push-notifications

# Testing
npm run dev
# Then test in browser console

# Deploy
npm run netlify:deploy:prod
```

---

## 🎯 Integration Checklist

To add push notifications to a new feature:

- [ ] Import: `import { sendSmartNotification } from '@/lib/services/pushService';`
- [ ] Call after your event: `await sendSmartNotification(...)`
- [ ] Test with user who has preference enabled
- [ ] Test with user who has preference disabled
- [ ] Done! ✅

---

## 📊 File Size Summary

| Component | Files | Lines of Code |
|-----------|-------|---------------|
| Service Worker | 1 | ~110 |
| Push Service | 1 | ~210 |
| React Hook | 1 | ~280 |
| Subscribe API | 1 | ~160 |
| Schema Updates | 1 | ~20 |
| Migration Script | 1 | ~120 |
| Documentation | 5 | ~2,500 |
| **TOTAL** | **11** | **~3,400** |

---

## 🔍 Key Functions

### `sendSmartNotification()`
**Location:** `lib/services/pushService.ts`

The main function you'll use everywhere:

```typescript
sendSmartNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  url: string,
  icon?: string
)
```

### `subscribeToPush()`
**Location:** `hooks/usePushNotifications.ts`

Frontend subscription:

```typescript
const { subscribeToPush } = usePushNotifications();
await subscribeToPush(userId);
```

---

## 🗂️ Database Tables

### `push_subscriptions`
Stores browser push subscriptions

**Columns:**
- `id` - UUID primary key
- `user_id` - Clerk ID (text)
- `endpoint` - Push endpoint (unique)
- `p256dh_key` - Encryption key
- `auth_key` - Auth secret
- `created_at`, `updated_at` - Timestamps

### `users` (preference columns added)
Boolean columns for each notification type:
- `notify_claim_submit`
- `notify_appt_accept_homeowner`
- `notify_appt_accept_sub`
- `notify_reschedule`
- `notify_new_task`
- `notify_new_message`
- `notify_new_enrollment`

---

## 🎨 Architecture Overview

```
Frontend                Backend                  Database
--------                -------                  --------
React App       →       push-subscribe.ts  →     push_subscriptions
(subscribe)             (save endpoint)

Service Worker  ←       pushService.ts     ←     users (preferences)
(receive push)          (send via web-push)
```

---

## ✅ System Status

| Component | Status |
|-----------|--------|
| Service Worker | ✅ Complete |
| Database Schema | ✅ Complete |
| Push Service | ✅ Complete |
| Subscribe API | ✅ Complete |
| React Hook | ✅ Complete |
| Chat Integration | ✅ Complete |
| Documentation | ✅ Complete |
| **Overall** | **🎉 READY TO USE** |

---

## 📝 Notes

- **HTTPS Required:** Push notifications only work on HTTPS (or localhost)
- **Browser Support:** Chrome, Firefox, Edge (Safari requires APNS)
- **Mobile Support:** Works on Chrome Android
- **Auto-Cleanup:** Expired subscriptions removed automatically
- **Multi-Device:** Users can have multiple subscriptions

---

## 🆘 Need Help?

1. **Setup Issues:** See `PUSH-NOTIFICATIONS-COMPLETE.md` → Setup section
2. **Testing Problems:** See `PUSH-NOTIFICATIONS-TESTING-GUIDE.md`
3. **Integration Help:** See `PUSH-NOTIFICATIONS-QUICK-REFERENCE.md`
4. **Architecture Questions:** See `PUSH-NOTIFICATIONS-VISUAL-GUIDE.md`

---

**Last Updated:** January 18, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
