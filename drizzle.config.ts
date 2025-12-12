
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Database URL should be set via environment variable, not hardcoded
    url: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '',
  },
});
