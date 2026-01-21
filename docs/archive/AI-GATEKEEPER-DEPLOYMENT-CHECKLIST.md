# AI Gatekeeper Deployment Checklist

## ✅ Implementation Status

All components implemented and tested:

- [x] Database schema (`user_contacts` table)
- [x] Phone normalization utilities
- [x] Contact sync action
- [x] Aggressive spam detection (Gemini)
- [x] Vapi gatekeeper webhook
- [x] Comprehensive test suite
- [x] Documentation

## 🚀 Deployment Steps

### Step 1: Database Migration

Create the `user_contacts` table in your Neon database:

```sql
CREATE TABLE user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index is automatically created by UNIQUE constraint
```

Or use Drizzle Kit:
```bash
npm run db:push
```

**Verification:**
```sql
SELECT * FROM user_contacts LIMIT 1;
-- Should return 0 rows (empty table, but exists)
```

### Step 2: Configure Environment Variables

Add to Netlify (Settings → Environment Variables):

```bash
# Required
VAPI_SECRET=your_vapi_webhook_secret_from_dashboard
KEVIN_PHONE_NUMBER=+15551234567  # Replace with your actual number

# Already configured (verify)
DATABASE_URL=postgresql://...
VITE_GEMINI_API_KEY=your_gemini_key  # For spam detection
```

**Get Vapi Secret:**
1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Settings → Webhooks
3. Copy your webhook secret
4. Add to Netlify as `VAPI_SECRET`

### Step 3: Deploy to Netlify

```bash
# Build and deploy
npm run build
npm run netlify:deploy:prod

# Or auto-deploy via Git
git add .
git commit -m "feat: Add AI Gatekeeper system"
git push origin main
```

**Expected Output:**
```
✔ Deploy complete!
✔ Functions deployed:
  - vapi-gatekeeper
```

### Step 4: Configure Vapi Webhook

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Navigate to Settings → Webhooks
3. Add new webhook:
   - **URL**: `https://your-site.netlify.app/.netlify/functions/vapi-gatekeeper`
   - **Events**: Select `assistant-request`
   - **Authentication**: Select `Netlify Webhook Auth (bearer token)` ✨ NEW
   - **Secret**: Your `VAPI_SECRET` value (will be sent as `Authorization: Bearer`)
4. Save webhook configuration

**Note**: The webhook now supports **both** authentication methods:
- ✅ `X-Vapi-Secret: your_secret` (original)
- ✅ `Authorization: Bearer your_secret` (new Netlify format) ⭐

**Test Webhook (Bearer Token Method):**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/vapi-gatekeeper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_here" \
  -d '{
    "message": {
      "type": "assistant-request",
      "call": {
        "id": "test-123",
        "customer": {
          "number": "+15551234567"
        }
      }
    }
  }'
```

**Test Webhook (Original Method - Still Works):**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/vapi-gatekeeper \
  -H "Content-Type: application/json" \
  -H "X-Vapi-Secret: your_secret_here" \
  -d '{
    "message": {
      "type": "assistant-request",
      "call": {
        "id": "test-123",
        "customer": {
          "number": "+15551234567"
        }
      }
    }
  }'
```

**Expected Response:**
```json
{
  "assistant": {
    "firstMessage": "Who is this and what do you want?",
    "model": { ... }
  }
}
```

### Step 5: Add Test Contacts

Add a few test contacts to verify the system:

**Option A: Via Database (for testing)**
```sql
INSERT INTO user_contacts (user_id, phone_number, name)
VALUES 
  ('your_clerk_user_id', '+15551234567', 'Test Contact 1'),
  ('your_clerk_user_id', '+15559876543', 'Test Contact 2');
```

**Option B: Via Mobile App (production)**
- Implement contact sync in your mobile app
- Call `syncContacts(userId, contacts)` from the app
- Verify contacts appear in database

**Verification:**
```sql
SELECT COUNT(*) FROM user_contacts;
-- Should return 2 (or number of contacts added)
```

### Step 6: Test with Real Calls

**Test Case 1: Known Contact (Bypass AI)**
1. Add your personal phone to `user_contacts`
2. Call your Vapi number from that phone
3. **Expected**: Call should transfer directly to Kevin
4. **Duration**: < 1 second (instant transfer)

**Test Case 2: Unknown Contact (AI Gatekeeper)**
1. Call from a phone NOT in `user_contacts`
2. **Expected**: AI says "Who is this and what do you want?"
3. Test spam response: Say "I'm calling about solar panels"
4. **Expected**: AI says "Remove this number" and hangs up

**Test Case 3: Legitimate Unknown Caller**
1. Call from unknown phone
2. When AI asks, say: "This is UPS with a delivery for Kevin at [your address]"
3. **Expected**: AI transfers to Kevin

### Step 7: Monitor and Adjust

**Check Netlify Logs:**
```bash
netlify logs --function vapi-gatekeeper
```

**Look for:**
- ✅ `Known contact found: [Name]`
- ⚠️ `Unknown contact: [Phone]`
- 🔄 `Bypassing AI Gatekeeper - Transferring...`
- 🛡️ `Engaging AI Gatekeeper (aggressive mode)...`

**Adjust AI Behavior:**
- Too aggressive? Lower temperature in `geminiService.ts`
- Too lenient? Add more red flags to system prompt
- False positives? Review Gemini prompt in `services/geminiService.ts`

## 🔍 Troubleshooting

### Issue: Webhook returns 401 Unauthorized

**Cause**: Vapi secret mismatch

**Fix:**
1. Check Netlify env var: `VAPI_SECRET`
2. Compare with Vapi dashboard secret
3. Ensure exact match (no extra spaces)
4. Redeploy if changed

### Issue: Phone numbers not matching

**Cause**: Format mismatch (DB vs. Vapi)

**Fix:**
1. Check Vapi payload format (see logs)
2. Verify DB has E.164 format: `+15551234567`
3. Test normalization: `normalizePhoneNumber(rawPhone)`
4. Check database query:
   ```sql
   SELECT * FROM user_contacts WHERE phone_number = '+15551234567';
   ```

### Issue: Contacts not syncing from mobile app

**Cause**: Authentication or normalization error

**Fix:**
1. Verify user is authenticated (Clerk ID)
2. Check contact sync response for errors
3. Verify DATABASE_URL is set
4. Test with manual SQL insert first

### Issue: AI too aggressive (blocking legit callers)

**Cause**: Gemini prompt too strict

**Fix:**
1. Open `services/geminiService.ts`
2. Find `detectCallIntent` function
3. Adjust system prompt:
   - Lower temperature (0.3 → 0.5)
   - Add examples of legit callers
   - Reduce red flag list
4. Redeploy and test

### Issue: AI too lenient (letting spam through)

**Cause**: Gemini prompt too permissive

**Fix:**
1. Open `services/geminiService.ts`
2. Find `detectCallIntent` function
3. Adjust system prompt:
   - Lower temperature (0.5 → 0.3)
   - Add more red flags
   - Make default behavior stricter
4. Redeploy and test

## 📊 Success Metrics

Monitor these metrics after deployment:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Known contact transfer speed | < 1 second | Test with personal phone |
| Spam block rate | > 95% | Monitor Vapi call logs |
| False positive rate | < 5% | Ask friends to call |
| Database lookup latency | < 1ms | Check Netlify logs |
| Contact sync success rate | > 98% | Check sync response |

## 🎯 Post-Deployment Tasks

- [ ] Test with 3+ known contacts
- [ ] Test with 3+ spam calls
- [ ] Test with 1+ legitimate unknown caller
- [ ] Monitor logs for 24 hours
- [ ] Adjust AI prompts based on results
- [ ] Document any edge cases found
- [ ] Add more contacts from mobile app
- [ ] Set up weekly log review

## 🚨 Rollback Plan

If something goes wrong:

1. **Disable webhook in Vapi dashboard** (immediate stop)
2. **Revert Netlify deployment:**
   ```bash
   netlify rollback
   ```
3. **Keep database table** (no harm in keeping it)
4. **Review logs** to identify issue
5. **Fix and redeploy**

## 📞 Support Contacts

- **Vapi Support**: support@vapi.ai
- **Netlify Support**: support@netlify.com
- **Neon Support**: support@neon.tech

## 🎉 Success Confirmation

You'll know it's working when:

✅ Friends/family can reach you instantly (no AI)  
✅ Spam calls are blocked automatically  
✅ Legitimate unknown callers can explain and get through  
✅ You're not interrupted by robocalls  
✅ Database lookups are fast (< 1ms)

## 📝 Notes

- System is designed to **fail secure** (unknown error → gatekeeper, not transfer)
- Phone numbers are always stored in **E.164 format** (`+15551234567`)
- Contacts are **per-user** (linked to Clerk ID)
- AI uses **GPT-4** for best spam detection accuracy
- Transfer is **silent** (no robot voice, instant connection)

## 🔗 Related Documentation

- [Full Implementation Guide](./AI-GATEKEEPER-IMPLEMENTATION.md)
- [Quick Reference](./AI-GATEKEEPER-QUICK-REFERENCE.md)
- [Test Results](./scripts/test-gatekeeper.ts)

---

**Last Updated**: 2026-01-20  
**Status**: ✅ Ready for Deployment
