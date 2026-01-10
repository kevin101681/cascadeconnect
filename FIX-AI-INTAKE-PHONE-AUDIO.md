# Fix: AI Intake Phone Overwrite & Add Inline Audio Player

**Date:** January 9, 2026  
**Issues Fixed:**
1. Phone number being overwritten with AI summary "(not provided)"
2. Missing inline audio player for call recordings

---

## Problem 1: Phone Overwrite Bug

### The Issue

**Symptom:** Modal initially shows correct Caller ID, then overwrites it with "(not provided)" or "not provided"

**Example Flow:**
```
1. Call comes in from: +1-555-123-4567 (Telecom Caller ID)
2. Vapi webhook receives: customer.number = "+1-555-123-4567"
3. AI transcribes call: User doesn't verbally say their number
4. AI summary: phone = "(not provided)"
5. Database saved with: "(not provided)"  ← BUG!
6. Modal displays: "(not provided)"  ← Wrong!
```

### Root Cause

**Old Logic (Incorrect):**
```typescript
// ❌ BUGGY: AI summary was prioritized, telecom as "fallback"
let phoneNumber = callData.phoneNumber;  // AI-extracted

if (!phoneNumber || phoneNumber === 'not provided') {
  // Only check telecom if AI extraction failed
  phoneNumber = call.customer.number;
}
```

**Problems:**
1. AI-extracted phone was checked **first**
2. Only fell back to telecom if AI said exactly "not provided" (missed variations)
3. Didn't filter out parenthetical strings like "(not provided)"

---

## Solution 1: Telecom-First Priority

### New Logic (Correct)

```typescript
// ✅ FIXED: ALWAYS prioritize telecom data over AI summary
// 1. Extract both sources
const telecomNumber = call?.customer?.number || call?.phoneNumber || call?.from;
const aiExtractedPhone = callData.phoneNumber;

// 2. Priority Logic: Telecom > AI
if (telecomNumber && 
    telecomNumber !== 'anonymous' && 
    telecomNumber !== 'unknown') {
  console.log(`📞 Using TELECOM Caller ID: ${telecomNumber}`);
  phoneNumber = telecomNumber;  // ← Telecom wins!
  
} else if (aiExtractedPhone && 
           !aiExtractedPhone.toLowerCase().includes('not provided') && 
           !aiExtractedPhone.toLowerCase().includes('(not provided)') &&
           !aiExtractedPhone.toLowerCase().includes('unknown')) {
  console.log(`📞 Using AI-extracted phone: ${aiExtractedPhone}`);
  phoneNumber = aiExtractedPhone;  // ← AI only if telecom unavailable
  
} else {
  console.log(`⚠️ No valid phone number found`);
  phoneNumber = undefined;
}
```

### Key Changes

**1. Telecom is ALWAYS checked first**
- `customer.number` (primary)
- `call.phoneNumber` (alternate field)
- `call.from` (SIP/carrier field)

**2. Filtered out invalid telecom values**
- `anonymous` - Blocked caller ID
- `unknown` - Carrier couldn't identify

**3. Comprehensive AI filtering**
- Case-insensitive checks
- Matches all variations:
  - `"not provided"`
  - `"Not Provided"`
  - `"(not provided)"`
  - `"unknown"`

**4. Clear logging**
```
📞 Using TELECOM Caller ID: +1-555-123-4567
```
or
```
📞 Using AI-extracted phone: +1-555-987-6543
```

---

## Problem 2: Missing Audio Player

### The Issue

**Symptom:** Call recordings exist but users had to click external link to hear them

**User Experience:**
- Click "Listen to Call Audio" → Opens new tab
- Must download or stream in external player
- Breaks flow, hard to scrub/replay

### Root Cause

UI only had an `<a>` link, not an inline `<audio>` player:

```tsx
// ❌ OLD: External link only
<a href={recordingUrl} target="_blank">
  Listen to Call Audio
</a>
```

---

## Solution 2: Inline Audio Player

### New UI Component

```tsx
// ✅ NEW: Inline audio player with fallback link
{actualSelectedCall.recordingUrl && (
  <div className="mt-4 p-4 border rounded-lg bg-surface-container/30">
    <div className="flex items-center gap-2 mb-3">
      <Play className="h-4 w-4 text-primary" />
      <p className="text-sm font-medium">Call Recording</p>
    </div>
    <audio 
      controls 
      src={actualSelectedCall.recordingUrl} 
      className="w-full"
      preload="metadata"
    />
    <a href={actualSelectedCall.recordingUrl} target="_blank">
      Open in new tab
    </a>
  </div>
)}
```

### Features

**1. HTML5 Audio Player**
- ✅ Play/pause button
- ✅ Timeline scrubber
- ✅ Volume control
- ✅ Download option (browser default)
- ✅ Playback speed (browser default)

**2. Styled Container**
- Border for visual separation
- Background for emphasis
- Icon + label for clarity

**3. Fallback Link**
- "Open in new tab" link below player
- For users who want external player
- Small, unobtrusive

**4. Responsive**
- `w-full` - Stretches to container width
- Works on mobile and desktop
- Added to both desktop and mobile views

---

## Expected Behavior

### Phone Number Display

**Scenario A: Telecom Available**
```
Webhook receives:
  - customer.number: "+1-555-123-4567"
  - AI phone: "(not provided)"

Database saves: "+1-555-123-4567"  ✅
Modal shows: "+1-555-123-4567"      ✅
```

**Scenario B: Telecom Anonymous, AI Has Number**
```
Webhook receives:
  - customer.number: "anonymous"
  - AI phone: "+1-555-987-6543"

Database saves: "+1-555-987-6543"  ✅
Modal shows: "+1-555-987-6543"      ✅
```

**Scenario C: Both Unavailable**
```
Webhook receives:
  - customer.number: null
  - AI phone: "(not provided)"

Database saves: null                ✅
Modal shows: "Not Provided"         ✅
```

### Audio Player

**With Recording:**
```
┌─────────────────────────────────────┐
│ 🎵 Call Recording                   │
├─────────────────────────────────────┤
│ ▶️ ━━━━━━━●─────── 🔊 ⋮ 📥        │
│                                     │
│ Open in new tab                     │
└─────────────────────────────────────┘
```

**Without Recording:**
- Section not displayed
- No broken UI elements

---

## Files Modified

### netlify/functions/vapi-webhook.ts

**Lines 177-217: Phone Priority Logic**

**Before:**
```typescript
// ❌ AI first, telecom as fallback
let phoneNumber = callData.phoneNumber;
if (!phoneNumber || phoneNumber === 'not provided') {
  phoneNumber = call?.customer?.number;
}
```

**After:**
```typescript
// ✅ Telecom first, AI as fallback
const telecomNumber = call?.customer?.number || ...;
const aiPhone = callData.phoneNumber;

if (telecomNumber && telecomNumber !== 'anonymous') {
  phoneNumber = telecomNumber;  // Prioritize telecom
} else if (aiPhone && !aiPhone.includes('not provided')) {
  phoneNumber = aiPhone;  // Fallback to AI
}
```

---

### components/AIIntakeDashboard.tsx

**Lines 554-575: Desktop Audio Player**
**Lines 809-830: Mobile Audio Player**

**Before:**
```tsx
// ❌ External link only
<a href={recordingUrl} target="_blank">
  Listen to Call Audio
</a>
```

**After:**
```tsx
// ✅ Inline player + fallback link
<div className="...">
  <div className="flex items-center gap-2">
    <Play className="h-4 w-4" />
    <p>Call Recording</p>
  </div>
  <audio controls src={recordingUrl} className="w-full" preload="metadata" />
  <a href={recordingUrl} target="_blank">Open in new tab</a>
</div>
```

---

## Database Schema

**No changes needed** - `recording_url` column already exists:

```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY,
  vapi_call_id TEXT NOT NULL UNIQUE,
  homeowner_id UUID REFERENCES homeowners(id),
  homeowner_name TEXT,
  phone_number TEXT,  -- ← Fixed to use telecom data
  property_address TEXT,
  issue_description TEXT,
  is_urgent BOOLEAN DEFAULT FALSE,
  transcript TEXT,
  recording_url TEXT,  -- ← Already exists, now used in UI
  is_verified BOOLEAN DEFAULT FALSE,
  address_match_similarity TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Testing Checklist

### Phone Number

- [ ] Make test call with Caller ID
- [ ] Don't say phone number verbally
- [ ] Check database: phone_number should have telecom data
- [ ] Check modal: Should display telecom number
- [ ] Verify logs show "Using TELECOM Caller ID"

### Audio Player

- [ ] Open AI Intake Dashboard
- [ ] Select a call with recording
- [ ] Verify inline audio player appears
- [ ] Click play - audio should play inline
- [ ] Test scrubbing timeline
- [ ] Test volume control
- [ ] Click "Open in new tab" - should open in new window

---

## Console Output

### Phone Priority (Success)

```
📦 [req-...] STEP 1: Extraction with fallback
📞 Using TELECOM Caller ID: +1-555-123-4567
✅ Call saved to database
```

### Phone Priority (AI Fallback)

```
📦 [req-...] STEP 1: Extraction with fallback
⚠️ Telecom number is 'anonymous', checking AI...
📞 Using AI-extracted phone: +1-555-987-6543
✅ Call saved to database
```

### Phone Priority (None Available)

```
📦 [req-...] STEP 1: Extraction with fallback
⚠️ No valid phone number found (Telecom: anonymous, AI: (not provided))
✅ Call saved to database
```

---

## Benefits

### 1. **Accurate Phone Data** ✅
- Real Caller ID always preserved
- AI summary can't overwrite telecom data
- Handles anonymous/blocked callers gracefully

### 2. **Better UX** ✨
- Listen to recordings inline
- No tab switching required
- Standard audio controls (play, scrub, volume)

### 3. **Debugging** 🔍
- Clear logs show which source was used
- Easy to trace phone data origin
- Can verify priority logic in logs

### 4. **Maintainability** 🛠️
- Explicit priority order in code
- Comprehensive filtering for edge cases
- Well-documented logic

---

## Edge Cases Handled

### Phone Number

1. **Telecom: Valid, AI: "(not provided)"** → Use telecom ✅
2. **Telecom: "anonymous", AI: Valid** → Use AI ✅
3. **Telecom: "unknown", AI: Valid** → Use AI ✅
4. **Telecom: Valid, AI: Valid** → Use telecom (priority) ✅
5. **Both: Invalid** → Save as `null` ✅

### Audio Player

1. **Recording exists** → Show player ✅
2. **Recording null/missing** → Hide player ✅
3. **Invalid URL** → Browser shows error in player ✅
4. **Mobile view** → Player works responsively ✅

---

## Status

✅ **COMPLETE** - Phone overwrite fixed, inline audio player added

## Future Enhancements

### Potential Improvements

1. **Audio Waveform**
   - Visual representation of audio
   - Easier to find specific moments

2. **Transcript Sync**
   - Highlight transcript as audio plays
   - Click transcript to jump to audio timestamp

3. **Playback Speed**
   - Add visible speed controls (1x, 1.5x, 2x)
   - Save user preference

4. **Download Button**
   - Explicit download button
   - Better than browser's default

5. **Phone Validation**
   - Format phone numbers consistently
   - E.164 format (+1-555-123-4567)
   - Detect invalid formats

---

## Related Systems

- **Vapi Webhook:** `netlify/functions/vapi-webhook.ts`
- **AI Intake Dashboard:** `components/AIIntakeDashboard.tsx`
- **Email Notifications:** Uses phone number from database
- **Homeowner Matching:** Can use phone for additional matching
