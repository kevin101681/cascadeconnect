# ✅ Instant Badge Updates - Verification Checklist

## Pre-Testing Setup

- [ ] Two test users available (User A and User B)
- [ ] Two separate browsers or incognito windows open
- [ ] Browser console open in both windows (F12)
- [ ] Pusher credentials configured correctly in `.env`

## Test 1: Basic Instant Badge ⚡️

**Goal**: Verify badge appears instantly when receiving a message

### Steps:
1. [ ] Login as User A in Browser 1
2. [ ] Login as User B in Browser 2
3. [ ] User A: Open chat widget, select DM with User B
4. [ ] User B: Open chat widget (but DON'T select any channel yet)
5. [ ] User A: Send message "Test 1"
6. [ ] User B: Observe sidebar

### Expected Results:
- [ ] Badge appears on User B's sidebar in **< 1 second**
- [ ] Badge shows "1"
- [ ] Channel appears at the top of User B's list
- [ ] Last message preview shows "Test 1"

### Console Logs to Check (User B):
```
⚡️ [ChatWidget] Instant message received via Pusher: ...
⚡️ [ChatWidget] Instant badge update: { previousCount: 0, newCount: 1 }
⚡️ [ChatSidebar] Instant message received: ...
⚡️ [ChatSidebar] Channel moved to top: { newPosition: 0 }
```

---

## Test 2: No Self-Badge 🚫

**Goal**: Verify badge doesn't appear for your own messages

### Steps:
1. [ ] Login as User A in Browser 1
2. [ ] User A: Open chat widget, select DM with User B
3. [ ] User A: Send message "Test 2"
4. [ ] User A: Observe sidebar

### Expected Results:
- [ ] NO badge appears on User A's sidebar
- [ ] Channel DOES move to top (sorting still works)
- [ ] Last message preview shows "Test 2"

### Console Logs to Check (User A):
```
⚡️ [ChatWidget] Instant message received via Pusher: ...
⚡️ [ChatWidget] Message is from current user, skipping badge increment
⚡️ [ChatSidebar] Instant message received: ...
⚡️ [ChatSidebar] Channel moved to top: ...
```

---

## Test 3: No Badge When Viewing Chat 👀

**Goal**: Verify badge doesn't appear if already viewing the conversation

### Steps:
1. [ ] Login as User A in Browser 1
2. [ ] Login as User B in Browser 2
3. [ ] User A: Open chat widget, select DM with User B (ChatWindow visible)
4. [ ] User B: Send message "Test 3"
5. [ ] User A: Observe sidebar

### Expected Results:
- [ ] NO badge appears on User A's sidebar
- [ ] Message DOES appear instantly in ChatWindow
- [ ] Channel DOES move to top of list

### Console Logs to Check (User A):
```
⚡️ [ChatWidget] Instant message received via Pusher: ...
⚡️ [ChatWidget] Currently viewing this channel, skipping badge increment
⚡️ [ChatSidebar] Instant message received: ...
⚡️ [ChatWindow] New message received via Pusher: ...
```

---

## Test 4: Multiple Messages Increment Badge 📈

**Goal**: Verify badge increments correctly for multiple messages

### Steps:
1. [ ] Login as User A in Browser 1
2. [ ] Login as User B in Browser 2
3. [ ] User B: Open chat widget (but DON'T select any channel)
4. [ ] User A: Send message "Test 4a"
5. [ ] User A: Send message "Test 4b"
6. [ ] User A: Send message "Test 4c"
7. [ ] User B: Observe sidebar

### Expected Results:
- [ ] Badge shows "1" after first message
- [ ] Badge shows "2" after second message
- [ ] Badge shows "3" after third message
- [ ] Last message preview shows "Test 4c"

### Console Logs to Check (User B):
```
⚡️ [ChatWidget] Instant badge update: { previousCount: 0, newCount: 1 }
⚡️ [ChatWidget] Instant badge update: { previousCount: 1, newCount: 2 }
⚡️ [ChatWidget] Instant badge update: { previousCount: 2, newCount: 3 }
```

---

## Test 5: Badge Clears When Opening Chat 🧹

**Goal**: Verify badge clears when you open the conversation

### Steps:
1. [ ] Continue from Test 4 (User B has badge showing "3")
2. [ ] User B: Click on the DM channel to open ChatWindow
3. [ ] User B: Observe sidebar

### Expected Results:
- [ ] Badge immediately disappears (goes from "3" to nothing)
- [ ] All 3 messages appear in ChatWindow
- [ ] Channel stays at top of list

### Console Logs to Check (User B):
```
🔔 Badge Clear: Selecting channel { ... }
⚡️ STEP 1: OPTIMISTIC UPDATE - Clearing 3 unread(s)
```

---

## Test 6: WhatsApp-Style Channel Sorting 📊

**Goal**: Verify most recent conversations bubble to the top

### Steps:
1. [ ] Login as User A in Browser 1
2. [ ] User A has 3 existing DM channels: [Alice, Bob, Charlie]
3. [ ] Initial order: Alice (most recent), Bob, Charlie
4. [ ] Charlie sends message to User A
5. [ ] User A: Observe sidebar

### Expected Results:
- [ ] Channel list reorders to: Charlie, Alice, Bob
- [ ] Charlie's badge shows "1"
- [ ] Last message preview updated for Charlie

### Steps (continued):
6. [ ] Bob sends message to User A
7. [ ] User A: Observe sidebar

### Expected Results:
- [ ] Channel list reorders to: Bob, Charlie, Alice
- [ ] Bob's badge shows "1"
- [ ] Charlie's badge still shows "1"
- [ ] Last message preview updated for Bob

---

## Test 7: Pusher Connection Test 🔌

**Goal**: Verify Pusher is connected and receiving events

### Steps:
1. [ ] Login as User A in Browser 1
2. [ ] Open browser console
3. [ ] Type: `window.Pusher`
4. [ ] Check connection state

### Expected Results:
- [ ] Pusher object exists
- [ ] Connection state is "connected"
- [ ] Channel "team-chat" is subscribed

### Console Commands:
```javascript
// Check Pusher connection
window.Pusher.instances[0].connection.state
// Should output: "connected"

// Check subscribed channels
window.Pusher.instances[0].allChannels()
// Should include: { "team-chat": PresenceChannel { ... } }
```

---

## Test 8: Network Failure Graceful Degradation 🌐

**Goal**: Verify polling fallback works if Pusher fails

### Steps:
1. [ ] Login as User A in Browser 1
2. [ ] Open browser console
3. [ ] Block WebSocket connections (use browser DevTools: Network → Block request URL pattern: `wss://*`)
4. [ ] User B sends message to User A
5. [ ] Wait 30 seconds
6. [ ] User A: Observe sidebar

### Expected Results:
- [ ] Badge doesn't appear instantly (WebSocket blocked)
- [ ] Badge DOES appear after ~30 seconds (polling fallback)
- [ ] No console errors about failed Pusher connections

---

## Test 9: Multiple Channels Simultaneously 🚦

**Goal**: Verify badges work correctly with multiple active conversations

### Steps:
1. [ ] Login as User A in Browser 1
2. [ ] User A has conversations with: Alice, Bob, Charlie
3. [ ] Alice sends message
4. [ ] Bob sends message
5. [ ] Charlie sends message
6. [ ] User A: Observe sidebar

### Expected Results:
- [ ] Alice's channel shows badge "1"
- [ ] Bob's channel shows badge "1"
- [ ] Charlie's channel shows badge "1"
- [ ] Channel order: Charlie (most recent), Bob, Alice
- [ ] Total unread count in widget badge: "3"

---

## Test 10: Badge Persistence After Page Refresh 🔄

**Goal**: Verify badges persist correctly after refreshing the page

### Steps:
1. [ ] Continue from Test 9 (User A has 3 unread messages)
2. [ ] User A: Refresh the page (F5)
3. [ ] User A: Observe sidebar

### Expected Results:
- [ ] Total badge still shows "3"
- [ ] Individual channel badges persist: Alice "1", Bob "1", Charlie "1"
- [ ] Channel order remains: Charlie, Bob, Alice

---

## Performance Tests ⚡️

### Timing Test
**Goal**: Verify badge appears in < 100ms

1. [ ] Use browser DevTools Performance tab
2. [ ] Start recording
3. [ ] User B sends message to User A
4. [ ] Stop recording when badge appears
5. [ ] Measure time from Pusher event to DOM update

**Expected**: < 100ms

### Network Test
**Goal**: Verify no extra HTTP requests are made

1. [ ] Open Network tab in DevTools
2. [ ] Clear all requests
3. [ ] User B sends message to User A
4. [ ] Badge appears on User A's sidebar
5. [ ] Check Network tab

**Expected**: No new HTTP requests (only WebSocket frames)

---

## Bug Scenarios to Check 🐛

### Scenario 1: Duplicate Badges
- [ ] Badge count increments once per message (not multiple times)
- [ ] No duplicate Pusher events logged

### Scenario 2: Ghost Badges
- [ ] Badge clears completely when opening chat (not stuck at 1)
- [ ] Badge stays cleared after marking as read

### Scenario 3: Race Conditions
- [ ] Rapid messages (5+ in quick succession) increment badge correctly
- [ ] No missed messages
- [ ] No negative badge counts

### Scenario 4: Channel Not in List
- [ ] New DM from someone not in your channel list
- [ ] Badge appears when channel loads (via polling fallback)
- [ ] No console errors

---

## Sign-Off Checklist ✍️

- [ ] All 10 main tests passed
- [ ] Performance tests passed (< 100ms)
- [ ] Bug scenarios checked
- [ ] Console logs look correct (no errors)
- [ ] Pusher connection stable
- [ ] Polling fallback works
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] Mobile responsive (if applicable)

---

## Known Limitations 📝

1. **New Channels**: If a channel isn't in your list yet, badge won't appear until next polling cycle (30s). This is expected behavior.

2. **Network Failures**: If WebSocket connection is lost, falls back to polling (30s delay).

3. **Multiple Tabs**: Each tab maintains its own badge state. Opening a chat in one tab won't clear the badge in another tab until next poll.

---

**Test Date**: _______________  
**Tester Name**: _______________  
**Result**: ✅ PASS / ❌ FAIL  
**Notes**: 

_______________________________________________
_______________________________________________
_______________________________________________
