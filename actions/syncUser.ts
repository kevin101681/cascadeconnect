/**
 * Auto-Sync Clerk Data on Login
 * 
 * This action ensures that all users in the database have their Clerk ID properly synced.
 * Fixes the "Zombie User" issue where users exist in the database but lack a clerk_id,
 * causing them to be filtered out by queries that check isNotNull(clerkId).
 * 
 * **How it works:**
 * 1. Checks if user is authenticated with Clerk
 * 2. Finds the user in the database by EMAIL (since clerk_id might be null)
 * 3. Updates missing fields: clerk_id, internal_role, imageUrl, name
 * 
 * **Called from:** App.tsx on mount when user is authenticated
 */

import { db, isDbConfigured } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface ClerkUser {
  id: string;
  primaryEmailAddress?: { emailAddress: string };
  emailAddresses?: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
}

/**
 * Sync Clerk user data to the database
 * @param clerkUser - The authenticated Clerk user object
 * @returns true if sync was successful, false otherwise
 */
export async function syncUserWithClerk(clerkUser: ClerkUser): Promise<boolean> {
  if (!isDbConfigured) {
    console.warn('⚠️ Database not configured, skipping user sync');
    return false;
  }

  if (!clerkUser) {
    console.warn('⚠️ No Clerk user provided to sync');
    return false;
  }

  // Get email from Clerk user
  const email = clerkUser.primaryEmailAddress?.emailAddress || 
                clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    console.warn('⚠️ No email found for Clerk user, cannot sync');
    return false;
  }

  try {
    console.log(`🔍 Checking user sync for: ${email}`);

    // 1. Find the user by EMAIL (since Clerk ID might be null in DB)
    const dbUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!dbUser) {
      console.log(`ℹ️ User ${email} not found in database (may be a new user)`);
      return false;
    }

    // 2. Check if Clerk ID is missing or internal role is NULL
    const needsClerkIdSync = !dbUser.clerkId;
    const needsRoleSync = !dbUser.internalRole;
    const needsImageSync = !dbUser.imageUrl && clerkUser.imageUrl;
    const needsNameSync = clerkUser.firstName || clerkUser.lastName;

    if (!needsClerkIdSync && !needsRoleSync && !needsImageSync) {
      console.log(`✅ User ${email} is already synced (clerk_id: ${dbUser.clerkId})`);
      return true;
    }

    // 3. Build update object with only the fields that need updating
    const updateData: any = {};
    
    if (needsClerkIdSync) {
      updateData.clerkId = clerkUser.id;
      console.log(`🔧 Will sync clerk_id: ${clerkUser.id}`);
    }

    if (needsRoleSync && dbUser.role === 'ADMIN') {
      // Set default internal role based on user role
      updateData.internalRole = 'Administrator';
      console.log(`🔧 Will sync internalRole: Administrator`);
    }

    if (needsImageSync) {
      updateData.imageUrl = clerkUser.imageUrl;
      console.log(`🔧 Will sync imageUrl`);
    }

    if (needsNameSync) {
      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(' ');
      if (fullName && fullName !== dbUser.name) {
        updateData.name = fullName;
        console.log(`🔧 Will sync name: ${fullName}`);
      }
    }

    // 4. Update the database
    if (Object.keys(updateData).length > 0) {
      await db.update(users)
        .set(updateData)
        .where(eq(users.email, email));

      console.log(`✅ Successfully synced user data for: ${email}`, updateData);
      return true;
    } else {
      console.log(`✅ No updates needed for: ${email}`);
      return true;
    }

  } catch (error) {
    console.error(`❌ Failed to sync user ${email}:`, error);
    return false;
  }
}

/**
 * Lazy sync wrapper that can be called from React components
 * This version handles the async operation gracefully without blocking the UI
 */
export async function lazySyncUser(clerkUser: ClerkUser): Promise<void> {
  try {
    await syncUserWithClerk(clerkUser);
  } catch (error) {
    // Log error but don't throw - this is a background operation
    console.error('Background user sync failed:', error);
  }
}
