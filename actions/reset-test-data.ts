/**
 * RESET TEST DATA ACTION
 * 
 * DANGER: This action will:
 * 1. Drop the legacy builder_groups table
 * 2. Delete ALL homeowners
 * 3. Delete ALL users with role='BUILDER' or role='HOMEOWNER'
 * 
 * SAFETY: Will NOT delete admin/employee accounts
 */

import { db } from '../db';
import { builderGroups as builderGroupsTable, homeowners as homeownersTable, users as usersTable } from '../db/schema';
import { eq, or, sql } from 'drizzle-orm';

export interface ResetResult {
  success: boolean;
  message: string;
  deleted: {
    builderGroups: number;
    homeowners: number;
    builderUsers: number;
    homeownerUsers: number;
  };
  error?: string;
}

export async function resetTestData(): Promise<ResetResult> {
  try {
    console.log('🗑️ Starting test data purge...');

    // Count before deletion
    const builderGroupsCount = await db.select().from(builderGroupsTable);
    const homeownersCount = await db.select().from(homeownersTable);
    const builderUsersCount = await db.select().from(usersTable).where(eq(usersTable.role, 'BUILDER'));
    const homeownerUsersCount = await db.select().from(usersTable).where(eq(usersTable.role, 'HOMEOWNER'));

    // 1. Delete all homeowners (this will cascade to related records)
    await db.delete(homeownersTable);
    console.log(`✅ Deleted ${homeownersCount.length} homeowners`);

    // 2. Delete builder and homeowner users (KEEP ADMIN and EMPLOYEE)
    await db.delete(usersTable).where(
      or(
        eq(usersTable.role, 'BUILDER'),
        eq(usersTable.role, 'HOMEOWNER')
      )
    );
    console.log(`✅ Deleted ${builderUsersCount.length} builder users`);
    console.log(`✅ Deleted ${homeownerUsersCount.length} homeowner users`);

    // 3. Delete all builder groups
    await db.delete(builderGroupsTable);
    console.log(`✅ Deleted ${builderGroupsCount.length} builder groups`);

    // 4. Optional: Drop the builder_groups table entirely (commented out for safety)
    // await db.execute(sql`DROP TABLE IF EXISTS builder_groups CASCADE`);
    // console.log('✅ Dropped builder_groups table');

    return {
      success: true,
      message: 'Test data purged successfully',
      deleted: {
        builderGroups: builderGroupsCount.length,
        homeowners: homeownersCount.length,
        builderUsers: builderUsersCount.length,
        homeownerUsers: homeownerUsersCount.length,
      },
    };
  } catch (error) {
    console.error('❌ Reset test data failed:', error);
    return {
      success: false,
      message: 'Failed to reset test data',
      deleted: {
        builderGroups: 0,
        homeowners: 0,
        builderUsers: 0,
        homeownerUsers: 0,
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

