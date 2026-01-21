# Deploy Troubleshooting Guide - Changes Not Appearing

## Issue Summary

**Problem**: Successfully deployed to Netlify, but changes not visible on live site.

**Symptoms**:
- ✅ Git push successful
- ✅ Netlify build completed
- ✅ No build errors
- ❌ Floating chat widget not appearing
- ❌ HomeownerCard "View As" button not appearing
- ❌ "Enroll Homeowner" still in header

---

## Root Causes Identified

### 1. ✅ Floating Chat Widget - DEPLOYED CORRECTLY

The code IS in the deployed build with proper `hidden md:block` wrapper.

**Why you might not see it**:

#### A. User Role Check
The widget only appears for **admin users**:

```typescript
{isAdmin && (
  <div className="hidden md:block">
    {/* Floating chat FAB button */}
  </div>
)}
```

**Checklist**:
- [ ] Are you logged in as an admin?
- [ ] Check browser console: `console.log(userRole)` - should be `"ADMIN"`
- [ ] Verify you're not in "homeowner view" mode

#### B. Screen Size
The widget is hidden on mobile:

```typescript
<div className="hidden md:block">  // Only visible ≥768px
```

**Checklist**:
- [ ] Browser window width ≥ 768px?
- [ ] Open DevTools → Responsive Design Mode → Set to Desktop
- [ ] Check Computed styles: should have `display: block` not `display: none`

#### C. Z-index / Stacking Context
The button is at `z-50`:

```typescript
className="... z-50 ..."  // Should be on top
```

**Checklist**:
- [ ] Inspect element - is it in the DOM?
- [ ] Check if covered by another element
- [ ] Try increasing z-index to `z-[999]` temporarily

---

### 2. ✅ HomeownerCard Buttons - NOW FIXED

**Issue**: Dashboard wasn't passing `onEdit` or `onViewAs` props.

**Fix Applied** (Latest Commit):
```typescript
<HomeownerCard
  {...existingProps}
  onEdit={isAdmin ? () => { alert('Edit...') } : undefined}  // ✅ Added
  onViewAs={isAdmin ? () => { alert('View As...') } : undefined}  // ✅ Added
/>
```

**Checklist**:
- [ ] Buttons will appear after next Netlify deploy
- [ ] Only visible for admin users
- [ ] Clicking shows alert (placeholder functionality)

---

### 3. ❓ Header Menu Changes

**Expected**: "Enroll Homeowner" and "Switch to Homeowner" removed from header.

**File Modified**: `components/Layout.tsx` (Commit `ed35418`)

**Verification Steps**:
1. Check git history:
   ```bash
   git show ed35418:components/Layout.tsx | grep "Enroll Homeowner"
   ```
   Should return nothing (removed).

2. Check deployed build:
   - Open DevTools → Network tab
   - Find main JS bundle (e.g., `main-ClsyoMlS.js`)
   - Search bundle for "Enroll Homeowner" text
   - If found → old build cached
   - If not found → change is deployed

---

## 🔍 Debugging Steps

### Step 1: Verify Build Hash
Current build hash: `main-ClsyoMlS.js:842`

**Check if this matches latest commit**:
```bash
git log --oneline -5
```

Latest commits should include:
- `507b479` - Floating chat widget restore
- `ed35418` - Per-builder enrollment (HomeownerCard buttons)

### Step 2: Hard Refresh Browser
**Windows/Linux**: `Ctrl + Shift + R`  
**Mac**: `Cmd + Shift + R`

### Step 3: Clear All Caches
1. **Browser**: DevTools → Application → Storage → Clear site data
2. **Netlify**: Already done (manual deploy without cache)
3. **Service Worker**: Check for active service workers and unregister

### Step 4: Verify You're on Production URL
- Ensure you're not on a deploy preview URL
- Check URL is your main Netlify domain
- Netlify dashboard → Domains → verify primary domain

### Step 5: Check Build Logs
Netlify Dashboard → Deploys → [Latest Deploy] → Check for:
- `✓ Build completed successfully`
- `✓ Publishing...`
- `✓ Site is live`

### Step 6: Inspect DOM
**Floating Chat Widget**:
```javascript
// In browser console:
document.querySelector('[aria-label="Open Team Chat"]')
// Should return the button element if present
```

**HomeownerCard Buttons**:
```javascript
// In browser console:
document.querySelectorAll('[title="View As Homeowner"]')
// Should return NodeList with button(s)
```

---

## 🚀 Force Deploy Checklist

If changes still don't appear:

### 1. Verify Latest Commit Pushed
```bash
git log --oneline -3
git rev-parse HEAD
git rev-parse origin/main
```
Both should match.

### 2. Trigger New Deploy
```bash
git commit --allow-empty -m "chore: force Netlify rebuild"
git push
```

### 3. Watch Deploy in Real-Time
- Netlify Dashboard → Deploys → Watch build log
- Look for:
  - `npm run build`
  - `tsc && vite build`
  - `Publishing...`

### 4. Get New Build Hash
After deploy completes:
- Open site in incognito mode
- DevTools → Sources tab
- Find new `main-XXXXXXXX.js` filename
- Compare to old hash

---

## 🎯 Expected Results After Fix

### Desktop (≥768px, Admin User)
- ✅ Floating chat FAB button at bottom-right
- ✅ HomeownerCard shows "View As" button (Eye icon, blue)
- ✅ HomeownerCard shows "Edit" button (Edit2 icon, gray)

### Mobile (<768px, Admin User)
- ❌ No floating chat button (uses Team Chat tab instead)
- ✅ HomeownerCard shows "View As" and "Edit" buttons

### All Views
- ❌ Header should NOT show "Enroll Homeowner"
- ❌ Header should NOT show "Switch to Homeowner View"

---

## 📝 Commits Reference

| Feature | Commit | Status |
|---------|--------|--------|
| Floating Chat Widget | `507b479` | ✅ Deployed |
| HomeownerCard Buttons (code) | `ed35418` | ✅ Deployed |
| HomeownerCard Buttons (props) | `[latest]` | ⏳ Pending deploy |
| Header Cleanup | `ed35418` | ❓ Verify |

---

## 🆘 If Still Not Working

### Check These Common Issues:

1. **Wrong User Role**
   - Log out and log back in
   - Verify admin permissions in database
   - Check Clerk dashboard for user roles

2. **Browser Extensions**
   - Disable ad blockers
   - Disable privacy extensions
   - Test in incognito mode

3. **Netlify Deploy Context**
   - Check if you have multiple deploy contexts (production/staging)
   - Verify you're looking at the right one
   - Check environment variables are set

4. **React Lazy Loading**
   - Floating chat widget is lazy-loaded
   - Check browser console for lazy load errors
   - Look for "Failed to load chunk" errors

5. **Bundle Splitting**
   - Vite may split code into chunks
   - Some changes might be in different JS files
   - Clear browser cache completely

---

## ✅ Quick Win: Test in Incognito

Open site in incognito/private browsing mode:
- Forces fresh cache
- No service workers
- No stored data
- Clean slate

If it works there → cache issue  
If it doesn't work → deploy issue

---

## 📞 Support Info

**Latest Build**: Check Netlify deploy timestamp  
**Latest Commit**: `git log -1 --format="%H %s"`  
**User Role**: Check in browser console: `localStorage` or session  
**Screen Size**: Check DevTools → Device toolbar

Once you verify your user role and screen size, the changes should be visible on the next deploy!
