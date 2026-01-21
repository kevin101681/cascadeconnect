# 🔧 Critical Fix: Stable Pusher Listener (One-Hit Wonder Bug)

## Problem Identified
The "Blue Badge" updates worked perfectly for the **first** message, but subsequent messages fell back to slow polling (5-10s delay).

### Root Cause: "Thrashing" Effect
The `useEffect` hook managing the Pusher subscription had dependencies on state variables that changed frequently (`selectedChannel`, `loadUnreadCounts`):

```typescript
// ❌ BROKEN: Re-subscribes every time selectedChannel changes
useEffect(() => {
  const channel = pusher.subscribe('team-chat');
  channel.bind('new-message', (data) => {
    // Uses selectedChannel directly (stale closure)
    if (selectedChannel?.id === data.channelId) return;
    // ...
  });
  return () => {
    channel.unbind('new-message');
    pusher.unsubscribe('team-chat');
  };
}, [loadUnreadCounts, currentUserId, selectedChannel]); // ❌ BAD
```

**What Happened:**
1. User receives first message → Badge appears ✅
2. Badge update causes state change
3. `useEffect` sees dependency change → **Unsubscribes from Pusher**
4. `useEffect` runs again → Re-subscribes to Pusher
5. During this "thrashing", subsequent messages are missed ❌

## Solution: Stable Listener with useRef

### Key Changes

#### 1. Use `useRef` to Access State Without Re-subscribing
```typescript
// ✅ FIXED: Ref tracks state without causing re-renders
const selectedChannelRef = useRef<Channel | null>(null);

// Keep ref synced
useEffect(() => {
  selectedChannelRef.current = selectedChannel;
}, [selectedChannel]);
```

#### 2. Remove All State Dependencies
```typescript
// ✅ FIXED: Only depends on userId (never changes during session)
useEffect(() => {
  const pusher = getPusherClient();
  const channel = pusher.subscribe('team-chat');

  const handleNewMessage = (data) => {
    // Use REF instead of state variable
    const currentlyViewing = selectedChannelRef.current?.id === data.channelId;
    
    if (currentlyViewing) {
      console.log('Currently viewing, skipping badge');
      return;
    }

    // Functional state update (safe from stale closures)
    setUnreadCounts(prev => ({
      ...prev,
      [data.channelId]: (prev[data.channelId] || 0) + 1
    }));
  };

  channel.bind('new-message', handleNewMessage);

  return () => {
    channel.unbind('new-message', handleNewMessage);
    pusher.unsubscribe('team-chat');
  };
}, [currentUserId]); // ✅ CRITICAL: Only userId dependency
```

#### 3. Use Functional State Updates
```typescript
// ✅ FIXED: Functional update always has latest state
setUnreadCounts(prev => ({
  ...prev,
  [data.channelId]: (prev[data.channelId] || 0) + 1
}));

// Instead of:
// ❌ setUnreadCounts({ ...unreadCounts, [data.channelId]: ... });
```

## Files Modified

### 1. ChatWidget.tsx
**Changes:**
- Added `selectedChannelRef` to track selected channel without re-subscriptions
- Changed Pusher `useEffect` dependency from `[loadUnreadCounts, currentUserId, selectedChannel]` to `[currentUserId]`
- Used `selectedChannelRef.current` inside event handler instead of `selectedChannel`
- Added functional state update for `setTotalUnreadCount`
- Added console logs to track subscription lifecycle

### 2. ChatSidebar.tsx
**Changes:**
- Added `selectedChannelIdRef` to track active channel without re-subscriptions
- Changed Pusher `useEffect` dependency from `[]` to `[currentUserId]`
- Used `selectedChannelIdRef.current` inside event handler
- Kept functional state updates for `setChannels`
- Added console logs to track subscription lifecycle

## Testing the Fix

### Before Fix (One-Hit Wonder)
1. User A sends message to User B
2. Badge appears instantly ✅
3. User A sends second message
4. Badge stays at "1" for 5-10 seconds ❌ (Missed event due to unsubscribe)
5. Badge eventually updates to "2" via polling

### After Fix (Stable Listener)
1. User A sends message to User B
2. Badge appears instantly (< 100ms) ✅
3. User A sends second message
4. Badge increments instantly (< 100ms) ✅
5. User A sends third message
6. Badge increments instantly (< 100ms) ✅
7. **Pusher stays connected throughout** ✅

## Console Logs to Verify

### Setup Phase
```
🔌 [ChatWidget] Setting up STABLE Pusher listener for user: user_xxx
🔌 [ChatSidebar] Setting up STABLE Pusher listener for user: user_xxx
```

### Message Received (Repeated for Each Message)
```
⚡️ [ChatWidget] Instant message received via Pusher: { channelId, senderId, ... }
⚡️ [ChatWidget] Instant badge update: { previousCount: 0, newCount: 1 }
⚡️ [ChatSidebar] Instant message received: { channelId, senderId, ... }
⚡️ [ChatSidebar] Channel moved to top: { channelId, newPosition: 0 }
```

### Cleanup (Only on Logout/Unmount)
```
🔌 [ChatWidget] Cleaning up STABLE Pusher listener
🔌 [ChatSidebar] Cleaning up STABLE Pusher listener
```

## Technical Benefits

### 1. Eliminates Thrashing
- Pusher connection stays alive for entire session
- No subscribe/unsubscribe cycles
- No missed events

### 2. Prevents Stale Closures
- `useRef` provides fresh values without re-renders
- Functional updates guarantee latest state

### 3. Better Performance
- Fewer WebSocket connections
- No unnecessary cleanup/setup cycles
- Lower CPU usage

### 4. Predictable Behavior
- Badge updates work consistently
- No "first message only" bugs
- Reliable real-time updates

## Migration Notes

### What Changed
- **Dependencies**: Removed state dependencies from Pusher `useEffect`
- **State Access**: Changed from direct state access to `useRef`
- **Updates**: Ensured all state updates are functional

### What Didn't Change
- Event names (`new-message`)
- Channel names (`team-chat`)
- Event payload structure
- Backend triggers
- Overall architecture

## Rollback Plan

If issues arise, the previous version (with thrashing bug) can be restored by:

1. Remove `useRef` declarations
2. Change `useEffect` dependencies back to include state variables
3. Use direct state access instead of ref access

However, this would reintroduce the "one-hit wonder" bug.

## Related Issues Fixed

1. ✅ Badge only updating for first message
2. ✅ Pusher disconnecting/reconnecting frequently
3. ✅ Missed real-time events
4. ✅ Fallback to slow polling
5. ✅ Inconsistent badge behavior

---

**Implementation Date:** January 17, 2026  
**Status:** ✅ Complete - Ready for Testing  
**Priority:** Critical (Fixes user-facing real-time update bug)
