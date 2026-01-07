# 🚀 Chat Widget Quick Reference
**Date:** January 6, 2026

## Quick Start

### Using the Reply Feature

```typescript
// 1. Import the ChatWindow component
import { ChatWindow } from './components/chat/ChatWindow';

// 2. Use it in your app
<ChatWindow
  channelId="channel-123"
  channelName="general"
  channelType="public"
  currentUserId="user-456"
  currentUserName="John Doe"
  onOpenHomeownerModal={(id) => console.log('Open homeowner:', id)}
  isCompact={false}
/>
```

### Reply Flow

```typescript
// User clicks Reply button on a message
onClick={() => setReplyingTo(message)}

// Banner appears showing:
// - Message sender name
// - Truncated message content (50 chars)
// - X button to cancel

// User types and sends
await sendMessage({
  channelId,
  senderId,
  content: "My reply",
  replyTo: replyingTo?.id  // ← Attach reply reference
});

// Clear reply state
setReplyingTo(null);
```

---

## Component Props

### ChatWindow

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `channelId` | `string` | ✅ | Unique channel identifier |
| `channelName` | `string` | ✅ | Display name for channel |
| `channelType` | `'public' \| 'dm'` | ✅ | Channel type |
| `currentUserId` | `string` | ✅ | Current user's ID |
| `currentUserName` | `string` | ✅ | Current user's name |
| `onOpenHomeownerModal` | `(id: string) => void` | ❌ | Callback for @mentions |
| `isCompact` | `boolean` | ❌ | Popup mode (default: false) |

---

## State Management

### Key State Variables

```typescript
// Message list
const [messages, setMessages] = useState<Message[]>([]);

// Input value
const [inputValue, setInputValue] = useState('');

// Reply state (NEW!)
const [replyingTo, setReplyingTo] = useState<Message | null>(null);

// Attachments
const [attachments, setAttachments] = useState<Array<...>>([]);

// Mentions
const [selectedMentions, setSelectedMentions] = useState<HomeownerMention[]>([]);
```

### Reply State Actions

```typescript
// Set reply target
setReplyingTo(message);

// Clear reply
setReplyingTo(null);

// Check if replying
if (replyingTo) {
  // Show banner
}
```

---

## API Reference

### sendMessage

```typescript
await sendMessage({
  channelId: string;
  senderId: string;
  content: string;
  attachments?: Array<{
    url: string;
    type: 'image' | 'video' | 'file';
    filename?: string;
    publicId?: string;
  }>;
  mentions?: Array<{
    homeownerId: string;
    projectName: string;
    address: string;
  }>;
  replyTo?: string;  // ← NEW: Message ID being replied to
});
```

### Message Interface

```typescript
interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  attachments: Array<...>;
  mentions: Array<...>;
  
  // NEW: Reply data
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  } | null;
  replyToId?: string | null;
  
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: Date;
  createdAt: Date;
}
```

---

## Styling Classes

### Input Area (Pill Shape)

```jsx
<textarea
  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 
             rounded-full bg-gray-50 dark:bg-gray-800 
             focus:outline-none focus:ring-2 focus:ring-blue-500 
             focus:bg-white dark:focus:bg-gray-700 
             transition-colors"
/>
```

### Send Button (Circular)

```jsx
<button
  className="p-3 bg-primary text-primary-on rounded-full 
             hover:bg-primary/90 transition-colors 
             disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Send className="h-5 w-5" />
</button>
```

### Reply Banner

```jsx
<div className="mb-2 rounded-t-2xl bg-gray-100 dark:bg-gray-800 
                border-t border-x border-gray-200 dark:border-gray-600 
                p-2 text-xs text-gray-600 dark:text-gray-400 
                flex justify-between items-start">
  {/* Content */}
</div>
```

### Quoted Message

```jsx
<div className="border-l-2 border-blue-400 bg-black/5 dark:bg-black/20 
                p-2 mb-2 text-[10px] italic rounded-r">
  <div className="font-semibold not-italic mb-0.5">
    {replyTo.senderName}
  </div>
  <div className="line-clamp-2">
    {replyTo.content}
  </div>
</div>
```

### Reply Button (Hover)

```jsx
<button
  onClick={() => setReplyingTo(message)}
  className="opacity-0 group-hover:opacity-100 transition-opacity 
             p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
  title="Reply to this message"
>
  <Reply className="h-3 w-3 text-gray-500 dark:text-gray-400" />
</button>
```

---

## Database Schema

### Table: `internal_messages`

```sql
CREATE TABLE internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES internal_channels(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  mentions JSONB DEFAULT '[]',
  reply_to_id UUID REFERENCES internal_messages(id),  -- NEW
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for reply lookups
CREATE INDEX idx_internal_messages_reply_to_id 
ON internal_messages(reply_to_id);
```

---

## Common Patterns

### Pattern 1: Reply to a Message

```typescript
// In message rendering
<button onClick={() => setReplyingTo(message)}>
  <Reply className="h-3 w-3" />
</button>

// In input area
{replyingTo && (
  <div className="reply-banner">
    <span>Replying to {replyingTo.senderName}</span>
    <button onClick={() => setReplyingTo(null)}>
      <X className="h-3 w-3" />
    </button>
  </div>
)}

// When sending
await sendMessage({
  ...params,
  replyTo: replyingTo?.id
});
setReplyingTo(null);
```

### Pattern 2: Display Quoted Message

```typescript
// In message bubble
{message.replyTo && (
  <div className="quoted-message">
    <div className="font-semibold">{message.replyTo.senderName}</div>
    <div className="line-clamp-2">{message.replyTo.content}</div>
  </div>
)}
```

### Pattern 3: Fetch Messages with Replies

```typescript
// Backend automatically fetches reply data
const messages = await getChannelMessages(channelId);

// Each message includes replyTo if applicable
messages.forEach(msg => {
  if (msg.replyTo) {
    console.log(`${msg.senderName} replied to ${msg.replyTo.senderName}`);
  }
});
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line in message |
| `Tab` | Navigate between input elements |
| `Escape` | Cancel reply (optional) |

---

## Pusher Events

### new-message

```typescript
{
  channelId: string;
  message: {
    // ... all message fields
    replyTo?: {
      id: string;
      senderName: string;
      content: string;
    } | null;
  }
}
```

### typing-indicator

```typescript
{
  channelId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}
```

---

## Troubleshooting

### Reply not showing in message

**Check:**
1. Is `replyToId` stored in database?
2. Does replied-to message still exist?
3. Is `getChannelMessages` fetching reply data?

```typescript
// Debug: Log message with reply
console.log('Message:', message);
console.log('Reply To:', message.replyTo);
```

### Reply banner not appearing

**Check:**
1. Is `replyingTo` state set correctly?
2. Is conditional rendering working?

```typescript
// Debug: Log reply state
console.log('Replying To:', replyingTo);
```

### Pill shape not rendering

**Check:**
1. Tailwind CSS is loaded
2. `rounded-full` class is applied
3. No conflicting styles

```jsx
// Verify classes
<textarea className="... rounded-full ..." />
```

---

## Migration Guide

### From Old Chat Widget

1. **Run database migration:**
   ```bash
   psql -d your_database -f drizzle/migrations/add_reply_to_messages.sql
   ```

2. **Update imports:**
   ```typescript
   // Add new icons
   import { Reply, CornerUpLeft } from 'lucide-react';
   ```

3. **No breaking changes:**
   - Existing messages work without modification
   - Reply feature is additive only

---

## Performance Tips

1. **Index Usage:** Reply lookups use `idx_internal_messages_reply_to_id`
2. **Lazy Loading:** Only fetch reply data when needed
3. **Caching:** Pusher events include full reply context (no extra fetch)
4. **Truncation:** Long messages are truncated in quotes (50 chars)

---

## Testing

### Unit Tests

```typescript
describe('ChatWindow Reply Feature', () => {
  it('should set replyingTo when clicking reply button', () => {
    // Test reply state
  });

  it('should clear replyingTo after sending', () => {
    // Test state cleanup
  });

  it('should display quoted message in bubble', () => {
    // Test rendering
  });
});
```

### Integration Tests

```typescript
describe('Reply API', () => {
  it('should store replyToId in database', async () => {
    const message = await sendMessage({
      channelId: 'test',
      senderId: 'user1',
      content: 'Reply',
      replyTo: 'msg-123'
    });
    expect(message.replyToId).toBe('msg-123');
  });

  it('should fetch reply data with messages', async () => {
    const messages = await getChannelMessages('test');
    const reply = messages.find(m => m.replyToId);
    expect(reply?.replyTo).toBeDefined();
  });
});
```

---

## Best Practices

1. **Always clear reply state** after sending
2. **Truncate long messages** in quotes (50 chars)
3. **Handle deleted messages** gracefully (show "[deleted]")
4. **Use semantic HTML** for accessibility
5. **Test dark mode** thoroughly
6. **Optimize database queries** with proper indexes

---

## Resources

- **Component:** `components/chat/ChatWindow.tsx`
- **Service:** `services/internalChatService.ts`
- **Schema:** `db/schema/internal-chat.ts`
- **Migration:** `drizzle/migrations/add_reply_to_messages.sql`
- **Docs:** `CHAT-WIDGET-REFACTOR-COMPLETE.md`

---

**Happy Coding! 💬**

