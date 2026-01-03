import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function createAppointmentsTables() {
  // Try multiple database URL sources (same pattern as other migration scripts)
  const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.argv[2];
  
  if (!databaseUrl) {
    console.error('❌ Database URL not found.');
    console.error('   Options:');
    console.error('   1. Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file');
    console.error('   2. Pass it as an argument: npm run create-appointments-tables -- "postgresql://..."');
    process.exit(1);
  }

  const urlObj = new URL(databaseUrl);
  const dbHost = urlObj.hostname;
  console.log(`🔄 Creating appointments tables...`);
  console.log(`   Database: ${dbHost}\n`);

  const sql = neon(databaseUrl);

  try {
    console.log('🗓️  Creating appointments tables...');

    // Create appointment_visibility enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE appointment_visibility AS ENUM ('internal_only', 'shared_with_homeowner');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✓ Created appointment_visibility enum');

    // Create appointment_type enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE appointment_type AS ENUM ('repair', 'inspection', 'phone_call', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✓ Created appointment_type enum');

    // Create appointments table
    await sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        homeowner_id UUID REFERENCES homeowners(id),
        visibility appointment_visibility DEFAULT 'shared_with_homeowner',
        type appointment_type DEFAULT 'other',
        created_by_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✓ Created appointments table');

    // Create appointment_guests table
    await sql`
      CREATE TABLE IF NOT EXISTS appointment_guests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✓ Created appointment_guests table');

    // Create indexes for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_appointments_homeowner_id ON appointments(homeowner_id);
    `;
    console.log('✓ Created index on homeowner_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
    `;
    console.log('✓ Created index on start_time');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_appointments_visibility ON appointments(visibility);
    `;
    console.log('✓ Created index on visibility');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_appointment_guests_appointment_id ON appointment_guests(appointment_id);
    `;
    console.log('✓ Created index on appointment_id');

    console.log('\n✅ Successfully created appointments tables and indexes!');
  } catch (error: any) {
    console.error('❌ Error creating appointments tables:', error.message);
    throw error;
  }
}

// Run the migration
createAppointmentsTables()
  .then(() => {
    console.log('\n🎉 Appointments migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Appointments migration failed:', error);
    process.exit(1);
  });

