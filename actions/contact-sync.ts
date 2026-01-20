import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userContacts } from '../db/schema';
import { normalizePhoneNumber } from '../lib/utils/phoneNormalization';
import { eq } from 'drizzle-orm';

/**
 * Contact Sync Action
 * 
 * This server action is called by the mobile app to sync the user's contact list
 * to the database. This creates an "allowlist" of known contacts that will bypass
 * the AI Gatekeeper and be forwarded directly to the user.
 * 
 * Performance: Uses batch inserts and transactions for optimal performance.
 */

export interface ContactInput {
  name: string;
  phone: string;
}

export interface SyncContactsResponse {
  success: boolean;
  message: string;
  synced: number;
  failed: number;
  errors?: string[];
}

/**
 * Sync contacts from mobile app to database
 * 
 * @param userId - Clerk user ID (from authentication)
 * @param contacts - Array of contacts from mobile device
 * @returns Response with sync results
 * 
 * @example
 * const result = await syncContacts('user_abc123', [
 *   { name: 'John Doe', phone: '(555) 123-4567' },
 *   { name: 'Jane Smith', phone: '+1-555-987-6543' }
 * ]);
 */
export async function syncContacts(
  userId: string,
  contacts: ContactInput[]
): Promise<SyncContactsResponse> {
  if (!userId) {
    return {
      success: false,
      message: 'User authentication required',
      synced: 0,
      failed: contacts.length,
    };
  }

  if (!contacts || contacts.length === 0) {
    return {
      success: true,
      message: 'No contacts to sync',
      synced: 0,
      failed: 0,
    };
  }

  // Connect to database
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!databaseUrl) {
    return {
      success: false,
      message: 'Database not configured',
      synced: 0,
      failed: contacts.length,
    };
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Process contacts in batches of 100 for optimal performance
    const batchSize = 100;
    
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      // Normalize and validate phone numbers
      const normalizedContacts = batch
        .map(contact => {
          const normalized = normalizePhoneNumber(contact.phone);
          
          if (!normalized) {
            failed++;
            errors.push(`Invalid phone number: ${contact.phone} (${contact.name})`);
            return null;
          }
          
          return {
            userId,
            phoneNumber: normalized,
            name: contact.name || null,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      // Batch insert with conflict resolution
      // Strategy: If phone number already exists, update the name (in case it changed)
      if (normalizedContacts.length > 0) {
        try {
          // Use transaction for atomic batch insert
          await db.transaction(async (tx) => {
            for (const contact of normalizedContacts) {
              try {
                await tx
                  .insert(userContacts)
                  .values(contact)
                  .onConflictDoUpdate({
                    target: userContacts.phoneNumber,
                    set: {
                      name: contact.name,
                      userId: contact.userId, // Update userId in case contact switched owners
                    },
                  });
                
                synced++;
              } catch (err: any) {
                failed++;
                errors.push(`Failed to sync ${contact.phoneNumber}: ${err.message}`);
              }
            }
          });
        } catch (txError: any) {
          console.error('Transaction error:', txError);
          failed += normalizedContacts.length - synced;
          errors.push(`Batch insert failed: ${txError.message}`);
        }
      }
    }

    return {
      success: true,
      message: `Successfully synced ${synced} contacts (${failed} failed)`,
      synced,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return first 10 errors only
    };

  } catch (error: any) {
    console.error('Contact sync error:', error);
    return {
      success: false,
      message: `Sync failed: ${error.message}`,
      synced,
      failed: contacts.length - synced,
      errors: [error.message],
    };
  }
}

/**
 * Get all contacts for a user
 * 
 * @param userId - Clerk user ID
 * @returns Array of user contacts
 */
export async function getUserContacts(userId: string) {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database not configured');
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  return await db
    .select()
    .from(userContacts)
    .where(eq(userContacts.userId, userId));
}

/**
 * Delete all contacts for a user
 * 
 * @param userId - Clerk user ID
 * @returns Number of contacts deleted
 */
export async function deleteUserContacts(userId: string): Promise<number> {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database not configured');
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  const result = await db
    .delete(userContacts)
    .where(eq(userContacts.userId, userId));

  return result.length || 0;
}

/**
 * Check if a phone number is in the user's contact list
 * 
 * @param phoneNumber - Phone number in E.164 format
 * @returns Contact record if found, null otherwise
 */
export async function isKnownContact(phoneNumber: string) {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database not configured');
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return null;

  const results = await db
    .select()
    .from(userContacts)
    .where(eq(userContacts.phoneNumber, normalized))
    .limit(1);

  return results[0] || null;
}
