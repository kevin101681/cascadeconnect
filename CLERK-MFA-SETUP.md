# Clerk MFA/2FA Configuration Guide

## Preventing Auto-Enable of MFA for New Users

To ensure MFA/2FA is NOT automatically enabled for new users, check these settings in your Clerk Dashboard:

### 1. Check Organization-Level MFA Settings

1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to **"Multi-factor"** in the left sidebar
4. Ensure all MFA strategies are **DISABLED**:
   - ❌ SMS verification codes
   - ❌ Authenticator app (TOTP)
   - ❌ Backup codes
   - ❌ Any other MFA methods

### 2. Check Session Token Claims

1. Go to **"Sessions"** in the Clerk Dashboard
2. Check **"Customize session token"**
3. **Remove** any claims related to MFA enforcement, such as:
   ```json
   {
     "isMfa": "{{user.two_factor_enabled}}"
   }
   ```
4. If you see any MFA-related claims, remove them

### 3. Check User & Authentication Settings

1. Go to **"User & Authentication"** → **"Multi-factor"**
2. Ensure **"Require MFA"** or **"Enforce MFA"** is **OFF**
3. Ensure **"Allow users to enable MFA"** is set according to your preference:
   - If you want users to be able to opt-in: **ON**
   - If you want to completely disable MFA: **OFF**

### 4. Check Sign-In/Sign-Up Flow Settings

1. Go to **"User & Authentication"** → **"Sign-in"** or **"Sign-up"**
2. Look for any MFA-related requirements
3. Ensure there are no "require MFA" checkboxes enabled

### 5. Check Organization Settings (if applicable)

If you have an organization set up:
1. Go to **"Organizations"** in the Clerk Dashboard
2. Select your organization
3. Check **"Multi-factor"** settings
4. Ensure MFA is not enforced at the organization level

## After Making Changes

1. **Save** all changes in the Clerk Dashboard
2. **Test** by creating a new user account
3. Verify that the new user can sign in without being prompted for MFA

## If MFA Still Appears

If users are still being prompted for MFA after disabling all settings:

1. **Check individual user accounts** - Some users may have manually enabled MFA
2. **Use the disable script**: Run `npm run disable-user-mfa` to disable MFA for specific users
3. **Contact Clerk support** if the issue persists

## Notes

- Disabling MFA strategies in Clerk prevents users from setting up MFA
- If strategies are enabled but not required, users can opt-in but won't be forced
- Organization-level MFA enforcement overrides individual settings
