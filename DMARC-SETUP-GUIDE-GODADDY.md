# 📧 DMARC Setup Guide for GoDaddy

## What is DMARC?

**DMARC** (Domain-based Message Authentication, Reporting and Conformance) tells email providers what to do with emails that fail authentication checks from your domain.

**Benefits:**
- ✅ Prevents spammers from impersonating your domain
- ✅ Improves email deliverability to Gmail, Outlook, etc.
- ✅ Provides reports on who's sending email from your domain
- ✅ Required by many email providers now

---

## 🎯 Quick Setup for GoDaddy

### Step 1: Log into GoDaddy

1. Go to https://www.godaddy.com/
2. Sign in to your account
3. Click **"My Products"**
4. Find **cascadeconnect.app** in your domains list
5. Click **"DNS"** or **"Manage DNS"**

---

### Step 2: Add DMARC TXT Record

1. Scroll down to the **DNS Records** section
2. Click **"ADD"** (or "Add New Record")
3. Fill in:

**For Basic Protection (Recommended to Start):**

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@cascadebuilderservices.com; ruf=mailto:dmarc-failures@cascadebuilderservices.com; fo=1
TTL: 1 Hour (or 3600)
```

**Breakdown of what this means:**
- `v=DMARC1` - DMARC version
- `p=none` - Don't reject emails (monitoring mode)
- `rua=mailto:...` - Send aggregate reports here
- `ruf=mailto:...` - Send failure reports here
- `fo=1` - Report on any authentication failure

4. Click **"Save"** or **"Add Record"**

---

## 📋 Step-by-Step with Screenshots Locations

### In GoDaddy DNS Manager:

**Field 1 - Type:**
- Select: **TXT**

**Field 2 - Name (or Host):**
- Enter: `_dmarc`
- (GoDaddy will automatically append `.cascadeconnect.app`)

**Field 3 - Value (or TXT Value):**
```
v=DMARC1; p=none; rua=mailto:dmarc-reports@cascadebuilderservices.com; ruf=mailto:dmarc-failures@cascadebuilderservices.com; fo=1
```

**Field 4 - TTL:**
- Select: **1 Hour** or enter `3600`

---

## 🔄 DMARC Policy Progression (Recommended)

Start with `p=none` (monitoring) and gradually increase protection:

### **Phase 1: Monitoring (Start Here) - Week 1-2**
```
v=DMARC1; p=none; rua=mailto:dmarc-reports@cascadebuilderservices.com
```
**What it does:** Monitors and reports, but doesn't block anything  
**Use for:** 1-2 weeks to see what's happening

---

### **Phase 2: Quarantine (After 2 weeks) - Optional**
```
v=DMARC1; p=quarantine; pct=10; rua=mailto:dmarc-reports@cascadebuilderservices.com
```
**What it does:** Sends 10% of suspicious emails to spam  
**Use for:** 1-2 weeks to test impact

---

### **Phase 3: Reject (Final Goal) - Optional**
```
v=DMARC1; p=reject; rua=mailto:dmarc-reports@cascadebuilderservices.com
```
**What it does:** Blocks all emails that fail authentication  
**Use for:** Maximum protection (only after testing)

---

## ✅ Verify DMARC is Working

### Method 1: Online Checker (Easiest)
1. Go to https://mxtoolbox.com/SuperTool.aspx
2. Enter: `cascadeconnect.app`
3. Select: **"DMARC Lookup"**
4. Click **"DMARC Lookup"**

**Expected Result:**
```
✅ DMARC Record Found
v=DMARC1; p=none; rua=mailto:dmarc-reports@cascadebuilderservices.com...
```

---

### Method 2: Command Line
```bash
# Windows PowerShell
nslookup -type=txt _dmarc.cascadeconnect.app

# Mac/Linux Terminal
dig TXT _dmarc.cascadeconnect.app
```

---

## 📊 Understanding DMARC Reports

You'll start receiving XML reports at `dmarc-reports@cascadebuilderservices.com` showing:
- Who's sending email from your domain
- Whether emails passed SPF/DKIM checks
- How many emails were sent

**Report Services (Optional - Makes Reports Readable):**
- **Free:** https://dmarcian.com/ (free trial)
- **Free:** https://postmarkapp.com/dmarc (free tier)
- **Paid:** https://valimail.com/

---

## 🎛️ DMARC Policy Options Explained

### **Policy (p=)**
- `none` - Monitor only, don't block anything
- `quarantine` - Send suspicious emails to spam
- `reject` - Block suspicious emails completely

### **Percentage (pct=)**
- `pct=10` - Apply policy to 10% of emails
- `pct=100` - Apply policy to 100% of emails (default)

### **Subdomain Policy (sp=)**
- `sp=none` - Different policy for subdomains
- `sp=quarantine` - Quarantine subdomain emails

### **Alignment Mode**
- `aspf=r` - Relaxed SPF alignment (default)
- `aspf=s` - Strict SPF alignment
- `adkim=r` - Relaxed DKIM alignment (default)
- `adkim=s` - Strict DKIM alignment

---

## 🚀 Recommended DMARC Record for Cascade Connect

### **For Starting Out (Use This):**
```
v=DMARC1; p=none; rua=mailto:dmarc-reports@cascadebuilderservices.com; ruf=mailto:dmarc-failures@cascadebuilderservices.com; fo=1; pct=100
```

### **After 2 Weeks of Monitoring:**
```
v=DMARC1; p=quarantine; pct=10; rua=mailto:dmarc-reports@cascadebuilderservices.com; aspf=r; adkim=r
```

### **Final Goal (After 1-2 Months):**
```
v=DMARC1; p=reject; rua=mailto:dmarc-reports@cascadebuilderservices.com; aspf=r; adkim=r; fo=1
```

---

## 🔧 Troubleshooting

### Issue: "Record not found"
**Wait:** DNS takes 5-30 minutes to propagate  
**Check:** Make sure name is exactly `_dmarc` (with underscore)  
**Verify:** No typos in the value field

### Issue: "Multiple DMARC records"
**Problem:** Only ONE DMARC record allowed per domain  
**Fix:** Delete old DMARC records, keep only one

### Issue: "Invalid DMARC record"
**Check:** 
- Starts with `v=DMARC1;`
- No spaces before semicolons
- Valid email addresses
- Policy is `none`, `quarantine`, or `reject`

---

## 📧 Setting Up Report Mailbox

You specified `dmarc-reports@cascadebuilderservices.com` for reports.

**Option 1: Forward to existing email**
- Set up email forwarding in GoDaddy or your email provider
- Forward to your main admin email

**Option 2: Use DMARC report service**
- Sign up for free service (dmarcian.com or postmarkapp.com)
- They'll parse reports into readable dashboards
- Update DMARC record with their email

**Option 3: Ignore for now**
- Reports are optional
- You can remove `rua=` and `ruf=` from the record
- Simplified: `v=DMARC1; p=none`

---

## ⚠️ Important Notes

### **Don't Rush to p=reject:**
- Start with `p=none` for monitoring
- Wait 1-2 weeks to review reports
- Make sure legitimate emails aren't failing
- Gradually increase policy strictness

### **SPF and DKIM Required:**
DMARC relies on SPF and DKIM. Make sure you have:

**SPF Record (should already exist):**
```
Type: TXT
Name: @ (or leave blank for root domain)
Value: v=spf1 include:sendgrid.net ~all
```

**DKIM (configured in SendGrid):**
- Should already be set up in SendGrid
- Verify at: https://app.sendgrid.com/ → Settings → Sender Authentication

---

## ✅ Quick Checklist

- [ ] Log into GoDaddy DNS Manager
- [ ] Add TXT record with name `_dmarc`
- [ ] Paste DMARC value starting with `v=DMARC1; p=none...`
- [ ] Save record
- [ ] Wait 10-30 minutes
- [ ] Test at https://mxtoolbox.com/DMARC.aspx
- [ ] Monitor reports for 1-2 weeks
- [ ] Optionally increase policy to `quarantine` then `reject`

---

## 🎉 You're Done!

After adding the DMARC record:
- ✅ Better email deliverability
- ✅ Protection against domain spoofing
- ✅ Reports on email authentication
- ✅ Meets modern email provider requirements

**Start with `p=none` and you're good to go!** 📧✅

