import { db } from '../src/db'; // ⚠️ Check your path
import { claims } from '../src/db/schema'; // ⚠️ Check your path
import readline from 'readline';

async function resetClaims() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('⚠️  DANGER: You are about to DELETE ALL entries in the "claims" table.\nType "DELETE" to confirm: ', async (answer) => {
    if (answer === 'DELETE') {
      console.log('🗑️  Deleting all claims...');
      
      try {
        // The Drizzle command to wipe the table
        await db.delete(claims);
        console.log('✅ All claims have been deleted. You have a clean slate.');
      } catch (error) {
        console.error('❌ Error deleting claims:', error);
      }
    } else {
      console.log('🚫 Operation cancelled.');
    }
    rl.close();
    process.exit(0);
  });
}

resetClaims();