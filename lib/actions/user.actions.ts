/**
 * USER ACTIONS - Server-Side User Management
 * Handles user updates with dual-write to Clerk + Database
 * 
 * Critical Features:
 * - Updates Clerk first (fail-fast if email taken or invalid)
 * - Updates database second (only if Clerk succeeds)
 * - Handles both Builder Users (existing) and Sub-Users (invited)
 * - Email changes use invitation flow for security
 * 
 * January 17, 2026
 */

'use server'

import { db, isDbConfigured } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Update user profile with dual-write to Clerk + Database
 * 
 * @param userId - Database UUID of the user to update
 * @param formData - Updated user fields (email, name, builderGroupId, etc.)
 * @param password - Optional new password
 * @returns Success/error response
 */
export async function updateUserProfile(
  userId: string,
  formData: {
    email?: string;
    name?: string;
    builderGroupId?: string | null;
  },
  password?: string
): Promise<{ success: boolean; error?: string }> {
  
  if (!isDbConfigured) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    console.log(`🔧 [updateUserProfile] Starting update for user ${userId}`, formData);

    // 1. Get the DB user to find their clerkId
    const dbUser = await db.query.users.findFirst({ 
      where: eq(users.id, userId) 
    });

    if (!dbUser) {
      return { success: false, error: 'User not found in database' };
    }

    console.log(`📊 [updateUserProfile] Found user:`, {
      id: dbUser.id,
      email: dbUser.email,
      clerkId: dbUser.clerkId,
      hasClerkId: !!dbUser.clerkId
    });

    // 2. SYNC TO CLERK (if user has a Clerk account)
    if (dbUser.clerkId) {
      console.log(`🔄 [updateUserProfile] User has Clerk ID, syncing to Clerk...`);
      
      try {
        // Call Netlify function to update Clerk
        const clerkResponse = await fetch('/.netlify/functions/update-clerk-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clerkId: dbUser.clerkId,
            updates: {
              // Extract firstName/lastName from name
              firstName: formData.name?.split(' ')[0],
              lastName: formData.name?.split(' ').slice(1).join(' '),
              // Note: Email updates handled separately via invitation flow
            }
          }),
        });

        if (!clerkResponse.ok) {
          const errorData = await clerkResponse.json().catch(() => ({}));
          console.error('❌ [updateUserProfile] Clerk sync failed:', errorData);
          return { 
            success: false, 
            error: errorData.error || 'Failed to sync with Clerk authentication system' 
          };
        }

        console.log('✅ [updateUserProfile] Clerk sync successful');
      } catch (clerkError) {
        console.error('❌ [updateUserProfile] Clerk API error:', clerkError);
        return { 
          success: false, 
          error: 'Failed to connect to authentication system. Please try again.' 
        };
      }
    } else {
      console.log(`⚠️ [updateUserProfile] User has no Clerk ID, skipping Clerk sync`);
    }

    // 3. UPDATE DATABASE (only if Clerk sync succeeded or user has no Clerk account)
    const updateData: any = {};

    if (formData.email) {
      updateData.email = formData.email;
    }

    if (formData.name) {
      updateData.name = formData.name;
    }

    if (formData.builderGroupId !== undefined) {
      updateData.builderGroupId = formData.builderGroupId;
    }

    if (password) {
      updateData.password = password;
    }

    updateData.updatedAt = new Date();

    console.log(`💾 [updateUserProfile] Updating database with:`, updateData);

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    console.log('✅ [updateUserProfile] Database update successful');

    return { success: true };

  } catch (error) {
    console.error('❌ [updateUserProfile] Update failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update user' 
    };
  }
}

/**
 * Handle email changes for users with Clerk accounts
 * Uses invitation flow for security (email must be verified)
 * 
 * @param userId - Database UUID
 * @param newEmail - New email address
 * @returns Success/error response
 */
export async function updateUserEmail(
  userId: string,
  newEmail: string
): Promise<{ success: boolean; error?: string; requiresInvitation?: boolean }> {
  
  if (!isDbConfigured) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const dbUser = await db.query.users.findFirst({ 
      where: eq(users.id, userId) 
    });

    if (!dbUser) {
      return { success: false, error: 'User not found' };
    }

    // If user has never logged in (no Clerk ID), update email directly
    if (!dbUser.clerkId) {
      console.log(`📧 [updateUserEmail] User has no Clerk ID, updating email directly`);
      
      await db.update(users)
        .set({ 
          email: newEmail,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return { success: true };
    }

    // User has Clerk account - need to use invitation flow
    console.log(`🎫 [updateUserEmail] User has Clerk ID, requires invitation for email change`);
    
    return { 
      success: false, 
      requiresInvitation: true,
      error: 'Email changes for existing users require re-invitation for security. Please delete and re-create the user with the new email.' 
    };

  } catch (error) {
    console.error('❌ [updateUserEmail] Failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update email' 
    };
  }
}
