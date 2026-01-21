# 🐛 Chat Unread Count Logic Fix

## Problem
The unread message badge **persisted even after reading all messages and refreshing the page**. This indicated a critical logic error in how unread messages were being counted.

### Symptoms
1. User opens chat and reads all messages
2. Unread badge still shows a number (e.g., "3")
3. User refreshes page
4. Badge **still shows "3"** ❌
5. Badge never decrements until the **other user** reads the messages

### Root Cause
The unread count query was counting **ALL messages** created after the user's `lastReadAt` timestamp, including:
- ✅ Messages from other users (correct)
- ❌ **Messages sent by the current user** (WRONG!)

This meant when I sent 3 messages to Mary:
1. My `lastReadAt` was updated (marking channel as read)
2. But the unread count query counted **my own 3 messages** as "unread for me"
3. Badge showed "3 unread" even though I sent them
4. Badge wouldn't clear until Mary opened the chat (updating her `lastReadAt`)

---

## ✅ Solution: Filter Out Current User's Messages

### The Fix

**Modified:** `services/internalChatService.ts` - `getUserChannels()` function

**Before:** ❌ Counts ALL messages (including user's own)
```typescript
const unreadMessages = await db
  .select({ count: sql<number>`count(*)` })
  .from(internalMessages)
  .where(
    and(
      eq(internalMessages.channelId, ch.channelId),
      sql`${internalMessages.createdAt} > ${ch.lastReadAt}`,
      eq(internalMessages.isDeleted, false)
      // ❌ MISSING: Filter to exclude current user's messages
    )
  );
```

**After:** ✅ Only counts messages from OTHER users
```typescript
const unreadMessages = await db
  .select({ count: sql<number>`count(*)` })
  .from(internalMessages)
  .where(
    and(
      eq(internalMessages.channelId, ch.channelId),
      sql`${internalMessages.createdAt} > ${ch.lastReadAt}`,
      eq(internalMessages.isDeleted, false),
      // ✅ CRITICAL FIX: Exclude messages sent by the current user
      sql`${internalMessages.senderId} != ${userId}`
    )
  );
```

---

## 🔍 Technical Details

### Correct Unread Message Logic

An "unread message" for User A should satisfy ALL of these conditions:

1. ✅ Message is in a channel User A has access to
2. ✅ Message was created **after** User A's `lastReadAt` for that channel
3. ✅ Message is not deleted
4. ✅ **Message was sent by someone OTHER than User A**

### Why the 4th Condition is Critical

```
Scenario: Kevin sends 3 messages to Mary in a DM

WRONG LOGIC (before fix):
┌──────────────────────────────────────────┐
│ Kevin's Perspective                      │
├──────────────────────────────────────────┤
│ 1. Kevin sends "Hi" → lastReadAt updated │
│ 2. Kevin sends "How are you?"            │
│ 3. Kevin sends "Talk later"              │
│                                          │
│ Unread Count Query:                      │
│ - Messages after lastReadAt: 3           │
│   (includes Kevin's own messages!)       │
│ - Badge shows: "3 unread" ❌             │
│                                          │
│ Kevin sees his own messages as unread!   │
└──────────────────────────────────────────┘

CORRECT LOGIC (after fix):
┌──────────────────────────────────────────┐
│ Kevin's Perspective                      │
├──────────────────────────────────────────┤
│ 1. Kevin sends "Hi" → lastReadAt updated │
│ 2. Kevin sends "How are you?"            │
│ 3. Kevin sends "Talk later"              │
│                                          │
│ Unread Count Query:                      │
│ - Messages after lastReadAt: 3           │
│ - Filter out Kevin's messages: -3        │
│ - Badge shows: "0 unread" ✅             │
│                                          │
│ Kevin sees no unread messages!           │
└──────────────────────────────────────────┘

Mary's Perspective (unchanged, correct):
┌──────────────────────────────────────────┐
│ Mary hasn't opened chat yet              │
├──────────────────────────────────────────┤
│ Unread Count Query:                      │
│ - Messages after lastReadAt: 3           │
│ - Filter out Mary's messages: 0          │
│   (none are from Mary)                   │
│ - Badge shows: "3 unread" ✅             │
│                                          │
│ Mary sees 3 unread from Kevin!           │
└──────────────────────────────────────────┘
```

---

## 🎯 User Experience Impact

### Before ❌
1. Kevin opens chat with Mary
2. Kevin sends 3 messages
3. Kevin's badge shows **"3 unread"** (wrong!)
4. Kevin refreshes page
5. Badge **still shows "3"** (persists)
6. Kevin confused: "I read everything!"
7. Badge only clears when Mary reads the messages

### After ✅
1. Kevin opens chat with Mary
2. Kevin sends 3 messages
3. Kevin's badge shows **"0 unread"** ✅
4. Kevin refreshes page
5. Badge **still shows "0"** ✅
6. Mary's badge shows **"3 unread"** (correct)
7. Mary opens chat → her badge clears to "0" ✅

---

## 📊 Database Schema Context

### Channel Members Table
The `channel_members` table tracks read status per user per channel:

```typescript
export const channelMembers = pgTable('channel_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').references(() => internalChannels.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  
  // ✅ Timestamp of when this user last read this channel
  lastReadAt: timestamp('last_read_at').defaultNow().notNull(),
  
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  isMuted: boolean('is_muted').default(false),
});
```

### Messages Table
The `internal_messages` table stores all chat messages:

```typescript
export const internalMessages = pgTable('internal_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').references(() => internalChannels.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(), // ← Used for filtering
  content: text('content').notNull(),
  // ... other fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### How Unread Count Works

For each channel, for each user:

1. **Fetch user's `lastReadAt`** from `channel_members`
2. **Count messages** where:
   - `createdAt > lastReadAt` (messages since last read)
   - `senderId != currentUserId` (not sent by me) ← **THE FIX**
   - `isDeleted = false` (not deleted)
3. **Return count** as unread badge number

---

## 📝 Files Modified

### Modified
- ✅ `services/internalChatService.ts` - Fixed `getUserChannels()` unread count query

### Verified (Already Correct)
- ✅ `netlify/functions/chat-mark-read.ts` - Updates `lastReadAt` correctly
- ✅ `components/chat/ChatWindow.tsx` - Calls `markChannelAsRead` at right times

---

## ✅ Testing Checklist

### Single User (Kevin)
- [x] Build completes successfully
- [ ] Kevin opens chat → badge is 0
- [ ] Kevin sends 3 messages → badge stays 0 ✅
- [ ] Kevin refreshes page → badge stays 0 ✅
- [ ] Kevin sends message to Mary → his badge stays 0 ✅

### Multiple Users (Kevin & Mary)
- [ ] Kevin sends 3 messages to Mary → Kevin's badge: 0, Mary's badge: 3 ✅
- [ ] Mary opens chat → Mary's badge clears to 0 ✅
- [ ] Mary sends reply → Kevin's badge shows 1, Mary's stays 0 ✅
- [ ] Kevin opens chat → Kevin's badge clears to 0 ✅

### Edge Cases
- [ ] Empty channel → badge is 0
- [ ] User sends, then receives → badge only counts incoming
- [ ] Multiple channels → each badge counts correctly
- [ ] Rapid messaging → counts stay accurate

---

## 🔮 Alternative Approaches (Not Implemented)

### Approach 1: Per-Message Read Receipts
Instead of tracking `lastReadAt` per channel, track which messages each user has read:

```sql
CREATE TABLE message_reads (
  message_id UUID REFERENCES internal_messages(id),
  user_id UUID REFERENCES users(id),
  read_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);
```

**Pros:**
- More granular tracking
- Can show "Read by Kevin, Mary" indicators
- Support for "mark as unread" feature

**Cons:**
- More database writes (one per message per user)
- More complex queries
- Higher storage requirements

### Approach 2: Cached Unread Counts
Store unread counts in `channel_members`:

```sql
ALTER TABLE channel_members 
ADD COLUMN unread_count INTEGER DEFAULT 0;
```

**Pros:**
- Faster queries (no counting on-the-fly)
- Reduced database load

**Cons:**
- Cache invalidation complexity
- Potential for count drift/bugs
- Need triggers or background jobs to maintain

**Current Approach (Selected):**
- ✅ Simple and reliable
- ✅ Single source of truth (`lastReadAt`)
- ✅ No cache invalidation issues
- ✅ Good performance for typical channel sizes

---

## 🚀 Deployment Verification

After deploying:

1. **Check logs** for unread count queries
2. **Test with real users** sending messages back and forth
3. **Verify badge behavior** after page refresh
4. **Monitor performance** of unread count queries (add index if needed)

### Potential Index Optimization

If unread count queries are slow with many messages:

```sql
CREATE INDEX idx_messages_channel_created_sender 
ON internal_messages (channel_id, created_at, sender_id)
WHERE is_deleted = false;
```

This composite index covers all fields in the unread count query.

---

## 📚 Related Documentation

- `CHAT-UNREAD-COUNTER-FIX.md` - Original mark-as-read implementation
- `CHAT-SERVER-SIDE-PUSHER.md` - Real-time message delivery
- `CHAT-WINDOW-REACTIVE-FIX.md` - Optimistic UI updates
- `db/schema/internal-chat.ts` - Database schema definitions

---

**Fixed:** January 7, 2026  
**Critical Bug:** Unread count included user's own messages  
**Impact:** High - affects all chat users  
**Status:** ✅ Ready for deployment and testing

