# 📧 Setup Guide: Capture Homeowner Email Replies in Messages Modal

## Current Status
✅ **Phase 1 Complete:** Homeowners can now reply to admin emails (Reply-To fix)  
⚠️ **Phase 2 Needed:** Capture those replies and show them in the Messages modal

---

## The Problem
When a homeowner replies to an admin's message via their email client (Gmail, Outlook, etc.):
- ✅ Reply goes to admin's email inbox
- ❌ Reply does NOT appear in Cascade Connect Messages modal
- ❌ Other admins can't see the reply
- ❌ Conversation is split between email and app

---

## The Solution: SendGrid Inbound Parse

### How It Works:
1. Admin sends message from Cascade Connect
2. Homeowner receives email with special Reply-To address
3. Homeowner replies via Gmail/Outlook
4. **Reply goes to special subdomain** (e.g., `replies@cascadeconnect.app`)
5. SendGrid parses the email and calls your webhook
6. Webhook adds reply to message thread in database
7. Reply appears in Messages modal for both admin and homeowner ✅

---

## 📋 Setup Steps

### Step 1: Configure SendGrid Inbound Parse

#### 1.1 Add MX Records to DNS
Add these records to your domain DNS (e.g., in Netlify DNS or your domain registrar):

**For subdomain: `replies.cascadeconnect.app`**

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX | replies | mx.sendgrid.net | 10 |

**Wait 5-10 minutes for DNS propagation**

#### 1.2 Configure SendGrid Inbound Parse
1. Go to https://app.sendgrid.com/
2. Click **Settings** → **Inbound Parse**
3. Click **Add Host & URL**
4. Fill in:
   - **Subdomain**: `replies`
   - **Domain**: `cascadeconnect.app`
   - **Destination URL**: `https://cascadeconnect.netlify.app/.netlify/functions/email-inbound`
   - **Check**: ☑️ POST the raw, full MIME message
5. Click **Add**

---

### Step 2: Update Email Reply-To Address

Currently, when admins send messages, the Reply-To is set to their personal email. We need to change it to use the special replies subdomain.

#### Option A: Simple Approach (All replies go to app)
**Update `components/Dashboard.tsx` line 1398:**

```typescript
// OLD:
const replyToEmail = isAdmin ? (currentUser?.email || 'info@cascadebuilderservices.com') : undefined;

// NEW:
const replyToEmail = isAdmin ? `replies+${thread.id}@cascadeconnect.app` : undefined;
```

**Pros:**
- ✅ All replies captured in app
- ✅ Conversation stays in one place
- ✅ All admins can see replies

**Cons:**
- ❌ Admins don't get replies in their personal inbox
- ❌ Have to check app for replies

---

#### Option B: Hybrid Approach (Replies go to both)
Keep the current personal email Reply-To, but also:
1. **CC the replies address** when sending
2. Homeowner replies
3. Reply goes to admin's inbox
4. SendGrid also captures it via the CC

**Update `netlify/functions/email-send.js` around line 94:**

```javascript
// Add this below the 'to' field:
const msg = {
  to: to,
  cc: replyToEmail && replyToEmail.includes('replies@') ? undefined : `replies+${replyToId}@cascadeconnect.app`, // CC if using personal email
  from: {
    email: fromEmail,
    name: fromName || 'Cascade Connect'
  },
  // ... rest of config
```

**Pros:**
- ✅ Admin gets reply in personal inbox
- ✅ Reply also captured in app
- ✅ Best of both worlds

**Cons:**
- ❌ Slightly more complex
- ❌ Homeowner sees the CC address

---

#### Option C: Best Practice (Use replies subdomain, forward to admin)
1. **Reply-To**: `replies+threadId@cascadeconnect.app`
2. Homeowner replies to that address
3. SendGrid webhook captures it
4. Webhook adds to database
5. Webhook also **forwards** email to admin's personal inbox

This requires updating the webhook to forward:

**Update `netlify/functions/email-inbound.js` around line 298:**

```javascript
// After adding message to database, also forward to admin
const msg = {
  to: originalSender.email, // Admin's personal email
  from: {
    email: fromEmail,
    name: homeownerName // Show homeowner's name as sender
  },
  replyTo: homeowner.email, // Admin can reply directly to homeowner
  subject: emailSubject,
  text: cleanBody,
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <p><strong>From:</strong> ${homeownerName} (${homeowner.email})</p>
      <p><strong>Thread:</strong> ${threadSubject}</p>
      <hr>
      ${cleanBody.replace(/\n/g, '<br>')}
      <hr>
      <p style="color: #666; font-size: 12px;">
        This message was also saved to Cascade Connect Messages.
        <a href="https://cascadeconnect.netlify.app#messages?threadId=${threadId}">View in app</a>
      </p>
    </div>
  `
};
```

**Pros:**
- ✅ Reply captured in app
- ✅ Admin notified via email
- ✅ Admin can reply from email or app
- ✅ Clean, professional workflow

**Cons:**
- ⚠️ Requires SendGrid MX records setup

---

## 🧪 Testing

### Test the Inbound Parse:

#### 1. Test SendGrid Configuration
```bash
# Send test email to replies subdomain
echo "Test message" | mail -s "Test Inbound Parse" replies@cascadeconnect.app
```

Check SendGrid Inbound Parse logs to see if it received the email.

#### 2. Test with Real Message
1. **As Admin:** Send message to homeowner from Cascade Connect
2. **As Homeowner:** Check email and click "Reply"
3. **As Homeowner:** Type reply and send
4. **As Admin:** Refresh Messages modal
5. **Verify:** Reply appears in thread ✅

---

## 📝 Recommended Implementation

**I recommend Option C (Best Practice):**

1. **Easy for homeowners:** They just reply normally
2. **Admins get notified:** Email forwarded to their inbox
3. **Everything tracked:** All replies in app
4. **Team visibility:** Other admins can see conversation

### Changes Needed:

#### File 1: `components/Dashboard.tsx`
```typescript
// Line 1398 - Use replies subdomain with thread ID
const replyToEmail = isAdmin 
  ? `replies+${thread.id}@cascadeconnect.app`
  : undefined;
```

#### File 2: `App.tsx`
```typescript
// Line 3358 - Use replies subdomain with thread ID
replyToEmail: `replies+${newThread.id}@cascadeconnect.app`
```

#### File 3: `netlify/functions/email-inbound.js`
```javascript
// Already configured! Just needs SendGrid setup.
// The webhook will:
// 1. Extract thread ID from email address (replies+{threadId}@...)
// 2. Find the thread in database
// 3. Add homeowner's reply to thread
// 4. Notify admin via email
// 5. Message appears in app ✅
```

---

## 🚀 Quick Start (5 Minutes)

### If you just want it working NOW:

1. **Add MX record:**
   ```
   Type: MX
   Host: replies
   Value: mx.sendgrid.net
   Priority: 10
   ```

2. **Configure SendGrid Inbound Parse:**
   - URL: `https://cascadeconnect.netlify.app/.netlify/functions/email-inbound`
   - Subdomain: `replies.cascadeconnect.app`

3. **Update Reply-To address in Dashboard.tsx:**
   ```typescript
   const replyToEmail = isAdmin 
     ? `replies+${thread.id}@cascadeconnect.app`
     : undefined;
   ```

4. **Update Reply-To in App.tsx:**
   ```typescript
   replyToEmail: `replies+${newThread.id}@cascadeconnect.app`
   ```

5. **Deploy and test!**

---

## 🔍 Troubleshooting

### Issue: "Email bounced"
- **Check:** MX records configured correctly
- **Wait:** DNS can take 10-30 minutes to propagate
- **Test:** Use https://mxtoolbox.com/SuperTool.aspx

### Issue: "Webhook not called"
- **Check:** SendGrid Inbound Parse configuration
- **Verify:** Destination URL is correct
- **Check:** SendGrid Activity Feed for errors

### Issue: "Thread not found"
- **Check:** Thread ID is being extracted correctly
- **Verify:** Email address format: `replies+{threadId}@cascadeconnect.app`
- **Check:** Database has the thread

---

## 📊 Current vs. Future State

### Current State:
```
Admin → Email → Homeowner
             ↓ Reply
Admin ← Personal Email ← Homeowner
(No record in Cascade Connect)
```

### After Setup:
```
Admin → Cascade Connect → Email → Homeowner
                            ↓ Reply
Admin ← Email Notification    ↓
         ↓                    ↓
Cascade Connect ← SendGrid Webhook ← replies@cascadeconnect.app
         ↓
    Messages Modal (All admins can see) ✅
```

---

**Ready to implement? Let me know which option you prefer and I'll help you set it up!** 🚀

