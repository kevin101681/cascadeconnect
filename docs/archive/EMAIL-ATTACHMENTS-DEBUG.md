# Email Attachments Debug Guide

## Issue
Email notifications show "X attachments" in the table, but the actual pictures are not attached to the email.

## Root Cause Analysis

### The Flow
1. **`App.tsx` (lines 1733-1807)**: Converts claim images to base64 and creates attachment objects
2. **`emailService.ts` (line 47)**: Sends attachments in JSON payload to Netlify Function
3. **`netlify/functions/email-send.js` (lines 75-82)**: Maps attachments to SendGrid format
4. **SendGrid API**: Sends email with attachments

### Potential Issues Fixed

#### 1. **www Prefix Issue** ✅ FIXED
**Problem**: `emailService.ts` was adding `www.` prefix to Netlify subdomain URLs
```typescript
// OLD (BROKEN):
const domain = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
apiEndpoint = `${protocol}//${domain}/api/email/send`;
// Would try: https://www.cascadeconnect.netlify.app/api/email/send ❌

// NEW (FIXED):
apiEndpoint = `${protocol}//${hostname}/api/email/send`;
// Now uses: https://cascadeconnect.netlify.app/api/email/send ✅
```

#### 2. **Missing Logging** ✅ FIXED
Added comprehensive logging at each step:
- `App.tsx` line 1785: Shows attachment count and details before sending
- `emailService.ts` line 31-34: Shows endpoint and attachment count
- `email-send.js` line 84-90: Shows attachments received by Netlify Function

## Testing Procedure

### After Deploy
1. **Create a New Claim** with 2-3 photos attached
2. **Check Browser Console** for:
   ```
   📎 [EMAIL] Processed 3 attachments for email
     📎 Attachment 1: image_1234.jpg, content length: 54321, type: image/jpeg
     📎 Attachment 2: image_5678.jpg, content length: 67890, type: image/jpeg
     ...
   📧 [emailService] Sending email to kevin@cascadebuilderservices.com via https://cascadeconnect.netlify.app/api/email/send
   📎 [emailService] 3 attachments to send
   ✅ Email sent successfully: sg_message_id_here
   ```

3. **Check Netlify Function Logs** (`email-send`) for:
   ```
   📎 Attachments: 3 provided, 3 processed
     📎 Attachment 1: image_1234.jpg (image/jpeg), content length: 54321 chars
     📎 Attachment 2: image_5678.jpg (image/jpeg), content length: 67890 chars
     ...
   ✅ Email sent via SendGrid: { statusCode: 202, ..., attachmentsCount: 3 }
   ```

4. **Check Email Inbox**:
   - Should have 3 image files attached
   - Each should be a valid JPEG/PNG image
   - File sizes should match console logs

## Troubleshooting

### If Attachments Still Missing

#### Check 1: Base64 Conversion
Look for errors in browser console:
```
Failed to convert image image.jpg to base64: Error: ...
```
**Fix**: Check if Cloudinary URLs are accessible (not 403/404)

#### Check 2: CORS Issues
If fetch fails:
```
Access to fetch at 'https://res.cloudinary.com/...' blocked by CORS
```
**Fix**: Images should be public in Cloudinary settings

#### Check 3: SendGrid Limits
SendGrid has a **30MB total email size limit** (including attachments)
- Check attachment sizes in logs
- If total > 30MB, SendGrid will reject the email
- Consider using image compression or linking to images instead

#### Check 4: Content Type
Ensure contentType is correct:
```javascript
// Should be one of:
'image/jpeg'
'image/png'
'image/gif'
'image/webp'
```

### If Logs Show 0 Attachments

#### Issue in `App.tsx`
1. Check if `newClaim.attachments` is populated
2. Check if attachments have `type === 'IMAGE'` and `url` property
3. Check if base64 conversion succeeds

Add this debug code at line 1733:
```typescript
console.log(`🔍 [DEBUG] Total attachments: ${newClaim.attachments?.length || 0}`);
console.log(`🔍 [DEBUG] Image attachments:`, newClaim.attachments?.filter(att => att.type === 'IMAGE' && att.url));
```

## Image Attachment Format

### Correct Format (from `App.tsx`)
```typescript
{
  filename: 'image_1234567890.jpg',
  content: 'iVBORw0KGgoAAAANS...', // Base64 string WITHOUT 'data:image/jpeg;base64,' prefix
  contentType: 'image/jpeg'
}
```

### SendGrid Format (from `email-send.js`)
```javascript
{
  content: 'iVBORw0KGgoAAAANS...', // Base64 string
  filename: 'image_1234567890.jpg',
  type: 'image/jpeg',
  disposition: 'attachment'
}
```

## Success Criteria

✅ Browser console shows `📎 Attachment 1: filename.jpg, content length: 54321`  
✅ Netlify logs show `📎 Attachments: 3 provided, 3 processed`  
✅ SendGrid response shows `statusCode: 202, attachmentsCount: 3`  
✅ Email arrives with 3 downloadable image attachments  

## Related Files
- `App.tsx` lines 1733-1807
- `services/emailService.ts` lines 19-49
- `netlify/functions/email-send.js` lines 75-120
- `public/_redirects` line 33

## Next Steps
After testing, if attachments still don't appear:
1. Share the browser console logs
2. Share the Netlify function logs
3. Check if the email shows attachment icons but they're not downloadable
4. Check spam folder (sometimes email clients flag attachments as suspicious)

