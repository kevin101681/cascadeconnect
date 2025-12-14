# Progressive Web App (PWA) Setup

Your Cascade Connect app is now configured as a Progressive Web App (PWA), which means users can install it on their devices like a native app.

## What's Configured

✅ **PWA Plugin**: `vite-plugin-pwa` installed and configured
✅ **Web App Manifest**: Automatically generated with app metadata
✅ **Service Worker**: Automatically generated for offline functionality
✅ **Meta Tags**: Added to `index.html` for mobile app support
✅ **Icons**: Configured to use `/logo.png`

## How Users Can Install

### Desktop (Chrome, Edge, Firefox)
1. Visit your app in the browser
2. Look for the install icon in the address bar (or menu)
3. Click "Install" to add to desktop/home screen

### Mobile (iOS Safari)
1. Visit your app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will appear as an icon on the home screen

### Mobile (Android Chrome)
1. Visit your app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. The app will appear as an icon on the home screen

## Icon Requirements

The app currently uses `/logo.png` for all icon sizes. For best results, you should provide:

- **192x192px** - Standard Android icon
- **512x512px** - High-resolution icon for splash screens
- **Apple Touch Icon** - 180x180px (iOS)

The current setup will scale your logo.png to these sizes automatically, but providing properly sized icons will give better results.

## Testing PWA Features

### Development Mode
PWA features are enabled in development mode. You can test:
- Service worker registration
- Offline functionality
- Install prompt

### Production Build
When you build for production (`npm run build`), the PWA files will be generated in the `dist` folder:
- `manifest.webmanifest` - App manifest
- `sw.js` - Service worker
- Icon files

## Offline Functionality

The service worker caches:
- All static assets (JS, CSS, HTML, images)
- Google Fonts (cached for 1 year)
- App shell for offline access

Users can use the app offline after the first visit.

## Customization

To customize PWA settings, edit `vite.config.ts`:
- Change app name, description, theme color
- Modify icon sizes and types
- Adjust caching strategies
- Configure offline behavior

## Troubleshooting

### Install Button Not Showing
- Make sure you're using HTTPS (or localhost for development)
- Check browser console for service worker errors
- Verify manifest is being generated correctly

### Icons Not Displaying
- Ensure `logo.png` exists in the `public` folder
- Check that the file is accessible at `/logo.png`
- Verify icon sizes in browser DevTools > Application > Manifest

### Service Worker Not Registering
- Check browser console for errors
- Verify the build completed successfully
- Clear browser cache and reload

## Next Steps

1. **Test Installation**: Try installing the app on your device
2. **Customize Icons**: Create properly sized icon files if needed
3. **Test Offline**: Disconnect from internet and verify app still works
4. **Deploy**: Deploy to production (Netlify) to enable full PWA features

## Production Deployment

When deploying to Netlify:
- The PWA will work automatically
- Users can install from the production URL
- Service worker will cache assets for offline use
- All PWA features will be available






