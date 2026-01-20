# AI Gatekeeper Quick Reference

## 🎯 Purpose
Frictionless bypass for known contacts, aggressive spam filtering for unknowns.

## 📞 Call Flow

```
Incoming Call → Vapi → Gatekeeper Webhook
                            ↓
                    Normalize Phone Number
                            ↓
                    Check user_contacts DB
                            ↓
            ┌───────────────┴───────────────┐
            ↓                               ↓
    ✅ Known Contact                ⚠️ Unknown Contact
    (in allowlist)                 (NOT in allowlist)
            ↓                               ↓
    Transfer Directly              Aggressive AI Gatekeeper
    (No AI screening)              "Who is this?"
            ↓                               ↓
    Kevin's Phone                  Spam Detection
                                          ↓
                                   ┌──────┴──────┐
                                   ↓             ↓
                              🚫 SPAM      ✅ LEGIT
                              Hang up      Transfer
```

## 🗂️ Files Overview

| File | Purpose |
|------|---------|
| `db/schema.ts` | Adds `user_contacts` table |
| `lib/utils/phoneNormalization.ts` | Phone format utilities |
| `actions/contact-sync.ts` | Mobile app → DB sync |
| `services/geminiService.ts` | Spam detection AI |
| `netlify/functions/vapi-gatekeeper.ts` | Main routing logic |

## 🔧 Key Functions

### Phone Normalization
```typescript
normalizePhoneNumber('(555) 123-4567') // → '+15551234567'
```

### Contact Sync
```typescript
syncContacts(userId, [
  { name: 'John', phone: '555-123-4567' }
])
```

### Spam Detection
```typescript
detectCallIntent({
  callerName: 'Solar Solutions',
  callerPurpose: 'Save money on energy'
}) // → 'SPAM'
```

## 🎨 Database Schema

```sql
user_contacts
├── id (uuid, primary key)
├── user_id (text, Clerk ID)
├── phone_number (text, UNIQUE, E.164 format)
├── name (text, optional)
└── created_at (timestamp)

Index: phone_number (automatic via UNIQUE)
Lookup speed: < 1ms
```

## ⚙️ Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
VAPI_SECRET=your_webhook_secret
KEVIN_PHONE_NUMBER=+15551234567  # Your forwarding number

# Optional
VITE_GEMINI_API_KEY=your_api_key  # For AI spam detection
```

## 📱 Mobile App Integration

```typescript
// 1. Get contacts from device
const contacts = await getDeviceContacts();

// 2. Sync to server
const result = await syncContacts(currentUserId, contacts);

// 3. Handle result
if (result.success) {
  console.log(`✅ Synced ${result.synced} contacts`);
} else {
  console.error(`❌ Failed: ${result.message}`);
}
```

## 🧪 Testing Checklist

- [ ] Database table created
- [ ] Phone normalization works
  - [ ] `(555) 123-4567` → `+15551234567`
  - [ ] `555-123-4567` → `+15551234567`
  - [ ] `+15551234567` → `+15551234567`
- [ ] Contact sync works
  - [ ] Inserts new contacts
  - [ ] Updates existing contacts
  - [ ] Returns correct counts
- [ ] Webhook responds correctly
  - [ ] Known contact → Transfer config
  - [ ] Unknown contact → Gatekeeper config
  - [ ] Invalid secret → 401 Unauthorized
- [ ] AI spam detection works
  - [ ] Solar sales → SPAM
  - [ ] "Business owner" → SPAM
  - [ ] Delivery with address → LEGIT

## 🚨 Spam Detection Rules

### Auto-Block (SPAM)
- ❌ Selling anything (solar, insurance, warranties)
- ❌ "Is the business owner available?"
- ❌ Vague or evasive purpose
- ❌ "This is not a sales call"
- ❌ Unknown company name
- ❌ Robocalls

### Allow (LEGIT)
- ✅ Specific person/address/time
- ✅ Delivery confirmation
- ✅ Known service provider emergency
- ✅ Friend/family (if specific)

**Default**: When in doubt → SPAM

## 🔐 Security

1. ✅ Vapi secret verification (all requests)
2. ✅ Fail secure (errors → gatekeeper, not transfer)
3. ✅ Phone validation (invalid → reject)
4. ✅ User auth required (contact sync)

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Webhook not called | Check Vapi dashboard webhook URL |
| Phone not matching | Verify E.164 format in DB |
| Contacts not syncing | Check user authentication |
| AI too aggressive | Lower temperature in geminiService.ts |
| AI too lenient | Add more red flags to prompt |

## 📊 Performance

- Database lookup: **< 1ms**
- Phone normalization: **< 1ms**
- Contact batch sync: **~100/sec**
- AI spam detection: **~500ms**

## 🎯 Success Criteria

✅ Known contacts reach Kevin instantly (< 1 second)  
✅ Spam calls blocked automatically (no human interaction)  
✅ Legitimate unknown callers can explain and get through  
✅ Zero false negatives (all friends/family get through)  
✅ < 5% false positives (legit callers blocked)

## 🔗 Vapi Webhook Setup

1. Go to Vapi Dashboard → Settings → Webhooks
2. Add webhook URL:
   ```
   https://your-site.netlify.app/.netlify/functions/vapi-gatekeeper
   ```
3. Select event: **assistant-request**
4. Copy webhook secret
5. Add to Netlify env vars as `VAPI_SECRET`

## 📈 Next Steps

1. Deploy to Netlify
2. Push database schema (create table)
3. Configure Vapi webhook
4. Test with known contact
5. Test with unknown contact
6. Sync contacts from mobile app
7. Monitor and adjust AI prompts

## 🆘 Quick Commands

```bash
# Push database schema
npm run db:push

# Deploy to Netlify
npm run netlify:deploy:prod

# Test phone normalization (local)
node -e "const {normalizePhoneNumber} = require('./lib/utils/phoneNormalization'); console.log(normalizePhoneNumber('555-123-4567'));"

# Check logs
netlify logs
```

## 📞 Example Scenarios

### Scenario 1: Mom calls
```
Phone: +15551234567 (in allowlist as "Mom")
Result: Instant transfer to Kevin
Duration: < 1 second
```

### Scenario 2: Solar spam
```
Phone: +15559999999 (unknown)
AI: "Who is this and what do you want?"
Caller: "I'm calling about solar panels..."
AI: "Remove this number." *HANG UP*
Result: Blocked, Kevin never notified
```

### Scenario 3: UPS delivery
```
Phone: +18001234567 (unknown)
AI: "Who is this and what do you want?"
Caller: "UPS delivery for Kevin at 123 Main St"
AI: "Please hold..." *TRANSFER TO KEVIN*
Result: Kevin answers, gets package
```
