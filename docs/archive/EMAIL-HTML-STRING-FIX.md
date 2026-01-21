# Email HTML String Type Error - Fix

## Problem
SendGrid was rejecting emails with error: **"string expected for `html`"**

Error from function logs:
```
❌ Failed to send email: string expected for `html`
❌ Failed to send 'MATCH_NO_CLAIM' email: string expected for `html`
```

## Root Cause
The `render()` function from `@react-email/render` was not returning a proper string. The JSX component was being called as a function instead of being created as a React element, causing the render function to return an unexpected type.

## Solution Applied

### 1. Fixed React Element Creation (`lib/services/emailService.ts`)

**Before (incorrect):**
```typescript
const html = render(
  UniversalNotificationEmail({
    scenario,
    data,
    callsLink,
    homeownerLink,
    claimLink,
  })
);
```

**After (correct):**
```typescript
const React = require('react');
const { render } = require('@react-email/render');
const UniversalNotificationEmail = require('../../emails/UniversalNotificationEmail').default;

// Create React element properly
const emailElement = React.createElement(UniversalNotificationEmail, {
  scenario,
  data,
  callsLink,
  homeownerLink,
  claimLink,
});

// Render to HTML string
const html = render(emailElement);

// Ensure it's a string
const htmlString = typeof html === 'string' ? html : String(html);

// Debug logging
console.log('📧 HTML type:', typeof html);
console.log('📧 HTML length:', htmlString.length);
```

### 2. Added Type Validation in sendEmail Function

Added validation to catch non-string HTML early:
```typescript
if (request.html) {
  // Ensure html is a string
  if (typeof request.html !== 'string') {
    console.error('❌ HTML field is not a string:', typeof request.html);
    throw new Error(`HTML field must be a string, got ${typeof request.html}`);
  }
  msg.html = request.html;
}
```

## Why This Works

### React.createElement vs Function Call
- **Wrong**: `UniversalNotificationEmail({ props })` - Calls component as function
- **Right**: `React.createElement(UniversalNotificationEmail, props)` - Creates proper React element

The `render()` function from `@react-email/render` expects a React element (created via JSX or `createElement`), not the result of calling a component function.

### Type Coercion
- Explicitly converts render output to string with `String(html)` as fallback
- Logs the type for debugging
- Validates in `sendEmail` to catch issues early

## Testing

After this fix, emails should send successfully with proper HTML content. Check logs for:

```
📧 HTML type: string
📧 HTML length: 5432
✅ Email sent successfully (202)
```

## Files Modified

- `lib/services/emailService.ts`
  - Fixed `buildUniversalNotificationContent` to use `React.createElement`
  - Added HTML type validation in `sendEmail`
  - Added debug logging for HTML type and length

## Related Issues

This fix also addresses:
- Proper React element rendering for email templates
- Type safety for SendGrid API calls
- Better error messages for debugging email issues
