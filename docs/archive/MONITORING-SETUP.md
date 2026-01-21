# 🚀 Monitoring & Analytics Setup Guide

This guide explains how to configure Sentry (error tracking) and PostHog (product analytics) for the Cascade Connect Homeowner Portal.

---

## 📋 Table of Contents

1. [Environment Variables](#environment-variables)
2. [Sentry Setup](#sentry-setup)
3. [PostHog Setup](#posthog-setup)
4. [Clerk Integration](#clerk-integration)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)

---

## 🔐 Environment Variables

Add these variables to your `.env.local` file (for local development) and to your hosting provider's environment variables (for production).

### Required Variables

```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/123456
VITE_SENTRY_ENVIRONMENT=production  # or development, staging, etc.

# PostHog Configuration
VITE_POSTHOG_KEY=phc_your_project_api_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com  # Default US region
```

### Optional Variables (for advanced configuration)

```bash
# Sentry Release Tracking (for better error tracking)
VITE_SENTRY_RELEASE=cascade-connect@1.0.0

# Sentry Debug Mode (only for development)
VITE_SENTRY_DEBUG=true

# Sentry Build-time Variables (for source map upload)
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### Example `.env.local` File

Create a `.env.local` file in your project root:

```bash
# Clerk (already configured)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Sentry
VITE_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/123456
VITE_SENTRY_ENVIRONMENT=development

# PostHog
VITE_POSTHOG_KEY=phc_abc123xyz
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

---

## 🛡️ Sentry Setup

### Step 1: Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up
2. Create a new project and select **React** as the platform
3. Copy your **DSN** (Data Source Name)

### Step 2: Configure Environment Variables

Add to your `.env.local`:

```bash
VITE_SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/123456
VITE_SENTRY_ENVIRONMENT=development
```

### Step 3: (Optional) Enable Source Map Upload

For production builds, Sentry can upload source maps to provide better stack traces:

1. Create an auth token at: [Sentry Settings > Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/)
2. Add these to your `.env.local` or CI/CD environment:

```bash
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### Step 4: Test Error Tracking

Add this button anywhere in your app to test:

```tsx
<button onClick={() => { throw new Error("Test Sentry Error"); }}>
  Test Error
</button>
```

You should see the error in your Sentry dashboard within seconds.

---

## 📊 PostHog Setup

### Step 1: Create a PostHog Account

1. Go to [posthog.com](https://posthog.com) and sign up
2. Create a new project
3. Copy your **Project API Key** and **Host**

### Step 2: Configure Environment Variables

Add to your `.env.local`:

```bash
VITE_POSTHOG_KEY=phc_your_project_api_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

> **Note**: The host URL depends on your region:
> - US: `https://us.i.posthog.com`
> - EU: `https://eu.i.posthog.com`

### Step 3: Test Analytics Tracking

1. Start your development server: `npm run dev`
2. Open your browser's console
3. Navigate between pages - you should see PostHog logs: `📊 PostHog pageview: /dashboard`
4. Check your PostHog dashboard for events

---

## 👤 Clerk Integration

The setup automatically integrates with Clerk for user identification.

### User Identification

When a user signs in with Clerk, PostHog automatically identifies them:

```typescript
// This happens automatically in PostHogProvider
posthog.identify(user.id, {
  email: user.primaryEmailAddress?.emailAddress,
  name: user.fullName,
  firstName: user.firstName,
  lastName: user.lastName,
});
```

### User Reset on Logout

Update your logout handler to reset PostHog:

```typescript
import { resetUser } from './components/providers/PostHogProvider';

// In your logout function
const handleLogout = async () => {
  await signOut(); // Clerk signOut
  resetUser(); // Reset PostHog
};
```

---

## 🧪 Testing

### Test Sentry Error Tracking

1. **Throw a test error:**

```tsx
<button onClick={() => { throw new Error("Test Error"); }}>
  Test Sentry
</button>
```

2. **Check Sentry Dashboard:**
   - Go to [sentry.io](https://sentry.io)
   - Navigate to Issues
   - You should see your test error with full stack trace

### Test PostHog Analytics

1. **Track a custom event:**

```tsx
import { trackEvent } from './components/providers/PostHogProvider';

<button onClick={() => trackEvent('button_clicked', { button_name: 'test' })}>
  Track Event
</button>
```

2. **Check PostHog Dashboard:**
   - Go to your PostHog dashboard
   - Navigate to Events
   - You should see your custom event

---

## 🚀 Production Deployment

### Checklist Before Production

- [ ] Add all environment variables to your hosting provider (Netlify, Vercel, etc.)
- [ ] Set `VITE_SENTRY_ENVIRONMENT=production`
- [ ] Test error tracking in staging environment
- [ ] Test analytics tracking in staging environment
- [ ] Configure Sentry alerts (optional)
- [ ] Set up PostHog session replay (already configured)
- [ ] Review privacy settings in PostHog

### Netlify Environment Variables

If deploying to Netlify:

1. Go to **Site Settings > Environment Variables**
2. Add all `VITE_*` variables
3. Add `SENTRY_*` variables for build-time source map upload
4. Click **Save**

### Build Command

```bash
npm run build
```

This will:
- Build your application
- Upload source maps to Sentry (if auth token is configured)
- Generate optimized production bundle

---

## 🔒 Privacy Considerations

Both Sentry and PostHog are configured with privacy in mind:

### Sentry Privacy

- All sensitive headers (Authorization, Cookie) are filtered out
- Browser extension errors are ignored
- Session replays mask all text and media by default

### PostHog Privacy

- Form inputs are masked automatically
- Only identified users create person profiles (saves costs)
- "Do Not Track" is respected
- Session replay is disabled in development
- Sample rate is 50% in production (adjustable)

---

## 📚 Additional Resources

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [PostHog React Documentation](https://posthog.com/docs/libraries/react)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [PostHog Session Replay](https://posthog.com/docs/session-replay)

---

## 🆘 Troubleshooting

### Sentry Not Tracking Errors

1. Check that `VITE_SENTRY_DSN` is set correctly
2. Look for initialization message in browser console: `✅ Sentry initialized`
3. In development, errors are logged but not sent (unless `VITE_SENTRY_DEBUG=true`)
4. Check browser network tab for requests to `sentry.io`

### PostHog Not Tracking Events

1. Check that `VITE_POSTHOG_KEY` is set correctly
2. Look for initialization message: `✅ PostHog initialized`
3. Check browser console for pageview logs: `📊 PostHog pageview: /path`
4. Verify your PostHog host URL matches your region
5. Check browser network tab for requests to PostHog host

### Source Maps Not Uploaded

1. Verify `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set
2. Check that you're running a production build: `npm run build`
3. Look for Sentry plugin output in build logs
4. Verify auth token has the `project:releases` scope

---

## 📞 Support

If you encounter any issues:

1. Check the browser console for error messages
2. Review the environment variables
3. Consult the official documentation
4. Contact your team lead

---

**Last Updated**: January 2026
**Version**: 1.0.0
