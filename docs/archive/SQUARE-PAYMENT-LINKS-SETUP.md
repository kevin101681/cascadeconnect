# Square Payment Links - Setup & Troubleshooting

## The Issue (Now Fixed)

When clicking "Pay Online" on invoice PDFs, you were getting:
```
This square.link page can't be found
No webpage was found for the web address: https://square.link/u/mock-uluy4
HTTP ERROR 404
```

## Root Cause

The payment link creation function was:
1. In the wrong location (`lib/cbsbooks/netlify/functions/` instead of `netlify/functions/`)
2. Being called at the wrong endpoint (`/api/cbsbooks/create-payment-link` instead of `/.netlify/functions/create-payment-link`)
3. Silently falling back to mock links when the API wasn't available

## The Fix

1. ✅ Created `netlify/functions/create-payment-link.ts` in the correct location
2. ✅ Updated API service to call the Netlify function endpoint
3. ✅ Changed error handling to throw errors instead of silently using mock links

## Required Environment Variables

For payment links to work, you need to set these in Netlify:

### Required
- `SQUARE_ACCESS_TOKEN` - Your Square production access token (starts with `EAAA...`)
- `SQUARE_LOCATION_ID` - Your Square location ID (NOT the Application ID)

### Optional
- `SQUARE_ENVIRONMENT` - Set to `sandbox` for testing, or omit/set to `production` for live payments

## How to Get Your Square Credentials

### 1. Square Access Token
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to **Credentials** tab
4. Copy the **Production Access Token** (starts with `EAAA...`)
   - ⚠️ **DO NOT** use the Application ID (starts with `sq0idp-...`)

### 2. Square Location ID
1. In Square Developer Dashboard
2. Go to **Locations** tab
3. Copy your location ID
   - ⚠️ **DO NOT** use the Application ID

## Adding to Netlify

1. Go to your Netlify dashboard
2. Navigate to: **Site settings > Environment variables**
3. Add both variables:
   ```
   SQUARE_ACCESS_TOKEN = EAAA...your-token...
   SQUARE_LOCATION_ID = L...your-location-id...
   SQUARE_ENVIRONMENT = production
   ```
4. Click **Save**
5. **Redeploy** your site for changes to take effect

## Testing

After setting up:

1. Create or edit an invoice with a total amount > 0
2. Generate the PDF
3. Click the "Pay Online" button
4. You should see a real Square checkout page instead of a 404 error

## Common Errors & Solutions

### Error: "Square configuration missing"
**Solution:** Add `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID` to Netlify environment variables

### Error: "Invalid Square Configuration: You provided an Application ID"
**Solution:** You're using the wrong ID. Use the Access Token (EAAA...) not the Application ID (sq0idp-...)

### Error: "Square Location Mismatch"
**Solution:** The Location ID doesn't belong to your Access Token. Verify both are from the same Square account.

### Error: "Square Auth Failed"
**Solution:** 
- Check if you're using Production token with `production` environment
- Or Sandbox token with `sandbox` environment
- They cannot be mixed

## How Payment Links Work

1. When you save an invoice with `total > 0`, the system automatically calls the Netlify function
2. The function creates a Square payment link via Square's API
3. The link is saved to the invoice record
4. When the PDF is generated, the link is embedded in the "Pay Online" button
5. Customers can click the button to pay directly through Square

## Status

✅ **Fixed** - Payment links now create real Square checkout URLs
✅ **Deployed** - Function is in correct location and callable
⚠️ **Action Required** - You need to add Square credentials to Netlify environment variables

Once you add the credentials and redeploy, payment links will work!

