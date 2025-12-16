import { betterAuth } from "better-auth";
import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: resolve(__dirname, '..', '.env') });

// Get database connection string
const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("⚠️ Database URL not found. Better Auth will not work without a database connection.");
  console.warn("Set VITE_DATABASE_URL or DATABASE_URL in your .env.local file.");
}

// Better Auth configuration with Neon PostgreSQL database
export const auth = betterAuth({
  database: databaseUrl ? {
    provider: "postgresql",
    url: databaseUrl,
  } : undefined,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
    // Add Apple if needed
    // apple: {
    //   clientId: process.env.APPLE_CLIENT_ID,
    //   clientSecret: process.env.APPLE_CLIENT_SECRET,
    //   enabled: !!process.env.APPLE_CLIENT_ID,
    // },
  },
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  // Base URL for callbacks
  baseURL: process.env.BETTER_AUTH_URL || process.env.VITE_BETTER_AUTH_URL || "http://localhost:3000",
  basePath: "/api/auth",
});

if (databaseUrl) {
  console.log("✅ Better Auth configured with Neon database");
} else {
  console.warn("⚠️ Better Auth configured without database - authentication will not work");
}
