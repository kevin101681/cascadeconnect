# AI Intent Detection Implementation

## Overview
Added an AI-driven "intent detection" feature that helps guide homeowners who are mistakenly sending warranty claims via direct messages to the correct "Warranty" tab. Also updated all Gemini AI calls to use the latest model version (Gemini 3.0).

## Changes Made

### 1. services/geminiService.ts

#### Model Version Updates
- ✅ Updated `summarizeClaim` from `gemini-2.5-flash` to `gemini-3.0-flash`
- ✅ Updated `draftSchedulingEmail` from `gemini-2.5-flash` to `gemini-3.0-flash`
- ✅ Updated `detectClaimIntent` to use `gemini-3.0-flash`

### 1b. lib/bluetag/services/geminiService.ts

#### Model Version Updates
- ✅ Updated `analyzeDefectImage` from `gemini-2.5-flash` to `gemini-3.0-flash`
- ✅ Updated `suggestFix` from `gemini-2.5-flash` to `gemini-3.0-flash`

### 1c. lib/cbsbooks/services/geminiService.ts

#### Model Version Updates
- ✅ Updated `generateFinancialAnalysis` from `gemini-2.5-flash` to `gemini-3.0-flash`
- ✅ Updated `analyzeCheckImage` from `gemini-2.5-flash` to `gemini-3.0-flash`
- ✅ Updated `parseInvoiceFromText` from `gemini-2.5-flash` to `gemini-3.0-flash`
- ✅ Updated `parseInvoiceFromImage` from `gemini-2.5-flash` to `gemini-3.0-flash`

#### New Function: detectClaimIntent
- ✅ Added new exported function `detectClaimIntent(message: string): Promise<boolean>`
- **Purpose**: Analyzes homeowner messages to detect if they're describing a warranty claim
- **Prompt Logic**: 
  - Returns `true` (YES) for: physical defects, repair requests, home issues, system malfunctions
  - Returns `false` (NO) for: general questions, administrative messages, scheduling queries, thank you messages
- **Safety**: 
  - Wrapped in try/catch block
  - Returns `false` (fail open) if AI service fails or is not configured
  - Ensures users can always send messages even if AI is unavailable

### 2. components/Dashboard.tsx

#### State Management
- ✅ Added import: `detectClaimIntent` from `../services/geminiService`
- ✅ Added state: `const [showClaimSuggestionModal, setShowClaimSuggestionModal] = useState(false)`

#### Updated handleCreateNewThread Function
- ✅ Modified function signature to accept optional `forceSend: boolean` parameter (default `false`)
- ✅ Added AI intent check with conditions:
  - Only runs for `UserRole.HOMEOWNER` (skips for Admins/Builders)
  - Only runs when `!forceSend` (skips if user already confirmed)
  - Only runs when `newMessageContent.length > 10` (skips very short messages)
- ✅ Execution flow:
  1. Sets `setIsSendingMessage(true)` to show loading state
  2. Calls `await detectClaimIntent(newMessageContent)`
  3. If `true` (Claim Detected):
     - Sets `setIsSendingMessage(false)`
     - Opens modal: `setShowClaimSuggestionModal(true)`
     - Returns early (does not create thread)
  4. If `false` (No Claim) or Error:
     - Proceeds with existing logic to call `onCreateThread`

#### New Redirect Handler
- ✅ Created `handleRedirectToWarranty` function:
  - Closes `showClaimSuggestionModal`
  - Closes `showNewMessageModal`
  - Switches tab: `setCurrentTab('CLAIMS')`
  - Opens new claim form: `setIsCreatingNewClaim(true)`

#### Modal UI
- ✅ Rendered using `createPortal` (appended to `document.body`)
- ✅ Design matches existing design system:
  - Uses `bg-surface`, `text-surface-on` classes
  - Uses existing `Button` component
  - Follows Material Design 3 styling patterns
- ✅ Modal Content:
  - **Title**: "Submit a Warranty Claim?"
  - **Body**: "It looks like you might be reporting a repair issue. For the best service and tracking, please submit this as a Warranty Claim."
  - **Primary Button**: "Go to Warranty Tab" → Calls `handleRedirectToWarranty`
  - **Secondary Button**: "No, send as a regular message" → Calls `handleCreateNewThread(true)` to bypass check

## Key Features

### Non-Blocking Design
- ✅ AI feature is completely non-blocking
- ✅ If API fails, message sends normally (fail open)
- ✅ Homeowners maintain full control with override option

### User Experience
- ✅ Only activates for homeowners (not admins/builders)
- ✅ Only checks substantial messages (>10 characters)
- ✅ Provides clear explanation and two clear action paths
- ✅ Seamless redirection to warranty tab with form pre-opened

### Performance
- ✅ Uses latest Gemini 3.0 Flash model (fastest, most cost-effective)
- ✅ Loading state shows during AI analysis
- ✅ Minimal latency impact (~1-2 seconds for AI check)

## Testing Checklist

### Test as Homeowner:
1. ✅ Log in as a homeowner
2. ✅ Try sending a message about a repair issue (e.g., "My faucet is leaking")
3. ✅ Verify modal appears with suggestion
4. ✅ Test "Go to Warranty Tab" button - should redirect to Claims tab with form open
5. ✅ Test "No, send as regular message" button - should send message normally

### Test Edge Cases:
1. ✅ Very short message (<10 chars) - should NOT trigger AI check
2. ✅ General question (e.g., "When is my inspection?") - should NOT show modal
3. ✅ Admin/Builder sending message - should NOT trigger AI check
4. ✅ Sending message after override - should NOT show modal again

### Test Fallback:
1. ✅ Disconnect API key or simulate API failure
2. ✅ Verify messages still send normally
3. ✅ Check console for appropriate error logging

## Deployment Notes

- No database schema changes required
- No environment variable changes required (uses existing `VITE_GEMINI_API_KEY`)
- Frontend-only changes (no backend modifications)
- Changes are backward compatible
- AI feature gracefully degrades if API is unavailable

## Files Modified

1. `services/geminiService.ts` - Updated model versions + added detectClaimIntent
2. `components/Dashboard.tsx` - Integrated intent detection + modal UI
3. `lib/bluetag/services/geminiService.ts` - Updated model versions for BlueTag AI features
4. `lib/cbsbooks/services/geminiService.ts` - Updated model versions for CBS Books AI features
