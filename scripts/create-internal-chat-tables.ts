/**
 * CREATE INTERNAL CHAT TABLES
 * Migration script to create the internal team chat tables
 * January 3, 2026
 * 
 * Run: npm run create-internal-chat-tables
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ VITE_DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('🔗 Connecting to database...');

const sql = neon(databaseUrl);

async function createInternalChatTables() {
  try {
    console.log('📋 Creating internal chat tables...\n');

    // 1. Create channel_type enum
    console.log('1️⃣ Creating channel_type enum...');
    await sql`
      DO $$ BEGIN
        CREATE TYPE channel_type AS ENUM ('public', 'dm');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ channel_type enum ready\n');

    // 2. Create internal_channels table
    console.log('2️⃣ Creating internal_channels table...');
    await sql`
      CREATE TABLE IF NOT EXISTS internal_channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type channel_type DEFAULT 'public',
        dm_participants JSONB,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log('✅ internal_channels table created\n');

    // 3. Create internal_messages table
    console.log('3️⃣ Creating internal_messages table...');
    await sql`
      CREATE TABLE IF NOT EXISTS internal_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID NOT NULL REFERENCES internal_channels(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        mentions JSONB DEFAULT '[]'::jsonb,
        is_edited BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log('✅ internal_messages table created\n');

    // 4. Create channel_members table
    console.log('4️⃣ Creating channel_members table...');
    await sql`
      CREATE TABLE IF NOT EXISTS channel_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID NOT NULL REFERENCES internal_channels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        last_read_at TIMESTAMP DEFAULT NOW() NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_muted BOOLEAN DEFAULT false,
        UNIQUE(channel_id, user_id)
      );
    `;
    console.log('✅ channel_members table created\n');

    // 5. Create indexes for performance
    console.log('5️⃣ Creating indexes...');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_internal_messages_channel_id 
      ON internal_messages(channel_id);
    `;
    console.log('  ✓ Index on internal_messages.channel_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_internal_messages_created_at 
      ON internal_messages(created_at DESC);
    `;
    console.log('  ✓ Index on internal_messages.created_at');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_channel_members_user_id 
      ON channel_members(user_id);
    `;
    console.log('  ✓ Index on channel_members.user_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id 
      ON channel_members(channel_id);
    `;
    console.log('  ✓ Index on channel_members.channel_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_internal_channels_type 
      ON internal_channels(type);
    `;
    console.log('  ✓ Index on internal_channels.type');

    // For DM channel lookup: need to query by dm_participants array
    await sql`
      CREATE INDEX IF NOT EXISTS idx_internal_channels_dm_participants 
      ON internal_channels USING gin (dm_participants);
    `;
    console.log('  ✓ GIN index on internal_channels.dm_participants\n');

    // 6. Create a default "general" channel
    console.log('6️⃣ Creating default "general" channel...');
    
    // Get the first admin user to be the creator
    const adminUsers = await sql`
      SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1;
    `;

    if (adminUsers.length > 0) {
      const adminId = adminUsers[0].id;
      
      // Check if general channel already exists
      const existingGeneral = await sql`
        SELECT id FROM internal_channels WHERE name = 'general' AND type = 'public';
      `;

      if (existingGeneral.length === 0) {
        const generalChannel = await sql`
          INSERT INTO internal_channels (name, type, created_by)
          VALUES ('general', 'public', ${adminId})
          RETURNING id;
        `;
        console.log(`✅ Created "general" channel with ID: ${generalChannel[0].id}`);

        // Add all admin/employee users to the general channel
        const allAdminUsers = await sql`
          SELECT id FROM users WHERE role = 'ADMIN';
        `;

        for (const user of allAdminUsers) {
          await sql`
            INSERT INTO channel_members (channel_id, user_id)
            VALUES (${generalChannel[0].id}, ${user.id})
            ON CONFLICT (channel_id, user_id) DO NOTHING;
          `;
        }
        console.log(`✅ Added ${allAdminUsers.length} users to general channel\n`);
      } else {
        console.log('✅ General channel already exists\n');
      }
    } else {
      console.log('⚠️  No admin users found. Skipping default channel creation.\n');
    }

    console.log('🎉 Internal chat tables created successfully!');
    console.log('\n📊 Summary:');
    console.log('  ✓ internal_channels table');
    console.log('  ✓ internal_messages table');
    console.log('  ✓ channel_members table');
    console.log('  ✓ Indexes for performance');
    console.log('  ✓ Default "general" channel\n');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Run the migration
createInternalChatTables()
  .then(() => {
    console.log('✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

