# AI Intent Detection - Testing Guide

## Quick Test Scenarios

### Scenario 1: Warranty Claim Detection (Should Show Modal)

**Login as**: Homeowner

**Test Message Examples**:
- "My kitchen faucet is leaking and needs to be fixed"
- "There's a crack in the bathroom tile that appeared"
- "The HVAC system is making strange noises"
- "Water stain on ceiling needs inspection"
- "Garage door opener is broken"

**Expected Behavior**:
1. Start composing a new message
2. Enter subject and one of the test messages above
3. Click "Send Message"
4. Should see loading spinner briefly
5. Modal appears: "Submit a Warranty Claim?"
6. Two buttons available:
   - "Go to Warranty Tab" (primary, filled button)
   - "No, send as a regular message" (secondary, text button)

**Verify "Go to Warranty Tab" Button**:
1. Click the primary button
2. Should close both modals (suggestion + message compose)
3. Should switch to "CLAIMS" tab
4. Should open the new claim form automatically
5. Original message content is preserved (can be copied to claim)

**Verify "No, send as regular message" Button**:
1. Click the secondary button
2. Should close the suggestion modal
3. Should send the message normally (bypassing AI check)
4. Message appears in threads list

---

### Scenario 2: General Questions (Should NOT Show Modal)

**Login as**: Homeowner

**Test Message Examples**:
- "When is my 60-day inspection scheduled?"
- "Can you send me a copy of my warranty document?"
- "Thank you for your help with the repair!"
- "What time should I expect the contractor tomorrow?"
- "Hi"

**Expected Behavior**:
1. Start composing a new message
2. Enter subject and one of the test messages above
3. Click "Send Message"
4. May see brief loading spinner
5. Modal should NOT appear
6. Message sends normally to recipient
7. Message appears in threads list immediately

---

### Scenario 3: Short Messages (Bypasses AI Check)

**Login as**: Homeowner

**Test Message Examples**:
- "Hello"
- "Thanks"
- "OK"
- "Yes"

**Expected Behavior**:
1. Start composing a new message
2. Enter a very short message (≤10 characters)
3. Click "Send Message"
4. No AI check runs (instant send, no loading)
5. Message sends immediately
6. Modal should NOT appear

---

### Scenario 4: Admin/Builder Users (Bypasses AI Check)

**Login as**: Admin or Builder

**Test Message Examples**:
- Any message content (even warranty-related)

**Expected Behavior**:
1. Select a homeowner
2. Start composing a new message
3. Enter any message (including repair issues)
4. Click "Send Message"
5. No AI check runs (sends immediately)
6. Modal should NOT appear
7. Message sends normally

---

### Scenario 5: API Failure/Unavailable (Fail Open)

**Setup**:
- Temporarily remove `VITE_GEMINI_API_KEY` from environment
- OR simulate network failure

**Test As**: Homeowner

**Test Message**: "My faucet is leaking"

**Expected Behavior**:
1. Start composing message
2. Enter warranty-related content
3. Click "Send Message"
4. Brief loading state
5. Check browser console - should see error log
6. Modal should NOT appear (fails open)
7. Message sends normally
8. User can still communicate despite AI being down

---

## Visual Verification Checklist

### Modal Design
- ✅ Modal uses `bg-surface` background
- ✅ Text uses `text-surface-on` for readability
- ✅ Rounded corners (rounded-3xl)
- ✅ Shadow elevation-3
- ✅ Backdrop blur effect
- ✅ Fade-in animation
- ✅ Scale-in animation for modal content

### Button Styling
- ✅ Primary button uses `variant="filled"` (purple background)
- ✅ Secondary button uses `variant="text"` (transparent)
- ✅ Both buttons are full-width
- ✅ Buttons have proper spacing (gap-2)
- ✅ Button text is clear and actionable

### Responsiveness
- ✅ Modal is responsive (max-w-md)
- ✅ Proper margins (mx-4)
- ✅ Works on mobile and desktop
- ✅ Text is readable on all screen sizes

---

## Performance Tests

### Loading State
- ✅ Spinner appears immediately on click
- ✅ Button is disabled during processing
- ✅ Clear visual feedback during AI analysis

### Speed
- ✅ AI response time: typically 1-2 seconds
- ✅ No UI freezing during check
- ✅ Smooth transitions

---

## Edge Cases

### Test: Rapidly Clicking Send
**Expected**: Button disabled after first click, prevents double-send

### Test: Changing Mind After Modal Opens
**Expected**: Can close modal (via secondary button) and message sends

### Test: Network Interruption During AI Check
**Expected**: Error caught, message sends anyway (fail open)

### Test: Multiple Messages in Quick Succession
**Expected**: Each message checked independently

---

## Console Logging

When testing, check browser console for:
- ✅ No errors during normal operation
- ✅ Appropriate warning if API key missing
- ✅ Error logging if API call fails
- ✅ No security warnings or CSP violations

---

## Success Criteria

The feature is working correctly if:
1. ✅ Homeowners see modal for warranty-related messages
2. ✅ Homeowners can override and send anyway
3. ✅ Redirect to warranty tab works smoothly
4. ✅ General questions don't trigger modal
5. ✅ Admins/builders never see the modal
6. ✅ Short messages skip AI check entirely
7. ✅ System fails gracefully when AI unavailable
8. ✅ No impact on message sending functionality
9. ✅ UI matches existing design system
10. ✅ No linter errors or console warnings
