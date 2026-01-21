# 💬 INTERNAL TEAM CHAT SYSTEM
**Implementation Complete - January 3, 2026**

## 🎯 Overview

A complete "Slack-lite" internal messaging system for admin and employee users with real-time updates via Pusher, @ mentions for projects, and media attachments via Cloudinary.

## ✨ Features

### Core Functionality
- ✅ **Real-time messaging** via Pusher WebSockets
- ✅ **Public channels** (e.g., 'general', 'repairs')
- ✅ **Direct messages (DMs)** between team members
- ✅ **Auto-discovery** - All admin/employee users automatically appear in DM list
- ✅ **@ Mentions** - Reference homeowners/projects with searchable chips
- ✅ **Media attachments** - Images, videos, files via Cloudinary
- ✅ **Typing indicators** - See when others are typing
- ✅ **Read receipts** - Track unread message counts
- ✅ **Hybrid UI** - Works as both a full-page tab AND a floating popup widget

### User Experience
- 🎨 **Two View Modes:**
  1. **Team Chat Tab** - Full-height interface in the admin dashboard
  2. **Floating Widget** - Persistent bottom-right popup that stays connected across pages

## 📁 File Structure

### Database Schema
```
db/schema/internal-chat.ts
├── internalChannels      # Public channels & DM threads
├── internalMessages      # Individual messages with attachments & mentions
└── channelMembers        # User access & read status tracking
```

### Backend Services
```
services/internalChatService.ts
├── getUserChannels()               # Get all channels for a user
├── getAllTeamMembers()             # Get all admin/employee users
├── findOrCreateDmChannel()         # Auto-create DM channels
├── getChannelMessages()            # Load message history
├── sendMessage()                   # Send message + trigger Pusher
├── markChannelAsRead()             # Update read status
├── searchHomeownersForMention()    # Search for @ mentions
└── sendTypingIndicator()           # Real-time typing status
```

### Frontend Components
```
components/
├── TeamChat.tsx                    # Full-page tab view
├── chat/
│   ├── ChatWindow.tsx             # Core chat interface (messages + input)
│   ├── ChatSidebar.tsx            # Channel list + DM auto-discovery
│   └── ChatWidget.tsx             # Floating popup widget
```

### Supporting Services
```
services/uploadService.ts           # Client-side Cloudinary uploads
lib/
├── pusher-server.ts               # Server-side Pusher configuration
└── pusher-client.ts               # Client-side Pusher subscription
```

## 🗃️ Database Schema

### `internal_channels`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Channel name (e.g., 'general', 'John & Jane') |
| `type` | ENUM | 'public' or 'dm' |
| `dm_participants` | JSONB | Array of 2 user IDs (for DMs only) |
| `created_by` | UUID | User who created the channel |
| `created_at` | TIMESTAMP | Creation timestamp |

### `internal_messages`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `channel_id` | UUID | Foreign key to channel |
| `sender_id` | UUID | Foreign key to user |
| `content` | TEXT | Message text |
| `attachments` | JSONB | Array of Cloudinary URLs + metadata |
| `mentions` | JSONB | Array of homeowner references |
| `is_edited` | BOOLEAN | Whether message was edited |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `edited_at` | TIMESTAMP | Last edit time |
| `created_at` | TIMESTAMP | Creation timestamp |

### `channel_members`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `channel_id` | UUID | Foreign key to channel |
| `user_id` | UUID | Foreign key to user |
| `last_read_at` | TIMESTAMP | Last time user read messages |
| `joined_at` | TIMESTAMP | When user joined channel |
| `is_muted` | BOOLEAN | Notification mute status |

**Indexes:**
- `internal_messages(channel_id)` - Fast message lookup
- `internal_messages(created_at DESC)` - Chronological ordering
- `channel_members(user_id)` - User's channel list
- `channel_members(channel_id)` - Channel membership
- `internal_channels(type)` - Filter by channel type
- `internal_channels(dm_participants) GIN` - Fast DM lookup

## 🚀 Setup Instructions

### 1. Database Migration
Run the migration script to create the tables:

```bash
npm run create-internal-chat-tables
```

This will:
- Create the 3 main tables
- Add all necessary indexes
- Create a default "general" channel
- Add all admin/employee users to the general channel

### 2. Environment Variables
Add Pusher credentials to your `.env.local`:

```env
# Pusher Real-Time Configuration
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=us2

# Client-side (same values with VITE_ prefix)
VITE_PUSHER_KEY=your_key
VITE_PUSHER_CLUSTER=us2
```

**Get Pusher credentials:**
1. Go to https://dashboard.pusher.com
2. Create a new app or use existing
3. Copy App ID, Key, Secret, and Cluster

### 3. Integration with App.tsx (Optional - for Floating Widget)

To add the floating chat widget that persists across all pages, add to `App.tsx`:

```tsx
import { ChatWidget } from './components/chat/ChatWidget';

// Inside your App component (for admin users only):
{activeEmployee && activeEmployee.id !== 'placeholder' && (
  <ChatWidget
    currentUserId={activeEmployee.id}
    currentUserName={activeEmployee.name}
    onOpenHomeownerModal={(homeownerId) => {
      const homeowner = homeowners.find(h => h.id === homeownerId);
      if (homeowner) {
        setSelectedHomeownerId(homeownerId);
        setActiveHomeowner(homeowner);
        navigate('/dashboard');
      }
    }}
  />
)}
```

## 🎨 Usage

### As a Tab
1. Go to the admin dashboard
2. Click the **"Chat"** tab (next to Schedule)
3. Select a channel from the sidebar or click a team member to start a DM
4. Type and send messages with full features

### As a Floating Widget
1. Look for the blue chat icon in the bottom-right corner
2. Click to open the popup
3. Navigate through your app - the widget stays connected
4. Unread badge shows total unread count across all channels

### @ Mentions
1. Type `@` in the message input
2. Start typing a homeowner name, project name, or address
3. Select from the dropdown suggestions
4. The mention appears as a chip: `@[Project Name]`
5. Recipients can click the chip to open the homeowner details modal

### Media Uploads
1. Click the paperclip icon in the chat input
2. Select images, videos, or files
3. Files are uploaded to Cloudinary (`team-chat-media` folder)
4. Thumbnails appear in the message

## 🔧 Technical Details

### Auto-Discovery DM Logic
**Problem:** Don't create empty DM channels for every user pair upfront.

**Solution:**
1. The sidebar fetches ALL admin/employee users dynamically
2. When you click a user:
   - Check if a DM channel exists with both user IDs
   - If YES: Load that channel
   - If NO: Create new channel immediately, then load it
3. New employees automatically appear in the list without manual setup

### Pusher Events
**Channel:** `team-chat` (public channel)

**Events:**
- `new-message` - Broadcast when someone sends a message
  ```js
  { channelId: string, message: Message }
  ```
- `typing-indicator` - Show typing status
  ```js
  { channelId: string, userId: string, userName: string, isTyping: boolean }
  ```

**Note:** We use a public Pusher channel since the chat is already protected by app-level authentication (admin/employee only). This avoids needing a separate Pusher auth endpoint.

### Message Format with Mentions
Messages are stored as plain text with special syntax:

```
"Check out the issue at @[123 Main St] - needs immediate attention!"
```

The `mentions` array stores the actual data:
```json
[
  {
    "homeownerId": "uuid-here",
    "projectName": "123 Main St",
    "address": "123 Main St, City, ST 12345"
  }
]
```

When rendering, the UI:
1. Parses `@[...]` patterns
2. Renders as clickable chips
3. Opens HomeownerDetailsModal on click

## 📝 API Reference

### `sendMessage()`
```typescript
await sendMessage({
  channelId: 'channel-uuid',
  senderId: 'user-uuid',
  content: 'Message text',
  attachments: [
    {
      url: 'https://cloudinary.com/...',
      type: 'image',
      filename: 'photo.jpg',
      publicId: 'cloudinary-id'
    }
  ],
  mentions: [
    {
      homeownerId: 'homeowner-uuid',
      projectName: '123 Main St',
      address: '123 Main St, City, ST'
    }
  ]
});
```

### `findOrCreateDmChannel()`
```typescript
const channelId = await findOrCreateDmChannel(
  'user1-uuid',  // First user
  'user2-uuid',  // Second user
  'creator-uuid' // Who initiated the DM
);
```

### `searchHomeownersForMention()`
```typescript
const results = await searchHomeownersForMention('oak');
// Returns homeowners matching name, project, or address
```

## 🔒 Security

- ✅ **Role-based access:** Only admin/employee users can access chat
- ✅ **Database constraints:** Foreign keys ensure data integrity
- ✅ **Soft deletes:** Messages are marked as deleted, not permanently removed
- ✅ **Cloudinary uploads:** Server-side validation before upload

## 🐛 Troubleshooting

### Messages not appearing in real-time
1. Check Pusher credentials in `.env.local`
2. Verify both `PUSHER_KEY` and `VITE_PUSHER_KEY` are set
3. Open browser console and look for Pusher connection errors

### "Failed to upload file" error
1. Verify Cloudinary credentials are set
2. Check that the upload endpoint is accessible
3. Ensure file size is under limits (default: no limit, but check your plan)

### DM channel not created
1. Ensure both users have role `ADMIN` in the database
2. Check that `findOrCreateDmChannel` is being called with valid UUIDs
3. Look for SQL errors in the console

### Unread counts not updating
1. `markChannelAsRead()` should be called when viewing messages
2. Check that `last_read_at` timestamp is being updated
3. Verify Pusher events are triggering count refreshes

## 🚀 Next Steps (Optional Enhancements)

- [ ] Add emoji picker
- [ ] Message reactions (👍, ❤️, etc.)
- [ ] Edit/delete messages
- [ ] Search messages by content
- [ ] Pin important messages
- [ ] Channel descriptions
- [ ] User presence indicators (online/offline)
- [ ] Push notifications for @mentions
- [ ] Message threading (reply to specific messages)
- [ ] Voice/video call integration

## 📚 Related Files

- `db/schema.ts` - Main schema export
- `package.json` - Added `create-internal-chat-tables` script
- `env.example` - Pusher configuration template
- `components/Dashboard.tsx` - Added CHAT tab
- `types.ts` - May need to add chat-related types if extending

## ✅ Status

**Implementation:** ✅ COMPLETE  
**Database:** ✅ Schema created, migration script ready  
**Backend:** ✅ Full service layer with Pusher integration  
**Frontend:** ✅ Two UI modes (tab + widget) with all features  
**Documentation:** ✅ This file + inline code comments  

---

**Built with:**
- Next.js 15
- Drizzle ORM
- Neon Postgres
- Pusher (real-time)
- Cloudinary (media)
- Tailwind CSS
- Lucide Icons

