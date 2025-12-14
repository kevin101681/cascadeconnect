# Netlify Local Deployment Guide

This guide explains how to deploy your Cascade Connect app to Netlify directly from your local directory (without GitHub webhooks).

## Prerequisites

- Netlify CLI installed globally (already done)
- A Netlify account
- Your site already exists on Netlify (or you'll create it during setup)

## Initial Setup (One-Time)

### 1. Login to Netlify

```bash
npm run netlify:login
```

This will open your browser to authenticate with Netlify.

### 2. Link Your Site

If you already have a site on Netlify:

```bash
npm run netlify:init
```

Follow the prompts:
- Choose "Link this directory to an existing site on Netlify"
- Select your site from the list
- The CLI will create a `.netlify` folder with your site configuration

If you need to create a new site:

```bash
npm run netlify:init
```

Follow the prompts:
- Choose "Create & configure a new site"
- Enter a site name (or leave blank for auto-generated)
- The CLI will create the site and link it

## Deployment

### Deploy to Draft/Preview

Deploy to a draft URL (for testing before production):

```bash
npm run netlify:deploy
```

This will:
1. Build your app (`npm run build`)
2. Deploy to a draft URL
3. Show you the preview URL

### Deploy to Production

Deploy to your production site:

```bash
npm run netlify:deploy:prod
```

This will:
1. Build your app (`npm run build`)
2. Deploy to production
3. Show you the production URL

## Check Deployment Status

```bash
npm run netlify:status
```

This shows:
- Current site information
- Linked site ID
- Last deployment status

## Environment Variables

**Important:** Set environment variables in the Netlify dashboard, not in `netlify.toml`:

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add your variables:
   - `VITE_NEON_AUTH_URL`
   - `VITE_STACK_PUBLISHABLE_CLIENT_KEY` (if needed)
   - `VITE_GEMINI_API_KEY` (if using AI features)
   - Any other `VITE_*` variables your app needs

**Note:** Server-side variables like `DATABASE_URL`, `UPLOADTHING_SECRET`, etc. should be set in your backend environment, not Netlify (since Netlify only hosts the frontend).

## Build Configuration

The build is configured in `netlify.toml`:
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Processing:** CSS, JS, and HTML are bundled and minified

## Troubleshooting

### "Site not linked"

If you get an error about the site not being linked:

```bash
npm run netlify:init
```

Choose "Link this directory to an existing site on Netlify" and select your site.

### Build Failures

If the build fails:
1. Test locally: `npm run build`
2. Check the build logs in Netlify dashboard
3. Ensure all environment variables are set in Netlify dashboard

### Environment Variables Not Working

- Make sure variables are prefixed with `VITE_` for client-side access
- Redeploy after adding new environment variables
- Check that variables are set in the correct environment (Production, Deploy previews, or Branch deploys)

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run netlify:login` | Login to Netlify |
| `npm run netlify:init` | Link or create a site |
| `npm run netlify:deploy` | Deploy to draft/preview |
| `npm run netlify:deploy:prod` | Deploy to production |
| `npm run netlify:status` | Check deployment status |

## Next Steps

After initial setup, you can:
1. Deploy manually whenever you want: `npm run netlify:deploy:prod`
2. Set up continuous deployment from Git (optional, if you want to re-enable it later)
3. Configure custom domains in Netlify dashboard
4. Set up branch previews for pull requests (if using Git)






