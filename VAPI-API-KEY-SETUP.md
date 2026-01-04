# VAPI API Key Setup Guide

## Overview

The VAPI integration uses **two different keys** for different purposes:

1. **Webhook Secret** (`VAPI_SECRET`) - Verifies incoming webhook requests
2. **Private API Key** (`VAPI_PRIVATE_KEY`) - Authenticates API calls to VAPI

## The Issue

Previously, the code was using `VAPI_SECRET` for both purposes, which caused 401 authentication errors when trying to fetch call data from the VAPI API:

```
❌ Failed to fetch from Vapi API: Vapi API error: 401 - {"message":"Invalid Key. Hot tip, you may be using the private key instead of the public key, or vice versa.","error":"Unauthorized","statusCode":401}
```

## The Fix

The code now:
- Uses `VAPI_SECRET` **only** for webhook verification
- Uses `VAPI_PRIVATE_KEY` for API authentication
- Gracefully handles missing API key (skips fallback instead of failing)

## Environment Variables Needed

### Required
- `VAPI_SECRET` - Your VAPI webhook secret (used to verify incoming webhooks)

### Optional
- `VAPI_PRIVATE_KEY` (or `VAPI_API_KEY`) - Your VAPI private API key for making API calls

## Where to Add the Keys

### Netlify
1. Go to your Netlify dashboard
2. Navigate to: **Site settings > Environment variables**
3. Add both variables:
   - `VAPI_SECRET` = your webhook secret from VAPI dashboard
   - `VAPI_PRIVATE_KEY` = your private API key from VAPI dashboard

### How to Get the Keys from VAPI

1. **Webhook Secret** (`VAPI_SECRET`):
   - Go to VAPI Dashboard → Settings → Webhooks
   - Copy the webhook secret

2. **Private API Key** (`VAPI_PRIVATE_KEY`):
   - Go to VAPI Dashboard → Settings → API Keys
   - Copy the **Private Key** (starts with `sk_...`)

## When is the API Key Used?

The private API key is only used as a **fallback mechanism** when:
- Required data (like property address) is missing from the webhook payload
- The system needs to fetch complete call data from VAPI's API

**Most of the time**, the webhook includes all necessary data, so the API fallback never triggers. That's why your system works even without the private key configured.

## Current Behavior

- **With both keys configured**: Full functionality, API fallback works when needed
- **With only VAPI_SECRET**: Webhook works fine, API fallback is skipped (but you'll see a warning in logs)
- **Error logs are now informative**: Instead of 401 errors, you'll see: `⚠️ VAPI_PRIVATE_KEY not configured - skipping API fallback`

## Recommendation

**Add the `VAPI_PRIVATE_KEY` to Netlify** to enable the full fallback mechanism. This ensures that even if webhook data is incomplete, the system can fetch missing information from VAPI's API.

