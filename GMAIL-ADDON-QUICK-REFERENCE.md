# Gmail Add-on Quick Reference

## 📧 Email Subject Templates

Copy and paste these to test your add-on:

### Warranty Claim Emails

```
🚨 New Warranty Claim: 123 Main St, Denver, CO 80202
```

```
⚠️ New Warranty Claim: 456 Oak Avenue, Boulder, CO 80301
```

```
Warranty Claim: 789 Pine Road, Lakewood, CO 80226
```

### Unknown Caller Emails

```
⚠️ Unknown Caller: (555) 123-4567
```

```
🚨 Unknown Caller: 555-987-6543
```

```
Unknown Caller: 3035551234
```

---

## 🔑 Configuration Quick Copy

### Netlify Environment Variables

```bash
# Generate secret (run this in terminal):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to Netlify:
GMAIL_ADDON_SECRET=<paste-generated-secret-here>
DATABASE_URL=<your-existing-neon-url>
VITE_APP_URL=https://cascadeconnect.netlify.app
```

### Code.gs CONFIG Section

```javascript
var CONFIG = {
  API_URL: 'https://cascadeconnect.netlify.app/.netlify/functions/gmail-addon',
  ADDON_SECRET: '<paste-same-secret-from-netlify>',
  DASHBOARD_URL: 'https://cascadeconnect.netlify.app/dashboard'
};
```

---

## 🧪 Testing with cURL

Test your API endpoint directly:

```bash
# Replace YOUR_SECRET with your actual secret
curl -X POST https://cascadeconnect.netlify.app/.netlify/functions/gmail-addon \
  -H "Content-Type: application/json" \
  -H "x-cascade-addon-secret: YOUR_SECRET" \
  -d '{
    "type": "claim",
    "address": "123 Main St, Denver, CO"
  }'
```

```bash
# Test phone lookup
curl -X POST https://cascadeconnect.netlify.app/.netlify/functions/gmail-addon \
  -H "Content-Type: application/json" \
  -H "x-cascade-addon-secret: YOUR_SECRET" \
  -d '{
    "type": "unknown",
    "phoneNumber": "(555) 123-4567"
  }'
```

---

## 🎯 Deployment Checklist

- [ ] Copy Netlify function to repo
- [ ] Add `GMAIL_ADDON_SECRET` to Netlify
- [ ] Deploy to Netlify
- [ ] Create Google Apps Script project
- [ ] Paste `Code.gs` code
- [ ] Update CONFIG with secret
- [ ] Paste `appsscript.json` manifest
- [ ] Deploy as Gmail Add-on
- [ ] Test with sample email
- [ ] Verify API responds correctly
- [ ] Install for testing
- [ ] Check Gmail sidebar appears
- [ ] Test all action buttons

---

## 📊 Status Emojis

The add-on uses these emojis for claim status:

- 📨 **SUBMITTED** - Just received
- 🔍 **REVIEWING** - Being evaluated
- 📅 **SCHEDULING** - Ready for appointment
- ✅ **SCHEDULED** - Appointment confirmed
- 🎉 **COMPLETED** - Work finished

---

## 🔗 Important URLs

- **Apps Script Console:** https://script.google.com
- **Google Cloud Console:** https://console.cloud.google.com
- **Netlify Dashboard:** https://app.netlify.com
- **Your Dashboard:** https://cascadeconnect.netlify.app/dashboard

---

## 💡 Pro Tips

1. **Subject Line Flexibility:** The regex patterns are case-insensitive and flexible with spacing
2. **Phone Format:** Automatically strips non-digits for matching (handles (555) 123-4567, 555-123-4567, 5551234567)
3. **Multiple Matches:** Shows up to 5 homeowners if phone matches multiple records
4. **Recent Claims:** Displays last 3 claims for matched homeowner
5. **Logging:** Check Netlify Function logs and Apps Script Executions for debugging

---

## 🚨 Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Secret mismatch | Verify secrets match in both places |
| `No data found` | Address/phone not in DB | Check database has matching records |
| Add-on not appearing | Subject doesn't match | Use exact template formats above |
| `DATABASE_URL not set` | Missing env var | Add to Netlify environment variables |
| API timeout | Database connection issue | Check Neon database status |

---

## 🎨 Customization Ideas

### Add More Triggers

Edit `extractDataFromSubject()` in `Code.gs`:

```javascript
// Add contractor assignment emails
var contractorMatch = subject.match(/Contractor Assigned[:\s]+(.+)/i);
if (contractorMatch) {
  return { type: 'contractor', name: contractorMatch[1] };
}
```

### Add More Actions

```javascript
var reassignButton = CardService.newTextButton()
  .setText('🔄 Reassign')
  .setOnClickAction(
    CardService.newAction()
      .setFunctionName('handleReassign')
      .setParameters({ claimId: apiData.claimId })
  );
```

### Change Colors

Edit `appsscript.json`:

```json
"primaryColor": "#10b981",    // Green theme
"secondaryColor": "#059669"
```

---

## 📈 Analytics (Optional)

Track add-on usage by adding to your API:

```typescript
// In gmail-addon.ts
console.log('📊 Add-on request:', {
  type: type,
  timestamp: new Date().toISOString(),
  hasMatch: !!result.homeownerName
});
```

Then query Netlify Function logs for patterns.

---

## ✅ Verification Steps

After deployment, verify each:

1. **API Security:** Test with/without secret header
2. **Claim Lookup:** Send test email with real address
3. **Phone Lookup:** Send test email with real phone
4. **No Match:** Test with non-existent data
5. **UI Rendering:** Check all sections display correctly
6. **Actions Work:** Click each button, verify behavior
7. **Mobile:** Test on Gmail mobile app
8. **Performance:** Check response time < 2 seconds

---

## 🎓 Learn More

- [Gmail Add-ons Overview](https://developers.google.com/gmail/add-ons)
- [CardService Reference](https://developers.google.com/apps-script/reference/card-service)
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Drizzle ORM Guide](https://orm.drizzle.team/docs/overview)

---

**Created:** December 27, 2024  
**Version:** 1.0  
**Status:** Production Ready ✅

