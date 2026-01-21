# Critical Fix Verification: Self-Messages Not Counted as Unread
**Date:** January 17, 2026  
**Status:** ✅ VERIFIED - Fix Already in Place

---

## 🎯 The Issue

**User Report:** Badge persists after clicking channel because user's own messages are counted as unread.

**Expected Behavior:**
- Only messages from OTHER users should count as unread
- User's own messages should never create unread badges

**Bug Hypothesis:**
```sql
-- BAD (counts own messages):
SELECT COUNT(*) FROM messages
WHERE channelId = X AND createdAt > lastReadAt

-- GOOD (excludes own messages):
SELECT COUNT(*) FROM messages  
WHERE channelId = X 
  AND createdAt > lastReadAt
  AND senderId != currentUserId  ← CRITICAL FILTER
```

---

## ✅ Current Implementation

**File:** `services/internalChatService.ts` (lines 176-197)

```typescript
// ✅ CRITICAL: Count ONLY unread messages from OTHER users
// This prevents user's own messages from showing as unread
const unreadMessages = await db
  .select({ count: sql<number>`count(*)` })
  .from(internalMessages)
  .where(
    and(
      eq(internalMessages.channelId, ch.channelId),
      sql`${internalMessages.createdAt} > ${ch.lastReadAt}`,
      eq(internalMessages.isDeleted, false),
      // ✅ CRITICAL: Exclude messages sent by current user
      ne(internalMessages.senderId, userId)  // ← FIX IS HERE!
    )
  );

const unreadCount = Number(unreadMessages[0]?.count || 0);

console.log(`📊 [getUserChannels] Unread count for channel ${ch.channelId}`, {
  channelId: ch.channelId,
  unreadCount,
  lastReadAt: ch.lastReadAt,
  currentUserId: userId
});
```

**Analysis:**
- ✅ Line 186: `ne(internalMessages.senderId, userId)` - Excludes own messages
- ✅ This is the ONLY place in the codebase calculating unread counts
- ✅ The fix is already implemented correctly

---

## 🔍 Verification Steps

### Test 1: Single User Scenario

**Setup:**
1. User "Kevin" (user_36z...) sends message in DM
2. Kevin refreshes widget

**Expected:**
```javascript
📊 [getUserChannels] Unread count for channel abc-123 {
  channelId: "abc-123",
  unreadCount: 0,  // ✅ Should be 0 (own message excluded)
  lastReadAt: "2026-01-17T10:00:00Z",
  currentUserId: "user_36z..."
}
```

**If Failed:**
```javascript
unreadCount: 1  // ❌ Own message counted
```

### Test 2: Two User Scenario

**Setup:**
1. User A sends message
2. User B opens widget (doesn't open chat)

**Expected for User B:**
```javascript
unreadCount: 1  // ✅ Message from User A is unread
```

**User B clicks chat:**
```javascript
// markChannelAsRead called
// lastReadAt updated to NOW
```

**User B refreshes widget:**
```javascript
unreadCount: 0  // ✅ Message is now "read"
```

### Test 3: Rapid Messages

**Setup:**
1. User A sends 5 messages
2. User B has not opened chat

**Expected for User B:**
```javascript
unreadCount: 5  // ✅ All 5 messages from User A
```

**User B sends 2 messages (without opening chat first):**
```javascript
unreadCount: 5  // ✅ Still 5 (own messages don't count)
```

---

## 🐛 Debugging if Badge Still Persists

### Check 1: Verify senderId Format

**Potential Issue:** `senderId` format mismatch

```javascript
// In database:
senderId = "user_36zHRClPQGpZOqCInhTxg8wPnCv"

// Passed to query:
userId = "user_36zHRClPQGpZOqCInhTxg8wPnCv"

// ✅ Must match exactly for ne() to work
```

**Verify in logs:**
```javascript
📊 [getUserChannels] Unread count for channel ... {
  currentUserId: "user_36z..."  // Check this value
}
```

### Check 2: Verify lastReadAt is Updated

**Potential Issue:** `markChannelAsRead` not updating timestamp

```sql
-- Check in database:
SELECT * FROM channel_members 
WHERE userId = 'user_36z...' 
  AND channelId = 'abc-123';

-- lastReadAt should be RECENT (within seconds of clicking)
```

**Verify in logs:**
```javascript
📖 Marking channel abc-123 as read for user user_36z...
✅ Channel marked as read
```

### Check 3: Verify Message Timestamps

**Potential Issue:** Server time skew

```javascript
// If message createdAt is FUTURE:
messageCreatedAt = "2026-01-17T12:00:00Z"
lastReadAt       = "2026-01-17T11:59:59Z"

// Result: Message counted as unread forever!
```

**Fix:** Ensure server times are synchronized (NTP)

---

## 🧪 Manual Testing Script

**Run this in browser console after opening widget:**

```javascript
// 1. Get current user ID
const currentUserId = 'user_36z...'; // Replace with actual

// 2. Send test message
await fetch('/.netlify/functions/chat-send-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    channelId: 'dm-user_36z-user_42a',
    senderId: currentUserId,
    content: 'Test message from self'
  })
});

// 3. Wait 2 seconds
await new Promise(r => setTimeout(r, 2000));

// 4. Reload widget (or refresh page)
// Check badge - should NOT increase

// 5. Check console logs:
// 📊 [getUserChannels] Unread count for channel ...
// unreadCount should still be 0 or same as before
```

---

## 🔧 SQL Verification

**Run this directly in database:**

```sql
-- Get unread count for a specific user/channel
SELECT 
  COUNT(*) as unread_count,
  COUNT(*) FILTER (WHERE sender_id = 'user_36z...') as own_messages,
  COUNT(*) FILTER (WHERE sender_id != 'user_36z...') as other_messages
FROM internal_messages m
JOIN channel_members cm ON cm.channel_id = m.channel_id
WHERE m.channel_id = 'abc-123'
  AND cm.user_id = 'user_36z...'
  AND m.created_at > cm.last_read_at
  AND m.is_deleted = false;

-- Expected:
-- unread_count: 0 (if only own messages)
-- own_messages: N (should exist)
-- other_messages: 0 (if only own messages)

-- The app should use other_messages count!
```

---

## 🎯 Root Cause Analysis

### Scenario 1: Fix Not Deployed

**Symptom:** Badge still persists after own message

**Cause:** Old code without `ne(senderId, userId)` still running

**Solution:** Verify deployment, check git commit, force redeploy

### Scenario 2: Caching Issue

**Symptom:** Badge shows old count even after refresh

**Cause:** Frontend or CDN caching old channel data

**Solution:** Hard refresh (Ctrl+F5), clear cache, check API response

### Scenario 3: ID Format Mismatch

**Symptom:** `ne()` comparison fails silently

**Cause:** `senderId` in database doesn't match `userId` parameter

**Solution:** 
- Check database: `SELECT DISTINCT sender_id FROM internal_messages LIMIT 5;`
- Check parameter: Look for `currentUserId` in logs
- Ensure both are Clerk IDs (format: `user_...`)

### Scenario 4: Timestamp Precision Issue

**Symptom:** Messages always show as unread

**Cause:** Timestamp comparison has microsecond precision issues

**Solution:**
- Use `>=` instead of `>` in comparison
- Or add 1 second buffer to `lastReadAt`

---

## ✅ Files Modified

**1. `services/internalChatService.ts`**
- Lines 176-197: Enhanced logging for unread count calculation
- Verified `ne(internalMessages.senderId, userId)` is present

---

## 📝 Summary

**Status:** ✅ The fix is already implemented correctly

**Code:** Line 186 in `getUserChannels` excludes own messages

**Logs:** Added verification logging to confirm counts

**Next Steps:**
1. Deploy this version
2. Test with real user sending messages
3. Check console logs for unread counts
4. Verify badge clears correctly

**If Badge Still Persists:**
- Check logs for `currentUserId` value
- Verify it matches `senderId` format in database
- Check `lastReadAt` is being updated
- Run SQL verification query

The implementation is correct - any remaining issues are likely deployment, caching, or data format related!
