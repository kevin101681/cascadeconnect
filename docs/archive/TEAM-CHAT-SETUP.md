# 🚀 TEAM CHAT - QUICK SETUP GUIDE
**5-Minute Setup**

## Step 1: Run Database Migration

```bash
npm run create-internal-chat-tables
```

**Expected output:**
```
✅ channel_type enum ready
✅ internal_channels table created
✅ internal_messages table created
✅ channel_members table created
✅ Indexes for performance
✅ Created "general" channel
✅ Added X users to general channel
```

## Step 2: Configure Pusher

### Get Pusher Credentials
1. Go to https://dashboard.pusher.com
2. Sign in or create account
3. Create a new app:
   - Name: "Cascade Connect Team Chat"
   - Cluster: Choose closest to your location (e.g., `us2`)
   - Frontend: React
   - Backend: Node.js
4. Copy your credentials from the "App Keys" tab

### Add to `.env.local`
```env
# Pusher Real-Time Configuration
PUSHER_APP_ID=1234567
PUSHER_KEY=abc123def456
PUSHER_SECRET=xyz789uvw012
PUSHER_CLUSTER=us2

# Client-side (same values)
VITE_PUSHER_KEY=abc123def456
VITE_PUSHER_CLUSTER=us2
```

## Step 3: Verify Cloudinary

Your existing Cloudinary setup will work! Just make sure these are in `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Step 4: Restart Dev Server

```bash
npm run dev
```

## Step 5: Test It!

### In the Dashboard Tab
1. Log in as admin/employee
2. Click the **"Chat"** tab
3. You should see:
   - Sidebar with "Channels" section
   - "general" channel listed
   - "Direct Messages" section with all team members
4. Click "general" → send a test message
5. Click a team member → starts a DM

### Floating Widget (Optional)
If you integrated the widget in App.tsx:
1. Look for blue chat icon in bottom-right
2. Click it → popup appears
3. Navigate to different pages → widget persists!

## ✅ Verify Features

### Test Checklist
- [ ] Send a message in general channel
- [ ] See message appear in real-time
- [ ] Start a DM with a team member
- [ ] Type `@` and search for a homeowner
- [ ] Insert a mention chip `@[Project Name]`
- [ ] Click the paperclip → upload an image
- [ ] See typing indicator when someone else types
- [ ] Check unread count badge updates

## 🐛 Troubleshooting

### "Failed to load Team Chat"
→ Check that `components/TeamChat.tsx` exists  
→ Verify Dashboard imports are correct

### "Pusher connection error"
→ Double-check Pusher credentials in `.env.local`  
→ Make sure both `PUSHER_KEY` and `VITE_PUSHER_KEY` are set  
→ Restart dev server after adding env vars

### "No team members in DM list"
→ Verify you have other users with role `ADMIN` in the database  
→ Run: `npm run check-admin-users` to see all admin users

### Messages not syncing
→ Open browser console for errors  
→ Check Pusher dashboard → Debug Console for events  
→ Verify `private-team-chat` channel is active

## 📚 Next Steps

- Read full docs: `INTERNAL-CHAT-SYSTEM.md`
- Add the floating widget to App.tsx (optional)
- Invite your team to try it!

## 🎉 That's It!

You now have a fully functional Slack-lite team chat system with:
- ✅ Real-time messaging
- ✅ Auto-discovered DMs
- ✅ @ Mentions for projects
- ✅ Media uploads
- ✅ Hybrid UI (tab + widget)

**Questions?** Check `INTERNAL-CHAT-SYSTEM.md` for detailed documentation.

