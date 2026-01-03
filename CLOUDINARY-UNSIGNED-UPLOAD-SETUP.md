# Cloudinary Unsigned Upload Setup

## Problem
Netlify Functions have a **6MB request payload limit**. Files larger than ~5.5MB (after multipart encoding) fail with 500 errors when uploaded through our Netlify function.

## Solution
Use Cloudinary's **unsigned upload** feature for large files (>4MB). This uploads directly from the browser to Cloudinary, bypassing Netlify entirely.

## Setup Instructions

### 1. Log into Cloudinary Dashboard
Go to https://cloudinary.com/console

### 2. Create an Upload Preset
1. Navigate to **Settings** → **Upload** tab
2. Scroll to **Upload presets** section
3. Click **Add upload preset**

### 3. Configure the Preset

**Settings:**
- **Preset name**: `cascade-unsigned`
- **Signing mode**: **Unsigned** ⚠️ Important!
- **Folder**: `warranty-claims` (optional but recommended)
- **Upload mode**: Upload
- **Overwrite**: No
- **Unique filename**: Yes
- **Use filename**: Yes

**Allowed formats** (Security tab):
- jpg, jpeg, png, gif, webp, mp4, mov, avi, pdf, doc, docx

**File size limit** (Optional but recommended):
- Max file size: 10MB (10485760 bytes)

### 4. Save the Preset
Click **Save** at the bottom

### 5. Add Environment Variables

**Local development** (`.env.local`):
```bash
# Cloudinary - Server-side (for Netlify function)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Cloudinary - Client-side (for direct uploads)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=cascade-unsigned
```

**Netlify deployment**:
1. Go to Netlify Dashboard → Your Site → **Site configuration** → **Environment variables**
2. Add the same variables (click **Add a variable**):
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `VITE_CLOUDINARY_CLOUD_NAME` (same as CLOUDINARY_CLOUD_NAME)
   - `VITE_CLOUDINARY_UPLOAD_PRESET` = `cascade-unsigned`

### 6. Redeploy
After adding environment variables in Netlify, redeploy your site.

## How It Works

### Small Files (≤ 4MB)
```
Browser → Netlify Function → Cloudinary
```
- Uses authenticated upload through Netlify function
- More secure (credentials not exposed)
- Subject to Netlify's 6MB limit

### Large Files (> 4MB)
```
Browser → Cloudinary (direct)
```
- Uses unsigned upload preset
- Bypasses Netlify entirely
- No size limit (up to your Cloudinary plan limit)

## Security Notes

**Is unsigned upload safe?**
Yes, with proper configuration:
- ✅ Limited to specific folder (`warranty-claims`)
- ✅ File type restrictions (images, videos, docs only)
- ✅ File size limit (10MB max)
- ✅ No overwrites allowed
- ✅ Preset is read-only (users can't modify settings)

**What unsigned upload allows:**
- Upload files to `warranty-claims` folder
- Only allowed file types
- Max 10MB per file

**What unsigned upload does NOT allow:**
- Deleting files
- Modifying existing files
- Uploading to other folders
- Changing upload settings
- Accessing other Cloudinary resources

## Testing

After setup, test with files of various sizes:
1. **Small file (< 4MB)**: Should use Netlify function
   - Console shows: "Uploading file via Netlify function"
2. **Large file (> 4MB)**: Should use direct upload
   - Console shows: "Large file detected - using direct Cloudinary upload"

## Troubleshooting

### Error: "Invalid upload preset"
- Check that preset name matches exactly: `cascade-unsigned`
- Verify preset is set to **Unsigned** mode
- Check `VITE_CLOUDINARY_UPLOAD_PRESET` environment variable

### Error: "Upload preset must be unsigned"
- Edit the preset in Cloudinary dashboard
- Change **Signing mode** to **Unsigned**

### Error: "Upload failed - Forbidden"
- Check `VITE_CLOUDINARY_CLOUD_NAME` is set correctly
- Verify cloud name matches your Cloudinary account

### Files still failing at ~5.5MB
- Check that environment variables are set in Netlify (not just locally)
- Verify browser is using the updated code (clear cache)
- Check browser console for "using direct Cloudinary upload" message

## Verification

You should see in the browser console:
```
📤 [1/4] Uploading: large-file.jpg (5.86MB)
📤 Large file detected (5.86MB) - using direct Cloudinary upload
✅ Direct upload successful: large-file.jpg
```

If you see this, the setup is working correctly!

