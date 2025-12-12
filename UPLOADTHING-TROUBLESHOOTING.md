# UploadThing Troubleshooting Guide

## Error: "Failed to parse response from UploadThing server"

This error typically means the server isn't responding correctly or the response format is invalid.

### Step 1: Check if Server is Running

1. **Start the server:**
   ```bash
   npm run server
   ```
   Or in a separate terminal:
   ```bash
   node server/index.js
   ```

2. **Verify server is running:**
   - Open `http://localhost:3000/api/health` in your browser
   - Should return: `{"status":"ok","message":"Cascade Connect Backend is running","uploadthingConfigured":true}`

### Step 2: Check UploadThing Credentials

1. **Check `.env.local` file:**
   ```env
   UPLOADTHING_APP_ID=your_app_id_here
   UPLOADTHING_SECRET=your_secret_here
   ```

2. **Get credentials from UploadThing:**
   - Go to https://uploadthing.com/dashboard
   - Create an app if you haven't
   - Copy the App ID and Secret Key
   - Add them to `.env.local`

3. **Restart the server** after adding credentials

### Step 3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for detailed error messages
4. Check Network tab for the `/api/uploadthing` request:
   - What status code is returned?
   - What is the response body?
   - Is the request reaching the server?

### Step 4: Check Server Console

Look for:
- `✅ UploadThing credentials configured` - Good!
- `⚠️ WARNING: UPLOADTHING_APP_ID or UPLOADTHING_SECRET not set!` - Bad, need to set credentials
- `UploadThing middleware called, userId: ...` - Middleware is working
- Any error messages

### Step 5: Common Issues

#### Issue: Server not running
**Solution:** Start the server with `npm run server`

#### Issue: Missing credentials
**Solution:** Add `UPLOADTHING_APP_ID` and `UPLOADTHING_SECRET` to `.env.local`

#### Issue: CORS errors
**Solution:** The server already has CORS enabled. If still having issues, check `vite.config.ts` proxy settings.

#### Issue: Wrong endpoint URL
**Solution:** The client uses `/api/uploadthing` which should proxy to `http://localhost:3000/api/uploadthing`

### Step 6: Test Upload

1. Make sure server is running
2. Check `/api/health` endpoint
3. Try uploading a small image (< 1MB) first
4. Check both browser console and server console for errors

### Debug Mode

To see more detailed logs, the server now logs:
- When middleware is called
- When uploads complete
- Any errors that occur

Check the server console output when attempting an upload.

