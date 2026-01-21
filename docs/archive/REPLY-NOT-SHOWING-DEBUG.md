# 🔍 Reply Not Showing Debug Guide

## ✅ Good News
Email is NOT bouncing anymore!

## ❌ Issue
Homeowner's reply is not:
1. Showing in Messages modal
2. Coming to admin's email
3. Generating any errors

---

## Possible Causes:

### 1. SendGrid Not Receiving the Reply
**Check:** SendGrid Activity Feed
- Go to https://app.sendgrid.com/ → Activity
- Look for the reply email from homeowner
- **Is it there?**

**If NO:** Email isn't reaching SendGrid (DNS propagation delay?)

---

### 2. SendGrid Not Calling the Webhook
**Check:** SendGrid Inbound Parse Logs
- Go to https://app.sendgrid.com/ → Settings → Inbound Parse
- Click on `replies.cascadeconnect.app`
- Look for recent webhook calls
- **Do you see webhook attempts?**

**If NO:** SendGrid isn't triggering the webhook

**Possible reasons:**
- URL is wrong in SendGrid config
- Webhook isn't responding correctly
- SendGrid rate limiting

---

### 3. Webhook Being Called But Failing Silently
**Check:** Netlify Function Logs

After you deploy the new debug version and the homeowner replies:

1. Go to Netlify Dashboard → Functions → `email-inbound`
2. Look for these log messages:
   ```
   🔔 WEBHOOK CALLED - email-inbound.js
   📧 Method: POST
   📧 Inbound email received: {...}
   ```

**If you see these:** Webhook is being called! ✅

**Then check:**
- `threadId:` - Is it extracting the thread ID correctly?
- `from:` - Is it the homeowner's email?

---

### 4. Thread ID Not Being Extracted
**Check the logs for:**
```
⚠️ Could not extract thread ID from email
TO email: [what was the TO address?]
```

**Expected TO email:** `abc123-def456@replies.cascadeconnect.app`

**If it's something else:** The format is wrong

---

### 5. Database Insert Failing
**Look for in logs:**
```
✅ Message created in thread {threadId} from {homeownerName}
```

**If you see an error instead:** Database issue

---

## 🧪 Test Again After Deploy:

1. **Send new message** from admin to homeowner
2. **Homeowner replies** from Gmail
3. **Immediately check:**
   - SendGrid Activity Feed (did it receive the email?)
   - Netlify function logs for `email-inbound` (was webhook called?)
   - Look for the debug logs I just added
4. **Share the logs** with me

---

## Quick Test: Manually Call the Webhook

You can test if the webhook is working by calling it manually:

```bash
curl -X POST https://cascadeconnect.netlify.app/api/email/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "from=test@example.com&to=abc123@replies.cascadeconnect.app&subject=Test&text=Test message"
```

**Should see in Netlify logs:**
```
🔔 WEBHOOK CALLED - email-inbound.js
```

---

## Most Likely Causes (in order):

1. **SendGrid not calling webhook** - URL configuration issue
2. **Thread ID not extracted** - Email format not matching webhook regex
3. **DNS propagation delay** - MX record not fully propagated
4. **SendGrid activity logs will tell us** - Check there first!

---

**After you test again and check the logs, let me know what you see!** 📊

