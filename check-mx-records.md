# Check MX Records for replies.cascadeconnect.app

## Option 1: Use nslookup (Windows)
```cmd
nslookup -type=MX replies.cascadeconnect.app
```

## Option 2: Use MXToolbox
Go to: https://mxtoolbox.com/SuperTool.aspx
Enter: `replies.cascadeconnect.app`
Click "MX Lookup"

## What You Should See:
```
replies.cascadeconnect.app MX preference = 10, mail exchanger = mx.sendgrid.net
```

## If You See:
- **"Non-existent domain"** → MX record not set up correctly
- **Points to something other than mx.sendgrid.net** → Wrong MX record
- **Points to mx.sendgrid.net** → MX record is correct! ✅

---

## If MX Record is Missing or Wrong:

### Go to GoDaddy DNS Settings:
1. Log in to GoDaddy
2. Go to My Products → Domain Settings for cascadeconnect.app
3. Click "DNS" or "Manage DNS"
4. **Add MX Record:**
   - **Type:** MX
   - **Host:** replies (or @replies, depending on GoDaddy's interface)
   - **Points to:** mx.sendgrid.net
   - **Priority:** 10
   - **TTL:** 600 (10 minutes) or 3600 (1 hour)

5. Save and wait 10-60 minutes for DNS propagation

---

## Test After MX Record is Set:

Wait 10-30 minutes, then:

1. Send email from admin to homeowner
2. Check the Reply-To header (should be threadid@replies.cascadeconnect.app)
3. Reply from homeowner's Gmail
4. Check SendGrid Activity Feed → Should now show the reply! 📧

