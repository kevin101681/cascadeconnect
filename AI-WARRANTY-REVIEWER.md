# ✨ AI Warranty Reviewer Feature

## Overview
The AI Warranty Reviewer is an intelligent assistant that helps admins quickly analyze warranty claims against established warranty guidelines. Using OpenAI's GPT-4o model, it provides instant recommendations, reasoning, and pre-written homeowner responses.

---

## Features

### 1. **Instant Claim Analysis** ⚡
- Analyzes claim title and description against comprehensive warranty guidelines
- Provides a recommendation: **Approved**, **Denied**, or **Needs More Info**
- Cites specific warranty rules that apply to the claim

### 2. **Pre-Written Responses** 📝
- Generates professional, empathetic responses for homeowners
- Maintains a polite but firm tone
- Suggests alternatives when denying claims (e.g., homeowner's insurance)
- One-click copy to clipboard

### 3. **Admin-Only Access** 🔒
- Only visible to users with Admin role
- Appears in the Claim Detail editor view
- Non-intrusive UI that can be dismissed

---

## How It Works

### Backend Architecture

**File:** `actions/ai-review.ts`

```typescript
export async function analyzeClaim(
  claimTitle: string,
  claimDescription: string
): Promise<AIReviewResult>
```

#### Warranty Guidelines
The system uses a comprehensive set of warranty guidelines covering:
- **Structural Coverage** (foundation cracks, settlement issues)
- **Exterior Coverage** (siding, paint, roofing)
- **Interior Coverage** (nail pops, drywall, flooring, cabinets)
- **Plumbing Coverage** (leaks, fixtures, water heaters)
- **Electrical Coverage** (wiring, breakers, fixtures)
- **HVAC Coverage** (system defects, maintenance)
- **General Exclusions** (wear and tear, neglect, weather damage)

#### AI Model Configuration
- **Model:** `gpt-4o` (OpenAI's latest multimodal model)
- **Temperature:** `0.3` (low for consistent, factual responses)
- **Response Format:** Structured JSON
- **Max Tokens:** 1000

#### System Prompt
The AI is instructed to:
1. Act as a strict but polite Warranty Officer
2. Review claims strictly against the provided guidelines
3. Determine approval status (Approved/Denied/Needs Info)
4. Cite specific guideline rules
5. Write professional homeowner responses

---

## Frontend Integration

### UI Components

**File:** `components/ClaimInlineEditor.tsx`

#### 1. AI Review Button
Located below the claim description field (admin view only):

```tsx
<button onClick={handleAiReview} disabled={isAnalyzing}>
  ✨ AI Review
</button>
```

**States:**
- **Idle:** Shows "✨ AI Review" button
- **Analyzing:** Shows spinner with "Analyzing against warranty docs..."
- **Complete:** Displays results card

#### 2. AI Analysis Results Card
A prominent card displaying:

**Status Badge:**
- 🟢 **Approved** (Green badge with checkmark)
- 🔴 **Denied** (Red badge with X)
- 🟡 **Needs Info** (Amber badge with info icon)

**Reasoning Section:**
- Explains why the recommendation was made
- Cites specific warranty guideline rules
- Clear, admin-focused language

**Response Draft:**
- Full homeowner-facing response text
- Professional, empathetic tone
- "Copy Draft" button for quick clipboard copy
- Can be pasted directly into homeowner communications

---

## Usage Workflow

### For Admins

1. **Open a Claim**
   - Navigate to a claim in the admin Claims tab
   - Click to open the Claim Detail editor

2. **Click "✨ AI Review"**
   - Button located below the description field
   - Requires title and description to be present

3. **Wait for Analysis** (~2-5 seconds)
   - Shows loading state: "Analyzing against warranty docs..."
   - AI processes the claim against guidelines

4. **Review Results**
   - **Status Badge** shows Approved/Denied/Needs Info
   - **Reasoning** explains the AI's logic
   - **Response Draft** provides homeowner-ready text

5. **Copy and Use**
   - Click "Copy Draft" to copy response to clipboard
   - Paste into email, message, or Non-Warranty Explanation field
   - Customize as needed before sending

6. **Make Decision**
   - Use AI recommendation as guidance
   - Admin has final say on claim status
   - Can manually override AI recommendation

---

## Example Analysis

### Input
**Title:** "Nail Pops in Living Room Ceiling"  
**Description:** "We moved in 18 months ago and now have 5 nail pops showing through the ceiling paint in the living room. They're very noticeable."

### AI Output

**Status:** ❌ **Denied**

**Reasoning:**
```
According to WARRANTY GUIDELINES - INTERIOR COVERAGE:
"Nail pops: COVERED in first year only"

This claim is for nail pops that appeared 18 months after move-in,
which is beyond the 1-year coverage period for nail pops. While this
is a common occurrence in new homes, it falls outside the warranty
coverage timeframe.
```

**Response Draft:**
```
Dear Homeowner,

Thank you for submitting your warranty claim regarding the nail pops
in your living room ceiling. After reviewing your claim against our
warranty guidelines, we must respectfully inform you that nail pops
are covered only within the first year after move-in.

Since your home is 18 months old, this repair falls outside the
warranty coverage period. However, nail pops are generally
straightforward to repair. We recommend contacting a local handyman
or drywall contractor who can patch and repaint the affected areas
at a reasonable cost.

If you have any questions about this decision or need clarification
on what is covered under your warranty, please don't hesitate to
reach out.

Sincerely,
CASCADE CONNECT Warranty Team
```

---

## Technical Details

### Environment Variables Required

```bash
# .env or Netlify environment variables
OPENAI_API_KEY=sk-...
# OR
VITE_OPENAI_API_KEY=sk-...
```

### API Costs

- **Model:** GPT-4o
- **Approximate cost per analysis:** $0.01 - $0.03
- **Tokens used:** ~500-1000 per request
- **Cost-effective** for claim processing

### Error Handling

If AI analysis fails:
- Returns fallback response: "Needs Info"
- Reasoning: "AI analysis failed. Please review manually."
- Generic response draft provided
- Admin can still process claim manually

---

## Security & Privacy

### Data Handling
- **No Storage:** Claim data is sent to OpenAI API but not stored by OpenAI (per their API policies)
- **Admin-Only:** Feature only accessible to users with Admin role
- **No PII Required:** Only analyzes claim title/description (no homeowner names, addresses, etc.)

### Recommendations
- ✅ Use for initial guidance
- ✅ Verify AI reasoning against actual warranty docs
- ✅ Customize responses before sending
- ❌ Don't rely solely on AI for legal warranty decisions
- ❌ Don't send AI responses without review

---

## Customization

### Updating Warranty Guidelines

**File:** `actions/ai-review.ts`

Update the `WARRANTY_GUIDELINES` constant:

```typescript
const WARRANTY_GUIDELINES = `
CASCADE CONNECT STANDARD WARRANTY GUIDELINES

[Add your specific warranty terms here]
`;
```

### Adjusting AI Behavior

**Temperature:** Lower = more consistent, higher = more creative
```typescript
temperature: 0.3, // Current setting (consistent)
```

**System Prompt:** Modify tone and instructions
```typescript
const systemPrompt = `You are a...`;
```

---

## Future Enhancements

### Phase 2 (Planned)
1. **Attachment Analysis**
   - Send images to GPT-4o for visual analysis
   - Detect crack widths, defects from photos
   - More accurate recommendations

2. **Learning From Decisions**
   - Track when admins override AI
   - Fine-tune model on actual decisions
   - Improve accuracy over time

3. **Guideline Updates**
   - Admin UI to update warranty guidelines
   - Version control for guideline changes
   - Historical analysis tracking

4. **Batch Processing**
   - Analyze multiple claims at once
   - Priority ranking based on AI analysis
   - Bulk response generation

5. **Homeowner Communication**
   - Auto-generate email drafts
   - SMS notification templates
   - Multi-language support

---

## Files Modified

### New Files
- ✅ `actions/ai-review.ts` - OpenAI integration and analysis logic
- ✅ `AI-WARRANTY-REVIEWER.md` - This documentation

### Modified Files
- ✅ `components/ClaimInlineEditor.tsx` - Added AI Review button and results UI
- ✅ `package.json` - Added `openai` dependency

---

## Testing Checklist

### Functional Testing
- [ ] AI Review button appears for admins
- [ ] Button hidden for non-admin roles
- [ ] Loading state displays during analysis
- [ ] Results card shows all 3 sections (status, reasoning, response)
- [ ] Copy Draft button copies to clipboard
- [ ] Close button dismisses results
- [ ] Error handling shows fallback for API failures

### Edge Cases
- [ ] Empty title/description → Shows alert
- [ ] Very long description → Handles token limits
- [ ] Network error → Shows fallback response
- [ ] Missing API key → Graceful degradation

### UI/UX Testing
- [ ] Button styling matches design system
- [ ] Results card is visually prominent
- [ ] Dark mode styling correct
- [ ] Mobile responsive layout
- [ ] Animations smooth and professional

---

## Deployment Notes

### Before Deploying
1. **Set Environment Variable:**
   ```bash
   # Netlify Dashboard → Site Settings → Environment Variables
   OPENAI_API_KEY=sk-...
   ```

2. **Test in Staging:**
   - Process a few test claims
   - Verify API responses
   - Check cost tracking in OpenAI dashboard

3. **Monitor Usage:**
   - Track API calls in OpenAI dashboard
   - Set usage alerts if needed
   - Monitor costs

### After Deploying
1. Train admin team on feature
2. Establish review workflow (AI → Admin → Homeowner)
3. Collect feedback on accuracy
4. Iterate on warranty guidelines as needed

---

## Support & Troubleshooting

### Common Issues

**"AI analysis failed" message:**
- Check OPENAI_API_KEY is set correctly
- Verify API key has sufficient credits
- Check network connectivity

**Results don't match guidelines:**
- Review and update WARRANTY_GUIDELINES constant
- Consider adjusting temperature (lower = more strict)
- Provide more context in claim description

**Slow response times:**
- Normal: 2-5 seconds for GPT-4o
- If consistently > 10 seconds, check OpenAI API status
- Consider caching for repeated analyses

---

**Implemented:** January 7, 2026  
**Status:** ✅ Ready for testing and deployment  
**AI Model:** GPT-4o (OpenAI)  
**Cost per Analysis:** ~$0.01-$0.03

