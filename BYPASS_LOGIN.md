# Bypass Login for Local Development

To bypass the login screen during local development, open your browser's developer console and run:

```javascript
sessionStorage.setItem('cascade_bypass_login', 'true');
window.location.reload();
```

This will:
1. Set the bypass flag in sessionStorage
2. Reload the page
3. Skip the authentication screen and go straight to the app

## To Re-enable Login

To see the login screen again, clear the bypass flag:

```javascript
sessionStorage.removeItem('cascade_bypass_login');
window.location.reload();
```

## Alternative: Quick Console Command

You can also paste this one-liner in the browser console:

```javascript
sessionStorage.setItem('cascade_bypass_login', 'true'); location.reload();
```

## Note

This bypass flag only works in the browser session. Once you close the browser tab/window, the flag is cleared and you'll need to set it again.

