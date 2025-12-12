# UploadThing Upload Fix

## Issue
"Upload failed: Failed to parse response from UploadThing server"

## Root Cause
The UploadThing middleware was requiring an authorization header, but with login disabled for testing, the client wasn't sending auth headers, causing the middleware to throw an error.

## Fix Applied
Updated `server/uploadthing.js` middleware to:
1. Allow uploads without authentication (for testing)
2. Return a default `userId` when auth is not available
3. Prevent errors from blocking uploads during testing

## To Test

1. **Make sure the server is running:**
   ```bash
   npm run server
   ```
   Or in a separate terminal:
   ```bash
   node server/index.js
   ```

2. **Check environment variables:**
   Make sure `.env.local` has:
   ```
   UPLOADTHING_APP_ID=your_app_id
   UPLOADTHING_SECRET=your_secret
   ```

3. **Test the upload:**
   - Try uploading a picture in the claim form
   - Check the server console for any errors
   - Check the browser console for detailed error messages

## If Still Not Working

1. **Check server is running:**
   - The server should be on `http://localhost:3000`
   - Check `http://localhost:3000/api/health` - should return `{"status":"ok"}`

2. **Check UploadThing credentials:**
   - Verify `UPLOADTHING_APP_ID` and `UPLOADTHING_SECRET` are set
   - Get them from https://uploadthing.com/dashboard

3. **Check browser console:**
   - Look for detailed error messages
   - Check Network tab for the `/api/uploadthing` request
   - See what response is being returned

4. **Check server logs:**
   - Look for any errors in the server console
   - Check if the middleware is being called

## Re-enabling Authentication

When you're ready to re-enable authentication, update `server/uploadthing.js`:
- Uncomment the auth checks in the middleware
- Remove the test_user fallback
- Implement proper Clerk session verification

