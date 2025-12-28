# Cascade Connect Gmail Add-on Setup Guide

## 🎯 Overview

This Gmail Add-on integrates directly into your Gmail inbox, showing a sidebar with live data from your Neon database when you receive warranty claim emails or unknown caller notifications.

---

## 📋 Part 1: Backend API Setup (Netlify Function)

### File Created: `netlify/functions/gmail-addon.ts`

This secure API endpoint handles requests from the Gmail Add-on.

### Environment Variables Required

Add these to your Netlify site:

```bash
# Generate a random secret (use a password generator or run this in terminal):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

GMAIL_ADDON_SECRET=your-random-secret-here-min-32-chars
DATABASE_URL=your-neon-database-url  # (should already exist)
VITE_APP_URL=https://cascadeconnect.netlify.app  # (your production URL)
```

### To Add Environment Variables:

1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Click "Add a variable"
3. Add `GMAIL_ADDON_SECRET` with a randomly generated string
4. Save and redeploy

### Security Features:

✅ Requires `x-cascade-addon-secret` header  
✅ Validates request type  
✅ Handles CORS properly  
✅ Sanitizes phone numbers for matching  
✅ Limits query results  

### API Endpoints:

**URL:** `https://cascadeconnect.netlify.app/.netlify/functions/gmail-addon`

**Method:** `POST`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "x-cascade-addon-secret": "your-secret-here"
}
```

**Request Body:**
```json
{
  "type": "claim",
  "address": "123 Main St, Denver, CO"
}
```

OR

```json
{
  "type": "unknown",
  "phoneNumber": "(555) 123-4567"
}
```

**Response:**
```json
{
  "summary": "Warranty claim for roof leak",
  "homeownerName": "John Doe",
  "status": "REVIEWING",
  "linkToDashboard": "https://cascadeconnect.netlify.app/dashboard",
  "claimId": "uuid-here",
  "claimNumber": "12",
  "phoneMatches": [...],
  "recentClaims": [...]
}
```

---

## 📋 Part 2: Google Apps Script Setup

### Step 1: Create New Project

1. Go to https://script.google.com
2. Click **"New Project"**
3. Name it: **"Cascade Connect Command Center"**

### Step 2: Add Code Files

#### File 1: `Code.gs`

1. Delete the default `function myFunction() {}` code
2. Copy the entire contents from `google-apps-script/Code.gs`
3. **UPDATE THE CONFIG SECTION:**

```javascript
var CONFIG = {
  API_URL: 'https://cascadeconnect.netlify.app/.netlify/functions/gmail-addon',
  ADDON_SECRET: 'YOUR_SECRET_HERE',  // ⚠️ REPLACE WITH YOUR GMAIL_ADDON_SECRET
  DASHBOARD_URL: 'https://cascadeconnect.netlify.app/dashboard'
};
```

#### File 2: `appsscript.json`

1. Click the **Project Settings** (gear icon) in the left sidebar
2. Check **"Show appsscript.json manifest file in editor"**
3. Go back to the **Editor** tab
4. You should now see `appsscript.json` in the file list
5. Replace its contents with the code from `google-apps-script/appsscript.json`

### Step 3: Deploy the Add-on

1. Click **Deploy** → **New Deployment**
2. Click the gear icon (⚙️) next to "Select type"
3. Select **"Gmail Add-on"**
4. Fill in:
   - **Version:** New version
   - **Description:** Initial deployment
5. Click **Deploy**
6. Copy the **Deployment ID** (save this for later)

### Step 4: Test the Add-on

1. Click **Deploy** → **Test Deployments**
2. Click **Install**
3. Follow the OAuth consent prompts
4. Open Gmail and find (or send yourself) a test email with:
   - Subject: `🚨 New Warranty Claim: 123 Main St, Denver, CO`
   - OR Subject: `⚠️ Unknown Caller: (555) 123-4567`
5. Open the email and look for the **Cascade Connect** icon on the right sidebar

---

## 📋 Part 3: Email Subject Line Patterns

The Add-on triggers when it detects these patterns:

### Pattern 1: Warranty Claims
```
🚨 New Warranty Claim: 123 Main St, Denver, CO
⚠️ New Warranty Claim: 456 Oak Ave, Boulder, CO
Warranty Claim: 789 Pine Rd (Generic format)
```

### Pattern 2: Unknown Callers
```
⚠️ Unknown Caller: (555) 123-4567
🚨 Unknown Caller: 555-123-4567
Unknown Caller: 5551234567
```

### How It Works:

The `buildAddOn(e)` function in `Code.gs` checks the email subject using `extractDataFromSubject()`:

1. If subject matches a **Claim pattern** → extracts `address`
2. If subject matches an **Unknown Caller pattern** → extracts `phoneNumber`
3. If no match → Add-on doesn't appear (returns `null`)

---

## 🎨 UI Features

### For Warranty Claims:

- **Details Section:**
  - Homeowner name
  - Current status (with emoji)
  - Claim number
  - AI-generated summary
  
- **Actions Section:**
  - 🔗 View in Dashboard (opens full app)
  - ✅ Quick Approve (updates status to REVIEWING)
  - 📅 Schedule Inspection (opens dashboard in scheduling mode)

### For Unknown Callers:

- **Details Section:**
  - Homeowner name (if found)
  - Summary of matches
  
- **Phone Matches Section:**
  - List of all homeowners with this phone number
  - Shows address and builder for each
  
- **Recent Claims Section:**
  - Last 3 claims from matched homeowner
  - Shows claim number, title, status, and date
  
- **Actions Section:**
  - 🔗 View in Dashboard
  - 📞 Call Back (opens phone dialer)

---

## 🔐 Security Checklist

- [ ] `GMAIL_ADDON_SECRET` is set in Netlify (min 32 characters)
- [ ] `ADDON_SECRET` in `Code.gs` matches the Netlify secret
- [ ] `DATABASE_URL` is set in Netlify (already should be)
- [ ] `VITE_APP_URL` is set to your production domain
- [ ] Test the add-on with a sample email
- [ ] Verify API returns 401 for requests without the secret header

---

## 🧪 Testing

### Test 1: Claim Lookup

1. Send yourself an email with subject:
   ```
   🚨 New Warranty Claim: [Your Real Address from DB]
   ```
2. Open the email in Gmail
3. Click the Cascade Connect icon in the right sidebar
4. Verify it shows the latest claim for that address

### Test 2: Phone Lookup

1. Send yourself an email with subject:
   ```
   ⚠️ Unknown Caller: [A Real Phone Number from DB]
   ```
2. Open the email in Gmail
3. Click the Cascade Connect icon
4. Verify it shows matching homeowners and recent claims

### Test 3: Security

1. Try calling the API endpoint without the secret header
2. Verify you get a 401 Unauthorized response

---

## 🚀 Going to Production

### 1. Publish the Add-on (Optional - for your entire G Suite)

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Select your Apps Script project
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Fill out the required information
5. Submit for verification (if publishing publicly)
6. In Apps Script, click **Deploy** → **New Deployment**
7. Select **"Gmail Add-on"** and choose **"Workspace Marketplace"**

### 2. Internal Deployment (Recommended)

For just your team:

1. Go to your Google Workspace Admin Console
2. Navigate to **Apps** → **Marketplace Apps**
3. Click **Add app** → **Add from Catalog**
4. Paste your **Deployment ID**
5. Install for your organization or specific groups

---

## 🐛 Troubleshooting

### Add-on doesn't appear in Gmail

- Check email subject matches one of the patterns
- Verify add-on is installed (Deploy → Test Deployments)
- Check browser console for errors
- Try refreshing Gmail

### "Failed to fetch data" error

- Verify `API_URL` in `Code.gs` is correct
- Check `ADDON_SECRET` matches `GMAIL_ADDON_SECRET` in Netlify
- Look at Netlify Function logs for errors
- Test the API endpoint with Postman/curl

### "Unauthorized" error

- Secret mismatch between `Code.gs` and Netlify
- Verify header name is `x-cascade-addon-secret` (lowercase)
- Check Netlify environment variables are set

### No data returned

- Verify the address/phone exists in your database
- Check Netlify Function logs for SQL errors
- Test database connection with a simple query
- Ensure `DATABASE_URL` is set correctly

---

## 📊 Monitoring

### View Logs:

**Netlify Function Logs:**
1. Netlify Dashboard → Functions
2. Click `gmail-addon`
3. View real-time logs

**Google Apps Script Logs:**
1. Apps Script Editor → Executions
2. View function runs and errors

---

## 🎉 Success!

Your Gmail Add-on is now live! Every time you receive an email with a warranty claim or unknown caller, you'll see instant context from your database right in Gmail.

### Next Steps:

- Customize the UI in `Code.gs`
- Add more action buttons (e.g., "Assign to Contractor")
- Implement the Quick Approve API call
- Add analytics tracking
- Create email templates that work with the add-on patterns

---

## 🆘 Need Help?

Check the logs in both Netlify and Google Apps Script. The functions are extensively logged for debugging.

**Common Issues:**
- Secret mismatch → Check both locations
- No data → Verify database has matching records
- Add-on not triggering → Check email subject pattern

