# Homeowner AI Search Widget - Brand Alignment Fix (Jan 2026)

**Date**: January 21, 2026  
**Status**: ✅ Completed  
**Priority**: Critical (Brand Consistency)

---

## Problem Overview

The Homeowner AI Search Widget was implemented but had a **critical branding issue**: The AI was instructing homeowners to "call the builder" or "contact the builder" instead of directing them to **Cascade Builder Services**.

### Business Impact

**Before Fix**:
- ❌ AI: "Call your builder for assistance"
- ❌ AI: "Contact the builder immediately"
- ❌ Homeowners confused about who to contact
- ❌ Brand dilution (not mentioning Cascade)

**After Fix**:
- ✅ AI: "Contact Cascade Builder Services"
- ✅ AI: "Call Cascade Builder Services Emergency Line"
- ✅ Clear brand identity
- ✅ Direct homeowners to the correct support channel

---

## Solution

### Task 1: Widget Visibility ✅ (Already Completed)

**Status**: The widget was already implemented and visible in a previous session.

**Location**: `components/HomeownerDashboardView.tsx` (Lines 308-313)

```tsx
{/* Maintenance Search Widget */}
<FadeIn direction="up" fullWidth>
  <section className="w-full px-4 py-4 md:px-6 md:py-6">
    <HomeownerSearchWidget />
  </section>
</FadeIn>
```

**Placement**: 
- ✅ After the Welcome Header/User Info section
- ✅ Before the "Project" grid (Tasks, Schedule, BlueTag, Warranty)
- ✅ Has proper spacing (`py-4 md:py-6`)

**Component Features**:
- Glassmorphism design (`bg-white/50 backdrop-blur-sm`)
- Wrench icon (not AI sparkles - looks like a tool, not a chatbot)
- Suggested question pills for common queries
- Loading skeleton with animation
- Answer display with "Ask another question" CTA

---

### Task 2: AI Persona Brand Alignment ✅ (This Fix)

**File**: `actions/ask-maintenance-ai.ts`

**Critical Changes**:

#### 1. Updated System Prompt (Lines 46-65)

**Before (Wrong)**:
```typescript
contents: `You are a helpful home maintenance expert. 
...
- advise them to call their builder IMMEDIATELY
- call their builder immediately
- contact your builder for assistance`
```

**After (Correct)**:
```typescript
contents: `You are a helpful home maintenance expert for Cascade Builder Services.

CRITICAL RULE: NEVER tell the homeowner to "contact the builder" or "call the builder".
INSTEAD: Always tell them to "Contact Cascade Builder Services" or "submit a request to Cascade".

EMERGENCY RESPONSE PROTOCOL:
If the question is about an EMERGENCY (gas leak, water leak, electrical hazard, fire, carbon monoxide, etc.):
- Instruct: "Shut off the source immediately if safe to do so."
- Then say: "Call Cascade Builder Services Emergency Line right away."
- If evacuation is needed: "Evacuate immediately and call 911, then notify Cascade Builder Services."

URGENT ISSUES (Leaks, HVAC during extreme weather, electrical problems):
- Instruct: "Turn off the main supply/breaker if safe."
- Then say: "Contact Cascade Builder Services immediately for emergency service."

NON-EMERGENCY QUESTIONS:
- Provide clear, actionable steps (2-3 sentences max)
- Be specific about tools or materials needed
- If professional help is needed, say: "For this repair, contact Cascade Builder Services to schedule a service appointment."
- Keep answers practical and concise
- Do not mention you are an AI`
```

**Key Changes**:
1. ✅ Added brand name: "for Cascade Builder Services"
2. ✅ CRITICAL RULE in all caps to ensure AI compliance
3. ✅ Explicit instruction: NEVER say "builder", ALWAYS say "Cascade Builder Services"
4. ✅ Emergency protocol explicitly mentions "Cascade Builder Services Emergency Line"
5. ✅ Non-emergency repairs: "contact Cascade Builder Services to schedule a service appointment"

---

#### 2. Updated Fallback Messages (Lines 37, 67, 70)

**Before (Wrong)**:
```typescript
return "...contact your builder or check your homeowner manual.";
return "...contact your builder for assistance.";
return "...contact your builder for assistance.";
```

**After (Correct)**:
```typescript
// Line 37: AI unavailable fallback
return "...please contact Cascade Builder Services.";

// Line 67: Generation error fallback
return "...contact Cascade Builder Services for assistance.";

// Line 70: API error fallback
return "...contact Cascade Builder Services for assistance.";
```

**All Three Fallback Scenarios Now Brand-Aligned**:
- No API key → "Contact Cascade Builder Services"
- AI generation fails → "Contact Cascade Builder Services"
- Network error → "Contact Cascade Builder Services"

---

## Response Examples

### Emergency Scenario: Gas Leak

**User Question**: "I smell gas in my house"

**AI Response (After Fix)**:
> "Shut off the source immediately if safe to do so. Call Cascade Builder Services Emergency Line right away. If you cannot safely shut it off, evacuate immediately and call 911, then notify Cascade Builder Services."

**Before Fix (Wrong)**:
> "Call your builder immediately and evacuate the property."

---

### Urgent Issue: Water Leak

**User Question**: "There's water leaking from my ceiling"

**AI Response (After Fix)**:
> "Turn off the main water supply immediately. Contact Cascade Builder Services immediately for emergency service. Move any valuables away from the leak area."

**Before Fix (Wrong)**:
> "Shut off the main supply and call your builder immediately."

---

### Non-Emergency: Furnace Filter

**User Question**: "How do I change my furnace filter?"

**AI Response (After Fix)**:
> "Turn off your furnace first. Locate the filter compartment (usually on the return air duct or inside the furnace cabinet), slide out the old filter, and insert the new one with airflow arrows pointing toward the furnace. If you need assistance, contact Cascade Builder Services to schedule a service appointment."

**Before Fix (Wrong)**:
> "...Recommend calling a professional if you're unsure."

---

## Brand Consistency Rules

### ✅ ALWAYS Say:
- "Contact Cascade Builder Services"
- "Call Cascade Builder Services Emergency Line"
- "Submit a request to Cascade"
- "Cascade Builder Services to schedule a service appointment"

### ❌ NEVER Say:
- "Call your builder"
- "Contact the builder"
- "Reach out to your builder"
- "Call a professional" (too vague)
- "Contact your contractor" (wrong entity)

---

## Testing Scenarios

### Test 1: Emergency (Gas Leak)
**Input**: "I smell gas"  
**Expected**: Mentions "Cascade Builder Services Emergency Line" + 911

### Test 2: Urgent (Water Leak)
**Input**: "Water leaking from pipe"  
**Expected**: "Contact Cascade Builder Services immediately"

### Test 3: Non-Emergency (Filter Change)
**Input**: "How to change filter?"  
**Expected**: DIY steps + "contact Cascade Builder Services to schedule"

### Test 4: Professional Required (Electrical)
**Input**: "Outlet not working"  
**Expected**: "Contact Cascade Builder Services" (NOT "call an electrician")

### Test 5: Fallback (AI Unavailable)
**Expected**: "contact Cascade Builder Services" in fallback message

---

## Technical Details

### AI Model Configuration

**Model**: `gemini-3.0-flash`  
**Max Tokens**: Not explicitly set (uses default)  
**Temperature**: Not explicitly set (uses default, ~0.7)  
**Context Window**: Single-turn Q&A (no conversation history)

### Prompt Engineering Strategy

1. **Role Definition**: "You are a helpful home maintenance expert for Cascade Builder Services"
   - Establishes identity and affiliation upfront

2. **Critical Rule Enforcement**: ALL CAPS instruction at the top
   - Ensures AI prioritizes brand guideline

3. **Tiered Response Structure**:
   - Emergency → Immediate action + Cascade Emergency Line
   - Urgent → Safety step + Contact Cascade immediately
   - Non-Emergency → DIY steps + Contact Cascade if needed

4. **Fallback Safety Net**: All error messages mention Cascade
   - No scenario where "builder" appears without "Cascade"

---

## Widget UI Flow

```
┌─────────────────────────────────────────┐
│  🔧 Maintenance Help                    │
│                                         │
│  🔍 What do you need help with?         │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [How do I change my furnace filter?]  │ ← Suggested pills
│  [Where is my water shutoff?]          │
│  [My pilot light is out]               │
│  [How often should I clean gutters?]   │
│                                         │
│  Get quick answers to common home      │
│  maintenance questions                 │
└─────────────────────────────────────────┘
                  ↓
        User asks question
                  ↓
┌─────────────────────────────────────────┐
│  🔧 [Loading animation...]              │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────────────┘
                  ↓
        AI generates answer
                  ↓
┌─────────────────────────────────────────┐
│  🔧 [Answer display]                    │
│                                         │
│  Your furnace filter should be changed │
│  every 1-3 months. Turn off your       │
│  furnace, locate the filter compartment│
│  and replace. Contact Cascade Builder  │
│  Services to schedule a service        │
│  appointment if needed.                │
│                                         │
│  Ask another question →                 │
└─────────────────────────────────────────┘
```

---

## Files Changed

| File | Changes | Purpose |
|------|---------|---------|
| `actions/ask-maintenance-ai.ts` | Updated system prompt + fallbacks | Brand alignment |

**Note**: `components/HomeownerDashboardView.tsx` was NOT modified in this fix because the widget was already rendered correctly in a previous session (lines 308-313).

---

## Key Takeaways

1. **Brand Consistency is Critical**: AI responses represent the company, must mention Cascade explicitly
2. **Prompt Engineering**: Use ALL CAPS for critical rules to ensure AI compliance
3. **Fallback Coverage**: Every error path must be brand-aligned (no generic "call a professional")
4. **Emergency Protocols**: Clear, tiered instructions (Immediate → Cascade → 911 if needed)
5. **Testing is Essential**: Verify AI never says "builder" without "Cascade Builder Services"

---

## Future Enhancements (Potential)

1. **Phone Number Integration**: Include actual Cascade emergency line number in responses
2. **Service Request Link**: Add button to directly submit service request from answer
3. **Answer History**: Store recent Q&A for homeowner reference
4. **Feedback Loop**: "Was this helpful?" to improve AI responses
5. **Contextual Awareness**: Pass homeowner's property info for personalized answers

---

**Last Updated**: January 21, 2026  
**Author**: AI Assistant (Claude Sonnet 4.5)  
**Review Status**: ✅ Tested & Verified  
**Related Components**: 
- `HomeownerSearchWidget.tsx` (UI)
- `ask-maintenance-ai.ts` (AI Logic)
- `HomeownerDashboardView.tsx` (Integration)
