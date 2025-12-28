# SMS Opt-In Implementation

## Overview
Added SMS opt-in checkbox to homeowner signup flow for compliance with telecommunications regulations (TCPA, CTIA guidelines).

## Compliance Requirements

### Why This Matters
Federal law (TCPA - Telephone Consumer Protection Act) requires **explicit consent** before sending marketing or automated text messages to consumers.

### Requirements Met
✅ **Opt-in checkbox** - Not pre-checked (must be actively selected)  
✅ **Clear language** - Explains what they're consenting to  
✅ **Opt-out information** - States they can opt out anytime  
✅ **Rate disclosure** - Mentions message/data rates may apply  
✅ **Database storage** - Consent preference saved to database  

## Implementation

### 1. Database Schema
**File**: `db/schema.ts`

Added field to `homeowners` table:
```typescript
smsOptIn: boolean('sms_opt_in').default(false)
```

**Default**: `false` (opt-out by default)  
**Type**: Boolean  
**Purpose**: Store homeowner's SMS consent preference

#### Migration SQL
```sql
ALTER TABLE homeowners 
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;
```

### 2. UI Component
**File**: `components/CustomSignUp.tsx`

#### State Management
```typescript
const [smsOptIn, setSmsOptIn] = useState(false);
```

#### Checkbox UI
```tsx
<div className="flex items-start gap-3 p-4 bg-surface-container/50 dark:bg-gray-700/50 rounded-lg border border-surface-outline-variant dark:border-gray-600">
  <input
    type="checkbox"
    id="smsOptIn"
    checked={smsOptIn}
    onChange={(e) => setSmsOptIn(e.target.checked)}
    className="mt-0.5 h-5 w-5 rounded border-surface-outline dark:border-gray-600 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
  />
  <label htmlFor="smsOptIn" className="text-sm text-surface-on dark:text-gray-100 cursor-pointer select-none">
    <span className="font-medium">Receive SMS notifications</span>
    <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
      I consent to receive text messages about my warranty claims, appointments, and important updates. 
      Message and data rates may apply. You can opt out at any time.
    </p>
  </label>
</div>
```

### 3. Database Update
**File**: `components/CustomSignUp.tsx`

Updated `linkClerkAccount` function:
```typescript
// Update homeowner with Clerk ID and SMS opt-in
await db
  .update(homeownersTable)
  .set({ 
    clerkId: clerkUserId,
    smsOptIn: smsConsent  // New field
  })
  .where(eq(homeownersTable.email, emailLower));
```

## User Flow

### New Homeowner Signup
```
1. Homeowner clicks invite link from email
   ↓
2. Opens signup form (CustomSignUp component)
   ↓
3. Fills in: First Name, Last Name, Email, Password
   ↓
4. Sees SMS opt-in checkbox (unchecked by default)
   ↓
5. Can choose to check box for SMS notifications
   ↓
6. Clicks "Create Account"
   ↓
7. Account created → smsOptIn saved to database
   ↓
8. Logs: "✅ Linked Clerk account to homeowner: email@example.com (SMS opt-in: true)"
```

### Existing Homeowner Signup
```
1. Homeowner with existing record signs up
   ↓
2. System finds homeowner by email
   ↓
3. Updates record with:
   - Clerk ID (for authentication)
   - SMS opt-in preference (from checkbox)
```

## SMS Consent Language

### Checkbox Label
```
Receive SMS notifications
```

### Explanation Text
```
I consent to receive text messages about my warranty claims, 
appointments, and important updates. Message and data rates may apply. 
You can opt out at any time.
```

### Why This Language?
- **"I consent"** - Clear first-person agreement
- **"receive text messages"** - Explicit about SMS
- **"warranty claims, appointments, updates"** - Describes message types
- **"Message and data rates may apply"** - Required disclosure
- **"You can opt out at any time"** - Required by law

## SMS Usage Guidelines

### When SMS Opt-in is TRUE
✅ **Can send**:
- Claim status updates
- Appointment reminders
- Appointment confirmations
- Important warranty notifications
- Time-sensitive updates

❌ **Cannot send**:
- Marketing messages (unless separate consent)
- Promotional offers
- Non-essential updates
- Third-party messages

### When SMS Opt-in is FALSE
❌ **Cannot send SMS** - Must use email only

## Checking SMS Opt-in Status

### In Code
```typescript
// Check if homeowner has opted in
const homeowner = await db.select()
  .from(homeownersTable)
  .where(eq(homeownersTable.id, homeownerId))
  .limit(1);

if (homeowner[0]?.smsOptIn) {
  // Send SMS
  await sendSMS({
    to: homeowner[0].phone,
    body: "Your appointment is confirmed..."
  });
} else {
  // Send email only
  await sendEmail({
    to: homeowner[0].email,
    subject: "Appointment Confirmation",
    body: "..."
  });
}
```

### In Database
```sql
-- Get all homeowners who opted in
SELECT name, email, phone, sms_opt_in 
FROM homeowners 
WHERE sms_opt_in = true;

-- Count opt-in rate
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN sms_opt_in THEN 1 ELSE 0 END) as opted_in,
  ROUND(100.0 * SUM(CASE WHEN sms_opt_in THEN 1 ELSE 0 END) / COUNT(*), 2) as opt_in_rate
FROM homeowners;
```

## Legal Compliance Checklist

### ✅ TCPA Compliance
- [x] Express written consent obtained
- [x] Consent obtained before sending SMS
- [x] Clear description of what they're consenting to
- [x] Opt-out mechanism disclosed
- [x] Not pre-checked (requires active selection)

### ✅ CTIA Best Practices
- [x] Clear and conspicuous consent language
- [x] Describes frequency (as needed for claims/appointments)
- [x] Mentions message/data rates
- [x] States ability to opt out
- [x] Stored in database for proof

### ✅ Required Disclosures
- [x] "Message and data rates may apply"
- [x] "You can opt out at any time"
- [x] Description of message types

## Opt-Out Implementation (Future)

### When a Homeowner Opts Out
Must provide at least one method:
1. **Reply "STOP"** to any SMS message
2. **Settings page** in the app
3. **Email request** to support

### Opt-Out Handling
```typescript
// When homeowner opts out
await db
  .update(homeownersTable)
  .set({ smsOptIn: false })
  .where(eq(homeownersTable.id, homeownerId));

console.log(`📵 ${homeowner.name} opted out of SMS`);
```

### Opt-Out Response
Automatically reply:
```
You have been unsubscribed from SMS notifications. 
You will no longer receive text messages from Cascade Connect.
```

## Testing

### Test Checklist
1. **Unchecked by default**: ✓ Checkbox starts unchecked
2. **Can be checked**: ✓ User can click to enable
3. **Saves to database**: ✓ Value persists after signup
4. **Logs correctly**: ✓ Console shows opt-in status
5. **UI is clear**: ✓ Language is understandable
6. **Mobile friendly**: ✓ Checkbox is large enough to tap

### Test Scenarios

#### Scenario 1: Opt-In
```
1. Open signup form
2. Check SMS opt-in checkbox
3. Create account
4. Verify database: sms_opt_in = true
5. Verify console: "(SMS opt-in: true)"
```

#### Scenario 2: Opt-Out (Default)
```
1. Open signup form
2. Leave SMS opt-in unchecked
3. Create account
4. Verify database: sms_opt_in = false
5. Verify console: "(SMS opt-in: false)"
```

#### Scenario 3: Existing Homeowner
```
1. Existing homeowner record in database
2. Homeowner signs up for first time
3. Check SMS opt-in checkbox
4. Verify: Existing record updated with sms_opt_in = true
```

## Future Enhancements

### Settings Page
Add ability to change SMS preference after signup:
```tsx
<label>
  <input 
    type="checkbox" 
    checked={homeowner.smsOptIn}
    onChange={handleToggleSMS}
  />
  Receive SMS notifications
</label>
```

### SMS Reply Handling
Listen for "STOP", "UNSUBSCRIBE", "CANCEL":
```typescript
// Webhook from Twilio
if (incomingMessage.body.toUpperCase() === 'STOP') {
  await optOutHomeowner(phoneNumber);
  await replySMS(phoneNumber, "You've been unsubscribed.");
}
```

### Audit Log
Track when users opt in/out:
```typescript
await db.insert(smsConsentLog).values({
  homeownerId: homeowner.id,
  action: 'opt-in' | 'opt-out',
  method: 'signup' | 'settings' | 'reply',
  timestamp: new Date()
});
```

### Re-Opt-In
If user opts out, allow them to opt back in:
```typescript
// In settings
<p>You opted out on {optOutDate}</p>
<button onClick={handleReOptIn}>
  Enable SMS notifications again
</button>
```

## Related Files
- `db/schema.ts` - Database schema with smsOptIn field
- `components/CustomSignUp.tsx` - Signup form with checkbox
- Future: `components/Settings.tsx` - Update preference
- Future: `netlify/functions/sms-webhook.ts` - Handle STOP replies

## Status
✅ **IMPLEMENTED** - SMS opt-in checkbox working on signup

## Next Steps
1. ✅ Add checkbox to signup (DONE)
2. ⏳ Implement SMS sending logic (check smsOptIn before sending)
3. ⏳ Add settings page to change preference
4. ⏳ Handle "STOP" replies via webhook
5. ⏳ Add audit logging for compliance

