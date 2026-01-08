# 🔧 Pusher Architecture Fix

## Problem
**Error:** `TypeError: Ght.createHash is not a function`

### Root Cause
The client-side service (`services/internalChatService.ts`) was importing and calling `triggerPusherEvent` from `lib/pusher-server.ts`. 

The **`pusher` npm package** (server-side) uses Node.js `crypto` module, which is **not available in browser environments** (React/Vite). This caused the cryptographic hash function to fail when Vite tried to bundle it for the browser.

---

## ✅ Solution Applied

### 1. **Removed Server-Side Pusher Calls from Client Code**
- Commented out the import of `triggerPusherEvent` from `pusher-server.ts` in `services/internalChatService.ts`
- Commented out all `triggerPusherEvent` calls in:
  - `sendMessage()` function
  - `sendTypingIndicator()` function

### 2. **Proper Architecture Separation**

```
┌─────────────────────────────────────────────────────┐
│  CLIENT (Browser/Vite)                              │
│  ✅ Uses: pusher-js (pusher-client.ts)              │
│  - Subscribe to channels                            │
│  - Listen for events                                │
│  - Display real-time updates                        │
└─────────────────────────────────────────────────────┘
                      ▲
                      │ Events
                      │
┌─────────────────────────────────────────────────────┐
│  SERVER (Netlify Functions)                         │
│  ✅ Uses: pusher (pusher-server.ts)                 │
│  - Trigger events                                   │
│  - Authenticate channels                            │
│  - Manage server-side operations                    │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Package Reference

| Package | Use Case | Environment |
|---------|----------|-------------|
| `pusher-js` | **Client-side** Pusher SDK | Browser (Vite) |
| `pusher` | **Server-side** Pusher SDK | Node.js (Netlify Functions) |

---

## 🚀 Proper Implementation Pattern

### Current Flow (Working, No Real-Time)
1. User sends message via UI
2. `internalChatService.sendMessage()` saves to database
3. Message appears for sender immediately
4. Other users see it on next page load/refresh

### Future Flow (With Real-Time via Pusher)
1. User sends message via UI
2. Client calls API endpoint (e.g., `/api/chat/send-message`)
3. **Netlify Function** (server-side):
   - Saves message to database
   - Triggers Pusher event: `pusher.trigger('team-chat', 'new-message', data)`
4. All connected clients receive event via `pusher-client.ts`
5. React components update UI in real-time

---

## 📝 TODO: Enable Real-Time Chat

To restore real-time functionality:

### Step 1: Create Netlify Function
Create `netlify/functions/chat-send-message.ts`:

```typescript
import { Handler } from '@netlify/functions';
import { triggerPusherEvent } from '../../lib/pusher-server';
import { db } from '../../db';
import { messages } from '../../db/schema';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { channelId, content, userId } = JSON.parse(event.body || '{}');

  // Save message to database
  const newMessage = await db.insert(messages).values({
    channelId,
    content,
    senderId: userId,
    createdAt: new Date(),
  }).returning();

  // Trigger Pusher event (server-side, safe to use crypto)
  await triggerPusherEvent('team-chat', 'new-message', {
    channelId,
    message: newMessage[0],
  });

  return {
    statusCode: 200,
    body: JSON.stringify(newMessage[0]),
  };
};
```

### Step 2: Update Client Service
Replace direct database calls with API calls:

```typescript
export async function sendMessage(params: SendMessageParams): Promise<Message> {
  const response = await fetch('/.netlify/functions/chat-send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) throw new Error('Failed to send message');
  return await response.json();
}
```

### Step 3: Subscribe to Pusher Events
In your React components:

```typescript
import { getPusherClient } from '../lib/pusher-client';

useEffect(() => {
  const pusher = getPusherClient();
  const channel = pusher.subscribe('team-chat');
  
  channel.bind('new-message', (data: any) => {
    // Update local state with new message
    setMessages(prev => [...prev, data.message]);
  });
  
  return () => {
    channel.unbind('new-message');
    pusher.unsubscribe('team-chat');
  };
}, []);
```

---

## 🔍 Files Modified

- ✅ `services/internalChatService.ts` - Removed server-side Pusher calls
- ℹ️ `lib/pusher-client.ts` - Client-side SDK (already correct)
- ℹ️ `lib/pusher-server.ts` - Server-side SDK (only for Netlify functions)

---

## ✅ Verification

The app should now:
- ✅ Build successfully with Vite
- ✅ Run without crypto errors
- ✅ Save messages to database
- ⚠️ **No real-time updates** (requires Netlify function implementation above)

Real-time chat can be restored by following the TODO steps above.

---

**Fixed:** January 7, 2026

