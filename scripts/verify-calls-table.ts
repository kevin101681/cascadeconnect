import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function verifyCallsTable() {
  try {
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];

    if (!databaseUrl) {
      console.error('❌ Database URL not found.');
      process.exit(1);
    }

    const sql = neon(databaseUrl);

    console.log('🔍 Checking if calls table exists...\n');

    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'calls'
      );
    `;

    if (tableCheck[0]?.exists) {
      console.log('✅ calls table exists\n');

      // Get table structure
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'calls'
        ORDER BY ordinal_position;
      `;

      console.log('📋 Table structure:');
      console.table(columns);

      // Try a simple SELECT to verify access
      try {
        const testSelect = await sql`SELECT COUNT(*) as count FROM calls`;
        console.log(`\n✅ Test SELECT successful. Row count: ${testSelect[0]?.count || 0}`);
      } catch (selectError: any) {
        console.error(`\n❌ Test SELECT failed:`, selectError.message);
      }
    } else {
      console.error('❌ calls table does NOT exist!');
      console.log('\n💡 Run: npm run create-calls-table');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

verifyCallsTable();

