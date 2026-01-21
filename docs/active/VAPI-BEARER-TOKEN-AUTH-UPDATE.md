# Vapi Gatekeeper - Bearer Token Auth Update

## 🔄 Update Summary

Updated the `vapi-gatekeeper` webhook to support **Netlify Webhook Auth (Bearer token)** format from Vapi Dashboard.

**Date**: January 20, 2026  
**File Modified**: `netlify/functions/vapi-gatekeeper.ts`

---

## ✅ What Changed

### Authentication Logic Enhancement

The webhook now accepts authentication in **two formats**:

#### Method 1: Original `x-vapi-secret` Header
```http
POST /.netlify/functions/vapi-gatekeeper
X-Vapi-Secret: your_secret_here
```

#### Method 2: NEW - `Authorization: Bearer` Header
```http
POST /.netlify/functions/vapi-gatekeeper
Authorization: Bearer your_secret_here
```

### Implementation Details

The updated code:
1. **First** checks for `x-vapi-secret` header (case-insensitive)
2. **If not found**, checks `Authorization` header
3. **Strips** `Bearer ` prefix using regex: `/^Bearer\s+(.+)$/i`
4. **Compares** the extracted token with `process.env.VAPI_SECRET`
5. **Maintains** backward compatibility (both methods work)

---

## 🔧 Configuration in Vapi Dashboard

### Step 1: Select Authentication Method

In your Vapi Dashboard:
1. Go to **Settings** → **Webhooks**
2. Click on your webhook configuration
3. Under **Authentication**, select: **Netlify Webhook Auth (bearer token)**

### Step 2: Enter Your Secret

The same secret (`VAPI_SECRET` environment variable) works for both methods:

```bash
# Netlify Environment Variable
VAPI_SECRET=your_secret_here
```

Vapi will automatically format it as:
```
Authorization: Bearer your_secret_here
```

---

## 🧪 Testing Both Methods

### Test with `x-vapi-secret` (Original)
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/vapi-gatekeeper \
  -H "Content-Type: application/json" \
  -H "X-Vapi-Secret: your_secret_here" \
  -d '{
    "message": {
      "type": "assistant-request",
      "call": {
        "id": "test-123",
        "customer": { "number": "+15551234567" }
      }
    }
  }'
```

### Test with `Authorization: Bearer` (NEW)
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/vapi-gatekeeper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_here" \
  -d '{
    "message": {
      "type": "assistant-request",
      "call": {
        "id": "test-123",
        "customer": { "number": "+15551234567" }
      }
    }
  }'
```

Both should return the same response (transfer or gatekeeper config).

---

## 🔐 Security Notes

1. **Same Secret**: Both methods use the same `VAPI_SECRET` environment variable
2. **Case-Insensitive**: Header lookup is case-insensitive (`Authorization`, `authorization`, etc.)
3. **Regex Extraction**: Bearer token is extracted using `/^Bearer\s+(.+)$/i` (allows any whitespace)
4. **Backward Compatible**: Existing webhooks using `x-vapi-secret` continue to work
5. **Fail Secure**: Invalid auth returns `401 Unauthorized` (no call processing)

---

## 📊 Code Changes

### Before (Original)
```typescript
const vapiSecret = 
  event.headers['x-vapi-secret'] || 
  event.headers['X-Vapi-Secret'] ||
  event.headers['X-VAPI-SECRET'];

if (!isLocalDev && !verifyVapiSecret(vapiSecret)) {
  return { statusCode: 401, ... };
}
```

### After (Updated)
```typescript
let vapiSecret: string | undefined;

// Method 1: Check x-vapi-secret header
vapiSecret = 
  event.headers['x-vapi-secret'] || 
  event.headers['X-Vapi-Secret'] ||
  event.headers['X-VAPI-SECRET'];

// Method 2: Check Authorization header with Bearer token
if (!vapiSecret) {
  const authHeader = 
    event.headers['authorization'] || 
    event.headers['Authorization'];
  
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      vapiSecret = match[1];
      console.log(`🔐 Using Bearer token from Authorization header`);
    }
  }
}

if (!isLocalDev && !verifyVapiSecret(vapiSecret)) {
  return { statusCode: 401, ... };
}
```

---

## ✅ Verification Checklist

After deploying this update:

- [ ] Deploy to Netlify (`npm run netlify:deploy:prod`)
- [ ] Update Vapi Dashboard webhook settings
- [ ] Select "Netlify Webhook Auth (bearer token)"
- [ ] Save webhook configuration
- [ ] Test incoming call from known contact → Should transfer
- [ ] Test incoming call from unknown contact → Should engage AI
- [ ] Check Netlify logs for auth method used

**Expected Log Output:**
```
🔐 Using Bearer token from Authorization header
🔐 Verifying Vapi secret...
```

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized after update

**Cause**: Vapi Dashboard not configured with Bearer token auth

**Fix**:
1. Go to Vapi Dashboard → Settings → Webhooks
2. Select **Netlify Webhook Auth (bearer token)**
3. Ensure `VAPI_SECRET` is correctly set in Netlify
4. Redeploy if environment variable was changed

### Issue: Logs show `x-vapi-secret` instead of Bearer

**Cause**: Vapi Dashboard still using old auth method

**Fix**:
1. Update webhook configuration in Vapi Dashboard
2. Save changes
3. Test with a new incoming call

### Issue: Both methods fail

**Cause**: `VAPI_SECRET` environment variable not set or incorrect

**Fix**:
1. Check Netlify environment variables
2. Verify `VAPI_SECRET` matches Vapi Dashboard secret
3. Redeploy after updating environment variable

---

## 📝 No Other Changes Required

The following remain **unchanged** and continue to work correctly:
- ✅ Database lookup logic (`user_contacts` table)
- ✅ Phone number normalization
- ✅ Known contact transfer response
- ✅ Unknown contact gatekeeper response
- ✅ Aggressive AI system prompt
- ✅ All other webhook logic

---

## 🚀 Deployment Steps

1. **Commit Changes**:
   ```bash
   git add netlify/functions/vapi-gatekeeper.ts
   git commit -m "feat: Add Bearer token auth support for Vapi webhook"
   git push origin main
   ```

2. **Deploy to Netlify**:
   ```bash
   npm run netlify:deploy:prod
   ```
   Or let auto-deploy handle it via Git push.

3. **Update Vapi Dashboard**:
   - Go to Settings → Webhooks
   - Select webhook
   - Change auth to "Netlify Webhook Auth (bearer token)"
   - Save

4. **Test**:
   - Make test call from known contact
   - Make test call from unknown number
   - Verify both work correctly

---

## 📚 Related Documentation

- [AI Gatekeeper Implementation Guide](../archive/AI-GATEKEEPER-IMPLEMENTATION.md)
- [Deployment Checklist](../archive/AI-GATEKEEPER-DEPLOYMENT-CHECKLIST.md)
- [Quick Reference](./AI-GATEKEEPER-QUICK-REFERENCE.md)

---

**Status**: ✅ Complete and Ready for Deployment  
**Backward Compatible**: ✅ Yes (both auth methods work)  
**Breaking Changes**: ❌ None  
**Testing Required**: ✅ Test with both auth methods
