# Twilio to Telnyx Migration Summary

## ✅ Completed Changes

### 1. Package Dependencies
- **Removed:** `@twilio/voice-react-native-sdk@1.7.0`
- **Added:** `@telnyx/react-native@1.0.0`
- **Action Required:** Run `npm install` to update dependencies

### 2. App Configuration (`app.config.js`)
- Removed Twilio-specific Maven repository
- Removed `./plugins/withTwilio` custom plugin
- Added Android permissions for Telnyx:
  - `WAKE_LOCK`
  - `VIBRATE`
- Kept existing permissions: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, etc.

### 3. Voice Service Refactor (`services/voice.ts`)
- Replaced Twilio Voice SDK with Telnyx Client
- Created custom `CallInvite` and `ActiveCall` interfaces for type safety
- Updated event listeners to use Telnyx notification system:
  - `telnyx.notification` for incoming calls
  - `telnyx.socket.open/close/error` for connection events
  - `telnyx.ready` for client ready state
  - `telnyx.error` for error handling
- Updated initialization flow:
  - Uses `TelnyxClient.connect()` instead of `Voice.register()`
  - Configured with login/password credentials
- Updated call handling:
  - Accept: Uses `newCall()` + `answer()` pattern
  - Reject: Uses `hangup()` method
  - End: Uses `hangup()` method

### 4. API Client Updates (`services/api.ts`)
- Renamed endpoint: `TWILIO_TOKEN` → `TELNYX_TOKEN`
- Updated API function: `fetchTwilioToken()` → `fetchTelnyxToken()`
- **Backend Action Required:** Create `/.netlify/functions/telnyx-token` endpoint

### 5. Component Updates
- `App.tsx`: Updated import from Twilio SDK to local `CallInvite` type
- `IncomingCallModal.tsx`: Updated import to use local `CallInvite` type from `services/voice`
- `GatekeeperStatus.tsx`: Updated UI text from "Twilio Voice" to "Telnyx Voice"

### 6. Cleanup
- Deleted `plugins/withTwilio.js` (no longer needed)

## 📋 Next Steps

### 1. Install Dependencies
```bash
cd cascade-mobile
npm install
```

### 2. Clean Build Artifacts
```bash
# Clean npm cache if needed
npm cache clean --force

# Remove node_modules and reinstall (if issues persist)
rm -rf node_modules package-lock.json
npm install
```

### 3. Backend Setup
You need to create a Telnyx token endpoint on your backend at:
`/.netlify/functions/telnyx-token`

This should return:
```json
{
  "token": "your-telnyx-password-or-token",
  "identity": "user-identity-or-sip-username"
}
```

### 4. Telnyx Configuration
- Sign up for Telnyx account
- Create a SIP Connection
- Configure credentials for WebRTC/Mobile access
- Update backend endpoint with Telnyx credentials

### 5. Build for Android
```bash
# Using EAS Build
eas build --platform android --profile development

# Or local build
npx expo run:android
```

### 6. Testing Checklist
- [ ] App builds successfully without errors
- [ ] App launches on Android device
- [ ] Voice service initializes without crashes
- [ ] Socket connection establishes to Telnyx
- [ ] Incoming call notifications work
- [ ] Accept call functionality works
- [ ] Reject call functionality works
- [ ] End call functionality works
- [ ] Audio works during active calls

## ⚠️ Known Considerations

### Telnyx SDK Differences
1. **Connection Model**: Telnyx uses WebSocket connection vs Twilio's registration model
2. **Event System**: Different event names and structures
3. **Call States**: May have different state names (verify in testing)
4. **Credentials**: Uses login/password instead of access tokens

### Potential Issues
1. **Call Accept Flow**: The current implementation uses `newCall()` + `answer()`. You may need to adjust this based on how Telnyx handles incoming calls in their React Native SDK.
2. **Custom Parameters**: The `customParameters` field may not be directly supported - verify with Telnyx docs
3. **Push Notifications**: May require separate configuration for background call handling

### Type Safety
- Custom interfaces created for `CallInvite` and `ActiveCall`
- These wrap Telnyx types to maintain compatibility with existing UI code
- May need adjustment based on actual Telnyx SDK API

## 📚 Documentation References
- [Telnyx React Native SDK](https://github.com/team-telnyx/react-native-sdk)
- [Telnyx WebRTC Documentation](https://developers.telnyx.com/docs/v2/webrtc)
- [Telnyx API Reference](https://developers.telnyx.com/docs/api/v2/overview)

## 🔧 Troubleshooting

If the build fails:
1. Check that `@telnyx/react-native` installed correctly
2. Clear Metro bundler cache: `npx expo start --clear`
3. Rebuild native code: `npx expo prebuild --clean`
4. Check Android Studio logs for native errors

If calls don't work:
1. Verify backend endpoint returns valid Telnyx credentials
2. Check console logs for connection errors
3. Verify Telnyx account and SIP connection are active
4. Test credentials with Telnyx's web client first

## 📝 Notes
- Package lock file still contains Twilio references - these will be removed on next `npm install`
- All Twilio-specific code has been removed from TypeScript/JavaScript files
- Android permissions updated to include Telnyx requirements
