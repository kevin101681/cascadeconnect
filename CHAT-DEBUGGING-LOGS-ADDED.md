# Chat Widget Debug Logging - Added
**Date:** January 17, 2026  
**Status:** 🔍 Diagnostic Logging Enabled - Awaiting User Test Results

---

## What Was Added

Comprehensive logging has been added to **trace the entire message lifecycle** from component mount to database query to server response.

---

## Files Modified

### 1. `components/chat/ChatWindow.tsx`

**Location: `loadMessages` function (lines 112-142)**

Added logging to track:
- ✅ When ChatWindow mounts/updates
- ✅ Channel ID being passed
- ✅ Whether fetch is attempted
- ✅ Number of messages returned
- ✅ Sample message structure (including senderName)

**Location: `handleSendMessage` function (lines 363-395)**

Added logging to track:
- ✅ Current user info before sending (userId, userName)
- ✅ Message being sent
- ✅ Full server response structure (senderName, senderEmail)

### 2. `services/internalChatService.ts`

**Location: `getChannelMessages` function (lines 286-348)**

Added logging to track:
- ✅ Service layer fetch initiation
- ✅ SQL query results count
- ✅ Sample row from database (with JOIN result)
- ✅ Whether senderName is populated from JOIN
- ✅ Final array being returned to component

### 3. `netlify/functions/chat-send-message.ts`

**Location: Message creation and sender lookup (lines 82-120)**

Added logging to track:
- ✅ Clerk ID being used for lookup
- ✅ Whether user is found in `users` table
- ✅ Exact name/email returned from database
- ✅ Final message object being returned to client

---

## Expected Console Output

### When Opening Chat Widget

```
🎬 ChatWindow MOUNTED/UPDATED. Channel ID: abc-123 User ID: user_xyz
🔄 ChatWindow loadMessages called. Channel ID: abc-123
📡 Calling getChannelMessages for: abc-123
🔎 [Service] Fetching messages for Channel: abc-123 (limit: 50)
📊 [Service] Query Result: { count: 5, channelId: 'abc-123' }
📄 [Service] SAMPLE ROW: {
  id: 'msg-123',
  senderId: 'user_xyz',
  senderName: 'John Doe',           ← SHOULD BE REAL NAME
  senderEmail: 'john@example.com',
  content: 'Hello world...',
  createdAt: 2026-01-17T...
}
✅ [Service] Returning 5 messages (with replies populated)
📥 getChannelMessages Result: {
  count: 5,
  sample: {
    id: 'msg-123',
    senderId: 'user_xyz',
    senderName: 'John Doe',          ← SHOULD BE REAL NAME
    senderEmail: 'john@example.com',
    content: 'Hello world...'
  }
}
```

### When Sending a Message

```
👤 Current User Info: {
  userId: 'user_xyz',
  userName: 'John Doe',              ← CHECK THIS VALUE
  messageContent: 'Test message...'
}
📤 Sending message to server...
🔍 [Netlify] Looking up sender info for Clerk ID: user_xyz
👤 [Netlify] Sender lookup result: {
  found: true,                       ← SHOULD BE TRUE
  name: 'John Doe',                  ← SHOULD MATCH userName
  email: 'john@example.com',
  clerkId: 'user_xyz'
}
✅ [Netlify] Message saved with ID: msg-456
📦 [Netlify] Returning message: {
  id: 'msg-456',
  senderId: 'user_xyz',
  senderName: 'John Doe',            ← SHOULD BE REAL NAME
  senderEmail: 'john@example.com',
  content: 'Test message...'
}
✅ Message sent successfully: msg-456
📋 Server Response: {
  id: 'msg-456',
  senderId: 'user_xyz',
  senderName: 'John Doe',            ← SHOULD BE REAL NAME
  senderEmail: 'john@example.com',
  content: 'Test message...'
}
```

---

## What to Look For

### Issue 1: Messages Not Persisting

**Check these logs:**

1. **Does ChatWindow mount when switching views?**
   - Look for: `🎬 ChatWindow MOUNTED/UPDATED`
   - If missing: Component is not rendering

2. **Is channelId passed correctly?**
   - Look for: `Channel ID: abc-123`
   - If null/undefined: ChatWidget is not passing channelId prop

3. **Is fetch being called?**
   - Look for: `📡 Calling getChannelMessages`
   - If missing: useEffect is not triggering

4. **Are messages in database?**
   - Look for: `📊 [Service] Query Result: { count: X }`
   - If count is 0: Messages not saved to DB
   - If count > 0 but not showing: UI rendering issue

### Issue 2: "Unknown" Sender

**Check these logs:**

1. **When sending, is userName defined?**
   - Look for: `👤 Current User Info: { userName: 'John Doe' }`
   - If undefined: ChatWidget not passing currentUserName prop

2. **Is Clerk ID being sent correctly?**
   - Look for: `🔍 [Netlify] Looking up sender info for Clerk ID: user_xyz`
   - Note the exact format (e.g., `user_` prefix)

3. **Is user found in database?**
   - Look for: `👤 [Netlify] Sender lookup result: { found: true, name: 'John Doe' }`
   - If `found: false`: **This is the root cause!**
   - If `name: 'NOT FOUND'`: User is not in `users` table

4. **Does senderName return from server?**
   - Look for: `📦 [Netlify] Returning message: { senderName: 'John Doe' }`
   - If `senderName: 'Unknown'`: User lookup failed

5. **Does frontend receive senderName?**
   - Look for: `📋 Server Response: { senderName: 'John Doe' }`
   - If different: Response is being modified somewhere

---

## Diagnostic Scenarios

### Scenario A: User Not in Database

**Logs will show:**
```
🔍 [Netlify] Looking up sender info for Clerk ID: user_2abc123
👤 [Netlify] Sender lookup result: {
  found: false,        ← NO MATCH!
  name: 'NOT FOUND',
  email: 'NOT FOUND',
  clerkId: 'user_2abc123'
}
```

**Solution:** Add user to database
```sql
INSERT INTO users (clerk_id, name, email, role)
VALUES ('user_2abc123', 'John Doe', 'john@example.com', 'admin');
```

### Scenario B: Clerk ID Mismatch

**Logs will show:**
```
👤 Current User Info: { userId: 'user_2abc123' }
🔍 [Netlify] Looking up sender info for Clerk ID: user_2abc123
```

But database has:
```sql
SELECT clerk_id FROM users;
-- Result: 'User_2abc123'  (capital U!)
```

**Solution:** Fix case sensitivity
```sql
UPDATE users
SET clerk_id = 'user_2abc123'
WHERE clerk_id = 'User_2abc123';
```

### Scenario C: Messages Not Fetching

**Logs will show:**
```
🎬 ChatWindow MOUNTED/UPDATED. Channel ID: undefined
⚠️ No Channel ID found, aborting fetch.
```

**Solution:** ChatWidget is not setting selectedChannel correctly

### Scenario D: Component Not Mounting

**Logs will NOT show:**
```
🎬 ChatWindow MOUNTED/UPDATED  ← MISSING!
```

**Solution:** ChatWidget is not rendering ChatWindow (selectedChannel is null)

---

## How to Test

### Test 1: Check Message Loading
1. Open browser console (F12)
2. Clear console
3. Open floating chat widget (click FAB button)
4. Select a channel with existing messages
5. **Copy all console logs** and send them

**What to capture:**
- `🎬 ChatWindow MOUNTED` log
- `📡 Calling getChannelMessages` log
- `📊 [Service] Query Result` log
- `📄 [Service] SAMPLE ROW` log

### Test 2: Check Message Sending
1. Keep console open
2. Type a message and send
3. **Copy all console logs** and send them

**What to capture:**
- `👤 Current User Info` log
- `🔍 [Netlify] Looking up sender` log
- `👤 [Netlify] Sender lookup result` log
- `📦 [Netlify] Returning message` log
- `📋 Server Response` log

### Test 3: Check Persistence
1. Send a message
2. Close chat widget
3. Refresh page
4. Open chat widget again
5. Select same channel
6. **Check if message is still there**
7. **Copy console logs from step 5**

---

## What User Should Send

Please provide these items:

1. **Full console logs** from Test 1 (opening widget)
2. **Full console logs** from Test 2 (sending message)
3. **Full console logs** from Test 3 (refresh test)
4. **Screenshots** showing:
   - The "Unknown" sender display
   - The console logs side-by-side
5. **Database query result** (if possible):
   ```sql
   SELECT clerk_id, name, email, role 
   FROM users 
   WHERE clerk_id LIKE '%' || :your_clerk_id || '%';
   ```

---

## Known Patterns to Identify

### Pattern 1: User Sync Issue
```
found: false          ← User not in DB
name: 'NOT FOUND'     ← Fallback to 'Unknown'
```
**Fix:** Implement Clerk webhook user sync

### Pattern 2: Case Sensitivity
```
Clerk ID: user_2abc123
DB has: User_2abc123  (different case)
```
**Fix:** Normalize case in database

### Pattern 3: Component Unmounting
```
🎬 ChatWindow MOUNTED
(user switches to list)
(component unmounts - state cleared)
(user switches back)
🎬 ChatWindow MOUNTED   ← Fresh mount, should load messages
```
**Expected:** Should see fetch logs on every mount

---

## Next Steps

**After receiving logs, we can:**

1. **Identify exact failure point** (mount, fetch, query, join, return)
2. **Determine root cause** (DB sync, ID mismatch, component lifecycle)
3. **Implement targeted fix** (not just defensive fallbacks)
4. **Verify fix** (with same logging enabled)

---

## Commit Info

**Modified Files:**
- `components/chat/ChatWindow.tsx`
- `services/internalChatService.ts`
- `netlify/functions/chat-send-message.ts`

**Logging Added:**
- 🎬 Component lifecycle
- 📡 API calls
- 🔎 Database queries
- 👤 User lookups
- 📦 Server responses
- 📋 Client receives

**Status:** Ready for user testing - awaiting console logs
