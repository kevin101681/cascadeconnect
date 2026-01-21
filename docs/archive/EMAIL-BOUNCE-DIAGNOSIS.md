# 🔍 Email Bounce Diagnosis

## Issue
Homeowner replied to admin message via Gmail → Email bounced

---

## Quick Diagnosis Checklist

### 1. Check the Bounce Message
**Look at the bounce email from Gmail. It will say something like:**

#### Option A: "Address not found" or "No MX record"
```
550 5.1.1 The email account that you tried to reach does not exist.
```
**Cause:** MX records not configured or DNS not propagated yet  
**Solution:** See Step 2 below

#### Option B: "Connection refused" or "Server error"
```
554 5.7.1 Service unavailable
```
**Cause:** SendGrid Inbound Parse not configured correctly  
**Solution:** See Step 3 below

#### Option C: "Mailbox full" or "Message rejected"
```
552 5.2.2 Mailbox full
```
**Cause:** Rare - usually SendGrid issue  
**Solution:** Contact SendGrid support

---

## Step-by-Step Fix

### Step 1: Verify MX Records

**Check if MX record exists:**
1. Go to https://mxtoolbox.com/SuperTool.aspx
2. Enter: `replies.cascadeconnect.app`
3. Select "MX Lookup"
4. Click "MX Lookup"

**Expected Result:**
```
Hostname: replies.cascadeconnect.app
IP Address: mx.sendgrid.net
Preference: 10
```

**If it FAILS:**
- MX record not configured or DNS not propagated
- Go to Step 2

**If it PASSES:**
- MX record is working
- Go to Step 3

---

### Step 2: Configure MX Records

#### **Where to Add the Record:**

**Option A: Netlify DNS (if cascadeconnect.app is hosted on Netlify)**
1. Go to https://app.netlify.com/
2. Click your site
3. Go to **Domain settings** → **DNS records**
4. Click **Add new record**
5. Fill in:
   - **Record type:** MX
   - **Name:** replies
   - **Value:** mx.sendgrid.net
   - **Priority:** 10
   - **TTL:** 3600 (1 hour)
6. Click **Save**

**Option B: External DNS Provider (GoDaddy, Namecheap, etc.)**
1. Log into your domain registrar
2. Find DNS settings for `cascadeconnect.app`
3. Add MX record:
   - **Host:** replies
   - **Points to:** mx.sendgrid.net
   - **Priority:** 10
   - **TTL:** 3600

**Wait 5-30 minutes for DNS propagation**, then test again.

---

### Step 3: Verify SendGrid Inbound Parse Configuration

1. Go to https://app.sendgrid.com/
2. Click **Settings** → **Inbound Parse**
3. Look for: `replies.cascadeconnect.app`

**It should show:**
```
Subdomain: replies
Domain: cascadeconnect.app
Destination URL: https://cascadeconnect.netlify.app/api/email/inbound
Status: Active ✅
```

**If it's NOT there:**
1. Click **Add Host & URL**
2. Fill in:
   - **Subdomain:** replies
   - **Domain:** cascadeconnect.app
   - **Destination URL:** `https://cascadeconnect.netlify.app/api/email/inbound`
   - ☑️ **POST the raw, full MIME message**
   - ☑️ **Send raw** (optional)
3. Click **Add**

**If it's there but shows "Inactive" or "Error":**
- Click the entry to edit
- Verify the URL is correct
- Re-save

---

### Step 4: Test the Webhook Directly

Test if the webhook is accessible:

**Method 1: Browser**
```
https://cascadeconnect.netlify.app/api/email/inbound
```
Should return: `Method not allowed` or `405` (this is good - means it's there)

**Method 2: cURL**
```bash
curl -X POST https://cascadeconnect.netlify.app/api/email/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "from=test@example.com&subject=Test"
```

Should return some JSON (even if it's an error - means webhook is responding)

---

### Step 5: Check SendGrid Activity Feed

1. Go to https://app.sendgrid.com/
2. Click **Activity Feed**
3. Look for recent inbound emails
4. Check for errors or failures

---

## Quick Fix: Alternative Reply-To (Temporary)

While you debug, you can temporarily revert to having replies go to a real mailbox:

### Option 1: Use info@cascadebuilderservices.com
```typescript
// In components/Dashboard.tsx
const replyToEmail = isAdmin 
  ? 'info@cascadebuilderservices.com'  // Temporary - goes to real mailbox
  : undefined;
```

### Option 2: Use admin's personal email (what we had before)
```typescript
const replyToEmail = isAdmin 
  ? (currentUser?.email || 'info@cascadebuilderservices.com')
  : undefined;
```

---

## Common Issues & Solutions

### Issue: "DNS not propagated yet"
**Solution:** Wait 15-30 minutes, then test MX lookup again

### Issue: "SendGrid says URL is invalid"
**Solution:** Make sure URL is exactly: `https://cascadeconnect.netlify.app/api/email/inbound`
- Must start with `https://`
- Must NOT have trailing slash
- Must be accessible publicly

### Issue: "Webhook returns 404"
**Solution:** Check `public/_redirects` file has:
```
/api/email/inbound    /.netlify/functions/email-inbound    200!
```

### Issue: "Webhook returns 500"
**Solution:** Check Netlify function logs for errors

---

## Testing After Fix

### Test Email Flow:
1. **Send from admin:** Message in Cascade Connect
2. **Check homeowner email:** Reply-To should be `replies+...@cascadeconnect.app`
3. **Reply as homeowner:** Send reply from Gmail
4. **Check for bounce:** Should NOT bounce now ✅
5. **Check Messages modal:** Reply should appear ✅
6. **Check admin email:** Notification should arrive ✅

---

## Need More Help?

**Share with me:**
1. **Bounce message** - Copy the full error from Gmail
2. **MX Lookup result** - What does mxtoolbox.com show?
3. **SendGrid config** - Screenshot of Inbound Parse settings
4. **Reply-To address** - What's the exact address in the email header?

**I'll help you debug from there!** 🔧

