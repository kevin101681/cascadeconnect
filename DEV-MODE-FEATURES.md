# 🔧 Development Mode Features

This document describes development-only features that are automatically enabled when running locally with `netlify dev`.

## 🚀 Quick Start

### Running in Development Mode
```bash
netlify dev
```

This starts the application at:
- **Netlify Dev Server:** `http://localhost:8888`
- **Vite Dev Server:** `http://localhost:5173` (proxied through Netlify)

---

## 🔓 Skip Login Button (Development Only)

### What It Does
A yellow "🔧 Skip Login (Dev Only)" button appears on the login screen **ONLY** when running locally. This allows you to bypass Clerk authentication during development.

### When It Appears
The button only shows when:
- `hostname === 'localhost'` OR
- `hostname === '127.0.0.1'` OR  
- `port === '8888'` (Netlify Dev) OR
- `port === '3000'` (Alternative dev port)

### How It Works
Clicking the button:
1. Sets `cascade_bypass_login = 'true'` in sessionStorage
2. Clears logout flags (`cascade_logged_out`, `cascade_force_login`)
3. Reloads the page
4. App.tsx detects the bypass flag and skips authentication

### Security
✅ **Production Safe** - The button will NOT appear in production because:
- Production hostname is NOT localhost
- Production port is NOT 8888 or 3000
- Button rendering is conditional on local environment detection

---

## 📋 Development Checklist

### Before Testing
- [ ] Run `netlify dev` (not `npm run dev`)
- [ ] Navigate to `http://localhost:8888`
- [ ] Verify "🔧 Skip Login (Dev Only)" button appears
- [ ] Click button to bypass authentication
- [ ] App should load without Clerk login

### Returning to Normal Login
To test the actual login flow:
1. Click "Sign Out" in the app
2. This clears the bypass flag
3. Login screen appears with authentication required
4. Skip Login button still available if needed

---

## 🧪 Testing Authentication

### Test Bypass Login
```bash
# Start dev server
netlify dev

# In browser
1. Go to http://localhost:8888
2. See login screen with yellow "Skip Login" button
3. Click "Skip Login"
4. App loads without authentication
```

### Test Real Authentication
```bash
# Start dev server
netlify dev

# In browser
1. Go to http://localhost:8888
2. Click "Sign In" or "Create Account" (ignore Skip button)
3. Complete Clerk authentication flow
4. Verify proper user role assignment
```

### Clear Bypass Flag Manually
```javascript
// In browser console
sessionStorage.removeItem('cascade_bypass_login');
location.reload();
```

---

## 🔐 Environment Detection Logic

The skip login button uses this detection:

```typescript
const isLocalDevelopment = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '8888' ||
  window.location.port === '3000';
```

### Environments Tested:

| Environment | Hostname | Port | Skip Button? |
|------------|----------|------|-------------|
| `netlify dev` | localhost | 8888 | ✅ YES |
| `npm run dev` | localhost | 5173 | ❌ NO* |
| Production | your-site.netlify.app | 443 | ❌ NO |
| Preview | deploy-preview.netlify.app | 443 | ❌ NO |

*Note: `npm run dev` doesn't include Netlify functions, use `netlify dev` instead.

---

## 🚨 Important Notes

### Production Safety
- ✅ Button will NEVER show in production
- ✅ Bypass flag is sessionStorage only (not persistent)
- ✅ Closing browser clears the bypass
- ✅ Production builds remove development code

### When to Use
- ✅ Testing Vapi webhooks locally
- ✅ Rapid feature development
- ✅ Testing without Clerk rate limits
- ✅ Database migrations and seeding
- ❌ Testing actual authentication flows
- ❌ Testing user permissions
- ❌ Security-related features

### Recommended Workflow
1. **Start with bypass** for rapid development
2. **Test with real auth** before committing
3. **Always test production build** before deploying

---

## 🐛 Troubleshooting

### Skip Login Button Not Appearing
**Problem:** Button doesn't show on login screen

**Solutions:**
1. Ensure you're using `netlify dev` (not `npm run dev`)
2. Check URL is `localhost:8888` (not `localhost:5173`)
3. Clear browser cache and reload
4. Check browser console for errors

### Bypass Not Working
**Problem:** Still showing login after clicking Skip Login

**Solutions:**
1. Check browser console for reload confirmation
2. Verify sessionStorage has `cascade_bypass_login = 'true'`:
   ```javascript
   console.log(sessionStorage.getItem('cascade_bypass_login'));
   ```
3. Clear all session storage and try again:
   ```javascript
   sessionStorage.clear();
   location.reload();
   ```

### Stuck in Bypass Mode
**Problem:** Can't get back to login screen

**Solutions:**
1. Click "Sign Out" button in app (clears bypass)
2. Manually clear sessionStorage:
   ```javascript
   sessionStorage.removeItem('cascade_bypass_login');
   location.reload();
   ```
3. Open in incognito/private window (fresh session)

---

## 📝 Related Files

- **`components/AuthScreen.tsx`** - Contains Skip Login button logic
- **`App.tsx`** (lines 3675-3684) - Bypass detection logic
- **`BYPASS_LOGIN.md`** - Previous bypass documentation

---

## 🎯 Quick Commands

```bash
# Start development server with bypass available
netlify dev

# Test with real authentication (sign in normally)
netlify dev
# Then use regular login buttons

# Force show login screen (in browser console)
sessionStorage.setItem('cascade_force_login', 'true');
location.reload();

# Enable bypass (in browser console)
sessionStorage.setItem('cascade_bypass_login', 'true');
location.reload();

# Disable bypass (in browser console)
sessionStorage.removeItem('cascade_bypass_login');
location.reload();

# Clear all auth flags (in browser console)
sessionStorage.clear();
location.reload();
```

---

**💡 Pro Tip:** Keep the Skip Login button for development, but always test with real authentication before pushing to production to ensure proper role assignment and permissions!

