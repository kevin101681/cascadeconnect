# 🔍 Duplicate Emails & Bounce Issue Diagnosis

## Issue 1: Homeowner Receiving Two Copies

### Possible Causes:

#### A. SendGrid Duplicate Prevention Not Enabled
SendGrid might be sending the email twice if there are duplicate API calls.

**Check SendGrid Activity Feed:**
1. Go to https://app.sendgrid.com/
2. Click **Activity** → **Activity Feed**
3. Look for the test email you just sent
4. Count how many times it appears

**Expected:** Should see ONE email sent  
**If you see TWO:** There's a bug in the code causing duplicate calls

---

#### B. Double Email Send in Code
Let me check if there are two email sends happening...

**Where are emails sent from Dashboard?**
- `handleSendReply` in `components/Dashboard.tsx` line 1407
- That's the ONLY place

**Where is `onSendMessage` called?**
- Dashboard calls `onSendMessage` (line 1390)
- Which calls `handleSendMessage` in App.tsx (line 3226)
- `handleSendMessage` does NOT send emails

**Conclusion:** Should only be ONE email sent

---

#### C. SendGrid Inbound Parse Forwarding?
When the webhook receives the email, does it forward a copy back?

**Check `email-inbound.js`:**
- Line 298-332: It DOES send an email to the original admin
- But this should only happen when HOMEOWNER replies
- Not when admin sends

**Test:**
- When admin sends → homeowner gets 2 copies? (Issue)
- When homeowner replies → admin gets 1 copy? (OK)

---

### Debug Steps for Issue 1:

**Step 1: Check Browser Console**
When admin sends message, look for:
```
📧 [emailService] Sending email to homeowner@email.com
```
**Count:** Should appear ONCE  
**If it appears TWICE:** Bug in frontend

**Step 2: Check Netlify Function Logs**
1. Go to Netlify Dashboard
2. Functions → email-send
3. Look at recent logs
4. Count: `✅ Email sent via SendGrid`

**Should see:** ONE log entry per message  
**If TWO:** Function being called twice

**Step 3: Check SendGrid Activity**
1. SendGrid Activity Feed
2. Filter by recipient email
3. Count emails sent

**Should see:** ONE email  
**If TWO:** SendGrid issue or duplicate API calls

---

## Issue 2: Bounce - "Address not found"

### The Error Message:
```
Address not found:
replies@cascadeconnect.app
```

**Notice:** It says `replies@cascadeconnect.app` (NO thread ID!)

### Root Cause:
The `Reply-To` header is being set to the wrong address.

**Expected:** `replies+abc123@cascadeconnect.app` (with thread ID)  
**Actual:** `replies@cascadeconnect.app` (without thread ID)

---

### Why This Happens:

#### Possibility A: `replyToEmail` Not Being Passed
The code sets:
```javascript
const replyToEmail = isAdmin ? `replies+${thread.id}@cascadeconnect.app` : undefined;
```

But maybe `thread.id` is undefined?

#### Possibility B: SendGrid Not Using `replyToEmail`
The email-send function might not be getting the `replyToEmail` parameter.

---

### Debug Steps for Issue 2:

**Step 1: Check Email Headers**
In Gmail, open the email from admin:
1. Click the **three dots** (⋮) next to Reply
2. Click **"Show original"**
3. Look for `Reply-To:` header
4. **What does it say?**

**Expected:**
```
Reply-To: replies+abc123-def456-...@cascadeconnect.app
```

**If you see:**
```
Reply-To: replies@cascadeconnect.app
```
**Problem:** Thread ID not included

**If you see:**
```
Reply-To: noreply@cascadeconnect.app
```
**Problem:** replyToEmail not being used at all

---

**Step 2: Check Netlify Function Logs**
After deploying the debug version, send a test email and check logs for:
```
📧 Email configuration: {
  to: 'homeowner@email.com',
  from: 'noreply@cascadeconnect.app',
  replyTo: 'replies+abc123...@cascadeconnect.app',
  replyToEmail: 'replies+abc123...@cascadeconnect.app',
  subject: 'Re: Test Message'
}
```

**If `replyToEmail` shows:** `'not provided'`  
**Problem:** Frontend not passing it

**If `replyTo` shows:** `noreply@cascadeconnect.app`  
**Problem:** Function not using replyToEmail

---

## Quick Tests to Run

### Test 1: Check What Reply-To is Actually Set
```javascript
// Add this to components/Dashboard.tsx line 1407
console.log('🔍 Sending email with replyToEmail:', replyToEmail);
```

### Test 2: Check Email Payload
```javascript
// Add this to services/emailService.ts before fetch
console.log('📧 Email payload:', {
  to: payload.to,
  replyToEmail: payload.replyToEmail,
  replyToId: payload.replyToId
});
```

---

## Temporary Workaround for Issue 2

Until we find the root cause, use a working email:

```typescript
// In components/Dashboard.tsx line 1399
const replyToEmail = isAdmin ? 'info@cascadebuilderservices.com' : undefined;
```

This will:
- ✅ Not bounce
- ❌ Replies won't show in Messages modal
- ✅ You'll get replies in your info inbox

---

## What I Need From You:

### For Issue 1 (Duplicate Emails):
1. Check SendGrid Activity Feed - how many emails sent?
2. Check browser console - how many times does it log sending?
3. Check Netlify function logs - how many times called?

### For Issue 2 (Bounce):
1. **Show original email in Gmail** - what's the Reply-To header?
2. Check Netlify logs after sending - what does the debug log show?
3. If Reply-To is wrong, I'll fix it

**Send me screenshots or copy/paste the headers/logs and I'll identify the exact issue!** 🔍

